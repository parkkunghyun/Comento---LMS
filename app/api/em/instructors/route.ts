import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getAllInstructorsWithEmail } from '@/lib/google-sheets';

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const user = await getCurrentUser();
    if (!user || user.role !== 'EM') {
      return NextResponse.json(
        { error: '인증되지 않았거나 권한이 없습니다.' },
        { status: 401 }
      );
    }

    // ?includeInternal=true 면 내부 강사도 포함, 기본은 외부 강사만
    const { searchParams } = new URL(request.url);
    const includeInternal = searchParams.get('includeInternal') === 'true';
    const instructors = await getAllInstructorsWithEmail(!includeInternal);

    return NextResponse.json({
      success: true,
      instructors,
    });
  } catch (error) {
    console.error('Instructors API error:', error);
    return NextResponse.json(
      { error: '강사 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


