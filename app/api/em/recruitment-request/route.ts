import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { randomUUID } from 'crypto';

/**
 * 섭외 요청 생성 API
 * POST /api/em/recruitment-request
 * 
 * Body: {
 *   eventIds: string[] // 선택된 일정의 eventId 배열
 * }
 * 
 * Response: {
 *   requestId: string // "R-" + UUID
 *   eventIds: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const user = await getCurrentUser();
    if (!user || user.role !== 'EM') {
      return NextResponse.json(
        { error: '인증되지 않았거나 권한이 없습니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { eventIds } = body;

    // 입력 검증
    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json(
        { error: '일정을 선택해주세요.' },
        { status: 400 }
      );
    }

    // requestId 생성: "R-" + UUID
    const requestId = `R-${randomUUID()}`;

    // TODO: 실제로는 데이터베이스나 Google Sheets에 저장해야 합니다.
    // 여기서는 메모리에 저장 (실제 구현 시 DB 사용 권장)
    console.log(`[섭외 요청 생성] requestId: ${requestId}, eventIds:`, eventIds);

    return NextResponse.json({
      success: true,
      requestId,
      eventIds,
    });
  } catch (error) {
    console.error('Recruitment request API error:', error);
    return NextResponse.json(
      { error: '섭외 요청 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
