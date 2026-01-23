'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EMDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // 섭외 현황 대시보드로 리다이렉트
    router.replace('/em/recruitment/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-gray-600">리다이렉트 중...</div>
      </div>
    </div>
  );
}
