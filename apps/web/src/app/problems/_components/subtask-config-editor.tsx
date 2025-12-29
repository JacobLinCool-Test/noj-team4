'use client';

import { useMemo } from 'react';
import { useI18n } from '@/i18n/useI18n';

export interface SubtaskConfig {
  caseCount: number;
  points: number;
  timeLimitMs?: number;
  memoryLimitKb?: number;
}

interface SubtaskConfigEditorProps {
  subtasks: SubtaskConfig[];
  onSubtasksChange: (subtasks: SubtaskConfig[]) => void;
  defaultTimeLimitMs: number;
  defaultMemoryLimitKb: number;
  onDefaultTimeLimitChange: (value: number) => void;
  onDefaultMemoryLimitChange: (value: number) => void;
  disabled?: boolean;
}

export function SubtaskConfigEditor({
  subtasks,
  onSubtasksChange,
  defaultTimeLimitMs,
  defaultMemoryLimitKb,
  onDefaultTimeLimitChange,
  onDefaultMemoryLimitChange,
  disabled = false,
}: SubtaskConfigEditorProps) {
  const { messages } = useI18n();

  const totalCases = useMemo(
    () => subtasks.reduce((sum, s) => sum + s.caseCount, 0),
    [subtasks],
  );

  const totalPoints = useMemo(
    () => subtasks.reduce((sum, s) => sum + s.points, 0),
    [subtasks],
  );

  const addSubtask = () => {
    onSubtasksChange([
      ...subtasks,
      { caseCount: 1, points: 0 },
    ]);
  };

  const removeSubtask = (index: number) => {
    if (subtasks.length <= 1) return;
    onSubtasksChange(subtasks.filter((_, i) => i !== index));
  };

  const updateSubtask = (index: number, field: keyof SubtaskConfig, value: number | undefined) => {
    const updated = [...subtasks];
    updated[index] = { ...updated[index], [field]: value };
    onSubtasksChange(updated);
  };

  return (
    <div className="space-y-4">
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
              onChange={(e) => onDefaultTimeLimitChange(parseInt(e.target.value) || 1000)}
              disabled={disabled}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865] disabled:bg-gray-100"
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
              onChange={(e) => onDefaultMemoryLimitChange(parseInt(e.target.value) || 262144)}
              disabled={disabled}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865] disabled:bg-gray-100"
            />
            <span className="text-sm text-gray-500">KB</span>
          </div>
        </div>
      </div>

      {/* Subtasks table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-2 text-left font-medium text-gray-700">#</th>
              <th className="px-2 py-2 text-left font-medium text-gray-700">
                {messages.subtaskCaseCount}
              </th>
              <th className="px-2 py-2 text-left font-medium text-gray-700">
                {messages.subtaskPoints}
              </th>
              <th className="px-2 py-2 text-left font-medium text-gray-700">
                {messages.subtaskTimeLimit}
              </th>
              <th className="px-2 py-2 text-left font-medium text-gray-700">
                {messages.subtaskMemoryLimit}
              </th>
              <th className="px-2 py-2 text-left font-medium text-gray-700"></th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {subtasks.map((subtask, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="px-2 py-2 text-gray-600">{index + 1}</td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={subtask.caseCount}
                    onChange={(e) =>
                      updateSubtask(index, 'caseCount', parseInt(e.target.value) || 1)
                    }
                    disabled={disabled}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none disabled:bg-gray-100"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    value={subtask.points}
                    onChange={(e) =>
                      updateSubtask(index, 'points', parseInt(e.target.value) || 0)
                    }
                    disabled={disabled}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none disabled:bg-gray-100"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={100}
                    max={60000}
                    placeholder={String(defaultTimeLimitMs)}
                    value={subtask.timeLimitMs ?? ''}
                    onChange={(e) =>
                      updateSubtask(
                        index,
                        'timeLimitMs',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={disabled}
                    className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none disabled:bg-gray-100"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={1024}
                    max={1048576}
                    placeholder={String(defaultMemoryLimitKb)}
                    value={subtask.memoryLimitKb ?? ''}
                    onChange={(e) =>
                      updateSubtask(
                        index,
                        'memoryLimitKb',
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                    disabled={disabled}
                    className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none disabled:bg-gray-100"
                  />
                </td>
                <td className="px-2 py-2">
                  {index === 0 && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {messages.subtaskSample}
                    </span>
                  )}
                </td>
                <td className="px-2 py-2">
                  {subtasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubtask(index)}
                      disabled={disabled}
                      className="text-red-500 hover:text-red-700 disabled:opacity-50"
                      title={messages.subtaskRemove}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add button and summary */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addSubtask}
          disabled={disabled || subtasks.length >= 100}
          className="inline-flex items-center gap-1 rounded-md border border-[#003865] px-3 py-1.5 text-sm text-[#003865] hover:bg-[#003865]/5 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {messages.subtaskAdd}
        </button>
        <div className="text-sm text-gray-600">
          <span className="mr-4">
            {messages.subtaskTotalCases.replace('{count}', String(totalCases))}
          </span>
          <span className={totalPoints !== 100 ? 'text-orange-600 font-medium' : ''}>
            {messages.subtaskTotalPoints.replace('{points}', String(totalPoints))}
          </span>
        </div>
      </div>
    </div>
  );
}
