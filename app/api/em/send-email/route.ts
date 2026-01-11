import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendEmailWithOAuth } from '@/lib/google-gmail-oauth';

/**
 * ⚠️ OAuth2 토큰 관리 방법:
 * 
 * 1. 초기 인증:
 *    - GET /api/auth/oauth/authorize 호출
 *    - 사용자가 Google 로그인 후 리다이렉트
 *    - GET /api/auth/oauth/callback에서 토큰 저장
 * 
 * 2. 토큰 저장:
 *    - 데이터베이스 또는 환경 변수에 저장
 *    - 여기서는 환경 변수 사용 (실제로는 DB 권장)
 * 
 * 3. 토큰 사용:
 *    - 메일 전송 시 저장된 토큰 사용
 *    - 토큰 만료 시 자동 갱신
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
    const { to, from, subject, body: emailBody } = body;

    // 입력 검증
    if (!to || !subject || !emailBody || !from) {
      return NextResponse.json(
        { error: '수신자, 발송자, 제목, 본문을 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    // ⚠️ OAuth2 토큰 가져오기
    // 실제 구현에서는 데이터베이스에서 가져와야 합니다.
    // 여기서는 환경 변수 사용 (MVP)
    const accessToken = process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { 
          error: 'OAuth2 토큰이 설정되지 않았습니다. 먼저 OAuth 인증을 완료해주세요.',
          authUrl: '/api/auth/oauth/authorize' // 인증 URL 제공
        },
        { status: 401 }
      );
    }

    // ⚠️ 중요: From 주소는 반드시 OAuth 인증된 계정과 일치해야 합니다.
    // 여기서는 from 파라미터를 사용하되, 실제로는 인증된 계정과 검증 필요

    // 이메일 전송 (OAuth2 기반)
    await sendEmailWithOAuth(
      to,
      subject,
      emailBody,
      from, // 인증된 계정과 일치해야 함
      accessToken,
      refreshToken
    );

    return NextResponse.json({
      success: true,
      message: '이메일이 성공적으로 전송되었습니다.',
    });
  } catch (error: any) {
    console.error('Send email API error:', error);
    
    // failedPrecondition 에러 처리
    if (error.message?.includes('failedPrecondition') || 
        error.message?.includes('Precondition check failed')) {
      return NextResponse.json(
        { 
          error: error.message || '메일 전송 실패: 인증된 계정과 From 주소가 일치하지 않거나, 토큰에 gmail.send scope가 없습니다.',
          requiresReauth: true,
          authUrl: '/api/auth/oauth/authorize'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || '이메일 전송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
