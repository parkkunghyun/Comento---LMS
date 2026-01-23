'use client';

import { useState, useEffect } from 'react';
import { getAllInstructorsWithEmail } from '@/lib/google-sheets';

interface ClassSchedule {
  educationDate: string;
  isTentative: string;
  clientName: string;
  className: string;
  dri: string;
  instructor: string;
  coach: string;
  rowIndex: number;
}

interface Instructor {
  name: string;
  email: string;
}

export default function RecruitmentCreatePage() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [filteredSchedules, setFilteredSchedules] = useState<ClassSchedule[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    requestId: string;
    acceptLink: string;
    declineLink: string;
    selectedSchedules: ClassSchedule[];
  } | null>(null);
  const [educationType, setEducationType] = useState<string>('');
  const [messageTemplate, setMessageTemplate] = useState<string>('');
  const [selectedInstructorEmail, setSelectedInstructorEmail] = useState<string>('');
  const [instructorEvents, setInstructorEvents] = useState<any[]>([]);

  // 교육 일정 로드
  useEffect(() => {
    const loadSchedules = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/em/class-schedules?year=2026');
        if (!response.ok) {
          throw new Error('교육 일정을 불러올 수 없습니다.');
        }
        const data = await response.json();
        setSchedules(data.schedules || []);
        setFilteredSchedules(data.schedules || []);
      } catch (err) {
        console.error('Error loading schedules:', err);
        setError(err instanceof Error ? err.message : '교육 일정을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, []);

  // 강사 목록 로드
  useEffect(() => {
    const loadInstructors = async () => {
      try {
        const response = await fetch('/api/em/instructors');
        if (response.ok) {
          const data = await response.json();
          setInstructors(data.instructors || []);
        }
      } catch (err) {
        console.error('Error loading instructors:', err);
      }
    };

    loadInstructors();
  }, []);

  // 강사 일정 로드
  useEffect(() => {
    const loadInstructorEvents = async () => {
      if (!selectedInstructorEmail) {
        setInstructorEvents([]);
        return;
      }

      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

        const response = await fetch(
          `/api/em/instructor-calendar?instructorEmail=${encodeURIComponent(selectedInstructorEmail)}&timeMin=${startOfMonth.toISOString()}&timeMax=${endOfMonth.toISOString()}`
        );

        if (response.ok) {
          const data = await response.json();
          setInstructorEvents(data.events || []);
        }
      } catch (err) {
        console.error('Error loading instructor events:', err);
      }
    };

    loadInstructorEvents();
  }, [selectedInstructorEmail]);

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSchedules(schedules);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = schedules.filter((schedule) =>
      schedule.clientName.toLowerCase().includes(query)
    );
    setFilteredSchedules(filtered);
  }, [searchQuery, schedules]);

  // 날짜가 강사 일정과 겹치는지 확인
  const isDateBlocked = (dateStr: string): boolean => {
    if (instructorEvents.length === 0) return false;

    const scheduleDate = new Date(dateStr);
    const scheduleDateStr = scheduleDate.toISOString().split('T')[0];

    return instructorEvents.some((event) => {
      if (event.start.dateTime) {
        const eventDate = new Date(event.start.dateTime);
        const eventDateStr = eventDate.toISOString().split('T')[0];
        return eventDateStr === scheduleDateStr;
      } else if (event.start.date) {
        return event.start.date === scheduleDateStr;
      }
      return false;
    });
  };

  // 체크박스 선택/해제
  const handleToggleSchedule = (rowIndex: number) => {
    const schedule = schedules.find((s) => s.rowIndex === rowIndex);
    if (!schedule) return;

    // 강사 일정과 겹치는 경우 선택 불가
    if (selectedInstructor && isDateBlocked(schedule.educationDate)) {
      alert('해당 날짜는 강사 일정이 있어 선택할 수 없습니다.');
      return;
    }

    const newSelected = new Set(selectedIndices);
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    setSelectedIndices(newSelected);
    setError(null);
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedIndices.size === filteredSchedules.length) {
      setSelectedIndices(new Set());
    } else {
      // 강사 일정과 겹치지 않는 일정만 선택
      const availableIndices = filteredSchedules
        .filter((s) => !selectedInstructor || !isDateBlocked(s.educationDate))
        .map((s) => s.rowIndex);
      setSelectedIndices(new Set(availableIndices));
    }
  };

  // 섭외 요청 생성
  const handleCreateRequest = async () => {
    if (selectedIndices.size === 0) {
      setError('일정을 선택해주세요.');
      return;
    }

    if (!selectedInstructor.trim()) {
      setError('멘토(외부 강사)를 선택해주세요.');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/em/recruitment-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheduleIndices: Array.from(selectedIndices),
          instructorName: selectedInstructor,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '섭외 요청 생성에 실패했습니다.');
      }

      // 선택된 일정 정보 가져오기
      const selectedSchedulesData = schedules.filter((schedule) =>
        selectedIndices.has(schedule.rowIndex)
      );

      const successData = {
        requestId: data.requestId,
        acceptLink: data.acceptLink,
        declineLink: data.declineLink,
        selectedSchedules: selectedSchedulesData,
      };

      setSuccess(successData);

      // 템플릿 생성
      const template = generateMessageTemplate(
        selectedSchedulesData,
        data.acceptLink,
        data.declineLink,
        educationType
      );
      setMessageTemplate(template);

      // 선택 초기화
      setSelectedIndices(new Set());
      setSelectedInstructor('');
      setEducationType('');
    } catch (err) {
      console.error('Error creating request:', err);
      setError(err instanceof Error ? err.message : '섭외 요청 생성 중 오류가 발생했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    return dateString;
  };

  // 클래스명에서 기업명 추출
  const extractCompanyName = (className: string): string => {
    if (!className) return '';
    const match = className.match(/\[([^\]]+)\]/);
    return match && match[1] ? match[1].trim() : '';
  };

  // 카톡 메시지 템플릿 생성
  const generateMessageTemplate = (
    selectedSchedules: ClassSchedule[],
    acceptLink: string,
    declineLink: string,
    eduType: string = ''
  ) => {
    if (selectedSchedules.length === 0) return '';

    const firstSchedule = selectedSchedules[0];
    const companyName = extractCompanyName(firstSchedule.className) || firstSchedule.clientName;
    const className = firstSchedule.className;
    const educationDate = firstSchedule.educationDate;

    let dateList = educationDate;
    if (selectedSchedules.length > 1) {
      dateList = selectedSchedules.map((s) => s.educationDate).join(', ');
    }

    const template = `멘토님 안녕하세요 🙂
코멘토 기업교육팀입니다.

아래 기업 교육 건과 관련하여
멘토님께 강의 가능 여부를 여쭙고자 연락드립니다.

[교육 정보]
- 기업명: ${companyName}
- 교육명: ${className}
- 교육일자: ${dateList}
- 교육 형태 : ${eduType || '(수정 가능)'}

일정 확인 후,
아래 링크 중 해당되는 버튼을 눌러주시면 감사하겠습니다.

▶ 수락 링크
${acceptLink}

▶ 거절 링크
${declineLink}

확인해주셔서 감사드리며,
궁금하신 점 있으시면 언제든 편하게 말씀 주세요.
감사합니다 🙏`;

    return template;
  };

  // 교육 형태 변경 시 템플릿 업데이트
  useEffect(() => {
    if (success) {
      const updatedTemplate = generateMessageTemplate(
        success.selectedSchedules,
        success.acceptLink,
        success.declineLink,
        educationType
      );
      setMessageTemplate(updatedTemplate);
    }
  }, [educationType, success]);

  // 템플릿 복사
  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(messageTemplate);
    alert('카톡 메시지가 복사되었습니다!');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 rounded-2xl shadow-lg border border-gray-200/50 p-8 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">섭외 요청 생성</h1>
            <p className="text-gray-600 text-sm">교육 일정을 선택하고 멘토(외부 강사)를 지정하여 섭외 요청을 생성하세요</p>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-shadow duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              고객사명 검색
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="고객사명을 입력하세요"
                className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-white shadow-sm hover:shadow-md"
              />
              <svg className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              멘토(외부 강사) 선택
            </label>
            <select
              value={selectedInstructor}
              onChange={(e) => {
                setSelectedInstructor(e.target.value);
                const instructor = instructors.find(i => i.name === e.target.value);
                if (instructor) {
                  setSelectedInstructorEmail(instructor.email);
                } else {
                  setSelectedInstructorEmail('');
                }
              }}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none bg-white shadow-sm hover:shadow-md cursor-pointer"
            >
              <option value="">선택하세요</option>
              {instructors.map((instructor) => (
                <option key={instructor.name} value={instructor.name}>
                  {instructor.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {/* 교육 일정 테이블 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium">일정을 불러오는 중...</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-gray-50 via-blue-50/30 to-purple-50/20 px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-blue-700 bg-white border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {selectedIndices.size === filteredSchedules.length ? '전체 해제' : '전체 선택'}
                </button>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg font-bold">{selectedIndices.size}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-600">{filteredSchedules.length}</span>
                  <span className="text-gray-500 ml-1">개 선택됨</span>
                </div>
              </div>
              <button
                onClick={handleCreateRequest}
                disabled={!selectedInstructor || selectedIndices.size === 0 || creating}
                className="flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 via-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:via-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>강사 섭외</span>
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIndices.size === filteredSchedules.length && filteredSchedules.length > 0}
                        onChange={handleSelectAll}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">교육날짜</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">가일정여부</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">고객사명</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">클래스명</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">DRI</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">강사</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">코치</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-lg font-medium">교육 일정이 없습니다</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((schedule) => {
                      const isSelected = selectedIndices.has(schedule.rowIndex);
                      const isBlocked = !!(selectedInstructor && isDateBlocked(schedule.educationDate));
                      return (
                        <tr
                          key={schedule.rowIndex}
                          className={`transition-all duration-200 ${
                            isBlocked
                              ? 'bg-red-50 opacity-60'
                              : isSelected
                              ? 'bg-gradient-to-r from-blue-50 to-blue-100/50 border-l-4 border-l-blue-600 shadow-sm'
                              : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/20'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isBlocked}
                              onChange={() => handleToggleSchedule(schedule.rowIndex)}
                              className={`h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
                                isBlocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                              }`}
                              title={isBlocked ? '강사 일정이 있어 선택할 수 없습니다' : ''}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatDate(schedule.educationDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {schedule.isTentative === 'O' ? (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border border-amber-200 shadow-sm">
                                가일정
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">
                                확정
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {schedule.clientName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 max-w-md truncate">
                            {schedule.className}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {schedule.dri || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {schedule.instructor || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {schedule.coach || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 카톡 메시지 템플릿 */}
      {success && (
        <div className="bg-gradient-to-br from-emerald-50 via-green-50/50 to-teal-50/30 border-2 border-emerald-200/50 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-emerald-900 mb-1">섭외 요청이 생성되었습니다!</h3>
                <p className="text-sm text-emerald-700">카톡 메시지를 복사하여 전송하세요</p>
              </div>
            </div>
            <button
              onClick={handleCopyTemplate}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              전체 메시지 복사
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  교육 형태 (수정 가능)
                </label>
                <input
                  type="text"
                  value={educationType}
                  onChange={(e) => setEducationType(e.target.value)}
                  placeholder="예: 오프라인, 온라인, 하이브리드 등"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    카톡 메시지 템플릿
                  </label>
                  <button
                    onClick={handleCopyTemplate}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    복사
                  </button>
                </div>
                <textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={18}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-mono whitespace-pre-wrap resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-xl border-2 border-gray-200/50 p-6 shadow-lg">
              <h4 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                요청 정보
              </h4>
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">요청 ID</p>
                  <p className="text-sm font-mono font-semibold text-gray-900 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 rounded-lg border border-gray-200">{success.requestId}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">선택된 일정</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">{success.selectedSchedules.length}</p>
                    <span className="text-gray-600 font-medium">개</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-gradient-to-br from-red-50 to-rose-50/50 border-2 border-red-200/50 rounded-xl p-6 flex items-start gap-4 shadow-lg">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-red-900 mb-1">오류가 발생했습니다</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
