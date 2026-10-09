import { getAllEvents, getInstructorEvents, CalendarEvent } from '@/lib/google-calendar';
import {
  getAllInstructorsWithEmail,
  getInstructorEmailCellByName,
  getInstructorsFromInfoSheet,
  getInstructorNamesByEmails,
  getGoogleSheetsClient,
  parseEmailCell,
} from '@/lib/google-sheets';

const CALENDAR_ID =
  process.env.GOOGLE_CALENDAR_ID ||
  'c_434b3261f4e10e2caf2228a9f17b773c88a54e11c52d3ac541d8dd1ad323e01a@group.calendar.google.com';
const PERSONAL_EVENTS_SPREADSHEET_ID =
  process.env.GOOGLE_RECRUITMENT_LOG_SPREADSHEET_ID ||
  '1ygeuJ9dIVvbreU2CXTNDXonnew19EjWsJq7FJLMCLW0';
const PERSONAL_EVENTS_SHEET_NAME = '강사일정';

function eventDateKey(event: CalendarEvent): string | null {
  const raw = event.start?.dateTime || event.start?.date;
  if (!raw) return null;
  // Already YYYY-MM-DD or ISO with offset
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  // Format in Asia/Seoul
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!y || !m || !day) return null;
  return `${y}-${m}-${day}`;
}

function summarizeEvent(event: CalendarEvent) {
  const instructors =
    event.attendees
      ?.map((a) => a.instructorName || a.displayName || a.email)
      .filter(Boolean) || [];
  return {
    date: eventDateKey(event),
    summary: event.summary,
    location: event.location || '',
    instructors,
    isPersonal: !!event.isPersonal,
    personalType: event.isPersonal ? event.description || '' : undefined,
  };
}

export async function listInstructorsTool() {
  const [statusList, infoList] = await Promise.all([
    getAllInstructorsWithEmail(),
    getInstructorsFromInfoSheet().catch(() => []),
  ]);
  const byName = new Map<string, { name: string; email: string }>();
  for (const i of statusList) {
    byName.set(i.name, { name: i.name, email: i.email });
  }
  for (const i of infoList) {
    if (!byName.has(i.name)) {
      byName.set(i.name, { name: i.name, email: i.email });
    }
  }
  return {
    instructors: Array.from(byName.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    ),
  };
}

type ResolveResult =
  | { name: string; emails: string[]; candidates?: undefined }
  | { name: string; emails: []; candidates: string[] };

async function resolveInstructorEmails(
  nameOrEmail: string
): Promise<ResolveResult | null> {
  const raw = (nameOrEmail || '').trim();
  if (!raw) return null;

  if (raw.includes('@')) {
    const emails = parseEmailCell(raw);
    const email = emails[0] || raw.toLowerCase();
    const names = await getInstructorNamesByEmails([email]);
    return { name: names[email] || email, emails: emails.length ? emails : [email] };
  }

  const cell = await getInstructorEmailCellByName(raw);
  if (cell) {
    const emails = parseEmailCell(cell);
    if (emails.length) return { name: raw, emails };
  }

  const list = await listInstructorsTool();
  const exact = list.instructors.find((i) => i.name === raw);
  if (exact) {
    const cell2 = await getInstructorEmailCellByName(exact.name);
    const emails = cell2 ? parseEmailCell(cell2) : parseEmailCell(exact.email);
    return { name: exact.name, emails: emails.length ? emails : [exact.email] };
  }

  const partial = list.instructors.filter(
    (i) => i.name.includes(raw) || raw.includes(i.name)
  );
  if (partial.length === 1) {
    const one = partial[0];
    const cell2 = await getInstructorEmailCellByName(one.name);
    const emails = cell2 ? parseEmailCell(cell2) : parseEmailCell(one.email);
    return { name: one.name, emails: emails.length ? emails : [one.email] };
  }
  if (partial.length > 1) {
    return { name: raw, emails: [], candidates: partial.map((p) => p.name) };
  }

  return null;
}

export async function listCalendarEventsTool(timeMin: string, timeMax: string) {
  const events = await getAllEvents(CALENDAR_ID, timeMin, timeMax);
  const attendeeEmails = new Set<string>();
  for (const event of events || []) {
    event.attendees?.forEach((a) => {
      const email = (a.email || '').trim().toLowerCase();
      if (email.includes('@')) attendeeEmails.add(email);
    });
  }
  const emailToName = await getInstructorNamesByEmails(Array.from(attendeeEmails));
  const enriched = (events || []).map((event) => {
    if (!event.attendees?.length) return event;
    return {
      ...event,
      attendees: event.attendees.map((a) => {
        const email = (a.email || '').trim().toLowerCase();
        return {
          ...a,
          instructorName: email ? emailToName[email] : undefined,
        };
      }),
    };
  });

  return {
    timeMin,
    timeMax,
    count: enriched.length,
    events: enriched.map(summarizeEvent),
  };
}

