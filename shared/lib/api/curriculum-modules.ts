"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface ModuleMentor {
  id: string;
  name: string;
  avatar?: string;
  profileImageUrl?: string | null;
}

export interface ModuleSummary {
  videos?: number;
  pdfs?: number;
  blogs?: number;
  quiz?: number;
  tests?: number;
}

export interface CurriculumModule {
  id: string;
  categoryId: string;
  category?: { id: string; name: string };
  name: string;
  coverImageUrl?: string | null;
  shortDescription?: string | null;
  summary?: ModuleSummary;
  studentsEnrolled?: number;
  mentors?: ModuleMentor[];
  playlist?: unknown[];
  studentIds?: string[];
  mentorIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payload for updating a training module via PATCH.
 * Matches the backend "Update module" spec – any subset of these
 * fields may be sent in a single request.
 */
export interface UpdateModulePayload {
  categoryId?: string;
  name?: string;
  shortDescription?: string | null;
  studentIds?: string[];
  mentorIds?: string[];
  status?: string;
  coverImageKey?: string;
  coverImageUrl?: string;
  // Playlist shape is quite rich (videos, pdfs, quizzes, etc). Keep it generic
  // here and rely on the create/update docs for structure.
  playlist?: unknown[];
}

export interface ModulesListResponse {
  results: CurriculumModule[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ListModulesParams {
  categoryId?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export async function listModules(
  params?: ListModulesParams
): Promise<ModulesListResponse> {
  const { data } = await apiClient.get<ModulesListResponse>(
    "/training/curriculum/modules",
    { params }
  );
  return data;
}

export async function getModule(moduleId: string): Promise<CurriculumModule> {
  const { data } = await apiClient.get<CurriculumModule>(
    `/training/curriculum/modules/${moduleId}`
  );
  return data;
}

/**
 * Build full URL for module cover image using coverImageUrl from the API
 * and NEXT_PUBLIC_API_URL from env.
 */
export function getModuleCoverUrl(
  coverImageUrl: string | null | undefined
): string {
  if (!coverImageUrl?.trim()) return "";
  const apiBase = (
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL ?? ""
      : ""
  ).replace(/\/$/, "");
  const path = coverImageUrl.startsWith("/")
    ? coverImageUrl
    : `/${coverImageUrl}`;
  return apiBase ? `${apiBase}${path}` : path;
}

/**
 * Build full URL for playlist item source (video/PDF) using sourceUrl from the API.
 * GET .../modules/:moduleId/items/:itemId/source redirects to S3. Prepend base URL.
 */
export function getPlaylistItemSourceUrl(sourceUrl: string | null | undefined): string {
  return getModuleCoverUrl(sourceUrl);
}

/**
 * Create a training module (Option A – multipart).
 * Course info + playlist in one request. Cover image as file; video/PDF files
 * as playlistItemFiles in the same order as video/pdf items in playlist.
 */
export async function createModule(formData: FormData): Promise<CurriculumModule> {
  const { data } = await apiClient.post<CurriculumModule>(
    "/training/curriculum/modules",
    formData,
    {
      transformRequest: [
        (data, headers) => {
          if (headers && typeof headers === "object") delete headers["Content-Type"];
          return data;
        },
      ],
    }
  );
  return data;
}

/**
 * Update an existing training module using JSON PATCH body.
 * Does not handle file uploads – follow backend docs to upload files
 * separately and then pass coverImageKey/coverImageUrl or playlist
 * sourceKey/sourceUrl via this payload.
 */
export async function updateModule(
  moduleId: string,
  payload: UpdateModulePayload
): Promise<CurriculumModule> {
  const { data } = await apiClient.patch<CurriculumModule>(
    `/training/curriculum/modules/${moduleId}`,
    payload
  );
  return data;
}

/**
 * Update a training module using multipart/form-data.
 * Mirrors createModule but targets an existing module id so that
 * course info, cover image, and playlist (including files) can all
 * be edited in a single form.
 */
export async function updateModuleMultipart(
  moduleId: string,
  formData: FormData
): Promise<CurriculumModule> {
  const { data } = await apiClient.patch<CurriculumModule>(
    `/training/curriculum/modules/${moduleId}`,
    formData,
    {
      transformRequest: [
        (data, headers) => {
          if (headers && typeof headers === "object") delete headers["Content-Type"];
          return data;
        },
      ],
    }
  );
  return data;
}

/**
 * Delete a training module by id.
 */
export async function deleteModule(moduleId: string): Promise<void> {
  await apiClient.delete(`/training/curriculum/modules/${moduleId}`);
}
