'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface User {
  role: string;
  user: {
    name: string;
    email: string;
    mobile?: string;
    fee?: string;
  };
}

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.error || data.role !== 'INSTRUCTOR') {
          router.push('/login');
        } else {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  const menuItems = [
    { href: '/instructor', label: '캘린더' },
    { href: '/instructor/feedback', label: '피드백' },
    { href: '/instructor/settlement', label: '정산' },
    { href: '/instructor/expense-report', label: '지출결의서 작성' },
    { href: '/instructor/reset-pin', label: '핀코드 재설정' },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] flex">
      {/* 사이드바 */}
      <aside className="w-64 bg-white border-r border-gray-200/60 min-h-screen">
        <div className="p-6 border-b border-gray-200/60">
          <h1 className="text-xl font-semibold text-gray-800 tracking-tight">강사관리 LMS</h1>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className={`
                      block px-4 py-2.5 text-sm font-medium rounded-lg transition-all
                      ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <header className="bg-white border-b border-gray-200/60">
          <div className="px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium text-gray-800">강사 섭외 관리</h2>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.user.name}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="flex-1 p-6 overflow-auto bg-[#fafafa]">
          {children}
        </main>
      </div>
    </div>
  );
}
