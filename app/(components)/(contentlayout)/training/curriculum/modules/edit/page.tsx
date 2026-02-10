"use client"

import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { AxiosError } from 'axios'
import Swal from 'sweetalert2'
import Seo from '@/shared/layout-components/seo/seo'
import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'
import * as modulesApi from '@/shared/lib/api/curriculum-modules'
import * as categoriesApi from '@/shared/lib/api/categories'
import * as studentsApi from '@/shared/lib/api/students'
import * as mentorsApi from '@/shared/lib/api/mentors'
import type { CurriculumModule } from '@/shared/lib/api/curriculum-modules'

const Select = dynamic(() => import('react-select'), { ssr: false })

type CategoryOption = { value: string; label: string }

type PersonOption = {
  value: string
  label: string
  avatar: string
}

type PlaylistItemType = 'video' | 'youtube' | 'quiz' | 'pdf' | 'blog' | 'test'

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

type PlaylistItem = {
  id: string
  type: PlaylistItemType
  title: string
  source: string
  duration?: string
  blogContent?: string
  videoPreview?: string
  quizData?: QuizQuestion[]
}

const AVATAR_PLACEHOLDER = '/assets/images/faces/1.jpg'

type CheckboxDropdownProps = {
  options: PersonOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  label: string
  placeholder: string
}

function CheckboxDropdown({
  options,
  selectedIds,
  onChange,
  label,
  placeholder,
}: CheckboxDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
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

  const selected = useMemo(
    () => options.filter((o) => selectedIds.includes(o.value)),
    [options, selectedIds],
  )

  return (
    <div className="relative" ref={ref}>
      <label className="form-label block mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ti-form-control form-control flex items-center justify-between text-start w-full"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selectedIds.length === 0 ? 'text-[#8c9097] dark:text-white/50' : ''}>
          {selectedIds.length === 0 ? placeholder : `${selectedIds.length} selected`}
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

function getErrorMessage(err: any, fallback: string): string {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.message
    if (typeof msg === 'string') return msg
  }
  return fallback
}

