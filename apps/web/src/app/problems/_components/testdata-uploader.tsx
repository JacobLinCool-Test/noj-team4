'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/i18n/useI18n';
import type { SubtaskConfig } from './subtask-config-editor';
import {
  listTestdataVersions,
  uploadTestdataWithSubtasks,
  activateTestdataVersion,
  downloadTestdata,
  type TestdataVersion,
} from '@/lib/api/problem';

interface TestdataUploaderProps {
  problemDisplayId: string;
}

interface DetectedSubtask {
  index: number;
  caseCount: number;
  points: number;
  timeLimitMs?: number;
  memoryLimitKb?: number;
}

/**
 * Parse ZIP file to detect subtask structure from sstt.in/out naming
 */
async function parseZipForSubtasks(file: File): Promise<DetectedSubtask[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  const filenames = Object.keys(zip.files).filter(name => !zip.files[name].dir);
  const inFiles = filenames.filter(name => name.endsWith('.in'));

  // Parse sstt.in format
  const subtaskCases: Map<number, Set<number>> = new Map();

  for (const filename of inFiles) {
    // Extract just the filename without path
    const basename = filename.split('/').pop() || filename;
    // Match sstt.in pattern (4 digits + .in)
    const match = basename.match(/^(\d{2})(\d{2})\.in$/);
    if (match) {
      const subtaskIndex = parseInt(match[1], 10);
      const caseIndex = parseInt(match[2], 10);

      if (!subtaskCases.has(subtaskIndex)) {
        subtaskCases.set(subtaskIndex, new Set());
      }
      subtaskCases.get(subtaskIndex)!.add(caseIndex);
    }
  }

  if (subtaskCases.size === 0) {
    return [];
  }

  // Sort by subtask index and create config
  const sortedIndices = Array.from(subtaskCases.keys()).sort((a, b) => a - b);
  const subtasks: DetectedSubtask[] = [];

  // Calculate points: subtask 0 = 0 (sample), rest evenly distributed
  const nonSampleCount = sortedIndices.filter(i => i > 0).length;
  const pointsPerSubtask = nonSampleCount > 0 ? Math.floor(100 / nonSampleCount) : 0;
  let remainingPoints = nonSampleCount > 0 ? 100 - pointsPerSubtask * nonSampleCount : 0;

  for (const subtaskIndex of sortedIndices) {
    const cases = subtaskCases.get(subtaskIndex)!;
    let points = 0;

    if (subtaskIndex > 0) {
      points = pointsPerSubtask;
      if (remainingPoints > 0) {
        points += 1;
        remainingPoints -= 1;
      }
    }

    subtasks.push({
      index: subtaskIndex,
      caseCount: cases.size,
      points,
    });
  }

  return subtasks;
}

