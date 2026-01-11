import { google } from 'googleapis';

/**
 * Google Sheets API 클라이언트를 생성합니다.
 */
export function getGoogleSheetsClient() {
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
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets', // 쓰기 권한 추가 (섭외 로그 기록용)
    ],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * 강사 정보를 Google Spreadsheet에서 조회합니다.
 * @param name 강사 이름
 * @param email 강사 이메일
 * @returns 강사 정보 또는 null
 */
export async function findInstructor(name: string, email: string) {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = '강사 현황';

  try {
    // 시트의 모든 데이터를 가져옵니다
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`, // A열부터 Z열까지 읽기
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return null;
    }

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // 컬럼 인덱스: C열(2) - 강사이름, H열(7) - 이메일
      const instructorName = row[2]?.trim(); // C열
      const instructorEmail = row[7]?.trim(); // H열

      // 이름과 이메일이 모두 일치하는 경우
      if (
        instructorName === name &&
        instructorEmail === email
      ) {
        return {
          name: instructorName,
          mobile: row[6]?.trim() || '', // G열 - 이동통신
          email: instructorEmail,
          fee: row[8]?.trim() || '', // I열 - 강사료
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching instructor data:', error);
    throw error;
  }
}

/**
 * 이메일로 강사 이름을 조회합니다.
 * @param email 강사 이메일 (H열)
 * @returns 강사 이름 (C열) 또는 null
 */
export async function getInstructorNameByEmail(email: string): Promise<string | null> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || process.env.GOOGLE_LOGIN_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = '강사 현황';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return null;
    }

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const instructorEmail = (row[7] || '').trim().toLowerCase(); // H열 - 이메일
      const instructorName = (row[2] || '').trim(); // C열 - 강사 이름

      // 이메일이 일치하는 경우 강사 이름 반환
      if (instructorEmail === email.toLowerCase() && instructorName) {
        return instructorName;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching instructor name by email:', error);
    return null;
  }
}

/**
 * 여러 이메일로 강사 이름을 일괄 조회합니다.
 * @param emails 강사 이메일 배열
 * @returns 이메일을 키로 하는 강사 이름 맵
 */
export async function getInstructorNamesByEmails(emails: string[]): Promise<{ [email: string]: string }> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_LOGIN_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = '강사 현황';

  const emailToNameMap: { [email: string]: string } = {};

  try {
    console.log(`[강사 이름 조회] 조회할 이메일 개수: ${emails.length}`);
    console.log(`[강사 이름 조회] 시트 ID: ${spreadsheetId}, 시트명: ${sheetName}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('[강사 이름 조회] 시트 데이터가 없습니다.');
      return emailToNameMap;
    }

    console.log(`[강사 이름 조회] 시트 행 개수: ${rows.length}`);

    // 이메일을 소문자로 변환하여 비교용 맵 생성 (공백 제거)
    const emailLookup = new Set(emails.map(e => (e || '').trim().toLowerCase()).filter(e => e));

    console.log(`[강사 이름 조회] 조회 대상 이메일:`, Array.from(emailLookup));

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const instructorEmail = (row[7] || '').trim(); // H열 - 이메일 (인덱스 7)
      const instructorName = (row[2] || '').trim(); // C열 - 강사 이름 (인덱스 2)

      if (!instructorEmail) continue;

      const normalizedEmail = instructorEmail.toLowerCase();

      // 조회 대상 이메일 중 하나와 일치하는 경우
      if (emailLookup.has(normalizedEmail) && instructorName) {
        emailToNameMap[normalizedEmail] = instructorName;
        console.log(`[강사 이름 조회] 매칭 성공: ${instructorEmail} -> ${instructorName}`);
      }
    }

    console.log(`[강사 이름 조회] 최종 매칭 결과:`, emailToNameMap);
    return emailToNameMap;
  } catch (error) {
    console.error('[강사 이름 조회] 에러:', error);
    return emailToNameMap;
  }
}

