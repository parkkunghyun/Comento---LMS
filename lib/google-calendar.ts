import { google } from 'googleapis';
import { getInstructorNamesByEmails } from './google-sheets';

/**
 * Google Calendar API 클라이언트를 생성합니다.
 */
export function getGoogleCalendarClient() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!serviceAccountEmail || !serviceAccountPrivateKey) {
    throw new Error('Google Service Account credentials are not configured');
  }

  // Private Key의 개행 문자를 처리
  const privateKey = serviceAccountPrivateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  return google.calendar({ version: 'v3', auth });
}

/**
 * 캘린더 이벤트 타입
 */
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    instructorName?: string; // 강사 이름 (이메일로 조회)
  }>;
  location?: string;
}

/**
 * 특정 강사의 이메일이 참석자로 포함된 일정을 조회합니다.
 * @param instructorEmail 강사 이메일
 * @param calendarId 캘린더 ID
 * @param timeMin 시작 시간 (ISO 8601)
 * @param timeMax 종료 시간 (ISO 8601)
 * @returns 일정 목록
 */
export async function getInstructorEvents(
  instructorEmail: string,
  calendarId: string,
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEvent[]> {
  const calendar = getGoogleCalendarClient();

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500, // 충분한 수의 이벤트 가져오기
    });

    const events = response.data.items || [];

    // 참석자 이메일로 필터링
    const filteredEvents = events.filter((event) => {
      if (!event.attendees || event.attendees.length === 0) {
        return false;
      }
      // 참석자 중에 해당 강사 이메일이 있는지 확인
      return event.attendees.some(
        (attendee) => attendee.email?.toLowerCase() === instructorEmail.toLowerCase()
      );
    });

    // 모든 참석자 이메일 수집
    const allAttendeeEmails = new Set<string>();
    filteredEvents.forEach((event) => {
      event.attendees?.forEach((attendee) => {
        if (attendee.email) {
          allAttendeeEmails.add(attendee.email.trim());
        }
      });
    });

    console.log(`[강사 캘린더] 참석자 이메일 수집: ${allAttendeeEmails.size}개`);
    console.log(`[강사 캘린더] 참석자 이메일 목록:`, Array.from(allAttendeeEmails));

    // 강사 이름 일괄 조회
    const emailToNameMap = await getInstructorNamesByEmails(Array.from(allAttendeeEmails));
    
    console.log(`[강사 캘린더] 강사 이름 매핑 결과:`, emailToNameMap);

    // 이벤트 변환 및 강사 이름 추가
    const instructorEvents = filteredEvents.map((event) => ({
      id: event.id || '',
      summary: event.summary || '제목 없음',
      description: event.description || '',
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
      },
      attendees: event.attendees?.map((a) => ({
        email: a.email || '',
        displayName: a.displayName || '',
        responseStatus: a.responseStatus || '',
        instructorName: a.email ? emailToNameMap[a.email.toLowerCase()] || undefined : undefined,
      })),
      location: event.location || '',
    }));

    return instructorEvents;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

/**
 * 모든 일정을 조회합니다 (EM용 - 필터링 없음).
 * @param calendarId 캘린더 ID
 * @param timeMin 시작 시간 (ISO 8601)
 * @param timeMax 종료 시간 (ISO 8601)
 * @returns 일정 목록
 */
export async function getAllEvents(
  calendarId: string,
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEvent[]> {
  const calendar = getGoogleCalendarClient();

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500, // 충분한 수의 이벤트 가져오기
    });

    const events = response.data.items || [];

    // 모든 참석자 이메일 수집
    const allAttendeeEmails = new Set<string>();
    events.forEach((event) => {
      event.attendees?.forEach((attendee) => {
        if (attendee.email) {
          allAttendeeEmails.add(attendee.email.trim());
        }
      });
    });

    console.log(`[EM 캘린더] 참석자 이메일 수집: ${allAttendeeEmails.size}개`);
    console.log(`[EM 캘린더] 참석자 이메일 목록:`, Array.from(allAttendeeEmails));

    // 강사 이름 일괄 조회
    const emailToNameMap = await getInstructorNamesByEmails(Array.from(allAttendeeEmails));
    
    console.log(`[EM 캘린더] 강사 이름 매핑 결과:`, emailToNameMap);

    // 모든 이벤트를 변환 (필터링 없음) 및 강사 이름 추가
    const allEvents = events.map((event) => ({
      id: event.id || '',
      summary: event.summary || '제목 없음',
      description: event.description || '',
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
      },
      attendees: event.attendees?.map((a) => ({
        email: a.email || '',
        displayName: a.displayName || '',
        responseStatus: a.responseStatus || '',
        instructorName: a.email ? emailToNameMap[a.email.toLowerCase()] || undefined : undefined,
      })),
      location: event.location || '',
    }));

    return allEvents;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

