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
  contentType: "upload-video" | "youtube-link" | "pdf-document" | "blog" | "quiz" | "essay";
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
  difficulty?: "easy" | "medium" | "hard";
  essay?: { questions: { questionText: string; expectedAnswer?: string }[] };
  essayData?: { questions: { questionText: string; expectedAnswer?: string }[] };
  sectionTitle?: string;
  sectionIndex?: number;
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
  estimatedDuration?: number;
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

function studentIdsFromModule(mod: TrainingModule): string[] {
  const ids: string[] = [];
  for (const s of mod.students ?? []) {
    const id = String(s.id ?? (s as { _id?: string })._id ?? "").trim();
    if (id) ids.push(id);
  }
  return ids;
}

/** Add a training student to a module's roster (same as Curriculum module assign-students). Idempotent. */
export async function addStudentToTrainingModule(moduleId: string, studentId: string): Promise<TrainingModule> {
  const sid = studentId.trim();
  if (!sid) throw new Error("studentId is required");
  const mod = await getTrainingModule(moduleId);
  const set = new Set(studentIdsFromModule(mod));
  if (set.has(sid)) return mod;
  set.add(sid);
  return updateTrainingModule(moduleId, { students: Array.from(set) });
}

function appendIdArray(formData: FormData, field: string, values?: string[]): void {
  if (!values?.length) return;
  values.forEach((value) => formData.append(`${field}[]`, value));
}

/**
 * Multipart PATCH: empty roster must send JSON "[]" or the backend never receives `students` / `mentorsAssigned`
 * and keeps the previous list. Omit the field entirely when `values` is undefined (partial update).
 */
function appendIdArrayField(
  formData: FormData,
  field: "students" | "mentorsAssigned",
  values: string[] | undefined
): void {
  if (values === undefined) return;
  if (values.length === 0) {
    formData.append(field, "[]");
    return;
  }
  appendIdArray(formData, field, values);
}

