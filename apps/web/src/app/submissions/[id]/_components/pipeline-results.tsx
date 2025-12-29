'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import type { PipelineStageResult, SubmissionStatus } from "@/lib/api/submission";
import { getArtifactsInfo, downloadArtifactsUrl } from "@/lib/api/pipeline";

type PipelineResultsProps = {
  submissionId: string;
  stageResults?: PipelineStageResult[];
  artifactsKey?: string | null;
};

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  AC: "bg-green-100 text-green-800",
  PA: "bg-amber-100 text-amber-800",
  WA: "bg-red-100 text-red-800",
  CE: "bg-yellow-100 text-yellow-800",
  TLE: "bg-orange-100 text-orange-800",
  MLE: "bg-purple-100 text-purple-800",
  RE: "bg-red-100 text-red-800",
  OLE: "bg-orange-100 text-orange-800",
  SA: "bg-violet-100 text-violet-800",
  PENDING: "bg-gray-100 text-gray-800",
  RUNNING: "bg-blue-100 text-blue-800",
  JUDGE_ERROR: "bg-red-100 text-red-800",
};

const STAGE_LABELS: Record<string, string> = {
  COMPILE: "編譯",
  STATIC_ANALYSIS: "靜態分析",
  EXECUTE: "執行",
  CHECK: "檢查",
  SCORING: "計分",
  CUSTOM: "自訂",
};

export function PipelineResults({ submissionId, stageResults, artifactsKey }: PipelineResultsProps) {
  const { accessToken } = useAuth();
  const [artifactsInfo, setArtifactsInfo] = useState<{ hasArtifacts: boolean } | null>(null);

  useEffect(() => {
    if (!artifactsKey) return;

    const fetchArtifactsInfo = async () => {
      try {
        const info = await getArtifactsInfo(submissionId, accessToken);
        setArtifactsInfo(info);
      } catch (error) {
        console.error("Failed to fetch artifacts info:", error);
      }
    };

    fetchArtifactsInfo();
  }, [submissionId, artifactsKey, accessToken]);

  // 如果沒有 Pipeline 結果，不顯示此組件
  if (!stageResults || stageResults.length === 0) {
    return null;
  }

  const handleDownloadArtifacts = () => {
    const url = downloadArtifactsUrl(submissionId, accessToken || undefined);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Pipeline 執行流程</h2>
        {artifactsInfo?.hasArtifacts && (
          <button
            onClick={handleDownloadArtifacts}
            className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
          >
            📦 下載產物 (ZIP)
          </button>
        )}
      </div>

      <div className="space-y-3">
        {stageResults.map((stage, index) => (
          <div
            key={stage.id}
            className="relative rounded-lg border border-gray-200 p-4"
          >
            {/* 連接線 */}
            {index < stageResults.length - 1 && (
              <div className="absolute left-6 top-full h-3 w-0.5 bg-gray-300" />
            )}

            <div className="flex items-start gap-4">
              {/* 階段序號 */}
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-700">
                {index + 1}
              </div>

              {/* 階段內容 */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {STAGE_LABELS[stage.stageType] || stage.stageType}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      STATUS_COLORS[stage.status]
                    }`}
                  >
                    {stage.status}
                  </span>
                </div>

                {/* 時間和記憶體 */}
                {(stage.timeMs !== null || stage.memoryKb !== null) && (
                  <div className="mt-1 flex gap-4 text-sm text-gray-600">
                    {stage.timeMs !== null && <span>⏱️ {stage.timeMs} ms</span>}
                    {stage.memoryKb !== null && <span>💾 {(stage.memoryKb / 1024).toFixed(2)} MB</span>}
                  </div>
                )}

                {/* 詳細訊息 */}
                {stage.details && Object.keys(stage.details).length > 0 && (
                  <div className="mt-3 rounded-md bg-gray-50 p-3">
                    {/* 靜態分析違規 */}
                    {stage.stageType === "STATIC_ANALYSIS" && stage.details.violations && (
                      <div>
                        <h4 className="mb-2 font-medium text-gray-700">
                          發現 {stage.details.violations.length} 個問題:
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {stage.details.violations.map((v: any, i: number) => (
                            <li key={i} className="text-red-700">
                              • {v.message}
                              {v.location && ` (行 ${v.location.line})`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 編譯日誌 */}
                    {stage.stageType === "COMPILE" && stage.details.compileLog && (
                      <pre className="whitespace-pre-wrap text-xs text-gray-700">
                        {stage.details.compileLog}
                      </pre>
                    )}

                    {/* 測試案例結果 */}
                    {stage.stageType === "EXECUTE" && stage.details.passedCount !== undefined && (
                      <div className="text-sm text-gray-700">
                        通過測試: {stage.details.passedCount} / {stage.details.totalCount}
                      </div>
                    )}

                    {/* 其他訊息 */}
                    {stage.details.message && (
                      <p className="text-sm text-gray-700">{stage.details.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
