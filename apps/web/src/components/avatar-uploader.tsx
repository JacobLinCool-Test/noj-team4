"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getAvatarUrl } from "@/lib/api/user";

interface AvatarUploaderProps {
  currentAvatarUrl: string | null;
  username: string;
  onFileSelect: (file: File | null) => void;
  onRemove: () => void;
  selectedFile: File | null;
  disabled?: boolean;
  maxSizeMb?: number;
  messages: {
    uploadLabel: string;
    changeLabel: string;
    removeLabel: string;
    cancelLabel: string;
    dragHint: string;
    sizeHint: string;
    invalidType: string;
    tooLarge: string;
    selectedFile: string;
  };
}

export function AvatarUploader({
  currentAvatarUrl,
  username,
  onFileSelect,
  onRemove,
  selectedFile,
  disabled = false,
  maxSizeMb = 2,
  messages,
}: AvatarUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  // Generate preview URL
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  // Determine display URL
  const displayUrl = previewUrl || getAvatarUrl(currentAvatarUrl);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.includes(file.type)) {
        return messages.invalidType;
      }
      if (file.size > maxSizeBytes) {
        return messages.tooLarge;
      }
      return null;
    },
    [maxSizeBytes, messages.invalidType, messages.tooLarge]
  );

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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

  const handleRemoveClick = useCallback(() => {
    setError(null);
    onFileSelect(null);
    onRemove();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onFileSelect, onRemove]);

  const handleClearSelection = useCallback(() => {
    setError(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onFileSelect]);

  return (
    <div className="space-y-3">
      {/* Avatar preview area */}
      <div className="flex items-center gap-4">
        {/* Avatar circle */}
        <div
          className={`relative flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors ${
            dragActive
              ? "border-[#003865] bg-blue-50"
              : "border-gray-300 bg-gray-100"
          } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-gray-400"}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt={username}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#003865]">
              <span className="text-4xl font-semibold text-white">
                {username[0]?.toUpperCase() || "?"}
              </span>
            </div>
          )}

          {/* Hover overlay */}
          {!disabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {displayUrl ? messages.changeLabel : messages.uploadLabel}
          </button>

          {/* If a new file is selected, show cancel button */}
          {selectedFile && (
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={disabled}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {messages.cancelLabel}
            </button>
          )}

          {/* If there's an existing avatar and no new file selected, show remove button */}
          {currentAvatarUrl && !selectedFile && (
            <button
              type="button"
              onClick={handleRemoveClick}
              disabled={disabled}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              {messages.removeLabel}
            </button>
          )}
        </div>
      </div>

      {/* Hint text */}
      <p className="text-xs text-gray-500">
        {messages.dragHint} {messages.sizeHint}
      </p>

      {/* Error message */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Selected file info */}
      {selectedFile && (
        <div className="rounded-md border border-green-200 bg-green-50 p-2">
          <p className="text-sm text-green-700">
            {messages.selectedFile}: {selectedFile.name} (
            {(selectedFile.size / 1024).toFixed(1)} KB)
          </p>
        </div>
      )}
    </div>
  );
}
