'use client';

import { useState, useEffect } from 'react';
import Calendar from '@/components/calendar';

interface User {
  role: string;
  user: {
    name: string;
    email: string;
  };
}

export default function EMSchedulePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error('Failed to get user:', data.error);
        } else {
          setUser(data);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching user:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600">사용자 정보를 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          기업 교육 일정 확인하기
        </h2>
        <p className="text-gray-600">
          날짜를 클릭하시면 상세한 교육 일정을 확인할 수 있습니다
        </p>
      </div>
      <Calendar apiEndpoint="/api/em/calendar" />
    </div>
  );
}