function appendFileUploadMeta(
  formData: FormData,
  base: string,
  field: "videoFile" | "pdfDocument",
  file?: FileUpload
): void {
  if (!file) return;
  formData.append(`${base}[${field}][key]`, file.key);
  formData.append(`${base}[${field}][url]`, file.url);
  formData.append(`${base}[${field}][originalName]`, file.originalName);
  formData.append(`${base}[${field}][size]`, String(file.size));
  formData.append(`${base}[${field}][mimeType]`, file.mimeType);
  formData.append(`${base}[${field}][uploadedAt]`, file.uploadedAt);
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
    if (item.sectionTitle != null) formData.append(`${base}[sectionTitle]`, item.sectionTitle);
    if (item.sectionIndex != null) formData.append(`${base}[sectionIndex]`, String(item.sectionIndex));

    switch (item.contentType) {
      case "upload-video":
        appendFileUploadMeta(formData, base, "videoFile", item.videoFile);
        break;
      case "pdf-document":
        appendFileUploadMeta(formData, base, "pdfDocument", item.pdfDocument);
        break;
      case "youtube-link":
        if (item.youtubeUrl != null) formData.append(`${base}[youtubeUrl]`, item.youtubeUrl);
        break;
      case "blog":
        if (item.blogContent != null) formData.append(`${base}[blogContent]`, item.blogContent);
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
        if (item.difficulty != null) formData.append(`${base}[difficulty]`, item.difficulty);
        break;
      }
      case "essay": {
        const essayData = item.essayData ?? item.essay;
        if (essayData?.questions?.length) {
          essayData.questions.forEach((q, qIdx) => {
            formData.append(`${base}[essayData][questions][${qIdx}][questionText]`, q.questionText ?? "");
            if (q.expectedAnswer != null)
              formData.append(`${base}[essayData][questions][${qIdx}][expectedAnswer]`, q.expectedAnswer);
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
  appendIdArrayField(formData, "students", payload.students);
  appendIdArrayField(formData, "mentorsAssigned", payload.mentorsAssigned);

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
  if (payload.categories !== undefined) {
    if (payload.categories.length === 0) {
      formData.append("categories", "[]");
    } else {
      appendIdArray(formData, "categories", payload.categories);
    }
  }
  appendIdArrayField(formData, "students", payload.students);
  appendIdArrayField(formData, "mentorsAssigned", payload.mentorsAssigned);

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

/** Update only folder assignments (training categories). Empty array = uncategorized. */
export async function setTrainingModuleFolders(
  moduleId: string,
  categoryIds: string[]
): Promise<TrainingModule> {
  return updateTrainingModule(moduleId, { categories: categoryIds });
}

/**
 * Delete module – DELETE /v1/training/modules/:moduleId (doc 2.1)
 */
export async function deleteTrainingModule(moduleId: string): Promise<void> {
  await apiClient.delete(`/training/modules/${moduleId}`);
}

/**
 * Clone module – POST /v1/training/modules/:moduleId/clone
 */
export async function cloneModule(moduleId: string): Promise<TrainingModule> {
  const { data } = await apiClient.post<TrainingModule>(`/training/modules/${moduleId}/clone`);
  return data;
}

/**
 * AI chat for module refinement – POST /v1/training/modules/:moduleId/ai-chat
 */
export async function aiChat(
  moduleId: string,
  message: string,
  modulePayload: unknown
): Promise<unknown> {
  const { data } = await apiClient.post(`/training/modules/${moduleId}/ai-chat`, {
    message,
    modulePayload,
  });
  return data;
}

/** Enhance quiz with AI – POST /v1/training/modules/enhance-quiz */
export interface EnhanceQuizParams {
  moduleTitle: string;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
  existingQuestions?: { question?: string; questionText?: string; options?: { text: string; isCorrect: boolean }[] }[];
  questionIndices?: "all" | number[];
}
export interface EnhanceQuizResponse {
  questions: { questionText: string; options: { text: string; isCorrect: boolean }[]; allowMultipleAnswers?: boolean }[];
}
export async function enhanceQuiz(params: EnhanceQuizParams): Promise<EnhanceQuizResponse> {
  const { data } = await apiClient.post<EnhanceQuizResponse>("/training/modules/enhance-quiz", params);
  return data;
}

/** Enhance Q&A with AI – POST /v1/training/modules/enhance-essay */
export interface EnhanceEssayParams {
  moduleTitle: string;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
  existingQuestions?: { questionText?: string; question?: string }[];
  questionIndices?: "all" | number[];
}
export interface EnhanceEssayResponse {
  questions: { questionText: string; expectedAnswer?: string }[];
}
export async function enhanceEssay(params: EnhanceEssayParams): Promise<EnhanceEssayResponse> {
  const { data } = await apiClient.post<EnhanceEssayResponse>("/training/modules/enhance-essay", params);
  return data;
}

export interface DocumentVideo {
  title: string
  duration: number
  youtubeUrl: string
}

/** Extracted module for display (from backend extract-document). */
export interface ExtractedModuleDisplay {
  title: string
  videos: string[]
  blogs: string[]
  quizzes: { questionText: string; options: { text: string; isCorrect: boolean }[] }[]
  essays: { questionText: string }[]
  sectionOrder: ("video" | "blog" | "quiz" | "essay")[]
}

export interface ExtractDocumentResponse {
  normalizedText: string
  extractedByModule: ExtractedModuleDisplay[]
  youtubeUrls: string[]
  documentTitle?: string
}

export interface ProcessDocumentResponse extends ExtractDocumentResponse {
  videos: { title: string; duration: number; youtubeUrl: string }[]
}

/**
 * Process uploaded file – POST /v1/training/modules/process-document (multipart)
 * Backend extracts text, normalizes, extracts modules, fetches video metadata. Frontend displays only.
 */
export async function processDocument(file: File): Promise<ProcessDocumentResponse> {
  const baseURL =
    process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "/api/v1" : "")
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch(`${baseURL}/training/modules/process-document`, {
    method: "POST",
    credentials: "include",
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || "Failed to process document")
  }
  return res.json()
}

/**
 * Extract and normalize document text – POST /v1/training/modules/extract-document
 * Accepts raw text from file, returns normalized text + extracted modules for display.
 */
export async function extractDocument(rawText: string): Promise<ExtractDocumentResponse> {
  const { data } = await apiClient.post<ExtractDocumentResponse>(
    "/training/modules/extract-document",
    { rawText }
  )
  return data
}

/**
 * Fetch YouTube videos found in document text – POST /v1/training/modules/fetch-videos-from-document
 */
export async function fetchVideosFromDocument(documentText: string): Promise<{ videos: DocumentVideo[] }> {
  const { data } = await apiClient.post<{ videos: DocumentVideo[] }>(
    "/training/modules/fetch-videos-from-document",
    { documentText }
  )
  return data
}

export interface SuggestTopicDescriptionResponse {
  moduleName: string;
  shortDescription: string;
}

/**
 * Suggest module name and description from document – POST /v1/training/modules/suggest-topic-description
 */
export async function suggestTopicDescription(
  documentText: string
): Promise<SuggestTopicDescriptionResponse> {
  const { data } = await apiClient.post<SuggestTopicDescriptionResponse>(
    "/training/modules/suggest-topic-description",
    { documentText }
  );
  return data;
}

/** Playlist outline item (preview only – no content) */
export interface PlaylistOutlineItem {
  contentType: "blog" | "quiz" | "essay" | "youtube-link";
  title: string;
}

export interface PlaylistOutlineSection {
  title: string;
  items: PlaylistOutlineItem[];
}

export interface PlaylistOutlineFromTitleResponse {
  moduleName: string;
  shortDescription: string;
  level: string;
  sections: PlaylistOutlineSection[];
}

export interface GetPlaylistOutlineParams {
  moduleTitle: string;
  numModules?: number;
  level?: string;
  contentTypes?: string[];
}

/**
 * Get playlist outline (preview) with multiple sections – POST /v1/training/modules/playlist-outline-from-title
 */
export async function getPlaylistOutlineFromTitle(
  moduleTitle: string,
  numModules?: number,
  level?: string,
  contentTypes?: string[]
): Promise<PlaylistOutlineFromTitleResponse> {
  const { data } = await apiClient.post<PlaylistOutlineFromTitleResponse>(
    "/training/modules/playlist-outline-from-title",
    {
      moduleTitle: moduleTitle?.trim() || "",
      numModules: numModules ?? 3,
      level: level ?? "intermediate",
      contentTypes: contentTypes ?? ["blog", "quiz", "essay"],
    }
  );
  return data;
}

export interface GenerateFromTitleParams {
  moduleName: string;
  shortDescription?: string;
  level?: string;
  sections?: PlaylistOutlineSection[];
  numBlogs?: number;
  numVideos?: number;
  numQuizzes?: number;
  questionsPerQuiz?: number;
  numEssays?: number;
  questionsPerEssay?: number;
  /** ISO 639-1 language code for YouTube video search (e.g. en, hi, es). Default: en */
  videoLanguage?: string;
}

export interface GenerateFromTitleEvent {
  step: string;
  status: string;
  message: string;
  data?: { moduleId?: string };
}

/**
 * Generate full module from title + config – POST /v1/training/modules/generate-from-title (SSE).
 */
export async function* generateModuleFromTitle(
  params: GenerateFromTitleParams
): AsyncGenerator<GenerateFromTitleEvent> {
  const baseURL =
    process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "/api/v1" : "");
  const url = `${baseURL}/training/modules/generate-from-title`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      moduleName: params.moduleName,
      shortDescription: params.shortDescription ?? "",
      level: params.level ?? "intermediate",
      sections: params.sections ?? [],
      numBlogs: params.numBlogs ?? 2,
      numVideos: params.numVideos ?? 0,
      numQuizzes: params.numQuizzes ?? 1,
      questionsPerQuiz: params.questionsPerQuiz ?? 4,
      numEssays: params.numEssays ?? 1,
      questionsPerEssay: params.questionsPerEssay ?? 3,
      videoLanguage: params.videoLanguage ?? "en",
    }),
  });
  if (!res.ok) {
    let message = res.statusText || "Generation failed";
    try {
      const errBody = await res.json().catch(() => ({}));
      if (errBody?.message) message = errBody.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (!res.body) throw new Error("Generation failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const json = line.slice(6).trim();
          if (json === "[DONE]" || !json) continue;
          try {
            yield JSON.parse(json) as GenerateFromTitleEvent;
          } catch {
            /* ignore */
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export interface GenerateWithAIParams {
  topic: string;
  description?: string;
  pdfText?: string;
  videoLinks?: string[];
  skillLevel?: string;
  contentTypes?: string[];
  /** ISO 639-1 language code for YouTube video search (e.g. en, hi, es). Default: en */
  videoLanguage?: string;
  /** Extracted content by module from process-document. When provided, used as source of truth for what's present vs missing. */
  extractedByModule?: ExtractedModuleDisplay[];
}

export interface VideoAssignmentPreview {
  requiresAssignment: boolean;
  moduleName: string;
  shortDescription: string;
  sections: { index: number; title: string; items: unknown[] }[];
  videos: { title: string; duration: number; youtubeUrl: string }[];
}

export interface GenerateWithAIEvent {
  step: string;
  status: string;
  message: string;
  data?: { moduleId?: string; requiresAssignment?: boolean } & Partial<VideoAssignmentPreview>;
}

export interface SaveWithVideoAssignmentsParams {
  moduleName: string;
  shortDescription: string;
  sections: { items: unknown[] }[];
  videos: { title: string; duration: number; youtubeUrl: string }[];
  videoAssignments: { videoIndex: number; sectionIndex: number }[];
}

/**
 * Save module with user's video-to-section assignments.
 */
export async function saveModuleWithVideoAssignments(
  params: SaveWithVideoAssignmentsParams
): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>(
    "/training/modules/save-with-video-assignments",
    params
  );
  return data;
}

/**
 * Generate module with AI – POST /v1/training/modules/generate-with-ai (SSE stream).
 * Returns an async iterable of SSE events. Uses credentials: include for auth (cookies).
 */
export async function* generateModuleWithAI(
  params: GenerateWithAIParams
): AsyncGenerator<GenerateWithAIEvent> {
  const baseURL =
    process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "/api/v1" : "");
  const url = `${baseURL}/training/modules/generate-with-ai`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    let message = res.statusText || "Generation failed";
    try {
      const errBody = await res.json().catch(() => ({}));
      if (errBody?.message) message = errBody.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (!res.body) {
    throw new Error("Generation failed");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const json = line.slice(6).trim();
          if (json === "[DONE]" || !json) continue;
          try {
            yield JSON.parse(json) as GenerateWithAIEvent;
          } catch {
            // ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
