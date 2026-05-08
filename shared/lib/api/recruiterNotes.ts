"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface RecruiterNoteApi {
  id: string;
  recruiter: string;
  note: string;
  visibility: "public" | "private";
  postedBy: string;
  postedByName: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /v1/recruiters/:recruiterId/notes */
export async function listRecruiterNotes(recruiterId: string): Promise<RecruiterNoteApi[]> {
  const { data } = await apiClient.get<{ results: RecruiterNoteApi[] }>(
    `/recruiters/${recruiterId}/notes`
  );
  return data.results ?? [];
}

/** POST /v1/recruiters/:recruiterId/notes */
export async function createRecruiterNote(
  recruiterId: string,
  payload: { note: string; visibility?: "public" | "private" }
): Promise<RecruiterNoteApi> {
  const { data } = await apiClient.post<RecruiterNoteApi>(
    `/recruiters/${recruiterId}/notes`,
    payload
  );
  return data;
}

/** DELETE /v1/recruiters/notes/:noteId */
export async function deleteRecruiterNote(noteId: string): Promise<void> {
  await apiClient.delete(`/recruiters/notes/${noteId}`);
}