/**
 * 모든 강사 목록을 조회합니다 (강사 현황 시트의 C열).
 * @returns 강사 이름 목록
 */
export async function getAllInstructorNames(): Promise<string[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = '강사 현황';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const instructorNames = new Set<string>();

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const instructorName = normalizeName(row[2] || ''); // C열 - 강사이름
      
      if (instructorName) {
        instructorNames.add(instructorName);
      }
    }

    return Array.from(instructorNames).sort();
  } catch (error) {
    console.error('Error fetching all instructor names:', error);
    throw error;
  }
}

/**
 * 모든 강사의 정산 데이터를 조회합니다 (EM용).
 * @returns 강사별 그룹화된 정산 데이터
 */
export async function getAllInstructorSettlements(): Promise<{ [instructorName: string]: GroupedSettlementData[] }> {
  // 1. 모든 강사 이름 가져오기
  const instructorNames = await getAllInstructorNames();
  
  // 2. 각 강사별 정산 데이터 조회
  const allSettlements: { [instructorName: string]: GroupedSettlementData[] } = {};
  
  for (const instructorName of instructorNames) {
    try {
      const settlements = await getInstructorSettlements(instructorName);
      if (settlements.length > 0) {
        allSettlements[instructorName] = settlements;
      }
    } catch (error) {
      console.error(`Error fetching settlements for ${instructorName}:`, error);
    }
  }

  return allSettlements;
}

/**
 * 정산 데이터 타입
 */
export interface SettlementData {
  mentorName: string; // B열 - 멘토명
  className: string; // E열 - 클래스명
  time: string; // I열 - 시간
  amount: string; // N열 - 정산 금액
  settlementDate: string; // O열 - 정산일자
}

/**
 * 그룹화된 정산 데이터 타입
 */
export interface GroupedSettlementData {
  date: string; // O열 - 정산일자
  classes: SettlementData[]; // 클래스 단위 데이터
  totalAmount: number; // N열 금액 합계
}

/**
 * 이름을 정규화합니다 (공백 제거, 대소문자 통일)
 */
function normalizeName(name: string): string {
  return name?.trim().replace(/\s+/g, ' ') || '';
}

/**
 * 날짜를 정규화합니다 (YY-MM-DD 형식을 YYYY-MM-DD로 변환)
 * @param dateString 날짜 문자열 (예: "25-10-28", "2025-10-28")
 * @returns 정규화된 날짜 문자열 (YYYY-MM-DD)
 */
function normalizeDate(dateString: string): string {
  if (!dateString) return '';
  
  const trimmed = dateString.trim();
  
  // YY-MM-DD 형식인 경우 (예: "25-10-28")
  const yyFormat = /^(\d{2})-(\d{1,2})-(\d{1,2})$/;
  const match = trimmed.match(yyFormat);
  
  if (match) {
    const [, year, month, day] = match;
    // 2자리 연도를 4자리로 변환 (00-50은 2000년대, 51-99는 1900년대로 가정)
    const fullYear = parseInt(year) <= 50 ? `20${year.padStart(2, '0')}` : `19${year.padStart(2, '0')}`;
    const normalizedMonth = month.padStart(2, '0');
    const normalizedDay = day.padStart(2, '0');
    return `${fullYear}-${normalizedMonth}-${normalizedDay}`;
  }
  
  // 이미 YYYY-MM-DD 형식이거나 다른 형식인 경우 그대로 반환
  return trimmed;
}

/**
 * 특정 강사의 정산 데이터를 조회하고 O열 기준으로 그룹핑합니다.
 * @param instructorName 강사 이름 (로그인 시 사용한 성함)
 * @returns 그룹화된 정산 데이터 목록
 */
