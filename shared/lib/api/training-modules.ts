"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface FileUpload {
  key: string;
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

/** Quiz option (request/response) – doc section 1.1 & 2.3 */
export interface QuizOptionShape {
  text: string;
  isCorrect: boolean;
}

/** Quiz question (request/response) */
export interface QuizQuestionShape {
  questionText: string;
  allowMultipleAnswers: boolean;
  options: QuizOptionShape[];
}

/** Quiz data sent inline in playlist (create/update) */
export interface QuizDataShape {
  questions: QuizQuestionShape[];
}

/** Inline quiz object in playlist response */
export interface InlineQuizShape {
  questions: QuizQuestionShape[];
}

export interface PlaylistItem {
  id?: string;
  _id?: string;
  contentType: "upload-video" | "youtube-link" | "pdf-document" | "blog" | "quiz" | "test";
  title: string;
  duration: number;
  order?: number;
  videoFile?: FileUpload;
  youtubeUrl?: string;
  pdfDocument?: FileUpload;
  blogContent?: string;
  /** Quiz is stored inline in module schema (response) */
  quiz?: InlineQuizShape;
  /** Quiz data sent inline from frontend in create/update */
  quizData?: QuizDataShape;
  testLinkOrReference?: string;
}

export interface TrainingModule {
  id: string;
  categories: Array<{ id: string; name: string; createdAt?: string; updatedAt?: string }>;
  moduleName: string;
  coverImage?: FileUpload;
  shortDescription: string;
  students: Array<{
    id: string;
    phone?: string;
    user: { id: string; name: string; email: string; status?: string; isEmailVerified?: boolean };
  }>;
  mentorsAssigned: Array<{
    id: string;
    phone?: string;
    user: { id: string; name: string; email: string; status?: string; isEmailVerified?: boolean };
  }>;
  playlist: PlaylistItem[];
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface TrainingModulesListResponse {
  results: TrainingModule[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ListTrainingModulesParams {
  search?: string;
  category?: string;
  status?: "draft" | "published" | "archived";
  sortBy?: string;
  limit?: number;
  page?: number;
}

/** Payload for create/update – we send arrays; API builds FormData per doc section 4.1 */
export interface CreateTrainingModulePayload {
  moduleName: string;
  shortDescription: string;
  categories?: string[];
  students?: string[];
  mentorsAssigned?: string[];
  status?: "draft" | "published" | "archived";
  coverImage?: File;
  playlist?: Omit<PlaylistItem, "id">[];
  playlistVideoFiles?: { index: number; file: File }[];
  playlistPdfFiles?: { index: number; file: File }[];
}

export type UpdateTrainingModulePayload = Partial<CreateTrainingModulePayload>;

/**
 * List modules – GET /v1/training/modules (doc 2.1)
 */
export async function listTrainingModules(
  params?: ListTrainingModulesParams
): Promise<TrainingModulesListResponse> {
  const { data } = await apiClient.get<TrainingModulesListResponse>("/training/modules", {
    params,
  });
  return data;
}

/**
 * Get single module – GET /v1/training/modules/:moduleId (doc 2.1)
 * Response includes playlist[].quiz populated (full quiz with questions + options) per doc 5.2.
 */
export async function getTrainingModule(moduleId: string): Promise<TrainingModule> {
  const { data } = await apiClient.get<TrainingModule>(`/training/modules/${moduleId}`);
  return data;
}

function appendIdArray(formData: FormData, field: string, values?: string[]): void {
  if (!values?.length) return;
  values.forEach((value) => formData.append(`${field}[]`, value));
}

/**
 * Append playlist as bracket-notation fields so backend parses array/object types in multipart.
 */
function appendPlaylistToFormData(
  formData: FormData,
  playlist?: Array<Omit<PlaylistItem, "id"> & { order?: number }>
): void {
  if (!playlist?.length) return;

  playlist.forEach((item, index) => {
    const base = `playlist[${index}]`;
    if (item._id) formData.append(`${base}[_id]`, item._id);
    formData.append(`${base}[contentType]`, item.contentType);
    formData.append(`${base}[title]`, item.title);
    formData.append(`${base}[duration]`, String(item.duration ?? 0));
    formData.append(`${base}[order]`, String(item.order ?? index));

    switch (item.contentType) {
      case "youtube-link":
        if (item.youtubeUrl != null) formData.append(`${base}[youtubeUrl]`, item.youtubeUrl);
        break;
      case "blog":
        if (item.blogContent != null) formData.append(`${base}[blogContent]`, item.blogContent);
        break;
      case "test":
        if (item.testLinkOrReference != null)
          formData.append(`${base}[testLinkOrReference]`, item.testLinkOrReference);
        break;
      case "quiz": {
        const quizData =
          item.quizData?.questions?.length
            ? item.quizData
            : item.quiz?.questions?.length
              ? item.quiz
              : undefined;

        if (quizData?.questions?.length) {
          quizData.questions.forEach((question, qIdx) => {
            // Keep quiz payload compatible with both parsers:
            // - playlist[i].quizData.questions (documented)
            // - playlist[i].quiz.questions (inline schema shape)
            const questionBases = [
              `${base}[quizData][questions][${qIdx}]`,
              `${base}[quiz][questions][${qIdx}]`,
            ];

            questionBases.forEach((questionBase) => {
              formData.append(`${questionBase}[questionText]`, question.questionText);
              formData.append(
                `${questionBase}[allowMultipleAnswers]`,
                String(question.allowMultipleAnswers ?? false)
              );
              (question.options ?? []).forEach((option, oIdx) => {
                const optionBase = `${questionBase}[options][${oIdx}]`;
                formData.append(`${optionBase}[text]`, option.text);
                formData.append(`${optionBase}[isCorrect]`, String(option.isCorrect));
              });
            });
          });
        }
        break;
      }
      default:
        break;
    }
  });
}

/**
 * Create module – POST /v1/training/modules.
 * Uses multipart bracket notation for arrays/objects.
 */
export async function createTrainingModule(
  payload: CreateTrainingModulePayload
): Promise<TrainingModule> {
  const formData = new FormData();
  formData.append("moduleName", payload.moduleName);
  formData.append("shortDescription", payload.shortDescription);
  formData.append("status", payload.status ?? "draft");
  appendIdArray(formData, "categories", payload.categories);
  appendIdArray(formData, "students", payload.students);
  appendIdArray(formData, "mentorsAssigned", payload.mentorsAssigned);

  if (payload.coverImage) {
    formData.append("coverImage", payload.coverImage);
  }

  appendPlaylistToFormData(formData, payload.playlist);

  (payload.playlistVideoFiles ?? []).forEach(({ index, file }) => {
    formData.append(`playlist[${index}].videoFile`, file);
  });
  (payload.playlistPdfFiles ?? []).forEach(({ index, file }) => {
    formData.append(`playlist[${index}].pdfFile`, file);
  });

  const { data } = await apiClient.post<TrainingModule>("/training/modules", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/**
 * Update module – PATCH /v1/training/modules/:moduleId
 * Same multipart shape as create.
 */
export async function updateTrainingModule(
  moduleId: string,
  payload: UpdateTrainingModulePayload
): Promise<TrainingModule> {
  const formData = new FormData();
  if (payload.moduleName != null) formData.append("moduleName", payload.moduleName);
  if (payload.shortDescription != null)
    formData.append("shortDescription", payload.shortDescription);
  if (payload.status != null) formData.append("status", payload.status);
  appendIdArray(formData, "categories", payload.categories);
  appendIdArray(formData, "students", payload.students);
  appendIdArray(formData, "mentorsAssigned", payload.mentorsAssigned);

  if (payload.coverImage) {
    formData.append("coverImage", payload.coverImage);
  }

  appendPlaylistToFormData(formData, payload.playlist);

  (payload.playlistVideoFiles ?? []).forEach(({ index, file }) => {
    formData.append(`playlist[${index}].videoFile`, file);
  });
  (payload.playlistPdfFiles ?? []).forEach(({ index, file }) => {
    formData.append(`playlist[${index}].pdfFile`, file);
  });

  const { data } = await apiClient.patch<TrainingModule>(
    `/training/modules/${moduleId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

/**
 * Delete module – DELETE /v1/training/modules/:moduleId (doc 2.1)
 */
export async function deleteTrainingModule(moduleId: string): Promise<void> {
  await apiClient.delete(`/training/modules/${moduleId}`);
}
