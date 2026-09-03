"use client";

import { apiClient } from "@/shared/lib/api/client";
import type { ProgressRef } from "@/shared/lib/api/student-courses";

/** Mark a playlist item as incomplete (unwatch / unread / uncomplete). */
export async function markCourseItemIncomplete(
  studentId: string,
  moduleId: string,
  playlistItemId: string
): Promise<{ progress: ProgressRef; status: string; [key: string]: unknown }> {
  const { data } = await apiClient.post(
    `/training/students/${studentId}/courses/${moduleId}/incomplete-item`,
    { playlistItemId }
  );
  return data as { progress: ProgressRef; status: string; [key: string]: unknown };
}

export interface CourseLearnerNote {
  id: string | null;
  playlistItemId: string;
  body: string;
  updatedAt: string | null;
}

/** Load the learner's private note for a lesson. */
export async function getCourseLearnerNote(
  studentId: string,
  moduleId: string,
  playlistItemId: string
): Promise<CourseLearnerNote> {
  const { data } = await apiClient.get<CourseLearnerNote>(
    `/training/students/${studentId}/courses/${moduleId}/notes/${encodeURIComponent(playlistItemId)}`
  );
  return data;
}

/** Save the learner's private note for a lesson. */
export async function saveCourseLearnerNote(
  studentId: string,
  moduleId: string,
  playlistItemId: string,
  body: string
): Promise<CourseLearnerNote> {
  const { data } = await apiClient.put<CourseLearnerNote>(
    `/training/students/${studentId}/courses/${moduleId}/notes/${encodeURIComponent(playlistItemId)}`,
    { body }
  );
  return data;
}
