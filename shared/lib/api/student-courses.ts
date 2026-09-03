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
  facets?: { categories: string[]; instructors: string[] };
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

let myStudentCache: StudentMe | null = null;
let myStudentInflight: Promise<StudentMe> | null = null;

/** Cached student id from a prior getMyStudent() in this session, if any. */
export function peekMyStudentId(): string | null {
  return myStudentCache?.id ?? null;
}

/** Get current user's student profile (for student-scoped course APIs). 404 if no student linked. */
export async function getMyStudent(): Promise<StudentMe> {
  if (myStudentCache) return myStudentCache;
  if (myStudentInflight) return myStudentInflight;
  myStudentInflight = apiClient
    .get<StudentMe>("/training/students/me")
    .then(({ data }) => {
      myStudentCache = data;
      return data;
    })
    .finally(() => {
      myStudentInflight = null;
    });
  return myStudentInflight;
}

export interface ListStudentCoursesParams {
  status?: "enrolled" | "in-progress" | "completed" | "dropped";
  search?: string;
  category?: string;
  instructor?: string;
  /** UI progress band (percentage), distinct from enrollment `status`. */
  progress?: "not-started" | "in-progress" | "completed";
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

/** Quiz results with correct answers (for showing detailed results after submit). */
export interface QuizResultsQuestion {
  questionText: string;
  allowMultipleAnswers?: boolean;
  options: { text: string; isCorrect: boolean; isSelected: boolean }[];
  studentAnswer: number[];
  isCorrect: boolean;
  /** AI-generated explanation for wrong answers (why the correct answer is right). */
  explanation?: string;
}

export interface QuizResultsResponse {
  quiz: {
    playlistItemId: string;
    title: string;
    questions: QuizResultsQuestion[];
  };
  attempt: {
    attemptNumber: number;
    score: { totalQuestions: number; correctAnswers: number; percentage: number; totalPoints?: number; maxPoints?: number };
    submittedAt: string;
    timeSpent?: number;
  };
}

export async function getQuizResults(
  studentId: string,
  moduleId: string,
  playlistItemId: string
): Promise<QuizResultsResponse> {
  const { data } = await apiClient.get<QuizResultsResponse>(
    `/training/students/${studentId}/courses/${moduleId}/quizzes/${playlistItemId}/results`
  );
  return data;
}

/** Essay submit: answers (typed text). Backend marks item complete on submit. */
export interface EssayResultsQuestion {
  questionText: string;
  expectedAnswer?: string;
  studentAnswer: string;
  score?: number;
  maxMarks?: number;
  optional?: boolean;
  feedback?: string;
  rubric?: {
    accuracy?: number;
    completeness?: number;
    clarity?: number;
    criticalThinking?: number;
  };
  suggestions?: string;
}

export interface EssayResultsResponse {
  essay: {
    playlistItemId: string;
    title: string;
    passPercentage?: number;
    questions: EssayResultsQuestion[];
  };
  attempt: {
    attemptId?: string;
    attemptNumber: number;
    score?: {
      totalQuestions: number;
      correctAnswers?: number;
      percentage: number;
      obtainedMarks?: number;
      maxMarks?: number;
    };
    obtainedMarks?: number;
    maxMarks?: number;
    submittedAt: string;
    timeSpent?: number;
    status: string;
    passed?: boolean | null;
    passPercentage?: number;
    feedback?: string;
  };
}

export async function getEssayResults(
  studentId: string,
  moduleId: string,
  playlistItemId: string
): Promise<EssayResultsResponse> {
  const { data } = await apiClient.get<EssayResultsResponse>(
    `/training/students/${studentId}/courses/${moduleId}/essays/${playlistItemId}/results`
  );
  return data;
}

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
    thumbnail: resolveCourseThumbnailUrl(module.coverImage?.url),
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

/** Shared fallback when a course cover image is missing or fails to load. */
export const COURSE_THUMBNAIL_PLACEHOLDER = PLACEHOLDER_THUMBNAIL;

/** Normalize API cover image url; empty values fall back to placeholder. */
export function resolveCourseThumbnailUrl(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed ? trimmed : PLACEHOLDER_THUMBNAIL;
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
  playlistIndex?: number;
  /** Sequential lock — set on the learn page from section completion, not the API. */
  locked?: boolean;
  lockReason?: string;
}

export { mapStudentCourseDetailToCourse } from "@/shared/lib/api/map-student-course-detail";
