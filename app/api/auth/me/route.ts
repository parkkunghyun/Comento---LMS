import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  
  if (!user) {
    return NextResponse.json(
      { error: '인증되지 않았습니다.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    role: user.role,
    user: {
      name: user.name,
      email: user.email,
      ...(user.role === 'INSTRUCTOR' && {
        mobile: user.mobile,
        fee: user.fee,
      }),
    },
  });
}



