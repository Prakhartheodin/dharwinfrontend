"use client";

import { apiClient } from "@/shared/lib/api/client";

/**
 * Student Courses API – matches backend STUDENT_COURSES_API_FRONTEND.md.
 * All course endpoints are scoped by studentId; use getMyStudent() to get current user's student id.
 */

export interface StudentMe {
  id: string;
  user: { id: string; name: string; email: string; role?: string; roleIds?: string[]; status?: string; isEmailVerified?: boolean };
  status?: string;
  [key: string]: unknown;
}

export interface CategoryRef {
  id: string;
  name: string;
  description?: string;
}

export interface CoverImage {
  key?: string;
  url?: string;
  originalName?: string;
}

export interface PlaylistItemRef {
  contentType: string;
  title: string;
  duration?: number;
  youtubeLink?: string;
  youtubeUrl?: string;
  quiz?: unknown;
  [key: string]: unknown;
}

export interface ModuleRef {
  id: string;
  moduleName: string;
  shortDescription?: string;
  coverImage?: CoverImage;
  categories?: CategoryRef[];
  playlist?: PlaylistItemRef[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompletedItem {
  playlistItemId: string;
  completedAt: string;
  contentType: string;
}

export interface ProgressRef {
  percentage: number;
  completedItems?: CompletedItem[];
  lastAccessedAt?: string;
  lastAccessedItem?: { playlistItemId: string };
}

export interface QuizScoresRef {
  totalQuizzes?: number;
  completedQuizzes?: number;
  averageScore?: number;
  totalScore?: number;
}

export interface CertificateRef {
  issued: boolean;
  issuedAt?: string | null;
  certificateId?: string | null;
  certificateUrl?: string | null;
}

export interface StudentCourseListItem {
  module: ModuleRef;
  progress: ProgressRef;
  quizScores?: QuizScoresRef;
  enrolledAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  status: string;
  certificate?: CertificateRef;
}

export interface StudentCourseListResponse {
  results: StudentCourseListItem[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface PlaylistItemWithProgress extends PlaylistItemRef {
  playlistItemId?: string;
  isCompleted?: boolean;
  quizAttempts?: unknown[];
}

export interface StudentCourseDetail {
  module: ModuleRef & { playlist?: PlaylistItemWithProgress[] };
  progress: ProgressRef;
  quizScores?: QuizScoresRef;
  enrolledAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  status: string;
  certificate?: CertificateRef;
}

/** Get current user's student profile (for student-scoped course APIs). 404 if no student linked. */
export async function getMyStudent(): Promise<StudentMe> {
  const { data } = await apiClient.get<StudentMe>("/training/students/me");
  return data;
}

export interface ListStudentCoursesParams {
  status?: "enrolled" | "in-progress" | "completed" | "dropped";
  sortBy?: string;
  limit?: number;
  page?: number;
}

/** List courses assigned to the student. */
export async function listStudentCourses(
  studentId: string,
  params?: ListStudentCoursesParams
): Promise<StudentCourseListResponse> {
  const { data } = await apiClient.get<StudentCourseListResponse>(
    `/training/students/${studentId}/courses`,
    { params }
  );
  return data;
}

/** Get a single course (module) with full details and progress. */
export async function getStudentCourse(
  studentId: string,
  moduleId: string
): Promise<StudentCourseDetail> {
  const { data } = await apiClient.get<StudentCourseDetail>(
    `/training/students/${studentId}/courses/${moduleId}`
  );
  return data;
}

/** Start a course (sets startedAt). */
export async function startStudentCourse(
  studentId: string,
  moduleId: string
): Promise<{ progress: ProgressRef; status: string; [key: string]: unknown }> {
  const { data } = await apiClient.post(
    `/training/students/${studentId}/courses/${moduleId}/start`
  );
  return data as { progress: ProgressRef; status: string; [key: string]: unknown };
}

/** Mark a playlist item as complete. */
export async function markCourseItemComplete(
  studentId: string,
  moduleId: string,
  playlistItemId: string,
  contentType: string
): Promise<{ progress: ProgressRef; status: string; [key: string]: unknown }> {
  const { data } = await apiClient.post(
    `/training/students/${studentId}/courses/${moduleId}/complete-item`,
    { playlistItemId, contentType }
  );
  return data as { progress: ProgressRef; status: string; [key: string]: unknown };
}

/** Update last accessed playlist item. */
export async function updateLastAccessed(
  studentId: string,
  moduleId: string,
  playlistItemId: string
): Promise<{ progress: ProgressRef; [key: string]: unknown }> {
  const { data } = await apiClient.patch(
    `/training/students/${studentId}/courses/${moduleId}/last-accessed`,
    { playlistItemId }
  );
  return data as { progress: ProgressRef; [key: string]: unknown };
}

/** Quiz submit: answers and timeSpent (seconds). Backend marks item complete only when score >= 90%. */
export interface QuizSubmitAnswer {
  questionIndex: number;
  selectedOptions: number[];
}

export interface QuizSubmitResponse {
  score?: { totalQuestions: number; correctAnswers: number; percentage: number; totalPoints: number; maxPoints: number };
  [key: string]: unknown;
}

export async function submitQuizAttempt(
  studentId: string,
  moduleId: string,
  playlistItemId: string,
  body: { answers: QuizSubmitAnswer[]; timeSpent?: number }
): Promise<QuizSubmitResponse> {
  const { data } = await apiClient.post<QuizSubmitResponse>(
    `/training/students/${studentId}/courses/${moduleId}/quizzes/${playlistItemId}/submit`,
    body
  );
  return data;
}

/** Essay submit: answers (typed text). Backend marks item complete on submit. */
export async function submitEssayAttempt(
  studentId: string,
  moduleId: string,
  playlistItemId: string,
  body: {
    answers: { questionIndex: number; typedAnswer: string }[];
    timeSpent?: number;
  }
): Promise<unknown> {
  const { data } = await apiClient.post(
    `/training/students/${studentId}/courses/${moduleId}/essays/${playlistItemId}/submit`,
    body
  );
  return data;
}

/** Map API list item to a minimal course shape for list/card UI (first page: course list only). */
export function mapStudentCourseToCard(item: StudentCourseListItem): {
  id: string;
  title: string;
  instructor: string;
  thumbnail: string;
  progress: number;
  category?: string;
  status: string;
} {
  const module = item.module;
  const firstCategory = module.categories?.[0] as { name?: string } | undefined;
  const category = firstCategory?.name;
  return {
    id: module.id ?? "",
    title: module.moduleName ?? "Untitled course",
    instructor: category ?? "Instructor",
    thumbnail: module.coverImage?.url ?? "",
    progress: item.progress?.percentage ?? 0,
    category: category ?? undefined,
    status: item.status ?? "enrolled",
  };
}

/**
 * Course shape expected by CourseDetailClient / CourseLearnClient (from courses-data Course type).
 * We map API StudentCourseDetail to this so existing UI components keep working.
 */
export interface CourseForUI {
  id: string;
  title: string;
  instructor: string;
  thumbnail: string;
  progress: number;
  description: string;
  lessons: { id: string; title: string; duration?: string }[];
  learningPoints?: string[];
  requirements?: string[];
  courseSections?: { id: string; title: string; lectures: { id: string; title: string; duration?: string }[] }[];
  lastUpdated?: string;
  learnerCount?: number;
  relatedTopics?: string[];
  courseIncludes?: unknown;
  codingExercisesDescription?: string;
  ratingDisplay?: number;
  ratingCount?: number;
  [key: string]: unknown;
}

const PLACEHOLDER_THUMBNAIL = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=220&fit=crop";

/** Format date for "Last updated" (e.g. "1/2026" or "Jan 2026"). */
function formatLastUpdated(iso?: string | Date | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${month}/${year}`;
}

/** Playlist item with contentType for learn page tabs (Video, Blog, Quiz, PDF, Q&A). */
export type PlaylistItemContentType =
  | "upload-video"
  | "youtube-link"
  | "pdf-document"
  | "blog"
  | "quiz"
  | "essay";

export interface PlaylistItemForLearn {
  id: string;
  title: string;
  duration?: string;
  contentType: PlaylistItemContentType;
  youtubeUrl?: string;
  videoFile?: { url?: string; [key: string]: unknown };
  pdfDocument?: { url?: string; [key: string]: unknown };
  blogContent?: string;
  quiz?: unknown;
  testLinkOrReference?: string;
  essay?: { questions: { questionText?: string }[] };
  difficulty?: string;
  isCompleted?: boolean;
}

/**
 * Map API course detail to Course shape for detail page (second page) and learn page (third page).
 * Detail page: title, description, what you'll learn, requirements, course content outline.
 * Learn page: course content (sections + lectures) + playlistItems for tabs (Video, Blog, Quiz, PDF, Test).
 */
export function mapStudentCourseDetailToCourse(detail: StudentCourseDetail): CourseForUI {
  const module = detail.module;
  const playlist = module.playlist ?? [];
  const categories = module.categories ?? [];
  const categoryNames = categories.map((c: { name?: string; id?: string }) => (c as { name?: string }).name).filter(Boolean) as string[];

  const playlistItemsForLearn: PlaylistItemForLearn[] = playlist.map((p, i) => {
    const item = p as PlaylistItemWithProgress & {
      contentType: string;
      youtubeUrl?: string;
      videoFile?: { url?: string };
      pdfDocument?: { url?: string };
      blogContent?: string;
      quiz?: { questions?: unknown[] };
      quizData?: { questions?: unknown[] };
      testLinkOrReference?: string;
      essay?: { questions: { questionText?: string; expectedAnswer?: string }[] };
      essayData?: { questions?: { questionText?: string; expectedAnswer?: string }[] };
      difficulty?: string;
      sectionTitle?: string;
      sectionIndex?: number;
    };
    const quiz =
      item.quiz?.questions != null
        ? item.quiz
        : item.quizData?.questions != null
          ? { questions: item.quizData.questions }
          : item.quiz;
    const essay =
      item.essay?.questions != null
        ? item.essay
        : item.essayData?.questions != null
          ? { questions: item.essayData.questions }
          : item.essay;
    return {
      id: item.playlistItemId ?? String(i),
      title: item.title ?? `Item ${i + 1}`,
      duration: item.duration != null ? `${item.duration} min` : undefined,
      contentType: item.contentType as PlaylistItemContentType,
      youtubeUrl: item.youtubeUrl ?? (item as { youtubeLink?: string }).youtubeLink,
      videoFile: item.videoFile,
      pdfDocument: item.pdfDocument,
      blogContent: item.blogContent,
      quiz,
      testLinkOrReference: item.testLinkOrReference,
      essay,
      difficulty: item.difficulty,
      isCompleted: item.isCompleted,
    };
  });

  const lectures = playlist.map((p, i) => ({
    id: (p as PlaylistItemWithProgress).playlistItemId ?? String(i),
    title: p.title ?? `Item ${i + 1}`,
    duration: p.duration != null ? `${p.duration} min` : undefined,
    isCompleted: (p as PlaylistItemWithProgress).isCompleted,
  }));

  const sectionMap = new Map<
    string,
    { id: string; title: string; lectures: { id: string; title: string; duration?: string; isCompleted?: boolean }[] }
  >();
  const sectionOrder: string[] = [];
  playlist.forEach((p, i) => {
    const item = p as { sectionTitle?: string; sectionIndex?: number };
    const sectionTitleTrimmed = item.sectionTitle?.trim();
    const key =
      sectionTitleTrimmed !== undefined && sectionTitleTrimmed !== ""
        ? sectionTitleTrimmed
        : item.sectionIndex != null
          ? `section-${item.sectionIndex}`
          : "__none__";
    const lecture = lectures[i];
    if (!sectionMap.has(key)) {
      const id =
        sectionTitleTrimmed !== undefined && sectionTitleTrimmed !== ""
          ? key.replace(/\s+/g, "-").slice(0, 80)
          : item.sectionIndex != null
            ? `section-${item.sectionIndex}`
            : "default";
      const title = sectionTitleTrimmed ?? (item.sectionIndex != null ? `Section ${item.sectionIndex + 1}` : "Course content");
      sectionOrder.push(key);
      sectionMap.set(key, { id, title, lectures: [] });
    }
    sectionMap.get(key)!.lectures.push(lecture);
  });
  const courseSections = sectionOrder.map((key) => sectionMap.get(key)!);

  const description = module.shortDescription ?? "";
  const learningPoints = description
    ? [description.length > 120 ? `${description.slice(0, 120).trim()}…` : description]
    : [];

  return {
    id: module.id,
    title: module.moduleName ?? "Untitled course",
    instructor: categoryNames[0] ?? "Instructor",
    thumbnail: module.coverImage?.url ?? PLACEHOLDER_THUMBNAIL,
    progress: detail.progress?.percentage ?? 0,
    description,
    lessons: lectures,
    learningPoints,
    requirements: [],
    courseSections,
    lastUpdated: formatLastUpdated(module.updatedAt),
    learnerCount: undefined,
    relatedTopics: categoryNames,
    codingExercisesDescription: undefined,
    ratingDisplay: undefined,
    ratingCount: undefined,
    tagline: description ? (description.length > 80 ? `${description.slice(0, 80).trim()}…` : description) : undefined,
    playlistItems: playlistItemsForLearn,
  };
}
