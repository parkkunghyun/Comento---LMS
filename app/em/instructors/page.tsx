'use client';

import { useState, useEffect } from 'react';

interface InstructorInfo {
  rowIndex: number;
  name: string;
  affiliation: string;
  mobile: string;
  email: string;
  fee: string;
  notes: string;
  [key: string]: string | number;
}

const GOOGLE_DRIVE_FOLDER_ID = '1w218kHL14yR1pCZSXHUD3VoY5q3EIj2c';
const GOOGLE_DRIVE_BASE_URL = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;

export default function EMInstructorsPage() {
  const [instructors, setInstructors] = useState<InstructorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInstructors();
  }, []);

  const loadInstructors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/em/instructors-info');
      if (!response.ok) {
        throw new Error('강사 목록을 불러올 수 없습니다.');
      }
      const data = await response.json();
      setInstructors(data.instructors || []);
      // 편집 중인 셀 초기화
      setEditingCell(null);
      setEditValue('');
    } catch (err) {
      console.error('Error loading instructors:', err);
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInstructors();
  };

  const toggleRow = (rowIndex: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowIndex)) {
      newExpanded.delete(rowIndex);
    } else {
      newExpanded.add(rowIndex);
    }
    setExpandedRows(newExpanded);
  };

  const startEdit = (rowIndex: number, column: string, currentValue: string) => {
    setEditingCell({ rowIndex, column });
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    // 컬럼 인덱스 매핑 (0-based, A=0, B=1, C=2, ...)
    const columnMap: { [key: string]: number } = {
      name: 2, // C열 (인덱스 2)
      affiliation: 3, // D열 (인덱스 3)
      mobile: 6, // G열 (인덱스 6)
      email: 7, // H열 (인덱스 7)
      fee: 8, // I열 (인덱스 8)
      notes: 13, // N열 (인덱스 13)
    };

    const columnIndex = columnMap[editingCell.column];
    if (columnIndex === undefined) {
      alert('수정할 수 없는 컬럼입니다.');
      return;
    }

    try {
      const response = await fetch('/api/em/instructors-info/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rowIndex: editingCell.rowIndex,
          columnIndex,
          value: editValue,
        }),
      });

      if (!response.ok) {
        throw new Error('업데이트에 실패했습니다.');
      }

      // 로컬 상태 업데이트
      setInstructors((prev) =>
        prev.map((inst) =>
          inst.rowIndex === editingCell.rowIndex
            ? { ...inst, [editingCell.column]: editValue }
            : inst
        )
      );

      cancelEdit();
    } catch (err) {
      console.error('Error updating instructor:', err);
      alert('업데이트 중 오류가 발생했습니다.');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
          <div className="text-sm font-medium text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-rose-50/50 border-2 border-red-200/50 rounded-2xl shadow-lg p-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900 mb-1">오류가 발생했습니다</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 rounded-2xl shadow-lg border border-gray-200/50 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">강사 현황</h1>
              <p className="text-sm text-gray-600">강사 정보를 확인하고 수정할 수 있습니다</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? '새로고침 중...' : '새로고침'}
            </button>
            <button
              onClick={() => window.open(GOOGLE_DRIVE_BASE_URL, '_blank')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              드라이브 열기
            </button>
          </div>
        </div>
      </div>

      {/* 통계 */}
      {!loading && !error && (
        <div className="bg-gradient-to-br from-white via-blue-50/20 to-purple-50/10 rounded-2xl shadow-lg border border-gray-200/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">강사 통계</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {instructors.length}
                  </span>
                  <span className="text-sm font-medium text-gray-600">명</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 강사 목록 테이블 */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16">
                  {/* 확장 버튼 */}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  강사명
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  소속
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[200px]">
                  특이사항
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {instructors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-500">강사 목록이 없습니다.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                instructors.map((instructor) => {
                  const isExpanded = expandedRows.has(instructor.rowIndex);
                  const isEditing = editingCell?.rowIndex === instructor.rowIndex;

                  return (
                    <>
                      <tr
                        key={instructor.rowIndex}
                        className={`transition-all duration-200 ${
                          isExpanded 
                            ? 'bg-gradient-to-r from-blue-50/30 to-purple-50/20' 
                            : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/10'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleRow(instructor.rowIndex)}
                            className={`p-2 rounded-xl transition-all duration-200 ${
                              isExpanded
                                ? 'bg-blue-100 text-blue-600 rotate-180'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            <svg
                              className="w-5 h-5 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing && editingCell?.column === 'name' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="px-3 py-2 text-sm border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="text-sm font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => startEdit(instructor.rowIndex, 'name', instructor.name)}
                            >
                              {instructor.name || '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing && editingCell?.column === 'affiliation' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="px-3 py-2 text-sm border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="text-sm font-medium text-gray-700 cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => startEdit(instructor.rowIndex, 'affiliation', instructor.affiliation)}
                            >
                              {instructor.affiliation || '-'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {isEditing && editingCell?.column === 'notes' ? (
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="w-full px-3 py-2 text-sm border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm"
                              rows={4}
                              autoFocus
                            />
                          ) : (
                            <div
                              className="text-sm cursor-pointer"
                              onClick={() => startEdit(instructor.rowIndex, 'notes', instructor.notes)}
                            >
                              {instructor.notes ? (
                                <div className="flex flex-wrap gap-2">
                                  {instructor.notes
                                    .split(/[•·]/)
                                    .map((item, idx) => {
                                      const trimmed = item.trim();
                                      if (!trimmed) return null;
                                      return (
                                        <div
                                          key={idx}
                                          className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-800 rounded-lg text-xs font-medium border border-yellow-200 shadow-sm hover:shadow-md transition-shadow"
                                        >
                                          • {trimmed}
                                        </div>
                                      );
                                    })}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="px-6 py-5 bg-gradient-to-br from-white via-blue-50/20 to-purple-50/10">
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">행 번호</p>
                                  <p className="text-base font-bold text-gray-900">{instructor.rowIndex}</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl p-4 border border-blue-200">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">강사명</p>
                                  {isEditing && editingCell?.column === 'name' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-full px-3 py-2 text-sm border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm"
                                      autoFocus
                                    />
                                  ) : (
                                    <p
                                      className="text-base font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                      onClick={() => startEdit(instructor.rowIndex, 'name', instructor.name)}
                                    >
                                      {instructor.name}
                                    </p>
                                  )}
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 rounded-xl p-4 border border-purple-200">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">소속</p>
                                  {isEditing && editingCell?.column === 'affiliation' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-full px-3 py-2 text-sm border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm"
                                      autoFocus
                                    />
                                  ) : (
                                    <p
                                      className="text-base font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                      onClick={() => startEdit(instructor.rowIndex, 'affiliation', instructor.affiliation)}
                                    >
                                      {instructor.affiliation || '-'}
                                    </p>
                                  )}
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 rounded-xl p-4 border border-green-200">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">이메일</p>
                                  {isEditing && editingCell?.column === 'email' ? (
                                    <input
                                      type="email"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-full px-3 py-2 text-sm border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm"
                                      autoFocus
                                    />
                                  ) : (
                                    <p
                                      className="text-base font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors break-all"
                                      onClick={() => startEdit(instructor.rowIndex, 'email', instructor.email)}
                                    >
                                      {instructor.email || '-'}
                                    </p>
                                  )}
                                </div>
                                <div className="bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-xl p-4 border border-orange-200">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">전화번호</p>
                                  {isEditing && editingCell?.column === 'mobile' ? (
                                    <input
                                      type="tel"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-full px-3 py-2 text-sm border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm"
                                      autoFocus
                                    />
                                  ) : (
                                    <p
                                      className="text-base font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                      onClick={() => startEdit(instructor.rowIndex, 'mobile', instructor.mobile)}
                                    >
                                      {instructor.mobile || '-'}
                                    </p>
                                  )}
                                </div>
                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 rounded-xl p-4 border border-indigo-200">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">강사료</p>
                                  {isEditing && editingCell?.column === 'fee' ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-full px-3 py-2 text-sm border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm"
                                      autoFocus
                                    />
                                  ) : (
                                    <p
                                      className="text-base font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                      onClick={() => startEdit(instructor.rowIndex, 'fee', instructor.fee)}
                                    >
                                      {instructor.fee || '-'}
                                    </p>
                                  )}
                                </div>
                                <div className="col-span-full bg-gradient-to-br from-yellow-50 to-amber-50/50 rounded-xl p-5 border border-yellow-200">
                                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">특이사항</p>
                                  {isEditing && editingCell?.column === 'notes' ? (
                                    <textarea
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={saveEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) saveEdit();
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      className="w-full px-4 py-3 text-sm border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm"
                                      rows={4}
                                      autoFocus
                                    />
                                  ) : (
                                    <div
                                      className="cursor-pointer"
                                      onClick={() => startEdit(instructor.rowIndex, 'notes', instructor.notes)}
                                    >
                                      {instructor.notes ? (
                                        <div className="space-y-2">
                                          {instructor.notes
                                            .split(/[•·]/)
                                            .map((item, idx) => {
                                              const trimmed = item.trim();
                                              if (!trimmed) return null;
                                              return (
                                                <div
                                                  key={idx}
                                                  className="text-sm text-gray-900 bg-white px-4 py-3 rounded-lg border border-yellow-300 shadow-sm hover:shadow-md transition-shadow"
                                                >
                                                  • {trimmed}
                                                </div>
                                              );
                                            })}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-400 bg-white px-4 py-3 rounded-lg border border-gray-200">-</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
