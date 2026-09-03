"use client"

import React from "react"
import type { PlaylistItemForLearn } from "@/shared/lib/api/student-courses"
import { buildLockedItemIds, emptyTabCopy, QUIZ_LOCKED_MESSAGE, type LearnTabId } from "./course-learn-helpers"
import { CourseLearnItemList, SelectedQuizPanel, SelectedEssayPanel, SelectedBlogPanel } from "./course-learn-panels"
import { LearnFocusPane } from "./course-learn-wayfinding"

interface TabLists {
  video: PlaylistItemForLearn[]
  blog: PlaylistItemForLearn[]
  quiz: PlaylistItemForLearn[]
  pdf: PlaylistItemForLearn[]
  essay: PlaylistItemForLearn[]
}

/**
 * Video list plus reading-mode panes for articles, quizzes, documents, and Q&A.
 */
export function CourseLearnTabBody({
  mainTab,
  listBrowse,
  selectedItem,
  itemsByTab,
  completingId,
  studentId,
  moduleId,
  playlistItems,
  onOpenItem,
  onPlayVideo,
  onBrowseList,
  onToggleComplete,
  onComplete,
  onIncomplete,
  onProgressUpdate,
}: {
  mainTab: LearnTabId
  listBrowse: boolean
  selectedItem: PlaylistItemForLearn | null
  itemsByTab: TabLists
  completingId: string | null
  studentId: string
  moduleId: string
  playlistItems: PlaylistItemForLearn[]
  onOpenItem: (item: PlaylistItemForLearn) => void
  onPlayVideo: (item: PlaylistItemForLearn) => void
  onBrowseList: () => void
  onToggleComplete: (item: PlaylistItemForLearn) => void
  onComplete: (item: PlaylistItemForLearn) => void
  onIncomplete: (item: PlaylistItemForLearn) => void
  onProgressUpdate: () => Promise<void>
}) {
  const lockedIds = React.useMemo(
    () => buildLockedItemIds(undefined, playlistItems),
    [playlistItems],
  )
  if (mainTab === "video") {
    return (
      <div className="max-w-[720px] mx-auto py-6 px-6">
        <h2 className="text-[1.125rem] font-bold mb-1">Videos</h2>
        <p className="text-[0.8125rem] text-[#6a6f73] mb-5">Watch in order, or jump from Course content on the right. Watch / Resume opens the player above.</p>
        <CourseLearnItemList
          items={itemsByTab.video}
          onSelect={onPlayVideo}
          emptyLabel={emptyTabCopy("video")}
          emptyIcon="ti-video-off"
          actionLabel={(item) => (item.isCompleted ? "Resume" : "Watch")}
          actionIcon="ti-player-play"
          kind="video"
        />
      </div>
    )
  }

  if (mainTab === "blog") {
    return (
      <LearnFocusPane
        reading={!listBrowse && selectedItem?.contentType === "blog"}
        focusKey={selectedItem?.id ?? "blog"}
        backLabel="Close article"
        onBack={onBrowseList}
        list={(
          <div className="max-w-[720px] mx-auto py-6 px-6">
            <h2 className="text-[1.125rem] font-bold mb-1">Articles</h2>
            <p className="text-[0.8125rem] text-[#6a6f73] mb-5">Open an article from Course content. Reading opens here.</p>
            <CourseLearnItemList
              items={itemsByTab.blog}
              onSelect={onOpenItem}
              emptyLabel={emptyTabCopy("blog")}
              emptyIcon="ti-article-off"
              actionLabel={(item) => (item.isCompleted ? "Open again" : "Read")}
              actionIcon="ti-article"
              kind="blog"
              onToggleComplete={onToggleComplete}
              completingId={completingId}
              activeId={selectedItem?.id}
            />
          </div>
        )}
      >
        {selectedItem?.contentType === "blog" && (
          <SelectedBlogPanel
            item={selectedItem}
            completing={completingId === selectedItem.id}
            onComplete={() => onComplete(selectedItem)}
            onIncomplete={() => onIncomplete(selectedItem)}
            nextItem={itemsByTab.blog.find((_, i, arr) => arr[i - 1]?.id === selectedItem.id) ?? null}
            onNext={onOpenItem}
          />
        )}
      </LearnFocusPane>
    )
  }

  if (mainTab === "quiz") {
    return (
      <LearnFocusPane
        reading={!listBrowse && selectedItem?.contentType === "quiz"}
        focusKey={selectedItem?.id ?? "quiz"}
        backLabel="All quizzes"
        onBack={onBrowseList}
        list={(
          <div className="max-w-[720px] mx-auto py-6 px-6">
            <h2 className="text-[1.125rem] font-bold mb-1">All quizzes</h2>
            <p className="text-[0.8125rem] text-[#6a6f73] mb-5">Start quiz opens here. Locked quizzes stay disabled until prior modules are complete.</p>
            <CourseLearnItemList
              items={itemsByTab.quiz}
              onSelect={onOpenItem}
              emptyLabel={emptyTabCopy("quiz")}
              emptyIcon="ti-clipboard-off"
              actionLabel={(item) => (item.isCompleted ? "Retake" : "Start quiz")}
              actionIcon="ti-clipboard-check"
              kind="quiz"
              activeId={selectedItem?.id}
              lockedIds={lockedIds}
              lockMessage={QUIZ_LOCKED_MESSAGE}
            />
          </div>
        )}
      >
        {selectedItem?.contentType === "quiz" && (
          <SelectedQuizPanel item={selectedItem} studentId={studentId} moduleId={moduleId} onProgressUpdate={onProgressUpdate} />
        )}
      </LearnFocusPane>
    )
  }

  if (mainTab === "pdf") {
    return (
      <LearnFocusPane
        reading={!listBrowse && selectedItem?.contentType === "pdf-document"}
        focusKey={selectedItem?.id ?? "pdf"}
        backLabel="All documents"
        onBack={onBrowseList}
        list={(
          <div className="max-w-[720px] mx-auto py-6 px-6">
            <h2 className="text-[1.125rem] font-bold mb-1">All documents</h2>
            <p className="text-[0.8125rem] text-[#6a6f73] mb-5">View opens the PDF on this tab. Mark complete when you&apos;re done.</p>
            <CourseLearnItemList
              items={itemsByTab.pdf}
              onSelect={onOpenItem}
              emptyLabel={emptyTabCopy("pdf")}
              emptyIcon="ti-file-off"
              actionLabel={() => "View"}
              actionIcon="ti-file-text"
              kind="pdf"
              activeId={selectedItem?.id}
            />
          </div>
        )}
      >
        {selectedItem?.contentType === "pdf-document" && selectedItem.pdfDocument?.url && (
          <div className="max-w-[720px] mx-auto py-6 px-6">
            <h2 className="text-[1.125rem] font-bold mb-4 leading-snug">{selectedItem.title}</h2>
            <a href={selectedItem.pdfDocument.url} target="_blank" rel="noopener noreferrer" className="ti-btn ti-btn-outline-primary mb-4 min-h-11">Open document in a new tab</a>
            <iframe title={selectedItem.title} src={selectedItem.pdfDocument.url} className="w-full min-h-[480px] rounded-xl border border-[#d1d7dc] dark:border-white/10" />
          </div>
        )}
      </LearnFocusPane>
    )
  }

  if (mainTab === "essay") {
    return (
      <LearnFocusPane
        reading={!listBrowse && selectedItem?.contentType === "essay"}
        focusKey={selectedItem?.id ?? "essay"}
        backLabel="All Q&A"
        onBack={onBrowseList}
        list={(
          <div className="max-w-[720px] mx-auto py-6 px-6">
            <h2 className="text-[1.125rem] font-bold mb-1">All Q&A</h2>
            <p className="text-[0.8125rem] text-[#6a6f73] mb-5">Start opens this Q&amp;A on the tab.</p>
            <CourseLearnItemList
              items={itemsByTab.essay}
              onSelect={onOpenItem}
              emptyLabel={emptyTabCopy("essay")}
              emptyIcon="ti-message-off"
              actionLabel={(item) => (item.isCompleted ? "View answers" : "Start Q&A")}
              actionIcon="ti-message-dots"
              kind="essay"
              activeId={selectedItem?.id}
            />
          </div>
        )}
      >
        {selectedItem?.contentType === "essay" && (
          <SelectedEssayPanel
            item={selectedItem}
            studentId={studentId}
            moduleId={moduleId}
            playlistItems={playlistItems}
            onSelectItem={onOpenItem}
            onProgressUpdate={onProgressUpdate}
          />
        )}
      </LearnFocusPane>
    )
  }

  return null
}
