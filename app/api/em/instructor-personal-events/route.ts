import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getGoogleSheetsClient, parseEmailCell } from '@/lib/google-sheets';

// 강사 개인 일정을 저장할 시트 정보 (강사일정 시트 사용)
const PERSONAL_EVENTS_SPREADSHEET_ID = process.env.GOOGLE_RECRUITMENT_LOG_SPREADSHEET_ID || '1ygeuJ9dIVvbreU2CXTNDXonnew19EjWsJq7FJLMCLW0';
const PERSONAL_EVENTS_SHEET_NAME = '강사일정';

type PersonalEventType = '강의 선호' | '강의 불가';
function normalizeType(rawType: string, fallbackFromSummary: string): PersonalEventType {
  const t = (rawType || '').trim();
  if (t === '강의 선호' || t === '강의 불가') return t;
  return fallbackFromSummary.includes('선호') ? '강의 선호' : '강의 불가';
}

/**
 * POST: EM이 특정 강사의 개인 일정 조회
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'EM') {
      return NextResponse.json(
        { error: '인증되지 않았거나 권한이 없습니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const instructorEmailParam = (body.instructorEmail || '').trim();

    if (!instructorEmailParam) {
      return NextResponse.json(
        { error: '강사 이메일이 필요합니다.' },
        { status: 400 }
      );
    }

    const instructorEmails = parseEmailCell(instructorEmailParam);
    const instructorEmailSet = new Set(instructorEmails);

    const sheets = getGoogleSheetsClient();
    
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: PERSONAL_EVENTS_SPREADSHEET_ID,
        range: `${PERSONAL_EVENTS_SHEET_NAME}!A:Z`,
      });

      const rows = response.data.values || [];
      const personalEvents = [];

      // 헤더 행을 제외하고 데이터 행만 처리 (A열에 쉼표로 여러 이메일일 수 있음)
      // 시트 구조: 강사이메일 | 일정이름 | 날짜 | 유형
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const emailCell = (row[0] || '').trim();
        const summary = (row[1] || '').trim();
        const date = (row[2] || '').trim();
        const rawType = (row[3] || '').trim();
        const type = normalizeType(rawType, summary);

        const rowEmails = parseEmailCell(emailCell);
        const isMatch = rowEmails.some((e) => instructorEmailSet.has(e));
        if (isMatch && summary && date) {
          personalEvents.push({
            summary,
            date,
            type,
          });
        }
      }

      return NextResponse.json({
        success: true,
        events: personalEvents,
      });
    } catch (error: any) {
      // 시트가 없으면 빈 배열 반환
      if (error.code === 400 || error.message?.includes('Unable to parse range')) {
        return NextResponse.json({
          success: true,
          events: [],
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Get instructor personal events API error:', error);
    return NextResponse.json(
      { error: '개인 일정을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
