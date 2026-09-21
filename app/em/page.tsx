'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type Period = 'month' | '3months';

interface DashboardData {
  totalEducation: number;
  externalParticipatedCount: number;
  thisMonthTotalEducation: number;
  thisMonthExternalParticipated: number;
  threeMonthsTotalEducation: number;
  threeMonthsExternalParticipated: number;
  instructorCount: number;
  instructorCountExternal: number;
  participationMonthSplit: { externalTop5: Array<{ name: string; count: number }>; internalTop3: Array<{ name: string; count: number }> };
  participationThreeSplit: { externalTop5: Array<{ name: string; count: number }>; internalTop3: Array<{ name: string; count: number }> };
  regionThisMonth: Array<{ name: string; count: number; fill: string }>;
  regionThreeMonths: Array<{ name: string; count: number; fill: string }>;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatScheduleDate(iso: string): string {
  if (!iso) return '0월 0일(0요일)';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]}요일)`;
}

function formatReplyDate(iso: string): string {
  if (!iso) return '0/00(0요일)';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]}요일)`;
}

function buildRecruitMessage(v: {
  instructorName: string;
  company: string;
  courseName: string;
  date: string;
  location: string;
  time: string;
  replyDate: string;
  managerName: string;
}): string {
  const instructor = v.instructorName || 'OO';
  const company = v.company || 'OO';
  const course = v.courseName || 'OOO';
  const schedule = formatScheduleDate(v.date);
  const location = v.location || 'OOOO';
  const time = v.time || '00:00~00:00 / 총 0시간';
  const reply = formatReplyDate(v.replyDate);
  const manager = v.managerName || '000';

  return `안녕하세요, ${instructor} 강사님.
포텐스닷 ${manager} 매니저입니다.

다름이 아니라, '${company}' 기업을 대상으로 하는 ${course} 교육 섭외 건으로 연락을 드렸습니다.
기업 측에서 희망하는 일자가 확정되어있어, 강사님께 아래 일정을 제안드리고자 합니다.

[교육 개요]
1. 과정명: ${course}
2. 교육 일정: ${schedule}
3. 교육 장소: ${location}
4. 교육 시간: ${time}

현재 기업 측에서 멘토님의 가능 일정을 기다리고 있습니다.
바쁘시겠지만, 원활한 일정 확정을 위해 ${reply}까지 회신 주시면 감사하겠습니다.

그 외 궁금하신 내용은 언제든 편하게 말씀해주세요.

감사합니다.
`;
}

