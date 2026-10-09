import {
  SCHEDULE_CHAT_TOOL_DECLARATIONS,
  runScheduleChatTool,
} from '@/lib/schedule-chat-tools';

const MAX_TOOL_ROUNDS = 3;

/** 404 시 순서대로 시도 (환경변수 GEMINI_MODEL이 있으면 최우선) */
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
].filter((m): m is string => !!m && m.trim().length > 0);

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

function currentYearSeoul(): number {
  const y = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
  }).format(new Date());
  return Number(y);
}

function buildSystemInstruction(): string {
  const year = currentYearSeoul();
  return `당신은 Potens EM(교육매니저)용 강사·교육 일정 도우미입니다. 실제 동료와 대화하듯 자연스럽고 친절하게 답하세요.

기본 규칙:
- 반드시 제공된 도구 결과만 근거로 답하세요. 없는 사실을 추측·만들어내지 마세요.
- 날짜는 Asia/Seoul 기준입니다. 기간 조회 시 timeMin/timeMax를 항상 ISO(+09:00)로 명시하세요.
- 오늘 기준 올해는 ${year}년입니다. 연도가 생략되면 기본적으로 ${year}년(이번 년도)으로 해석하세요. (예: "10월" → ${year}-10, "10월 28일" → ${year}-10-28)
- 사용자가 다른 연도를 말하면 그 연도를 따르세요.
- "안 잡힌 일정/빈날/가능한 날"은 compute_free_weekdays를 사용하세요. 규칙: 평일 − (캘린더 교육 ∪ 강의 불가). 주말은 제외합니다. 강의 선호는 빈날에서 빼지 않습니다.
- 특정일 교육 강사 질문은 list_calendar_events로 그날 00:00~23:59를 조회하세요.
- 참석자/강사 매핑이 없으면 "교육은 있으나 강사 미확인"이라고 말하세요.
- 답변은 짧고 명확한 한국어로, 날짜·과정명·기업명 등 근거를 포함하세요.
- 마크다운을 쓰지 마세요. **, *, #, -, \`\`\` 같은 기호로 굵게/목록/코드 표시하지 마세요. 일반 문장이나 "1." "2." 같은 번호, 줄바꿈만 사용하세요.

되묻기 (실제 소통처럼):
- 강사 이름·날짜·월이 애매하면 바로 도구를 때리지 말고 한두 문장으로 확인 질문을 하세요.
- 동명이인/유사 이름이 있으면 후보를 보여주고 어떤 분인지 물어보세요.
- "이번 달", "다음 주"처럼 기준이 불분명하면 ${year}년 기준으로 해석할지, 아니면 어떤 기간인지 짧게 되물어도 됩니다.
- 정보가 부족하면 추측 답변 대신 "혹시 OO 맞을까요?"처럼 자연스럽게 물어보세요.`;
}

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args?: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

type GeminiContent = { role: string; parts: GeminiPart[] };

function toGeminiContents(history: ChatMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const m of history) {
    if (!m.content?.trim()) continue;
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    });
  }
  return contents;
}

function extractText(parts: GeminiPart[] | undefined): string {
  if (!parts?.length) return '';
  return parts
    .map((p) => ('text' in p && p.text ? p.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}

/** 채팅 UI용: **, *, 불릿 마크다운 제거 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/(^|\n)\s*[\*\-]\s+/g, '$1')
    .replace(/(^|\n)\s*\d+\.\s+\*\*([^*]+)\*\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function uniqueModels(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of MODEL_CANDIDATES) {
    if (!seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

async function callGemini(
  apiKey: string,
  model: string,
  body: Record<string, unknown>
): Promise<{ ok: true; data: any } | { ok: false; status: number; errText: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, status: res.status, errText };
  }
  return { ok: true, data: await res.json() };
}

async function callGeminiWithFallback(
  apiKey: string,
  body: Record<string, unknown>
): Promise<{ data: any; model: string }> {
  const models = uniqueModels();
  let lastErr = '';
  for (const model of models) {
    const result = await callGemini(apiKey, model, body);
    if (result.ok) {
      if (model !== models[0]) {
        console.log(`[Gemini] fallback model in use: ${model}`);
      }
      return { data: result.data, model };
    }
    console.error(`Gemini API error (${model}):`, result.status, result.errText);
    lastErr = result.errText;
    // 404/400(model not found)만 다음 모델 시도
    if (result.status !== 404 && result.status !== 400) {
      throw new Error(`Gemini API 오류 (${result.status})`);
    }
  }
  throw new Error(
    `Gemini API 오류 (404): 사용 가능한 모델을 찾지 못했습니다. GEMINI_MODEL을 확인하세요. ${lastErr.slice(0, 200)}`
  );
}

export async function runScheduleChat(
  history: ChatMessage[]
): Promise<{ answer: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const contents = toGeminiContents(history);
  if (!contents.length) {
    throw new Error('메시지가 비어 있습니다.');
  }

  let activeModel = uniqueModels()[0];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const systemInstruction = buildSystemInstruction();
    const body = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      tools: [{ function_declarations: SCHEDULE_CHAT_TOOL_DECLARATIONS }],
      contents,
      generationConfig: {
        temperature: 0.2,
      },
    };

    const { data, model } = await callGeminiWithFallback(apiKey, body);
    activeModel = model;

    const candidate = data.candidates?.[0];
    const parts: GeminiPart[] = candidate?.content?.parts || [];
    const functionCalls = parts.filter(
      (p): p is { functionCall: { name: string; args?: Record<string, unknown> } } =>
        'functionCall' in p && !!p.functionCall
    );

    if (functionCalls.length === 0) {
      const answer =
        stripMarkdown(extractText(parts) || '') || '답변을 생성하지 못했습니다.';
      return { answer };
    }

    contents.push({ role: 'model', parts });

    const responseParts: GeminiPart[] = [];
    for (const fc of functionCalls) {
      const name = fc.functionCall.name;
      const args = fc.functionCall.args || {};
      let result: unknown;
      try {
        result = await runScheduleChatTool(name, args);
      } catch (e: any) {
        result = { error: e?.message || '도구 실행 실패' };
      }
      responseParts.push({
        functionResponse: {
          name,
          response: { result },
        },
      });
    }
    contents.push({ role: 'user', parts: responseParts });
  }

  const finalBody = {
    system_instruction: { parts: [{ text: buildSystemInstruction() }] },
    contents,
    generationConfig: { temperature: 0.2 },
  };

  // Prefer the model that already worked this request
  const finalTry = await callGemini(apiKey, activeModel, finalBody);
  const finalData = finalTry.ok
    ? finalTry.data
    : (await callGeminiWithFallback(apiKey, finalBody)).data;

  const answer =
    stripMarkdown(
      extractText(finalData.candidates?.[0]?.content?.parts) || ''
    ) ||
    '도구 조회 후 답변을 만들지 못했습니다. 질문을 조금 더 구체적으로 해주세요.';
  return { answer };
}
