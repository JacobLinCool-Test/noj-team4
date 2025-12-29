'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/useI18n';
import type { GeneratedProblem, ProblemDifficulty } from '@/lib/api/ai-problem-creator';

type Props = {
  problem: GeneratedProblem;
  onSave: (problem: GeneratedProblem) => void;
  onCancel: () => void;
};

export function ProblemEditor({ problem, onSave, onCancel }: Props) {
  const { messages } = useI18n();
  const [title, setTitle] = useState(problem.title);
  const [description, setDescription] = useState(problem.description);
  const [inputFormat, setInputFormat] = useState(problem.inputFormat);
  const [outputFormat, setOutputFormat] = useState(problem.outputFormat);
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>(problem.difficulty);
  const [tags, setTags] = useState(problem.tags.join(', '));
  const [timeLimitMs, setTimeLimitMs] = useState(problem.constraints.timeLimitMs);
  const [memoryLimitKb, setMemoryLimitKb] = useState(problem.constraints.memoryLimitKb);
  const [sampleCases, setSampleCases] = useState(problem.sampleCases);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...problem,
      title,
      description,
      inputFormat,
      outputFormat,
      difficulty,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      constraints: { timeLimitMs, memoryLimitKb },
      sampleCases,
    });
  };

  const updateSampleCase = (index: number, field: 'input' | 'output', value: string) => {
    setSampleCases((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addSampleCase = () => {
    setSampleCases((prev) => [...prev, { input: '', output: '' }]);
  };

  const removeSampleCase = (index: number) => {
    if (sampleCases.length > 1) {
      setSampleCases((prev) => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
        {/* Title */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">{messages.aiProblemCreatorEditorTitle}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f]"
          />
        </div>

        {/* Difficulty and Tags */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{messages.aiProblemCreatorEditorDifficulty}</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as ProblemDifficulty)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f]"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {messages.aiProblemCreatorEditorTags}
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={messages.aiProblemCreatorEditorTagsPlaceholder}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f]"
            />
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">{messages.aiProblemCreatorDescription}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={6}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f]"
          />
        </div>

        {/* Input/Output Format */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{messages.aiProblemCreatorInputFormat}</label>
            <textarea
              value={inputFormat}
              onChange={(e) => setInputFormat(e.target.value)}
              required
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{messages.aiProblemCreatorOutputFormat}</label>
            <textarea
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              required
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f]"
            />
          </div>
        </div>

        {/* Constraints */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {messages.aiProblemCreatorEditorTimeLimitMs}
            </label>
            <input
              type="number"
              value={timeLimitMs}
              onChange={(e) => setTimeLimitMs(parseInt(e.target.value) || 1000)}
              min={100}
              max={10000}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f]"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {messages.aiProblemCreatorEditorMemoryLimitMb}
            </label>
            <input
              type="number"
              value={Math.round(memoryLimitKb / 1024)}
              onChange={(e) => setMemoryLimitKb((parseInt(e.target.value) || 256) * 1024)}
              min={16}
              max={1024}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none focus:ring-1 focus:ring-[#1e5d8f]"
            />
          </div>
        </div>

        {/* Sample Cases */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">{messages.aiProblemCreatorSampleTestcases}</label>
            <button
              type="button"
              onClick={addSampleCase}
              className="text-sm text-[#003865] hover:underline"
            >
              {messages.aiProblemCreatorEditorAddSample}
            </button>
          </div>
          <div className="space-y-3">
            {sampleCases.map((sample, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">{messages.aiProblemCreatorEditorSample} {index + 1}</span>
                  {sampleCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSampleCase(index)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      {messages.aiProblemCreatorEditorRemove}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">{messages.aiProblemCreatorInput}</label>
                    <textarea
                      value={sample.input}
                      onChange={(e) => updateSampleCase(index, 'input', e.target.value)}
                      rows={3}
                      className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#1e5d8f] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">{messages.aiProblemCreatorOutput}</label>
                    <textarea
                      value={sample.output}
                      onChange={(e) => updateSampleCase(index, 'output', e.target.value)}
                      rows={3}
                      className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#1e5d8f] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>

      {/* Actions */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {messages.aiProblemCreatorEditorCancel}
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-[#003865] px-6 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
          >
            {messages.aiProblemCreatorEditorSaveChanges}
          </button>
        </div>
      </div>
    </div>
  );
}
