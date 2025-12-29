import { apiRequest } from "../api";
import type { Problem, ProblemDifficulty, ProgrammingLanguage, ProblemSampleCase } from "./problem";

export type CourseProblemSettings = {
  quota: number;
};

export type CourseProblemItem = Problem & {
  courseSettings?: CourseProblemSettings;
};

export type CourseProblemListResponse = {
  course: {
    id: number;
    name: string;
    term: string;
    status: string;
  };
  items: CourseProblemItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ListCourseProblemsParams = {
  q?: string;
  difficulty?: ProblemDifficulty;
  page?: number;
  pageSize?: number;
};

export async function listCourseProblems(
  courseSlug: string,
  params?: ListCourseProblemsParams,
  accessToken?: string | null,
): Promise<CourseProblemListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.difficulty) query.set("difficulty", params.difficulty);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  const path = queryString
    ? `/courses/${courseSlug}/problems?${queryString}`
    : `/courses/${courseSlug}/problems`;

  return apiRequest<CourseProblemListResponse>(path, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export type CourseProblemDetailResponse = {
  course: {
    id: number;
    slug: string | null;
    name: string;
    term: string;
  };
  problem: Problem;
  courseSettings: CourseProblemSettings;
};

export type CourseProblemPayload = {
  difficulty: ProblemDifficulty;
  allowedLanguages: ProgrammingLanguage[];
  canViewStdout: boolean;
  title: string;
  description: string;
  input: string;
  output: string;
  hint?: string;
  sampleCases: ProblemSampleCase[];
  quota?: number;
  // Bilingual fields
  titleZh?: string;
  titleEn?: string;
  descriptionZh?: string;
  descriptionEn?: string;
  inputZh?: string;
  inputEn?: string;
  outputZh?: string;
  outputEn?: string;
  hintZh?: string;
  hintEn?: string;
  tagsZh?: string[];
  tagsEn?: string[];
  // Auto translate option
  autoTranslate?: boolean;
};

export async function getCourseProblem(
  courseSlug: string,
  problemId: string,
  accessToken?: string | null,
): Promise<CourseProblemDetailResponse> {
  return apiRequest<CourseProblemDetailResponse>(`/courses/${courseSlug}/problems/${problemId}`, {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function createCourseProblem(
  courseSlug: string,
  payload: CourseProblemPayload,
  accessToken?: string | null,
): Promise<CourseProblemDetailResponse> {
  return apiRequest<CourseProblemDetailResponse>(`/courses/${courseSlug}/problems`, {
    method: "POST",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function updateCourseProblem(
  courseSlug: string,
  problemId: string,
  payload: Partial<CourseProblemPayload>,
  accessToken?: string | null,
): Promise<CourseProblemDetailResponse> {
  return apiRequest<CourseProblemDetailResponse>(`/courses/${courseSlug}/problems/${problemId}`, {
    method: "PATCH",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export type CloneProblemToCoursePayload = {
  sourceProblemId: string;
  quota?: number;
};

export type CloneProblemToCourseResponse = CourseProblemDetailResponse & {
  clonedFrom: {
    id: string;
    displayId: string;
    title: string;
  };
};

export async function cloneProblemToCourse(
  courseSlug: string,
  payload: CloneProblemToCoursePayload,
  accessToken?: string | null,
): Promise<CloneProblemToCourseResponse> {
  return apiRequest<CloneProblemToCourseResponse>(`/courses/${courseSlug}/problems/clone`, {
    method: "POST",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}
