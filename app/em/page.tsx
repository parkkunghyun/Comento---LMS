'use client';

import { useState, useEffect } from 'react';
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

interface RegionRow {
  name: string;
  서울: number;
  경기도: number;
  지방: number;
  기타: number;
}

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
  instructorRegionThisMonth: RegionRow[];
  instructorRegionThreeMonths: RegionRow[];
}

export default function EMDashboardPage() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ role: string; user?: { name: string; email: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('month');

  // 사이드바에서 대시보드 클릭 시 항상 이번 달로
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-gray-600">로그인이 필요합니다.</p>
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
  const regionData = period === 'month' ? data?.regionThisMonth : data?.regionThreeMonths;
  const instructorRegion = period === 'month' ? data?.instructorRegionThisMonth : data?.instructorRegionThreeMonths;
  const periodLabel = period === 'month' ? '이번 달' : '최근 3개월';

  const donutData = [
    { name: '외부 강사 참여', value: externalForPeriod, color: '#3b82f6' },
    { name: '미참여', value: totalForPeriod - externalForPeriod, color: '#e5e7eb' },
  ].filter((d) => d.value > 0);

  const maxRegion = (row: RegionRow) =>
    Math.max(row.서울, row.경기도, row.지방, row.기타, 1);

  return (
    <div className="space-y-4 pb-6 text-[13px]">
      <div>
        <h1 className="text-base font-bold text-gray-900">2026 강사 대시보드</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          교육 운영 통계를 한눈에 확인하세요.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* 상단 4개 카드 - 컴팩트 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 flex items-start gap-2">
              <div className="w-7 h-7 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-gray-500">전체 교육 일정</p>
                <p className="text-base font-bold text-gray-900">{totalEducation.toLocaleString()}건</p>
                <p className="text-[10px] text-gray-500">(2026 기업교육)</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 flex items-start gap-2">
              <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-gray-500">외부 강사 참여 교육</p>
                <p className="text-base font-bold text-gray-900">{externalCount.toLocaleString()}건</p>
                <p className="text-[10px] text-gray-500">전체의 {externalRatio}%</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 flex items-start gap-2">
              <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500">대기 줄 배정</p>
                <p className="text-base font-bold text-gray-900">0건</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2.5 flex items-start gap-2">
              <div className="w-7 h-7 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500">외부 강사 수</p>
                <p className="text-base font-bold text-gray-900">{instructorCountExternal}명</p>
              </div>
            </div>
          </div>

          {/* 교육 참석 현황 */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">교육 참석 현황</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {periodLabel} 참여 횟수 · 지역별 상세는 아래 표에서 확인
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                {(['month', '3months'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p === 'month' ? '이번 달' : '3개월'}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-2">외부 강사 참여 Top 5</h3>
                {!(participationSplit?.externalTop5?.length) ? (
                  <p className="text-xs text-gray-500 py-4">데이터 없음</p>
                ) : (
                  <div className="h-40 max-w-[280px] [&_.recharts-cartesian-axis-tick-value]:!text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={participationSplit.externalTop5}
                        layout="vertical"
                        margin={{ top: 2, right: 8, left: 4, bottom: 2 }}
                      >
                        <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 9 }} />
                        <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(value: number) => [`${value}회`, '참여']} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 3, 3, 0]} name="참여 횟수" barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-2">내부 강사 참여 Top 3</h3>
                {!(participationSplit?.internalTop3?.length) ? (
                  <p className="text-xs text-gray-500 py-4">데이터 없음</p>
                ) : (
                  <div className="h-40 max-w-[280px] [&_.recharts-cartesian-axis-tick-value]:!text-[10px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={participationSplit.internalTop3}
                        layout="vertical"
                        margin={{ top: 2, right: 8, left: 4, bottom: 2 }}
                      >
                        <CartesianGrid strokeDasharray="2 2" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 9 }} />
                        <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(value: number) => [`${value}회`, '참여']} />
                        <Bar dataKey="count" fill="#10b981" radius={[0, 3, 3, 0]} name="참여 횟수" barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-700 mb-2">{periodLabel} 외부 강사 참여 비율</h3>
                {donutData.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4">데이터 없음</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-44 h-44 shrink-0 relative [&_.recharts-legend-item-text]:!text-[10px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={53}
                            paddingAngle={1}
                            dataKey="value"
                            nameKey="name"
                          >
                            {donutData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(v: number) => [`${v}건`, '']} />
                          <Legend wrapperStyle={{ fontSize: '10px' }} iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-bold text-gray-900">
                          {externalForPeriod}/{totalForPeriod}건
                        </span>
                        <span className="text-[10px] font-medium text-gray-600">{ratioForPeriod}% 참여</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      전체 {totalForPeriod}건 중 외부 강사 참여 {externalForPeriod}건
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 강사별 지역 참석 상세 (외부 강사만) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">강사별 지역 참석 상세</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">{periodLabel} · 외부 강사만</p>
            </div>
            <div className="p-4 overflow-x-auto">
              {!instructorRegion?.length ? (
                <p className="text-xs text-gray-500 py-4">데이터 없음</p>
              ) : (
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">이름</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">서울</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">경기도</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">지방</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">기타</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600">합계</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {instructorRegion.slice(0, 20).map((row) => {
                      const sum = row.서울 + row.경기도 + row.지방 + row.기타;
                      const max = maxRegion(row);
                      const bar = (v: number) => (max > 0 ? Math.max(2, (v / max) * 40) : 0);
                      return (
                        <tr key={row.name} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-10 h-3 bg-gray-100 rounded overflow-hidden" title={String(row.서울)}>
                                <div className="h-full bg-blue-500 rounded" style={{ width: bar(row.서울) }} />
                              </div>
                              <span className="text-gray-700">{row.서울}회</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-10 h-3 bg-gray-100 rounded overflow-hidden" title={String(row.경기도)}>
                                <div className="h-full bg-violet-500 rounded" style={{ width: bar(row.경기도) }} />
                              </div>
                              <span className="text-gray-700">{row.경기도}회</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-10 h-3 bg-gray-100 rounded overflow-hidden" title={String(row.지방)}>
                                <div className="h-full bg-amber-500 rounded" style={{ width: bar(row.지방) }} />
                              </div>
                              <span className="text-gray-700">{row.지방}회</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-10 h-3 bg-gray-100 rounded overflow-hidden" title={String(row.기타)}>
                                <div className="h-full bg-gray-400 rounded" style={{ width: bar(row.기타) }} />
                              </div>
                              <span className="text-gray-700">{row.기타}회</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900">{sum}회</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
