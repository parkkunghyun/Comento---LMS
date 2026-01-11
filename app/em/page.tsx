'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyStat {
  approved: number;
  declined: number;
  total: number;
}

interface DeclineReasonInfo {
  educationName: string;
  educationDate: string;
  declineReason: string;
  requestMonth: string;
}

interface InstructorRecruitmentStats {
  instructorName: string;
  totalRequests: number;
  approvedCount: number;
  declinedCount: number;
  approvalRate: number;
  declineRate: number;
  educationDates: string[];
  declineReasons: DeclineReasonInfo[];
  monthlyStats: {
    [month: string]: MonthlyStat;
  };
}

export default function EMDashboardPage() {
  const [stats, setStats] = useState<InstructorRecruitmentStats[]>([]);
  const [overallMonthlyStats, setOverallMonthlyStats] = useState<{
    [month: string]: MonthlyStat;
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [showDeclineReasons, setShowDeclineReasons] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/em/recruitment-stats');
        if (!response.ok) {
          throw new Error('섭외율 통계를 불러올 수 없습니다.');
        }
        const data = await response.json();
        setStats(data.stats || []);
        setOverallMonthlyStats(data.overallMonthlyStats || {});
      } catch (err) {
        console.error('Error loading stats:', err);
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  // 선택된 강사의 월별 데이터를 차트 형식으로 변환
  const getMonthlyChartData = (instructorStats: InstructorRecruitmentStats) => {
    const months = Object.keys(instructorStats.monthlyStats).sort();
    return months.map((month) => {
      const stat = instructorStats.monthlyStats[month];
      return {
        month: month.replace(/-/g, '.'), // 2026-01 -> 2026.01
        수락: stat.approved,
        거절: stat.declined,
        총합: stat.total,
      };
    });
  };

  // 전체 월별 데이터를 차트 형식으로 변환
  const getOverallMonthlyChartData = () => {
    const months = Object.keys(overallMonthlyStats).sort();
    return months.map((month) => {
      const stat = overallMonthlyStats[month];
      return {
        month: month.replace(/-/g, '.'), // 2026-01 -> 2026.01
        수락: stat.approved,
        거절: stat.declined,
        총합: stat.total,
      };
    });
  };

  const selectedStats = selectedInstructor
    ? stats.find((s) => s.instructorName === selectedInstructor)
    : null;

  // 전체 통계 계산
  const totalStats = stats.reduce(
    (acc, stat) => {
      acc.totalRequests += stat.totalRequests;
      acc.approvedCount += stat.approvedCount;
      acc.declinedCount += stat.declinedCount;
      return acc;
    },
    { totalRequests: 0, approvedCount: 0, declinedCount: 0 }
  );

  const overallApprovalRate =
    totalStats.totalRequests > 0
      ? Math.round((totalStats.approvedCount / totalStats.totalRequests) * 100 * 10) / 10
      : 0;
  const overallDeclineRate =
    totalStats.totalRequests > 0
      ? Math.round((totalStats.declinedCount / totalStats.totalRequests) * 100 * 10) / 10
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">섭외율 관리 대시보드</h2>
        <p className="text-gray-600">강사별 섭외 요청 수락율 및 거절율을 확인할 수 있습니다.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      ) : (
        <>
          {/* 전체 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-600 mb-1">전체 요청</div>
              <div className="text-2xl font-bold text-gray-900">{totalStats.totalRequests}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-600 mb-1">수락</div>
              <div className="text-2xl font-bold text-green-600">{totalStats.approvedCount}</div>
              <div className="text-xs text-gray-500 mt-1">{overallApprovalRate}%</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-600 mb-1">거절</div>
              <div className="text-2xl font-bold text-red-600">{totalStats.declinedCount}</div>
              <div className="text-xs text-gray-500 mt-1">{overallDeclineRate}%</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-600 mb-1">강사 수</div>
              <div className="text-2xl font-bold text-gray-900">{stats.length}</div>
            </div>
          </div>

          {/* 전체 월별 통계 그래프 */}
          {Object.keys(overallMonthlyStats).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">전체 월별 섭외 통계</h3>
                <p className="text-sm text-gray-600">모든 강사의 월별 섭외 요청 수락 및 거절 현황</p>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={getOverallMonthlyChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} tick={{ fill: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="수락"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ fill: '#059669', r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 8, strokeWidth: 2, stroke: '#ffffff' }}
                    name="수락"
                  />
                  <Line
                    type="monotone"
                    dataKey="거절"
                    stroke="#dc2626"
                    strokeWidth={3}
                    strokeDasharray="8 4"
                    dot={{ fill: '#dc2626', r: 6, strokeWidth: 2, stroke: '#ffffff' }}
                    activeDot={{ r: 8, strokeWidth: 2, stroke: '#ffffff' }}
                    name="거절"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 강사별 통계 테이블 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">강사별 섭외율 통계</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      강사명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      총 요청
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      수락
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      거절
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      수락율
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      거절율
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.map((stat) => (
                    <tr
                      key={stat.instructorName}
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedInstructor === stat.instructorName ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{stat.instructorName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stat.totalRequests}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-600 font-medium">{stat.approvedCount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stat.declinedCount > 0 ? (
                          <button
                            onClick={() =>
                              setShowDeclineReasons(
                                showDeclineReasons === stat.instructorName ? null : stat.instructorName
                              )
                            }
                            className="text-sm text-red-600 font-medium hover:text-red-700 transition-colors underline"
                          >
                            {stat.declinedCount}
                          </button>
                        ) : (
                          <div className="text-sm text-red-600 font-medium">{stat.declinedCount}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stat.approvalRate}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stat.declineRate}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            setSelectedInstructor(
                              selectedInstructor === stat.instructorName ? null : stat.instructorName
                            )
                          }
                          className="text-sm text-gray-900 hover:text-gray-700 transition-colors"
                        >
                          {selectedInstructor === stat.instructorName ? '접기' : '상세보기'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 거절 사유 표시 */}
          {showDeclineReasons && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {stats.find((s) => s.instructorName === showDeclineReasons)?.instructorName} 거절 사유
                </h3>
                <button
                  onClick={() => setShowDeclineReasons(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {stats
                  .find((s) => s.instructorName === showDeclineReasons)
                  ?.declineReasons.map((reason, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {reason.educationName || '교육명 없음'}
                          </div>
                          <div className="text-xs text-gray-600">
                            {reason.educationDate && `교육일자: ${reason.educationDate}`}
                            {reason.requestMonth && ` | 요청월: ${reason.requestMonth.replace(/-/g, '.')}`}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-red-200">
                        <div className="text-sm text-gray-700 leading-relaxed">{reason.declineReason}</div>
                      </div>
                    </div>
                  ))}
                {stats.find((s) => s.instructorName === showDeclineReasons)?.declineReasons.length === 0 && (
                  <div className="text-center text-gray-500 py-8">거절 사유가 없습니다.</div>
                )}
              </div>
            </div>
          )}

          {/* 선택된 강사의 상세 정보 */}
          {selectedStats && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* 헤더 */}
              <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {selectedStats.instructorName} 상세 통계
                    </h3>
                    <p className="text-sm text-gray-600">강사별 섭외 활동 상세 분석</p>
                  </div>
                  <button
                    onClick={() => setSelectedInstructor(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* 주요 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">총 요청</div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{selectedStats.totalRequests}</div>
                    <div className="text-xs text-gray-500">전체 섭외 요청</div>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">수락</div>
                    <div className="text-3xl font-bold text-green-700 mb-1">{selectedStats.approvedCount}</div>
                    <div className="text-xs text-green-600 font-medium">{selectedStats.approvalRate}% 수락율</div>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                    <div className="text-xs font-medium text-red-700 uppercase tracking-wide mb-2">거절</div>
                    <div className="text-3xl font-bold text-red-700 mb-1">{selectedStats.declinedCount}</div>
                    <div className="text-xs text-red-600 font-medium">{selectedStats.declineRate}% 거절율</div>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-2">월평균 요청</div>
                    <div className="text-3xl font-bold text-blue-700 mb-1">
                      {Object.keys(selectedStats.monthlyStats).length > 0
                        ? Math.round(
                            (selectedStats.totalRequests / Object.keys(selectedStats.monthlyStats).length) * 10
                          ) / 10
                        : 0}
                    </div>
                    <div className="text-xs text-blue-600">
                      {Object.keys(selectedStats.monthlyStats).length}개월 기준
                    </div>
                  </div>
                </div>

                {/* 월별 통계 차트 */}
                {Object.keys(selectedStats.monthlyStats).length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">월별 섭외 추이</h4>
                      <p className="text-sm text-gray-600">월별 수락 및 거절 현황</p>
                    </div>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={getMonthlyChartData(selectedStats)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="month"
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                          tick={{ fill: '#6b7280' }}
                        />
                        <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} tick={{ fill: '#6b7280' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="수락"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ fill: '#10b981', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="거절"
                          stroke="#ef4444"
                          strokeWidth={3}
                          dot={{ fill: '#ef4444', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* 거절 사유 섹션 */}
                {selectedStats.declineReasons.length > 0 && (
                  <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <h4 className="text-lg font-semibold text-red-900">거절 사유 분석</h4>
                      </div>
                      <p className="text-sm text-red-700">
                        총 {selectedStats.declineReasons.length}건의 거절 사유가 기록되었습니다.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {selectedStats.declineReasons.map((reason, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-lg p-4 border border-red-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 rounded-md text-xs font-medium">
                                  #{idx + 1}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {reason.educationName || '교육명 없음'}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-600">
                                {reason.educationDate && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                    {reason.educationDate}
                                  </span>
                                )}
                                {reason.requestMonth && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                    {reason.requestMonth.replace(/-/g, '.')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-sm font-medium text-gray-700 mb-1">거절 사유</div>
                            <div className="text-sm text-gray-900 leading-relaxed bg-gray-50 p-3 rounded-md">
                              {reason.declineReason}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 교육일자 목록 */}
                {selectedStats.educationDates.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">교육 일정</h4>
                      <p className="text-sm text-gray-600">총 {selectedStats.educationDates.length}개의 교육 일정</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedStats.educationDates.map((date, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm font-medium border border-gray-200 shadow-sm"
                        >
                          {date}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