const getYoutubeVideoId = (url: string): string | null => {
  if (!url?.trim()) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

const EditModulePage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const moduleId = searchParams.get('id') ?? ''

  const [moduleData, setModuleData] = useState<CurriculumModule | null>(null)
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [studentOptions, setStudentOptions] = useState<PersonOption[]>([])
  const [mentorOptions, setMentorOptions] = useState<PersonOption[]>([])
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState('')

  const [categoryId, setCategoryId] = useState('')
  const [name, setName] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [mentorIds, setMentorIds] = useState<string[]>([])

  const [activeTab, setActiveTab] = useState<'info' | 'playlist'>('info')
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([])
  const [quizModalItemId, setQuizModalItemId] = useState<string | null>(null)

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string>('')
  const [coverImageDragOver, setCoverImageDragOver] = useState(false)
  const coverImageInputRef = useRef<HTMLInputElement>(null)

  const [videoDragOverId, setVideoDragOverId] = useState<string | null>(null)
  const [pdfDragOverId, setPdfDragOverId] = useState<string | null>(null)
  const videoFilesRef = useRef<Record<string, File>>({})
  const pdfFilesRef = useRef<Record<string, File>>({})
  const [videoPreviewModal, setVideoPreviewModal] = useState<{
    itemId: string
    url: string
  } | null>(null)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!moduleId) {
      router.replace('/training/curriculum/modules')
      return
    }

    let cancelled = false
    ;(async () => {
      setFetching(true)
      setError('')
      try {
        const [mod, categories, students, mentors] = await Promise.all([
          modulesApi.getModule(moduleId),
          categoriesApi.listCategories({ limit: 500 }).then((r) => r.results),
          studentsApi.listStudents({ limit: 500 }).then((r) => r.results),
          mentorsApi.listMentors({ limit: 500 }).then((r) => r.results),
        ])
        if (cancelled) return

        setModuleData(mod)
        setCategoryId(
          typeof mod.categoryId === 'string'
            ? mod.categoryId
            : (mod.categoryId as any)?.id ?? '',
        )
        setName(mod.name ?? '')
        setShortDescription(mod.shortDescription ?? '')
        setStudentIds(
          Array.isArray(mod.studentIds)
            ? (mod.studentIds as any[]).map((s) => s.id).filter((id: any) => typeof id === 'string')
            : [],
        )
        setMentorIds(
          Array.isArray(mod.mentorIds)
            ? (mod.mentorIds as any[]).map((m) => m.id).filter((id: any) => typeof id === 'string')
            : [],
        )

        setCategoryOptions(categories.map((c) => ({ value: c.id, label: c.name })))
        setStudentOptions(
          students.map((s) => ({
            value: s.id,
            label: s.user?.name ?? 'Unknown',
            avatar:
              s.profileImageUrl && typeof s.profileImageUrl === 'string'
                ? studentsApi.getStudentProfilePictureUrl(s.profileImageUrl) || AVATAR_PLACEHOLDER
                : AVATAR_PLACEHOLDER,
          })),
        )
        setMentorOptions(
          mentors.map((m) => ({
            value: m.id,
            label: m.user?.name ?? 'Unknown',
            avatar:
              m.profileImageUrl && typeof m.profileImageUrl === 'string'
                ? mentorsApi.getMentorProfilePictureUrl(m.profileImageUrl) || AVATAR_PLACEHOLDER
                : AVATAR_PLACEHOLDER,
          })),
        )

        // Existing cover image preview
        if (mod.coverImageUrl) {
          setCoverImagePreview(modulesApi.getModuleCoverUrl(mod.coverImageUrl))
        }

        const apiPlaylist = Array.isArray(mod.playlist) ? (mod.playlist as any[]) : []
        setPlaylist(
          apiPlaylist.map((item, index) => {
            const type = (item.type ?? 'video') as PlaylistItemType
            const rawQuiz = Array.isArray((item as any).quizData) ? (item as any).quizData : []
            const sourceUrl = (item as any).sourceUrl ?? (item as any).source ?? ''

            return {
              id: String((item as any).id ?? `item-${index}`),
              type,
              title: (item as any).title ?? '',
              source: sourceUrl,
              duration:
                (item as any).duration !== undefined && (item as any).duration !== null
                  ? String((item as any).duration)
                  : '',
              blogContent: (item as any).blogContent ?? '',
              videoPreview: type === 'video' ? modulesApi.getPlaylistItemSourceUrl(sourceUrl) : '',
              quizData: rawQuiz.map((q: any, qi: number) => ({
                id: String(q.id ?? `q-${index}-${qi}`),
                question: q.question ?? '',
                multipleCorrect: !!q.multipleCorrect,
                options: Array.isArray(q.options)
                  ? q.options.map((o: any, oi: number) => ({
                      id: String(o.id ?? `o-${index}-${qi}-${oi}`),
                      text: o.text ?? '',
                      correct: !!o.correct,
                    }))
                  : [],
              })),
            } as PlaylistItem
          }),
        )
      } catch (err) {
        if (cancelled) return
        const msg = getErrorMessage(err, 'Failed to load module.')
        setError(msg)
        await Swal.fire({
          icon: 'error',
          title: 'Failed to load module',
          text: msg,
          toast: true,
          position: 'top-end',
          timer: 4000,
          showConfirmButton: false,
          timerProgressBar: true,
        })
      } finally {
        if (!cancelled) setFetching(false)
        setOptionsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [moduleId, router])

  const handleAddPlaylistItem = () => {
    const newItem: PlaylistItem = {
      id: Date.now().toString(),
      type: 'video',
      title: '',
      source: '',
      duration: '',
      blogContent: '',
      videoPreview: '',
      quizData: [],
    }
    setPlaylist((prev) => [...prev, newItem])
  }

  const handlePlaylistItemChange = (id: string, field: keyof PlaylistItem, value: any) => {
    setPlaylist((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const handleRemovePlaylistItem = (id: string) => {
    setPlaylist((prev) => prev.filter((item) => item.id !== id))
  }

  const quizModalItem = quizModalItemId
    ? playlist.find((i) => i.id === quizModalItemId)
    : null

  const updateQuizData = (itemId: string, quizData: QuizQuestion[]) => {
    setPlaylist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quizData } : item)),
    )
  }

  const addQuizQuestion = (itemId: string) => {
    const item = playlist.find((i) => i.id === itemId)
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
    const item = playlist.find((i) => i.id === itemId)
    if (!item?.quizData) return
    updateQuizData(
      itemId,
      item.quizData.filter((q) => q.id !== qId),
    )
  }

  const updateQuizQuestion = (
    itemId: string,
    qId: string,
    field: 'question' | 'multipleCorrect',
    value: string | boolean,
  ) => {
    const item = playlist.find((i) => i.id === itemId)
    if (!item?.quizData) return
    updateQuizData(
      itemId,
      item.quizData.map((q) =>
        q.id === qId ? { ...q, [field]: value } : q,
      ),
    )
  }

  const addQuizOption = (itemId: string, qId: string) => {
    const item = playlist.find((i) => i.id === itemId)
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
    const item = playlist.find((i) => i.id === itemId)
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
    const item = playlist.find((i) => i.id === itemId)
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

  const processCoverImageFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    setCoverImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setCoverImagePreview(reader.result as string)
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
    setCoverImagePreview('')
    if (coverImageInputRef.current) coverImageInputRef.current.value = ''
  }

  const processPlaylistVideoFile = (itemId: string, file: File | null) => {
    if (!file) return

    videoFilesRef.current[itemId] = file

    const url = URL.createObjectURL(file)
    handlePlaylistItemChange(itemId, 'videoPreview', url)
    handlePlaylistItemChange(itemId, 'source', file.name)

    try {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = url
      video.onloadedmetadata = () => {
        if (!Number.isNaN(video.duration) && video.duration > 0) {
          const minutes = Math.round(video.duration / 60)
          if (minutes > 0) {
            handlePlaylistItemChange(itemId, 'duration', String(minutes))
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const processPlaylistPdfFile = (itemId: string, file: File | null) => {
    if (!file) return
    if (file.type !== 'application/pdf') return
    pdfFilesRef.current[itemId] = file
    handlePlaylistItemChange(itemId, 'source', file.name)
  }

  const removePlaylistPdfFile = (itemId: string) => {
    delete pdfFilesRef.current[itemId]
    handlePlaylistItemChange(itemId, 'source', '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!moduleData) return
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Module name is required.')
      return
    }
    if (!categoryId) {
      setError('Category is required.')
      return
    }
    if (!shortDescription.trim()) {
      setError('Short description is required.')
      return
    }

    const playlistPayload = playlist.map((item, index) => {
      const base: Record<string, unknown> = {
        order: index + 1,
        type: item.type,
        title: item.title || '',
        duration: item.duration || undefined,
      }

      if (item.type === 'youtube' || item.type === 'test' || item.type === 'video' || item.type === 'pdf') {
        ;(base as any).sourceUrl = item.source || undefined
      }
      if (item.type === 'blog') {
        ;(base as any).blogContent = item.blogContent || undefined
      }
      if (item.type === 'quiz' && item.quizData?.length) {
        ;(base as any).quizData = item.quizData.map((q) => ({
          question: q.question,
          multipleCorrect: q.multipleCorrect ?? false,
          options: (q.options ?? []).map((o) => ({ text: o.text, correct: o.correct })),
        }))
      }

      return base
    })

    const allVideoPdfItems = playlist.filter((p) => p.type === 'video' || p.type === 'pdf')
    const playlistItemFiles: File[] = []
    for (const item of allVideoPdfItems) {
      if (item.type === 'video') {
        const file = videoFilesRef.current[item.id]
        if (file) playlistItemFiles.push(file)
      } else if (item.type === 'pdf') {
        const file = pdfFilesRef.current[item.id]
        if (file) playlistItemFiles.push(file)
      }
    }

    const hasFileUploads = !!coverImageFile || playlistItemFiles.length > 0

    if (playlistItemFiles.length > 0 && playlistItemFiles.length !== allVideoPdfItems.length) {
      setError(
        `To upload new video/PDF files, please select files for all ${allVideoPdfItems.length} video/PDF items in the playlist.`,
      )
      return
    }

    setLoading(true)
    try {
      if (hasFileUploads) {
        const formDataToSend = new FormData()
        if (categoryId) formDataToSend.append('categoryId', categoryId)
        if (trimmedName) formDataToSend.append('name', trimmedName)
        if (shortDescription.trim()) formDataToSend.append('shortDescription', shortDescription.trim())
        formDataToSend.append('studentIds', JSON.stringify(studentIds))
        formDataToSend.append('mentorIds', JSON.stringify(mentorIds))
        formDataToSend.append('playlist', JSON.stringify(playlistPayload))
        if (coverImageFile) {
          formDataToSend.append('coverImage', coverImageFile)
        }
        playlistItemFiles.forEach((file) => {
          formDataToSend.append('playlistItemFiles', file)
        })

        await modulesApi.updateModuleMultipart(moduleData.id, formDataToSend)
      } else {
        await modulesApi.updateModule(moduleData.id, {
          categoryId,
          name: trimmedName,
          shortDescription: shortDescription.trim(),
          studentIds,
          mentorIds,
          playlist: playlistPayload as any[],
        } as any)
      }

      await Swal.fire({
        icon: 'success',
        title: 'Module updated',
        text: `"${trimmedName}" has been updated successfully.`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      router.push('/training/curriculum/modules')
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to update module.')
      setError(msg)
      await Swal.fire({
        icon: 'error',
        title: 'Update failed',
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

  if (!moduleId) {
    return (
      <Fragment>
        <Seo title="Edit Module" />
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box custom-box">
              <div className="box-body py-12 text-center text-[#8c9097] dark:text-white/60">
                Missing module id. Redirecting...
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    )
  }

  if (fetching && !moduleData) {
    return (
      <Fragment>
        <Seo title="Edit Module" />
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-12 col-span-12">
            <div className="box custom-box">
              <div className="box-body py-12 text-center text-[#8c9097] dark:text-white/60">
                Loading module...
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title={`Edit Module - ${moduleData?.name ?? ''}`} />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">Edit Training Module</div>
              <Link
                href="/training/curriculum/modules"
                className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
              >
                <i className="ri-arrow-left-line me-1" /> Back to Modules
              </Link>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="box-body">
                {error && (
                  <div className="mb-4 p-3 rounded-md border border-danger/30 bg-danger/5 text-danger text-sm">
                    {error}
                  </div>
                )}

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
                      id="edit-info-tab"
                      aria-controls="edit-info-panel"
                    >
                      <i className="ri-file-text-line" />
                      Course Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('playlist')}
                      className={`hs-tab-active:bg-primary/10 hs-tab-active:text-primary hs-tab-active:border-primary -mb-px py-2 px-4 inline-flex items-center gap-2 text-sm font-medium text-center border-b-2 transition-colors ${
                        activeTab === 'playlist'
                          ? 'bg-primary/10 text-primary border-primary'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border-transparent'
                      }`}
                      id="edit-playlist-tab"
                      aria-controls="edit-playlist-panel"
                    >
                      <i className="ri-play-list-2-line" />
                      Playlist
                    </button>
                  </nav>
                </div>

                {activeTab === 'info' && (
                  <div id="edit-info-panel" role="tabpanel" aria-labelledby="edit-info-tab">
                    <div className="grid grid-cols-12 gap-4">
                      {/* Category */}
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="edit-module-category" className="form-label">
                          Category <span className="text-danger">*</span>
                        </label>
                        <Select
                          id="edit-module-category"
                          value={
                            categoryOptions.find((opt) => opt.value === categoryId) || null
                          }
                          onChange={(v: unknown) => {
                            const opt = v as CategoryOption | null
                            setCategoryId(opt?.value ?? '')
                          }}
                          options={categoryOptions}
                          classNamePrefix="Select2"
                          placeholder={
                            optionsLoading ? 'Loading categories...' : 'Select Category'
                          }
                          isDisabled={optionsLoading}
                        />
                      </div>

                      {/* Module name */}
                      <div className="xl:col-span-6 col-span-12">
                        <label htmlFor="edit-module-name" className="form-label">
                          Module Name <span className="text-danger">*</span>
                        </label>
                        <input
                          id="edit-module-name"
                          type="text"
                          className="form-control"
                          placeholder="Enter module name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      {/* Cover image (editable) */}
                      <div className="xl:col-span-12 col-span-12">
                        <label className="form-label">
                          Cover Image <span className="text-danger">*</span>
                        </label>
                        <input
                          ref={coverImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverImageChange}
                        />
                        {coverImagePreview ? (
                          <div className="relative rounded-lg border border-defaultborder overflow-hidden bg-black/5 dark:bg-white/5 group">
                            <img
                              src={coverImagePreview}
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

                      {/* Short description */}
                      <div className="xl:col-span-12 col-span-12">
                        <label htmlFor="edit-module-short-description" className="form-label">
                          Short Description <span className="text-danger">*</span>
                        </label>
                        <textarea
                          id="edit-module-short-description"
                          className="form-control"
                          rows={4}
                          placeholder="Enter a brief description of the training module"
                          value={shortDescription}
                          onChange={(e) => setShortDescription(e.target.value)}
                          required
                        />
                      </div>

                      {/* Students */}
                      <div className="xl:col-span-6 col-span-12">
                        <CheckboxDropdown
                          label="Students"
                          placeholder={
                            optionsLoading ? 'Loading students...' : 'Select students'
                          }
                          options={studentOptions}
                          selectedIds={studentIds}
                          onChange={setStudentIds}
                        />
                      </div>

                      {/* Mentors */}
                      <div className="xl:col-span-6 col-span-12">
                        <CheckboxDropdown
                          label="Mentors"
                          placeholder={
                            optionsLoading ? 'Loading mentors...' : 'Select mentors'
                          }
                          options={mentorOptions}
                          selectedIds={mentorIds}
                          onChange={setMentorIds}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'playlist' && (
                  <div id="edit-playlist-panel" role="tabpanel" aria-labelledby="edit-playlist-tab">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="font-semibold mb-1">Course Playlist</h5>
                        <p className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] mb-0">
                          Update the sequence and details of lessons, quizzes, and other items in
                          this module.
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

                    {playlist.length === 0 && (
                      <div className="border border-dashed border-defaultborder rounded-md p-4 text-center text-[#8c9097] dark:text-white/50 text-[0.8125rem]">
                        No playlist items configured yet. Use <span className="font-semibold">Add Item</span>{' '}
                        to start building the course flow.
                      </div>
                    )}

                    <div className="space-y-4">
                      {playlist.map((item, index) => (
                        <div
                          key={item.id}
                          className="border border-defaultborder rounded-md p-4 bg-white/60 dark:bg-black/20"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[0.75rem]">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-[0.875rem]">
                                {item.title || `Playlist item ${index + 1}`}
                              </span>
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
                              <label className="form-label" htmlFor={`edit-playlist-type-${item.id}`}>
                                Content Type
                              </label>
                              <select
                                id={`edit-playlist-type-${item.id}`}
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
                                <option value="video">Uploaded Video</option>
                                <option value="youtube">YouTube Link</option>
                                <option value="pdf">PDF / Document</option>
                                <option value="blog">Blog</option>
                                <option value="quiz">Quiz</option>
                                <option value="test">Test</option>
                              </select>
                            </div>
                            <div className="xl:col-span-4 md:col-span-6 col-span-12">
                              <label className="form-label" htmlFor={`edit-playlist-title-${item.id}`}>
                                Title
                              </label>
                              <input
                                id={`edit-playlist-title-${item.id}`}
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
                              <label className="form-label" htmlFor={`edit-playlist-duration-${item.id}`}>
                                Duration (min)
                              </label>
                              <input
                                id={`edit-playlist-duration-${item.id}`}
                                type="text"
                                className="form-control"
                                placeholder="e.g. 10"
                                value={item.duration || ''}
                                onChange={(e) =>
                                  handlePlaylistItemChange(item.id, 'duration', e.target.value)
                                }
                              />
                            </div>
                          </div>

                          {/* Type-specific content */}
                          {item.type === 'video' && (
                            <div className="mt-4">
                              <label className="form-label">Video file</label>
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
                                onClick={() =>
                                  document.getElementById(`edit-playlist-video-input-${item.id}`)?.click()
                                }
                                className={`rounded-lg border-2 border-dashed min-h-[140px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                                  videoDragOverId === item.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-defaultborder hover:border-primary/50'
                                }`}
                              >
                                <input
                                  id={`edit-playlist-video-input-${item.id}`}
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

                              {(videoFilesRef.current[item.id] || item.videoPreview) && (
                                <div className="mt-2 border border-dashed border-defaultborder bg-black/5 dark:bg-white/5 px-3 py-2 text-[0.75rem] text-[#8c9097] dark:text-white/50 flex flex-wrap items-center gap-3 rounded-md">
                                  <span className="font-semibold text-defaulttextcolor text-[0.8rem]">
                                    {videoFilesRef.current[item.id]?.name || 'Existing video'}
                                  </span>
                                  {videoFilesRef.current[item.id] && (
                                    <span>
                                      {(videoFilesRef.current[item.id].size / (1024 * 1024)).toFixed(2)} MB
                                    </span>
                                  )}
                                  {item.duration && (
                                    <span>
                                      Approx. duration: {item.duration} min
                                    </span>
                                  )}
                                  {(videoFilesRef.current[item.id] || item.videoPreview) && (
                                    <button
                                      type="button"
                                      className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem] !mb-0"
                                      onClick={() => {
                                        const file = videoFilesRef.current[item.id]
                                        if (file) {
                                          const url = URL.createObjectURL(file)
                                          setVideoPreviewModal({ itemId: item.id, url })
                                        } else if (item.videoPreview) {
                                          setVideoPreviewModal({ itemId: item.id, url: item.videoPreview })
                                        }
                                      }}
                                    >
                                      <i className="ri-play-line me-1" />
                                      Preview
                                    </button>
                                  )}
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

                          {item.type === 'blog' && (
                            <div className="mt-4">
                              <label className="form-label">Blog content</label>
                              <div className="border border-defaultborder rounded-md overflow-hidden">
                                <TiptapEditor
                                  content={item.blogContent ?? ''}
                                  placeholder="Write your blog post..."
                                  onChange={(html) =>
                                    handlePlaylistItemChange(item.id, 'blogContent', html)
                                  }
                                />
                              </div>
                            </div>
                          )}

                          {item.type === 'quiz' && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <label className="form-label mb-0">
                                  Quiz (MCQ – single or multiple correct answers)
                                </label>
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

                          {item.type === 'pdf' && (
                            <div className="mt-4">
                              <label className="form-label">PDF document</label>
                              {item.source && pdfFilesRef.current[item.id] ? (
                                <div className="relative rounded-lg border border-defaultborder p-4 bg-black/5 dark:bg-white/5 flex items-center gap-4 max-w-md">
                                  <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-danger/10 text-danger text-2xl">
                                    <i className="ri-file-pdf-line" />
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-[0.875rem] truncate">
                                      {item.source}
                                    </div>
                                    <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                      {(pdfFilesRef.current[item.id].size / 1024).toFixed(1)} KB
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
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
                                  onClick={() =>
                                    document
                                      .getElementById(`edit-playlist-pdf-input-${item.id}`)
                                      ?.click()
                                  }
                                  className={`rounded-lg border-2 border-dashed min-h-[120px] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                                    pdfDragOverId === item.id
                                      ? 'border-primary bg-primary/5'
                                      : 'border-defaultborder hover:border-primary/50'
                                  }`}
                                >
                                  <input
                                    id={`edit-playlist-pdf-input-${item.id}`}
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

                          {item.type === 'test' && (
                            <div className="mt-4">
                              <label className="form-label">Test link or description</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Test URL or reference"
                                value={item.source}
                                onChange={(e) =>
                                  handlePlaylistItemChange(item.id, 'source', e.target.value)
                                }
                              />
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Video preview modal */}
      {videoPreviewModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            URL.revokeObjectURL(videoPreviewModal.url)
            setVideoPreviewModal(null)
          }}
        >
          <div
            className="bg-bodybg border border-defaultborder rounded-lg shadow-xl max-w-3xl w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold mb-0">Preview Video</h5>
              <button
                type="button"
                className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
                onClick={() => {
                  URL.revokeObjectURL(videoPreviewModal.url)
                  setVideoPreviewModal(null)
                }}
              >
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black/80 rounded-md flex items-center justify-center overflow-hidden">
              <video
                src={videoPreviewModal.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

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
                        id={`edit-quiz-multi-${q.id}`}
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
                      <label
                        htmlFor={`edit-quiz-multi-${q.id}`}
                        className="form-check-label text-[0.8125rem]"
                      >
                        Allow multiple correct answers
                      </label>
                    </div>
                    <div className="text-[0.75rem] font-semibold text-[#8c9097] dark:text-white/50 mb-2">
                      Options
                    </div>
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
                            title="Correct answer"
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
            <div className="p-4 border-t border-defaultborder flex justify-between items-center">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                onClick={() => {
                  if (quizModalItemId) addQuizQuestion(quizModalItemId)
                }}
              >
                <i className="ri-add-line me-1" />
                Add Question
              </button>
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
    </Fragment>
  )
}

export default EditModulePage

