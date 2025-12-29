'use client';

import { useState, useCallback, useRef } from 'react';

interface ZipUploaderProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  maxSizeMb?: number;
  disabled?: boolean;
}

export function ZipUploader({
  file,
  onFileChange,
  maxSizeMb = 10,
  disabled = false,
}: ZipUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  const validateFile = (f: File): string | null => {
    // Check file type
    if (!f.name.endsWith('.zip') && f.type !== 'application/zip' && f.type !== 'application/x-zip-compressed') {
      return '請上傳 ZIP 格式的檔案';
    }

    // Check file size
    if (f.size > maxSizeBytes) {
      return `檔案大小不得超過 ${maxSizeMb}MB`;
    }

    return null;
  };

  const handleFile = useCallback((f: File) => {
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileChange(f);
  }, [maxSizeBytes, onFileChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [disabled, handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleRemove = useCallback(() => {
    setError(null);
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onFileChange]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* 已選擇的檔案 */}
      {file && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-800">{file.name}</p>
              <p className="text-sm text-green-600">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="rounded-md p-2 text-green-600 hover:bg-green-100 disabled:opacity-50"
            title="移除檔案"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 拖曳上傳區域 */}
      {!file && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragActive
              ? 'border-[#003865] bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />

          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <p className="mt-4 text-center text-sm text-gray-600">
            <span className="font-medium text-[#003865]">點擊上傳</span> 或拖曳檔案到此處
          </p>
          <p className="mt-1 text-xs text-gray-500">
            僅支援 ZIP 格式，最大 {maxSizeMb}MB
          </p>
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 說明文字 */}
      <div className="rounded-md bg-blue-50 p-4">
        <h4 className="mb-2 text-sm font-medium text-blue-800">ZIP 檔案格式說明</h4>
        <ul className="space-y-1 text-sm text-blue-700">
          <li>- 請將所有原始碼檔案壓縮成 ZIP 格式</li>
          <li>- 確保主程式位於根目錄或按照題目要求的結構放置</li>
          <li>- 如果題目有提供 Makefile，請確保包含在 ZIP 中</li>
        </ul>
      </div>
    </div>
  );
}
