"use client"

import React, { Fragment, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import dynamic from 'next/dynamic'
import TiptapEditor from '@/shared/data/forms/form-editors/tiptapeditor'

const Select = dynamic(() => import('react-select'), { ssr: false })

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

type ModuleFormData = {
  categoryId: string
  name: string
  coverImage: string
  shortDescription: string
  studentIds: string[]
  mentorIds: string[]
  playlist: PlaylistItem[]
}

const CATEGORY_OPTIONS = [
  { value: 'cat-1', label: 'Technical Skills' },
  { value: 'cat-2', label: 'Leadership & Soft Skills' },
  { value: 'cat-3', label: 'Product & Design' },
]

type PersonOption = {
  value: string
  label: string
  avatar: string
}

const STUDENT_OPTIONS: PersonOption[] = [
  { value: 's1', label: 'Emma Wilson', avatar: '/assets/images/faces/1.jpg' },
  { value: 's2', label: 'James Brown', avatar: '/assets/images/faces/2.jpg' },
  { value: 's3', label: 'Olivia Davis', avatar: '/assets/images/faces/4.jpg' },
  { value: 's4', label: 'Liam Miller', avatar: '/assets/images/faces/5.jpg' },
  { value: 's5', label: 'Ava Garcia', avatar: '/assets/images/faces/6.jpg' },
  { value: 's6', label: 'Noah Martinez', avatar: '/assets/images/faces/7.jpg' },
  { value: 's7', label: 'Sophia Anderson', avatar: '/assets/images/faces/8.jpg' },
  { value: 's8', label: 'Ethan Thomas', avatar: '/assets/images/faces/9.jpg' },
  { value: 's9', label: 'Isabella Jackson', avatar: '/assets/images/faces/10.jpg' },
  { value: 's10', label: 'Mason White', avatar: '/assets/images/faces/11.jpg' },
]

const MENTOR_OPTIONS: PersonOption[] = [
  { value: 'm1', label: 'Alex', avatar: '/assets/images/faces/2.jpg' },
  { value: 'm2', label: 'Sam', avatar: '/assets/images/faces/8.jpg' },
  { value: 'm3', label: 'Jordan', avatar: '/assets/images/faces/12.jpg' },
  { value: 'm4', label: 'Casey', avatar: '/assets/images/faces/10.jpg' },
  { value: 'm5', label: 'Morgan', avatar: '/assets/images/faces/5.jpg' },
  { value: 'm6', label: 'Riley', avatar: '/assets/images/faces/9.jpg' },
  { value: 'm7', label: 'Quinn', avatar: '/assets/images/faces/11.jpg' },
  { value: 'm8', label: 'Taylor', avatar: '/assets/images/faces/3.jpg' },
  { value: 'm9', label: 'Jamie', avatar: '/assets/images/faces/13.jpg' },
  { value: 'm10', label: 'Drew', avatar: '/assets/images/faces/6.jpg' },
]

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
      {/* Visible list for this course */}
      {selected.length > 0 && (
        <div className="mt-2 p-3 rounded-md border border-defaultborder bg-black/5 dark:bg-white/5">
          <div className="text-[0.75rem] font-semibold text-[#8c9097] dark:text-white/50 mb-2">
            Selected for this course
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
  const [activeTab, setActiveTab] = useState<'info' | 'playlist'>('info')
  const [formData, setFormData] = useState<ModuleFormData>({
    categoryId: '',
    name: '',
    coverImage: '',
    shortDescription: '',
    studentIds: [],
    mentorIds: [],
    playlist: [],
  })

  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string>('')
  const [coverImageDragOver, setCoverImageDragOver] = useState(false)
  const coverImageInputRef = useRef<HTMLInputElement>(null)

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
    setCoverImagePreview('')
    handleInputChange('coverImage', '')
    if (coverImageInputRef.current) coverImageInputRef.current.value = ''
  }

  const handleCategoryChange = (option: { value: string; label: string } | null) => {
    handleInputChange('categoryId', option?.value || '')
  }

  const [quizModalItemId, setQuizModalItemId] = useState<string | null>(null)
  const [videoDragOverId, setVideoDragOverId] = useState<string | null>(null)
  const [pdfDragOverId, setPdfDragOverId] = useState<string | null>(null)
  const pdfFilesRef = useRef<Record<string, File>>({})

  const getYoutubeVideoId = (url: string): string | null => {
    if (!url?.trim()) return null
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    return m ? m[1] : null
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
      quizData: [],
    }
    handleInputChange('playlist', [...formData.playlist, newItem])
  }

  const handlePlaylistItemChange = (id: string, field: keyof PlaylistItem, value: any) => {
    handleInputChange(
      'playlist',
      formData.playlist.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  const handleRemovePlaylistItem = (id: string) => {
    handleInputChange(
      'playlist',
      formData.playlist.filter((item) => item.id !== id),
    )
  }

  const quizModalItem = quizModalItemId
    ? formData.playlist.find((i) => i.id === quizModalItemId)
    : null

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

  const processPlaylistVideoFile = (itemId: string, file: File | null) => {
    if (!file || !file.type.startsWith('video/')) return
    const url = URL.createObjectURL(file)
    handlePlaylistItemChange(itemId, 'videoPreview', url)
    handlePlaylistItemChange(itemId, 'source', file.name)
  }

  const processPlaylistPdfFile = (itemId: string, file: File | null) => {
    if (!file) return
    const isPdf = file.type === 'application/pdf'
    if (!isPdf) return
    pdfFilesRef.current[itemId] = file
    handlePlaylistItemChange(itemId, 'source', file.name)
  }

  const removePlaylistPdfFile = (itemId: string) => {
    delete pdfFilesRef.current[itemId]
    handlePlaylistItemChange(itemId, 'source', '')
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send the data to your API
    // For now, we'll just navigate back to the modules list
    console.log('Module data:', formData)
    router.push('/training/curriculum/modules')
  }

  return (
    <Fragment>
      <Seo title="Create Training Module" />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-header flex items-center justify-between flex-wrap gap-4">
              <div className="box-title">Create New Training Module</div>
              <Link
                href="/training/curriculum/modules"
                className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
              >
                <i className="ri-arrow-left-line me-1" /> Back to Modules
              </Link>
            </div>
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
                        <Select
                          id="category"
                          value={CATEGORY_OPTIONS.find((opt) => opt.value === formData.categoryId) || null}
                          onChange={handleCategoryChange}
                          options={CATEGORY_OPTIONS}
                          classNamePrefix="Select2"
                          placeholder="Select Category"
                          menuPlacement="auto"
                        />
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
                          Cover Image <span className="text-danger">*</span>
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
                        <CheckboxDropdown
                          label="Students"
                          placeholder="Select students"
                          options={STUDENT_OPTIONS}
                          selectedIds={formData.studentIds}
                          onChange={(ids) => handleInputChange('studentIds', ids)}
                        />
                      </div>

                      {/* Mentors Assigned */}
                      <div className="xl:col-span-6 col-span-12">
                        <CheckboxDropdown
                          label="Mentors Assigned"
                          placeholder="Select mentors"
                          options={MENTOR_OPTIONS}
                          selectedIds={formData.mentorIds}
                          onChange={(ids) => handleInputChange('mentorIds', ids)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'playlist' && (
                  <div id="playlist-panel" role="tabpanel" aria-labelledby="playlist-tab">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h5 className="font-semibold mb-1">Course Playlist</h5>
                        <p className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] mb-0">
                          Add items like uploaded videos, YouTube links, quizzes, PDFs, etc. The
                          order here will be used as the course flow.
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
                        course.
                      </div>
                    )}

                    <div className="space-y-4">
                      {formData.playlist.map((item, index) => (
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
                                <option value="test">Test</option>
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
                          </div>

                          {/* Type-specific content */}
                          {item.type === 'video' && (
                            <div className="mt-4">
                              <label className="form-label">Video file</label>
                              {item.videoPreview ? (
                                <div className="relative rounded-lg border border-defaultborder overflow-hidden bg-black/5 dark:bg-white/5 group max-w-md">
                                  <video
                                    src={item.videoPreview}
                                    controls
                                    className="w-full max-h-48 object-contain block"
                                  />
                                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                        handlePlaylistItemChange(item.id, 'videoPreview', '')
                                        handlePlaylistItemChange(item.id, 'source', '')
                                      }}
                                    >
                                      <i className="ri-delete-bin-line" />
                                    </button>
                                  </div>
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
                >
                  Create Module
                </button>
              </div>
            </form>
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
    </Fragment>
  )
}

export default CreateModule
