'use client';

import { useRef, useState, useCallback } from 'react';

interface ZipUploaderProps {
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

export function ZipUploader({ onFileSelect, disabled = false }: ZipUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    // Check file type
    if (
      file.type !== 'application/zip' &&
      file.type !== 'application/x-zip-compressed' &&
      !file.name.endsWith('.zip')
    ) {
      setError('只接受 ZIP 檔案');
      return false;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('檔案大小不能超過 10MB');
      return false;
    }

    setError(null);
    return true;
  }, []);

  const handleFile = useCallback(
    (newFile: File) => {
      if (validateFile(newFile)) {
        setFile(newFile);
        onFileSelect(newFile);
      } else {
        setFile(null);
        onFileSelect(null);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setFile(null);
    setError(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />

      {!file ? (
        <div
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            flex flex-col items-center justify-center
            w-full h-64 border-2 border-dashed rounded-lg
            cursor-pointer transition-colors
            ${
              disabled
                ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                : dragActive
                  ? 'bg-blue-50 border-blue-400'
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
            }
          `}
        >
          <svg
            className={`w-12 h-12 mb-3 ${disabled ? 'text-gray-400' : 'text-gray-500'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
            <span className="font-semibold">點擊上傳</span> 或拖曳 ZIP 檔案
          </p>
          <p className="text-xs text-gray-500 mt-1">最大 10MB</p>
        </div>
      ) : (
        <div className="flex items-center justify-between w-full p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="p-1 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
            title="移除檔案"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-3 text-sm text-gray-600">
        <p className="font-medium mb-1">ZIP 檔案結構說明：</p>
        <ul className="list-disc list-inside text-xs text-gray-500 space-y-0.5">
          <li>C/C++ 專案：需包含 Makefile，執行 make 後產生執行檔</li>
          <li>Java 專案：需包含 Main.java，執行後產生 Main.class</li>
          <li>Python 專案：需包含 main.py 作為入口點</li>
        </ul>
      </div>
    </div>
  );
}
