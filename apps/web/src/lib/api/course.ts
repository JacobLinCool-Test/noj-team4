import type { CourseDetail, CourseEnrollmentType, CourseSummary } from "@/types/course";
import { apiRequest } from "../api";

export type CreateCoursePayload = {
  name: string;
  slug: string;
  term?: string;
  description?: string;
  enrollmentType: CourseEnrollmentType;
  isPublicListed?: boolean;
};

export type UpdateCoursePayload = {
  name?: string;
  slug?: string;
  term?: string;
  description?: string;
  enrollmentType?: CourseEnrollmentType;
  isPublicListed?: boolean;
};

export async function createCourse(payload: CreateCoursePayload, accessToken?: string | null) {
  return apiRequest<CourseSummary>("/courses", {
    method: "POST",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function joinCoursePublic(courseSlug: string, accessToken?: string | null) {
  return apiRequest<CourseDetail>(`/courses/${courseSlug}/join-public`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function leaveCourse(courseSlug: string, accessToken?: string | null) {
  return apiRequest<CourseDetail>(`/courses/${courseSlug}/leave`, {
    method: "POST",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function updateCourse(
  courseSlug: string,
  payload: UpdateCoursePayload,
  accessToken?: string | null,
) {
  return apiRequest<CourseDetail>(`/courses/${courseSlug}`, {
    method: "PATCH",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function deleteCourse(
  courseSlug: string,
  confirmName: string,
  accessToken?: string | null,
) {
  return apiRequest<{ ok: boolean }>(`/courses/${courseSlug}`, {
    method: "DELETE",
    json: { confirmName },
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}
