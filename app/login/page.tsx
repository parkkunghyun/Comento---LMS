'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'instructor' | 'em'>('instructor');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          role: loginType === 'em' ? 'EM' : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        setLoading(false);
        return;
      }

      // 로그인 성공 - 역할에 따라 리다이렉트
      if (data.role === 'INSTRUCTOR') {
        router.push('/instructor');
      } else if (data.role === 'EM') {
        router.push('/em');
      }
    } catch (err) {
      setError('로그인 처리 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="w-full max-w-md px-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* 헤더 */}
          <div className="px-8 pt-10 pb-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                강사관리 LMS
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                로그인 유형을 선택하세요
              </p>
            </div>
          </div>

          {/* 로그인 유형 선택 */}
          <div className="px-8 pb-6">
            <div className="relative bg-gray-100 rounded-lg p-1 inline-flex w-full">
              <div
                className={`absolute top-1 bottom-1 w-1/2 rounded-md bg-white shadow-sm transition-all duration-300 ease-out ${
                  loginType === 'em' ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  setLoginType('instructor');
                  setError('');
                }}
                className={`relative flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-colors duration-200 z-10 ${
                  loginType === 'instructor'
                    ? 'text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                강사 로그인
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginType('em');
                  setError('');
                }}
                className={`relative flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-colors duration-200 z-10 ${
                  loginType === 'em'
                    ? 'text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                EM 로그인
              </button>
            </div>
          </div>

          {/* 폼 */}
          <form className="px-8 pb-10" onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* 이름 입력 */}
              <div>
                <label
                  htmlFor="name"
                  className={`block text-sm font-medium mb-2 transition-colors ${
                    focusedField === 'name'
                      ? 'text-gray-900'
                      : 'text-gray-700'
                  }`}
                >
                  {loginType === 'em' ? '성함' : '강사명'}
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full px-4 py-3 border rounded-lg text-sm transition-all duration-200 focus:outline-none ${
                      focusedField === 'name'
                        ? 'border-gray-900 ring-2 ring-gray-900 ring-opacity-20'
                        : 'border-gray-300 focus:border-gray-900'
                    }`}
                    placeholder={loginType === 'em' ? 'comento' : '김유빈'}
                  />
                </div>
              </div>

              {/* 이메일 입력 */}
              <div>
                <label
                  htmlFor="email"
                  className={`block text-sm font-medium mb-2 transition-colors ${
                    focusedField === 'email'
                      ? 'text-gray-900'
                      : 'text-gray-700'
                  }`}
                >
                  이메일
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={`w-full px-4 py-3 border rounded-lg text-sm transition-all duration-200 focus:outline-none ${
                      focusedField === 'email'
                        ? 'border-gray-900 ring-2 ring-gray-900 ring-opacity-20'
                        : 'border-gray-300 focus:border-gray-900'
                    }`}
                    placeholder={loginType === 'em' ? 'comento0804!' : 'yubin@comento.co.kr'}
                  />
                </div>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className={`mt-6 w-full py-3 px-4 rounded-lg text-sm font-medium text-white transition-all duration-200 ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 hover:bg-gray-800 active:scale-[0.98] shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
