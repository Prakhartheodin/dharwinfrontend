"use client"

import React, { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Pageheader from "@/shared/layout-components/page-header/pageheader"
import Seo from "@/shared/layout-components/seo/seo"
import * as trainingModulesApi from "@/shared/lib/api/training-modules"
import type { PlaylistOutlineFromTitleResponse } from "@/shared/lib/api/training-modules"

function getYoutubeVideoId(url: string): string | null {
  if (!url?.trim()) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

const ACCEPTED_TYPES =
  ".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel"

const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
]

const CONTENT_TYPES = [
  { value: "blog", label: "Blog" },
  { value: "quiz", label: "Quiz" },
  { value: "essay", label: "Q&A" },
  { value: "video", label: "Video" },
]

const TEMPLATE_OPTIONS = [
  { id: "word", label: "Word (DOCX)", file: "course-template.docx", icon: "ri-file-word-2-line" },
  { id: "pdf", label: "PDF", file: "course-template.pdf", icon: "ri-file-pdf-line" },
  { id: "excel", label: "Excel", file: "course-template.xlsx", icon: "ri-file-excel-2-line" },
]

interface StepState {
  id: string
  label: string
  status: "pending" | "started" | "completed" | "error"
  message?: string
}

export default function CreateModuleWithAIPage() {
  const router = useRouter()
  const [topic, setTopic] = useState("")
  const [description, setDescription] = useState("")
  const [suggestingTopic, setSuggestingTopic] = useState(false)
  const [skillLevel, setSkillLevel] = useState("intermediate")
  const [pdfText, setPdfText] = useState("")
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  const [extractingPdf, setExtractingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [videoLinks, setVideoLinks] = useState<string[]>([""])
  const [videosFromDocument, setVideosFromDocument] = useState<
    { title: string; duration: number; youtubeUrl: string }[]
  >([])
  const [videoTitlesCache, setVideoTitlesCache] = useState<Record<string, string>>({})
  const [contentTypes, setContentTypes] = useState<string[]>(["blog", "quiz", "essay", "video"])
  const [generating, setGenerating] = useState(false)
  const [steps, setSteps] = useState<StepState[]>([])
  const [error, setError] = useState<string | null>(null)
  const [moduleId, setModuleId] = useState<string | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [videoAssignmentPreview, setVideoAssignmentPreview] = useState<
    trainingModulesApi.VideoAssignmentPreview | null
  >(null)
  const [videoAssignments, setVideoAssignments] = useState<{ videoIndex: number; sectionIndex: number }[]>([])
  const [savingAssignments, setSavingAssignments] = useState(false)
  const [extractedByModule, setExtractedByModule] = useState<
    trainingModulesApi.ExtractedModuleDisplay[]
  >([])

  const [createMode, setCreateMode] = useState<"document" | "titleOnly">("document")
  const [titleOnlyName, setTitleOnlyName] = useState("")
  const [titleOnlyLevel, setTitleOnlyLevel] = useState("intermediate")
  const [numModules, setNumModules] = useState(3)
  const [titleOnlyContentTypes, setTitleOnlyContentTypes] = useState<string[]>(["blog", "quiz", "essay"])
  const [outlinePreview, setOutlinePreview] = useState<PlaylistOutlineFromTitleResponse | null>(null)
  const [outlineLoading, setOutlineLoading] = useState(false)
  const [outlineError, setOutlineError] = useState<string | null>(null)
  const [numBlogs, setNumBlogs] = useState(2)
  const [numVideos, setNumVideos] = useState(0)
  const [numQuizzes, setNumQuizzes] = useState(1)
  const [questionsPerQuiz, setQuestionsPerQuiz] = useState(4)
  const [numEssays, setNumEssays] = useState(1)
  const [questionsPerEssay, setQuestionsPerEssay] = useState(3)
  const [generatingFromTitle, setGeneratingFromTitle] = useState(false)

  const toggleTitleOnlyContentType = (value: string) => {
    setTitleOnlyContentTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const downloadTemplate = (file: string) => {
    const a = document.createElement("a")
    a.href = `/templates/${file}`
    a.download = file
    a.click()
    setShowTemplateModal(false)
  }

  const toggleContentType = (value: string) => {
    setContentTypes((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const addVideoLink = () => setVideoLinks((prev) => [...prev, ""])
  const updateVideoLink = (idx: number, val: string) => {
    setVideoLinks((prev) => {
      const next = [...prev]
      next[idx] = val
      return next
    })
  }
  const removeVideoLink = (idx: number) => {
    setVideoLinks((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]
    const ext = file.name.split(".").pop()?.toLowerCase()
    const validExts = ["pdf", "docx", "xlsx", "xls"]
    const isValid = validTypes.includes(file.type) || (ext && validExts.includes(ext))
    if (!isValid) {
      setPdfError("Please select a PDF, DOCX, or Excel (.xlsx, .xls) file.")
      return
    }
    setPdfError(null)
    setExtractingPdf(true)
    try {
      const result = await trainingModulesApi.processDocument(file)
      setPdfText((prev) => (prev ? `${prev}\n\n${result.normalizedText}` : result.normalizedText))
      setExtractedByModule(result.extractedByModule)
      setPdfFileName(file.name)
      setVideosFromDocument(result.videos || [])
      if (result.documentTitle?.trim()) setTopic(result.documentTitle.trim())
      if (result.youtubeUrls?.length) {
        setVideoLinks((prev) => {
          const existing = prev.filter(Boolean)
          const merged = [...new Set([...result.youtubeUrls, ...existing])]
          return [...merged, ""]
        })
      }
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Failed to process document")
    } finally {
      setExtractingPdf(false)
      e.target.value = ""
    }
  }

  const handleCompleteWithAssignments = async () => {
    if (!videoAssignmentPreview) return
    setSavingAssignments(true)
    setError(null)
    try {
      const saved = await trainingModulesApi.saveModuleWithVideoAssignments({
        moduleName: videoAssignmentPreview.moduleName,
        shortDescription: videoAssignmentPreview.shortDescription,
        sections: videoAssignmentPreview.sections.map((s) => ({ items: s.items })),
        videos: videoAssignmentPreview.videos,
        videoAssignments,
      })
      router.push(`/training/curriculum/modules/edit?id=${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save module")
    } finally {
      setSavingAssignments(false)
    }
  }

  const clearPdf = () => {
    setPdfText("")
    setPdfFileName(null)
    setPdfError(null)
    setExtractedByModule([])
    setVideosFromDocument([])
    setVideoTitlesCache({})
    setVideoLinks([""])
    setTopic("")
    setDescription("")
    if (pdfInputRef.current) pdfInputRef.current.value = ""
  }

  useEffect(() => {
    if (!pdfText.trim() || pdfText.trim().length < 100) return
    const timer = setTimeout(async () => {
      setSuggestingTopic(true)
      try {
        const { moduleName, shortDescription } = await trainingModulesApi.suggestTopicDescription(pdfText)
        if (moduleName) setTopic((prev) => (prev ? prev : moduleName))
        if (shortDescription) setDescription((prev) => (prev ? prev : shortDescription))
      } catch {
        // ignore
      } finally {
        setSuggestingTopic(false)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [pdfText])

  useEffect(() => {
    const ids = videoLinks
      .map((url) => getYoutubeVideoId(url))
      .filter((id): id is string => !!id)
    const getTitle = (id: string) =>
      videoTitlesCache[id] || videosFromDocument.find((v) => getYoutubeVideoId(v.youtubeUrl) === id)?.title
    const needsFetch = ids.filter((id) => !getTitle(id))
    if (needsFetch.length === 0) return
    let cancelled = false
    const fetchTitles = async () => {
      const next: Record<string, string> = { ...videoTitlesCache }
      for (const id of needsFetch) {
        if (cancelled) break
        try {
          const res = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`
          )
          const data = await res.json()
          if (data?.title) next[id] = data.title
        } catch {
          next[id] = ""
        }
        await new Promise((r) => setTimeout(r, 200))
      }
      if (!cancelled) setVideoTitlesCache(next)
    }
    fetchTitles()
    return () => {
      cancelled = true
    }
  }, [videoLinks, videosFromDocument, videoTitlesCache])

  const handleGetOutlinePreview = async () => {
    if (!titleOnlyName.trim()) return
    setOutlineError(null)
    setOutlineLoading(true)
    try {
      const result = await trainingModulesApi.getPlaylistOutlineFromTitle(
        titleOnlyName.trim(),
        numModules,
        titleOnlyLevel,
        titleOnlyContentTypes.length ? titleOnlyContentTypes : ["blog", "quiz", "essay"]
      )
      setOutlinePreview(result)
    } catch (err) {
      setOutlineError(err instanceof Error ? err.message : "Failed to get preview")
      setOutlinePreview(null)
    } finally {
      setOutlineLoading(false)
    }
  }

  const handleGenerateFromTitle = async () => {
    if (!outlinePreview?.moduleName?.trim()) return
    setGeneratingFromTitle(true)
    setError(null)
    setSteps([
      {
        id: "_streaming",
        label: "Generating from title…",
        status: "started",
        message: "Connecting…",
      },
    ])
    try {
      let completedModuleId: string | null = null
      for await (const ev of trainingModulesApi.generateModuleFromTitle({
        moduleName: outlinePreview.moduleName,
        shortDescription: outlinePreview.shortDescription,
        level: outlinePreview.level || titleOnlyLevel,
        sections: outlinePreview.sections || [],
        numBlogs,
        numVideos,
        numQuizzes,
        questionsPerQuiz,
        numEssays,
        questionsPerEssay,
      })) {
        if (ev.step === "error") {
          setError(ev.message ?? "Generation failed")
          setSteps((prev) =>
            prev.map((s) =>
              s.status === "started"
                ? { ...s, status: "error" as const, message: ev.message }
                : s
            )
          )
          break
        }
        updateStep(
          ev.step,
          ev.status === "completed" ? "completed" : "started",
          ev.message
        )
        if (ev.step === "done" && ev.data?.moduleId) {
          completedModuleId = ev.data.moduleId
        }
      }
      if (completedModuleId) {
        router.push(`/training/curriculum/modules/edit?id=${completedModuleId}`)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Generation failed"
      setError(errMsg)
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "started" ? { ...s, status: "error" as const, message: errMsg } : s
        )
      )
    } finally {
      setGeneratingFromTitle(false)
    }
  }

  const updateStep = (stepId: string, status: StepState["status"], message?: string) => {
    setSteps((prev) => {
      const withoutStreaming = prev.filter((s) => s.id !== "_streaming")
      const found = withoutStreaming.find((s) => s.id === stepId)
      if (found) {
        return withoutStreaming.map((s) =>
          s.id === stepId ? { ...s, status, message } : s
        )
      }
      const labels: Record<string, string> = {
        analyzing: "Analyzing topic",
        reading_document: "Reading document",
        extracting_links: "Extracting links",
        searching_youtube: "Searching YouTube",
        fetching_videos: "Fetching video details",
        creating_course: "Creating course",
        generating: "Generating content",
        cover_image: "Finding cover image",
        saving: "Saving module",
        done: "Done",
        error: "Error",
      }
      return [...withoutStreaming, { id: stepId, label: labels[stepId] ?? stepId, status, message }]
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) return
    setGenerating(true)
    setError(null)
    setSteps([
      {
        id: "_streaming",
        label: pdfText?.trim() ? "Reading document & connecting…" : "Connecting & preparing…",
        status: "started",
        message: "Streaming in progress. Steps will appear below.",
      },
    ])
    setModuleId(null)

    const links = videoLinks.filter((l) => l.trim())
    const params: trainingModulesApi.GenerateWithAIParams = {
      topic: topic.trim(),
      skillLevel,
      contentTypes: contentTypes.length ? contentTypes : ["blog", "quiz", "essay", "video"],
    }
    if (pdfText.trim()) params.pdfText = pdfText.trim()
    if (links.length) params.videoLinks = links
    if (description.trim()) params.description = description.trim()
    if (extractedByModule.length > 0) params.extractedByModule = extractedByModule

    try {
      let completedModuleId: string | null = null
      for await (const ev of trainingModulesApi.generateModuleWithAI(params)) {
        if (ev.step === "error") {
          setError(ev.message ?? "Generation failed")
          setSteps((prev) =>
            prev.map((s) =>
              s.status === "started" ? { ...s, status: "error" as const, message: ev.message } : s
            )
          )
          break
        }
        updateStep(ev.step, ev.status === "completed" ? "completed" : "started", ev.message)
        if (ev.step === "assign_videos" && ev.data?.requiresAssignment && ev.data?.sections && ev.data?.videos) {
          setVideoAssignmentPreview({
            requiresAssignment: true,
            moduleName: ev.data.moduleName ?? topic.trim(),
            shortDescription: ev.data.shortDescription ?? description.trim(),
            sections: ev.data.sections,
            videos: ev.data.videos,
          })
          setVideoAssignments(
            (ev.data.videos as { title: string }[]).map((_, i) => ({ videoIndex: i, sectionIndex: Math.min(i, (ev.data!.sections?.length ?? 1) - 1) }))
          )
        }
        if (ev.step === "done" && ev.data?.moduleId) {
          completedModuleId = ev.data.moduleId
          setModuleId(ev.data.moduleId)
        }
      }
      if (completedModuleId) {
        router.push(`/training/curriculum/modules/edit?id=${completedModuleId}`)
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Generation failed"
      setError(errMsg)
      setSteps((prev) =>
        prev.map((s) =>
          s.status === "started" ? { ...s, status: "error" as const, message: errMsg } : s
        )
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <>
      <Seo title="Create Module with AI" />
      <Pageheader
        currentpage="Create Module with AI"
        activepage="Training"
        mainpage="Create Module with AI"
      />

      {videoAssignmentPreview ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            <div className="box custom-box">
              <div className="box-header flex flex-wrap items-center justify-between gap-3">
                <h5 className="box-title mb-0">Assign videos to sections</h5>
                <button
                  type="button"
                  onClick={() => {
                    setVideoAssignmentPreview(null)
                    setVideoAssignments([])
                    setSteps([])
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f1f5f9] dark:bg-white/10 text-[#475569] dark:text-white/90 hover:bg-[#e2e8f0] dark:hover:bg-white/15 text-sm font-medium"
                >
                  <i className="ri-arrow-left-s-line text-base" />
                  Back
                </button>
              </div>
              <div className="box-body">
                <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60 mb-4">
                  Choose which section each video belongs to. You have {videoAssignmentPreview.sections.length} sections and {videoAssignmentPreview.videos.length} videos.
                </p>
                <div className="space-y-4">
                  {videoAssignmentPreview.videos.map((video, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-defaultborder bg-white dark:bg-white/5"
                    >
                      <span className="text-[0.875rem] font-medium shrink-0">Video {idx + 1}:</span>
                      <span className="text-[0.8125rem] text-defaulttextcolor truncate max-w-[200px]">
                        {video.title || "Untitled"}
                      </span>
                      <span className="text-[0.75rem] text-[#8c9097] shrink-0">→ Section:</span>
                      <select
                        className="form-control !py-1.5 !w-auto min-w-[140px]"
                        value={videoAssignments.find((a) => a.videoIndex === idx)?.sectionIndex ?? 0}
                        onChange={(e) => {
                          const secIdx = parseInt(e.target.value, 10)
                          setVideoAssignments((prev) => {
                            const next = prev.filter((a) => a.videoIndex !== idx)
                            next.push({ videoIndex: idx, sectionIndex: secIdx })
                            return next.sort((a, b) => a.videoIndex - b.videoIndex)
                          })
                        }}
                      >
                        {videoAssignmentPreview.sections.map((sec, si) => (
                          <option key={si} value={si}>
                            {sec.title || `Section ${si + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {error && (
                  <div className="mt-4 rounded-lg p-4 bg-danger/10 border border-danger/30 text-danger">
                    {error}
                  </div>
                )}
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCompleteWithAssignments}
                    disabled={savingAssignments}
                    className="ti-btn ti-btn-primary-full"
                  >
                    {savingAssignments ? (
                      <>
                        <span className="animate-spin inline-block me-2">⏳</span>
                        Saving…
                      </>
                    ) : (
                      <>
                        <i className="ri-check-line me-1" />
                        Complete & save module
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoAssignmentPreview(null)
                      setVideoAssignments([])
                      setSteps([])
                    }}
                    className="ti-btn ti-btn-light"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-8 col-span-12">
          <div className="box custom-box">
            <div className="box-header">
              <h5 className="box-title">Generate a training module with AI</h5>
              <Link
                href="/training/curriculum/modules"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f1f5f9] dark:bg-white/10 text-[#475569] dark:text-white/90 hover:bg-[#e2e8f0] dark:hover:bg-white/15 transition-colors text-sm font-medium"
              >
                <i className="ri-arrow-left-s-line text-base" />
                Back
              </Link>
            </div>
            <div className="box-body">
              <div className="flex items-center gap-2 mb-6 p-1 rounded-lg bg-[#f1f5f9] dark:bg-white/10 w-fit">
                <button
                  type="button"
                  onClick={() => setCreateMode("document")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    createMode === "document"
                      ? "bg-white dark:bg-white/20 text-primary shadow"
                      : "text-[#64748b] dark:text-white/60 hover:text-defaulttextcolor"
                  }`}
                >
                  <i className="ri-file-text-line me-1.5" />
                  From document
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode("titleOnly")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    createMode === "titleOnly"
                      ? "bg-white dark:bg-white/20 text-primary shadow"
                      : "text-[#64748b] dark:text-white/60 hover:text-defaulttextcolor"
                  }`}
                >
                  <i className="ri-text me-1.5" />
                  From title only
                </button>
              </div>

              {createMode === "titleOnly" ? (
                <div className="space-y-6">
                  <div>
                    <label className="form-label">Course / module name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Introduction to Python Programming"
                      value={titleOnlyName}
                      onChange={(e) => {
                        setTitleOnlyName(e.target.value)
                        setOutlineError(null)
                      }}
                      disabled={outlineLoading || generatingFromTitle}
                    />
                  </div>

                  <div>
                    <label className="form-label">Level of course</label>
                    <select
                      className="form-control"
                      value={titleOnlyLevel}
                      onChange={(e) => setTitleOnlyLevel(e.target.value)}
                      disabled={outlineLoading || generatingFromTitle}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Number of modules (sections) in course</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="form-control w-24"
                      value={numModules}
                      onChange={(e) =>
                        setNumModules(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 3)))
                      }
                      disabled={outlineLoading || generatingFromTitle}
                    />
                    <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-1">
                      Introduction → About the topic → In-depth modules in succession.
                    </p>
                  </div>

                  <div>
                    <label className="form-label">Content types to include</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "blog", label: "Blog" },
                        { value: "video", label: "Video" },
                        { value: "quiz", label: "Quiz" },
                        { value: "essay", label: "Q&A" },
                      ].map((opt) => {
                        const isChecked = titleOnlyContentTypes.includes(opt.value)
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleTitleOnlyContentType(opt.value)}
                            disabled={outlineLoading || generatingFromTitle}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                              isChecked
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-defaultborder bg-white dark:bg-white/5 text-[#6a6f73] dark:text-white/60"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                isChecked ? "border-primary bg-primary" : "border-defaultborder"
                              }`}
                            >
                              {isChecked && <i className="ri-check-line text-white text-xs" />}
                            </span>
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleGetOutlinePreview}
                      disabled={
                        !titleOnlyName.trim() ||
                        outlineLoading ||
                        generatingFromTitle ||
                        titleOnlyContentTypes.length === 0
                      }
                      className="ti-btn ti-btn-primary-full"
                    >
                      {outlineLoading ? (
                        <>
                          <span className="animate-spin inline-block me-1">⏳</span>
                          Getting preview…
                        </>
                      ) : (
                        <>
                          <i className="ri-eye-line me-1" />
                          Get preview
                        </>
                      )}
                    </button>
                  </div>
                  {outlineError && (
                    <p className="text-[0.75rem] text-danger">{outlineError}</p>
                  )}

                  {outlinePreview && (
                    <>
                      <div className="rounded-lg border border-defaultborder bg-[#f8fafc] dark:bg-white/5 overflow-hidden">
                        <div className="px-4 py-3 border-b border-defaultborder bg-primary/5 dark:bg-primary/10">
                          <h6 className="font-semibold text-sm mb-0">Preview</h6>
                          <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/60 mt-0.5">
                            {outlinePreview.moduleName}
                            {outlinePreview.level && (
                              <span className="ml-2 capitalize">({outlinePreview.level})</span>
                            )}
                          </p>
                          {outlinePreview.shortDescription && (
                            <p className="text-[0.8125rem] text-defaulttextcolor mt-1 line-clamp-2">
                              {outlinePreview.shortDescription}
                            </p>
                          )}
                        </div>
                        <div className="p-4 space-y-4 max-h-[280px] overflow-y-auto">
                          {(outlinePreview.sections || []).map((section, sIdx) => (
                            <div key={sIdx} className="rounded-lg border border-defaultborder bg-white dark:bg-white/5 p-3">
                              <p className="font-semibold text-[0.875rem] text-primary mb-2">
                                {section.title}
                              </p>
                              <ul className="space-y-1.5">
                                {(section.items || []).map((item, i) => (
                                  <li
                                    key={i}
                                    className="flex items-center gap-2 text-[0.8125rem] text-defaulttextcolor"
                                  >
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[0.6875rem] font-medium">
                                      {i + 1}
                                    </span>
                                    <span className="shrink-0 capitalize text-[#8c9097] dark:text-white/50">
                                      {item.contentType === "essay" ? "Q&A" : item.contentType === "youtube-link" ? "Video" : item.contentType}
                                    </span>
                                    <span className="truncate">{item.title}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="form-label mb-3 block">
                          How many of each per module? (blogs, videos, quizzes, Q&A)
                        </label>
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-6 sm:col-span-4">
                            <label className="form-label text-[0.8125rem]">Blogs</label>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              className="form-control"
                              value={numBlogs}
                              onChange={(e) => setNumBlogs(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              disabled={generatingFromTitle}
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-4">
                            <label className="form-label text-[0.8125rem]">Videos (placeholders)</label>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              className="form-control"
                              value={numVideos}
                              onChange={(e) => setNumVideos(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              disabled={generatingFromTitle}
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-4">
                            <label className="form-label text-[0.8125rem]">Quizzes</label>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              className="form-control"
                              value={numQuizzes}
                              onChange={(e) => setNumQuizzes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              disabled={generatingFromTitle}
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-4">
                            <label className="form-label text-[0.8125rem]">Questions per quiz</label>
                            <input
                              type="number"
                              min={2}
                              max={10}
                              className="form-control"
                              value={questionsPerQuiz}
                              onChange={(e) =>
                                setQuestionsPerQuiz(
                                  Math.min(10, Math.max(2, parseInt(e.target.value, 10) || 4))
                                )
                              }
                              disabled={generatingFromTitle}
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-4">
                            <label className="form-label text-[0.8125rem]">Q&A sections</label>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              className="form-control"
                              value={numEssays}
                              onChange={(e) => setNumEssays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                              disabled={generatingFromTitle}
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-4">
                            <label className="form-label text-[0.8125rem]">Questions per Q&A</label>
                            <input
                              type="number"
                              min={1}
                              max={8}
                              className="form-control"
                              value={questionsPerEssay}
                              onChange={(e) =>
                                setQuestionsPerEssay(
                                  Math.min(8, Math.max(1, parseInt(e.target.value, 10) || 3))
                                )
                              }
                              disabled={generatingFromTitle}
                            />
                          </div>
                        </div>
                      </div>

                      {error && (
                        <div className="rounded-lg p-4 bg-danger/10 border border-danger/30 text-danger">
                          {error}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleGenerateFromTitle}
                          disabled={
                            generatingFromTitle ||
                            !outlinePreview.moduleName.trim() ||
                            (numBlogs === 0 && numQuizzes === 0 && numEssays === 0)
                          }
                          className="ti-btn ti-btn-primary-full"
                        >
                          {generatingFromTitle ? (
                            <>
                              <span className="animate-spin inline-block me-2">⏳</span>
                              Generating…
                            </>
                          ) : (
                            <>
                              <i className="ri-magic-line me-1" />
                              Generate module
                            </>
                          )}
                        </button>
                        <Link href="/training/curriculum/modules" className="ti-btn ti-btn-light">
                          Cancel
                        </Link>
                      </div>
                    </>
                  )}

                  {!outlinePreview && !outlineLoading && (
                    <p className="text-[0.875rem] text-[#8c9097] dark:text-white/50">
                      Enter the course name, choose level and number of modules, select content types, then click &quot;Get preview&quot; to see a suggested multi-module outline (introduction → about the topic → in-depth). Set how many blogs, videos, quizzes, and Q&A per module, then generate.
                    </p>
                  )}
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="form-label">Module name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Introduction to Project Management"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={generating}
                    required
                  />
                  {suggestingTopic && (
                    <p className="text-[0.75rem] text-primary mt-1">
                      <span className="animate-spin inline-block me-1">⏳</span>
                      Generating name and description from document...
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="2–3 sentence summary of the module. Generated from document when uploaded."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={generating}
                  />
                </div>

                <div>
                  <label className="form-label">Skill level</label>
                  <select
                    className="form-control"
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    disabled={generating}
                  >
                    {SKILL_LEVELS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label mb-0">Document upload</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowTemplateModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 text-sm font-medium transition-colors shrink-0"
                      >
                        <i className="ri-download-line text-base" />
                        Download template
                      </button>
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept={ACCEPTED_TYPES}
                        onChange={handleFileUpload}
                        disabled={generating || extractingPdf}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        disabled={generating || extractingPdf}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-defaultborder bg-white dark:bg-white/5 text-[#495057] dark:text-white/80 hover:bg-[#f8fafc] dark:hover:bg-white/10 text-sm font-medium transition-colors"
                      >
                        {extractingPdf ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            Extracting...
                          </>
                        ) : (
                          <>
                            <i className="ri-file-upload-line text-base" />
                            Upload PDF / DOCX / Excel
                          </>
                        )}
                      </button>
                      {pdfFileName && (
                        <button
                          type="button"
                          onClick={clearPdf}
                          disabled={generating}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-danger hover:bg-danger/10 text-sm"
                        >
                          <i className="ri-close-line" />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  {pdfFileName && (
                    <p className="text-[0.75rem] text-success dark:text-success mb-2">
                      <i className="ri-file-text-line me-1" />
                      {pdfFileName} — text extracted
                    </p>
                  )}
                  {pdfError && (
                    <p className="text-[0.75rem] text-danger mb-2">{pdfError}</p>
                  )}
                  <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-2">
                    Use the template: Module N → Blog Introduction → Video Resources → Quizzes (Q1. A)B)C)D)) → Long-answer questions.
                    Supported formats: PDF, DOCX, Excel (.xlsx/.xls). Content is extracted and shown below.
                  </p>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Upload PDF, DOCX, or Excel to extract and display text here..."
                    value={pdfText}
                    readOnly
                    disabled={generating}
                  />
                </div>

                {extractedByModule.length > 0 && (
                  <div className="rounded-lg border border-defaultborder bg-[#f8fafc] dark:bg-white/5 overflow-hidden">
                    <div className="px-4 py-3 border-b border-defaultborder bg-primary/5 dark:bg-primary/10">
                      <h6 className="font-semibold text-sm mb-0 flex items-center gap-2">
                        <i className="ri-file-list-3-line text-primary" />
                        Extracted content by module
                      </h6>
                    </div>
                    <div className="p-4 space-y-4 max-h-[320px] overflow-y-auto">
                      {extractedByModule.map((mod, midx) => (
                        <div key={midx} className="rounded-lg border border-defaultborder bg-white dark:bg-white/5 p-3">
                          <p className="font-semibold text-[0.9375rem] text-primary mb-3">{mod.title}</p>
                          {mod.sectionOrder.map((sectionType) => {
                            if (sectionType === "video" && mod.videos.length > 0)
                              return (
                                <div key="video" className="mb-3">
                                  <p className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 mb-1 flex items-center gap-1">
                                    <i className="ri-youtube-line" /> Videos
                                  </p>
                                  <ul className="space-y-1">
                                    {mod.videos.map((url, i) => {
                                      const vid = getYoutubeVideoId(url)
                                      const meta = videosFromDocument.find((v) => getYoutubeVideoId(v.youtubeUrl) === vid)
                                      const title = meta?.title || videoTitlesCache[vid || ""] || (vid ? `YouTube (${vid})` : url)
                                      return (
                                        <li key={i} className="text-[0.8125rem] text-defaulttextcolor line-clamp-1" title={url}>
                                          {vid && (
                                            <span className="inline-flex items-center gap-1.5">
                                              <i className="ri-play-circle-line text-danger shrink-0" />
                                              {title}
                                            </span>
                                          )}
                                        </li>
                                      )
                                    })}
                                  </ul>
                                </div>
                              )
                            if (sectionType === "blog" && mod.blogs.length > 0)
                              return (
                                <div key="blog" className="mb-3">
                                  <p className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 mb-1 flex items-center gap-1">
                                    <i className="ri-article-line" /> Blogs
                                  </p>
                                  <ul className="list-disc list-inside text-[0.8125rem] text-defaulttextcolor space-y-0.5">
                                    {mod.blogs.map((b, i) => (
                                      <li key={i} className="line-clamp-1">{b.slice(0, 100)}{b.length > 100 ? "…" : ""}</li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            if (sectionType === "quiz" && mod.quizzes.length > 0)
                              return (
                                <div key="quiz" className="mb-3">
                                  <p className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 mb-1 flex items-center gap-1">
                                    <i className="ri-questionnaire-line" /> Quizzes
                                  </p>
                                  <ul className="space-y-2">
                                    {mod.quizzes.map((q, i) => (
                                      <li key={i} className="text-[0.8125rem] pl-2 border-l-2 border-primary/30">
                                        <span className="font-medium">{q.questionText.slice(0, 80)}{q.questionText.length > 80 ? "…" : ""}</span>
                                        <span className="text-[#8c9097] ml-1">
                                          ({q.options.length} options)
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            if (sectionType === "essay" && mod.essays.length > 0)
                              return (
                                <div key="essay">
                                  <p className="text-[0.75rem] font-medium text-[#8c9097] dark:text-white/50 mb-1 flex items-center gap-1">
                                    <i className="ri-file-text-line" /> Long-answer questions
                                  </p>
                                  <ul className="space-y-1.5">
                                    {mod.essays.map((e, i) => (
                                      <li key={i} className="text-[0.8125rem] text-defaulttextcolor">
                                        {i + 1}. {e.questionText.slice(0, 120)}{e.questionText.length > 120 ? "…" : ""}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            return null
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label mb-0">YouTube video links (optional)</label>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-defaultborder bg-light dark:bg-white/10 text-defaulttextcolor dark:text-defaulttextcolor/80 hover:bg-[#e9ecef] dark:hover:bg-white/15 text-sm font-medium whitespace-nowrap shrink-0 transition-colors disabled:opacity-65 disabled:cursor-not-allowed"
                      onClick={addVideoLink}
                      disabled={generating}
                    >
                      <i className="ri-add-line text-base" />
                      Add link
                    </button>
                  </div>
                  {videoLinks.map((link, idx) => {
                    const videoId = getYoutubeVideoId(link)
                    const meta = videosFromDocument.find((v) => {
                      const vId = getYoutubeVideoId(v.youtubeUrl)
                      return vId && vId === videoId
                    })
                    const isEmpty = !link.trim()
                    return (
                      <div
                        key={idx}
                        className="flex gap-3 p-3 rounded-lg border border-defaultborder bg-white dark:bg-white/5 mb-3"
                      >
                        {videoId ? (
                          <div className="shrink-0 w-32 rounded overflow-hidden border border-defaultborder aspect-video bg-[#1a1a1a]">
                            <img
                              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : isEmpty ? (
                          <div className="shrink-0 w-32 rounded overflow-hidden border border-dashed border-defaultborder aspect-video flex items-center justify-center bg-[#f8fafc] dark:bg-white/5">
                            <i className="ri-youtube-line text-3xl text-[#8c9097]" />
                          </div>
                        ) : (
                          <div className="shrink-0 w-32 rounded overflow-hidden border border-defaultborder aspect-video flex items-center justify-center bg-[#f8fafc] dark:bg-white/5">
                            <span className="text-[0.75rem] text-[#8c9097] text-center px-1">
                              Enter valid YouTube URL
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                          <input
                            type="url"
                            className="form-control !py-1.5"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={link}
                            onChange={(e) => updateVideoLink(idx, e.target.value)}
                            disabled={generating}
                          />
                          {videoId && (
                            <p className="text-[0.8125rem] font-medium text-defaulttextcolor line-clamp-2">
                              {meta?.title || videoTitlesCache[videoId] || `YouTube video (${videoId})`}
                            </p>
                          )}
                          {meta && meta.duration > 0 && (
                            <p className="text-[0.75rem] text-[#8c9097]">{meta.duration} min</p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="ti-btn ti-btn-sm ti-btn-light !mb-0 inline-flex items-center justify-center shrink-0 !min-w-[2.25rem] self-start"
                          onClick={() => removeVideoLink(idx)}
                          disabled={generating || videoLinks.length === 1}
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    )
                  })}
                  <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-1">
                    Links from uploaded documents are auto-detected. Titles load when available.
                  </p>
                </div>

                <div>
                  <label className="form-label">Content types to include</label>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_TYPES.map((opt) => {
                      const isChecked = contentTypes.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => !generating && toggleContentType(opt.value)}
                          disabled={generating}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors shrink-0 ${
                            isChecked
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-defaultborder bg-white dark:bg-white/5 text-[#6a6f73] dark:text-white/60 hover:border-primary/50"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isChecked ? "border-primary bg-primary" : "border-defaultborder"
                            }`}
                          >
                            {isChecked && <i className="ri-check-line text-white text-xs" />}
                          </span>
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mt-2">
                    Video: fetches from YouTube if no links provided. Blog, Quiz, and Essay are AI-generated.
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg p-4 bg-danger/10 border border-danger/30 text-danger">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary-full"
                    disabled={generating || !topic.trim()}
                  >
                    {generating ? (
                      <>
                        <span className="animate-spin inline-block me-2">⏳</span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <i className="ri-magic-line me-1" />
                        Generate module
                      </>
                    )}
                  </button>
                  <Link href="/training/curriculum/modules" className="ti-btn ti-btn-light">
                    Cancel
                  </Link>
                </div>
              </form>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 col-span-12">
          <div className="box custom-box overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h6 className="font-semibold mb-0">Progress</h6>
              {(generating || generatingFromTitle) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[0.75rem] font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  Streaming…
                </span>
              )}
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {steps.length === 0 && !generating && !generatingFromTitle && (
                <div className="rounded-xl border border-dashed border-defaultborder bg-[#f8fafc] dark:bg-white/5 p-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#e4e8eb] dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-play-circle-line text-2xl text-[#8c9097] dark:text-white/50" />
                  </div>
                  <p className="text-[0.875rem] font-medium text-[#6a6f73] dark:text-white/70 mb-1">
                    Ready to generate
                  </p>
                  <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50">
                    Submit the form to start generation.
                  </p>
                </div>
              )}
              {steps.length === 0 && (generating || generatingFromTitle) && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20">
                  <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-primary/20 text-primary">
                    <i className="ri-loader-4-line text-xl animate-spin" />
                  </div>
                  <div>
                    <p className="font-medium text-[0.875rem]">Connecting…</p>
                    <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/60 mt-0.5">
                      Initializing. Progress will appear here shortly.
                    </p>
                  </div>
                </div>
              )}
              {steps.map((step, i) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 py-3 px-3 rounded-xl border transition-colors ${
                    step.status === "completed"
                      ? "bg-success/5 dark:bg-success/10 border-success/20"
                      : step.status === "started"
                        ? "bg-primary/5 dark:bg-primary/10 border-primary/20"
                        : step.status === "error"
                          ? "bg-danger/5 dark:bg-danger/10 border-danger/20"
                          : "bg-[#f8fafc] dark:bg-white/5 border-defaultborder"
                  }`}
                >
                  <div
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.status === "completed"
                        ? "bg-success/20 text-success"
                        : step.status === "started"
                          ? "bg-primary/20 text-primary"
                          : step.status === "error"
                            ? "bg-danger/20 text-danger"
                            : "bg-[#e4e8eb] dark:bg-white/10 text-[#6a6f73] dark:text-white/60"
                    }`}
                  >
                    {step.status === "completed" ? (
                      <i className="ri-check-line text-lg" />
                    ) : step.status === "started" ? (
                      <i className="ri-loader-4-line text-lg animate-spin" />
                    ) : step.status === "error" ? (
                      <i className="ri-close-line text-lg" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[0.875rem]">
                      {step.label}
                      {step.status === "completed" && (
                        <span className="ml-1.5 text-success text-[0.75rem] font-normal">Done</span>
                      )}
                      {step.status === "started" && (
                        <span className="ml-1.5 text-primary text-[0.75rem] font-normal">In progress…</span>
                      )}
                      {step.status === "error" && (
                        <span className="ml-1.5 text-danger text-[0.75rem] font-normal">Failed</span>
                      )}
                    </p>
                    {step.message && (step.status === "completed" || step.status === "started" || step.status === "error") && (
                      <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/60 mt-0.5 line-clamp-3">
                        {step.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {showTemplateModal && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowTemplateModal(false)}
        >
          <div
            className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-[96vw] max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-defaultborder">
              <h5 className="font-semibold mb-0 text-[1rem]">Download course template</h5>
              <button
                type="button"
                className="ti-btn ti-btn-light !py-1 !px-2"
                onClick={() => setShowTemplateModal(false)}
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-[0.875rem] text-[#6a6f73] dark:text-white/60 mb-4">
                Choose the format for your course template. All include modules with blog introduction,
                video resources, quiz, and long-answer (Q&amp;A) sections.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => downloadTemplate(opt.file)}
                    className="flex items-center gap-3 p-4 rounded-lg border border-defaultborder bg-white dark:bg-white/5 hover:bg-[#f8fafc] dark:hover:bg-white/10 hover:border-primary/30 transition-colors text-left"
                  >
                    <span className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                      <i className={`${opt.icon} text-xl`} />
                    </span>
                    <span className="font-medium text-[0.9375rem]">{opt.label}</span>
                    <i className="ri-download-line ms-auto text-[#8c9097]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
