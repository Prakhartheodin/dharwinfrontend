"use client"

import React, { Fragment, useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import dynamic from 'next/dynamic'
import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as trainingModulesApi from '@/shared/lib/api/training-modules'
import * as categoriesApi from '@/shared/lib/api/categories'
import * as studentsApi from '@/shared/lib/api/students'
import * as mentorsApi from '@/shared/lib/api/mentors'
import * as blogApi from '@/shared/lib/api/blog'
import type { BlogSuggestionEdit } from '@/shared/lib/api/blog'

const Select = dynamic(() => import('react-select'), { ssr: false })

const blogGeneratorLogger = {
  info: (msg: string, data?: Record<string, unknown>) => {
    console.log('[BlogGenerator]', msg, data ?? '')
  },
  warn: (msg: string, data?: Record<string, unknown>) => {
    console.warn('[BlogGenerator]', msg, data ?? '')
  },
  error: (msg: string, err?: unknown) => {
    console.error('[BlogGenerator]', msg, err)
  },
}

export type { BlogSuggestionEdit } from '@/shared/lib/api/blog'

type PlaylistItemType = 'video' | 'youtube' | 'quiz' | 'pdf' | 'blog' | 'essay'

export type BlogFormat =
  | 'expressive'
  | 'assertive'
  | 'professional'
  | 'casual'
  | 'informative'
  | 'persuasive'
  | 'neutral'

const BLOG_FORMAT_OPTIONS: { value: BlogFormat; label: string }[] = [
  { value: 'neutral', label: 'Neutral' },
  { value: 'expressive', label: 'Expressive' },
  { value: 'assertive', label: 'Assertive' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'informative', label: 'Informative' },
  { value: 'persuasive', label: 'Persuasive' },
]

type QuizOption = {
  id: string
  text: string
  correct: boolean
}

type QuizQuestion = {
  id: string
  question: string
  options: QuizOption[]
  multipleCorrect: boolean
}

const MODULE_TEMPLATES: {
  name: string
  description: string
  playlist: { type: PlaylistItemType; title: string; source?: string; blogContent?: string; quizData?: QuizQuestion[]; essayQuestions?: { id: string; questionText: string }[] }[]
}[] = [
  {
    name: 'Video Course',
    description: 'Intro blog + 3 video placeholders + quiz',
    playlist: [
      { type: 'blog', title: 'Introduction', blogContent: '' },
      { type: 'youtube', title: 'Lesson 1', source: '' },
      { type: 'youtube', title: 'Lesson 2', source: '' },
      { type: 'youtube', title: 'Lesson 3', source: '' },
      { type: 'quiz', title: 'Module Quiz', quizData: [] },
    ],
  },
  {
    name: 'Reading + Assessment',
    description: '2 blogs + quiz + Q&A',
    playlist: [
      { type: 'blog', title: 'Reading 1', blogContent: '' },
      { type: 'blog', title: 'Reading 2', blogContent: '' },
      { type: 'quiz', title: 'Comprehension Quiz', quizData: [] },
      { type: 'essay', title: 'Reflection Q&A', essayQuestions: [] },
    ],
  },
  {
    name: 'Minimal',
    description: '1 blog + 1 quiz',
    playlist: [
      { type: 'blog', title: 'Lesson', blogContent: '' },
      { type: 'quiz', title: 'Quiz', quizData: [] },
    ],
  },
]

type PlaylistItem = {
  id: string
  backendId?: string
  type: PlaylistItemType
  title: string
  source: string
  duration?: string
  blogContent?: string
  blogFormat?: BlogFormat
  videoPreview?: string
  videoMeta?: trainingModulesApi.FileUpload
  pdfPreview?: string
  pdfMeta?: trainingModulesApi.FileUpload
  quizData?: QuizQuestion[]
  difficulty?: 'easy' | 'medium' | 'hard'
  essayQuestions?: { id: string; questionText: string; expectedAnswer?: string }[]
  sectionTitle?: string
  sectionIndex?: number
}

type ModuleFormData = {
  categoryIds: string[]
  name: string
  coverImage: string
  shortDescription: string
  studentIds: string[]
  mentorIds: string[]
  playlist: PlaylistItem[]
}

type PersonOption = {
  value: string
  label: string
  avatar: string
}

function AIChatPanel({
  moduleId,
  formData,
  convertApiPlaylistToForm,
  onPlaylistUpdate,
  onNameUpdate,
}: {
  moduleId: string
  formData: ModuleFormData
  convertApiPlaylistToForm: (apiItem: trainingModulesApi.PlaylistItem) => PlaylistItem
  onPlaylistUpdate: (playlist: PlaylistItem[]) => void
  onNameUpdate?: (name: string) => void
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }])
    setInput('')
    setError(null)
    setLoading(true)
    try {
      const playlistPayload = formData.playlist.map((item) => {
        const contentType =
          item.type === 'video' ? 'upload-video' :
          item.type === 'youtube' ? 'youtube-link' :
          item.type === 'pdf' ? 'pdf-document' :
          item.type === 'blog' ? 'blog' :
          item.type === 'quiz' ? 'quiz' :
          item.type === 'essay' ? 'essay' : 'blog'
        const p: Record<string, unknown> = {
          contentType,
          title: item.title,
          duration: parseInt(item.duration || '0', 10) || 0,
        }
        if (item.type === 'youtube') p.youtubeUrl = item.source
        if (item.type === 'blog') p.blogContent = item.blogContent
        if (item.type === 'quiz') {
          p.difficulty = item.difficulty || 'medium'
          p.quizData = item.quizData
        }
        if (item.type === 'essay') {
          p.essayData = { questions: (item.essayQuestions ?? []).map((q) => ({ questionText: q.questionText })) }
        }
        return p
      })
      const result = (await trainingModulesApi.aiChat(moduleId, userMsg, {
        moduleName: formData.name,
        shortDescription: formData.shortDescription,
        playlist: playlistPayload,
      })) as { playlist?: trainingModulesApi.PlaylistItem[]; moduleName?: string }
      if (result.playlist?.length) {
        const formPlaylist = result.playlist.map((apiItem) =>
          convertApiPlaylistToForm(apiItem as trainingModulesApi.PlaylistItem)
        )
        onPlaylistUpdate(formPlaylist)
      }
      if (result.moduleName && onNameUpdate) {
        onNameUpdate(result.moduleName)
      }
      setMessages((prev) => [...prev, { role: 'ai', text: 'Module updated based on your request.' }])
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Request failed. Try again.'
      setError(errMsg)
      setMessages((prev) => [...prev, { role: 'ai', text: `Error: ${errMsg}` }])
    }
    setLoading(false)
  }

  return (
    <div className="border rounded-lg p-3 bg-white/60 dark:bg-black/20 mt-4">
      <h6 className="font-semibold mb-1">
        <i className="ri-chat-ai-line me-1" /> AI Assistant
      </h6>
      <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-2">
        Ask to change the module in plain language. Examples: add 2 more quiz questions, add a new blog section, remove all video placeholders, reorder items, change a title, or add more Q&A questions.
      </p>
      <div className="max-h-60 overflow-y-auto space-y-2 mb-3 min-h-[4rem]">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm p-2 rounded ${
              m.role === 'user' ? 'bg-primary/10 text-right' : 'bg-gray-100 dark:bg-white/5'
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm p-2 rounded bg-primary/5 border border-primary/20">
            <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-primary font-medium">Processing your request…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {error && (
        <p className="text-[0.75rem] text-danger mb-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <input
          className="form-control flex-1"
          placeholder="e.g. Add 2 more quiz questions..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button
          type="button"
          className="ti-btn ti-btn-primary !mb-0 shrink-0"
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin me-1.5 align-middle" />
              Processing…
            </>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  )
}

function ModuleChecklist({
  formData,
  coverImageFile,
  existingCoverImageUrl,
}: {
  formData: ModuleFormData
  coverImageFile: File | null
  existingCoverImageUrl: string | null
}) {
  const rules = [
    { label: 'Module name', pass: formData.name.trim().length > 0 },
    { label: 'Short description (50+ chars)', pass: formData.shortDescription.length >= 50 },
    { label: 'Cover image', pass: Boolean(coverImageFile || existingCoverImageUrl) },
    { label: 'At least 1 playlist item', pass: formData.playlist.length > 0 },
    {
      label: 'At least 1 quiz',
      pass: formData.playlist.some((p) => p.type === 'quiz'),
    },
  ]
  return (
    <div className="border rounded-lg p-3 bg-white/60 dark:bg-black/20 mt-4">
      <h6 className="font-semibold mb-2">Quality Checklist</h6>
      {rules.map((r) => (
        <div key={r.label} className="flex items-center gap-2 py-1 text-sm">
          <i
            className={
              r.pass ? 'ri-checkbox-circle-fill text-success' : 'ri-close-circle-line text-warning'
            }
          />
          <span className={r.pass ? '' : 'text-warning'}>{r.label}</span>
        </div>
      ))}
    </div>
  )
}

