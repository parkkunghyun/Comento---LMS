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
 * 강사 정보를 Google Spreadsheet에서 조회합니다 (이름과 이메일로).
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
 * 강사 정보를 이메일과 핀코드로 조회합니다.
 * @param email 강사 이메일 (H열)
 * @param pinCode 핀코드 (V열, 인덱스 21)
 * @returns 강사 정보 또는 null
 */
export async function findInstructorByEmailAndPin(email: string, pinCode: string): Promise<{
  name: string;
  email: string;
  mobile: string;
  fee: string;
  rowIndex: number;
} | null> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_LOGIN_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
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
      const storedPinCode = (row[21] || '').trim(); // V열 - 핀코드

      // 이메일과 핀코드가 모두 일치하는 경우
      if (
        instructorEmail === email.toLowerCase() &&
        storedPinCode === pinCode
      ) {
        return {
          name: (row[2] || '').trim(), // C열 - 강사이름
          email: (row[7] || '').trim(), // H열 - 이메일
          mobile: (row[6] || '').trim(), // G열 - 이동통신
          fee: (row[8] || '').trim(), // I열 - 강사료
          rowIndex: i + 1, // 1-based 행 번호
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching instructor by email and pin:', error);
    throw error;
  }
}

/**
 * 이메일로 강사 정보를 조회합니다 (핀코드 수정용).
 * @param email 강사 이메일 (H열)
 * @returns 강사 정보 또는 null
 */
export async function findInstructorByEmail(email: string): Promise<{
  name: string;
  email: string;
  rowIndex: number;
} | null> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_LOGIN_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
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

      if (instructorEmail === email.toLowerCase()) {
        return {
          name: (row[2] || '').trim(), // C열 - 강사이름
          email: (row[7] || '').trim(), // H열 - 이메일
          rowIndex: i + 1, // 1-based 행 번호
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching instructor by email:', error);
    throw error;
  }
}

/**
 * 강사 핀코드를 업데이트합니다.
 * @param rowIndex 시트의 행 번호 (1-based)
 * @param pinCode 새로운 핀코드
 */
export async function updateInstructorPinCode(rowIndex: number, pinCode: string): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_LOGIN_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = '강사 현황';

  try {
    // V열은 인덱스 21 (A=0, B=1, ..., V=21)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!V${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[pinCode]],
      },
    });
  } catch (error) {
    console.error('Error updating instructor pin code:', error);
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
    console.error('Error fetching instructor names:', error);
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
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // 이미 YYYY-MM-DD 형식인 경우 그대로 반환
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
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
 * @param externalOnly 외부 강사만 조회할지 여부 (D열이 "내부"가 아닌 강사만)
 * @returns 강사 정보 목록 (이름, 이메일)
 */
export async function getAllInstructorsWithEmail(externalOnly: boolean = false): Promise<Array<{ name: string; email: string }>> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_LOGIN_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
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
      const affiliation = (row[3] || '').trim(); // D열 - 소속

      // externalOnly가 true인 경우 "내부"인 강사 제외
      if (externalOnly && affiliation === '내부') {
        continue;
      }

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
  requestId: string; // A열: 요청ID
  educationName: string; // B열: 교육명
  educationDate: string; // C열: 교육일자
  instructorName: string; // D열: 강사명
  result: 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'REQUESTED'; // E열: 결과
  declineReason?: string; // F열: 거절사유
  responseDateTime?: string; // G열: 응답일시
  eventId?: string; // H열: 이벤트ID
  requestMonth: string; // I열: 요청월
}

/**
 * 강사별 섭외율 통계 타입
 */
export interface InstructorRecruitmentStats {
  instructorName: string;
  totalRequests: number;
  approvedCount: number;
  declinedCount: number;
  approvalRate: number;
  declineRate: number;
  educationDates: string[];
  declineReasons: DeclineReasonInfo[];
  monthlyStats: {
    [month: string]: {
      approved: number;
      declined: number;
      total: number;
    };
  };
}

/**
 * 거절 사유 정보 타입
 */
export interface DeclineReasonInfo {
  educationName: string;
  educationDate: string;
  declineReason: string;
  requestMonth: string;
}

