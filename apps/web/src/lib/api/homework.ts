import { apiRequest } from "../api";
import type {
  CreateHomeworkPayload,
  HomeworkDetail,
  HomeworkListItem,
  UpdateHomeworkPayload,
} from "@/types/homework";

export async function listCourseHomeworks(courseSlug: string, accessToken?: string | null) {
  return apiRequest<HomeworkListItem[]>(`/courses/${courseSlug}/homeworks`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function getCourseHomework(
  courseSlug: string,
  homeworkId: string,
  accessToken?: string | null,
) {
  return apiRequest<HomeworkDetail>(`/courses/${courseSlug}/homeworks/${homeworkId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function createCourseHomework(
  courseSlug: string,
  payload: CreateHomeworkPayload,
  accessToken?: string | null,
) {
  return apiRequest<HomeworkDetail>(`/courses/${courseSlug}/homeworks`, {
    method: "POST",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function updateCourseHomework(
  courseSlug: string,
  homeworkId: string,
  payload: UpdateHomeworkPayload,
  accessToken?: string | null,
) {
  return apiRequest<HomeworkDetail>(`/courses/${courseSlug}/homeworks/${homeworkId}`, {
    method: "PATCH",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function deleteCourseHomework(
  courseSlug: string,
  homeworkId: string,
  accessToken?: string | null,
) {
  return apiRequest<{ ok: boolean }>(`/courses/${courseSlug}/homeworks/${homeworkId}`, {
    method: "DELETE",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}
