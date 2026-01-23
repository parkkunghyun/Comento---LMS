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

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    instructorName?: string;
  }>;
  location?: string;
}

interface Instructor {
  name: string;
  email: string;
}

export default function EMSchedulePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [thisMonthStats, setThisMonthStats] = useState({ total: 0 });
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');
  
  // 강사별 교육 일정 날짜와 개인 일정 날짜
  const [instructorEducationDates, setInstructorEducationDates] = useState<Record<string, string[]>>({});
  const [instructorPersonalDates, setInstructorPersonalDates] = useState<Record<string, string[]>>({});
  
  // 선택된 강사의 이벤트만 필터링
  const [filteredEventsForCalendar, setFilteredEventsForCalendar] = useState<CalendarEvent[]>([]);

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

  // 전체 교육 일정에서 강사별 교육 일정 날짜 추출 및 선택된 강사의 이벤트 필터링
  useEffect(() => {
    if (events.length === 0 || instructors.length === 0) return;

    // 강사 이메일 목록 생성 (빠른 조회를 위해 Set 사용)
    const instructorEmails = new Set(instructors.map(i => i.email.toLowerCase()));

    const educationDatesByInstructor: Record<string, string[]> = {};

    events.forEach((event) => {
      if (!event.attendees || event.attendees.length === 0) return;

      // 날짜 추출
      let eventDate = '';
      if (event.start.dateTime) {
        const date = new Date(event.start.dateTime);
        eventDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      } else if (event.start.date) {
        eventDate = event.start.date;
      }

      if (!eventDate) return;

      // 각 참석자 중 강사 목록에 있는 강사만 필터링하여 날짜 추가
      event.attendees.forEach((attendee) => {
        if (attendee.email) {
          const email = attendee.email.toLowerCase();
          // 강사 목록에 있는 이메일인지 확인
          if (instructorEmails.has(email)) {
            if (!educationDatesByInstructor[email]) {
              educationDatesByInstructor[email] = [];
            }
            if (!educationDatesByInstructor[email].includes(eventDate)) {
              educationDatesByInstructor[email].push(eventDate);
            }
          }
        }
      });
    });

    console.log('[강사별 교육 일정 날짜 추출]', educationDatesByInstructor);
    setInstructorEducationDates(educationDatesByInstructor);

    // 선택된 강사가 있으면 해당 강사가 참석하는 이벤트만 필터링
    if (selectedInstructor) {
      const selectedEmail = selectedInstructor.toLowerCase();
      const filtered = events.filter((event) => {
        if (!event.attendees || event.attendees.length === 0) return false;
        return event.attendees.some(
          (attendee) => attendee.email?.toLowerCase() === selectedEmail
        );
      });
      console.log(`[선택된 강사 필터링] 강사: ${selectedInstructor}, 필터링된 이벤트 개수: ${filtered.length}`);
      setFilteredEventsForCalendar(filtered);
    } else {
      // 선택된 강사가 없으면 모든 이벤트 표시
      setFilteredEventsForCalendar(events);
    }
  }, [events, instructors, selectedInstructor]);

  // 강사별 개인 일정 날짜 로드
  useEffect(() => {
    if (instructors.length === 0) return;

    const loadPersonalDates = async () => {
      const personalDatesByInstructor: Record<string, string[]> = {};

      for (const instructor of instructors) {
        try {
          const response = await fetch('/api/em/instructor-personal-events', {
            headers: {
              'Content-Type': 'application/json',
            },
            method: 'POST',
            body: JSON.stringify({ instructorEmail: instructor.email }),
          });
          const data = await response.json();
          if (data.success) {
            personalDatesByInstructor[instructor.email.toLowerCase()] = 
              data.events?.map((e: any) => e.date) || [];
          }
        } catch (error) {
          console.error(`Error loading personal events for ${instructor.email}:`, error);
        }
      }

      setInstructorPersonalDates(personalDatesByInstructor);
    };

    loadPersonalDates();
  }, [instructors]);

  useEffect(() => {
    if (viewMode === 'list') {
      loadSchedules();
    } else if (viewMode === 'calendar') {
      // 캘린더 뷰에서도 전체 교육 일정을 로드하여 강사별 날짜 추출
      loadSchedules();
    }
  }, [viewMode]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEvents(events);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = events.filter(
        (event) =>
          event.summary.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query) ||
          event.attendees?.some(
            (attendee) =>
              attendee.displayName?.toLowerCase().includes(query) ||
              attendee.email.toLowerCase().includes(query) ||
              attendee.instructorName?.toLowerCase().includes(query)
          )
      );
      setFilteredEvents(filtered);
    }
  }, [searchQuery, events]);

  const loadSchedules = async () => {
    setLoadingSchedules(true);
    try {
      // 2026년 전체 데이터 가져오기
      const timeMin = new Date('2026-01-01T00:00:00Z').toISOString();
      const timeMax = new Date('2026-12-31T23:59:59Z').toISOString();
      
      const response = await fetch(
        `/api/em/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
      );
      if (!response.ok) {
        throw new Error('일정을 불러올 수 없습니다.');
      }
      const result = await response.json();
      const allEvents = result.events || [];
      setEvents(allEvents);
      setFilteredEvents(allEvents);

      // 이번달 통계 계산
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const thisMonthEvents = allEvents.filter((event: CalendarEvent) => {
        const eventDate = event.start.dateTime 
          ? new Date(event.start.dateTime)
          : event.start.date 
          ? new Date(event.start.date)
          : null;
        
        if (!eventDate) return false;
        return eventDate.getFullYear() === currentYear && eventDate.getMonth() === currentMonth;
      });

      setThisMonthStats({
        total: thisMonthEvents.length,
      });
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const formatEventDate = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      const date = new Date(event.start.dateTime);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
    } else if (event.start.date) {
      const date = new Date(event.start.date);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return '-';
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start.dateTime) {
      const start = new Date(event.start.dateTime);
      const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
      const startTime = start.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (end) {
        const endTime = end.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        return `${startTime} - ${endTime}`;
      }
      return startTime;
    }
    return '종일';
  };

  const getInstructors = (event: CalendarEvent) => {
    if (!event.attendees || event.attendees.length === 0) return '-';
    // 강사 시트에 있는 강사만 표시 (instructorName이 있는 경우만)
    const instructors = event.attendees
      .filter((attendee) => attendee.instructorName) // 강사 이름이 있는 경우만 필터링
      .map((attendee) => attendee.instructorName!)
      .filter(Boolean)
      .join(', ');
    return instructors || '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-red-600">사용자 정보를 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 rounded-2xl shadow-lg border border-gray-200/50 p-8 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">일정 확인</h1>
            <p className="text-sm text-gray-600 mt-1">교육 일정을 캘린더 또는 목록으로 확인할 수 있습니다</p>
          </div>
        </div>
      </div>

      {/* 뷰 모드 전환 탭 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-2 flex items-center gap-2">
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex-1 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
            viewMode === 'calendar'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            캘린더
          </div>
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
            viewMode === 'list'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            전체 일정
          </div>
        </button>
      </div>

      {/* 캘린더 뷰 */}
      {viewMode === 'calendar' && (
        <div className="space-y-6">
          {/* 강사 선택 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              강사 선택
            </label>
            <select
              value={selectedInstructor}
              onChange={(e) => setSelectedInstructor(e.target.value)}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all appearance-none bg-white shadow-sm hover:shadow-md cursor-pointer"
            >
              <option value="">전체 기업교육 일정</option>
              {instructors.map((instructor) => (
                <option key={instructor.name} value={instructor.email}>
                  {instructor.name}
                </option>
              ))}
            </select>
          </div>

          {/* 전체 기업교육 일정 또는 강사별 캘린더 */}
          {selectedInstructor ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {instructors.find((i) => i.email === selectedInstructor)?.name || '강사'} 캘린더
                </h3>
                <p className="text-sm text-gray-600">
                  강사의 기업교육 일정과 개인 일정을 확인할 수 있습니다
                </p>
              </div>
              {(() => {
                const selectedEmail = selectedInstructor.toLowerCase();
                const educationDates = instructorEducationDates[selectedEmail] || [];
                const personalDates = instructorPersonalDates[selectedEmail] || [];
                
                console.log(`[선택된 강사] 이메일: ${selectedEmail}`);
                console.log(`[선택된 강사] 교육 일정 날짜:`, educationDates);
                console.log(`[선택된 강사] 개인 일정 날짜:`, personalDates);
                console.log(`[선택된 강사] 필터링된 이벤트:`, filteredEventsForCalendar.length);
                
                return (
                  <Calendar 
                    apiEndpoint="/api/em/calendar"
                    educationEventDates={educationDates}
                    personalEventDates={personalDates}
                    filteredEvents={filteredEventsForCalendar}
                  />
                );
              })()}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">전체 기업교육 일정</h3>
                <p className="text-sm text-gray-600">
                  모든 강사의 기업교육 일정을 확인할 수 있습니다
                </p>
              </div>
              <Calendar apiEndpoint="/api/em/calendar" />
            </div>
          )}
        </div>
      )}

      {/* 게시판 뷰 */}
      {viewMode === 'list' && (
        <div className="space-y-5">
          {/* 이번달 요약 카드 */}
          <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 rounded-2xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">이번달 총 일정</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{thisMonthStats.total}</div>
                <div className="text-sm text-gray-500 mt-1">건</div>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* 검색 바 */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-5 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="고객사명, 클래스명, 강사명, DRI로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-11 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-white shadow-sm hover:shadow-md"
                />
                <svg
                  className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-5 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all shadow-sm hover:shadow-md"
                >
                  초기화
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-3 px-3 py-2 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-700">
                  검색 결과: <span className="font-bold text-blue-600">{filteredEvents.length}건</span>
                </div>
              </div>
            )}
          </div>

          {/* 일정 목록 */}
          {loadingSchedules ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600 mx-auto mb-4"></div>
              <div className="text-sm font-medium text-gray-600">일정을 불러오는 중...</div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-600">
                {searchQuery ? '검색 결과가 없습니다.' : '일정이 없습니다.'}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        일정
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        제목
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        시간
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        강사
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        장소
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredEvents.map((event) => (
                      <tr 
                        key={event.id} 
                        className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/20 transition-all duration-200"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{formatEventDate(event)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{event.summary || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-700 font-medium">{formatEventTime(event)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700">{getInstructors(event)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{event.location || '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
