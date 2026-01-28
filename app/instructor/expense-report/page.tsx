'use client';

import { useState, useEffect } from 'react';

interface ExpenseReport {
  email: string;
  name: string;
  month: string;
  uploadDate: string;
  fileName: string;
  fileId: string;
  webViewLink: string;
  type: string;
}

export default function InstructorExpenseReportPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [months, setMonths] = useState<string[]>([]);
  const [reportsByMonth, setReportsByMonth] = useState<Record<string, ExpenseReport[]>>({});
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string | null>(null);

  // 현재 년월을 기본값으로 설정
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${year}-${month}`);
  }, []);

  useEffect(() => {
    fetchMyReports();
  }, []);

  const fetchMyReports = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const response = await fetch('/api/instructor/expense-report');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '내 제출 내역을 불러오지 못했습니다.');
      }
      setMonths(data.months || []);
      setReportsByMonth(data.reportsByMonth || {});
      setSelectedHistoryMonth((prev) => prev || (data.months?.[0] ?? null));
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(
        `/api/instructor/expense-report/download?fileId=${encodeURIComponent(fileId)}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '다운로드에 실패했습니다.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : '다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'excel' | 'zip') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'excel') {
        setExcelFile(file);
      } else {
        setZipFile(file);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMonth) {
      setError('월을 선택해주세요.');
      return;
    }

    if (!zipFile) {
      setError('압축된 폴더는 필수입니다.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('month', selectedMonth);
      if (excelFile) {
        formData.append('excelFile', excelFile);
      }
      if (zipFile) {
        formData.append('zipFile', zipFile);
      }

      const response = await fetch('/api/instructor/expense-report/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || '업로드에 실패했습니다.');
      }

      setSuccess('지출결의서가 성공적으로 업로드되었습니다.');
      setExcelFile(null);
      setZipFile(null);
      // 파일 입력 초기화
      const excelInput = document.getElementById('excelFile') as HTMLInputElement;
      const zipInput = document.getElementById('zipFile') as HTMLInputElement;
      if (excelInput) excelInput.value = '';
      if (zipInput) zipInput.value = '';
      await fetchMyReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const selectedMonthReports = selectedHistoryMonth
    ? reportsByMonth[selectedHistoryMonth] || []
    : [];
  const excelFiles = selectedMonthReports.filter((r) => r.type === 'excel');
  const zipFiles = selectedMonthReports.filter((r) => r.type === 'zip');
  const latestUploadDate =
    selectedMonthReports.length > 0
      ? selectedMonthReports
          .map((r) => r.uploadDate)
          .filter(Boolean)
          .sort()
          .reverse()[0]
      : null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">지출결의서 작성</h1>
          <p className="text-sm text-gray-500 mt-1">
            매월 지출결의서를 업로드하고, 본인 제출 내역을 월별로 확인할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMyReports}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          내역 새로고침
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 업로드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">업로드</h2>
            <p className="text-sm text-gray-500">엑셀(선택) + 영수증 이미지 압축(필수)</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 whitespace-pre-line">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 월 선택 */}
            <div>
              <label htmlFor="month" className="block text-sm font-semibold text-gray-700 mb-2">
                정산 월 <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-400 text-base"
                required
              />
              <p className="mt-1 text-xs text-gray-500">정산할 월을 선택해주세요</p>
            </div>

            {/* 엑셀 파일 */}
            <div>
              <label htmlFor="excelFile" className="block text-sm font-semibold text-gray-700 mb-2">
                지출결의서 엑셀 파일 (선택)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="excelFile" className="relative cursor-pointer bg-white rounded-md font-medium text-gray-700 hover:text-gray-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-300">
                      <span>파일 선택</span>
                      <input
                        id="excelFile"
                        name="excelFile"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleFileChange(e, 'excel')}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">또는 드래그 앤 드롭</p>
                  </div>
                  <p className="text-xs text-gray-500">XLSX, XLS 파일만 가능</p>
                </div>
              </div>
              {excelFile && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{excelFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(excelFile.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExcelFile(null);
                        const input = document.getElementById('excelFile') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 압축 파일 */}
            <div>
              <label htmlFor="zipFile" className="block text-sm font-semibold text-gray-700 mb-2">
                영수증 이미지 압축 파일 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="zipFile" className="relative cursor-pointer bg-white rounded-md font-medium text-gray-700 hover:text-gray-900 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-300">
                      <span>파일 선택</span>
                      <input
                        id="zipFile"
                        name="zipFile"
                        type="file"
                        accept=".zip,.rar"
                        onChange={(e) => handleFileChange(e, 'zip')}
                        className="sr-only"
                        required
                      />
                    </label>
                    <p className="pl-1">또는 드래그 앤 드롭</p>
                  </div>
                  <p className="text-xs text-gray-500">ZIP, RAR 파일만 가능</p>
                </div>
              </div>
              {zipFile && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{zipFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(zipFile.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setZipFile(null);
                        const input = document.getElementById('zipFile') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">영수증 이미지가 포함된 폴더를 압축한 파일을 업로드해주세요</p>
            </div>

            {/* 업로드 버튼 */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={uploading || !zipFile}
                className="w-full px-6 py-4 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
              >
                {uploading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    업로드 중...
                  </span>
                ) : (
                  '지출결의서 업로드'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* 내 제출 내역 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200/60 p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">내 제출 내역</h2>
            <p className="text-sm text-gray-500">
              월별로 제출한 엑셀/압축 파일을 확인하고 다운로드할 수 있습니다.
            </p>
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                <div className="text-gray-600">불러오는 중...</div>
              </div>
            </div>
          ) : historyError ? (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
              <p className="text-sm font-medium text-red-800 whitespace-pre-line">{historyError}</p>
            </div>
          ) : months.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              아직 제출한 지출결의서가 없습니다.
            </div>
          ) : (
            <div className="space-y-5">
              {/* 월 선택 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">월 선택</p>
                  <p className="text-xs text-gray-500">총 {Object.values(reportsByMonth).flat().length}개 파일</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {months.map((m) => {
                    const count = reportsByMonth[m]?.length || 0;
                    const active = selectedHistoryMonth === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedHistoryMonth(m)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                          active
                            ? 'bg-gray-100 border-gray-400 text-gray-900 font-semibold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {m}
                        <span className="ml-2 text-xs text-gray-500">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 선택 월 파일 */}
              <div className="border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedHistoryMonth} 제출 파일
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {latestUploadDate ? `마지막 업로드: ${latestUploadDate}` : '업로드 기록 없음'}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {selectedMonthReports.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      해당 월의 제출 내역이 없습니다.
                    </p>
                  ) : (
                    <>
                      {/* 엑셀 */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700">엑셀</p>
                          <p className="text-xs text-gray-500">{excelFiles.length}개</p>
                        </div>
                        {excelFiles.length === 0 ? (
                          <p className="text-sm text-gray-400">엑셀 파일이 없습니다.</p>
                        ) : (
                          <div className="space-y-2">
                            {excelFiles.map((f, idx) => (
                              <div
                                key={`${f.fileId}-${idx}`}
                                className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{f.fileName}</p>
                                    <p className="text-xs text-gray-500 mt-1">업로드일: {f.uploadDate}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {f.webViewLink && (
                                      <a
                                        href={f.webViewLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                      >
                                        열기
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(f.fileId, f.fileName)}
                                      className="px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                                    >
                                      다운로드
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 압축 */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-700">영수증 압축</p>
                          <p className="text-xs text-gray-500">{zipFiles.length}개</p>
                        </div>
                        {zipFiles.length === 0 ? (
                          <p className="text-sm text-gray-400">압축 파일이 없습니다.</p>
                        ) : (
                          <div className="space-y-2">
                            {zipFiles.map((f, idx) => (
                              <div
                                key={`${f.fileId}-${idx}`}
                                className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{f.fileName}</p>
                                    <p className="text-xs text-gray-500 mt-1">업로드일: {f.uploadDate}</p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {f.webViewLink && (
                                      <a
                                        href={f.webViewLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                      >
                                        열기
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(f.fileId, f.fileName)}
                                      className="px-3 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                                    >
                                      다운로드
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
