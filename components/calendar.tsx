'use client';

import { useState, useEffect } from 'react';

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
    instructorName?: string; // 강사 이름 (이메일로 조회)
  }>;
  location?: string;
}

interface CalendarProps {
  apiEndpoint: string; // '/api/instructor/calendar' 또는 '/api/em/calendar'
  title?: string; // 페이지 제목 (선택사항)
}

export default function Calendar({ apiEndpoint, title }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // 현재 월의 첫 날과 마지막 날 계산
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 일정 로드
  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      try {
        const timeMin = startOfMonth.toISOString();
        const timeMax = endOfMonth.toISOString();

        const response = await fetch(
          `${apiEndpoint}?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
        );

        if (!response.ok) {
          throw new Error('일정을 불러올 수 없습니다.');
        }

        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [year, month, apiEndpoint]);

  // 날짜를 YYYY-MM-DD 형식으로 변환 (로컬 시간 기준)
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 특정 날짜의 일정 가져오기
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = formatDateString(date);
    return events.filter((event) => {
      let eventDate = '';
      if (event.start.dateTime) {
        // dateTime인 경우 로컬 시간 기준으로 날짜 추출
        const eventDateObj = new Date(event.start.dateTime);
        eventDate = formatDateString(eventDateObj);
      } else if (event.start.date) {
        // date인 경우 (하루 종일 이벤트)
        eventDate = event.start.date;
      }
      return eventDate === dateStr;
    });
  };

  // 캘린더 그리드 생성
  const getCalendarDays = () => {
    const days: (Date | null)[] = [];
    const startDate = new Date(year, month, 1);
    const dayOfWeek = startDate.getDay(); // 0 (일요일) ~ 6 (토요일)

    // 이전 달의 마지막 날들
    for (let i = dayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }

    // 현재 달의 날들
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // 다음 달의 첫 날들 (캘린더를 6주로 채우기 위해)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }

    return days;
  };

  const calendarDays = getCalendarDays();
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  // 시간 포맷팅
  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="flex gap-6">
      {/* 캘린더 */}
      <div className="flex-[2] max-w-2xl bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">일정 캘린더</h3>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h4 className="text-lg font-semibold text-gray-900">
              {year}년 {month + 1}월
            </h4>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">로딩 중...</div>
        ) : (
          <>
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day, index) => (
                <div
                  key={day}
                  className={`text-center text-sm font-medium py-2 ${
                    index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 캘린더 그리드 */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((date, index) => {
                if (!date) return null;

                const isCurrentMonth = date.getMonth() === month;
                const isToday =
                  date.toDateString() === new Date().toDateString();
                const isSelected =
                  selectedDate &&
                  date.toDateString() === selectedDate.toDateString();
                const dateStr = formatDateString(date);
                const dayEvents = events.filter((event) => {
                  let eventDate = '';
                  if (event.start.dateTime) {
                    // dateTime인 경우 로컬 시간 기준으로 날짜 추출
                    const eventDateObj = new Date(event.start.dateTime);
                    eventDate = formatDateString(eventDateObj);
                  } else if (event.start.date) {
                    // date인 경우 (하루 종일 이벤트)
                    eventDate = event.start.date;
                  }
                  return eventDate === dateStr;
                });
                const hasEvents = dayEvents.length > 0;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      aspect-square flex flex-col items-center justify-center
                      rounded-lg transition-all duration-200
                      ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                      ${isToday && !isSelected && !hasEvents 
                        ? 'bg-blue-50 border-2 border-blue-400 font-semibold' 
                        : ''}
                      ${isSelected 
                        ? 'bg-blue-600 text-white shadow-md scale-105' 
                        : ''}
                      ${hasEvents && !isSelected && !isToday
                        ? 'bg-white hover:bg-gray-50' 
                        : ''}
                      ${!hasEvents && !isSelected && !isToday
                        ? 'hover:bg-gray-50' 
                        : ''}
                    `}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-white' : ''}`}>
                      {date.getDate()}
                    </span>
                    {hasEvents && (
                      <div className={`
                        w-2 h-2 rounded-full mt-1
                        ${isSelected 
                          ? 'bg-white' 
                          : 'bg-blue-500 shadow-sm'
                        }
                      `} />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 선택된 날짜 상세 정보 */}
      <div className="flex-1 min-w-[400px] bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {selectedDate ? (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {formatDate(selectedDate)}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              선택한 날짜의 일정 정보
            </p>

            {selectedDateEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">해당 날짜에 일정이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all bg-white"
                  >
                    <h4 className="font-semibold text-gray-900 mb-3 text-base">{event.summary}</h4>
                    {event.start.dateTime && (
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {formatTime(event.start.dateTime)}
                          {event.end.dateTime &&
                            ` - ${formatTime(event.end.dateTime)}`}
                        </span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.description && (
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">{event.description}</p>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">참석 강사</p>
                        <div className="space-y-1">
                          {event.attendees
                            .filter((attendee) => attendee.instructorName) // 강사 이름이 있는 경우만 표시
                            .map((attendee, idx) => (
                              <div
                                key={idx}
                                className="text-sm text-gray-700"
                              >
                                강사 : {attendee.instructorName}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7 19l-4-2 2-4M14 2l4 4M3 7l4 4" />
            </svg>
            <p className="text-sm">날짜를 선택하면 상세 정보를 볼 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