function CheckboxDropdown({
  options,
  selectedIds,
  onChange,
  label,
  placeholder,
}: {
  options: PersonOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  label: string
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const toggle = (value: string) => {
    if (selectedIds.includes(value)) {
      onChange(selectedIds.filter((id) => id !== value))
    } else {
      onChange([...selectedIds, value])
    }
  }

  const selected = options.filter((o) => selectedIds.includes(o.value))

  return (
    <div className="relative" ref={ref}>
      <label className="form-label block mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ti-form-control form-control flex items-center justify-between text-start w-full"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selectedIds.length === 0 ? 'text-[#8c9097] dark:text-white/50' : ''}>
          {selectedIds.length === 0
            ? placeholder
            : `${selectedIds.length} selected`}
        </span>
        <i className={`ri-arrow-down-s-line text-lg transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute z-10 mt-1 w-full rounded-md border border-defaultborder bg-bodybg shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-b border-defaultborder/50 last:border-b-0"
            >
              <input
                type="checkbox"
                className="form-check-input"
                checked={selectedIds.includes(opt.value)}
                onChange={() => toggle(opt.value)}
              />
              <img src={opt.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              <span className="text-[0.875rem]">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
      {/* Visible list for this module */}
      {selected.length > 0 && (
        <div className="mt-2 p-3 rounded-md border border-defaultborder bg-black/5 dark:bg-white/5">
          <div className="text-[0.75rem] font-semibold text-[#8c9097] dark:text-white/50 mb-2">
            Selected for this module
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.map((person) => (
              <span
                key={person.value}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-[0.8125rem]"
              >
                <img src={person.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                {person.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const CreateModule = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const moduleId = searchParams.get('id')
  const isEditMode = Boolean(moduleId)
  const [activeTab, setActiveTab] = useState<'info' | 'playlist'>('info')
  const [formData, setFormData] = useState<ModuleFormData>({
    categoryIds: [],
    name: '',
    coverImage: '',
    shortDescription: '',
    studentIds: [],
    mentorIds: [],
    playlist: [],
  })

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string>('')
  const [existingCoverImageUrl, setExistingCoverImageUrl] = useState<string>('')
  const [coverImageDragOver, setCoverImageDragOver] = useState(false)
  const coverImageInputRef = useRef<HTMLInputElement>(null)

  // API data
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([])
  const [studentOptions, setStudentOptions] = useState<PersonOption[]>([])
  const [mentorOptions, setMentorOptions] = useState<PersonOption[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(true)
  const [fetchingModule, setFetchingModule] = useState(false)

  const convertApiPlaylistToForm = useCallback((apiItem: trainingModulesApi.PlaylistItem): PlaylistItem => {
    const backendId = (apiItem as { _id?: string; id?: string })._id ?? apiItem.id
    const formItem: PlaylistItem = {
      id: backendId ?? `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      backendId,
      type: 'video',
      title: apiItem.title,
      source: '',
      duration: String(apiItem.duration ?? 0),
      blogContent: '',
      videoPreview: '',
      quizData: [],
    }

    switch (apiItem.contentType) {
      case 'upload-video':
        formItem.type = 'video'
        formItem.videoPreview = apiItem.videoFile?.url ?? ''
        formItem.source = apiItem.videoFile?.originalName ?? ''
        formItem.videoMeta = apiItem.videoFile
        break
      case 'youtube-link':
        formItem.type = 'youtube'
        formItem.source = apiItem.youtubeUrl ?? ''
        break
      case 'pdf-document':
        formItem.type = 'pdf'
        formItem.source = apiItem.pdfDocument?.originalName ?? ''
        formItem.pdfPreview = apiItem.pdfDocument?.url ?? ''
        formItem.pdfMeta = apiItem.pdfDocument
        break
      case 'blog':
        formItem.type = 'blog'
        formItem.blogContent = apiItem.blogContent ?? ''
        break
      case 'quiz': {
        formItem.type = 'quiz'
        formItem.difficulty = (apiItem.difficulty as 'easy' | 'medium' | 'hard') || 'medium'
        const questions = apiItem.quiz?.questions ?? apiItem.quizData?.questions ?? []
        formItem.quizData = questions.map((q: trainingModulesApi.QuizQuestionShape, qi: number) => ({
          id: `q-${backendId ?? 'quiz'}-${qi}`,
          question: q.questionText,
          options: (q.options ?? []).map((o: trainingModulesApi.QuizOptionShape, oi: number) => ({
            id: `o-${backendId ?? 'quiz'}-${qi}-${oi}`,
            text: o.text,
            correct: o.isCorrect,
          })),
          multipleCorrect: q.allowMultipleAnswers ?? false,
        }))
        break
      }
      case 'essay': {
        formItem.type = 'essay'
        const questions = apiItem.essay?.questions ?? apiItem.essayData?.questions ?? []
        formItem.essayQuestions = questions.map(
          (q: { questionText?: string; expectedAnswer?: string }, qi: number) => ({
            id: `eq-${backendId ?? 'essay'}-${qi}`,
            questionText: q.questionText ?? '',
            expectedAnswer: q.expectedAnswer ?? '',
          })
        )
        break
      }
      default:
        break
    }

    if (apiItem.sectionTitle != null) formItem.sectionTitle = apiItem.sectionTitle
    if (apiItem.sectionIndex != null) formItem.sectionIndex = apiItem.sectionIndex
    return formItem
  }, [])

  useEffect(() => {
    if (!isEditMode || !moduleId) return

    const fetchModule = async () => {
      setFetchingModule(true)
      try {
        const module = await trainingModulesApi.getTrainingModule(moduleId)
        setFormData({
          categoryIds: module.categories?.map((c: { id: string }) => c.id) ?? [],
          name: module.moduleName,
          coverImage: module.coverImage?.url ?? '',
          shortDescription: module.shortDescription,
          studentIds: module.students?.map((s: { id: string }) => s.id) ?? [],
          mentorIds: module.mentorsAssigned?.map((m: { id: string }) => m.id) ?? [],
          playlist: (module.playlist ?? []).filter((p) => (p as { contentType?: string }).contentType !== 'test').map(convertApiPlaylistToForm),
        })

        if (module.coverImage?.url) {
          setExistingCoverImageUrl(module.coverImage.url)
          setCoverImagePreview(module.coverImage.url)
        }
      } catch (err) {
        console.error('Error fetching module:', err)
        await Swal.fire({
          icon: 'error',
          title: 'Failed to load module',
          text: 'Could not load module data. Please try again.',
          toast: true,
          position: 'top-end',
          timer: 4000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
        router.push('/training/curriculum/modules')
      } finally {
        setFetchingModule(false)
      }
    }

    fetchModule()
  }, [convertApiPlaylistToForm, isEditMode, moduleId, router])

  // Fetch categories, students, and mentors
  useEffect(() => {
    const fetchData = async () => {
      setFetchingData(true)
      try {
        // Fetch categories
        const categoriesRes = await categoriesApi.listCategories({ limit: 100 })
        setCategoryOptions(
          categoriesRes.results.map((cat) => ({ value: cat.id, label: cat.name }))
        )

        // Fetch students
        const studentsRes = await studentsApi.listStudents({ limit: 100 })
        setStudentOptions(
          studentsRes.results.map((s) => ({
            value: s.id,
            label: s.user?.name || 'Unknown',
            avatar: '/assets/images/faces/1.jpg', // Default avatar
          }))
        )

        // Fetch mentors
        const mentorsRes = await mentorsApi.listMentors({ limit: 100 })
        setMentorOptions(
          mentorsRes.results.map((m) => ({
            value: m.id,
            label: m.user?.name || 'Unknown',
            avatar: '/assets/images/faces/1.jpg', // Default avatar
          }))
        )
      } catch (err) {
        console.error('Error fetching data:', err)
        await Swal.fire({
          icon: 'error',
          title: 'Failed to load data',
          text: 'Could not load categories, students, or mentors. Please refresh the page.',
          toast: true,
          position: 'top-end',
          timer: 4000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
      } finally {
        setFetchingData(false)
      }
    }

    fetchData()
  }, [])

  const handleInputChange = (field: keyof ModuleFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const processCoverImageFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    setCoverImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setCoverImagePreview(reader.result as string)
      handleInputChange('coverImage', reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processCoverImageFile(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  const handleCoverImageDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setCoverImageDragOver(false)
    processCoverImageFile(e.dataTransfer.files?.[0] ?? null)
  }

  const handleCoverImageDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCoverImageDragOver(true)
  }

  const handleCoverImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCoverImageDragOver(false)
  }

  const handleCoverImageRemove = () => {
    setCoverImageFile(null)
    if (isEditMode && existingCoverImageUrl) {
      setCoverImagePreview(existingCoverImageUrl)
      handleInputChange('coverImage', existingCoverImageUrl)
    } else {
      setCoverImagePreview('')
      handleInputChange('coverImage', '')
    }
    if (coverImageInputRef.current) coverImageInputRef.current.value = ''
  }

  const handleCategoryChange = (option: { value: string; label: string } | null) => {
    handleInputChange('categoryIds', option ? [option.value] : [])
  }

  const [quizModalItemId, setQuizModalItemId] = useState<string | null>(null)
  const [blogAiItemId, setBlogAiItemId] = useState<string | null>(null)
  const [blogAiEnhancingId, setBlogAiEnhancingId] = useState<string | null>(null)
  const [blogAiLoading, setBlogAiLoading] = useState(false)
  const [blogAiGenerateTitle, setBlogAiGenerateTitle] = useState('')
  const [blogAiGenerateKeywords, setBlogAiGenerateKeywords] = useState('')
  const [blogAiWordCount, setBlogAiWordCount] = useState(500)
  const [blogAiNumberOfBlogs, setBlogAiNumberOfBlogs] = useState(1)
  const [blogAiTitleMode, setBlogAiTitleMode] = useState<'single' | 'separate'>('single')
  const [blogAiTitlesText, setBlogAiTitlesText] = useState('')
  const [blogAiGenerateFormat, setBlogAiGenerateFormat] = useState<BlogFormat>('neutral')
  const [blogSuggestionsByItem, setBlogSuggestionsByItem] = useState<
    Record<string, { status: 'idle' | 'loading' | 'done'; edits: BlogSuggestionEdit[] }>
  >({})
  const [videoDragOverId, setVideoDragOverId] = useState<string | null>(null)
  const [videoPreviewItemId, setVideoPreviewItemId] = useState<string | null>(null)
  const [pdfDragOverId, setPdfDragOverId] = useState<string | null>(null)
  const pdfFilesRef = useRef<Record<string, File>>({})
  const videoFilesRef = useRef<Record<string, File>>({})
  const formDataRef = useRef(formData)
  formDataRef.current = formData
  const suggestionTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const blogContentRef = useRef<Record<string, string>>({})
  const pendingSuggestionContentRef = useRef<Record<string, string>>({})
  const sectionRefsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const drakeInstancesRef = useRef<Record<string, { destroy: () => void }>>({})
  const [videoPreviewModal, setVideoPreviewModal] = useState<{ itemId: string; url: string } | null>(
    null,
  )

  // Enhance with AI for Quiz and Q&A
  const [enhanceType, setEnhanceType] = useState<'quiz' | 'essay' | null>(null)
  const [enhanceItemId, setEnhanceItemId] = useState<string | null>(null)
  const [enhanceDifficulty, setEnhanceDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [enhanceQuestionSelection, setEnhanceQuestionSelection] = useState<'all' | number[]>('all')
  const [enhanceLoading, setEnhanceLoading] = useState(false)

  const getYoutubeVideoId = (url: string): string | null => {
    if (!url?.trim()) return null
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    return m ? m[1] : null
  }

  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`
    if (sizeInBytes < 1024 * 1024 * 1024) return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  const applyTemplate = (template: (typeof MODULE_TEMPLATES)[0]) => {
    const items: PlaylistItem[] = template.playlist.map((t, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      type: t.type,
      title: t.title,
      source: t.source ?? '',
      duration: '',
      blogContent: t.blogContent ?? '',
      quizData: t.quizData ?? [],
      essayQuestions: (t.essayQuestions ?? []).map((q, qi) => ({
        id: `eq-${Date.now()}-${i}-${qi}`,
        questionText: q.questionText ?? '',
      })),
    }))
    handleInputChange('playlist', items)
  }

  const handleAddPlaylistItem = () => {
    const newItem: PlaylistItem = {
      id: Date.now().toString(),
      type: 'video',
      title: '',
      source: '',
      duration: '',
      blogContent: '',
      videoPreview: '',
      videoMeta: undefined,
      pdfPreview: '',
      pdfMeta: undefined,
      quizData: [],
    }
    setFormData((prev) => ({
      ...prev,
      playlist: [...prev.playlist, newItem],
    }))
  }

  const handlePlaylistItemChange = (id: string, field: keyof PlaylistItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      playlist: prev.playlist.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }

  const handleRemovePlaylistItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      playlist: prev.playlist.filter((item) => item.id !== id),
    }))
  }

  const handleReorderWithinSection = useCallback(
    (sectionKey: string, orderedIds: string[]) => {
      setFormData((prev) => {
        const itemsById = new Map(prev.playlist.map((i) => [i.id, i]))
        const reordered = orderedIds
          .map((id) => itemsById.get(id))
          .filter(Boolean) as PlaylistItem[]
        const sectionIndices: number[] = []
        prev.playlist.forEach((p, i) => {
          if ((p.sectionTitle ?? '__none__') === sectionKey) sectionIndices.push(i)
        })
        if (sectionIndices.length === 0) return prev
        const start = sectionIndices[0]
        const end = sectionIndices[sectionIndices.length - 1] + 1
        return {
          ...prev,
          playlist: [
            ...prev.playlist.slice(0, start),
            ...reordered,
            ...prev.playlist.slice(end),
          ],
        }
      })
    },
    [],
  )

  const playlistStructureKey = useMemo(
    () =>
      formData.playlist
        .map((i) => `${i.sectionTitle ?? '__none__'}:${i.id}`)
        .sort()
        .join(','),
    [formData.playlist],
  )

  useEffect(() => {
    if (typeof window === 'undefined' || activeTab !== 'playlist') return
    const drakes = drakeInstancesRef.current
    Object.keys(drakes).forEach((k) => {
      drakes[k].destroy()
      delete drakes[k]
    })
    const id = setTimeout(() => {
      const refs = sectionRefsRef.current
      const dragula = require('dragula') as (
        containers: HTMLElement[],
        options?: { moves?: (el: Element, source: Element, handle: Element, sibling: Element) => boolean }
      ) => { on: (ev: string, cb: (...args: unknown[]) => void) => void; destroy: () => void }
      Object.entries(refs).forEach(([sectionKey, el]) => {
      if (!el) return
      const drake = dragula([el], {
        moves: (_el: Element, _source: Element, handle: Element) => {
          if (!handle || !(handle as HTMLElement).closest) return false
          return Boolean((handle as HTMLElement).closest('.playlist-drag-handle'))
        },
      })
      drake.on('drop', (...args: unknown[]) => {
        const target = args[1] as HTMLElement
        const key = target?.getAttribute('data-playlist-section')
        if (!key) return
        const ids: string[] = []
        Array.from(target.children).forEach((child) => {
          const id = (child as HTMLElement).getAttribute('data-playlist-item-id')
          if (id) ids.push(id)
        })
        handleReorderWithinSection(key, ids)
      })
      drakes[sectionKey] = drake
    })
    }, 0)
    return () => {
      clearTimeout(id)
      Object.keys(drakes).forEach((k) => {
        drakes[k].destroy()
        delete drakes[k]
      })
    }
  }, [activeTab, playlistStructureKey, handleReorderWithinSection])

  const quizModalItem = quizModalItemId
    ? formData.playlist.find((i) => i.id === quizModalItemId)
    : null

  const blogAiItem = blogAiItemId ? formData.playlist.find((i) => i.id === blogAiItemId) : null

  const stripHtml = (html: string) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  const scheduleBlogSuggestionCheck = (itemId: string, html: string) => {
    blogContentRef.current[itemId] = html
    const t = suggestionTimerRef.current[itemId]
    if (t) clearTimeout(t)
    suggestionTimerRef.current[itemId] = setTimeout(() => {
      delete suggestionTimerRef.current[itemId]
      const content = blogContentRef.current[itemId] ?? ''
      const plainLen = stripHtml(content).length
      if (plainLen < 40) return
      const item = formDataRef.current.playlist.find((p) => p.id === itemId)
      if (!item || item.type !== 'blog') return
      const format = (item.blogFormat ?? 'neutral') as BlogFormat
      setBlogSuggestionsByItem((prev) => ({
        ...prev,
        [itemId]: { status: 'loading', edits: [] },
      }))
      pendingSuggestionContentRef.current[itemId] = content
      blogApi.getBlogSuggestions({ content, format })
        .then((result) => {
          if (pendingSuggestionContentRef.current[itemId] !== content) return
          const spellingReasons = ['spelling', 'typo', 'typos']
          const isSpellingEdit = (e: BlogSuggestionEdit) =>
            spellingReasons.includes(e.reason.toLowerCase())
          const spellingEdits = result.edits.filter(isSpellingEdit)
          const otherEdits = result.edits.filter((e) => !isSpellingEdit(e))
          let newContent = content
          spellingEdits.forEach((edit) => {
            const idx = newContent.indexOf(edit.original)
            if (idx !== -1) {
              newContent =
                newContent.slice(0, idx) +
                edit.suggested +
                newContent.slice(idx + edit.original.length)
            }
          })
          if (spellingEdits.length > 0 && newContent !== content) {
            handleInputChange(
              'playlist',
              formDataRef.current.playlist.map((p) =>
                p.id === itemId && p.type === 'blog'
                  ? { ...p, blogContent: newContent }
                  : p,
              ),
            )
            blogContentRef.current[itemId] = newContent
          }
          setBlogSuggestionsByItem((prev) => ({
            ...prev,
            [itemId]: { status: 'done', edits: otherEdits },
          }))
        })
        .catch((err) => {
          blogGeneratorLogger.error('Blog suggestions failed', err)
          setBlogSuggestionsByItem((prev) => ({
            ...prev,
            [itemId]: { status: 'idle', edits: [] },
          }))
        })
    }, 1200)
  }

  const handleBlogAcceptEdit = (itemId: string, editIndex: number, currentContent: string) => {
    const state = blogSuggestionsByItem[itemId]
    if (!state || state.status !== 'done' || !state.edits[editIndex]) return
    const edit = state.edits[editIndex]
    const idx = currentContent.indexOf(edit.original)
    if (idx === -1) {
      setBlogSuggestionsByItem((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          edits: prev[itemId].edits.filter((_, i) => i !== editIndex),
        },
      }))
      return
    }
    const newContent =
      currentContent.slice(0, idx) +
      edit.suggested +
      currentContent.slice(idx + edit.original.length)
    handlePlaylistItemChange(itemId, 'blogContent', newContent)
    blogContentRef.current[itemId] = newContent
    setBlogSuggestionsByItem((prev) => {
      const nextEdits = prev[itemId].edits.filter((_, i) => i !== editIndex)
      return {
        ...prev,
        [itemId]: {
          status: nextEdits.length === 0 ? 'idle' : 'done',
          edits: nextEdits,
        },
      }
    })
  }

  const handleBlogIgnoreEdit = (itemId: string, editIndex: number) => {
    setBlogSuggestionsByItem((prev) => {
      const nextEdits = prev[itemId].edits.filter((_, i) => i !== editIndex)
      return {
        ...prev,
        [itemId]: {
          status: nextEdits.length === 0 ? 'idle' : 'done',
          edits: nextEdits,
        },
      }
    })
  }

  const handleBlogEnhanceWithAi = async (itemId: string) => {
    const item = formData.playlist.find((i) => i.id === itemId)
    if (!item || item.type !== 'blog') {
      blogGeneratorLogger.warn('handleBlogEnhanceWithAi: item not found or not blog', { itemId })
      return
    }
    const hasContent = stripHtml(item.blogContent ?? '').length > 0
    blogGeneratorLogger.info('Enhance with AI clicked', { itemId, hasContent })
    if (hasContent) {
      setBlogAiEnhancingId(itemId)
      setBlogAiLoading(true)
      try {
        await blogApi.generateBlogStream(
          {
            mode: 'enhance',
            existingContent: item.blogContent ?? '',
            format: (item.blogFormat ?? 'neutral') as BlogFormat,
          },
          {
            onChunk: (textSoFar) => handlePlaylistItemChange(itemId, 'blogContent', textSoFar),
            onDone: (html) => handlePlaylistItemChange(itemId, 'blogContent', html),
          }
        )
        blogGeneratorLogger.info('Enhance completed (stream)', { itemId })
      } catch (e) {
        blogGeneratorLogger.error('Enhance failed', e)
        alert(e instanceof Error ? e.message : 'Failed to enhance blog')
      } finally {
        setBlogAiLoading(false)
        setBlogAiEnhancingId(null)
      }
    } else {
      blogGeneratorLogger.info('Opening generate modal (empty content)', { itemId })
      setBlogAiItemId(itemId)
      setBlogAiGenerateTitle('')
      setBlogAiGenerateKeywords('')
      setBlogAiWordCount(500)
      setBlogAiGenerateFormat((item.blogFormat ?? 'neutral') as BlogFormat)
    }
  }

  const handleBlogGenerateFromTitle = async () => {
    if (!blogAiItemId || !blogAiItem) {
      blogGeneratorLogger.warn('handleBlogGenerateFromTitle: no blogAiItemId or blogAiItem')
      return
    }
    const numBlogs = Math.min(10, Math.max(1, blogAiNumberOfBlogs))
    const titlesFromLines =
      blogAiTitleMode === 'separate'
        ? blogAiTitlesText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, numBlogs)
        : []

    if (blogAiTitleMode === 'single' && !blogAiGenerateTitle.trim()) {
      alert('Enter a theme or title.')
      return
    }
    if (blogAiTitleMode === 'separate' && titlesFromLines.length < numBlogs) {
      alert(`Enter at least ${numBlogs} title(s), one per line.`)
      return
    }

    blogGeneratorLogger.info('Generate blogs start', {
      numBlogs,
      titleMode: blogAiTitleMode,
      theme: blogAiTitleMode === 'single' ? blogAiGenerateTitle.slice(0, 50) : undefined,
      titlesCount: blogAiTitleMode === 'separate' ? titlesFromLines.length : undefined,
      wordCount: blogAiWordCount,
    })

    setBlogAiLoading(true)
    try {
      const results: { title: string; content: string }[] = []

      if (blogAiTitleMode === 'single') {
        for (let i = 0; i < numBlogs; i++) {
          blogGeneratorLogger.info('Generating blog (theme)', { index: i + 1, total: numBlogs })
          const result = await blogApi.generateBlogFromTheme({
            theme: blogAiGenerateTitle,
            index: i,
            total: numBlogs,
            keywords: blogAiGenerateKeywords,
            wordCount: blogAiWordCount,
            format: blogAiGenerateFormat,
          })
          results.push(result)
        }
      } else {
        for (let i = 0; i < numBlogs; i++) {
          const title = titlesFromLines[i] || `Blog ${i + 1}`
          blogGeneratorLogger.info('Generating blog (separate title)', { index: i + 1, total: numBlogs, title: title.slice(0, 50) })
          const useStream = numBlogs === 1
          if (useStream) {
            const content = await blogApi.generateBlogStream(
              {
                mode: 'generate',
                title,
                keywords: blogAiGenerateKeywords,
                wordCount: blogAiWordCount,
                format: blogAiGenerateFormat,
              },
              {
                onChunk: (textSoFar) => handlePlaylistItemChange(blogAiItemId!, 'blogContent', textSoFar),
                onDone: (html) => handlePlaylistItemChange(blogAiItemId!, 'blogContent', html),
              }
            )
            results.push({ title, content })
          } else {
            const content = await blogApi.generateBlog({
              mode: 'generate',
              title,
              keywords: blogAiGenerateKeywords,
              wordCount: blogAiWordCount,
              format: blogAiGenerateFormat,
            })
            results.push({ title, content })
          }
        }
      }

      const currentIndex = formData.playlist.findIndex((p) => p.id === blogAiItemId)
      if (currentIndex < 0) {
        blogGeneratorLogger.error('Current blog item not found in playlist', { blogAiItemId })
        return
      }

      const [first, ...rest] = results
      const updatedFirst: PlaylistItem = {
        ...blogAiItem,
        title: first.title,
        blogContent: first.content,
        blogFormat: blogAiGenerateFormat,
      }
      const newItems: PlaylistItem[] = rest.map((r) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: 'blog' as const,
        title: r.title,
        source: '',
        duration: '',
        blogContent: r.content,
        blogFormat: blogAiGenerateFormat,
        videoPreview: '',
        quizData: [],
      }))

      const newPlaylist = [
        ...formData.playlist.slice(0, currentIndex),
        updatedFirst,
        ...newItems,
        ...formData.playlist.slice(currentIndex + 1),
      ]
      handleInputChange('playlist', newPlaylist)

      blogGeneratorLogger.info('Generate blogs completed', {
        numBlogs,
        playlistLengthBefore: formData.playlist.length,
        playlistLengthAfter: newPlaylist.length,
        newItemTitles: results.map((r) => r.title.slice(0, 40)),
      })

      setBlogAiItemId(null)
      setBlogAiGenerateTitle('')
      setBlogAiGenerateKeywords('')
      setBlogAiWordCount(500)
      setBlogAiNumberOfBlogs(1)
      setBlogAiTitleMode('single')
      setBlogAiTitlesText('')
      setBlogAiGenerateFormat('neutral')
    } catch (e) {
      blogGeneratorLogger.error('Generate blogs failed', e)
      alert(e instanceof Error ? e.message : 'Failed to generate blog')
    } finally {
      setBlogAiLoading(false)
    }
  }

  const updateQuizData = (itemId: string, quizData: QuizQuestion[]) => {
    handlePlaylistItemChange(itemId, 'quizData', quizData)
  }

  const addQuizQuestion = (itemId: string) => {
    const item = formData.playlist.find((i) => i.id === itemId)
    const prev = item?.quizData ?? []
    updateQuizData(itemId, [
      ...prev,
      {
        id: Date.now().toString(),
        question: '',
        options: [
          { id: 'o1', text: '', correct: false },
          { id: 'o2', text: '', correct: false },
        ],
        multipleCorrect: false,
      },
    ])
  }

  const removeQuizQuestion = (itemId: string, qId: string) => {
    const item = formData.playlist.find((i) => i.id === itemId)
    if (!item?.quizData) return
    updateQuizData(itemId, item.quizData.filter((q) => q.id !== qId))
  }

  const updateQuizQuestion = (
    itemId: string,
    qId: string,
    field: 'question' | 'multipleCorrect',
    value: string | boolean,
  ) => {
    const item = formData.playlist.find((i) => i.id === itemId)
    if (!item?.quizData) return
    updateQuizData(
      itemId,
      item.quizData.map((q) =>
        q.id === qId ? { ...q, [field]: value } : q,
      ),
    )
  }

  const addQuizOption = (itemId: string, qId: string) => {
    const item = formData.playlist.find((i) => i.id === itemId)
    if (!item?.quizData) return
    updateQuizData(
      itemId,
      item.quizData.map((q) =>
        q.id === qId
          ? { ...q, options: [...q.options, { id: `o-${Date.now()}`, text: '', correct: false }] }
          : q,
      ),
    )
  }

  const removeQuizOption = (itemId: string, qId: string, optId: string) => {
    const item = formData.playlist.find((i) => i.id === itemId)
    if (!item?.quizData) return
    updateQuizData(
      itemId,
      item.quizData.map((q) =>
        q.id === qId ? { ...q, options: q.options.filter((o) => o.id !== optId) } : q,
      ),
    )
  }

  const updateQuizOption = (
    itemId: string,
    qId: string,
    optId: string,
    field: 'text' | 'correct',
    value: string | boolean,
  ) => {
    const item = formData.playlist.find((i) => i.id === itemId)
    if (!item?.quizData) return
    const updateCorrect = (q: QuizQuestion) => {
      if (q.id !== qId) return q
      const opts = q.options.map((o) =>
        o.id === optId ? { ...o, [field]: value } : o,
      )
      if (field === 'correct' && value === true && !q.multipleCorrect) {
        return { ...q, options: opts.map((o) => ({ ...o, correct: o.id === optId })) }
      }
      return { ...q, options: opts }
    }
    updateQuizData(itemId, item.quizData.map(updateCorrect))
  }

  const handleAddEssayQuestion = (itemId: string) => {
    const item = formData.playlist.find((p) => p.id === itemId)
    if (!item) return
    const prev = item.essayQuestions ?? []
    const newQ = {
      id: `eq-${itemId}-${Date.now()}`,
      questionText: '',
      expectedAnswer: '',
    }
    handlePlaylistItemChange(itemId, 'essayQuestions', [...prev, newQ])
  }

  const handleEssayQuestionChange = (itemId: string, qId: string, questionText: string) => {
    const item = formData.playlist.find((p) => p.id === itemId)
    if (!item?.essayQuestions) return
    handlePlaylistItemChange(
      itemId,
      'essayQuestions',
      item.essayQuestions.map((q) => (q.id === qId ? { ...q, questionText } : q)),
    )
  }

  const handleEssayExpectedAnswerChange = (itemId: string, qId: string, expectedAnswer: string) => {
    const item = formData.playlist.find((p) => p.id === itemId)
    if (!item?.essayQuestions) return
    handlePlaylistItemChange(
      itemId,
      'essayQuestions',
      item.essayQuestions.map((q) => (q.id === qId ? { ...q, expectedAnswer } : q)),
    )
  }

  const handleRemoveEssayQuestion = (itemId: string, qId: string) => {
    const item = formData.playlist.find((p) => p.id === itemId)
    if (!item?.essayQuestions) return
    handlePlaylistItemChange(
      itemId,
      'essayQuestions',
      item.essayQuestions.filter((q) => q.id !== qId),
    )
  }

  const openEnhanceModal = (type: 'quiz' | 'essay', itemId: string) => {
    const item = formData.playlist.find((i) => i.id === itemId)
    if (!item) return
    const d = (item as { difficulty?: string }).difficulty
    setEnhanceType(type)
    setEnhanceItemId(itemId)
    setEnhanceDifficulty(
      d === 'easy' || d === 'hard' ? d : 'medium',
    )
    setEnhanceQuestionSelection('all')
  }

  const handleEnhanceConfirm = async () => {
    if (!enhanceItemId || !enhanceType) return
    const item = formData.playlist.find((i) => i.id === enhanceItemId)
    if (!item) return

    setEnhanceLoading(true)
    try {
      const moduleTitle = item.title || formData.name || 'Module'
      const topic = formData.shortDescription || formData.name || ''

      if (enhanceType === 'quiz') {
        const existingQuestions = (item.quizData ?? []).map((q) => ({
          question: q.question,
          options: q.options.map((o) => ({ text: o.text, isCorrect: o.correct })),
        }))
        const questionIndices =
          enhanceQuestionSelection === 'all' ? 'all' : enhanceQuestionSelection
        const result = await trainingModulesApi.enhanceQuiz({
          moduleTitle,
          topic,
          difficulty: enhanceDifficulty,
          existingQuestions,
          questionIndices,
        })
        const existing = item.quizData ?? []
        let newQuizData: QuizQuestion[]
        if (questionIndices === 'all') {
          newQuizData = result.questions.map((q, qi) => ({
            id: `q-${item.id}-${qi}-${Date.now()}`,
            question: q.questionText,
            options: (q.options ?? []).map((o, oi) => ({
              id: `o-${item.id}-${qi}-${oi}-${Date.now()}`,
              text: o.text,
              correct: o.isCorrect,
            })),
            multipleCorrect: q.allowMultipleAnswers ?? false,
          }))
        } else {
          const indices = questionIndices as number[]
          newQuizData = existing.map((q, i) => {
            const idx = indices.indexOf(i)
            if (idx < 0) return q
            const r = result.questions[idx]
            if (!r) return q
            return {
              id: q.id,
              question: r.questionText,
              options: (r.options ?? []).map((o, oi) => ({
                id: `o-${item.id}-${i}-${oi}-${Date.now()}`,
                text: o.text,
                correct: o.isCorrect,
              })),
              multipleCorrect: r.allowMultipleAnswers ?? false,
            }
          })
        }
        handlePlaylistItemChange(enhanceItemId, 'quizData', newQuizData)
      } else {
        const existingQuestions = (item.essayQuestions ?? []).map((q) => ({
          questionText: q.questionText,
        }))
        const questionIndices =
          enhanceQuestionSelection === 'all' ? 'all' : enhanceQuestionSelection
        const result = await trainingModulesApi.enhanceEssay({
          moduleTitle,
          topic,
          difficulty: enhanceDifficulty,
          existingQuestions,
          questionIndices,
        })
        const existingEssay = item.essayQuestions ?? []
        let newEssayQuestions: { id: string; questionText: string; expectedAnswer?: string }[]
        if (questionIndices === 'all') {
          newEssayQuestions = result.questions.map((q, qi) => ({
            id: `eq-${item.id}-${qi}-${Date.now()}`,
            questionText: q.questionText,
            expectedAnswer: q.expectedAnswer ?? '',
          }))
        } else {
          const indices = questionIndices as number[]
          newEssayQuestions = existingEssay.map((q, i) => {
            const idx = indices.indexOf(i)
            if (idx < 0) return q
            const r = result.questions[idx]
            if (!r) return q
            return { ...q, questionText: r.questionText, expectedAnswer: r.expectedAnswer ?? q.expectedAnswer ?? '' }
          })
        }
        handlePlaylistItemChange(enhanceItemId, 'essayQuestions', newEssayQuestions)
      }
      setEnhanceType(null)
      setEnhanceItemId(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enhance')
    } finally {
      setEnhanceLoading(false)
    }
  }

  const processPlaylistVideoFile = (itemId: string, file: File | null) => {
    if (!file) return
    const looksLikeVideo =
      file.type.startsWith('video/') ||
      /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(file.name)
    if (!looksLikeVideo) return
    videoFilesRef.current[itemId] = file
    const url = URL.createObjectURL(file)
    handlePlaylistItemChange(itemId, 'videoPreview', url)
    handlePlaylistItemChange(itemId, 'source', file.name)
    setVideoPreviewItemId(itemId)
  }

  const processPlaylistPdfFile = (itemId: string, file: File | null) => {
    if (!file) return
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (!isPdf) return
    pdfFilesRef.current[itemId] = file
    const url = URL.createObjectURL(file)
    handlePlaylistItemChange(itemId, 'source', file.name)
    handlePlaylistItemChange(itemId, 'pdfPreview', url)
  }

  const removePlaylistPdfFile = (itemId: string) => {
    delete pdfFilesRef.current[itemId]
    const current = formData.playlist.find((item) => item.id === itemId)
    if (current?.pdfPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(current.pdfPreview)
    }
    handlePlaylistItemChange(itemId, 'source', '')
    handlePlaylistItemChange(itemId, 'pdfPreview', '')
  }

  const openPdfPreview = (item: PlaylistItem) => {
    if (!item.pdfPreview) return
    window.open(item.pdfPreview, '_blank', 'noopener,noreferrer')
  }

  const downloadQuizTemplate = () => {
    const headers = ['Question', 'Option1', 'Option2', 'Option3', 'Option4', 'CorrectAnswer']
    const exampleRows = [
      ['What is 2 + 2?', '3', '4', '5', '6', '2'],
      ['Select all prime numbers', '2', '4', '5', '9', '1,3'],
    ]
    const csvContent = [
      headers.join(','),
      ...exampleRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quiz_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if ((c === ',' && !inQuotes) || c === '\n' || c === '\r') {
        result.push(current.trim())
        current = ''
        if (c !== ',') break
      } else {
        current += c
      }
    }
    result.push(current.trim())
    return result
  }

  const handleQuizFileUpload = (itemId: string, file: File | null) => {
    if (!file || !quizModalItemId) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result)
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) return
      const header = parseCsvLine(lines[0])
      const questionIdx = header.findIndex((h) => /question/i.test(h))
      const optionIndices: number[] = []
      for (let n = 1; n <= 6; n++) {
        const i = header.findIndex((h) =>
          new RegExp(`option\\s*${n}|option${n}`, 'i').test(h),
        )
        if (i >= 0) optionIndices.push(i)
      }
      const correctIdx = header.findIndex((h) => /correct/i.test(h))
      if (questionIdx < 0 || optionIndices.length < 2 || correctIdx < 0) return
      const questions: QuizQuestion[] = []
      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i])
        const questionText = cells[questionIdx] ?? ''
        const correctVal = (cells[correctIdx] ?? '').trim()
        const correctNums = new Set(
          correctVal.split(/[,;]/).map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && n >= 1),
        )
        const options: QuizOption[] = optionIndices
          .map((_, idx) => ({
            id: `o-${Date.now()}-${i}-${idx}`,
            text: (cells[optionIndices[idx]] ?? '').trim(),
            correct: correctNums.has(idx + 1),
          }))
          .filter((o) => o.text !== '')
        if (questionText && options.length >= 2) {
          questions.push({
            id: `q-${Date.now()}-${i}`,
            question: questionText,
            options,
            multipleCorrect: correctNums.size > 1,
          })
        }
      }
      if (questions.length > 0) {
        updateQuizData(itemId, [...(formData.playlist.find((p) => p.id === itemId)?.quizData ?? []), ...questions])
      }
    }
    reader.readAsText(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Module name is required')
      }
      if (!formData.shortDescription.trim()) {
        throw new Error('Short description is required')
      }
      if (!isEditMode && !coverImageFile) {
        throw new Error('Cover image is required')
      }
      if (!formData.categoryIds || formData.categoryIds.length === 0) {
        throw new Error('Category is required')
      }

      // Map playlist items to API format (playlist sent as JSON; quizData included)
      const playlistItems: trainingModulesApi.PlaylistItem[] = formData.playlist.map((item, index) => {
        const playlistItem: trainingModulesApi.PlaylistItem = {
          _id: item.backendId,
          contentType: item.type === 'video' ? 'upload-video' :
                       item.type === 'youtube' ? 'youtube-link' :
                       item.type === 'pdf' ? 'pdf-document' :
                       item.type === 'blog' ? 'blog' :
                       item.type === 'quiz' ? 'quiz' :
                       item.type === 'essay' ? 'essay' :
                       'blog',
          title: item.title,
          duration: parseInt(item.duration || '0', 10) || 0,
          order: index,
        }
        if (item.sectionTitle != null) playlistItem.sectionTitle = item.sectionTitle
        if (item.sectionIndex != null) playlistItem.sectionIndex = item.sectionIndex

        switch (playlistItem.contentType) {
          case 'upload-video':
            // Keep existing uploaded file metadata on edit if no new file selected.
            if (!videoFilesRef.current[item.id] && item.videoMeta) {
              playlistItem.videoFile = item.videoMeta
            }
            break
          case 'pdf-document':
            // Keep existing uploaded file metadata on edit if no new file selected.
            if (!pdfFilesRef.current[item.id] && item.pdfMeta) {
              playlistItem.pdfDocument = item.pdfMeta
            }
            break
          case 'youtube-link':
            playlistItem.youtubeUrl = item.source
            break
          case 'blog':
            playlistItem.blogContent = item.blogContent || ''
            break
          case 'quiz': {
            if (item.quizData && item.quizData.length > 0) {
              const itemLabel = item.title?.trim() || `Playlist item ${index + 1}`
              const sanitizedQuestions = item.quizData
                .map((q, qIndex) => {
                const questionText = (q.question || '').trim()
                if (!questionText) return null

                const sanitizedOptions = (q.options || [])
                  .map((opt) => ({
                    text: (opt.text || '').trim(),
                    isCorrect: Boolean(opt.correct),
                  }))
                  .filter((opt) => opt.text.length > 0)

                if (sanitizedOptions.length === 0) return null

                return {
                  questionText,
                  allowMultipleAnswers: Boolean(q.multipleCorrect),
                  options: sanitizedOptions,
                }
              })
                .filter((q): q is trainingModulesApi.QuizQuestionShape => q !== null)

              if (sanitizedQuestions.length === 0) {
                throw new Error(`${itemLabel}: Add at least 1 valid question with non-empty options`)
              }

              playlistItem.quizData = {
                questions: sanitizedQuestions,
              }
            }
            if (item.difficulty) playlistItem.difficulty = item.difficulty
            break
          }
          case 'essay':
            playlistItem.essayData = {
              questions: (item.essayQuestions ?? []).map((q) => ({
                questionText: q.questionText,
                expectedAnswer: q.expectedAnswer?.trim() || undefined,
              })),
            }
            break
        }

        return playlistItem
      })

      // Collect file uploads for playlist items
      const playlistVideoFiles: { index: number; file: File }[] = []
      const playlistPdfFiles: { index: number; file: File }[] = []

      formData.playlist.forEach((item, index) => {
        if (item.type === 'video' && videoFilesRef.current[item.id]) {
          playlistVideoFiles.push({ index, file: videoFilesRef.current[item.id] })
        }
        if (item.type === 'pdf' && pdfFilesRef.current[item.id]) {
          playlistPdfFiles.push({ index, file: pdfFilesRef.current[item.id] })
        }
      })

      // Create module payload
      const payload: trainingModulesApi.UpdateTrainingModulePayload = {
        moduleName: formData.name,
        shortDescription: formData.shortDescription,
        categories: formData.categoryIds,
        students: formData.studentIds,
        mentorsAssigned: formData.mentorIds,
        status: 'draft',
        coverImage: coverImageFile ?? undefined,
        playlist: playlistItems,
        playlistVideoFiles,
        playlistPdfFiles,
      }

      if (isEditMode && moduleId) {
        await trainingModulesApi.updateTrainingModule(moduleId, payload)
      } else {
        await trainingModulesApi.createTrainingModule(payload as trainingModulesApi.CreateTrainingModulePayload)
      }

      await Swal.fire({
        icon: 'success',
        title: isEditMode ? 'Module updated' : 'Module created',
        text: isEditMode
          ? 'The training module has been updated successfully.'
          : 'The training module has been created successfully.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })

      router.push('/training/curriculum/modules')
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} module:`, err)
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
          ? err.message
          : `Failed to ${isEditMode ? 'update' : 'create'} module. Please try again.`
      
      await Swal.fire({
        icon: 'error',
        title: `Failed to ${isEditMode ? 'update' : 'create'} module`,
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Fragment>
      <Seo title={isEditMode ? 'Edit Training Module' : 'Create Training Module'} />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">{isEditMode ? 'Edit Training Module' : 'Create New Training Module'}</div>
              <Link
                href="/training/curriculum/modules"
                className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
              >
                <i className="ri-arrow-left-line me-1" /> Back to Modules
              </Link>
            </div>
            {fetchingModule ? (
              <div className="box-body flex items-center justify-center py-12">
                <span className="text-[#8c9097] dark:text-white/50">Loading module...</span>
              </div>
            ) : (
            <form onSubmit={handleSubmit}>
              <div className="box-body">
                <div className="border-b border-gray-200 dark:border-defaultborder/10 mb-6">
                  <nav className="flex space-x-2 rtl:space-x-reverse" aria-label="Tabs" role="tablist">
                    <button
                      type="button"
                      onClick={() => setActiveTab('info')}
                      className={`hs-tab-active:bg-primary/10 hs-tab-active:text-primary hs-tab-active:border-primary -mb-px py-2 px-4 inline-flex items-center gap-2 text-sm font-medium text-center border-b-2 transition-colors ${
                        activeTab === 'info'
                          ? 'bg-primary/10 text-primary border-primary'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
                      }`}
                      id="info-tab"
                      aria-controls="info-panel"
                    >
                      <i className="ri-file-text-line" />
                      Module Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('playlist')}
                      className={`hs-tab-active:bg-primary/10 hs-tab-active:text-primary hs-tab-active:border-primary -mb-px py-2 px-4 inline-flex items-center gap-2 text-sm font-medium text-center border-b-2 transition-colors ${
                        activeTab === 'playlist'
                          ? 'bg-primary/10 text-primary border-primary'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
                      }`}
                      id="playlist-tab"
                      aria-controls="playlist-panel"
                    >
                      <i className="ri-play-list-2-line" />
                      Playlist
                    </button>
                  </nav>
                </div>

                {activeTab === 'info' && (
                  <div id="info-panel" role="tabpanel" aria-labelledby="info-tab">
                    <div className="grid grid-cols-12 gap-4">
                      {/* Category Selection */}
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="category" className="form-label">
                          Category <span className="text-danger">*</span>
                        </label>
                        {fetchingData ? (
                          <div className="form-control flex items-center justify-center py-2">
                            <span className="text-[#8c9097] dark:text-white/50 text-sm">Loading categories...</span>
                          </div>
                        ) : (
                          <Select
                            id="category"
                            value={categoryOptions.find((opt) => formData.categoryIds.includes(opt.value)) || null}
                            onChange={(option: unknown) =>
                              handleCategoryChange(option as { value: string; label: string } | null)
                            }
                            options={categoryOptions}
                            classNamePrefix="Select2"
                            placeholder="Select Category"
                            menuPlacement="auto"
                            isDisabled={fetchingData}
                          />
                        )}
                      </div>

                      {/* Module Name */}
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="module-name" className="form-label">
                          Module Name <span className="text-danger">*</span>
                        </label>
                        <input
                          id="module-name"
                          type="text"
                          className="form-control"
                          placeholder="Enter module name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          required
                        />
                      </div>

                      {/* Cover Image – Drag & Drop Preview */}
                      <div className="xl:col-span-12 col-span-12">
                        <label className="form-label">
                          Cover Image {!isEditMode && <span className="text-danger">*</span>}
                        </label>
                        <input
                          ref={coverImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverImageChange}
                        />
                        {coverImagePreview || formData.coverImage ? (
                          <div className="relative rounded-lg border border-defaultborder overflow-hidden bg-black/5 dark:bg-white/5 group">
                            <img
                              src={coverImagePreview || formData.coverImage}
                              alt="Cover preview"
                              className="w-full h-56 object-cover block"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => coverImageInputRef.current?.click()}
                                className="ti-btn ti-btn-light !mb-0"
                              >
                                <i className="ri-upload-cloud-line me-1" />
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={handleCoverImageRemove}
                                className="ti-btn ti-btn-danger !mb-0"
                              >
                                <i className="ri-delete-bin-line me-1" />
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => coverImageInputRef.current?.click()}
                            onDrop={handleCoverImageDrop}
                            onDragOver={handleCoverImageDragOver}
                            onDragLeave={handleCoverImageDragLeave}
                            onDragEnter={handleCoverImageDragOver}
                            className={`relative rounded-lg border-2 border-dashed min-h-[200px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                              coverImageDragOver
                                ? 'border-primary bg-primary/5'
                                : 'border-defaultborder hover:border-primary/50 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            <span className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary">
                              <i className="ri-image-add-line text-2xl" />
                            </span>
                            <span className="font-semibold text-defaulttextcolor">
                              Drag and drop your cover image here
                            </span>
                            <span className="text-[0.8125rem] text-[#8c9097] dark:text-white/50">
                              or click to browse
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Short Description */}
                      <div className="xl:col-span-12 col-span-12">
                        <label htmlFor="short-description" className="form-label">
                          Short Description <span className="text-danger">*</span>
                        </label>
                        <textarea
                          id="short-description"
                          className="form-control"
                          rows={4}
                          placeholder="Enter a brief description of the training module"
                          value={formData.shortDescription}
                          onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                          required
                        />
                      </div>

                      {/* Students */}
                      <div className="xl:col-span-6 col-span-12">
                        {fetchingData ? (
                          <div>
                            <label className="form-label block mb-1">Students</label>
                            <div className="form-control flex items-center justify-center py-2">
                              <span className="text-[#8c9097] dark:text-white/50 text-sm">Loading students...</span>
                            </div>
                          </div>
                        ) : (
                          <CheckboxDropdown
                            label="Students"
                            placeholder="Select students"
                            options={studentOptions}
                            selectedIds={formData.studentIds}
                            onChange={(ids) => handleInputChange('studentIds', ids)}
                          />
                        )}
                      </div>

                      {/* Mentors Assigned */}
                      <div className="xl:col-span-6 col-span-12">
                        {fetchingData ? (
                          <div>
                            <label className="form-label block mb-1">Mentors Assigned</label>
                            <div className="form-control flex items-center justify-center py-2">
                              <span className="text-[#8c9097] dark:text-white/50 text-sm">Loading mentors...</span>
                            </div>
                          </div>
                        ) : (
                          <CheckboxDropdown
                            label="Mentors Assigned"
                            placeholder="Select mentors"
                            options={mentorOptions}
                            selectedIds={formData.mentorIds}
                            onChange={(ids) => handleInputChange('mentorIds', ids)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'playlist' && (
                  <div id="playlist-panel" role="tabpanel" aria-labelledby="playlist-tab">
                    {!isEditMode && formData.playlist.length === 0 && (
                      <div className="mb-4 grid grid-cols-12 gap-3">
                        {MODULE_TEMPLATES.map((t) => (
                          <div key={t.name} className="xl:col-span-4 col-span-12">
                            <button
                              type="button"
                              className="w-full border rounded-lg p-3 text-left hover:border-primary transition-colors border-defaultborder"
                              onClick={() => applyTemplate(t)}
                            >
                              <p className="font-semibold text-defaulttextcolor">{t.name}</p>
                              <p className="text-sm text-[#8c9097] dark:text-white/50 mt-0.5">{t.description}</p>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="font-semibold mb-1">Playlist</h5>
                        <p className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] mb-0">
                          Add items like uploaded videos, YouTube links, quizzes, PDFs, etc. The
                          order here will be used as the module flow.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary-full !mb-0"
                        onClick={handleAddPlaylistItem}
                      >
                        <i className="ri-add-line me-1 align-middle" />
                        Add Item
                      </button>
                    </div>

                    {formData.playlist.length === 0 && (
                      <div className="border border-dashed border-defaultborder rounded-md p-4 text-center text-[#8c9097] dark:text-white/50 text-[0.8125rem]">
                        No playlist items yet. Click{' '}
                        <span className="font-semibold">Add Item</span> to start building the
                        module.
                      </div>
                    )}

                    <div className="space-y-4">
                      {(() => {
                        const groups = formData.playlist.reduce<
                          { sectionKey: string; sectionTitle?: string; sectionIndex?: number; items: PlaylistItem[] }[]
                        >((acc, item) => {
                          const key = item.sectionTitle ?? '__none__'
                          const last = acc[acc.length - 1]
                          if (last && last.sectionKey === key) {
                            last.items.push(item)
                          } else {
                            acc.push({
                              sectionKey: key,
                              sectionTitle: item.sectionTitle,
                              sectionIndex: item.sectionIndex,
                              items: [item],
                            })
                          }
                          return acc
                        }, [])
                        return groups.map((group) => (
                          <div key={group.sectionKey} className="space-y-4">
                            {group.sectionTitle && (
                              <div className="flex items-center gap-2 py-2 border-b border-primary/30">
                                <i className="ri-folder-open-line text-primary text-lg" />
                                <span className="font-semibold text-[0.9375rem] text-primary">
                                  {group.sectionTitle}
                                </span>
                              </div>
                            )}
                            <div
                              ref={(el) => {
                                if (el) sectionRefsRef.current[group.sectionKey] = el
                                else delete sectionRefsRef.current[group.sectionKey]
                              }}
                              data-playlist-section={group.sectionKey}
                              className="space-y-4"
                            >
                            {group.items.map((item, idx) => {
                              const index = formData.playlist.indexOf(item)
                              return (
                        <div
                          key={item.id}
                          data-playlist-item-id={item.id}
                          className="border border-defaultborder rounded-md p-4 bg-white/60 dark:bg-black/20"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="playlist-drag-handle cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 shrink-0 touch-none"
                                title="Drag to reorder"
                              >
                                <i className="ri-more-2-fill text-[#8c9097] dark:text-white/50 text-base" />
                              </span>
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[0.75rem] shrink-0">
                                {index + 1}
                              </span>
                              {item.type === 'youtube' && getYoutubeVideoId(item.source ?? '') && (
                                <a
                                  href={item.source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 w-12 rounded overflow-hidden border border-defaultborder aspect-video bg-[#1a1a1a] flex items-center justify-center"
                                  title="YouTube video"
                                >
                                  <img
                                    src={`https://img.youtube.com/vi/${getYoutubeVideoId(item.source!)}/mqdefault.jpg`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              )}
                              <div className="min-w-0">
                                <span className="font-semibold text-[0.875rem] block truncate">
                                  {item.title || `Playlist item ${index + 1}`}
                                </span>
                                <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/50 flex items-center gap-1">
                                  {item.type === 'youtube' && <i className="ri-youtube-line text-danger" />}
                                  {item.type === 'video' && <i className="ri-video-line text-primary" />}
                                  {item.type === 'blog' && <i className="ri-article-line text-info" />}
                                  {item.type === 'quiz' && <i className="ri-questionnaire-line text-warning" />}
                                  {item.type === 'essay' && <i className="ri-edit-line text-primary" />}
                                  {item.type === 'pdf' && <i className="ri-file-pdf-line text-danger" />}
                                  {item.type === 'youtube' ? 'YouTube Link' : item.type === 'video' ? 'Upload Video' : item.type === 'blog' ? 'Blog' : item.type === 'quiz' ? 'Quiz' : item.type === 'essay' ? 'Q&A' : item.type === 'pdf' ? 'PDF' : 'Content'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
                              onClick={() => handleRemovePlaylistItem(item.id)}
                            >
                              <i className="ri-delete-bin-line me-1 align-middle" />
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-12 gap-4">
                            <div className="xl:col-span-3 md:col-span-4 col-span-12">
                              <label className="form-label" htmlFor={`playlist-type-${item.id}`}>
                                Content Type
                              </label>
                              <select
                                id={`playlist-type-${item.id}`}
                                className="form-control"
                                value={item.type}
                                onChange={(e) =>
                                  handlePlaylistItemChange(
                                    item.id,
                                    'type',
                                    e.target.value as PlaylistItemType,
                                  )
                                }
                              >
                                <option value="video">Upload Video</option>
                                <option value="youtube">YouTube Link</option>
                                <option value="pdf">PDF / Document</option>
                                <option value="blog">Blog</option>
                                <option value="quiz">Quiz</option>
                                <option value="essay">Q&A</option>
                              </select>
                            </div>
                            <div className="xl:col-span-4 md:col-span-6 col-span-12">
                              <label className="form-label" htmlFor={`playlist-title-${item.id}`}>
                                Title
                              </label>
                              <input
                                id={`playlist-title-${item.id}`}
                                type="text"
                                className="form-control"
                                placeholder="Lesson title"
                                value={item.title}
                                onChange={(e) =>
                                  handlePlaylistItemChange(item.id, 'title', e.target.value)
                                }
                              />
                            </div>
                            <div className="xl:col-span-2 md:col-span-4 col-span-12">
                              <label className="form-label" htmlFor={`playlist-duration-${item.id}`}>
                                Duration (min)
                              </label>
                              <input
                                id={`playlist-duration-${item.id}`}
                                type="text"
                                className="form-control"
                                placeholder="e.g. 10"
                                value={item.duration || ''}
                                onChange={(e) =>
                                  handlePlaylistItemChange(item.id, 'duration', e.target.value)
                                }
                              />
                            </div>
                            {item.type === 'quiz' && (
                              <div className="xl:col-span-3 md:col-span-4 col-span-12">
                                <label className="form-label">Difficulty</label>
                                <select
                                  className="form-control"
                                  value={item.difficulty || 'medium'}
                                  onChange={(e) =>
                                    handlePlaylistItemChange(
                                      item.id,
                                      'difficulty',
                                      e.target.value as 'easy' | 'medium' | 'hard'
                                    )
                                  }
                                >
                                  <option value="easy">Easy</option>
                                  <option value="medium">Medium</option>
                                  <option value="hard">Hard</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Type-specific content */}
                          {item.type === 'video' && (
                            <div className="mt-4">
                              <label className="form-label">Video file</label>
                              {item.videoPreview ? (
                                <div className="rounded-lg border border-defaultborder bg-black/5 dark:bg-white/5 p-3 max-w-md">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="font-semibold text-[0.8125rem] truncate">
                                        {item.source || 'Selected video'}
                                      </div>
                                      <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                        {videoFilesRef.current[item.id]
                                          ? `${formatFileSize(videoFilesRef.current[item.id].size)} • ${
                                              videoFilesRef.current[item.id].type || 'video'
                                            }`
                                          : 'Existing uploaded video'}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem] !mb-0"
                                        onClick={() =>
                                          setVideoPreviewItemId(
                                            videoPreviewItemId === item.id ? null : item.id,
                                          )
                                        }
                                      >
                                        <i className="ri-play-line me-1" />
                                        {videoPreviewItemId === item.id ? 'Hide Preview' : 'Preview Video'}
                                      </button>
                                      <label className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] !mb-0 cursor-pointer">
                                        <i className="ri-upload-cloud-line me-1" />
                                        Change
                                        <input
                                          type="file"
                                          accept="video/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            const f = e.target.files?.[0]
                                            if (f) processPlaylistVideoFile(item.id, f)
                                            e.target.value = ''
                                          }}
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem] !mb-0"
                                        onClick={() => {
                                          if (item.videoPreview) URL.revokeObjectURL(item.videoPreview)
                                          delete videoFilesRef.current[item.id]
                                          if (videoPreviewItemId === item.id) setVideoPreviewItemId(null)
                                          handlePlaylistItemChange(item.id, 'videoPreview', '')
                                          handlePlaylistItemChange(item.id, 'source', '')
                                        }}
                                      >
                                        <i className="ri-delete-bin-line" />
                                      </button>
                                    </div>
                                  </div>
                                  {videoPreviewItemId === item.id && (
                                    <div className="mt-3 rounded-md border border-defaultborder overflow-hidden">
                                      <video
                                        src={item.videoPreview}
                                        controls
                                        className="w-full max-h-56 object-contain block"
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    setVideoDragOverId(null)
                                    processPlaylistVideoFile(item.id, e.dataTransfer.files?.[0] ?? null)
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault()
                                    setVideoDragOverId(item.id)
                                  }}
                                  onDragLeave={() => setVideoDragOverId(null)}
                                  onClick={() => document.getElementById(`playlist-video-input-${item.id}`)?.click()}
                                  className={`rounded-lg border-2 border-dashed min-h-[140px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                                    videoDragOverId === item.id
                                      ? 'border-primary bg-primary/5'
                                      : 'border-defaultborder hover:border-primary/50'
                                  }`}
                                >
                                  <input
                                    id={`playlist-video-input-${item.id}`}
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0]
                                      if (f) processPlaylistVideoFile(item.id, f)
                                      e.target.value = ''
                                    }}
                                  />
                                  <span className="text-primary text-2xl">
                                    <i className="ri-video-add-line" />
                                  </span>
                                  <span className="text-[0.8125rem] text-[#8c9097] dark:text-white/50">
                                    Drag and drop video or click to upload
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {item.type === 'youtube' && (
                            <div className="mt-4 grid grid-cols-12 gap-4">
                              <div className="xl:col-span-6 col-span-12">
                                <label className="form-label">YouTube URL</label>
                                <input
                                  type="url"
                                  className="form-control"
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  value={item.source}
                                  onChange={(e) =>
                                    handlePlaylistItemChange(item.id, 'source', e.target.value)
                                  }
                                />
                              </div>
                              <div className="xl:col-span-6 col-span-12">
                                {getYoutubeVideoId(item.source) ? (
                                  <div className="rounded-lg overflow-hidden border border-defaultborder">
                                    <img
                                      src={`https://img.youtube.com/vi/${getYoutubeVideoId(item.source)}/mqdefault.jpg`}
                                      alt="YouTube thumbnail"
                                      className="w-full aspect-video object-cover"
                                    />
                                    <div className="p-2 bg-black/5 dark:bg-white/5 text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                      Preview for: {getYoutubeVideoId(item.source)}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-dashed border-defaultborder min-h-[120px] flex items-center justify-center text-[#8c9097] dark:text-white/50 text-[0.8125rem]">
                                    Enter a YouTube URL to see preview
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {item.type === 'pdf' && (
                            <div className="mt-4">
                              <label className="form-label">PDF document</label>
                              {item.source ? (
                                <div className="relative rounded-lg border border-defaultborder p-4 bg-black/5 dark:bg-white/5 flex items-center gap-4 max-w-md">
                                  <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-danger/10 text-danger text-2xl">
                                    <i className="ri-file-pdf-line" />
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-[0.875rem] truncate">
                                      {item.source}
                                    </div>
                                    <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                      {pdfFilesRef.current[item.id]
                                        ? `${(pdfFilesRef.current[item.id].size / 1024).toFixed(1)} KB`
                                        : 'Existing uploaded document'}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <button
                                      type="button"
                                      className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem] !mb-0"
                                      onClick={() => openPdfPreview(item)}
                                      disabled={!item.pdfPreview}
                                    >
                                      <i className="ri-eye-line me-1" />
                                      Preview PDF
                                    </button>
                                    <label className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem] !mb-0 cursor-pointer">
                                      <i className="ri-upload-cloud-line me-1" />
                                      Change
                                      <input
                                        type="file"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0]
                                          if (f) processPlaylistPdfFile(item.id, f)
                                          e.target.value = ''
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      className="ti-btn ti-btn-danger !py-1 !px-2 !text-[0.75rem] !mb-0"
                                      onClick={() => removePlaylistPdfFile(item.id)}
                                    >
                                      <i className="ri-delete-bin-line" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    setPdfDragOverId(null)
                                    processPlaylistPdfFile(item.id, e.dataTransfer.files?.[0] ?? null)
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault()
                                    setPdfDragOverId(item.id)
                                  }}
                                  onDragLeave={() => setPdfDragOverId(null)}
                                  onClick={() => document.getElementById(`playlist-pdf-input-${item.id}`)?.click()}
                                  className={`rounded-lg border-2 border-dashed min-h-[120px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                                    pdfDragOverId === item.id
                                      ? 'border-primary bg-primary/5'
                                      : 'border-defaultborder hover:border-primary/50'
                                  }`}
                                >
                                  <input
                                    id={`playlist-pdf-input-${item.id}`}
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0]
                                      if (f) processPlaylistPdfFile(item.id, f)
                                      e.target.value = ''
                                    }}
                                  />
                                  <span className="text-danger text-2xl">
                                    <i className="ri-file-pdf-line" />
                                  </span>
                                  <span className="text-[0.8125rem] text-[#8c9097] dark:text-white/50">
                                    Drag and drop PDF or click to upload
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {item.type === 'blog' && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <label className="form-label mb-0">Blog content</label>
                                <button
                                  type="button"
                                  className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem] inline-flex items-center gap-1.5"
                                  onClick={() => handleBlogEnhanceWithAi(item.id)}
                                  disabled={blogAiLoading}
                                >
                                  {blogAiLoading && (blogAiItemId === item.id || blogAiEnhancingId === item.id) ? (
                                    <>
                                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <i className="ri-magic-line text-[1rem]" />
                                      Enhance with AI
                                    </>
                                  )}
                                </button>
                              </div>
                              <div className="border border-defaultborder rounded-md overflow-hidden">
                                <TiptapEditor
                                  content={item.blogContent ?? ''}
                                  placeholder="Write your blog post or click Enhance with AI to generate from a title and keywords..."
                                  onChange={(html) => {
                                    handlePlaylistItemChange(item.id, 'blogContent', html)
                                    scheduleBlogSuggestionCheck(item.id, html)
                                  }}
                                />
                              </div>
                              {(() => {
                                const suggestion = blogSuggestionsByItem[item.id]
                                if (!suggestion) return null
                                if (suggestion.status === 'loading') {
                                  return (
                                    <div className="mt-2 flex items-center gap-2 text-[0.8125rem] text-[#6a6f73] dark:text-white/50">
                                      <span className="inline-block w-3.5 h-3.5 border-2 border-defaultborder border-t-primary rounded-full animate-spin" />
                                      Checking spelling and style…
                                    </div>
                                  )
                                }
                                if (suggestion.status === 'done') {
                                  return (
                                    <div className="mt-2 p-3 rounded-md border border-defaultborder bg-black/5 dark:bg-white/5">
                                      <div className="font-medium text-[0.8125rem] mb-2">
                                        AI suggestions – choose what to apply
                                      </div>
                                      {suggestion.edits.length > 0 ? (
                                        <div className="space-y-3">
                                          {suggestion.edits.map((edit, i) => (
                                            <div
                                              key={i}
                                              className="flex flex-wrap items-center gap-2 text-[0.8125rem]"
                                            >
                                              <span
                                                className="inline-flex items-center px-2 py-1 rounded-md bg-danger/15 text-danger border border-danger/30"
                                                title="Current text"
                                              >
                                                {edit.original}
                                              </span>
                                              <i className="ri-arrow-right-line text-[#8c9097] dark:text-white/50" />
                                              <span
                                                className="inline-flex items-center px-2 py-1 rounded-md bg-success/15 text-success border border-success/30"
                                                title="Suggestion"
                                              >
                                                {edit.suggested}
                                              </span>
                                              {edit.reason && (
                                                <span className="text-[#8c9097] dark:text-white/50 italic">
                                                  ({edit.reason})
                                                </span>
                                              )}
                                              <span className="flex gap-1 ml-1">
                                                <button
                                                  type="button"
                                                  className="ti-btn ti-btn-primary !py-0.5 !px-1.5 !text-[0.7rem]"
                                                  onClick={() =>
                                                    handleBlogAcceptEdit(
                                                      item.id,
                                                      i,
                                                      item.blogContent ?? '',
                                                    )
                                                  }
                                                >
                                                  Accept
                                                </button>
                                                <button
                                                  type="button"
                                                  className="ti-btn ti-btn-light !py-0.5 !px-1.5 !text-[0.7rem]"
                                                  onClick={() => handleBlogIgnoreEdit(item.id, i)}
                                                >
                                                  Ignore
                                                </button>
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[0.8125rem] text-[#6a6f73] dark:text-white/50">
                                          No suggestions. Text looks good.
                                        </p>
                                      )}
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          )}

                          {item.type === 'quiz' && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                <label className="form-label mb-0">
                                  Quiz (MCQ – single or multiple correct answers)
                                </label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem] inline-flex items-center gap-1.5"
                                    onClick={() => openEnhanceModal('quiz', item.id)}
                                    disabled={enhanceLoading}
                                  >
                                    {enhanceLoading && enhanceItemId === item.id && enhanceType === 'quiz' ? (
                                      <>
                                        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <i className="ri-magic-line text-[1rem]" />
                                        Enhance with AI
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem]"
                                    onClick={() => setQuizModalItemId(item.id)}
                                  >
                                    <i className="ri-add-line me-1" />
                                    {(item.quizData?.length ?? 0) === 0
                                      ? 'Create Quiz'
                                      : `Edit Quiz (${item.quizData?.length ?? 0} questions)`}
                                  </button>
                                </div>
                              </div>
                              {(item.quizData?.length ?? 0) > 0 && (
                                <div className="rounded-md border border-defaultborder p-3 bg-black/5 dark:bg-white/5 text-[0.8125rem]">
                                  {(item.quizData ?? []).map((q, i) => (
                                    <div key={q.id}>
                                      {i + 1}. {q.question || '(No question text)'} –{' '}
                                      {q.options.length} options
                                      {q.multipleCorrect ? ' (multiple correct)' : ''}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {item.type === 'essay' && (
                            <div className="mt-4 space-y-3">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <label className="form-label mb-0">Q&A Questions</label>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-primary !py-1.5 !px-3 !text-[0.8125rem] inline-flex items-center gap-1.5 shrink-0"
                                    onClick={() => openEnhanceModal('essay', item.id)}
                                    disabled={enhanceLoading}
                                  >
                                    {enhanceLoading && enhanceItemId === item.id && enhanceType === 'essay' ? (
                                      <>
                                        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <i className="ri-magic-line text-[1rem]" />
                                        Enhance with AI
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    className="ti-btn ti-btn-primary-full !mb-0 !py-1.5 !px-3 !text-[0.8125rem] shrink-0 whitespace-nowrap"
                                    onClick={() => handleAddEssayQuestion(item.id)}
                                  >
                                    <i className="ri-add-line me-1" /> Add Question
                                  </button>
                                </div>
                              </div>
                              {(item.essayQuestions ?? []).map((q, qIdx) => (
                                <div key={q.id} className="space-y-2 p-3 rounded-lg border border-defaultborder">
                                  <div className="flex items-start gap-2">
                                    <span className="mt-2 text-[0.75rem] text-primary font-semibold">
                                      {qIdx + 1}.
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control flex-1"
                                      placeholder="Enter Q&A question"
                                      value={q.questionText}
                                      onChange={(e) =>
                                        handleEssayQuestionChange(item.id, q.id, e.target.value)
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="ti-btn ti-btn-sm ti-btn-light !mb-0 shrink-0"
                                      onClick={() => handleRemoveEssayQuestion(item.id, q.id)}
                                    >
                                      <i className="ri-delete-bin-line" />
                                    </button>
                                  </div>
                                  <div>
                                    <label className="form-label text-[0.75rem] text-[#6a6f73] dark:text-white/60">
                                      Expected answer (for AI grading — optional)
                                    </label>
                                    <textarea
                                      className="form-control text-sm"
                                      rows={3}
                                      placeholder="Reference answer for automatic scoring..."
                                      value={q.expectedAnswer ?? ""}
                                      onChange={(e) =>
                                        handleEssayExpectedAnswerChange(item.id, q.id, e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                              )
                            })}
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                    {isEditMode && moduleId && (
                      <AIChatPanel
                        moduleId={moduleId}
                        formData={formData}
                        convertApiPlaylistToForm={convertApiPlaylistToForm}
                        onPlaylistUpdate={(playlist) => handleInputChange('playlist', playlist)}
                        onNameUpdate={(name) => handleInputChange('name', name)}
                      />
                    )}
                  </div>
                )}
              </div>
              <ModuleChecklist
                formData={formData}
                coverImageFile={coverImageFile}
                existingCoverImageUrl={existingCoverImageUrl}
              />
              <div className="box-footer flex justify-end gap-2 pt-4 border-t border-defaultborder">
                <Link
                  href="/training/curriculum/modules"
                  className="ti-btn ti-btn-light"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="ti-btn ti-btn-primary-full"
                  disabled={loading || fetchingData || fetchingModule}
                >
                  {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Module' : 'Create Module')}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>

      {/* Quiz builder modal */}
      {quizModalItemId && quizModalItem && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setQuizModalItemId(null)}
        >
          <div
            className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-[95vw] max-w-5xl max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-defaultborder">
              <h5 className="font-semibold mb-0">Create / Edit Quiz (MCQ)</h5>
              <button
                type="button"
                className="ti-btn ti-btn-light !py-1 !px-2"
                onClick={() => setQuizModalItemId(null)}
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              {/* Excel / CSV section */}
              <div className="mb-6 p-4 rounded-lg border border-defaultborder bg-black/5 dark:bg-white/5">
                <div className="font-semibold text-[0.9375rem] mb-2 flex items-center gap-2">
                  <i className="ri-file-excel-2-line text-success text-xl" />
                  Import from Excel / CSV
                </div>
                <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-3">
                  Download the CSV template (open in Excel), fill in Question, Option1–Option4, and CorrectAnswer (e.g. &quot;2&quot; for option 2, or &quot;1,3&quot; for multiple). Save as CSV and upload.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="ti-btn ti-btn-success !mb-0"
                    onClick={downloadQuizTemplate}
                  >
                    <i className="ri-download-line me-1" />
                    Download template (CSV)
                  </button>
                  <label className="ti-btn ti-btn-primary !mb-0 cursor-pointer">
                    <i className="ri-upload-cloud-line me-1" />
                    Upload CSV
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && quizModalItemId) handleQuizFileUpload(quizModalItemId, file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-[0.8125rem] font-semibold text-[#8c9097] dark:text-white/50">
                  Or add manually:
                </span>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary-full !mb-0"
                  onClick={() => addQuizQuestion(quizModalItemId)}
                >
                  <i className="ri-add-line me-1" />
                  Add Question
                </button>
              </div>
              <div className="space-y-6">
                {(quizModalItem.quizData ?? []).map((q, qIndex) => (
                  <div
                    key={q.id}
                    className="border border-defaultborder rounded-lg p-4 bg-white/60 dark:bg-black/20"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="font-semibold text-primary">Question {qIndex + 1}</span>
                      <button
                        type="button"
                        className="ti-btn ti-btn-light !py-0.5 !px-1.5 !text-[0.75rem]"
                        onClick={() => removeQuizQuestion(quizModalItemId, q.id)}
                      >
                        <i className="ri-delete-bin-line" />
                      </button>
                    </div>
                    <input
                      type="text"
                      className="form-control mb-3"
                      placeholder="Question text"
                      value={q.question}
                      onChange={(e) =>
                        updateQuizQuestion(quizModalItemId, q.id, 'question', e.target.value)
                      }
                    />
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        id={`quiz-multi-${q.id}`}
                        className="form-check-input"
                        checked={q.multipleCorrect}
                        onChange={(e) =>
                          updateQuizQuestion(
                            quizModalItemId,
                            q.id,
                            'multipleCorrect',
                            e.target.checked,
                          )
                        }
                      />
                      <label htmlFor={`quiz-multi-${q.id}`} className="form-check-label text-[0.8125rem]">
                        Allow multiple correct answers
                      </label>
                    </div>
                    <div className="text-[0.75rem] font-semibold text-[#8c9097] dark:text-white/50 mb-2">
                      Options
                    </div>
                    <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-2">
                      Tick the checkbox to mark an option as correct.
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            className="form-check-input shrink-0"
                            checked={opt.correct}
                            onChange={(e) =>
                              updateQuizOption(
                                quizModalItemId,
                                q.id,
                                opt.id,
                                'correct',
                                e.target.checked,
                              )
                            }
                            title="Mark as correct answer"
                          />
                          <input
                            type="text"
                            className="form-control flex-1 !py-1.5 !text-[0.8125rem]"
                            placeholder="Option text"
                            value={opt.text}
                            onChange={(e) =>
                              updateQuizOption(
                                quizModalItemId,
                                q.id,
                                opt.id,
                                'text',
                                e.target.value,
                              )
                            }
                          />
                          {opt.correct && (
                            <span className="text-success text-[0.75rem] font-medium shrink-0">
                              Correct
                            </span>
                          )}
                          <button
                            type="button"
                            className="ti-btn ti-btn-light !py-0.5 !px-1.5 shrink-0"
                            onClick={() => removeQuizOption(quizModalItemId, q.id, opt.id)}
                            disabled={q.options.length <= 2}
                          >
                            <i className="ri-subtract-line" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="ti-btn ti-btn-light !py-0.5 !px-2 !text-[0.75rem]"
                        onClick={() => addQuizOption(quizModalItemId, q.id)}
                      >
                        <i className="ri-add-line me-1" />
                        Add option
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {(quizModalItem.quizData?.length ?? 0) === 0 && (
                <p className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] mt-2">
                  Click &quot;Add Question&quot; to create your first MCQ question.
                </p>
              )}
            </div>
            <div className="p-4 border-t border-defaultborder flex justify-end">
              <button
                type="button"
                className="ti-btn ti-btn-primary-full"
                onClick={() => setQuizModalItemId(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhance with AI modal for Quiz and Q&A */}
      {enhanceType && enhanceItemId && (() => {
        const item = formData.playlist.find((i) => i.id === enhanceItemId)
        if (!item) return null
        const questions =
          enhanceType === 'quiz'
            ? (item.quizData ?? []).map((q, i) => ({ idx: i, text: q.question || '(No question)' }))
            : (item.essayQuestions ?? []).map((q, i) => ({ idx: i, text: q.questionText || '(No question)' }))
        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
            onClick={() => {
              setEnhanceType(null)
              setEnhanceItemId(null)
            }}
          >
            <div
              className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-defaultborder">
                <h5 className="font-semibold mb-0 flex items-center gap-2">
                  <i className="ri-magic-line text-primary" />
                  Enhance {enhanceType === 'quiz' ? 'Quiz' : 'Q&A'} with AI
                </h5>
                <button
                  type="button"
                  className="ti-btn ti-btn-light !py-1 !px-2"
                  onClick={() => {
                    setEnhanceType(null)
                    setEnhanceItemId(null)
                  }}
                >
                  <i className="ri-close-line text-lg" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-control w-full"
                    value={enhanceDifficulty}
                    onChange={(e) => setEnhanceDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="form-label mb-2 block">Which questions to enhance?</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="enhance-question-select"
                        checked={enhanceQuestionSelection === 'all'}
                        onChange={() => setEnhanceQuestionSelection('all')}
                        className="form-check-input"
                      />
                      <span className="text-[0.8125rem]">All questions</span>
                    </label>
                    {questions.length > 0 && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="enhance-question-select"
                          checked={typeof enhanceQuestionSelection === 'object'}
                          onChange={() => setEnhanceQuestionSelection(questions.map((q) => q.idx))}
                          className="form-check-input"
                        />
                        <span className="text-[0.8125rem]">Select specific questions</span>
                      </label>
                    )}
                    {typeof enhanceQuestionSelection === 'object' && questions.length > 0 && (
                      <div className="ml-6 mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                        {questions.map((q) => (
                          <label key={q.idx} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={enhanceQuestionSelection.includes(q.idx)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEnhanceQuestionSelection([...enhanceQuestionSelection, q.idx].sort((a, b) => a - b))
                                } else {
                                  setEnhanceQuestionSelection(enhanceQuestionSelection.filter((i) => i !== q.idx))
                                }
                              }}
                              className="form-check-input"
                            />
                            <span className="text-[0.75rem] line-clamp-1">{q.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-defaultborder flex justify-end gap-2">
                <button
                  type="button"
                  className="ti-btn ti-btn-light"
                  onClick={() => {
                    setEnhanceType(null)
                    setEnhanceItemId(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-primary-full"
                  onClick={handleEnhanceConfirm}
                  disabled={enhanceLoading || (typeof enhanceQuestionSelection === 'object' && enhanceQuestionSelection.length === 0)}
                >
                  {enhanceLoading ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin me-1" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="ri-magic-line me-1" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Blog: Generate from title & keywords (when content is empty) */}
      {blogAiItemId && blogAiItem && blogAiItem.type === 'blog' && !stripHtml(blogAiItem.blogContent ?? '').length && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => {
            setBlogAiItemId(null)
            setBlogAiGenerateTitle('')
            setBlogAiGenerateKeywords('')
            setBlogAiWordCount(500)
            setBlogAiNumberOfBlogs(1)
            setBlogAiTitleMode('single')
            setBlogAiTitlesText('')
            setBlogAiGenerateFormat('neutral')
          }}
        >
          <div
            className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-defaultborder">
              <h5 className="font-semibold mb-0 flex items-center gap-2">
                <i className="ri-magic-line text-primary" />
                Generate blog with AI
              </h5>
              <button
                type="button"
                className="ti-btn ti-btn-light !py-1 !px-2"
                onClick={() => {
                  setBlogAiItemId(null)
                  setBlogAiGenerateTitle('')
                  setBlogAiGenerateKeywords('')
                  setBlogAiWordCount(500)
                  setBlogAiNumberOfBlogs(1)
                  setBlogAiTitleMode('single')
                  setBlogAiTitlesText('')
                  setBlogAiGenerateFormat('neutral')
                }}
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-[0.8125rem] text-[#6a6f73] dark:text-white/50">
                Generate one or more blogs. Use a single theme (AI will create a distinct title per blog) or enter each title yourself.
              </p>
              <div>
                <label className="form-label">Blog tone</label>
                <select
                  className="form-control w-full max-w-xs"
                  value={blogAiGenerateFormat}
                  onChange={(e) => setBlogAiGenerateFormat(e.target.value as BlogFormat)}
                >
                  {BLOG_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Number of blogs</label>
                <input
                  type="number"
                  className="form-control w-24"
                  min={1}
                  max={10}
                  value={blogAiNumberOfBlogs}
                  onChange={(e) => setBlogAiNumberOfBlogs(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
                />
              </div>
              <div>
                <label className="form-label">Title mode</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="blogAiTitleMode"
                      checked={blogAiTitleMode === 'single'}
                      onChange={() => setBlogAiTitleMode('single')}
                      className="form-check-input"
                    />
                    <span className="text-[0.8125rem]">Single theme (AI varies title for each blog)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="blogAiTitleMode"
                      checked={blogAiTitleMode === 'separate'}
                      onChange={() => setBlogAiTitleMode('separate')}
                      className="form-check-input"
                    />
                    <span className="text-[0.8125rem]">Separate title per blog</span>
                  </label>
                </div>
              </div>
              {blogAiTitleMode === 'single' ? (
                <div>
                  <label className="form-label">Theme / base title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Introduction to React Hooks"
                    value={blogAiGenerateTitle}
                    onChange={(e) => setBlogAiGenerateTitle(e.target.value)}
                  />
                </div>
              ) : (
                <div>
                  <label className="form-label">Blog titles (one per line) *</label>
                  <textarea
                    className="form-control"
                    rows={Math.min(10, Math.max(2, blogAiNumberOfBlogs))}
                    placeholder={'First blog title\nSecond blog title\n...'}
                    value={blogAiTitlesText}
                    onChange={(e) => setBlogAiTitlesText(e.target.value)}
                  />
                  <p className="text-[0.75rem] text-[#6a6f73] dark:text-white/50 mt-1">
                    Enter at least {blogAiNumberOfBlogs} title(s), one per line.
                  </p>
                </div>
              )}
              <div>
                <label className="form-label">Keywords (comma-separated)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. React, hooks, useState, useEffect"
                  value={blogAiGenerateKeywords}
                  onChange={(e) => setBlogAiGenerateKeywords(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Approx. word count per blog</label>
                <input
                  type="number"
                  className="form-control w-32"
                  min={100}
                  max={2000}
                  step={100}
                  value={blogAiWordCount}
                  onChange={(e) => setBlogAiWordCount(Number(e.target.value) || 500)}
                />
              </div>
            </div>
            <div className="p-4 border-t border-defaultborder flex justify-end gap-2">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={() => {
                  setBlogAiItemId(null)
                  setBlogAiGenerateTitle('')
                  setBlogAiGenerateKeywords('')
                  setBlogAiWordCount(500)
                  setBlogAiNumberOfBlogs(1)
                  setBlogAiTitleMode('single')
                  setBlogAiTitlesText('')
                  setBlogAiGenerateFormat('neutral')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full"
                onClick={handleBlogGenerateFromTitle}
                disabled={
                  blogAiLoading ||
                  (blogAiTitleMode === 'single' && !blogAiGenerateTitle.trim()) ||
                  (blogAiTitleMode === 'separate' &&
                    blogAiTitlesText.split('\n').map((s) => s.trim()).filter(Boolean).length < blogAiNumberOfBlogs)
                }
              >
                {blogAiLoading ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin me-1.5" />
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="ri-magic-line me-1" />
                    Generate blog
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  )
}

export default CreateModule
