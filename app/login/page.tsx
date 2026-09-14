'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'instructor' | 'em'>('instructor');
  const [name, setName] = useState('');
  const [emId, setEmId] = useState('');
  const [email, setEmail] = useState('');
  const [pinCode, setPinCode] = useState('');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loginType === 'em' ? undefined : name,
          emId: loginType === 'em' ? emId : undefined,
          email: loginType === 'instructor' ? email : undefined,
          pinCode: pinCode || undefined,
          role: loginType === 'em' ? 'EM' : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '로그인에 실패했습니다.');
        setLoading(false);
        return;
      }

      if (data.role === 'INSTRUCTOR') router.push('/instructor');
      else if (data.role === 'EM') router.push('/em');
    } catch {
      setError('로그인 처리 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `potens-input py-3 transition-colors duration-soft ${
      focusedField === field ? 'border-potens-navy' : ''
    }`;

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:flex w-[42%] bg-potens-navy text-white flex-col justify-between p-10">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Potens" className="h-10 w-auto" />
            <span className="text-2xl font-bold tracking-tight">
              Potens<span className="text-potens-orange">.</span>
            </span>
          </div>
          <p className="mt-4 text-sm text-white/70 leading-relaxed">
            강사 섭외와 교육 운영을<br />한곳에서 관리합니다.
          </p>
        </div>
        <p className="text-xs text-white/40">강사 ADMIN</p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden flex items-center gap-2.5">
            <img src="/logo.svg" alt="Potens" className="h-9 w-auto" />
            <span className="potens-brand text-2xl">Potens</span>
          </div>

          <h1 className="potens-title text-2xl">
            로그인<span className="text-potens-orange">.</span>
          </h1>
          <p className="potens-body text-sm mt-2 mb-8">로그인 유형을 선택하세요</p>

          <div className="flex border border-potens-line mb-8">
            <button
              type="button"
              onClick={() => {
                setLoginType('instructor');
                setError('');
                setEmId('');
              }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors duration-soft ${
                loginType === 'instructor'
                  ? 'bg-potens-navy text-white'
                  : 'bg-white text-potens-body hover:text-potens-navy'
              }`}
            >
              강사 로그인
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType('em');
                setError('');
                setName('');
              }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors duration-soft border-l border-potens-line ${
                loginType === 'em'
                  ? 'bg-potens-navy text-white'
                  : 'bg-white text-potens-body hover:text-potens-navy'
              }`}
            >
              EM 로그인
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {loginType === 'em' && (
              <>
                <div>
                  <label htmlFor="emId" className="block text-sm font-medium text-potens-navy mb-2">
                    아이디
                  </label>
                  <input
                    id="emId"
                    type="text"
                    required
                    value={emId}
                    onChange={(e) => setEmId(e.target.value)}
                    onFocus={() => setFocusedField('emId')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClass('emId')}
                    placeholder="예) comento 또는 이창환"
                  />
                </div>
                <div>
                  <label htmlFor="pinCode" className="block text-sm font-medium text-potens-navy mb-2">
                    비밀번호
                  </label>
                  <input
                    id="pinCode"
                    type="password"
                    required
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    onFocus={() => setFocusedField('pinCode')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClass('pinCode')}
                    placeholder="비밀번호를 입력하세요"
                    maxLength={50}
                  />
                </div>
              </>
            )}

            {loginType === 'instructor' && (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-potens-navy mb-2">
                    이메일
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClass('email')}
                    placeholder="yubin@comento.co.kr"
                  />
                </div>
                <div>
                  <label htmlFor="pinCode" className="block text-sm font-medium text-potens-navy mb-2">
                    핀코드
                  </label>
                  <input
                    id="pinCode"
                    type="password"
                    required
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    onFocus={() => setFocusedField('pinCode')}
                    onBlur={() => setFocusedField(null)}
                    className={inputClass('pinCode')}
                    placeholder="핀코드를 입력하세요"
                    maxLength={10}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="p-3 border border-potens-line text-sm text-potens-body text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-sm font-medium transition-colors duration-soft ${
                loading
                  ? 'bg-potens-line text-potens-body cursor-not-allowed'
                  : 'potens-btn-primary'
              }`}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
