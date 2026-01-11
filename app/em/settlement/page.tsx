'use client';

import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SettlementData {
  mentorName: string;
  className: string;
  time: string;
  amount: string;
  settlementDate: string;
}

interface GroupedSettlement {
  date: string;
  classes: SettlementData[];
  totalAmount: number;
}

interface MonthlyData {
  month: string;
  amount: number;
  date: string;
}

interface InstructorSettlements {
  [instructorName: string]: GroupedSettlement[];
}

export default function EMSettlementPage() {
  const [allSettlements, setAllSettlements] = useState<InstructorSettlements>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettlements = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/em/settlement');

        if (!response.ok) {
          throw new Error('정산 데이터를 불러올 수 없습니다.');
        }

        const data = await response.json();
        setAllSettlements(data.settlements || {});
      } catch (err) {
        console.error('Error loading settlements:', err);
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadSettlements();
  }, []);

  // 각 강사별 월별 데이터 계산
  const instructorMonthlyData = useMemo(() => {
    const result: { [instructorName: string]: MonthlyData[] } = {};

    Object.keys(allSettlements).forEach((instructorName) => {
      const settlements = allSettlements[instructorName];
      const monthlyMap: { [key: string]: number } = {};

      settlements.forEach((group) => {
        try {
          const date = new Date(group.date);
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyMap[monthKey]) {
              monthlyMap[monthKey] = 0;
            }
            monthlyMap[monthKey] += group.totalAmount;
          }
        } catch (e) {
          console.error('Error parsing date:', group.date);
        }
      });

      result[instructorName] = Object.keys(monthlyMap)
        .sort()
        .map((key) => {
          const [year, month] = key.split('-');
          return {
            month: `${year}년 ${parseInt(month)}월`,
            amount: monthlyMap[key],
            date: key,
          };
        });
    });

    return result;
  }, [allSettlements]);

  // 전체 합계 계산
  const totalAmount = useMemo(() => {
    let total = 0;
    Object.values(allSettlements).forEach((settlements) => {
      settlements.forEach((group) => {
        total += group.totalAmount;
      });
    });
    return total;
  }, [allSettlements]);

  // 금액 포맷팅
  const formatAmount = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  // 금액 포맷터 (차트용)
  const formatCurrency = (value: number) => {
    return `${formatAmount(value)}원`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  const instructorNames = Object.keys(allSettlements).sort();

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">정산 관리</h2>
        <p className="text-gray-600">전체 강사 정산을 관리할 수 있습니다.</p>
      </div>

      {instructorNames.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">정산 내역이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">전체 정산 금액</h3>
              <p className="text-3xl font-bold text-blue-600">
                {formatAmount(totalAmount)}원
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">강사 수</h3>
              <p className="text-3xl font-bold text-gray-900">
                {instructorNames.length}명
              </p>
            </div>
          </div>

          {/* 각 강사별 그래프 */}
          <div className="space-y-6">
            {instructorNames.map((instructorName) => {
              const monthlyData = instructorMonthlyData[instructorName] || [];
              const settlements = allSettlements[instructorName] || [];
              const instructorTotal = settlements.reduce((sum, group) => sum + group.totalAmount, 0);

              return (
                <div key={instructorName} className="bg-white rounded-lg shadow p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {instructorName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      총 정산 금액: <span className="font-semibold text-blue-600">{formatAmount(instructorTotal)}원</span>
                    </p>
                  </div>

                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#6b7280"
                          style={{ fontSize: '12px' }}
                          tickFormatter={formatCurrency}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', r: 5 }}
                          activeDot={{ r: 7 }}
                          name="정산 금액"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      월별 정산 데이터가 없습니다.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