export async function getInstructorSettlements(instructorName: string): Promise<GroupedSettlementData[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SETTLEMENT_SPREADSHEET_ID || '1aF4ZsnVXUH-gJ-4jZPSD0GFIVGYGCzNpo4-wiHLic4k';
  // 시트 이름: "정산시트"
  const sheetName = process.env.GOOGLE_SETTLEMENT_SHEET_NAME || '정산시트';

  try {
    // 이름 정규화
    const normalizedInstructorName = normalizeName(instructorName);
    console.log('Looking for settlements for instructor:', normalizedInstructorName);
    console.log('Using spreadsheet ID:', spreadsheetId);
    console.log('Using sheet name:', sheetName);

    // 시트의 모든 데이터를 가져옵니다
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`, // "정산시트" 시트 사용
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No rows found in settlement spreadsheet');
      return [];
    }

    console.log(`Total rows in settlement sheet: ${rows.length}`);

    const settlements: SettlementData[] = [];
    const allMentorNames = new Set<string>();

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // 컬럼 인덱스: B열(1) - 멘토명, E열(4) - 클래스명, I열(8) - 시간, N열(13) - 정산 금액, O열(14) - 정산일자
      const mentorName = normalizeName(row[1] || ''); // B열 - 멘토명
      const className = row[4]?.trim() || ''; // E열 - 클래스명
      const time = row[8]?.trim() || ''; // I열 - 시간
      const amount = row[13]?.trim() || ''; // N열 - 정산 금액
      const settlementDate = row[14]?.trim() || ''; // O열 - 정산일자

      // 모든 멘토명 수집 (디버깅용)
      if (mentorName) {
        allMentorNames.add(mentorName);
      }

      // 해당 강사의 데이터만 필터링 (이름 정확히 일치)
      if (mentorName === normalizedInstructorName && settlementDate) {
        // 날짜 정규화 (YY-MM-DD -> YYYY-MM-DD)
        const normalizedDate = normalizeDate(settlementDate);
        settlements.push({
          mentorName,
          className,
          time,
          amount,
          settlementDate: normalizedDate, // 정규화된 날짜 사용
        });
      }
    }

    console.log(`Found ${settlements.length} settlements for ${normalizedInstructorName}`);
    console.log('All mentor names in settlement sheet:', Array.from(allMentorNames));
    console.log('Looking for instructor name:', normalizedInstructorName);
    console.log('Matching names found:', Array.from(allMentorNames).filter(name => name === normalizedInstructorName));

    // 6. O열 기준으로 그룹핑
    const grouped: { [key: string]: SettlementData[] } = {};
    settlements.forEach((item) => {
      const date = item.settlementDate;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });

    // 7. N열 금액 합계 계산 및 결과 생성
    const result: GroupedSettlementData[] = Object.keys(grouped)
      .sort((a, b) => {
        // 날짜 내림차순 정렬 (최신순)
        // YYYY-MM-DD 형식이므로 문자열 비교로 정렬 가능하지만, Date 객체로 변환하여 확실하게 정렬
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime(); // 최신 날짜가 먼저 오도록
      })
      .map((date) => {
        const classes = grouped[date];
        // N열 금액 합계 계산
        const totalAmount = classes.reduce((sum, item) => {
          // 쉼표 제거 후 숫자로 변환
          const amount = parseFloat(item.amount.replace(/,/g, '')) || 0;
          return sum + amount;
        }, 0);

        return {
          date,
          classes,
          totalAmount,
        };
      });

    console.log(`Grouped into ${result.length} date groups`);

    return result;
  } catch (error) {
    console.error('Error fetching settlement data:', error);
    throw error;
  }
}

/**
 * 강사 이름과 이메일을 함께 조회합니다.
 * @returns 강사 정보 목록 (이름, 이메일)
 */
export async function getAllInstructorsWithEmail(): Promise<Array<{ name: string; email: string }>> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = '강사 현황';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const instructors: Array<{ name: string; email: string }> = [];
    const seen = new Set<string>();

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const instructorName = normalizeName(row[2] || ''); // C열 - 강사이름
      const instructorEmail = row[7]?.trim() || ''; // H열 - 이메일

      // 중복 제거 (이름 기준)
      if (instructorName && instructorEmail && !seen.has(instructorName)) {
        seen.add(instructorName);
        instructors.push({
          name: instructorName,
          email: instructorEmail,
        });
      }
    }

    return instructors.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching instructors with email:', error);
    throw error;
  }
}

/**
 * 매니저 목록을 조회합니다 (manager_name 시트).
 * @returns 매니저 정보 목록 (이름, 이메일)
 */
export async function getAllManagers(): Promise<Array<{ name: string; email: string }>> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = 'manager_name';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const managers: Array<{ name: string; email: string }> = [];
    const seen = new Set<string>();

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const managerEmail = row[0]?.trim() || ''; // A열 - 이메일
      const managerName = normalizeName(row[1] || ''); // B열 - 이름

      // 중복 제거 (이름 기준)
      if (managerName && managerEmail && !seen.has(managerName)) {
        seen.add(managerName);
        managers.push({
          name: managerName,
          email: managerEmail,
        });
      }
    }

    return managers.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching managers:', error);
    throw error;
  }
}

/**
 * 섭외 로그를 기록합니다.
 * @param instructorName 강사 이름
 * @param instructorEmail 강사 이메일
 * @param projectName 프로젝트/클래스명 (선택사항)
 */
export async function logRecruitment(
  instructorName: string,
  instructorEmail: string,
  projectName?: string
): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = '외부강사_섭외_월별통계';

  try {
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // 시트에 데이터 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          date, // A열: 날짜
          instructorName, // B열: 강사 이름
          instructorEmail, // C열: 강사 이메일
          projectName || '', // D열: 프로젝트명 (선택사항)
          '완료', // E열: 상태
        ]],
      },
    });

    console.log(`Recruitment logged for ${instructorName}`);
  } catch (error) {
    console.error('Error logging recruitment:', error);
    throw error;
  }
}

/**
 * 섭외 로그 데이터 타입
 */
export interface RecruitmentLogData {
  requestId: string; // A열
  educationName: string; // B열
  educationDate: string; // C열
  instructorName: string; // D열
  result: 'APPROVED' | 'DECLINED' | 'CANCELLED'; // E열
  declineReason?: string; // F열
  responseDateTime?: string; // G열
  eventId?: string; // H열
  requestMonth: string; // I열 (YYYY-MM 형식)
}

/**
 * 거절 사유 정보
 */
export interface DeclineReasonInfo {
  educationName: string; // 교육명
  educationDate: string; // 교육일자
  declineReason: string; // 거절사유
  requestMonth: string; // 요청월
}

/**
 * 강사별 섭외율 통계 타입
 */
export interface InstructorRecruitmentStats {
  instructorName: string;
  totalRequests: number; // CANCELLED 제외
  approvedCount: number;
  declinedCount: number;
  approvalRate: number; // 수락율 (%)
  declineRate: number; // 거절율 (%)
  educationDates: string[]; // 교육일자 목록
  declineReasons: DeclineReasonInfo[]; // 거절 사유 목록
  monthlyStats: {
    [month: string]: {
      approved: number;
      declined: number;
      total: number;
    };
  };
}

/**
 * 외부강사_섭외_로그 시트에서 모든 섭외 로그를 조회합니다.
 * @returns 섭외 로그 데이터 목록
 */
export async function getAllRecruitmentLogs(): Promise<RecruitmentLogData[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_LOGIN_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = '외부강사_섭외_로그';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const logs: RecruitmentLogData[] = [];

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      const requestId = (row[0] || '').trim(); // A열: 요청ID
      const educationName = (row[1] || '').trim(); // B열: 교육명
      const educationDate = (row[2] || '').trim(); // C열: 교육일자
      const instructorName = (row[3] || '').trim(); // D열: 강사명
      const result = (row[4] || '').trim().toUpperCase(); // E열: 결과
      const declineReason = (row[5] || '').trim(); // F열: 거절사유
      const responseDateTime = (row[6] || '').trim(); // G열: 응답일시
      const eventId = (row[7] || '').trim(); // H열: 이벤트ID
      const requestMonth = (row[8] || '').trim(); // I열: 요청월

      // 필수 필드가 있는 경우만 추가
      if (requestId && instructorName && result) {
        if (result === 'APPROVED' || result === 'DECLINED' || result === 'CANCELLED') {
          logs.push({
            requestId,
            educationName,
            educationDate,
            instructorName: normalizeName(instructorName),
            result: result as 'APPROVED' | 'DECLINED' | 'CANCELLED',
            declineReason: declineReason || undefined,
            responseDateTime: responseDateTime || undefined,
            eventId: eventId || undefined,
            requestMonth: requestMonth || '',
          });
        }
      }
    }

    return logs;
  } catch (error) {
    console.error('Error fetching recruitment logs:', error);
    throw error;
  }
}

/**
 * 강사 상세 정보 타입 (강사 현황_v2 시트)
 */
export interface InstructorDetail {
  status: string; // A열: 강사 상태
  name: string; // B열: 강사이름
  affiliation: string; // C열: 소속
  role: string; // D열: 직무
  yearsOfExperience: string; // E열: 연차
  monthlyAverageClasses: string; // F열: 월별 평균 출강수
  level: string; // G열: 강사레벨
  levelDescription: string; // H열: 강사레벨 Description
  educationStrategy: string; // I열: 교육 주제 / 파견 전략
  notes: string; // J열: 특이사항
  availableAreas: {
    newDevelopment: boolean; // K열: 신규개발과정(주제미정)
    leaderExecutive: boolean; // L열: 리더교육(임원)
    leaderManager: boolean; // M열: 리더교육(팀장)
    specialLecture: boolean; // N열: 특강(2H)
    standardEducation: boolean; // O열: 표준교육
    reportEducation: boolean; // P열: 보고서교육
    handsOnSession: boolean; // Q열: 핸즈온 세션
  };
}

/**
 * 강사 현황_v2 시트에서 모든 강사 상세 정보를 조회합니다.
 * @returns 강사 상세 정보 목록
 */
export async function getAllInstructorDetails(): Promise<InstructorDetail[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_LOGIN_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = '강사 현황_v2';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const instructors: InstructorDetail[] = [];

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // A열은 번호이므로 무시하고, B열부터 읽기
      const status = (row[1] || '').trim(); // B열: 강사 상태
      const name = (row[2] || '').trim(); // C열: 강사이름
      
      // 강사 이름이 있는 경우만 추가
      if (name) {
        const affiliation = (row[3] || '').trim(); // D열: 소속
        const role = (row[4] || '').trim(); // E열: 직무
        const yearsOfExperience = (row[5] || '').trim(); // F열: 연차
        const monthlyAverageClasses = (row[6] || '').trim(); // G열: 월별 평균 출강수
        const level = (row[7] || '').trim(); // H열: 강사레벨
        const levelDescription = (row[8] || '').trim(); // I열: 강사레벨 Description
        const educationStrategy = (row[9] || '').trim(); // J열: 교육 주제 / 파견 전략
        const notes = (row[10] || '').trim(); // K열: 특이사항

        // 교육가능영역 (L~R열)
        const newDevelopment = (row[11] || '').trim().toLowerCase() === 'o'; // L열
        const leaderExecutive = (row[12] || '').trim().toLowerCase() === 'o'; // M열
        const leaderManager = (row[13] || '').trim().toLowerCase() === 'o'; // N열
        const specialLecture = (row[14] || '').trim().toLowerCase() === 'o'; // O열
        const standardEducation = (row[15] || '').trim().toLowerCase() === 'o'; // P열
        const reportEducation = (row[16] || '').trim().toLowerCase() === 'o'; // Q열
        const handsOnSession = (row[17] || '').trim().toLowerCase() === 'o'; // R열

        instructors.push({
          status,
          name: normalizeName(name),
          affiliation,
          role,
          yearsOfExperience,
          monthlyAverageClasses,
          level,
          levelDescription,
          educationStrategy,
          notes,
          availableAreas: {
            newDevelopment,
            leaderExecutive,
            leaderManager,
            specialLecture,
            standardEducation,
            reportEducation,
            handsOnSession,
          },
        });
      }
    }

    // 강사명으로 정렬
    return instructors.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching instructor details:', error);
    throw error;
  }
}

/**
 * 강사별 섭외율 통계를 계산합니다.
 * @returns 강사별 섭외율 통계
 */
export async function getInstructorRecruitmentStats(): Promise<InstructorRecruitmentStats[]> {
  const logs = await getAllRecruitmentLogs();

  // 강사별로 그룹화
  const instructorMap = new Map<string, RecruitmentLogData[]>();

  logs.forEach((log) => {
    // CANCELLED는 제외
    if (log.result === 'CANCELLED') {
      return;
    }

    const instructorName = log.instructorName;
    if (!instructorMap.has(instructorName)) {
      instructorMap.set(instructorName, []);
    }
    instructorMap.get(instructorName)!.push(log);
  });

  // 통계 계산
  const stats: InstructorRecruitmentStats[] = [];

  instructorMap.forEach((logs, instructorName) => {
    const approvedCount = logs.filter((log) => log.result === 'APPROVED').length;
    const declinedCount = logs.filter((log) => log.result === 'DECLINED').length;
    const totalRequests = logs.length;
    const approvalRate = totalRequests > 0 ? (approvedCount / totalRequests) * 100 : 0;
    const declineRate = totalRequests > 0 ? (declinedCount / totalRequests) * 100 : 0;

    // 교육일자 목록 (중복 제거, 정렬)
    const educationDates = Array.from(
      new Set(logs.map((log) => log.educationDate).filter((date) => date))
    ).sort();

    // 거절 사유 목록 수집
    const declineReasons: DeclineReasonInfo[] = logs
      .filter((log) => log.result === 'DECLINED' && log.declineReason)
      .map((log) => ({
        educationName: log.educationName || '',
        educationDate: log.educationDate || '',
        declineReason: log.declineReason || '',
        requestMonth: log.requestMonth || '',
      }));

    // 월별 통계
    const monthlyStats: { [month: string]: { approved: number; declined: number; total: number } } = {};
    logs.forEach((log) => {
      const month = log.requestMonth || '';
      if (!monthlyStats[month]) {
        monthlyStats[month] = { approved: 0, declined: 0, total: 0 };
      }
      if (log.result === 'APPROVED') {
        monthlyStats[month].approved++;
      } else if (log.result === 'DECLINED') {
        monthlyStats[month].declined++;
      }
      monthlyStats[month].total++;
    });

    stats.push({
      instructorName,
      totalRequests,
      approvedCount,
      declinedCount,
      approvalRate: Math.round(approvalRate * 10) / 10, // 소수점 첫째자리까지
      declineRate: Math.round(declineRate * 10) / 10,
      educationDates,
      declineReasons,
      monthlyStats,
    });
  });

  // 강사명으로 정렬
  return stats.sort((a, b) => a.instructorName.localeCompare(b.instructorName));
}

/**
 * 전체 월별 섭외율 통계를 계산합니다.
 * @returns 월별 통계 (월 -> { approved, declined, total })
 */
export async function getOverallMonthlyRecruitmentStats(): Promise<{
  [month: string]: { approved: number; declined: number; total: number };
}> {
  const logs = await getAllRecruitmentLogs();

  // 월별 통계
  const monthlyStats: { [month: string]: { approved: number; declined: number; total: number } } = {};

  logs.forEach((log) => {
    // CANCELLED는 제외
    if (log.result === 'CANCELLED') {
      return;
    }

    const month = log.requestMonth || '';
    if (!month) {
      return;
    }

    if (!monthlyStats[month]) {
      monthlyStats[month] = { approved: 0, declined: 0, total: 0 };
    }

    if (log.result === 'APPROVED') {
      monthlyStats[month].approved++;
    } else if (log.result === 'DECLINED') {
      monthlyStats[month].declined++;
    }
    monthlyStats[month].total++;
  });

  return monthlyStats;
}


