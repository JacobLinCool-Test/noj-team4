'use client';

import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/useI18n';
import { useAuth } from '@/providers/AuthProvider';
import {
  listTestdataVersions,
  uploadTestdata,
  activateTestdataVersion,
  type TestdataVersion,
} from '@/lib/api/problem';

interface TestdataManagerProps {
  problemDisplayId: string;
}

export function TestdataManager({ problemDisplayId }: TestdataManagerProps) {
  const { messages } = useI18n();
  const { accessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [versions, setVersions] = useState<TestdataVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activating, setActivating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const data = await listTestdataVersions(problemDisplayId, accessToken);
      setVersions(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load testdata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [problemDisplayId, accessToken]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setSuccessMessage(null);

      const result = await uploadTestdata(problemDisplayId, file, accessToken);
      setSuccessMessage(
        result.isActive
          ? `v${result.version} (${result.caseCount} cases)`
          : `v${result.version} (${result.caseCount} cases)`
      );

      await fetchVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleActivate = async (version: number) => {
    try {
      setActivating(version);
      setError(null);
      setSuccessMessage(null);

      await activateTestdataVersion(problemDisplayId, version, accessToken);
      setSuccessMessage(`v${version}`);

      await fetchVersions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation failed');
    } finally {
      setActivating(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const activeVersion = versions.find((v) => v.isActive);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        {messages.testdataTitle || 'Testdata'}
      </h2>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Active Version Info */}
      <div className="mb-4 rounded-md bg-gray-50 p-4">
        <p className="text-sm text-gray-600">
          {messages.testdataActiveVersion || 'Active Version'}:
        </p>
        {activeVersion ? (
          <p className="mt-1 font-medium text-gray-900">
            v{activeVersion.version} ({activeVersion.caseCount}{' '}
            {messages.testdataCases || 'cases'})
          </p>
        ) : (
          <p className="mt-1 text-sm text-yellow-600">
            {messages.testdataNoActive || 'No active testdata'}
          </p>
        )}
      </div>

      {/* Upload Button */}
      <div className="mb-4">
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <span
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
              uploading
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'bg-[#003865] text-white hover:bg-[#1e5d8f]'
            }`}
          >
            {uploading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {messages.testdataUploading || 'Uploading...'}
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                {messages.testdataUpload || 'Upload Testdata (ZIP)'}
              </>
            )}
          </span>
        </label>
      </div>

      {/* Version List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton-shimmer h-16 rounded-md bg-gray-100" />
          ))}
        </div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-gray-500">
          {messages.testdataEmpty || 'No testdata uploaded yet'}
        </p>
      ) : (
        <div className="space-y-2">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`flex items-center justify-between rounded-md border p-3 ${
                version.isActive
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    v{version.version}
                  </span>
                  {version.isActive && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      {messages.testdataActive || 'Active'}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {version.caseCount} {messages.testdataCases || 'cases'} &middot;{' '}
                  {formatDate(version.uploadedAt)} &middot;{' '}
                  {version.uploadedBy.nickname || version.uploadedBy.username}
                </p>
              </div>

              {!version.isActive && (
                <button
                  type="button"
                  onClick={() => handleActivate(version.version)}
                  disabled={activating !== null}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    activating === version.version
                      ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {activating === version.version
                    ? messages.testdataActivating || 'Activating...'
                    : messages.testdataSetActive || 'Set Active'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 rounded-md bg-blue-50 p-3">
        <p className="text-xs text-blue-700">
          {messages.testdataHelp ||
            'Upload a ZIP file containing manifest.json and test case files. The first upload will be automatically activated.'}
        </p>
      </div>
    </div>
  );
}
