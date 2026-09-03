"use client"

import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useState, useMemo, useRef, useEffect, useCallback } from "react"
import { CourseHeaderBack } from "../../course-header-back"
import type { Course, CourseSection } from "@/shared/data/training/courses-data"
import type { PlaylistItemForLearn } from "@/shared/lib/api/student-courses"
import { updateLastAccessed } from "@/shared/lib/api/student-courses"
import { getApiErrorMessage } from "@/shared/lib/api/client"
import { CourseLearnToast } from "./course-learn-complete-toggle"
import { LearnerNotesPanel } from "./course-learn-notes"
import { ScheduleLearningModal } from "./course-learn-schedule"
import { UploadVideoPlayer, YouTubeVideoPlayer } from "./course-learn-video-players"
import { CourseLearnOverview } from "./course-learn-panels"
import { CourseLearnSidebar } from "./course-learn-sidebar"
import { LearnOrientationBar, LearnTypeTabs, ContinueLearningBanner, NextLessonBar, EmptyCourseState, LessonStage } from "./course-learn-wayfinding"
import { CourseLearnTabBody } from "./course-learn-tab-body"
import { persistLearnItemCompletion, useCourseLearnProgress } from "./use-course-learn-progress"
import {
  TAB_CONFIG, tabForContentType, youtubeVideoId, sectionDurationMin, loadLearnSchedule,
  completionCopy, resumePlaylistItem, nextPlaylistItem, buildLockedItemIds, withQuizLockFlags,
  itemMatchesTab, QUIZ_LOCKED_MESSAGE, type LearnTabId,
} from "./course-learn-helpers"

interface CourseLearnClientProps {
  course: Course
  studentId: string
  moduleId: string
}

