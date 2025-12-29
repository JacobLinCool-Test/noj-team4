'use client';

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  getPipelineConfig,
  updatePipelineConfig,
  uploadChecker,
  uploadTemplate,
  type SubmissionType,
  type PipelineConfigResponse,
} from "@/lib/api/pipeline";
import { StageList, AddStageButton, type PipelineStageConfig, type PipelineStageType } from "./stage-list";
import { StageConfigModal } from "./stage-config-modal";

type PipelineConfigProps = {
  problemDisplayId: string;
};

const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  SINGLE_FILE: "單一檔案",
  MULTI_FILE: "多檔案專案 (ZIP)",
  FUNCTION_ONLY: "僅實作函式",
};

// 預設 Pipeline 配置
const DEFAULT_PIPELINE_STAGES: PipelineStageConfig[] = [
  { type: "COMPILE", config: {}, enabled: true },
  { type: "EXECUTE", config: { useTestdata: true }, enabled: true },
  { type: "CHECK", config: { mode: "diff", ignoreWhitespace: true, caseSensitive: true }, enabled: true },
];

export function PipelineConfig({ problemDisplayId }: PipelineConfigProps) {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PipelineConfigResponse | null>(null);

  const [submissionType, setSubmissionType] = useState<SubmissionType>("SINGLE_FILE");
  const [artifactPaths, setArtifactPaths] = useState<string>("");
  const [stages, setStages] = useState<PipelineStageConfig[]>(DEFAULT_PIPELINE_STAGES);
  const [checkerFile, setCheckerFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [uploadingChecker, setUploadingChecker] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 階段配置彈窗
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);

  // 載入配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const data = await getPipelineConfig(problemDisplayId, accessToken);
        setConfig(data);
        setSubmissionType(data.submissionType || "SINGLE_FILE");
        setArtifactPaths(data.artifactPaths?.join(", ") || "");

        // 載入 Pipeline 階段配置
        if (data.pipelineConfig?.stages && data.pipelineConfig.stages.length > 0) {
          setStages(data.pipelineConfig.stages as PipelineStageConfig[]);
        } else {
          setStages(DEFAULT_PIPELINE_STAGES);
        }
      } catch (error) {
        console.error("Failed to load pipeline config:", error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [problemDisplayId, accessToken]);

  // 儲存配置
  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const paths = artifactPaths
        .split(",")
        .map(p => p.trim())
        .filter(p => p.length > 0);

      await updatePipelineConfig(
        problemDisplayId,
        {
          submissionType,
          artifactPaths: paths.length > 0 ? paths : undefined,
          pipelineConfig: {
            stages: stages,
          },
        },
        accessToken,
      );

      setMessage({ type: "success", text: "配置已儲存" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "儲存失敗",
      });
    } finally {
      setSaving(false);
    }
  };

  // 新增階段
  const handleAddStage = (type: PipelineStageType) => {
    const newStage: PipelineStageConfig = {
      type,
      config: getDefaultConfig(type),
      enabled: true,
    };
    setStages([...stages, newStage]);
  };

  // 取得預設配置
  const getDefaultConfig = (type: PipelineStageType): Record<string, any> => {
    switch (type) {
      case "COMPILE":
        return { timeout: 30000 };
      case "STATIC_ANALYSIS":
        return { rules: [], failOnError: true };
      case "EXECUTE":
        return { useTestdata: true, timeLimitMs: 1000, memoryLimitKb: 262144 };
      case "CHECK":
        return { mode: "diff", ignoreWhitespace: true, caseSensitive: true };
      case "SCORING":
        return { mode: "sum", penaltyRules: [] };
      case "INTERACTIVE":
        return { interactorLanguage: "PYTHON", interactionTimeoutMs: 10000 };
      default:
        return {};
    }
  };

  // 編輯階段配置
  const handleEditStage = (index: number) => {
    setEditingStageIndex(index);
  };

  // 儲存階段配置
  const handleSaveStageConfig = (config: Record<string, any>) => {
    if (editingStageIndex === null) return;

    const newStages = [...stages];
    newStages[editingStageIndex] = {
      ...newStages[editingStageIndex],
      config,
    };
    setStages(newStages);
    setEditingStageIndex(null);
  };

  // 上傳 Checker
  const handleUploadChecker = async () => {
    if (!checkerFile) return;

    try {
      setUploadingChecker(true);
      setMessage(null);
      const result = await uploadChecker(problemDisplayId, checkerFile, accessToken);
      setMessage({ type: "success", text: result.message });
      setCheckerFile(null);

      // 重新載入配置
      const data = await getPipelineConfig(problemDisplayId, accessToken);
      setConfig(data);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "上傳失敗",
      });
    } finally {
      setUploadingChecker(false);
    }
  };

  // 上傳 Template
  const handleUploadTemplate = async () => {
    if (!templateFile) return;

    try {
      setUploadingTemplate(true);
      setMessage(null);
      const result = await uploadTemplate(problemDisplayId, templateFile, accessToken);
      setMessage({ type: "success", text: result.message });
      setTemplateFile(null);

      // 重新載入配置
      const data = await getPipelineConfig(problemDisplayId, accessToken);
      setConfig(data);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "上傳失敗",
      });
    } finally {
      setUploadingTemplate(false);
    }
  };

  // 重設為預設配置
  const handleResetToDefault = () => {
    setStages(DEFAULT_PIPELINE_STAGES);
    setMessage({ type: "success", text: "已重設為預設配置（尚未儲存）" });
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-10 w-full rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Pipeline 配置</h2>
        <button
          onClick={handleResetToDefault}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          重設為預設
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 提交類型 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          提交類型
        </label>
        <select
          value={submissionType}
          onChange={(e) => setSubmissionType(e.target.value as SubmissionType)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
        >
          {(Object.keys(SUBMISSION_TYPE_LABELS) as SubmissionType[]).map((type) => (
            <option key={type} value={type}>
              {SUBMISSION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-gray-500">
          {submissionType === "FUNCTION_ONLY" && "學生只需提交函式，系統會自動合併模板"}
          {submissionType === "MULTI_FILE" && "學生需要上傳 ZIP 壓縮檔"}
          {submissionType === "SINGLE_FILE" && "學生提交單一程式碼檔案"}
        </p>
      </div>

      <hr className="border-gray-200" />

      {/* Pipeline 階段配置 */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">評測階段</h3>
        <p className="mb-4 text-sm text-gray-500">
          拖曳調整階段順序，點擊「配置」設定詳細參數。
        </p>

        <StageList
          stages={stages}
          onChange={setStages}
          onEditStage={handleEditStage}
        />

        <div className="mt-4">
          <AddStageButton
            onAdd={handleAddStage}
            existingTypes={stages.map(s => s.type)}
          />
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* 產物收集路徑 */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          產物收集路徑 (選填)
        </label>
        <input
          type="text"
          value={artifactPaths}
          onChange={(e) => setArtifactPaths(e.target.value)}
          placeholder="例如: *.txt, *.log, output/*.png"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
        />
        <p className="mt-1 text-sm text-gray-500">
          以逗號分隔多個路徑模式，支援萬用字元 (*)。評測結束後學生可下載這些產物。
        </p>
      </div>

      <hr className="border-gray-200" />

      {/* 上傳 Checker */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          自訂 Checker 腳本 (選填)
        </label>
        {config?.checkerKey && (
          <div className="mb-2 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
            ✓ 已上傳: {config.checkerKey}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="file"
            accept=".py,.cpp,.c,.java"
            onChange={(e) => setCheckerFile(e.target.files?.[0] || null)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleUploadChecker}
            disabled={!checkerFile || uploadingChecker}
            className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:bg-gray-400"
          >
            {uploadingChecker ? "上傳中..." : "上傳"}
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          支援 Python (.py), C++ (.cpp), C (.c), Java (.java)。Checker 會收到 input.txt, output.txt, answer.txt 三個參數。
        </p>
      </div>

      {/* 上傳 Template (僅在 FUNCTION_ONLY 模式顯示) */}
      {submissionType === "FUNCTION_ONLY" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            函式模板檔案 <span className="text-red-500">*</span>
          </label>
          {config?.templateKey && (
            <div className="mb-2 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
              ✓ 已上傳: {config.templateKey}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="file"
              accept=".cpp,.c,.java,.py"
              onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleUploadTemplate}
              disabled={!templateFile || uploadingTemplate}
              className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:bg-gray-400"
            >
              {uploadingTemplate ? "上傳中..." : "上傳"}
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            模板中需包含 <code className="rounded bg-gray-100 px-1">// STUDENT_CODE_HERE</code> 標記
          </p>
        </div>
      )}

      <hr className="border-gray-200" />

      {/* 儲存按鈕 */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="rounded-md bg-[#003865] px-6 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:bg-gray-400"
        >
          {saving ? "儲存中..." : "儲存所有配置"}
        </button>
      </div>

      {/* 階段配置彈窗 */}
      {editingStageIndex !== null && (
        <StageConfigModal
          stage={stages[editingStageIndex]}
          onSave={handleSaveStageConfig}
          onClose={() => setEditingStageIndex(null)}
        />
      )}
    </div>
  );
}
