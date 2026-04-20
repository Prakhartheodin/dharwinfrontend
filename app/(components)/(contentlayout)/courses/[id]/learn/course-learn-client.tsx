"use client"

/**
 * Course learn page – tabs match training module content types: Overview, Video, Blog, Quiz, PDF, Q&A.
 */
import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useState, useMemo, useRef, useEffect } from "react"
import Link from "next/link"
import type { Course, CourseSection, CourseLesson } from "@/shared/data/training/courses-data"
import type { PlaylistItemForLearn, PlaylistItemContentType } from "@/shared/lib/api/student-courses"
import {
  markCourseItemComplete,
  updateLastAccessed,
  submitQuizAttempt,
  getQuizResults,
  submitEssayAttempt,
  type QuizSubmitAnswer,
  type QuizResultsResponse,
} from "@/shared/lib/api/student-courses"
import { sanitizeRichHtml } from "@/shared/lib/sanitize-html"

function sectionDurationMin(lectures: CourseLesson[]): number {
  let total = 0
  lectures.forEach((l) => {
    const d = l.duration
    if (!d) return
    const hr = d.match(/(\d+)\s*hr/)
    const min = d.match(/(\d+)\s*min/)
    if (hr) total += parseInt(hr[1], 10) * 60
    if (min) total += parseInt(min[1], 10)
  })
  return total
}

function formatDuration(min: number): string {
  if (min >= 60) return `${Math.floor(min / 60)}hr ${min % 60}min`
  return `${min}min`
}