/**
 * 외부강사_섭외_로그 시트에서 모든 섭외 로그를 조회합니다.
 * @returns 섭외 로그 데이터 목록
 */
export async function getAllRecruitmentLogs(): Promise<RecruitmentLogData[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_RECRUITMENT_LOG_SPREADSHEET_ID || process.env.GOOGLE_LOGIN_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
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
      if (requestId && educationName) {
        if (result === 'APPROVED' || result === 'DECLINED' || result === 'CANCELLED' || result === 'REQUESTED') {
          logs.push({
            requestId,
            educationName,
            educationDate,
            instructorName: normalizeName(instructorName),
            result: result as 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'REQUESTED',
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
  status: string; // A열: 상태
  name: string; // B열: 이름
  email: string; // C열: 이메일
  mobile: string; // D열: 전화번호
  affiliation: string; // E열: 소속
  specialty: string; // F열: 전문분야
  experience: string; // G열: 경력
  fee: string; // H열: 강사료
  availability: string; // I열: 가능일정
  notes: string; // J열: 특이사항
}

/**
 * 강사 상세 정보를 조회합니다 (강사 현황_v2 시트).
 * @returns 강사 상세 정보 목록
 */
export async function getAllInstructorDetails(): Promise<InstructorDetail[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
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
      
      const status = (row[0] || '').trim(); // A열: 상태
      const name = (row[1] || '').trim(); // B열: 이름
      const email = (row[2] || '').trim(); // C열: 이메일
      const mobile = (row[3] || '').trim(); // D열: 전화번호
      const affiliation = (row[4] || '').trim(); // E열: 소속
      const specialty = (row[5] || '').trim(); // F열: 전문분야
      const experience = (row[6] || '').trim(); // G열: 경력
      const fee = (row[7] || '').trim(); // H열: 강사료
      const availability = (row[8] || '').trim(); // I열: 가능일정
      const notes = (row[9] || '').trim(); // J열: 특이사항

      // 이름이 있는 경우만 추가
      if (name) {
        instructors.push({
          status,
          name: normalizeName(name),
          email,
          mobile,
          affiliation,
          specialty,
          experience,
          fee,
          availability,
          notes,
        });
      }
    }

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

/**
 * 강사 현황 시트에서 모든 강사 정보를 조회합니다 (D열이 "내부"인 경우 제외)
 * @returns 강사 정보 목록
 */
export interface InstructorInfo {
  rowIndex: number; // 시트의 행 번호 (1-based, 헤더 포함)
  name: string; // C열: 강사이름
  affiliation: string; // D열: 소속
  mobile: string; // G열: 이동통신
  email: string; // H열: 이메일
  fee: string; // I열: 강사료
  notes: string; // N열: 특이사항
  // 기타 필요한 컬럼들 추가 가능
  [key: string]: string | number; // 동적 필드 지원
}

export async function getAllInstructorInfo(excludeInternal: boolean = true): Promise<InstructorInfo[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_LOGIN_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
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

    const instructors: InstructorInfo[] = [];

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      const name = (row[2] || '').trim(); // C열: 강사이름
      const affiliation = (row[3] || '').trim(); // D열: 소속
      const notes = (row[13] || '').trim(); // N열: 특이사항
      
      // D열이 "내부"인 경우 제외
      if (excludeInternal && affiliation === '내부') {
        continue;
      }
      
      // 강사 이름이 있는 경우만 추가
      if (name) {
        instructors.push({
          rowIndex: i + 1, // 시트의 실제 행 번호 (1-based)
          name: normalizeName(name),
          affiliation,
          mobile: (row[6] || '').trim(), // G열: 이동통신
          email: (row[7] || '').trim(), // H열: 이메일
          fee: (row[8] || '').trim(), // I열: 강사료
          notes,
        });
      }
    }

    // 강사명으로 정렬
    return instructors.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching instructor info:', error);
    throw error;
  }
}

/**
 * 강사 정보를 시트에 업데이트합니다
 * @param rowIndex 시트의 행 번호 (1-based)
 * @param columnIndex 업데이트할 컬럼 인덱스 (0-based, A=0, B=1, ...)
 * @param value 업데이트할 값
 */
export async function updateInstructorCell(
  rowIndex: number,
  columnIndex: number,
  value: string
): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_LOGIN_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = '강사 현황';

  try {
    // 컬럼 인덱스를 알파벳으로 변환 (A, B, C, ...)
    const columnLetter = String.fromCharCode(65 + columnIndex); // A=65
    
    // 범위 지정 (예: C5, D5 등)
    const range = `${sheetName}!${columnLetter}${rowIndex}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value]],
      },
    });
  } catch (error) {
    console.error('Error updating instructor cell:', error);
    throw error;
  }
}

/**
 * 교육 일정 데이터 타입 (class_schedule(등록) 시트)
 */
export interface ClassScheduleData {
  rowIndex: number; // 시트의 행 번호 (0-based, 헤더 제외)
  educationDate: string; // 교육일
  isTentative: string; // 가일정 여부
  clientName: string; // 고객사명
  className: string; // 클래스명
  dri: string; // DRI
  instructor: string; // 강사
  coach: string; // 코치
}

/**
 * class_schedule(등록) 시트에서 교육 일정을 조회합니다.
 * @param year 필터링할 연도 (기본값: 2026)
 * @returns 교육 일정 데이터 목록
 */
export async function getClassSchedules(year: number = 2026): Promise<ClassScheduleData[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const sheetName = 'class_schedule(등록)';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    const schedules: ClassScheduleData[] = [];

    // 헤더 행을 제외하고 데이터 행만 처리
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      const educationDate = (row[0] || '').trim(); // A열: 교육일
      const isTentative = (row[1] || '').trim(); // B열: 가일정 여부
      const clientName = (row[2] || '').trim(); // C열: 고객사명
      const className = (row[3] || '').trim(); // D열: 클래스명
      const dri = (row[4] || '').trim(); // E열: DRI
      const instructor = (row[5] || '').trim(); // F열: 강사
      const coach = (row[6] || '').trim(); // G열: 코치

      // 연도 필터링 (교육일에서 연도 추출)
      if (educationDate) {
        const dateMatch = educationDate.match(/(\d{4})/);
        if (dateMatch) {
          const scheduleYear = parseInt(dateMatch[1]);
          if (scheduleYear !== year) {
            continue;
          }
        }
      }

      // 교육일이 있는 경우만 추가
      if (educationDate) {
        schedules.push({
          rowIndex: i, // 0-based, 헤더 제외
          educationDate,
          isTentative,
          clientName,
          className,
          dri,
          instructor,
          coach,
        });
      }
    }

    return schedules;
  } catch (error) {
    console.error('Error fetching class schedules:', error);
    throw error;
  }
}

/**
 * 기업명을 클래스명에서 추출합니다.
 * @param className 클래스명 (예: "[핑거]생성형AI교육_데이터 분석 과정")
 * @returns 기업명 (예: "핑거")
 */
export function extractCompanyName(className: string): string {
  if (!className) return '';
  const match = className.match(/\[([^\]]+)\]/);
  return match && match[1] ? match[1].trim() : '';
}

/**
 * 섭외 요청을 외부강사_섭외_로그 시트에 생성합니다.
 * @param requestId 요청 ID
 * @param schedules 선택된 교육 일정 목록
 * @param instructorName 강사 이름
 * @returns 수락 링크와 거절 링크
 */
export async function createRecruitmentRequest(
  requestId: string,
  schedules: ClassScheduleData[],
  instructorName: string
): Promise<{ acceptLink: string; declineLink: string }> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_RECRUITMENT_LOG_SPREADSHEET_ID || '1ygeuJ9dIVvbreU2CXTNDXonnew19EjWsJq7FJLMCLW0';
  const sheetName = '외부강사_섭외_로그';

  try {
    // GAS URL 생성
    const gasBaseUrl = 'https://script.google.com/macros/s/AKfycbxCOSOaj77QvaxnkeZwLiwdEwkJin-vr0PwOyj8KbUnMa0nDvI4etVp6luudRCMem_o/exec';
    const acceptLink = `${gasBaseUrl}?action=accept&requestId=${requestId}`;
    const declineLink = `${gasBaseUrl}?action=decline&requestId=${requestId}`;

    // 현재 날짜로 요청월 계산
    const now = new Date();
    const requestMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 각 일정에 대해 시트에 추가
    const values: any[][] = [];
    for (const schedule of schedules) {
      const companyName = extractCompanyName(schedule.className) || schedule.clientName;
      
      // 시트 구조: 요청ID | 기업명 | 교육명 | 교육일 | 멘토명 | 상태 | 응답일 | 거절사유
      values.push([
        requestId, // A열: 요청ID
        companyName, // B열: 기업명
        schedule.className, // C열: 교육명
        schedule.educationDate, // D열: 교육일
        instructorName, // E열: 멘토명
        'REQUESTED', // F열: 상태
        '', // G열: 응답일
        '', // H열: 거절사유
        requestMonth, // I열: 요청월
      ]);
    }

    // 시트에 데이터 추가
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    return { acceptLink, declineLink };
  } catch (error) {
    console.error('Error creating recruitment request:', error);
    throw error;
  }
}

/**
 * 외부강사_섭외_로그 시트에서 섭외 요청 목록을 조회합니다.
 * @returns 섭외 요청 데이터 목록
 */
export async function getRecruitmentRequests(): Promise<RecruitmentLogData[]> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_RECRUITMENT_LOG_SPREADSHEET_ID || '1ygeuJ9dIVvbreU2CXTNDXonnew19EjWsJq7FJLMCLW0';
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

    const requests: RecruitmentLogData[] = [];

    // 헤더 행을 제외하고 데이터 행만 처리
    // 시트 구조: 요청ID | 기업명 | 교육명 | 교육일 | 멘토명 | 상태 | 응답일 | 거절사유
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      const requestId = (row[0] || '').trim(); // A열: 요청ID
      const companyName = (row[1] || '').trim(); // B열: 기업명
      const educationName = (row[2] || '').trim(); // C열: 교육명
      const educationDate = (row[3] || '').trim(); // D열: 교육일
      const instructorName = (row[4] || '').trim(); // E열: 멘토명
      const status = (row[5] || '').trim().toUpperCase(); // F열: 상태
      const responseDate = (row[6] || '').trim(); // G열: 응답일
      const declineReason = (row[7] || '').trim(); // H열: 거절사유
      const requestMonth = (row[8] || '').trim(); // I열: 요청월

      // 요청ID가 있는 경우만 추가
      if (requestId) {
        requests.push({
          requestId,
          educationName: educationName || companyName, // 교육명이 없으면 기업명 사용
          educationDate,
          instructorName: normalizeName(instructorName),
          result: (status === 'APPROVED' || status === 'ACCEPTED' ? 'APPROVED' : status === 'DECLINED' ? 'DECLINED' : status === 'CANCELLED' ? 'CANCELLED' : 'REQUESTED') as 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'REQUESTED',
          declineReason: declineReason || undefined,
          responseDateTime: responseDate || undefined,
          requestMonth: requestMonth || '',
        });
      }
    }

    return requests;
  } catch (error) {
    console.error('Error fetching recruitment requests:', error);
    throw error;
  }
}

/**
 * shortId로 requestId를 찾습니다.
 * shortId가 requestId의 일부이거나 동일한 경우를 처리합니다.
 * @param shortId 짧은 ID
 * @returns requestId 또는 null
 */
export async function findRequestIdByShortId(shortId: string): Promise<string | null> {
  try {
    const requests = await getRecruitmentRequests();
    // shortId가 requestId에 포함되어 있는지 확인
    const matched = requests.find(req => 
      req.requestId.includes(shortId) || 
      req.requestId === shortId ||
      req.requestId.replace(/^R-/, '') === shortId
    );
    return matched ? matched.requestId : null;
  } catch (error) {
    console.error('Error finding requestId by shortId:', error);
    return null;
  }
}

/**
 * 승인된 섭외 요청을 처리하여 class_schedule(등록) 시트의 F열(강사)에 강사 이름을 추가합니다.
 * @param requestId 요청 ID
 * @returns 업데이트된 일정 개수
 */
export async function processApprovedRecruitment(requestId: string): Promise<number> {
  const sheets = getGoogleSheetsClient();
  const recruitmentSpreadsheetId = process.env.GOOGLE_RECRUITMENT_LOG_SPREADSHEET_ID || '1ygeuJ9dIVvbreU2CXTNDXonnew19EjWsJq7FJLMCLW0';
  const scheduleSpreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1MKm00PfsR4CWBF-xo9qThN8lElrZVg6wuC7blbZXL68';
  const recruitmentSheetName = '외부강사_섭외_로그';
  const scheduleSheetName = 'class_schedule(등록)';

  try {
    // 1. 외부강사_섭외_로그 시트에서 해당 requestId의 승인된 요청 조회
    const recruitmentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: recruitmentSpreadsheetId,
      range: `${recruitmentSheetName}!A:Z`,
    });

    const recruitmentRows = recruitmentResponse.data.values;
    if (!recruitmentRows || recruitmentRows.length === 0) {
      return 0;
    }

    // 승인된 요청 필터링 (requestId 일치, 상태가 APPROVED 또는 ACCEPTED)
    const approvedRequests: Array<{
      educationName: string;
      educationDate: string;
      instructorName: string;
    }> = [];

    for (let i = 1; i < recruitmentRows.length; i++) {
      const row = recruitmentRows[i];
      const reqId = (row[0] || '').trim();
      const status = (row[5] || '').trim().toUpperCase();
      const educationName = (row[2] || '').trim(); // C열: 교육명
      const educationDate = (row[3] || '').trim(); // D열: 교육일
      const instructorName = (row[4] || '').trim(); // E열: 멘토명

      if (reqId === requestId && (status === 'APPROVED' || status === 'ACCEPTED') && educationName && educationDate && instructorName) {
        approvedRequests.push({
          educationName,
          educationDate,
          instructorName,
        });
      }
    }

    if (approvedRequests.length === 0) {
      return 0;
    }

    // 2. class_schedule(등록) 시트에서 일치하는 행 찾기
    const scheduleResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: scheduleSpreadsheetId,
      range: `${scheduleSheetName}!A:Z`,
    });

    const scheduleRows = scheduleResponse.data.values;
    if (!scheduleRows || scheduleRows.length === 0) {
      return 0;
    }

    // 날짜 파싱 헬퍼 함수
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr) return null;
      
      const trimmed = dateStr.trim();
      
      // YYYY. M. D 형식 (예: "2026. 1. 18", "2026.1.18")
      const match1 = trimmed.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
      if (match1) {
        const [, year, month, day] = match1;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      
      // YYYY-MM-DD 형식 (예: "2026-01-18")
      const match2 = trimmed.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match2) {
        const [, year, month, day] = match2;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      
      // YYYY/MM/DD 형식 (예: "2026/01/18")
      const match3 = trimmed.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (match3) {
        const [, year, month, day] = match3;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      
      // YY-MM-DD 형식 (예: "26-01-18" -> 2026년으로 가정)
      const match4 = trimmed.match(/(\d{2})-(\d{1,2})-(\d{1,2})/);
      if (match4) {
        const [, year, month, day] = match4;
        const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
        return new Date(fullYear, parseInt(month) - 1, parseInt(day));
      }
      
      return null;
    };

    let updatedCount = 0;

    // 각 승인된 요청에 대해 일치하는 일정 찾기
    for (const approvedRequest of approvedRequests) {
      const requestDate = parseDate(approvedRequest.educationDate);
      if (!requestDate) {
        console.log(`Failed to parse date: ${approvedRequest.educationDate}`);
        continue;
      }

      console.log(`Processing approved request: EducationName=${approvedRequest.educationName}, Date=${approvedRequest.educationDate}, Instructor=${approvedRequest.instructorName}`);

      // class_schedule(등록) 시트에서 일치하는 행 찾기
      for (let i = 1; i < scheduleRows.length; i++) {
        const row = scheduleRows[i];
        const scheduleDateStr = (row[0] || '').trim(); // A열: 교육일
        const scheduleClassName = (row[3] || '').trim(); // D열: 클래스명
        const currentInstructor = (row[5] || '').trim(); // F열: 강사

        if (!scheduleDateStr || !scheduleClassName) {
          continue;
        }

        const scheduleDate = parseDate(scheduleDateStr);
        if (!scheduleDate) {
          continue;
        }

        // 날짜 비교 (A열: 교육일)
        const datesMatch = 
          requestDate.getFullYear() === scheduleDate.getFullYear() &&
          requestDate.getMonth() === scheduleDate.getMonth() &&
          requestDate.getDate() === scheduleDate.getDate();

        if (!datesMatch) {
          continue;
        }

        // 클래스명 비교 (D열: 클래스명과 교육명 비교)
        // 공백 제거 후 비교하여 더 정확한 매칭
        const normalizedScheduleClassName = scheduleClassName.replace(/\s+/g, '').toLowerCase();
        const normalizedEducationName = approvedRequest.educationName.replace(/\s+/g, '').toLowerCase();
        
        const namesMatch = normalizedScheduleClassName.includes(normalizedEducationName) || 
                          normalizedEducationName.includes(normalizedScheduleClassName) ||
                          normalizedScheduleClassName === normalizedEducationName;

        if (namesMatch) {
          console.log(`✓ Matching found: Date=${scheduleDateStr}, ClassName=${scheduleClassName}, EducationName=${approvedRequest.educationName}, Instructor=${approvedRequest.instructorName}`);
          
          // F열(강사) 업데이트
          const rowNumber = i + 1; // 1-based
          let newInstructorValue = approvedRequest.instructorName;

          // 기존 강사가 있으면 추가 (쉼표로 구분)
          if (currentInstructor && currentInstructor.trim() !== '') {
            const instructors = currentInstructor.split(',').map((s: string) => s.trim()).filter((s: string) => s);
            if (!instructors.includes(approvedRequest.instructorName)) {
              instructors.push(approvedRequest.instructorName);
              newInstructorValue = instructors.join(', ');
            } else {
              // 이미 있으면 업데이트하지 않음
              console.log(`  → Instructor ${approvedRequest.instructorName} already exists, skipping`);
              continue;
            }
          }

          // 시트 업데이트
          try {
            await sheets.spreadsheets.values.update({
              spreadsheetId: scheduleSpreadsheetId,
              range: `${scheduleSheetName}!F${rowNumber}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [[newInstructorValue]],
              },
            });
            console.log(`  → Updated row ${rowNumber}, F column with: ${newInstructorValue}`);
            updatedCount++;
          } catch (updateError) {
            console.error(`  → Error updating row ${rowNumber}:`, updateError);
          }
        }
      }
    }

    return updatedCount;
  } catch (error) {
    console.error('Error processing approved recruitment:', error);
    throw error;
  }
}

