'use client'

import React from 'react'

export type PlaylistItemMetaType = 'video' | 'youtube' | 'quiz' | 'pdf' | 'blog' | 'essay'

const CONTROL_CLASS =
  'form-control !h-10 !min-h-10 !max-h-10 !py-0 !leading-10 box-border w-full appearance-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary'

const LABEL_CLASS = 'form-label !mb-1.5 !h-5 !leading-5 block truncate text-[0.8rem]'

/**
 * Shared native-control class so Content Type, Title, Duration, and Difficulty share one height.
 */
export function playlistMetaControlClass(): string {
  return CONTROL_CLASS
}

type PlaylistItemMetaFieldsProps = {
  itemId: string
  type: PlaylistItemMetaType
  title: string
  duration?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  onChange: (field: 'type' | 'title' | 'duration' | 'difficulty', value: string) => void
}

/**
 * One aligned row: Content Type | Title | Duration | Difficulty (quiz only).
 */
export default function PlaylistItemMetaFields({
  itemId,
  type,
  title,
  duration,
  difficulty,
  onChange,
}: PlaylistItemMetaFieldsProps) {
  const isQuiz = type === 'quiz'

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-x-4 gap-y-3 items-end"
    >
      <div className="xl:col-span-3">
        <label className={LABEL_CLASS} htmlFor={`playlist-type-${itemId}`}>
          Content Type
        </label>
        <select
          id={`playlist-type-${itemId}`}
          className={CONTROL_CLASS}
          value={type}
          aria-label="Content type"
          onChange={(e) => onChange('type', e.target.value)}
        >
          <option value="video">Upload Video</option>
          <option value="youtube">YouTube Link</option>
          <option value="pdf">PDF / Document</option>
          <option value="blog">Blog</option>
          <option value="quiz">Quiz</option>
          <option value="essay">Q&A</option>
        </select>
      </div>
      <div className={isQuiz ? 'xl:col-span-4' : 'xl:col-span-6'}>
        <label className={LABEL_CLASS} htmlFor={`playlist-title-${itemId}`}>
          Title
        </label>
        <input
          id={`playlist-title-${itemId}`}
          type="text"
          className={CONTROL_CLASS}
          placeholder="Lesson title"
          value={title}
          aria-label="Lesson title"
          onChange={(e) => onChange('title', e.target.value)}
        />
      </div>
      <div className={isQuiz ? 'xl:col-span-2' : 'xl:col-span-3'}>
        <label className={LABEL_CLASS} htmlFor={`playlist-duration-${itemId}`}>
          Duration (min)
        </label>
        <input
          id={`playlist-duration-${itemId}`}
          type="text"
          inputMode="numeric"
          className={CONTROL_CLASS}
          placeholder="e.g. 10"
          value={duration || ''}
          aria-label="Duration in minutes"
          onChange={(e) => onChange('duration', e.target.value)}
        />
      </div>
      {isQuiz ? (
        <div className="xl:col-span-3">
          <label className={LABEL_CLASS} htmlFor={`playlist-difficulty-${itemId}`}>
            Difficulty
          </label>
          <select
            id={`playlist-difficulty-${itemId}`}
            className={CONTROL_CLASS}
            value={difficulty || 'medium'}
            aria-label="Quiz difficulty"
            onChange={(e) => onChange('difficulty', e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      ) : null}
    </div>
  )
}
