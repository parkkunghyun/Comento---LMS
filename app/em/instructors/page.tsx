'use client';

import { useState, useEffect } from 'react';

interface InstructorDetail {
  status: string;
  name: string;
  affiliation: string;
  role: string;
  yearsOfExperience: string;
  monthlyAverageClasses: string;
  level: string;
  levelDescription: string;
  educationStrategy: string;
  notes: string;
  availableAreas: {
    newDevelopment: boolean;
    leaderExecutive: boolean;
    leaderManager: boolean;
    specialLecture: boolean;
    standardEducation: boolean;
    reportEducation: boolean;
    handsOnSession: boolean;
  };
}

const GOOGLE_DRIVE_FOLDER_ID = '1w218kHL14yR1pCZSXHUD3VoY5q3EIj2c';
const GOOGLE_DRIVE_BASE_URL = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;

const AVAILABLE_AREAS_LABELS = {
  newDevelopment: '신규개발과정',
  leaderExecutive: '리더교육(임원)',
  leaderManager: '리더교육(팀장)',
  specialLecture: '특강(2H)',
  standardEducation: '표준교육',
  reportEducation: '보고서교육',
  handsOnSession: '핸즈온 세션',
};

export default function EMInstructorsPage() {
  const [instructors, setInstructors] = useState<InstructorDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const loadInstructors = async () => {
      try {
        const response = await fetch('/api/em/instructor-details');
        if (!response.ok) {
          throw new Error('강사 목록을 불러올 수 없습니다.');
        }
        const data = await response.json();
        setInstructors(data.instructors || []);
      } catch (err) {
        console.error('Error loading instructors:', err);
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadInstructors();
  }, []);

  // 필터링
  const filteredInstructors = instructors.filter((instructor) => {
    const matchesSearch =
      instructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instructor.affiliation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instructor.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instructor.level.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || instructor.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 상태별로 그룹화
  const groupedByStatus = filteredInstructors.reduce((acc, instructor) => {
    const status = instructor.status || '기타';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(instructor);
    return acc;
  }, {} as { [key: string]: InstructorDetail[] });

  // 상태별 통계
  const statusCounts = instructors.reduce((acc, instructor) => {
    const status = instructor.status || '기타';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const uniqueStatuses = Array.from(new Set(instructors.map((i) => i.status || '기타'))).filter(Boolean);
  
  // 상태 우선순위 정렬 (Active, 양성중, 기타)
  const statusOrder = ['Active', '양성중', 'Inactive', '기타'];
  const sortedStatuses = uniqueStatuses.sort((a, b) => {
    const aIndex = statusOrder.indexOf(a);
    const bIndex = statusOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">강사 현황</h2>
          <p className="text-gray-600">강사 프로필 및 실력을 확인하고 관리할 수 있습니다.</p>
        </div>
        <button
          onClick={() => window.open(GOOGLE_DRIVE_BASE_URL, '_blank')}
          className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          강사 프로필 드라이브 열기
        </button>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="강사명, 소속, 직무, 레벨로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            >
              <option value="all">전체 상태</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status} ({statusCounts[status] || 0})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 강사 목록 */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
      ) : filteredInstructors.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-500">
            {searchQuery || statusFilter !== 'all' ? '검색 결과가 없습니다.' : '강사 목록이 없습니다.'}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedStatuses.map((status) => {
            const statusInstructors = groupedByStatus[status] || [];
            if (statusInstructors.length === 0) return null;

            const statusColors = {
              'Active': 'bg-green-50 border-green-200 text-green-900',
              '양성중': 'bg-blue-50 border-blue-200 text-blue-900',
              'Inactive': 'bg-gray-50 border-gray-200 text-gray-900',
            };

            const statusColor = statusColors[status as keyof typeof statusColors] || 'bg-gray-50 border-gray-200 text-gray-900';

            return (
              <div key={status} className="space-y-4">
                {/* 상태별 헤더 */}
                <div className={`px-6 py-4 rounded-lg border ${statusColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{status}</h3>
                      <span className="px-2.5 py-1 bg-white/60 text-xs font-medium rounded-full">
                        {statusInstructors.length}명
                      </span>
                    </div>
                  </div>
                </div>

                {/* 강사 카드 그리드 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {statusInstructors.map((instructor) => (
            <div
              key={instructor.name}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* 헤더 */}
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{instructor.name}</h3>
                      {instructor.status && (
                        <span
                          className={`px-3 py-1 rounded-md text-xs font-semibold ${
                            instructor.status === 'Active'
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : instructor.status === '양성중'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}
                        >
                          {instructor.status}
                        </span>
                      )}
                      {instructor.level && (
                        <span className="px-3 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          {instructor.level}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {instructor.affiliation && (
                        <span>{instructor.affiliation}</span>
                      )}
                      {instructor.role && (
                        <span className="text-gray-500">•</span>
                      )}
                      {instructor.role && (
                        <span>{instructor.role}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 본문 */}
              <div className="px-6 py-5 space-y-5">
                {/* 기본 정보 */}
                {(instructor.yearsOfExperience || instructor.monthlyAverageClasses) && (
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                    {instructor.yearsOfExperience && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">연차</div>
                        <div className="text-base font-semibold text-gray-900">{instructor.yearsOfExperience}</div>
                      </div>
                    )}
                    {instructor.monthlyAverageClasses && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">월평균 출강수</div>
                        <div className="text-base font-semibold text-gray-900">{instructor.monthlyAverageClasses}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* 강사레벨 Description */}
                {instructor.levelDescription && (
                  <div className="pb-4 border-b border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">레벨 설명</div>
                    <div className="text-sm text-gray-900 leading-relaxed">{instructor.levelDescription}</div>
                  </div>
                )}

                {/* 교육 주제 / 파견 전략 */}
                {instructor.educationStrategy && (
                  <div className="pb-4 border-b border-gray-100">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">교육 주제 / 파견 전략</div>
                    <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">
                      {instructor.educationStrategy}
                    </div>
                  </div>
                )}

                {/* 교육가능영역 */}
                <div className="pb-4 border-b border-gray-100">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">교육가능영역</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(instructor.availableAreas).map(([key, available]) => {
                      if (!available) return null;
                      const label = AVAILABLE_AREAS_LABELS[key as keyof typeof AVAILABLE_AREAS_LABELS];
                      return (
                        <span
                          key={key}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium border border-gray-200"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 특이사항 */}
                {instructor.notes && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">특이사항</div>
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      {instructor.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 통계 */}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600">
            총 <span className="font-semibold text-gray-900">{instructors.length}명</span>의 강사
            {searchQuery || statusFilter !== 'all' ? (
              <>
                {' '}
                중 <span className="font-semibold text-gray-900">{filteredInstructors.length}명</span> 표시됨
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