/**
 * 모든 승인된 섭외 요청을 처리합니다.
 * @returns 업데이트된 일정 개수
 */
export async function processAllApprovedRecruitments(): Promise<number> {
  const sheets = getGoogleSheetsClient();
  const recruitmentSpreadsheetId = process.env.GOOGLE_RECRUITMENT_LOG_SPREADSHEET_ID || '1ygeuJ9dIVvbreU2CXTNDXonnew19EjWsJq7FJLMCLW0';
  const recruitmentSheetName = '외부강사_섭외_로그';

  try {
    // 모든 requestId 수집
    const recruitmentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: recruitmentSpreadsheetId,
      range: `${recruitmentSheetName}!A:Z`,
    });

    const recruitmentRows = recruitmentResponse.data.values;
    if (!recruitmentRows || recruitmentRows.length === 0) {
      return 0;
    }

    // 고유한 requestId 수집 (승인된 것만)
    const uniqueRequestIds = new Set<string>();
    for (let i = 1; i < recruitmentRows.length; i++) {
      const row = recruitmentRows[i];
      const reqId = (row[0] || '').trim();
      const status = (row[5] || '').trim().toUpperCase();
      
      if (reqId && (status === 'APPROVED' || status === 'ACCEPTED')) {
        uniqueRequestIds.add(reqId);
      }
    }

    // 각 requestId에 대해 처리
    let totalUpdated = 0;
    for (const requestId of uniqueRequestIds) {
      try {
        const count = await processApprovedRecruitment(requestId);
        totalUpdated += count;
      } catch (error) {
        console.error(`Error processing requestId ${requestId}:`, error);
        // 개별 오류는 무시하고 계속 진행
      }
    }

    return totalUpdated;
  } catch (error) {
    console.error('Error processing all approved recruitments:', error);
    throw error;
  }
}
