import { apiRequest, getApiBaseUrl } from "../api";

type JsonRecord = Record<string, unknown>;

// Pipeline Types
export type SubmissionType = "SINGLE_FILE" | "MULTI_FILE" | "FUNCTION_ONLY";
export type PipelineStageType = "COMPILE" | "STATIC_ANALYSIS" | "EXECUTE" | "CHECK" | "SCORING" | "CUSTOM" | "INTERACTIVE";

export interface PipelineStageConfig {
  type: PipelineStageType;
  config: Record<string, any>;
  enabled?: boolean;
}

export interface PipelineConfig {
  stages: PipelineStageConfig[];
}

export interface PipelineConfigResponse {
  submissionType: SubmissionType | null;
  pipelineConfig: PipelineConfig | null;
  checkerKey: string | null;
  templateKey: string | null;
  makefileKey: string | null;
  artifactPaths: string[] | null;
  networkConfig: any | null;
}

export interface UpdatePipelineConfigDto {
  submissionType?: SubmissionType;
  pipelineConfig?: PipelineConfig;
  artifactPaths?: string[];
  networkConfig?: any;
}

export interface ArtifactsInfo {
  hasArtifacts: boolean;
  artifactsKey: string | null;
  createdAt: string;
}

/**
 * 取得 Pipeline 配置
 */
export async function getPipelineConfig(
  problemDisplayId: string,
  accessToken?: string | null,
): Promise<PipelineConfigResponse> {
  return apiRequest<PipelineConfigResponse>(
    `/problems/${problemDisplayId}/pipeline/config`,
    {
      method: "GET",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  );
}

/**
 * 更新 Pipeline 配置
 */
export async function updatePipelineConfig(
  problemDisplayId: string,
  data: UpdatePipelineConfigDto,
  accessToken?: string | null,
): Promise<PipelineConfigResponse> {
  return apiRequest<PipelineConfigResponse>(
    `/problems/${problemDisplayId}/pipeline/config`,
    {
      method: "PATCH",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      json: data as unknown as JsonRecord,
    },
  );
}

/**
 * 上傳 Checker 腳本
 */
export async function uploadChecker(
  problemDisplayId: string,
  file: File,
  accessToken?: string | null,
): Promise<{ message: string; checkerKey: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ message: string; checkerKey: string }>(
    `/problems/${problemDisplayId}/pipeline/checker`,
    {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: formData,
    },
  );
}

/**
 * 上傳函式模板
 */
export async function uploadTemplate(
  problemDisplayId: string,
  file: File,
  accessToken?: string | null,
): Promise<{ message: string; templateKey: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ message: string; templateKey: string }>(
    `/problems/${problemDisplayId}/pipeline/template`,
    {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: formData,
    },
  );
}

/**
 * 上傳 Makefile（用於多檔案專案提交）
 */
export async function uploadMakefile(
  problemDisplayId: string,
  file: File,
  accessToken?: string | null,
): Promise<{ message: string; makefileKey: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return apiRequest<{ message: string; makefileKey: string }>(
    `/problems/${problemDisplayId}/pipeline/makefile`,
    {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: formData,
    },
  );
}

/**
 * 刪除 Makefile
 */
export async function deleteMakefile(
  problemDisplayId: string,
  accessToken?: string | null,
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(
    `/problems/${problemDisplayId}/pipeline/makefile/delete`,
    {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  );
}

/**
 * 取得產物資訊
 */
export async function getArtifactsInfo(
  submissionId: string,
  accessToken?: string | null,
): Promise<ArtifactsInfo> {
  return apiRequest<ArtifactsInfo>(
    `/submissions/${submissionId}/artifacts/info`,
    {
      method: "GET",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  );
}

/**
 * 下載產物
 */
export function downloadArtifactsUrl(
  submissionId: string,
  accessToken?: string | null,
): string {
  const url = `${getApiBaseUrl()}/submissions/${submissionId}/artifacts/download`;
  if (accessToken) {
    return `${url}?token=${accessToken}`;
  }
  return url;
}