/** Extract YouTube video ID from url (youtube.com/watch?v=ID or youtu.be/ID). */
function youtubeVideoId(url: string | undefined): string | null {
  if (!url?.trim()) return null
  const u = url.trim()
  const m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

interface QuizQuestion {
  questionText?: string
  allowMultipleAnswers?: boolean
  options?: { text?: string; isCorrect?: boolean }[]
}

/** Deduplicate options by text – keeps first occurrence. */
function dedupeOptions<T extends { text?: string }>(options: T[]): T[] {
  const seen = new Set<string>()
  return options.filter((opt) => {
    const key = (opt.text ?? "").trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function QuizRenderer({
  quiz,
  playlistItemId,
  studentId,
  moduleId,
  isCompleted,
  onProgressUpdate,
}: {
  quiz: unknown
  playlistItemId: string
  studentId: string
  moduleId: string
  isCompleted?: boolean
  onProgressUpdate: () => Promise<void>
}) {
  const q = quiz as { questions?: QuizQuestion[] } | null | undefined
  const questions = useMemo(
    () =>
      (q?.questions ?? []).map((question) => ({
        ...question,
        options: dedupeOptions(question.options ?? []),
      })),
    [q?.questions]
  )
  const [selected, setSelected] = useState<Record<number, number[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ percentage: number; correctAnswers: number; totalQuestions: number } | null>(null)
  const [quizResults, setQuizResults] = useState<QuizResultsResponse | null>(null)

  const setOption = (qidx: number, oidx: number, multiple: boolean) => {
    setSelected((prev) => {
      const next = { ...prev }
      const current = next[qidx] ?? []
      if (multiple) {
        const nextOpts = current.includes(oidx) ? current.filter((i) => i !== oidx) : [...current, oidx]
        next[qidx] = nextOpts
      } else {
        next[qidx] = [oidx]
      }
      return next
    })
  }

  const handleSubmit = async () => {
    const answers: QuizSubmitAnswer[] = questions.map((_, qidx) => ({
      questionIndex: qidx,
      selectedOptions: selected[qidx] ?? [],
    }))
    setSubmitting(true)
    setResult(null)
    setQuizResults(null)
    try {
      const res = await submitQuizAttempt(studentId, moduleId, playlistItemId, {
        answers,
        timeSpent: 0,
      })
      const score = res.score
      if (score) {
        setResult({ percentage: score.percentage, correctAnswers: score.correctAnswers, totalQuestions: score.totalQuestions })
        if (score.percentage >= 90) await onProgressUpdate()
        try {
          const results = await getQuizResults(studentId, moduleId, playlistItemId)
          setQuizResults(results)
        } catch {
          // Results optional for detailed view
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (questions.length === 0) {
    return <p className="text-[#6a6f73] dark:text-white/60">No questions in this quiz.</p>
  }
  if (isCompleted) {
    return <p className="text-emerald-600 dark:text-emerald-400 font-medium">You've completed this quiz.</p>
  }

  const showDetailedResults = result !== null && quizResults !== null

  return (
    <div className="space-y-6">
      {result !== null && (
        <div className={`rounded-lg p-4 ${result.percentage >= 90 ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300"}`}>
          <p className="font-semibold">{result.percentage >= 90 ? "Passed!" : "Not yet — you need 90% to pass."}</p>
          <p className="text-[0.875rem] mt-1">Score: {result.correctAnswers}/{result.totalQuestions} ({result.percentage}%)</p>
        </div>
      )}
      {showDetailedResults && quizResults && (
        <div className="space-y-4">
          <p className="font-semibold text-[#1c1d1f] dark:text-white">Review your answers</p>
          {quizResults.quiz.questions.map((question, qidx) => {
            const correct = question.isCorrect
            return (
              <div
                key={qidx}
                className={`rounded-lg border p-4 ${correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="font-medium text-[#1c1d1f] dark:text-white">
                    {qidx + 1}. {question.questionText ?? "Question"}
                  </p>
                  <span
                    className={`shrink-0 badge ${correct ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-red-500/20 text-red-700 dark:text-red-300"}`}
                  >
                    {correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <div className="space-y-2">
                  {dedupeOptions(question.options).map((opt, oidx) => {
                    const isCorrectOption = opt.isCorrect
                    const isStudentSelected = (opt as { isSelected?: boolean }).isSelected
                    let style = "p-2 rounded text-[0.9375rem] text-[#1c1d1f] dark:text-white"
                    if (isCorrectOption) {
                      style += " bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                    } else if (isStudentSelected) {
                      style += " bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-200"
                    } else {
                      style += " border border-transparent"
                    }
                    return (
                      <div key={oidx} className={style}>
                        <span className="mr-2">{isCorrectOption ? "✓" : isStudentSelected ? "✗" : ""}</span>
                        {opt.text ?? ""}
                        {isCorrectOption && <span className="ml-1 text-[0.75rem] opacity-80">(Correct answer)</span>}
                        {isStudentSelected && !isCorrectOption && <span className="ml-1 text-[0.75rem] opacity-80">(Your choice)</span>}
                      </div>
                    )
                  })}
                </div>
                {!correct && question.explanation && (
                  <p className="mt-3 text-[0.875rem] text-[#6a6f73] dark:text-white/70 italic border-l-2 border-primary/50 pl-3">
                    {question.explanation}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
      {!showDetailedResults && (
        <>
          {questions.map((question, qidx) => (
            <div key={qidx} className="rounded-lg border border-[#d1d7dc] dark:border-white/10 p-4">
              <p className="font-medium text-[#1c1d1f] dark:text-white mb-3">
                {qidx + 1}. {question.questionText ?? "Question"}
              </p>
              <div className="space-y-2">
                {(question.options ?? []).map((opt, oidx) => (
                  <label key={oidx} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-[#f7f9fa] dark:hover:bg-white/5">
                    <input
                      type={question.allowMultipleAnswers ? "checkbox" : "radio"}
                      name={`q-${qidx}`}
                      className="rounded border-defaultborder"
                      checked={(selected[qidx] ?? []).includes(oidx)}
                      onChange={() => setOption(qidx, oidx, !!question.allowMultipleAnswers)}
                    />
                    <span className="text-[0.9375rem] text-[#1c1d1f] dark:text-white">{opt.text ?? ""}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="ti-btn ti-btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit quiz"}
          </button>
        </>
      )}
    </div>
  )
}

function EssayRenderer({
  essay,
  playlistItemId,
  studentId,
  moduleId,
  isCompleted,
  onProgressUpdate,
}: {
  essay: unknown
  playlistItemId: string
  studentId: string
  moduleId: string
  isCompleted?: boolean
  onProgressUpdate: () => Promise<void>
}) {
  const e = essay as { questions?: { questionText?: string; expectedAnswer?: string }[] } | null
  const questions = e?.questions ?? []
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{
    percentage: number
    totalQuestions: number
    correctAnswers?: number
    answers?: {
      questionIndex: number
      score?: number
      feedback?: string
      rubric?: { accuracy?: number; completeness?: number; clarity?: number; criticalThinking?: number }
      suggestions?: string
    }[]
  } | null>(null)

  if (questions.length === 0) return <p className="text-[#6a6f73] dark:text-white/60">No Q&A questions.</p>

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const attempt = (await submitEssayAttempt(studentId, moduleId, playlistItemId, {
        answers: questions.map((_, i) => ({ questionIndex: i, typedAnswer: answers[i] ?? "" })),
      })) as {
        score?: { percentage?: number; totalQuestions?: number; correctAnswers?: number }
        answers?: { questionIndex: number; score?: number; feedback?: string }[]
      }
      setSubmitted(true)
      if (attempt?.score?.percentage != null) {
        setResult({
          percentage: attempt.score.percentage,
          totalQuestions: attempt.score.totalQuestions ?? questions.length,
          correctAnswers: attempt.score.correctAnswers,
          answers: (attempt as { answers?: { questionIndex: number; score?: number; feedback?: string; rubric?: Record<string, number>; suggestions?: string }[] }).answers,
        })
      }
      await onProgressUpdate()
    } finally {
      setSubmitting(false)
    }
  }

  if (isCompleted || submitted) {
    return (
      <div className="space-y-4">
        <p className="text-emerald-600 dark:text-emerald-400 font-medium">Q&A submitted.</p>
        {result && (
          <div className="p-4 rounded-lg border border-defaultborder bg-black/5 dark:bg-white/5">
            <div className="text-[1rem] font-semibold text-[#1c1d1f] dark:text-white mb-2">
              Score: {result.percentage}%
            </div>
            {result.answers?.map((a) => {
              const q = questions[a.questionIndex]
              if (!q) return null
              const hasContent = a.score != null || a.feedback || a.rubric || a.suggestions
              if (!hasContent) return null
              return (
                <div key={a.questionIndex} className="mt-3 text-[0.875rem]">
                  <p className="font-medium text-[#1c1d1f] dark:text-white">
                    Q{a.questionIndex + 1}: {a.score != null ? `${a.score}/100` : "—"}
                  </p>
                  {a.feedback && (
                    <p className="text-[#6a6f73] dark:text-white/70 mt-1">{a.feedback}</p>
                  )}
                  {a.rubric && typeof a.rubric === "object" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        ["accuracy", "Accuracy"],
                        ["completeness", "Completeness"],
                        ["clarity", "Clarity"],
                        ["criticalThinking", "Critical thinking"],
                      ].map(([key, label]) => {
                        const v = (a.rubric as Record<string, number>)?.[key]
                        if (v == null) return null
                        return (
                          <span key={key} className="badge bg-primary/10 text-primary">
                            {label}: {v}/25
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {a.suggestions && (
                    <p className="text-primary/90 dark:text-primary/80 mt-1.5 italic">{a.suggestions}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={i} className="space-y-2">
          <p className="font-medium text-[#1c1d1f] dark:text-white">
            {i + 1}. {q.questionText ?? ""}
          </p>
          <textarea
            className="form-control w-full rounded border border-[#d1d7dc] dark:border-white/20 bg-white dark:bg-white/5 text-[#1c1d1f] dark:text-white p-3"
            rows={6}
            placeholder="Type your answer..."
            value={answers[i] ?? ""}
            onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
          />
        </div>
      ))}
      <button
        type="button"
        className="ti-btn ti-btn-primary"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Submitting…" : "Submit Q&A"}
      </button>
    </div>
  )
}

type LearnTabId = "overview" | "video" | "blog" | "quiz" | "pdf" | "essay"

const TAB_CONFIG: { id: LearnTabId; label: string; icon: string; contentTypes?: PlaylistItemContentType[] }[] = [
  { id: "overview", label: "Overview", icon: "ti-layout-dashboard" },
  { id: "video", label: "Video", icon: "ti-player-play", contentTypes: ["upload-video", "youtube-link"] },
  { id: "blog", label: "Blog", icon: "ti-article", contentTypes: ["blog"] },
  { id: "quiz", label: "Quiz", icon: "ti-clipboard-check", contentTypes: ["quiz"] },
  { id: "pdf", label: "PDF", icon: "ti-file-text", contentTypes: ["pdf-document"] },
  { id: "essay", label: "Q&A", icon: "ti-message-dots", contentTypes: ["essay"] },
]

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement | string, opts: unknown) => YTPlayer; PlayerState?: { ENDED: number; PLAYING: number; PAUSED: number } }
    onYouTubeIframeAPIReady?: () => void
  }
}
interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeek: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  setPlaybackRate: (rate: number) => void
  getPlaybackRate: () => number
  getVolume: () => number
  setVolume: (vol: number) => void
  mute: () => void
  unMute: () => void
  destroy?: () => void
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

const WATCH_THRESHOLD = 0.9 // Mark complete when 90% of video has been played (only counting actual play time)

function UploadVideoPlayer({
  src,
  title,
  isCompleted,
  onComplete,
  onMarkComplete,
  completing,
}: {
  src: string
  title: string
  isCompleted: boolean
  onComplete: () => void
  onMarkComplete: () => void
  completing: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const accumulatedPlayedRef = useRef(0)
  const lastTickRef = useRef(0)
  const completionReportedRef = useRef(false)

  const video = videoRef.current

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
    v.playbackRate = playbackRate
  }, [volume, playbackRate])

  // Track only time the video was actually playing; auto-complete at 90%
  useEffect(() => {
    if (isCompleted || completionReportedRef.current) return
    if (!isPlaying || duration <= 0) {
      lastTickRef.current = 0
      return
    }
    lastTickRef.current = lastTickRef.current || Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      accumulatedPlayedRef.current += (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      if (duration > 0 && accumulatedPlayedRef.current >= WATCH_THRESHOLD * duration) {
        completionReportedRef.current = true
        onComplete()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [isPlaying, duration, isCompleted, onComplete])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    const t = parseFloat(e.target.value)
    if (v && Number.isFinite(t)) {
      v.currentTime = t
      setCurrentTime(t)
    }
  }

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex flex-col">
      <video
        ref={videoRef}
        src={src}
        className="w-full flex-1 object-contain"
        playsInline
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (!completionReportedRef.current) {
            completionReportedRef.current = true
            onComplete()
          }
        }}
        onClick={togglePlay}
      />
      <div className="flex flex-col shrink-0 bg-black/80 text-white">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          step={0.1}
          onChange={handleSeek}
          className="w-full h-1.5 accent-primary cursor-pointer"
          aria-label="Seek"
        />
        <div className="flex items-center gap-2 px-3 py-2">
          <button type="button" onClick={togglePlay} className="p-1.5 rounded hover:bg-white/10" aria-label={isPlaying ? "Pause" : "Play"}>
            <i className={`ti ti-${isPlaying ? "player-pause" : "player-play"} text-[1.25rem]`} />
          </button>
          <span className="text-[0.75rem] tabular-nums min-w-[4.5rem]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="flex items-center gap-1 w-20">
            <button
              type="button"
              onClick={() => {
                const v = videoRef.current
                if (v) {
                  if (volume > 0) {
                    v.volume = 0
                    setVolume(0)
                  } else {
                    v.volume = 1
                    setVolume(1)
                  }
                }
              }}
              className="p-1 rounded hover:bg-white/10"
              aria-label={volume > 0 ? "Mute" : "Unmute"}
            >
              <i className={`ti ti-${volume > 0 ? "volume" : "volume-off"} text-[1rem]`} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                setVolume(val)
                if (videoRef.current) videoRef.current.volume = val
              }}
              className="flex-1 h-1 accent-primary cursor-pointer"
              aria-label="Volume"
            />
          </div>
          <div className="flex-1 min-w-0" />
          <div className="relative">
            <button type="button" onClick={() => setShowSpeedMenu((s) => !s)} className="px-2 py-1 text-[0.75rem] rounded hover:bg-white/10" aria-label="Playback speed">
              {playbackRate}x
            </button>
            {showSpeedMenu && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setShowSpeedMenu(false)} />
                <div className="absolute bottom-full left-0 mb-1 py-1 bg-[#1c1d1f] rounded shadow-lg z-20 min-w-[4rem]">
                  {SPEED_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setPlaybackRate(s)
                        if (videoRef.current) videoRef.current.playbackRate = s
                        setShowSpeedMenu(false)
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-[0.75rem] hover:bg-white/10 ${playbackRate === s ? "bg-primary/30" : ""}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={toggleFullscreen} className="p-1.5 rounded hover:bg-white/10" aria-label="Fullscreen">
            <i className={`ti ti-${isFullscreen ? "arrows-minimize" : "arrows-maximize"} text-[1rem]`} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 pb-2">
          <span className="text-[0.8125rem] font-medium truncate">{title}</span>
          {isCompleted ? (
            <span className="text-emerald-400 text-[0.75rem] shrink-0">Completed</span>
          ) : (
            <button
              type="button"
              onClick={onMarkComplete}
              disabled={completing}
              className="shrink-0 px-3 py-1 rounded bg-primary text-white text-[0.75rem] font-medium hover:opacity-90 disabled:opacity-60"
            >
              {completing ? "Saving…" : "Mark as complete"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function YouTubeVideoPlayer({
  videoId,
  title,
  isCompleted,
  onComplete,
  onMarkComplete,
  completing,
}: {
  videoId: string
  title: string
  isCompleted: boolean
  onComplete: () => void
  onMarkComplete: () => void
  completing: boolean
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [apiReady, setApiReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const accumulatedPlayedRef = useRef(0)
  const lastTickRef = useRef(0)
  const completionReportedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.YT?.Player) {
      setApiReady(true)
      return
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true)
      prev?.()
    }
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return
    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!apiReady || !videoId || !playerContainerRef.current) return
    const el = playerContainerRef.current
    const player = new window.YT!.Player(el, {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        enablejsapi: 1,
        rel: 0,
        modestbranding: 1,
        controls: 0, // Hide YouTube's native controls; we use our own bar (seek, speed, volume)
        iv_load_policy: 3, // Hide video annotations
        // Note: YouTube no longer allows fully hiding "More videos"; we cover the strip with an overlay below
      },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          playerRef.current = e.target
        },
        onStateChange: (e: { data: number }) => {
          const YT = window.YT
          if (YT?.PlayerState) {
            if (e.data === YT.PlayerState.PLAYING) setIsPlaying(true)
            if (e.data === YT.PlayerState.PAUSED) setIsPlaying(false)
            if (e.data === YT.PlayerState.ENDED) {
              if (!completionReportedRef.current) {
                completionReportedRef.current = true
                onCompleteRef.current()
              }
            }
          }
        },
      },
    })
    return () => {
      try {
        const p = playerRef.current
        if (p?.destroy) p.destroy()
      } catch {}
      playerRef.current = null
    }
  }, [apiReady, videoId])

  useEffect(() => {
    if (!playerRef.current) return
    const tick = () => {
      const p = playerRef.current
      if (!p) return
      try {
        const t = p.getCurrentTime()
        const d = p.getDuration()
        if (Number.isFinite(t)) setCurrentTime(t)
        if (Number.isFinite(d) && d > 0) setDuration(d)
        // Track only time actually playing; auto-complete at 90%
        if (isPlaying && d > 0) {
          const now = Date.now()
          if (lastTickRef.current > 0) accumulatedPlayedRef.current += (now - lastTickRef.current) / 1000
          lastTickRef.current = now
          if (accumulatedPlayedRef.current >= WATCH_THRESHOLD * d && !completionReportedRef.current) {
            completionReportedRef.current = true
            onCompleteRef.current()
          }
        } else {
          lastTickRef.current = 0
        }
      } catch {}
    }
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [apiReady, videoId, isPlaying])

  const togglePlay = () => {
    const p = playerRef.current
    if (!p) return
    if (isPlaying) p.pauseVideo()
    else p.playVideo()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = playerRef.current
    const t = parseFloat(e.target.value)
    if (p && Number.isFinite(t)) {
      p.seekTo(t, true)
      setCurrentTime(t)
    }
  }

  const toggleFullscreen = () => {
    const el = wrapperRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  return (
    <div ref={wrapperRef} className="relative w-full h-full bg-black flex flex-col">
      <div className="relative flex-1 min-h-0 w-full">
        <div ref={playerContainerRef} className="absolute inset-0 w-full h-full" />
        {/* Overlay to hide YouTube's "More videos" suggestion strip (YouTube doesn't allow disabling it via API) */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 bg-black pointer-events-auto z-10"
          aria-hidden
        />
      </div>
      <div className="flex flex-col shrink-0 bg-black/80 text-white">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          step={0.1}
          onChange={handleSeek}
          className="w-full h-1.5 accent-primary cursor-pointer"
          aria-label="Seek"
        />
        <div className="flex items-center gap-2 px-3 py-2">
          <button type="button" onClick={togglePlay} className="p-1.5 rounded hover:bg-white/10" aria-label={isPlaying ? "Pause" : "Play"}>
            <i className={`ti ti-${isPlaying ? "player-pause" : "player-play"} text-[1.25rem]`} />
          </button>
          <span className="text-[0.75rem] tabular-nums min-w-[4.5rem]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="flex items-center gap-1 w-20">
            <button
              type="button"
              onClick={() => {
                const p = playerRef.current
                if (p) {
                  if (volume > 0) {
                    p.mute()
                    setVolume(0)
                  } else {
                    p.unMute()
                    setVolume(100)
                  }
                }
              }}
              className="p-1 rounded hover:bg-white/10"
              aria-label={volume > 0 ? "Mute" : "Unmute"}
            >
              <i className={`ti ti-${volume > 0 ? "volume" : "volume-off"} text-[1rem]`} />
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                setVolume(val)
                const p = playerRef.current
                if (p) p.setVolume(val)
              }}
              className="flex-1 h-1 accent-primary cursor-pointer"
              aria-label="Volume"
            />
          </div>
          <div className="flex-1 min-w-0" />
          <div className="relative">
            <button type="button" onClick={() => setShowSpeedMenu((s) => !s)} className="px-2 py-1 text-[0.75rem] rounded hover:bg-white/10" aria-label="Playback speed">
              {playbackRate}x
            </button>
            {showSpeedMenu && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setShowSpeedMenu(false)} />
                <div className="absolute bottom-full left-0 mb-1 py-1 bg-[#1c1d1f] rounded shadow-lg z-20 min-w-[4rem]">
                  {SPEED_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setPlaybackRate(s)
                        const p = playerRef.current
                        if (p) p.setPlaybackRate(s)
                        setShowSpeedMenu(false)
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-[0.75rem] hover:bg-white/10 ${playbackRate === s ? "bg-primary/30" : ""}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={toggleFullscreen} className="p-1.5 rounded hover:bg-white/10" aria-label="Fullscreen">
            <i className={`ti ti-${isFullscreen ? "arrows-minimize" : "arrows-maximize"} text-[1rem]`} />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 pb-2">
          <span className="text-[0.8125rem] font-medium truncate">{title}</span>
          {isCompleted ? (
            <span className="text-emerald-400 text-[0.75rem] shrink-0">Completed</span>
          ) : (
            <button
              type="button"
              onClick={onMarkComplete}
              disabled={completing}
              className="shrink-0 px-3 py-1 rounded bg-primary text-white text-[0.75rem] font-medium hover:opacity-90 disabled:opacity-60"
            >
              {completing ? "Saving…" : "I've finished watching"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface CourseLearnClientProps {
  course: Course
  studentId: string
  moduleId: string
  onProgressUpdate: () => Promise<void>
}

export default function CourseLearnClient({ course, studentId, moduleId, onProgressUpdate }: CourseLearnClientProps) {
  const playlistItems = (course as Course & { playlistItems?: PlaylistItemForLearn[] }).playlistItems ?? []
  const [currentLectureId, setCurrentLectureId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<PlaylistItemForLearn | null>(null)
  const [mainTab, setMainTab] = useState<LearnTabId>("overview")
  const [scheduleDismissed, setScheduleDismissed] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [completingId, setCompletingId] = useState<string | null>(null)

  const selectLecture = (lectureId: string) => {
    setCurrentLectureId(lectureId)
    const item = playlistItems.find((p) => p.id === lectureId) ?? null
    setSelectedItem(item)
    if (item && studentId && moduleId) {
      updateLastAccessed(studentId, moduleId, item.id).catch(() => {})
    }
  }

  const selectItem = (item: PlaylistItemForLearn) => {
    setSelectedItem(item)
    setCurrentLectureId(item.id)
    if (studentId && moduleId) {
      updateLastAccessed(studentId, moduleId, item.id).catch(() => {})
    }
  }

  const markComplete = async (item: PlaylistItemForLearn) => {
    if (item.isCompleted || completingId) return
    setCompletingId(item.id)
    try {
      await markCourseItemComplete(studentId, moduleId, item.id, item.contentType)
      await onProgressUpdate()
    } finally {
      setCompletingId(null)
    }
  }

  const tabsWithContent = useMemo(() => {
    return TAB_CONFIG.filter((t) => {
      if (t.id === "overview") return true
      if (!t.contentTypes?.length) return false
      return playlistItems.some((p) => t.contentTypes!.includes(p.contentType))
    })
  }, [playlistItems])

  const itemsByTab = useMemo(() => {
    const byTab: Record<LearnTabId, PlaylistItemForLearn[]> = {
      overview: [],
      video: playlistItems.filter((p) => p.contentType === "upload-video" || p.contentType === "youtube-link"),
      blog: playlistItems.filter((p) => p.contentType === "blog"),
      quiz: playlistItems.filter((p) => p.contentType === "quiz"),
      pdf: playlistItems.filter((p) => p.contentType === "pdf-document"),
      essay: playlistItems.filter((p) => p.contentType === "essay"),
    }
    return byTab
  }, [playlistItems])

  const sections: CourseSection[] = useMemo(() => {
    if (course.courseSections?.length) return course.courseSections
    if (course.lessons?.length) {
      return [{ id: "default", title: "Course content", lectures: course.lessons }]
    }
    return []
  }, [course.courseSections, course.lessons])

  const firstSectionId = sections[0]?.id ?? null
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => (firstSectionId ? new Set([firstSectionId]) : new Set()))

  const totalLectures = useMemo(() => sections.reduce((acc, s) => acc + s.lectures.length, 0), [sections])
  const totalMinutes = useMemo(
    () => sections.reduce((acc, s) => acc + sectionDurationMin(s.lectures), 0),
    [sections]
  )

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // On first load, auto-select the first item so content shows immediately
  useEffect(() => {
    if (playlistItems.length > 0 && selectedItem === null && currentLectureId === null) {
      const first = playlistItems[0]
      setSelectedItem(first)
      setCurrentLectureId(first.id)
      if (studentId && moduleId) {
        updateLastAccessed(studentId, moduleId, first.id).catch(() => {})
      }
    }
  }, [playlistItems, studentId, moduleId, selectedItem, currentLectureId])

  return (
    <Fragment>
      <Seo title={`${course.title} - Learn`} />

      {/* Top bar: course title, Your progress, Share, More */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 h-14 px-4 lg:px-6 border-b border-[#d1d7dc] dark:border-white/10 bg-white dark:bg-[#1c1d1f]">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/courses/" className="text-[#5624d0] dark:text-primary shrink-0 font-bold text-[0.9375rem] hidden sm:block">
            Courses
          </Link>
          <span className="text-[#6a6f73] dark:text-white/50 hidden sm:inline">/</span>
          <h1 className="truncate text-[0.9375rem] font-semibold text-[#1c1d1f] dark:text-white">
            {course.title}
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-[120px] max-w-[180px]">
            <span className="text-[0.75rem] font-medium text-[#6a6f73] dark:text-white/70 whitespace-nowrap">Your progress</span>
            <div className="flex-1 h-2 rounded-full bg-[#e4e8eb] dark:bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#5624d0] dark:bg-primary transition-[width]"
                style={{ width: `${Math.min(100, Math.max(0, course.progress ?? 0))}%` }}
              />
            </div>
            <span className="text-[0.75rem] font-semibold text-[#1c1d1f] dark:text-white w-8">{course.progress ?? 0}%</span>
          </div>
          <button type="button" className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#1c1d1f] dark:text-white" aria-label="Share">
            <i className="ti ti-share text-[1.125rem]" />
          </button>
          <button type="button" className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10 text-[#1c1d1f] dark:text-white" aria-label="More options">
            <i className="ti ti-dots-vertical text-[1.125rem]" />
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
        {/* Left: video + tabs + main body (this content scrolls the page; sidebar stays fixed) */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#000] dark:bg-black">
          {/* Content viewer: video / blog / quiz / PDF / Q&A based on selected sidebar item */}
          <div className="relative w-full aspect-video bg-[#1c1d1f] dark:bg-black flex flex-col">
            {!selectedItem && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1c1d1f]">
                <div className="text-center text-white/90 px-4">
                  <p className="text-[1.25rem] font-semibold mb-2">What you&apos;ll learn in this course</p>
                  <p className="text-[0.875rem] text-white/70 mb-4">Select an item from Course content on the right to start</p>
                  <span className="inline-flex w-12 h-12 rounded-full border-2 border-white/50 items-center justify-center">
                    <i className="ti ti-player-play text-[1.5rem] ml-0.5 text-white/70" />
                  </span>
                </div>
              </div>
            )}
            {selectedItem?.contentType === "upload-video" && selectedItem.videoFile?.url && (
              <UploadVideoPlayer
                key={selectedItem.id}
                src={selectedItem.videoFile.url}
                title={selectedItem.title}
                isCompleted={selectedItem.isCompleted}
                onComplete={() => {
                  if (!selectedItem.isCompleted) markComplete(selectedItem)
                }}
                onMarkComplete={() => markComplete(selectedItem)}
                completing={completingId === selectedItem.id}
              />
            )}
            {selectedItem?.contentType === "youtube-link" && (() => {
              const vid = youtubeVideoId(selectedItem.youtubeUrl)
              return vid ? (
                <YouTubeVideoPlayer
                  key={selectedItem.id}
                  videoId={vid}
                  title={selectedItem.title}
                  isCompleted={selectedItem.isCompleted}
                  onComplete={() => {
                    if (!selectedItem.isCompleted) markComplete(selectedItem)
                  }}
                  onMarkComplete={() => markComplete(selectedItem)}
                  completing={completingId === selectedItem.id}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2 p-4">
                  <p className="text-white/90 font-medium text-center">{selectedItem.title}</p>
                  {selectedItem.youtubeUrl && (
                    <a href={selectedItem.youtubeUrl} target="_blank" rel="noopener noreferrer" className="ti-btn ti-btn-sm ti-btn-primary">
                      Open YouTube link
                    </a>
                  )}
                </div>
              )
            })()}
            {selectedItem?.contentType === "blog" && (
              <div className="absolute inset-0 overflow-auto bg-white dark:bg-[#1c1d1f] p-4 lg:p-6 pr-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 overflow-visible">
                  <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white truncate min-w-0">{selectedItem.title}</h2>
                  <div className="flex items-center shrink-0 min-w-[8.5rem]">
{!selectedItem.isCompleted ? (
                    <button
                      type="button"
                      onClick={() => markComplete(selectedItem)}
                      disabled={!!completingId}
                      className="inline-flex items-center justify-center shrink-0 px-3 py-1.5 rounded bg-primary text-white text-[0.8125rem] font-medium whitespace-nowrap outline-offset-2 transition-opacity duration-200 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-primary dark:text-white"
                    >
                      {completingId === selectedItem.id ? "Saving…" : "Mark as complete"}
                    </button>
                  ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 text-[0.8125rem] font-medium whitespace-nowrap">Completed</span>
                    )}
                  </div>
                </div>
                {selectedItem.blogContent ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-[0.9375rem] text-[#1c1d1f] dark:text-white/90" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(selectedItem.blogContent) }} />
                ) : (
                  <p className="text-[#6a6f73] dark:text-white/60">No content available.</p>
                )}
              </div>
            )}
            {selectedItem?.contentType === "quiz" && (
              <div className="absolute inset-0 overflow-auto bg-white dark:bg-[#1c1d1f] p-4 lg:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">{selectedItem.title}</h2>
                  {selectedItem.difficulty && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        selectedItem.difficulty === "easy"
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : selectedItem.difficulty === "hard"
                            ? "bg-red-500/20 text-red-600 dark:text-red-400"
                            : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {selectedItem.difficulty}
                    </span>
                  )}
                </div>
                <QuizRenderer
                  quiz={selectedItem.quiz}
                  playlistItemId={selectedItem.id}
                  studentId={studentId}
                  moduleId={moduleId}
                  isCompleted={selectedItem.isCompleted}
                  onProgressUpdate={onProgressUpdate}
                />
              </div>
            )}
            {selectedItem?.contentType === "pdf-document" && (
              <div className="absolute inset-0 flex flex-col bg-white dark:bg-[#1c1d1f]">
                <div className="flex flex-col gap-2 pl-4 pr-6 py-3 border-b border-[#d1d7dc] dark:border-white/10 shrink-0 bg-white dark:bg-[#1c1d1f]">
                  <h2 className="text-[0.9375rem] font-bold text-[#1c1d1f] dark:text-white truncate min-w-0">{selectedItem.title}</h2>
                  <div className="flex flex-wrap items-center gap-3 overflow-visible">
                    {selectedItem.pdfDocument?.url && (
                      <a
                        href={selectedItem.pdfDocument.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center shrink-0 px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary hover:text-white hover:border-primary dark:border-primary dark:text-primary dark:hover:bg-primary dark:hover:text-white dark:hover:border-primary text-[0.8125rem] font-medium whitespace-nowrap focus:!ring-0 focus:!ring-offset-0 min-w-[8.5rem] transition-colors duration-200"
                      >
                        Open in new tab
                      </a>
                    )}
                    {!selectedItem.isCompleted ? (
                      <button
                        type="button"
                        onClick={() => markComplete(selectedItem)}
                        disabled={!!completingId}
                        className="inline-flex items-center justify-center shrink-0 px-3 py-1.5 rounded bg-primary text-white text-[0.8125rem] font-medium whitespace-nowrap focus:!ring-0 focus:!ring-offset-0 transition-opacity duration-200 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-primary dark:text-white"
                      >
                        {completingId === selectedItem.id ? "Saving…" : "Mark as complete"}
                      </button>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 text-[0.8125rem] font-medium whitespace-nowrap">Completed</span>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {selectedItem.pdfDocument?.url ? (
                    <iframe title={selectedItem.title} src={selectedItem.pdfDocument.url} className="w-full h-full min-h-[400px]" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[#6a6f73] dark:text-white/60 p-4">No PDF URL available.</div>
                  )}
                </div>
              </div>
            )}
            {selectedItem?.contentType === "essay" && (
              <div className="absolute inset-0 overflow-auto bg-white dark:bg-[#1c1d1f] p-4 lg:p-6">
                <h2 className="text-[1.125rem] font-bold mb-4 text-[#1c1d1f] dark:text-white">{selectedItem.title}</h2>
                <EssayRenderer
                  essay={selectedItem.essay}
                  playlistItemId={selectedItem.id}
                  studentId={studentId}
                  moduleId={moduleId}
                  isCompleted={selectedItem.isCompleted}
                  onProgressUpdate={onProgressUpdate}
                />
              </div>
            )}
          </div>

          {/* Tabs: Overview + training module content types (Video, Blog, Quiz, PDF, Q&A) */}
          <nav className="flex items-center gap-1 border-b border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-[#1c1d1f] px-4 py-2 overflow-x-auto">
            {tabsWithContent.map((tab) => {
              const isActive = mainTab === tab.id
              const count = tab.id !== "overview" ? itemsByTab[tab.id].length : 0
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`shrink-0 inline-flex items-center gap-1.5 py-2 px-3.5 rounded-md text-[0.8125rem] font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-[#6a6f73] dark:text-white/60 hover:bg-[#f7f9fa] dark:hover:bg-white/5 hover:text-[#1c1d1f] dark:hover:text-white"
                  }`}
                  onClick={() => setMainTab(tab.id)}
                >
                  <i className={`ti ${tab.icon} text-[0.9375rem] ${isActive ? "opacity-100" : "opacity-70"}`} />
                  {tab.label}
                  {count > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[0.6875rem] font-semibold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[#e4e8eb] dark:bg-white/10 text-[#6a6f73] dark:text-white/60"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Tab content - Overview */}
          <div className="flex-1 overflow-auto bg-white dark:bg-bodybg">
            {mainTab === "overview" && (
              <div className="max-w-[720px] mx-auto py-8 px-6">
                <h2 className="text-[1.5rem] font-bold text-[#1c1d1f] dark:text-white mb-4 leading-snug">{course.title}</h2>
                {/* Stat blocks: number on top, label below (Rating optional; Students + Total) */}
                <div className="flex flex-wrap gap-8 mb-3">
                  {course.ratingDisplay != null && (
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">{course.ratingDisplay}</span>
                        <i className="ti ti-star-filled text-[#e59819] text-[0.875rem]" />
                      </div>
                      {course.ratingCount != null && (
                        <button type="button" className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 hover:text-[#1a73e8] hover:underline block mt-0.5">
                          {course.ratingCount.toLocaleString()} ratings
                        </button>
                      )}
                    </div>
                  )}
                  {course.learnerCount != null && (
                    <div>
                      <div className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">{course.learnerCount.toLocaleString()}</div>
                      <div className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 mt-0.5">Students</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">
                      {totalMinutes >= 60 ? (totalMinutes / 60).toFixed(1) : totalMinutes} hours
                    </div>
                    <div className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 mt-0.5">Total</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[0.8125rem] text-[#6a6f73] dark:text-white/60 mb-6">
                  {course.lastUpdated && (
                    <span className="flex items-center gap-1.5">
                      <i className="ti ti-clock text-[0.875rem]" aria-hidden />
                      Last updated {course.lastUpdated}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <i className="ti ti-world text-[0.875rem]" aria-hidden />
                    English
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="ti ti-message-circle text-[0.875rem]" aria-hidden />
                    English [Auto]
                  </span>
                </div>

                {!scheduleDismissed && (
                  <div className="rounded-lg border border-[#d1d7dc] dark:border-white/10 bg-[#f7f9fa] dark:bg-white/5 p-5 mb-8">
                    <div className="flex gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-full bg-[#e5e7eb] dark:bg-white/10 flex items-center justify-center">
                        <i className="ti ti-clock text-[#6a6f73] dark:text-white/70 text-[1.5rem]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[1rem] text-[#1c1d1f] dark:text-white mb-2">Schedule learning time</h3>
                        <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/70 leading-relaxed mb-4">
                          Learning a little each day adds up. Research shows that students who make learning a habit are more likely to reach their goals. Set time aside to learn and get reminders using your learning scheduler.
                        </p>
                        <div className="flex items-center gap-4">
                          <button type="button" className="px-4 py-2.5 rounded border-2 border-[#5624d0] dark:border-primary text-[#5624d0] dark:text-primary text-[0.875rem] font-semibold bg-white dark:bg-transparent hover:bg-[#5624d0]/5 dark:hover:bg-primary/10">
                            Get started
                          </button>
                          <button type="button" onClick={() => setScheduleDismissed(true)} className="text-[0.875rem] font-medium text-[#1c1d1f] dark:text-white hover:underline">
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <h3 className="text-[1rem] font-bold text-[#1c1d1f] dark:text-white mb-3">By the numbers</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-[0.875rem] text-[#1c1d1f] dark:text-white mb-8 max-w-md">
                  <span className="text-[#6a6f73] dark:text-white/60">Skill level:</span>
                  <span>All Levels</span>
                  <span className="text-[#6a6f73] dark:text-white/60">Students:</span>
                  <span>{course.learnerCount?.toLocaleString() ?? "—"}</span>
                  <span className="text-[#6a6f73] dark:text-white/60">Languages:</span>
                  <span>English</span>
                  <span className="text-[#6a6f73] dark:text-white/60">Captions:</span>
                  <span>Yes</span>
                  <span className="text-[#6a6f73] dark:text-white/60">Lectures:</span>
                  <span>{totalLectures}</span>
                  <span className="text-[#6a6f73] dark:text-white/60">Video:</span>
                  <span>{totalMinutes >= 60 ? (totalMinutes / 60).toFixed(1) : totalMinutes} total hours</span>
                </div>

                <h3 className="text-[1rem] font-bold text-[#1c1d1f] dark:text-white mb-2">Description</h3>
                <p className="text-[0.875rem] text-[#1c1d1f] dark:text-white leading-relaxed">
                  {descriptionExpanded ? course.description : course.description.slice(0, 200) + (course.description.length > 200 ? "..." : "")}
                </p>
                {course.description.length > 200 && (
                  <button type="button" onClick={() => setDescriptionExpanded(!descriptionExpanded)} className="mt-2 text-[0.875rem] font-medium text-[#1a73e8] hover:underline flex items-center gap-1">
                    {descriptionExpanded ? "Show less" : "Show more"} <i className={`ti ti-chevron-${descriptionExpanded ? "up" : "down"} text-[0.75rem]`} />
                  </button>
                )}
              </div>
            )}
            {mainTab === "video" && (
              <div className="max-w-[720px] mx-auto py-6 px-6">
                <div className="flex items-center gap-2 mb-5">
                  <i className="ti ti-player-play text-primary text-[1.25rem]" />
                  <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">Video Content</h2>
                  <span className="ml-auto text-[0.8125rem] text-[#6a6f73] dark:text-white/50">{itemsByTab.video.length} item{itemsByTab.video.length !== 1 ? "s" : ""}</span>
                </div>
                {itemsByTab.video.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="ti ti-video-off text-[2rem] text-[#d1d7dc] dark:text-white/20 mb-2 block" />
                    <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60">No video items in this course.</p>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {itemsByTab.video.map((item) => (
                      <li key={item.id} className="group flex items-center gap-3.5 p-3.5 rounded-xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer" onClick={() => selectItem(item)}>
                        <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <i className={`ti ${item.contentType === "youtube-link" ? "ti-brand-youtube" : "ti-player-play"} text-primary text-[1rem]`} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[0.875rem] text-[#1c1d1f] dark:text-white truncate group-hover:text-primary transition-colors">{item.title}</p>
                          <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/50 mt-0.5">
                            {item.contentType === "youtube-link" ? "YouTube" : "Video"}
                            {item.duration ? ` · ${item.duration}` : ""}
                          </p>
                        </div>
                        {item.isCompleted && <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><i className="ti ti-check text-white text-[0.75rem]" /></span>}
                        <button type="button" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[0.8125rem] font-medium hover:bg-primary hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); selectItem(item) }}>
                          <i className="ti ti-player-play text-[0.75rem]" />
                          {item.youtubeUrl ? "Watch" : "Play"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {mainTab === "blog" && (
              <div className="max-w-[720px] mx-auto py-6 px-6">
                <div className="flex items-center gap-2 mb-5">
                  <i className="ti ti-article text-primary text-[1.25rem]" />
                  <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">Blog & Articles</h2>
                  <span className="ml-auto text-[0.8125rem] text-[#6a6f73] dark:text-white/50">{itemsByTab.blog.length} item{itemsByTab.blog.length !== 1 ? "s" : ""}</span>
                </div>
                {itemsByTab.blog.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="ti ti-article-off text-[2rem] text-[#d1d7dc] dark:text-white/20 mb-2 block" />
                    <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60">No blog items in this course.</p>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {itemsByTab.blog.map((item) => (
                      <li key={item.id} className="group p-3.5 rounded-xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer" onClick={() => selectItem(item)}>
                        <div className="flex items-start gap-3.5">
                          <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <i className="ti ti-article text-primary text-[1rem]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[0.875rem] text-[#1c1d1f] dark:text-white mb-1 group-hover:text-primary transition-colors">{item.title}</p>
                            {item.blogContent ? (
                              <div className="text-[0.8125rem] text-[#6a6f73] dark:text-white/60 leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(item.blogContent).replace(/<[^>]+>/g, "").slice(0, 150) + (item.blogContent.length > 150 ? "…" : "") }} />
                            ) : (
                              <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/50">Read article</p>
                            )}
                          </div>
                          {item.isCompleted && <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center mt-1"><i className="ti ti-check text-white text-[0.75rem]" /></span>}
                          <button type="button" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[0.8125rem] font-medium hover:bg-primary hover:text-white transition-all mt-0.5" onClick={(e) => { e.stopPropagation(); selectItem(item) }}>
                            <i className="ti ti-book text-[0.75rem]" />
                            Read
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {mainTab === "quiz" && (
              <div className="max-w-[720px] mx-auto py-6 px-6">
                <div className="flex items-center gap-2 mb-5">
                  <i className="ti ti-clipboard-check text-primary text-[1.25rem]" />
                  <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">Quizzes</h2>
                  <span className="ml-auto text-[0.8125rem] text-[#6a6f73] dark:text-white/50">{itemsByTab.quiz.length} item{itemsByTab.quiz.length !== 1 ? "s" : ""}</span>
                </div>
                {itemsByTab.quiz.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="ti ti-clipboard-off text-[2rem] text-[#d1d7dc] dark:text-white/20 mb-2 block" />
                    <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60">No quizzes in this course.</p>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {itemsByTab.quiz.map((item) => (
                      <li key={item.id} className="group flex items-center gap-3.5 p-3.5 rounded-xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer" onClick={() => selectItem(item)}>
                        <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <i className="ti ti-clipboard-check text-primary text-[1rem]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[0.875rem] text-[#1c1d1f] dark:text-white group-hover:text-primary transition-colors">{item.title}</p>
                          <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/50 mt-0.5">
                            {item.difficulty ? `${item.difficulty} · ` : ""}
                            {item.duration ?? "Quiz"}
                          </p>
                        </div>
                        {item.isCompleted && <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><i className="ti ti-check text-white text-[0.75rem]" /></span>}
                        <button type="button" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[0.8125rem] font-medium hover:bg-primary hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); selectItem(item) }}>
                          <i className="ti ti-pencil text-[0.75rem]" />
                          {item.isCompleted ? "Retake" : "Start"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {mainTab === "pdf" && (
              <div className="max-w-[720px] mx-auto py-6 px-6">
                <div className="flex items-center gap-2 mb-5">
                  <i className="ti ti-file-text text-primary text-[1.25rem]" />
                  <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">PDF & Documents</h2>
                  <span className="ml-auto text-[0.8125rem] text-[#6a6f73] dark:text-white/50">{itemsByTab.pdf.length} item{itemsByTab.pdf.length !== 1 ? "s" : ""}</span>
                </div>
                {itemsByTab.pdf.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="ti ti-file-off text-[2rem] text-[#d1d7dc] dark:text-white/20 mb-2 block" />
                    <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60">No PDF or document items in this course.</p>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {itemsByTab.pdf.map((item) => (
                      <li key={item.id} className="group flex items-center gap-3.5 p-3.5 rounded-xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer" onClick={() => selectItem(item)}>
                        <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <i className="ti ti-file-text text-primary text-[1rem]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[0.875rem] text-[#1c1d1f] dark:text-white group-hover:text-primary transition-colors">{item.title}</p>
                          {item.duration && <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/50 mt-0.5">{item.duration}</p>}
                        </div>
                        {item.isCompleted && <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><i className="ti ti-check text-white text-[0.75rem]" /></span>}
                        <button type="button" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[0.8125rem] font-medium hover:bg-primary hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); selectItem(item) }}>
                          <i className="ti ti-eye text-[0.75rem]" />
                          View
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {mainTab === "essay" && (
              <div className="max-w-[720px] mx-auto py-6 px-6">
                <div className="flex items-center gap-2 mb-5">
                  <i className="ti ti-message-dots text-primary text-[1.25rem]" />
                  <h2 className="text-[1.125rem] font-bold text-[#1c1d1f] dark:text-white">Q&A</h2>
                  <span className="ml-auto text-[0.8125rem] text-[#6a6f73] dark:text-white/50">{itemsByTab.essay.length} item{itemsByTab.essay.length !== 1 ? "s" : ""}</span>
                </div>
                {itemsByTab.essay.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="ti ti-message-off text-[2rem] text-[#d1d7dc] dark:text-white/20 mb-2 block" />
                    <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60">No Q&A items in this course.</p>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {itemsByTab.essay.map((item) => (
                      <li key={item.id} className="group flex items-center gap-3.5 p-3.5 rounded-xl border border-[#e4e8eb] dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer" onClick={() => selectItem(item)}>
                        <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <i className="ti ti-message-dots text-primary text-[1rem]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[0.875rem] text-[#1c1d1f] dark:text-white group-hover:text-primary transition-colors">{item.title}</p>
                        </div>
                        {item.isCompleted && <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><i className="ti ti-check text-white text-[0.75rem]" /></span>}
                        <button type="button" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[0.8125rem] font-medium hover:bg-primary hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); selectItem(item) }}>
                          <i className={`ti ${item.isCompleted ? "ti-eye" : "ti-pencil"} text-[0.75rem]`} />
                          {item.isCompleted ? "View" : "Start"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Course content - fixed on desktop (Udemy-style), only main body scrolls */}
        <aside className="w-full lg:w-[360px] shrink-0 lg:sticky lg:top-14 lg:self-start lg:h-[calc(100vh-3.5rem)] lg:max-h-[calc(100vh-3.5rem)] bg-[#1c1d1f] dark:bg-[#0d0d0d] border-l border-white/10 flex flex-col max-h-[60vh] lg:overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 p-2">
            <span className="px-3 py-2 text-[0.8125rem] font-semibold text-white">Course content</span>
            <div className="flex items-center gap-1">
              <button type="button" className="p-2 text-white/60 hover:text-white" aria-label="Expand"><i className="ti ti-arrows-maximize" /></button>
              <button type="button" className="p-2 text-white/60 hover:text-white" aria-label="Close"><i className="ti ti-x" /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="py-2">
                {sections.map((section, idx) => {
                  const isExpanded = expandedSections.has(section.id)
                  const total = section.lectures.length
                  const completed = section.lectures.filter((lec) => playlistItems.find((p) => p.id === lec.id)?.isCompleted).length
                  const durMin = sectionDurationMin(section.lectures)
                  return (
                    <div key={section.id} className="border-b border-white/10 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/5"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <i className={`ti ti-chevron-${isExpanded ? "down" : "right"} text-white/60 text-[0.875rem] shrink-0`} />
                          <span className="text-[0.8125rem] font-medium text-white truncate">
                            Section {idx + 1}: {section.title}
                          </span>
                        </span>
                        <span className="text-[0.75rem] text-white/50 shrink-0">{completed}/{total} | {formatDuration(durMin)}</span>
                      </button>
                      {isExpanded && (
                        <ul className="bg-black/20">
                          {section.lectures.map((lecture, lidx) => {
                            const isActive = currentLectureId === lecture.id
                            const item = playlistItems.find((p) => p.id === lecture.id)
                            const completed = item?.isCompleted
                            const icon =
                              item?.contentType === "quiz"
                                ? "ti-questionnaire"
                                : item?.contentType === "blog"
                                  ? "ti-article"
                                  : item?.contentType === "pdf-document"
                                    ? "ti-file-text"
                                    : item?.contentType === "essay"
                                      ? "ti-edit"
                                      : "ti-video"
                            return (
                              <li key={lecture.id}>
                                <button
                                  type="button"
                                  onClick={() => selectLecture(lecture.id)}
                                  className={`w-full flex items-center gap-3 px-4 pl-10 py-2.5 text-left text-[0.8125rem] ${isActive ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"}`}
                                >
                                  {completed ? <i className="ti ti-circle-check text-[0.75rem] text-emerald-400 shrink-0" /> : <i className="ti ti-circle text-[0.75rem] text-white/50 shrink-0" />}
                                  <i className={`ti ${icon} text-[0.75rem] text-white/50 shrink-0`} />
                                  <span className="truncate flex-1">{lidx + 1}. {lecture.title}</span>
                                  {lecture.duration && <span className="text-white/50 shrink-0">{lecture.duration}</span>}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </aside>
      </div>
    </Fragment>
  )
}