async function loadPersonalEvents(
  instructorEmails: string[]
): Promise<CalendarEvent[]> {
  const sheets = getGoogleSheetsClient();
  const instructorEmailSet = new Set(instructorEmails.map((e) => e.toLowerCase()));
  const personalEvents: CalendarEvent[] = [];

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: PERSONAL_EVENTS_SPREADSHEET_ID,
      range: `${PERSONAL_EVENTS_SHEET_NAME}!A:Z`,
    });
    const rows = response.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const emailCell = (row[0] || '').trim();
      const summary = (row[1] || '').trim();
      const date = (row[2] || '').trim();
      const rawType = (row[3] || '').trim();
      const rowEmails = parseEmailCell(emailCell);
      const isMatch = rowEmails.some((e) => instructorEmailSet.has(e));
      if (!isMatch || !summary || !date) continue;

      const type =
        rawType === '강의 선호' || rawType === '강의 불가'
          ? rawType
          : summary.includes('선호')
            ? '강의 선호'
            : '강의 불가';

      let year: number, month: number, day: number;
      if (date.includes('-')) {
        const parts = date.split('-').map(Number);
        year = parts[0];
        month = parts[1];
        day = parts[2];
      } else {
        const d = new Date(date);
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
      }
      const y = String(year);
      const m = String(month).padStart(2, '0');
      const d = String(day).padStart(2, '0');

      personalEvents.push({
        id: `personal-${date}-${summary}`,
        summary,
        description: type,
        start: { dateTime: `${y}-${m}-${d}T09:00:00+09:00` },
        end: { dateTime: `${y}-${m}-${d}T18:00:00+09:00` },
        attendees: [{ email: instructorEmails[0] ?? '', instructorName: '' }],
        location: '',
        isPersonal: true,
      });
    }
  } catch (error: any) {
    if (error.code !== 400 && !error.message?.includes('Unable to parse range')) {
      console.error('loadPersonalEvents error:', error);
    }
  }

  return personalEvents;
}

export async function listInstructorScheduleTool(
  nameOrEmail: string,
  timeMin: string,
  timeMax: string
) {
  const resolved = await resolveInstructorEmails(nameOrEmail);
  if (!resolved) {
    return { error: `강사를 찾을 수 없습니다: ${nameOrEmail}` };
  }
  if (resolved.candidates?.length) {
    return {
      error: '동명이인/유사 이름이 있습니다. 정확한 이름을 지정해주세요.',
      candidates: resolved.candidates,
    };
  }
  if (!resolved.emails.length) {
    return { error: `이메일을 찾을 수 없습니다: ${resolved.name}` };
  }

  const calendarResults = await Promise.all(
    resolved.emails.map((email) =>
      getInstructorEvents(email, CALENDAR_ID, timeMin, timeMax)
    )
  );
  const seen = new Set<string>();
  const calendarEvents: CalendarEvent[] = [];
  for (const events of calendarResults) {
    for (const event of events) {
      if (event.id && !seen.has(event.id)) {
        seen.add(event.id);
        calendarEvents.push(event);
      }
    }
  }

  const personalAll = await loadPersonalEvents(resolved.emails);
  const personalInRange = personalAll.filter((e) => {
    const key = eventDateKey(e);
    if (!key) return false;
    const minDay = timeMin.slice(0, 10);
    const maxDay = timeMax.slice(0, 10);
    return key >= minDay && key <= maxDay;
  });

  return {
    instructor: resolved.name,
    emails: resolved.emails,
    timeMin,
    timeMax,
    educationEvents: calendarEvents.map(summarizeEvent),
    personalEvents: personalInRange.map(summarizeEvent),
  };
}

function weekdaysInMonth(year: number, month: number): string[] {
  // month 1-12
  const days: string[] = [];
  const last = new Date(year, month, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay(); // 0 Sun .. 6 Sat
    if (dow === 0 || dow === 6) continue;
    const m = String(month).padStart(2, '0');
    const day = String(d).padStart(2, '0');
    days.push(`${year}-${m}-${day}`);
  }
  return days;
}