export function TestdataUploader({ problemDisplayId }: TestdataUploaderProps) {
  const { accessToken } = useAuth();
  const { messages } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File and detected subtasks
  const [file, setFile] = useState<File | null>(null);
  const [detectedSubtasks, setDetectedSubtasks] = useState<DetectedSubtask[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Advanced settings (collapsed by default)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [defaultTimeLimitMs, setDefaultTimeLimitMs] = useState(1000);
  const [defaultMemoryLimitKb, setDefaultMemoryLimitKb] = useState(262144);

  // Help modal
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Versions
  const [versions, setVersions] = useState<TestdataVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [activating, setActivating] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  // Load versions
  useEffect(() => {
    const loadVersions = async () => {
      try {
        setLoadingVersions(true);
        const data = await listTestdataVersions(problemDisplayId, accessToken);
        setVersions(data);
      } catch (error) {
        console.error('Failed to load testdata versions:', error);
      } finally {
        setLoadingVersions(false);
      }
    };
    loadVersions();
  }, [problemDisplayId, accessToken]);

  // Parse ZIP when file changes
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.zip')) {
      setParseError(messages.testdataMustBeZip);
      setFile(null);
      setDetectedSubtasks([]);
      return;
    }

    setFile(selectedFile);
    setParseError(null);
    setUploadError(null);
    setUploadSuccess(null);
    setParsing(true);

    try {
      const subtasks = await parseZipForSubtasks(selectedFile);
      if (subtasks.length === 0) {
        setParseError(messages.testdataNoSubtasksDetected);
        setDetectedSubtasks([]);
      } else {
        setDetectedSubtasks(subtasks);
      }
    } catch (error) {
      setParseError(messages.testdataParseError);
      setDetectedSubtasks([]);
    } finally {
      setParsing(false);
    }
  }, [messages]);

  // Update subtask points
  const updateSubtaskPoints = useCallback((index: number, points: number) => {
    setDetectedSubtasks(prev =>
      prev.map((s, i) => i === index ? { ...s, points } : s)
    );
  }, []);

  // Update subtask time limit
  const updateSubtaskTimeLimit = useCallback((index: number, timeLimitMs: number | undefined) => {
    setDetectedSubtasks(prev =>
      prev.map((s, i) => i === index ? { ...s, timeLimitMs } : s)
    );
  }, []);

  // Update subtask memory limit
  const updateSubtaskMemoryLimit = useCallback((index: number, memoryLimitKb: number | undefined) => {
    setDetectedSubtasks(prev =>
      prev.map((s, i) => i === index ? { ...s, memoryLimitKb } : s)
    );
  }, []);

  // Calculate totals
  const totalCases = useMemo(
    () => detectedSubtasks.reduce((sum, s) => sum + s.caseCount, 0),
    [detectedSubtasks],
  );

  const totalPoints = useMemo(
    () => detectedSubtasks.reduce((sum, s) => sum + s.points, 0),
    [detectedSubtasks],
  );

  // Handle upload
  const handleUpload = async () => {
    if (!file || detectedSubtasks.length === 0) return;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const subtasks: SubtaskConfig[] = detectedSubtasks.map(s => ({
        caseCount: s.caseCount,
        points: s.points,
        timeLimitMs: s.timeLimitMs,
        memoryLimitKb: s.memoryLimitKb,
      }));

      const config = {
        subtasks,
        defaultTimeLimitMs,
        defaultMemoryLimitKb,
      };

      const result = await uploadTestdataWithSubtasks(
        problemDisplayId,
        file,
        config,
        accessToken,
      );

      setUploadSuccess(
        messages.testdataUploadSuccess
          .replace('{version}', String(result.version))
          .replace('{caseCount}', String(result.caseCount)),
      );
      setFile(null);
      setDetectedSubtasks([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reload versions
      const data = await listTestdataVersions(problemDisplayId, accessToken);
      setVersions(data);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Handle activate
  const handleActivate = async (version: number) => {
    try {
      setActivating(version);
      await activateTestdataVersion(problemDisplayId, version, accessToken);
      const data = await listTestdataVersions(problemDisplayId, accessToken);
      setVersions(data);
    } catch (error) {
      console.error('Failed to activate version:', error);
    } finally {
      setActivating(null);
    }
  };

  // Handle download
  const handleDownload = async (version: number) => {
    try {
      setDownloading(version);
      await downloadTestdata(problemDisplayId, version, accessToken);
    } catch (error) {
      console.error('Failed to download:', error);
    } finally {
      setDownloading(null);
    }
  };

  // Clear file
  const clearFile = () => {
    setFile(null);
    setDetectedSubtasks([]);
    setParseError(null);
    setUploadError(null);
    setUploadSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {messages.testdataTitle}
        </h2>
        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {messages.testdataHelpButton}
        </button>
      </div>

      {/* Simple Upload Area */}
      <div className="mb-6">
        {!file ? (
          <div
            className="relative rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-[#003865] transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile && fileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(droppedFile);
                fileInputRef.current.files = dt.files;
                fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">{messages.testdataDropOrClick}</p>
            <p className="mt-1 text-xs text-gray-500">{messages.testdataZipFormat}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="h-8 w-8 text-[#003865]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Parsing indicator */}
            {parsing && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {messages.testdataParsing}
              </div>
            )}

            {/* Parse error */}
            {parseError && (
              <p className="mt-3 text-sm text-red-600">{parseError}</p>
            )}

            {/* Detection result */}
            {detectedSubtasks.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {messages.testdataDetected
                    .replace('{subtasks}', String(detectedSubtasks.length))
                    .replace('{cases}', String(totalCases))}
                </div>

                {/* Subtask summary */}
                <div className="space-y-2">
                  {detectedSubtasks.map((subtask, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <span className="w-24 text-gray-600">
                        {subtask.index === 0 ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {messages.subtaskSample}
                          </span>
                        ) : (
                          `Subtask ${subtask.index}`
                        )}
                      </span>
                      <span className="text-gray-500">
                        {subtask.caseCount} {messages.testdataCases}
                      </span>
                      <span className="text-gray-400">→</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={subtask.points}
                        onChange={(e) => updateSubtaskPoints(idx, parseInt(e.target.value) || 0)}
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none"
                      />
                      <span className="text-gray-500">{messages.testdataPointsUnit}</span>
                    </div>
                  ))}
                </div>

                {/* Total points warning */}
                <div className={`mt-3 text-sm ${totalPoints !== 100 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                  {messages.subtaskTotalPoints.replace('{points}', String(totalPoints))}
                  {totalPoints !== 100 && ` (${messages.testdataShouldBe100})`}
                </div>

                {/* Advanced settings toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="mt-4 flex items-center gap-2 text-sm text-[#003865] hover:underline"
                >
                  <svg
                    className={`h-4 w-4 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {messages.testdataAdvancedSettings}
                </button>

                {/* Advanced settings panel */}
                {showAdvanced && (
                  <div className="mt-3 rounded-md bg-white border border-gray-200 p-4 space-y-4">
                    {/* Default limits */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {messages.subtaskDefaultTimeLimit}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={100}
                            max={60000}
                            value={defaultTimeLimitMs}
                            onChange={(e) => setDefaultTimeLimitMs(parseInt(e.target.value) || 1000)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none"
                          />
                          <span className="text-sm text-gray-500">ms</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {messages.subtaskDefaultMemoryLimit}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1024}
                            max={1048576}
                            value={defaultMemoryLimitKb}
                            onChange={(e) => setDefaultMemoryLimitKb(parseInt(e.target.value) || 262144)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none"
                          />
                          <span className="text-sm text-gray-500">KB</span>
                        </div>
                      </div>
                    </div>

                    {/* Per-subtask overrides */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">{messages.testdataPerSubtaskOverrides}</p>
                      <div className="space-y-2">
                        {detectedSubtasks.map((subtask, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-sm">
                            <span className="w-20 text-gray-600">
                              {subtask.index === 0 ? messages.subtaskSample : `Subtask ${subtask.index}`}
                            </span>
                            <input
                              type="number"
                              min={100}
                              max={60000}
                              placeholder={String(defaultTimeLimitMs)}
                              value={subtask.timeLimitMs ?? ''}
                              onChange={(e) => updateSubtaskTimeLimit(idx, e.target.value ? parseInt(e.target.value) : undefined)}
                              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none"
                            />
                            <span className="text-gray-500">ms</span>
                            <input
                              type="number"
                              min={1024}
                              max={1048576}
                              placeholder={String(defaultMemoryLimitKb)}
                              value={subtask.memoryLimitKb ?? ''}
                              onChange={(e) => updateSubtaskMemoryLimit(idx, e.target.value ? parseInt(e.target.value) : undefined)}
                              className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none"
                            />
                            <span className="text-gray-500">KB</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload button */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading || totalPoints !== 100}
                    className="inline-flex items-center gap-2 rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {messages.uploading}
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {messages.upload}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {uploadError && (
          <p className="mt-2 text-sm text-red-600">{uploadError}</p>
        )}
        {uploadSuccess && (
          <p className="mt-2 text-sm text-green-600">{uploadSuccess}</p>
        )}
      </div>

      {/* Version List */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-700">
          {messages.testdataVersions}
        </h3>
        {loadingVersions ? (
          <div className="text-sm text-gray-500">{messages.loading}</div>
        ) : versions.length === 0 ? (
          <div className="text-sm text-gray-500">{messages.testdataNoVersions}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-2 py-2 text-left font-medium text-gray-700">
                    {messages.testdataVersion}
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-700">
                    {messages.testdataUploadedAt}
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-700">
                    {messages.testdataCaseCount}
                  </th>
                  <th className="px-2 py-2 text-left font-medium text-gray-700">
                    {messages.testdataUploadedBy}
                  </th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.id} className="border-b border-gray-100">
                    <td className="px-2 py-2">
                      <span className="font-medium">v{version.version}</span>
                      {version.isActive && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {messages.testdataActive}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-gray-600">
                      {new Date(version.uploadedAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-gray-600">
                      {version.caseCount}
                    </td>
                    <td className="px-2 py-2 text-gray-600">
                      {version.uploadedBy?.nickname || version.uploadedBy?.username || '-'}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {!version.isActive && (
                          <button
                            type="button"
                            onClick={() => handleActivate(version.version)}
                            disabled={activating !== null}
                            className="text-xs text-[#003865] hover:underline disabled:opacity-50"
                          >
                            {activating === version.version
                              ? messages.activating
                              : messages.testdataActivate}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownload(version.version)}
                          disabled={downloading !== null}
                          className="text-xs text-gray-600 hover:underline disabled:opacity-50"
                        >
                          {downloading === version.version
                            ? messages.downloading
                            : messages.testdataDownload}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowHelpModal(false)}
          />
          {/* Modal */}
          <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl mx-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {messages.testdataHelpTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <p>{messages.testdataHelpIntro}</p>

              <div>
                <h4 className="font-medium text-gray-900">{messages.testdataHelpFormat}</h4>
                <p className="mt-1 text-gray-600">{messages.testdataHelpFormatDesc}</p>
                <div className="mt-2 rounded bg-gray-100 p-2 font-mono text-xs">
                  <span className="text-blue-600">ss</span>
                  <span className="text-green-600">tt</span>
                  <span>.in / </span>
                  <span className="text-blue-600">ss</span>
                  <span className="text-green-600">tt</span>
                  <span>.out</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">{messages.testdataHelpExample}</h4>
                <p className="mt-1 text-gray-600">{messages.testdataHelpExampleDesc}</p>
                <div className="mt-2 space-y-1 rounded bg-gray-100 p-3 font-mono text-xs">
                  <div>
                    <span className="text-blue-600">Subtask 0</span>
                    <span className="text-gray-500"> (範例): </span>
                    <span className="text-gray-700">0000.in, 0000.out, 0001.in, 0001.out</span>
                  </div>
                  <div>
                    <span className="text-green-600">Subtask 1</span>
                    <span className="text-gray-500">: </span>
                    <span className="text-gray-700">0100.in, 0100.out, 0101.in, 0101.out, 0102.in, 0102.out</span>
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-amber-50 p-3 text-amber-800">
                <div className="flex gap-2">
                  <svg className="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p>{messages.testdataHelpNote}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
              >
                {messages.testdataHelpClose}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