export default function EMDashboardPage() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ role: string; user?: { name: string; email: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [copied, setCopied] = useState(false);
  const [instructors, setInstructors] = useState<Array<{ name: string; email: string }>>([]);
  const [managers, setManagers] = useState<Array<{ name: string; email: string }>>([]);

  const [msg, setMsg] = useState({
    instructorName: '',
    managerName: '',
    company: '',
    courseName: '',
    date: '',
    location: '',
    time: '',
    replyDate: '',
  });

  useEffect(() => {
    if (pathname === '/em') setPeriod('month');
  }, [pathname]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((auth) => {
        if (auth.error || auth.role !== 'EM') {
          setUser(null);
        } else {
          setUser(auth);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/em/instructors-info').then((res) => (res.ok ? res.json() : null)),
      fetch('/api/em/managers').then((res) => (res.ok ? res.json() : null)),
    ])
      .then(([instData, mgrData]) => {
        if (instData?.instructors) {
          setInstructors(
            instData.instructors
              .filter(
                (i: { name?: string; email?: string; affiliation?: string }) =>
                  i.name &&
                  i.email &&
                  (i.affiliation || '').trim() !== '포텐스닷'
              )
              .map((i: { name: string; email: string }) => ({
                name: i.name,
                email: i.email,
              }))
          );
        }
        if (mgrData?.managers) setManagers(mgrData.managers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.user?.email || managers.length === 0 || msg.managerName) return;
    const email = user.user.email.trim().toLowerCase();
    const matched = managers.find((m) => m.email.trim().toLowerCase() === email);
    if (matched) setMsg((prev) => ({ ...prev, managerName: matched.name }));
  }, [user, managers, msg.managerName]);

  useEffect(() => {
    if (!user) return;
    setError(null);
    fetch('/api/em/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('데이터를 불러올 수 없습니다.');
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        setError(err.message || '오류가 발생했습니다.');
        setData(null);
      });
  }, [user]);

  const previewText = useMemo(() => buildRecruitMessage(msg), [msg]);

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('복사에 실패했습니다. 미리보기 텍스트를 직접 선택해 복사해 주세요.');
    }
  };

  const setField = (key: keyof typeof msg, value: string) => {
    setMsg((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-potens-line border-t-potens-navy rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-potens-body">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-potens-navy">
        <p className="text-sm text-white">로그인이 필요합니다.</p>
      </div>
    );
  }

  const totalEducation = data?.totalEducation ?? 0;
  const externalCount = data?.externalParticipatedCount ?? 0;
  const externalRatio =
    totalEducation > 0 ? ((externalCount / totalEducation) * 100).toFixed(1) : '0';
  const totalForPeriod =
    period === 'month' ? (data?.thisMonthTotalEducation ?? 0) : (data?.threeMonthsTotalEducation ?? 0);
  const externalForPeriod =
    period === 'month' ? (data?.thisMonthExternalParticipated ?? 0) : (data?.threeMonthsExternalParticipated ?? 0);
  const ratioForPeriod =
    totalForPeriod > 0 ? ((externalForPeriod / totalForPeriod) * 100).toFixed(1) : '0';
  const instructorCountExternal = data?.instructorCountExternal ?? 0;

  const participationSplit = period === 'month' ? data?.participationMonthSplit : data?.participationThreeSplit;
  const periodLabel = period === 'month' ? '이번 달' : '최근 3개월';

  const donutData = [
    { name: '외부 강사 참여', value: externalForPeriod, color: '#15237A' },
    { name: '미참여', value: totalForPeriod - externalForPeriod, color: '#D9D9D9' },
  ].filter((d) => d.value > 0);

  const inputClass = 'potens-input text-xs py-1.5';

  const statCards = [
    { label: '전체 교육 일정', value: totalEducation, suffix: '건', hint: '2026 기업교육' },
    { label: '외부 강사 참여 교육', value: externalCount, suffix: '건', hint: `전체의 ${externalRatio}%` },
    { label: '대기 줄 배정', value: 0, suffix: '건', hint: '' },
    { label: '외부 강사 수', value: instructorCountExternal, suffix: '명', hint: '' },
  ];

  return (
    <div className="space-y-6 pb-8 text-[13px]">
      <div>
        <h1 className="potens-title text-xl">
          2026 강사 대시보드<span className="text-potens-orange">.</span>
        </h1>
        <p className="potens-body text-sm mt-1">교육 운영 통계를 한눈에 확인하세요.</p>
      </div>

      {error && (
        <div className="border border-potens-line px-3 py-2 text-xs text-potens-body bg-white">
          {error}
        </div>
      )}

      {/* 대시보드 영역: 데이터 로딩 중에도 자리를 잡아 템플릿보다 먼저 보이게 */}
      {!data ? (
        <div className="potens-panel px-5 py-16 flex flex-col items-center justify-center gap-3 min-h-[280px]">
          <div className="w-8 h-8 border-2 border-potens-line border-t-potens-navy rounded-full animate-spin" />
          <p className="text-sm font-medium text-potens-navy">대시보드 데이터 연동 중</p>
          <p className="text-xs text-potens-body">잠시만 기다려주세요...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-potens-line divide-x divide-y md:divide-y-0 divide-potens-line">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white p-4">
                <p className="text-[11px] font-medium text-potens-navy">{card.label}</p>
                <p className="mt-1.5 text-xl tabular-nums">
                  <span className="potens-accent-num">{card.value.toLocaleString()}</span>
                  <span className="text-potens-body text-sm font-normal ml-0.5">{card.suffix}</span>
                </p>
                {card.hint ? <p className="text-[11px] text-potens-body mt-1">{card.hint}</p> : null}
              </div>
            ))}
          </div>

          <div className="potens-panel overflow-hidden">
            <div className="px-5 py-4 border-b border-potens-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="potens-subtitle text-sm">교육 참석 현황</h2>
                <p className="text-[11px] text-potens-body mt-0.5">{periodLabel} 참여 횟수</p>
              </div>
              <div className="flex items-center border border-potens-line">
                {(['month', '3months'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3.5 py-1.5 text-xs font-medium transition-colors duration-soft ${
                      period === p
                        ? 'bg-potens-navy text-white'
                        : 'bg-white text-potens-body hover:text-potens-navy'
                    }`}
                  >
                    {p === 'month' ? '이번 달' : '3개월'}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="text-xs font-medium text-potens-navy mb-3">외부 강사 참여 Top 5</h3>
                {!(participationSplit?.externalTop5?.length) ? (
                  <p className="text-xs text-potens-body py-4">데이터 없음</p>
                ) : (
                  <div className="h-40 max-w-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={participationSplit.externalTop5} layout="vertical" margin={{ top: 2, right: 8, left: 4, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="0" stroke="#D9D9D9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#5C5C5C' }} axisLine={{ stroke: '#D9D9D9' }} />
                        <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 10, fill: '#5C5C5C' }} axisLine={{ stroke: '#D9D9D9' }} />
                        <Tooltip contentStyle={{ fontSize: '11px', border: '1px solid #D9D9D9', borderRadius: 0 }} formatter={(value: number) => [`${value}회`, '참여']} />
                        <Bar dataKey="count" fill="#15237A" name="참여 횟수" barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-medium text-potens-navy mb-3">내부 강사 참여 Top 3</h3>
                {!(participationSplit?.internalTop3?.length) ? (
                  <p className="text-xs text-potens-body py-4">데이터 없음</p>
                ) : (
                  <div className="h-40 max-w-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={participationSplit.internalTop3} layout="vertical" margin={{ top: 2, right: 8, left: 4, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="0" stroke="#D9D9D9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9, fill: '#5C5C5C' }} axisLine={{ stroke: '#D9D9D9' }} />
                        <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 10, fill: '#5C5C5C' }} axisLine={{ stroke: '#D9D9D9' }} />
                        <Tooltip contentStyle={{ fontSize: '11px', border: '1px solid #D9D9D9', borderRadius: 0 }} formatter={(value: number) => [`${value}회`, '참여']} />
                        <Bar dataKey="count" fill="#F26300" name="참여 횟수" barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-medium text-potens-navy mb-3">{periodLabel} 외부 강사 참여 비율</h3>
                {donutData.length === 0 ? (
                  <p className="text-xs text-potens-body py-4">데이터 없음</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-44 h-44 shrink-0 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} cx="50%" cy="50%" innerRadius={35} outerRadius={53} paddingAngle={1} dataKey="value" nameKey="name">
                            {donutData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '11px', border: '1px solid #D9D9D9', borderRadius: 0 }} formatter={(v: number) => [`${v}건`, '']} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-potens-black">
                          <span className="text-potens-orange">{externalForPeriod}</span>
                          <span className="text-potens-body">/{totalForPeriod}건</span>
                        </span>
                        <span className="text-[10px] font-medium text-potens-navy">{ratioForPeriod}% 참여</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-potens-body leading-relaxed">
                      전체 {totalForPeriod}건 중<br />외부 강사 참여 {externalForPeriod}건
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="potens-panel overflow-hidden">
        <div className="px-5 py-4 border-b border-potens-line flex items-center justify-between gap-2">
          <div>
            <h2 className="potens-subtitle text-sm">섭외 문자 작성</h2>
            <p className="text-[11px] text-potens-body mt-0.5">왼쪽 입력 → 오른쪽 미리보기 · 복사해서 바로 사용</p>
          </div>
          <button type="button" onClick={copyMessage} className="potens-btn-primary text-xs py-1.5 px-3 shrink-0">
            {copied ? '복사됨' : '문자 복사'}
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[11px] font-medium text-potens-navy mb-1">강사 성함</span>
              <select value={msg.instructorName} onChange={(e) => setField('instructorName', e.target.value)} className={inputClass}>
                <option value="">선택하세요</option>
                {instructors.map((inst) => (
                  <option key={`${inst.name}-${inst.email}`} value={inst.name}>{inst.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[11px] font-medium text-potens-navy mb-1">매니저</span>
              <select value={msg.managerName} onChange={(e) => setField('managerName', e.target.value)} className={inputClass}>
                <option value="">선택하세요</option>
                {managers.map((m) => (
                  <option key={`${m.name}-${m.email}`} value={m.name}>{m.name}</option>
                ))}
              </select>
            </label>
            {(
              [
                ['company', '기업명', 'text', '예: 코웨이'],
                ['courseName', '과정명', 'text', '예: Apps Script 핸즈온'],
                ['date', '일자', 'date', ''],
                ['location', '교육장소', 'text', '예: 코웨이 본사 (서울시 구로구)'],
                ['time', '교육시간', 'text', '예: 14:00~17:00 / 총 3시간'],
                ['replyDate', '답변회신 일자', 'date', ''],
              ] as const
            ).map(([key, label, type, placeholder]) => (
              <label key={key} className="block">
                <span className="block text-[11px] font-medium text-potens-navy mb-1">{label}</span>
                <input type={type} value={msg[key]} onChange={(e) => setField(key, e.target.value)} placeholder={placeholder || undefined} className={inputClass} />
              </label>
            ))}
          </div>
          <div>
            <p className="text-[11px] font-medium text-potens-navy mb-1">미리보기</p>
            <pre className="whitespace-pre-wrap text-xs text-potens-body bg-white border border-potens-line p-4 min-h-[320px] max-h-[520px] overflow-y-auto font-sans leading-relaxed">
              {previewText}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
