import { NextRequest, NextResponse } from 'next/server';
import { getShortLinkByCode } from '@/lib/google-sheets';

/**
 * 섭외 짧은 링크 리다이렉트
 * GET /s/[code]/accept → 실제 수락 GAS URL로 302
 * GET /s/[code]/decline → 실제 거절 GAS URL로 302
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string; action: string }> }
) {
  const { code, action } = await params;
  if (!code || !action) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const normalizedAction = action.toLowerCase();
  if (normalizedAction !== 'accept' && normalizedAction !== 'decline') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const link = await getShortLinkByCode(code);
    if (!link) {
      return NextResponse.json({ error: '링크를 찾을 수 없습니다.' }, { status: 404 });
    }
    const redirectUrl = normalizedAction === 'accept' ? link.acceptUrl : link.declineUrl;
    if (!redirectUrl) {
      return NextResponse.json({ error: '링크를 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.redirect(redirectUrl, 302);
  } catch (e) {
    console.error('Short link redirect error:', e);
    return NextResponse.json({ error: '오류가 발생했습니다.' }, { status: 500 });
  }
}