/** 기준 A: 평일 − (교육 일정 ∪ 강의 불가) */
export async function computeFreeWeekdaysTool(
  nameOrEmail: string,
  yearMonth: string
) {
  const match = /^(\d{4})-(\d{2})$/.exec((yearMonth || '').trim());
  if (!match) {
    return { error: 'yearMonth는 YYYY-MM 형식이어야 합니다. 예: 2025-10' };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const timeMin = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const timeMax = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59+09:00`;

  const schedule = await listInstructorScheduleTool(nameOrEmail, timeMin, timeMax);
  if ((schedule as any).error) return schedule;

  const busyDays = new Set<string>();
  for (const e of (schedule as any).educationEvents || []) {
    if (e.date) busyDays.add(e.date);
  }

  const unavailableDays = new Set<string>();
  const preferredDays = new Set<string>();
  for (const e of (schedule as any).personalEvents || []) {
    if (!e.date) continue;
    if (e.personalType === '강의 불가') unavailableDays.add(e.date);
    if (e.personalType === '강의 선호') preferredDays.add(e.date);
  }

  const allWeekdays = weekdaysInMonth(year, month);
  const freeWeekdays = allWeekdays.filter(
    (d) => !busyDays.has(d) && !unavailableDays.has(d)
  );

  return {
    instructor: (schedule as any).instructor,
    yearMonth,
    rule: '평일 − (캘린더 교육 ∪ 강의 불가). 주말·공휴일 제외. 강의 선호는 제외 조건 아님.',
    busyDays: Array.from(busyDays).sort(),
    unavailableDays: Array.from(unavailableDays).sort(),
    preferredDays: Array.from(preferredDays).sort(),
    freeWeekdays,
    weekdayCount: allWeekdays.length,
    freeCount: freeWeekdays.length,
  };
}

export const SCHEDULE_CHAT_TOOL_DECLARATIONS = [
  {
    name: 'list_instructors',
    description: '강사 이름·이메일 목록을 조회합니다.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_calendar_events',
    description:
      '지정 기간의 전체 기업교육 캘린더 일정을 조회합니다. 특정 날짜 교육/강사 질문에 사용합니다. timeMin/timeMax는 ISO 8601(+09:00)로 명시하세요.',
    parameters: {
      type: 'object',
      properties: {
        timeMin: {
          type: 'string',
          description: '시작 (예: 2025-10-28T00:00:00+09:00)',
        },
        timeMax: {
          type: 'string',
          description: '종료 (예: 2025-10-28T23:59:59+09:00)',
        },
      },
      required: ['timeMin', 'timeMax'],
    },
  },
  {
    name: 'list_instructor_schedule',
    description:
      '특정 강사의 교육 일정과 개인 일정(강의 선호/불가)을 조회합니다.',
    parameters: {
      type: 'object',
      properties: {
        nameOrEmail: {
          type: 'string',
          description: '강사 이름 또는 이메일',
        },
        timeMin: { type: 'string', description: '시작 ISO 8601' },
        timeMax: { type: 'string', description: '종료 ISO 8601' },
      },
      required: ['nameOrEmail', 'timeMin', 'timeMax'],
    },
  },
  {
    name: 'compute_free_weekdays',
    description:
      '특정 강사의 해당 월 빈 평일을 계산합니다. 규칙: 평일 − (교육 ∪ 강의 불가). 안 잡힌 일정/가능한 날 질문에 사용.',
    parameters: {
      type: 'object',
      properties: {
        nameOrEmail: { type: 'string', description: '강사 이름 또는 이메일' },
        yearMonth: {
          type: 'string',
          description: 'YYYY-MM (예: 2026-10). 연도 미지정 시 올해(Asia/Seoul) 사용',
        },
      },
      required: ['nameOrEmail', 'yearMonth'],
    },
  },
];

export async function runScheduleChatTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case 'list_instructors':
      return listInstructorsTool();
    case 'list_calendar_events':
      return listCalendarEventsTool(
        String(args.timeMin || ''),
        String(args.timeMax || '')
      );
    case 'list_instructor_schedule':
      return listInstructorScheduleTool(
        String(args.nameOrEmail || ''),
        String(args.timeMin || ''),
        String(args.timeMax || '')
      );
    case 'compute_free_weekdays':
      return computeFreeWeekdaysTool(
        String(args.nameOrEmail || ''),
        String(args.yearMonth || '')
      );
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
