import type { Announcement } from "@/types/announcement";
import { apiRequest } from "../api";

export async function listCourseAnnouncements(courseSlug: string, accessToken?: string | null) {
  return apiRequest<Announcement[]>(`/courses/${courseSlug}/announcements`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function getCourseAnnouncement(courseSlug: string, announcementId: number, accessToken?: string | null) {
  return apiRequest<Announcement>(`/courses/${courseSlug}/announcements/${announcementId}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export type CreateAnnouncementPayload = {
  title: string;
  content: string;
  isPinned?: boolean;
};

export type UpdateAnnouncementPayload = {
  title?: string;
  content?: string;
  isPinned?: boolean;
};

export async function createCourseAnnouncement(
  courseSlug: string,
  payload: CreateAnnouncementPayload,
  accessToken?: string | null,
) {
  return apiRequest<Announcement>(`/courses/${courseSlug}/announcements`, {
    method: "POST",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function updateCourseAnnouncement(
  courseSlug: string,
  announcementId: number,
  payload: UpdateAnnouncementPayload,
  accessToken?: string | null,
) {
  return apiRequest<Announcement>(`/courses/${courseSlug}/announcements/${announcementId}`, {
    method: "PATCH",
    json: payload,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}

export async function deleteCourseAnnouncement(
  courseSlug: string,
  announcementId: number,
  accessToken?: string | null,
) {
  return apiRequest<{ ok: boolean }>(`/courses/${courseSlug}/announcements/${announcementId}`, {
    method: "DELETE",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
}
