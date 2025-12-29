import { apiRequest } from "../api";
import type {
  CreateExamPayload,
  ExamCode,
  ExamDetail,
  ExamListItem,
  GenerateCodesPayload,
  ScoreboardResponse,
  UpdateExamPayload,
} from "@/types/exam";

export async function listCourseExams(courseSlug: string, accessToken?: string | null) {
  const response = await apiRequest<{ exams: ExamListItem[] }>(`/courses/${courseSlug}/exams`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return response.exams;
}

export async function getCourseExam(
  courseSlug: string,
  examId: string,
  accessToken?: string | null,
) {
  return apiRequest<ExamDetail>(`/courses/${courseSlug}/exams/${examId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function createCourseExam(
  courseSlug: string,
  payload: CreateExamPayload,
  accessToken?: string | null,
) {
  return apiRequest<ExamDetail>(`/courses/${courseSlug}/exams`, {
    method: "POST",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function updateCourseExam(
  courseSlug: string,
  examId: string,
  payload: UpdateExamPayload,
  accessToken?: string | null,
) {
  return apiRequest<ExamDetail>(`/courses/${courseSlug}/exams/${examId}`, {
    method: "PATCH",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function deleteCourseExam(
  courseSlug: string,
  examId: string,
  accessToken?: string | null,
) {
  return apiRequest<{ ok: boolean }>(`/courses/${courseSlug}/exams/${examId}`, {
    method: "DELETE",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

// Exam Codes
export async function getExamCodes(
  courseSlug: string,
  examId: string,
  accessToken?: string | null,
) {
  const response = await apiRequest<{ codes: ExamCode[] }>(`/courses/${courseSlug}/exams/${examId}/codes`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return response.codes;
}

export async function generateExamCodes(
  courseSlug: string,
  examId: string,
  payload: GenerateCodesPayload,
  accessToken?: string | null,
) {
  const response = await apiRequest<{ codes: ExamCode[] }>(`/courses/${courseSlug}/exams/${examId}/codes`, {
    method: "POST",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  return response.codes;
}

export async function deleteExamCode(
  courseSlug: string,
  examId: string,
  code: string,
  accessToken?: string | null,
) {
  return apiRequest<{ ok: boolean }>(`/courses/${courseSlug}/exams/${examId}/codes/${code}`, {
    method: "DELETE",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function regenerateExamCode(
  courseSlug: string,
  examId: string,
  code: string,
  accessToken?: string | null,
) {
  return apiRequest<ExamCode>(`/courses/${courseSlug}/exams/${examId}/codes/${code}/regenerate`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export function getExamCodesExportUrl(courseSlug: string, examId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return `${baseUrl}/courses/${courseSlug}/exams/${examId}/codes/export`;
}

// Scoreboard
export async function getExamScoreboard(
  courseSlug: string,
  examId: string,
  accessToken?: string | null,
) {
  return apiRequest<ScoreboardResponse>(`/courses/${courseSlug}/exams/${examId}/scoreboard`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}
