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
  isPersonal?: boolean; // 개인 일정 여부
}

interface CalendarProps {
  apiEndpoint: string; // '/api/instructor/calendar' 또는 '/api/em/calendar'
  title?: string; // 페이지 제목 (선택사항)
  personalEventDates?: string[]; // 강의 불가(개인 일정) 날짜 배열 (YYYY-MM-DD 형식)
  preferredEventDates?: string[]; // 강의 선호 날짜 배열 (YYYY-MM-DD 형식)
  educationEventDates?: string[]; // 교육 일정 날짜 배열 (YYYY-MM-DD 형식) - 강사별 캘린더용
  filteredEvents?: CalendarEvent[]; // 필터링된 이벤트 목록 (강사 선택 시 사용)
  variant?: 'default' | 'business'; // 색감/강조 방식
  /** true면 기업교육 일정만 표시 (강의 불가/선호 개인 일정 제외) - EM 전체 기업교육 일정용 */
  educationOnly?: boolean;
  /** true면 강사 본인 캘린더: 그리드에 강사 이름 숨김, 상세 패널은 캘린더 옆에 배치 */
  instructorView?: boolean;
}

export default function Calendar({
  apiEndpoint,
  title,
  personalEventDates = [],
  preferredEventDates = [],
  educationEventDates = [],
  filteredEvents,
  variant = 'default',
  educationOnly = false,
  instructorView = false,
}: CalendarProps) {
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
    if (filteredEvents) {
      setEvents(filteredEvents);
      setLoading(false);
      return;
    }

    const loadEvents = async () => {
      setLoading(true);
      try {
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        const timeMin = startOfMonth.toISOString();
        const timeMax = endOfMonth.toISOString();

        const separator = apiEndpoint.includes('?') ? '&' : '?';
        const response = await fetch(
          `${apiEndpoint}${separator}timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[캘린더] API 오류:', errorText);
          throw new Error('일정을 불러올 수 없습니다.');
        }

        const data = await response.json();
        const allEvents = data.events || [];
        const isPersonalEvent = (e: any) =>
          e.isPersonal ||
          e.id?.startsWith('personal-') ||
          e.description === '개인 일정' ||
          e.description === '강의 불가' ||
          e.description === '강의 선호';

        const educationEvents = allEvents.filter((e: any) => !isPersonalEvent(e));
        setEvents(educationOnly ? educationEvents : allEvents);
      } catch (error) {
        console.error('[캘린더 컴포넌트] 일정 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    if (apiEndpoint) {
      loadEvents();
    }
  }, [currentDate, apiEndpoint, filteredEvents, educationOnly]);

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
  const isBusiness = variant === 'business';

  return (
    <div className={`flex gap-6 flex-1 min-h-0 ${instructorView ? 'flex-row' : 'flex-col'}`}>
      {/* 캘린더 - 강사 뷰면 옆에 상세 패널, EM이면 아래에 상세 패널 */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200/60 p-6 ${instructorView ? 'flex-[4] min-w-0 max-w-5xl' : 'w-full'}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">일정 캘린더</h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
              <span>기업교육</span>
            </div>
            {!educationOnly && (
              <>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 text-red-500 font-bold" aria-hidden>✕</span>
                  <span>강의 불가</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-700" />
                  <span>강의 선호</span>
                </div>
              </>
            )}
          </div>
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
                    index === 0 ? 'text-red-500' : index === 6 ? 'text-gray-500' : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 캘린더 그리드 - 최소 높이로 셀 크기 확보 */}
            <div className="grid grid-cols-7 gap-2 min-h-[380px]">
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
                const isPreferredEvent = (event: CalendarEvent) => {
                  const desc = event.description || '';
                  const sum = event.summary || '';
                  return desc.includes('선호') || sum.includes('선호');
                };
                const isBlockedEvent = (event: CalendarEvent) => {
                  const desc = event.description || '';
                  const sum = event.summary || '';
                  if (desc === '개인 일정' || desc.includes('불가') || sum.includes('불가')) return true;
                  // 개인 일정인데 선호가 아니면 불가로 취급(하위 호환)
                  if ((event.isPersonal || event.id?.startsWith('personal-')) && !isPreferredEvent(event)) {
                    return true;
                  }
                  return false;
                };
                const hasBlockedEvents = dayEvents.some(isBlockedEvent);
                const hasPreferredEvents = dayEvents.some(isPreferredEvent);
                const educationDayEvents = dayEvents.filter((event) => {
                  const isPersonal =
                    event.isPersonal ||
                    event.id?.startsWith('personal-') ||
                    event.description === '개인 일정' ||
                    event.description === '강의 불가' ||
                    event.description === '강의 선호';
                  return !isPersonal;
                });
                const hasEducationEvents = educationDayEvents.length > 0;
                // 해당 일자 기업교육 일정의 강사 이름 수집 (중복 제거)
                const dayInstructorNames = Array.from(
                  new Set(
                    educationDayEvents.flatMap((e) =>
                      (e.attendees || [])
                        .filter((a) => a.instructorName)
                        .map((a) => a.instructorName!)
                    )
                  )
                ).filter(Boolean);
                // 강의 불가 날짜 확인 (props로 전달된 날짜 또는 events에서 확인)
                const hasBlockedDate = personalEventDates.includes(dateStr) || hasBlockedEvents;
                // 강의 선호 날짜 확인 (props로 전달된 날짜 또는 events에서 확인)
                const hasPreferredDate = preferredEventDates.includes(dateStr) || hasPreferredEvents;
                // 교육 일정 날짜 확인 (props로 전달된 날짜 또는 events에서 확인)
                const hasEducationDate = educationEventDates.includes(dateStr) || hasEducationEvents;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      aspect-square flex flex-col items-center justify-start pt-1.5
                      rounded-lg transition-all duration-200 relative
                      ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                      ${isToday && !isSelected && !hasEvents && !hasEducationDate && !hasBlockedDate && !hasPreferredDate
                        ? 'bg-gray-50 border-2 border-gray-300 font-semibold'
                        : ''}
                      ${isSelected
                        ? 'bg-gray-800 text-white shadow-sm scale-105'
                        : ''}
                      ${
                        hasEducationDate &&
                        !hasBlockedDate &&
                        !isSelected &&
                        !isToday &&
                        isCurrentMonth
                          ? isBusiness
                            ? 'bg-sky-50 hover:bg-sky-100'
                            : 'bg-sky-100 hover:bg-sky-200'
                          : ''
                      }
                      ${
                        hasPreferredDate &&
                        !hasBlockedDate &&
                        !hasEducationDate &&
                        !isSelected &&
                        !isToday &&
                        isCurrentMonth
                          ? isBusiness
                            ? 'bg-emerald-400 hover:bg-emerald-500'
                            : 'bg-emerald-300 hover:bg-emerald-400'
                          : ''
                      }
                      ${!hasEvents && !hasEducationDate && !hasBlockedDate && !hasPreferredDate && !isSelected && !isToday
                        ? 'hover:bg-gray-50' 
                        : ''}
                    `}
                  >
                    <span className={`relative z-10 text-sm font-medium self-center ${isSelected ? 'text-white' : ''}`}>
                      {date.getDate()}
                    </span>
                    {/* 강의 불가: X 표시 (강사/EM 공통) - 셀 중앙에 크게 표시 */}
                    {(hasBlockedDate || hasBlockedEvents) && isCurrentMonth && (
                      <span
                        className={`absolute inset-0 flex items-center justify-center pointer-events-none text-3xl font-bold leading-none select-none ${
                          isSelected ? 'text-white/90' : 'text-red-500'
                        }`}
                        style={{ zIndex: 0 }}
                        aria-hidden
                      >
                        ✕
                      </span>
                    )}
                    {/* 하단: 기업교육일 때 강사 성함만 표시 (강사 본인 뷰에서는 숨김) */}
                    {!instructorView && (hasEducationDate || hasPreferredDate || hasEducationEvents || hasPreferredEvents) && isCurrentMonth && dayInstructorNames.length > 0 && (
                      <div className="absolute left-0 right-0 bottom-4 flex flex-col items-center justify-end min-h-[2.5rem]">
                        <div
                          className={`text-center leading-snug px-0.5 max-w-full overflow-hidden ${
                            isSelected ? 'text-white' : 'text-gray-700'
                          }`}
                          style={{ fontSize: '13px', fontWeight: 700 }}
                          title={dayInstructorNames.join(', ')}
                        >
                          {dayInstructorNames.slice(0, 3).map((name, i) => (
                            <div key={i} className="truncate">
                              {name}
                            </div>
                          ))}
                          {dayInstructorNames.length > 3 && (
                            <div>+{dayInstructorNames.length - 3}명</div>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 선택한 날짜의 교육 일정 상세 (강사 뷰는 옆에, EM은 아래에 표시) */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200/60 p-6 overflow-auto ${instructorView ? 'flex-1 min-w-[280px] max-w-sm' : 'w-full'}`}>
        {selectedDate ? (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {formatDate(selectedDate)} 일정
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              선택한 날짜의 교육 일정입니다.
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
                {selectedDateEvents.map((event) => {
                  const isPersonal =
                    event.isPersonal ||
                    event.id?.startsWith('personal-') ||
                    event.description === '개인 일정' ||
                    event.description === '강의 불가' ||
                    event.description === '강의 선호';
                  const isPreferred = event.description === '강의 선호';
                  return (
                    <div
                      key={event.id}
                      className={`border rounded-lg p-5 hover:shadow-sm transition-all ${
                        isPersonal
                          ? 'bg-gray-50 border-gray-200'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-2 px-2 py-0.5 bg-white text-xs font-semibold rounded-lg border border-gray-200 text-gray-800">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              !isPersonal ? 'bg-sky-500' : isPreferred ? 'bg-emerald-600' : 'bg-gray-800'
                            }`}
                          />
                          {!isPersonal ? '기업교육' : isPreferred ? '강의 선호' : '강의 불가'}
                        </span>
                      </div>
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
                      <div
                        className="text-sm text-gray-600 mb-3 leading-relaxed [&_b]:font-semibold [&_br]:block"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                      />
                    )}
                    {event.attendees && event.attendees.length > 0 && (() => {
                      const instructorNames = event.attendees
                        .filter((a) => a.instructorName)
                        .map((a) => a.instructorName!);
                      if (instructorNames.length === 0) return null;
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-semibold text-gray-800 mb-2">
                            강사 {instructorNames.length > 1 ? `(${instructorNames.length}명)` : ''}
                          </p>
                          <div className="space-y-1.5">
                            {instructorNames.map((name, idx) => (
                              <div key={idx} className="text-base text-gray-800">
                                · {name}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">캘린더에서 날짜를 선택하면 해당 날짜의 일정이 아래에 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

