'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface User {
  role: string;
  user: {
    name: string;
    email: string;
  };
}

export default function EMLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.error || data.role !== 'EM') {
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

  // 현재 경로에 따라 메뉴 자동 확장
  useEffect(() => {
    const newExpanded = new Set<string>();
    
    // 강사 섭외 메뉴 확인
    if (pathname.startsWith('/em/recruitment')) {
      newExpanded.add('instructor-recruitment');
    }
    
    // 실습코치 섭외 메뉴 확인
    if (pathname.startsWith('/em/coach/recruitment')) {
      newExpanded.add('coach-recruitment');
    }
    
    setExpandedMenus(newExpanded);
  }, [pathname]);


  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <div className="text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  const toggleMenu = (menuKey: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuKey)) {
      newExpanded.delete(menuKey);
    } else {
      newExpanded.add(menuKey);
    }
    setExpandedMenus(newExpanded);
  };

  const menuItems = [
    {
      key: 'instructor-recruitment',
      label: '강사 섭외',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      children: [
        { 
          href: '/em/recruitment/dashboard', 
          label: '섭외 현황 대시보드',
        },
        { 
          href: '/em/recruitment/create', 
          label: '섭외 요청 생성',
        },
      ]
    },
    {
      key: 'coach-recruitment',
      label: '실습코치 섭외',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      children: [
        { 
          href: '/em/coach/recruitment/dashboard', 
          label: '섭외 현황 대시보드',
        },
        { 
          href: '/em/coach/recruitment/create', 
          label: '섭외 요청 생성',
        },
      ]
    },
    { 
      href: '/em/schedule', 
      label: '일정 확인',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      href: '/em/instructors', 
      label: '강사 현황',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    { 
      href: '/em/feedback', 
      label: '피드백 관리',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      )
    },
    { 
      href: '/em/settlement', 
      label: '정산 관리',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      href: '/em/expense-reports', 
      label: '지출결의서 관리',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 */}
      <aside className="fixed left-0 top-0 w-56 bg-white border-r border-gray-200 h-screen overflow-y-auto z-20">
        {/* 로고 영역 */}
        <div className="p-6 border-b border-gray-200/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">강사관리 LMS</h1>
            </div>
          </div>
        </div>

        {/* 메인 메뉴 */}
        <nav className="p-4">
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-3">MAIN MENU</p>
            <ul className="space-y-1">
              {menuItems.map((item) => {
                if ('children' in item && item.children) {
                  // 하위 메뉴가 있는 경우
                  const menuKey = item.key || '';
                  const isExpanded = expandedMenus.has(menuKey);
                  const hasActiveChild = item.children.some(child => pathname === child.href);
                  
                  return (
                    <li key={menuKey}>
                      <button
                        onClick={() => toggleMenu(menuKey)}
                        className={`
                          w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                          ${
                            hasActiveChild
                              ? 'bg-gray-100 text-gray-900 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <span className={hasActiveChild ? 'text-gray-700' : 'text-gray-500'}>{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <ul className="ml-4 mt-2 space-y-1 border-l-2 border-gray-200 pl-4">
                          {item.children.map((child) => {
                            const isActive = pathname === child.href;
                            return (
                              <li key={child.href}>
                                <a
                                  href={child.href}
                                  className={`
                                    block px-4 py-2.5 text-sm rounded-lg transition-all duration-200
                                    ${
                                      isActive
                                        ? 'bg-gray-100 text-gray-900 font-semibold'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }
                                  `}
                                >
                                  {child.label}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                } else {
                  // 일반 메뉴 항목
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className={`
                          flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                          ${
                            isActive
                              ? 'bg-gray-100 text-gray-900 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }
                        `}
                      >
                        <span className={isActive ? 'text-gray-700' : 'text-gray-500'}>{item.icon}</span>
                        <span>{item.label}</span>
                      </a>
                    </li>
                  );
                }
              })}
            </ul>
          </div>
        </nav>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className="ml-56 flex flex-col min-h-screen flex-1">
        {/* 헤더 */}
        <header className="bg-white border-b border-gray-200/60 sticky top-0 z-10">
          <div className="px-8 py-4 flex justify-between items-center">
            <div></div>

            {/* 우측: 강사 섭외하기 버튼 + 프로필 */}
            <div className="flex items-center gap-4">
              {/* 강사 섭외하기 버튼 */}
              <a
                href="/em/recruitment/create"
                className="px-5 py-2.5 text-sm font-medium text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
              >
                강사 섭외하기
              </a>

              {/* 프로필 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-semibold">
                  {user?.user.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">{user?.user.name}</div>
                  <div className="text-xs text-gray-500">{user?.user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="로그아웃"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* 콘텐츠 */}
        <main className="flex-1 p-8 overflow-auto bg-[#fafafa]">
          {children}
        </main>
      </div>
    </div>
  );
}