function CourseLearnClient({ course, studentId, moduleId }: CourseLearnClientProps) {
  const rawPlaylist = (course as Course & { playlistItems?: PlaylistItemForLearn[] }).playlistItems ?? []
  const {
    playlistItems: progressItems,
    completedIds,
    completingId,
    setCompletingId,
    displayProgress,
    applyCompletion,
  } = useCourseLearnProgress(rawPlaylist, course.progress)
  const [currentLectureId, setCurrentLectureId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<PlaylistItemForLearn | null>(null)
  const [mainTab, setMainTab] = useState<LearnTabId>("overview")
  const [scheduleDismissed, setScheduleDismissed] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleLabel, setScheduleLabel] = useState<string | null>(null)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null)
  const [shareHint, setShareHint] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [sidebarWide, setSidebarWide] = useState(false)
  const [listBrowse, setListBrowse] = useState(false)
  const didInit = useRef(false)
  const playerRef = useRef<HTMLDivElement>(null)
  const completedCount = completedIds.size

  const showFeedback = useCallback((message: string, tone: "success" | "error") => {
    setFeedback({ message, tone })
    window.setTimeout(() => setFeedback(null), tone === "success" ? 3000 : 5000)
  }, [])

  const lockedIds = useMemo(
    () =>
      buildLockedItemIds(
        course.courseSections ?? (course.lessons?.length ? [{ lectures: course.lessons }] : undefined),
        progressItems
      ),
    [course.courseSections, course.lessons, progressItems]
  )

  const playlistItems = useMemo(
    () => withQuizLockFlags(progressItems, lockedIds),
    [progressItems, lockedIds]
  )
  const lessonIndex = Math.max(0, playlistItems.findIndex((p) => p.id === currentLectureId))
  const resumeItem = resumePlaylistItem(playlistItems)
  const nextItem = nextPlaylistItem(playlistItems, currentLectureId)

  useEffect(() => {
    const saved = loadLearnSchedule(moduleId)
    if (saved) setScheduleLabel(`Scheduled ${saved.days.join(", ")} at ${saved.time}`)
  }, [moduleId])

  useEffect(() => {
    if (!currentLectureId) return
    const fresh = playlistItems.find((p) => p.id === currentLectureId)
    if (fresh) setSelectedItem(fresh)
  }, [playlistItems, currentLectureId])

  const applyItem = (item: PlaylistItemForLearn, opts?: { scroll?: boolean; syncTab?: boolean }) => {
    if (lockedIds.has(item.id)) return
    const syncTab = opts?.syncTab !== false
    setSelectedItem(item)
    setCurrentLectureId(item.id)
    if (syncTab) setMainTab(tabForContentType(item.contentType))
    if (studentId && moduleId) {
      updateLastAccessed(studentId, moduleId, item.id).catch((err) => {
        console.warn("Could not update last accessed lesson", err)
      })
    }
    if (opts?.scroll) {
      window.setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
    }
  }

  const selectLecture = (lectureId: string) => {
    const item = playlistItems.find((p) => p.id === lectureId)
    if (item) openTabItem(item)
  }

  /**
   * Open a playlist item from already-loaded data. Locked quizzes do not hit the network.
   */
  const openTabItem = (item: PlaylistItemForLearn) => {
    if (lockedIds.has(item.id)) {
      showFeedback(QUIZ_LOCKED_MESSAGE, "error")
      setListBrowse(true)
      return
    }
    setListBrowse(false)
    const isVideo = item.contentType === "upload-video" || item.contentType === "youtube-link"
    applyItem(item, { scroll: isVideo })
  }

  const selectItem = openTabItem

  const setSelectedCompleted = useCallback((itemId: string, isCompleted: boolean) => {
    setSelectedItem((prev) => (prev?.id === itemId ? { ...prev, isCompleted } : prev))
  }, [])

  const markComplete = (item: PlaylistItemForLearn) => {
    void persistLearnItemCompletion({
      studentId, moduleId, item, complete: true, applyCompletion, setSelectedCompleted, setCompletingId, completingId, showFeedback,
    })
  }

  const markIncomplete = (item: PlaylistItemForLearn) => {
    void persistLearnItemCompletion({
      studentId, moduleId, item, complete: false, applyCompletion, setSelectedCompleted, setCompletingId, completingId, showFeedback,
    })
  }

  const onLocalProgressUpdate = useCallback(async () => {
    if (selectedItem) applyCompletion(selectedItem.id, true)
  }, [selectedItem, applyCompletion])

  const toggleComplete = (item: PlaylistItemForLearn) => {
    if (item.isCompleted) void markIncomplete(item)
    else void markComplete(item)
  }

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    try {
      if (navigator.share) {
        await navigator.share({ title: course.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setShareHint(true)
        window.setTimeout(() => setShareHint(false), 2000)
        showFeedback("Course link copied", "success")
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return
      showFeedback(getApiErrorMessage(err, "Could not share."), "error")
    }
  }

  const tabsWithContent = useMemo(() => TAB_CONFIG.filter((t) => {
    if (t.id === "blog") return false
    if (t.id === "overview") return true
    if (!t.contentTypes?.length) return false
    return playlistItems.some((p) => t.contentTypes!.includes(p.contentType))
  }), [playlistItems])

  const itemsByTab = useMemo(() => {
    const ordered = [...playlistItems].sort((a, b) => (a.playlistIndex ?? 0) - (b.playlistIndex ?? 0))
    return {
      overview: [] as PlaylistItemForLearn[],
      video: ordered.filter((p) => p.contentType === "upload-video" || p.contentType === "youtube-link"),
      blog: ordered.filter((p) => p.contentType === "blog"),
      quiz: ordered.filter((p) => p.contentType === "quiz"),
      pdf: ordered.filter((p) => p.contentType === "pdf-document"),
      essay: ordered.filter((p) => p.contentType === "essay"),
    }
  }, [playlistItems])

  const sections: CourseSection[] = useMemo(() => {
    const base =
      course.courseSections?.length
        ? course.courseSections
        : course.lessons?.length
          ? [{ id: "default", title: "Course content", lectures: course.lessons }]
          : []
    return base.map((s) => ({
      ...s,
      lectures: s.lectures.map((l) => (completedIds.has(l.id) ? { ...l, isCompleted: true } : { ...l, isCompleted: false })),
    }))
  }, [course.courseSections, course.lessons, completedIds])

  const firstSectionId = sections[0]?.id ?? null
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => (firstSectionId ? new Set([firstSectionId]) : new Set()))
  const totalLectures = useMemo(() => sections.reduce((acc, s) => acc + s.lectures.length, 0), [sections])
  const totalMinutes = useMemo(() => sections.reduce((acc, s) => acc + sectionDurationMin(s.lectures), 0), [sections])

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    if (didInit.current || playlistItems.length === 0) return
    const resume = resumePlaylistItem(playlistItems)
    if (resume) {
      setSelectedItem(resume)
      setCurrentLectureId(resume.id)
    }
    didInit.current = true
  }, [playlistItems])

  const tabItem = selectedItem && itemMatchesTab(selectedItem, mainTab) ? selectedItem : null
  const tabLessonIndex = tabItem ? Math.max(0, playlistItems.findIndex((p) => p.id === tabItem.id)) : lessonIndex
  const showVideoStage = mainTab === "video" && !!tabItem
  const showLessonChrome = !!tabItem && (mainTab === "video" || !listBrowse)
  const isVideo = tabItem?.contentType === "upload-video" || tabItem?.contentType === "youtube-link"
  const ytId = tabItem?.contentType === "youtube-link" ? youtubeVideoId(tabItem.youtubeUrl) : null
  const isResume = !!(resumeItem && playlistItems.some((p) => p.isCompleted) && !resumeItem.isCompleted)
  const copy = completionCopy(tabItem?.contentType ?? selectedItem?.contentType)

  return (
    <Fragment>
      <Seo title={`${course.title} - Learn`} />
      {feedback && <CourseLearnToast message={feedback.message} tone={feedback.tone} />}
      {scheduleOpen && (
        <ScheduleLearningModal
          moduleId={moduleId}
          onClose={() => setScheduleOpen(false)}
          onSaved={(s) => setScheduleLabel(`Scheduled ${s.days.join(", ")} at ${s.time}`)}
        />
      )}

      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-14 px-4 lg:px-6 border-b border-[#d1d7dc] dark:border-white/10 bg-white dark:bg-[#1c1d1f]">
        <div className="flex items-center gap-3 min-w-0">
          <CourseHeaderBack href={`/courses/${moduleId}/`} label="Back to course overview" />
          <h1 className="truncate text-[0.9375rem] font-semibold">{course.title}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-[140px] max-w-[220px]" title={`${completedCount} of ${playlistItems.length} lessons done`}>
            <span className="text-[0.75rem] font-medium text-[#6a6f73] whitespace-nowrap">{completedCount}/{playlistItems.length || totalLectures}</span>
            <div className="flex-1 h-2 rounded-full bg-[#e4e8eb] dark:bg-white/20 overflow-hidden">
              <div className="h-full rounded-full bg-[#5624d0] dark:bg-primary transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, displayProgress))}%` }} />
            </div>
            <span className="text-[0.75rem] font-semibold w-8">{displayProgress}%</span>
          </div>
          {sidebarHidden && (
            <button
              type="button"
              onClick={() => setSidebarHidden(false)}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-sm text-[0.75rem] font-medium bg-[#1c1d1f] text-white dark:bg-white dark:text-[#1c1d1f] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1d1f]/40"
              aria-label="Show lesson list"
            >
              <i className="ti ti-layout-sidebar-right text-[0.875rem]" aria-hidden />
              <span className="hidden sm:inline">Show lesson list</span>
            </button>
          )}
          <div className="relative">
            <button type="button" onClick={handleShare} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-sm text-[0.75rem] font-medium text-[#1c1d1f] dark:text-white border border-[#1c1d1f]/25 dark:border-white/25 hover:bg-[#1c1d1f] hover:text-white dark:hover:bg-white dark:hover:text-[#1c1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1c1d1f]/40" aria-label="Share course link">
              <i className="ti ti-share text-[0.875rem]" aria-hidden />
              <span className="hidden sm:inline">Share</span>
            </button>
            {shareHint && <span className="absolute right-0 top-full mt-1 z-10 text-[0.75rem] bg-[#1c1d1f] text-white px-2 py-1 rounded-sm">Copied</span>}
          </div>
        </div>
      </header>

      {playlistItems.length === 0 ? (
        <EmptyCourseState />
      ) : (
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
        <div className="flex-1 flex flex-col min-w-0 bg-[#000] dark:bg-black">
          <LearnTypeTabs
            tabs={tabsWithContent}
            activeId={mainTab}
            counts={{
              video: itemsByTab.video.length,
              blog: itemsByTab.blog.length,
              quiz: itemsByTab.quiz.length,
              pdf: itemsByTab.pdf.length,
              essay: itemsByTab.essay.length,
            }}
            onSelect={(id) => {
              setMainTab(id)
              if (id === "quiz" || id === "pdf" || id === "essay" || id === "blog") {
                setListBrowse(true)
                return
              }
              setListBrowse(false)
              if (id === "overview") return
              const types = TAB_CONFIG.find((t) => t.id === id)?.contentTypes
              if (!types?.length) return
              const match = selectedItem && types.includes(selectedItem.contentType)
              if (!match) {
                const first = itemsByTab[id].find((item) => !lockedIds.has(item.id))
                if (first) applyItem(first, { scroll: id === "video", syncTab: false })
              }
            }}
          />
          <LearnOrientationBar
            selected={tabItem}
            mainTab={mainTab}
            listBrowse={listBrowse}
            lessonIndex={tabLessonIndex}
            total={playlistItems.length}
            completedCount={completedCount}
          />
          {showVideoStage && tabItem && (
          <div ref={playerRef} className={`relative w-full bg-[#1c1d1f] dark:bg-black flex flex-col ${isVideo ? "aspect-video" : "min-h-[4.5rem]"}`}>
            <LessonStage
              hidePlayer={false}
              isVideo={!!isVideo}
              selectedItem={tabItem}
              ytId={ytId}
              completing={completingId === tabItem.id}
              completeLabel={copy.complete}
              incompleteLabel={copy.incomplete}
              onComplete={() => markComplete(tabItem)}
              onIncomplete={() => markIncomplete(tabItem)}
              videoSlot={
                tabItem.contentType === "upload-video" && tabItem.videoFile?.url ? (
                  <UploadVideoPlayer
                    key={tabItem.id}
                    src={tabItem.videoFile.url}
                    title={tabItem.title}
                    isCompleted={!!tabItem.isCompleted}
                    onComplete={() => { if (!tabItem.isCompleted) markComplete(tabItem) }}
                    onMarkComplete={() => markComplete(tabItem)}
                    onMarkIncomplete={() => markIncomplete(tabItem)}
                    completing={completingId === tabItem.id}
                  />
                ) : null
              }
              youtubeSlot={
                tabItem.contentType === "youtube-link" && ytId ? (
                  <YouTubeVideoPlayer
                    key={tabItem.id}
                    videoId={ytId}
                    title={tabItem.title}
                    isCompleted={!!tabItem.isCompleted}
                    onComplete={() => { if (!tabItem.isCompleted) markComplete(tabItem) }}
                    onMarkComplete={() => markComplete(tabItem)}
                    onMarkIncomplete={() => markIncomplete(tabItem)}
                    completing={completingId === tabItem.id}
                  />
                ) : null
              }
            />
          </div>
          )}

          {showLessonChrome && tabItem && (
            <>
              <NextLessonBar next={nextItem} onNext={selectItem} isLast={!nextItem} />
              <div className="bg-white dark:bg-[#1c1d1f]">
                <LearnerNotesPanel studentId={studentId} moduleId={moduleId} playlistItemId={tabItem.id} lessonTitle={tabItem.title} />
              </div>
            </>
          )}

          <div className="flex-1 overflow-auto bg-white dark:bg-bodybg" data-learn-tab-scroller>
            {mainTab === "overview" && (
              <>
                {resumeItem && (
                  <ContinueLearningBanner
                    item={resumeItem}
                    isResume={isResume}
                    onContinue={() => openTabItem(resumeItem)}
                  />
                )}
                <CourseLearnOverview
                  course={course}
                  totalMinutes={totalMinutes}
                  totalLectures={totalLectures}
                  scheduleDismissed={scheduleDismissed}
                  savedScheduleLabel={scheduleLabel}
                  onGetStarted={() => setScheduleOpen(true)}
                  onDismissSchedule={() => setScheduleDismissed(true)}
                  descriptionExpanded={descriptionExpanded}
                  onToggleDescription={() => setDescriptionExpanded((v) => !v)}
                />
              </>
            )}
            {mainTab !== "overview" && (
              <CourseLearnTabBody
                mainTab={mainTab}
                listBrowse={listBrowse}
                selectedItem={selectedItem}
                itemsByTab={itemsByTab}
                completingId={completingId}
                studentId={studentId}
                moduleId={moduleId}
                playlistItems={playlistItems}
                onOpenItem={openTabItem}
                onPlayVideo={(item) => applyItem(item, { scroll: true })}
                onBrowseList={() => {
                  if (mainTab === "blog") {
                    setMainTab("overview")
                    setListBrowse(false)
                    return
                  }
                  setListBrowse(true)
                }}
                onToggleComplete={toggleComplete}
                onComplete={markComplete}
                onIncomplete={markIncomplete}
                onProgressUpdate={onLocalProgressUpdate}
              />
            )}
          </div>
        </div>

        <CourseLearnSidebar
          sections={sections}
          playlistItems={playlistItems}
          currentLectureId={currentLectureId}
          expandedSections={expandedSections}
          sidebarHidden={sidebarHidden}
          sidebarWide={sidebarWide}
          onToggleSection={toggleSection}
          onSelectLecture={selectLecture}
          onClose={() => setSidebarHidden(true)}
          onToggleWide={() => setSidebarWide((v) => !v)}
        />
      </div>
      )}
    </Fragment>
  )
}

export default React.memo(CourseLearnClient)
