import type {
  CourseForUI,
  PlaylistItemContentType,
  PlaylistItemForLearn,
  PlaylistItemWithProgress,
  StudentCourseDetail,
} from "@/shared/lib/api/student-courses";

const PLACEHOLDER_THUMBNAIL = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=220&fit=crop";

/** Normalize cover url for mapped course cards. */
function resolveThumb(url?: string | null): string {
  const trimmed = url?.trim();
  return trimmed ? trimmed : PLACEHOLDER_THUMBNAIL;
}

/** Format date for "Last updated" (e.g. "1/2026"). */
function formatLastUpdated(iso?: string | Date | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * Map API course detail to Course shape for detail + learn pages.
 */
export function mapStudentCourseDetailToCourse(detail: StudentCourseDetail): CourseForUI {
  const module = detail.module;
  const playlist = module.playlist ?? [];
  const categories = module.categories ?? [];
  const categoryNames = categories
    .map((c: { name?: string }) => c.name)
    .filter(Boolean) as string[];

  const playlistItemsForLearn: PlaylistItemForLearn[] = playlist.map((p, i) => {
    const item = p as PlaylistItemWithProgress & {
      contentType: string;
      youtubeUrl?: string;
      youtubeLink?: string;
      videoFile?: { url?: string };
      pdfDocument?: { url?: string };
      blogContent?: string;
      quiz?: { questions?: unknown[] };
      quizData?: { questions?: unknown[] };
      testLinkOrReference?: string;
      essay?: { questions: { questionText?: string; expectedAnswer?: string }[] };
      essayData?: { questions?: { questionText?: string; expectedAnswer?: string }[] };
      difficulty?: string;
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
      youtubeUrl: item.youtubeUrl ?? item.youtubeLink,
      videoFile: item.videoFile,
      pdfDocument: item.pdfDocument,
      blogContent: item.blogContent,
      quiz,
      testLinkOrReference: item.testLinkOrReference,
      essay,
      difficulty: item.difficulty,
      isCompleted: item.isCompleted,
      playlistIndex: i,
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

  const description = module.shortDescription ?? "";
  const learningPoints = description
    ? [description.length > 120 ? `${description.slice(0, 120).trim()}…` : description]
    : [];

  return {
    id: module.id,
    title: module.moduleName ?? "Untitled course",
    instructor: categoryNames[0] ?? "Instructor",
    thumbnail: resolveThumb(module.coverImage?.url),
    progress: detail.progress?.percentage ?? 0,
    description,
    lessons: lectures,
    learningPoints,
    requirements: [],
    courseSections: sectionOrder.map((key) => sectionMap.get(key)!),
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
