"use client"

import Seo from '@/shared/layout-components/seo/seo'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as trainingModulesApi from '@/shared/lib/api/training-modules'
import * as categoriesApi from '@/shared/lib/api/categories'
import type { TrainingModule as ApiTrainingModule, PlaylistItem } from '@/shared/lib/api/training-modules'
import type { Category as ApiCategory } from '@/shared/lib/api/categories'
import type { MultiValue } from 'react-select'

const Select = dynamic(() => import('react-select'), { ssr: false })

const UNCATEGORIZED_FOLDER_ID = '__uncategorized__'

type CategorySelectOption = { value: string; label: string }

function AssignFoldersModal({
  open,
  module,
  categoryOptions,
  onClose,
  onSave,
}: {
  open: boolean
  module: ApiTrainingModule | null
  categoryOptions: CategorySelectOption[]
  onClose: () => void
  onSave: (categoryIds: string[]) => Promise<void>
}) {
  const [selected, setSelected] = useState<MultiValue<CategorySelectOption>>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !module) return
    const ids = new Set((module.categories ?? []).map((c) => c.id))
    setSelected(categoryOptions.filter((o) => ids.has(o.value)))
  }, [open, module, categoryOptions])

  if (!open) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(selected.map((o) => o.value))
      onClose()
    } catch {
      /* parent shows error */
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-defaultborder">
          <h5 className="font-semibold mb-0 text-[1rem]">Move to folder(s)</h5>
          <button type="button" className="ti-btn ti-btn-light !py-1 !px-2" onClick={onClose} aria-label="Close">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-0">
            Choose one or more folders for <span className="text-defaulttextcolor font-medium">{module?.moduleName}</span>.
            Clear all to leave the module uncategorized.
          </p>
          <Select
            isMulti
            options={categoryOptions}
            value={selected}
            onChange={(opts) => setSelected((opts as MultiValue<CategorySelectOption>) ?? [])}
            classNamePrefix="Select2"
            placeholder="Select folders…"
            menuPlacement="auto"
            isDisabled={!categoryOptions.length}
          />
          {!categoryOptions.length ? (
            <p className="text-[0.8125rem] text-warning mb-0">Create a folder first, then assign modules to it.</p>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-defaultborder">
          <button type="button" className="ti-btn ti-btn-light !mb-0" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-primary !mb-0"
            onClick={handleSave}
            disabled={saving || !module}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkAssignFoldersModal({
  open,
  count,
  categoryOptions,
  onClose,
  onSave,
  busy,
}: {
  open: boolean
  count: number
  categoryOptions: CategorySelectOption[]
  onClose: () => void
  onSave: (categoryIds: string[]) => Promise<void>
  busy: boolean
}) {
  const [selected, setSelected] = useState<MultiValue<CategorySelectOption>>([])

  useEffect(() => {
    if (open) setSelected([])
  }, [open])

  if (!open) return null

  const handleSave = async () => {
    await onSave(selected.map((o) => o.value))
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-defaultborder">
          <h5 className="font-semibold mb-0 text-[1rem]">Move {count} module(s) to folder(s)</h5>
          <button type="button" className="ti-btn ti-btn-light !py-1 !px-2" onClick={onClose} aria-label="Close">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-0">
            Choose folder(s) for the selected modules. This will <strong>replace</strong> existing folder assignments.
          </p>
          <Select
            isMulti
            options={categoryOptions}
            value={selected}
            onChange={(opts) => setSelected((opts as MultiValue<CategorySelectOption>) ?? [])}
            classNamePrefix="Select2"
            placeholder="Select folders…"
            menuPlacement="auto"
            isDisabled={!categoryOptions.length || busy}
          />
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-defaultborder">
          <button type="button" className="ti-btn ti-btn-light !mb-0" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-primary !mb-0"
            onClick={handleSave}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NewFolderModal({
  open,
  folderName,
  onFolderNameChange,
  creating,
  onClose,
  onSubmit,
}: {
  open: boolean
  folderName: string
  onFolderNameChange: (v: string) => void
  creating: boolean
  onClose: () => void
  onSubmit: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-full max-w-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-defaultborder">
          <h5 className="font-semibold mb-0 text-[1rem]">New folder</h5>
          <button type="button" className="ti-btn ti-btn-light !py-1 !px-2" onClick={onClose} aria-label="Close">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <label className="form-label" htmlFor="new-training-folder-name">
            Folder name
          </label>
          <input
            id="new-training-folder-name"
            type="text"
            className="form-control"
            placeholder="e.g. Java Developer"
            value={folderName}
            onChange={(e) => onFolderNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSubmit()
              }
            }}
          />
          <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0">
            Folders are shared with Training → Curriculum → Categories. You can assign any module to one or more folders.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-defaultborder">
          <button type="button" className="ti-btn ti-btn-light !mb-0" onClick={onClose} disabled={creating}>
            Cancel
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-primary !mb-0"
            onClick={onSubmit}
            disabled={creating || !folderName.trim()}
          >
            {creating ? 'Creating…' : 'Create folder'}
          </button>
        </div>
      </div>
    </div>
  )
}

const SORT_OPTIONS = [
  { value: 'moduleName:asc', label: 'Name (A - Z)' },
  { value: 'moduleName:desc', label: 'Name (Z - A)' },
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'createdAt:asc', label: 'Oldest' },
]

const contentTypeMeta: Record<string, { label: string; icon: string; color: string }> = {
  'upload-video': { label: 'Uploaded Video', icon: 'ri-video-line', color: 'text-primary' },
  'youtube-link': { label: 'YouTube Link', icon: 'ri-youtube-line', color: 'text-danger' },
  'pdf-document': { label: 'PDF / Document', icon: 'ri-file-pdf-line', color: 'text-danger' },
  blog: { label: 'Blog', icon: 'ri-article-line', color: 'text-info' },
  quiz: { label: 'Quiz', icon: 'ri-questionnaire-line', color: 'text-warning' },
  essay: { label: 'Q&A', icon: 'ri-edit-line', color: 'text-primary' },
}

function getContentTypeMeta(contentType: string) {
  return contentTypeMeta[contentType] ?? { label: contentType || 'Content', icon: 'ri-file-line', color: 'text-secondary' }
}

function getYoutubeVideoId(url: string): string | null {
  if (!url?.trim()) return null
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function formatDateTime(value?: string): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString()
}

interface ModuleSummary {
  videos: number
  pdfs: number
  blogs: number
  quiz: number
  essays?: number
}

function calculateSummary(playlist: PlaylistItem[]): ModuleSummary & { essays: number } {
  return {
    videos: playlist.filter((item) =>
      item.contentType === 'upload-video' || item.contentType === 'youtube-link'
    ).length,
    pdfs: playlist.filter((item) => item.contentType === 'pdf-document').length,
    blogs: playlist.filter((item) => item.contentType === 'blog').length,
    quiz: playlist.filter((item) => item.contentType === 'quiz').length,
    essays: playlist.filter((item) => item.contentType === 'essay').length,
  }
}

function SummaryBadges({ summary }: { summary: ModuleSummary }) {
  const items: { label: string; count: number; icon: string }[] = [
    { label: 'Videos', count: summary.videos, icon: 'ri-video-line' },
    { label: 'PDFs', count: summary.pdfs, icon: 'ri-file-pdf-line' },
    { label: 'Blogs', count: summary.blogs, icon: 'ri-article-line' },
    { label: 'Quiz', count: summary.quiz, icon: 'ri-questionnaire-line' },
  ]
  if ((summary.essays ?? 0) > 0)
    items.push({ label: 'Q&A', count: summary.essays!, icon: 'ri-edit-line' })
  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {items.map(({ label, count, icon }) => (
        <span
          key={label}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[0.6875rem] bg-primary/10 text-primary"
          title={`${count} ${label}`}
        >
          <i className={`${icon} text-[0.75rem]`} />
          <span className="font-medium">{count}</span>
          <span className="text-[#8c9097] dark:text-white/50">{label}</span>
        </span>
      ))}
    </div>
  )
}

type ModuleLifecycleStatus = 'draft' | 'published' | 'archived'

interface TrainingModuleCardProps {
  module: ApiTrainingModule
  onDelete: (moduleId: string) => void
  onView: (moduleId: string) => void
  onClone: (moduleId: string) => void
  onAssignFolders: (moduleId: string) => void
  onSetStatus: (moduleId: string, status: ModuleLifecycleStatus) => void
  statusUpdatingId: string | null
  selected?: boolean
  onToggleSelect?: (moduleId: string) => void
}

interface ModuleDetailModalProps {
  open: boolean
  moduleData: ApiTrainingModule | null
  loading: boolean
  error: string | null
  onClose: () => void
}

function ModuleDetailModal({ open, moduleData, loading, error, onClose }: ModuleDetailModalProps) {
  const sortedPlaylist = useMemo(
    () => [...(moduleData?.playlist ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [moduleData?.playlist],
  )
  const playlistBySection = useMemo(() => {
    const groups: { sectionTitle?: string; sectionIndex?: number; items: PlaylistItem[] }[] = []
    for (const item of sortedPlaylist) {
      const key = item.sectionTitle ?? '__none__'
      const last = groups[groups.length - 1]
      if (last && (last.sectionTitle ?? '__none__') === key) {
        last.items.push(item)
      } else {
        groups.push({
          sectionTitle: item.sectionTitle,
          sectionIndex: item.sectionIndex,
          items: [item],
        })
      }
    }
    return groups
  }, [sortedPlaylist])
  const summary = useMemo(() => calculateSummary(moduleData?.playlist ?? []), [moduleData?.playlist])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-[96vw] max-w-6xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-defaultborder">
          <h5 className="font-semibold mb-0 text-[1rem]">Module Details</h5>
          <button type="button" className="ti-btn ti-btn-light !py-1 !px-2" onClick={onClose}>
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="text-center py-10 text-[#8c9097] dark:text-white/50">Loading module details...</div>
          ) : error ? (
            <div className="text-center py-10 text-danger">{error}</div>
          ) : !moduleData ? (
            <div className="text-center py-10 text-[#8c9097] dark:text-white/50">Module not found.</div>
          ) : (
            <>
              <div className="box custom-box overflow-hidden mb-4">
                <div className="relative h-56 bg-defaultborder">
                  <img
                    src={moduleData.coverImage?.url || '/assets/images/media/team-covers/1.jpg'}
                    alt={moduleData.moduleName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="absolute inset-0 p-5 flex flex-col justify-end text-white">
                    <h2 className="text-xl font-semibold mb-1">{moduleData.moduleName}</h2>
                    <p className="text-white/90 text-[0.875rem] mb-2 line-clamp-2">{moduleData.shortDescription}</p>
                    <div className="flex flex-wrap gap-2 text-[0.75rem]">
                      <span className="px-2 py-1 rounded bg-white/20">Status: {moduleData.status}</span>
                      <span className="px-2 py-1 rounded bg-white/20">{moduleData.playlist?.length ?? 0} lessons</span>
                      <span className="px-2 py-1 rounded bg-white/20">{summary.videos} videos</span>
                      <span className="px-2 py-1 rounded bg-white/20">{summary.quiz} quizzes</span>
                    </div>
                  </div>
                </div>
                <div className="box-body">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(moduleData.categories ?? []).map((category) => (
                      <span
                        key={category.id}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[0.75rem]"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-12 gap-3 text-[0.8125rem]">
                    <div className="xl:col-span-6 col-span-12 text-[#8c9097] dark:text-white/50">
                      Created: <span className="text-defaulttextcolor">{formatDateTime(moduleData.createdAt)}</span>
                    </div>
                    <div className="xl:col-span-6 col-span-12 text-[#8c9097] dark:text-white/50">
                      Updated: <span className="text-defaulttextcolor">{formatDateTime(moduleData.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="xl:col-span-8 col-span-12">
                  <div className="box custom-box">
                    <div className="box-header">
                      <div className="box-title">Curriculum</div>
                    </div>
                    <div className="box-body">
                      {sortedPlaylist.length === 0 ? (
                        <div className="text-center py-8 text-[#8c9097] dark:text-white/50">No playlist content yet.</div>
                      ) : (
                        <div className="space-y-4">
                          {playlistBySection.map((group) => (
                            <div key={group.sectionTitle ?? `section-${group.sectionIndex ?? 0}`} className="space-y-3">
                              {group.sectionTitle && (
                                <div className="flex items-center gap-2 py-2 border-b border-primary/30">
                                  <i className="ri-folder-open-line text-primary text-lg" />
                                  <span className="font-semibold text-[0.9375rem] text-primary">
                                    {group.sectionTitle}
                                  </span>
                                </div>
                              )}
                              {group.items.map((item, idx) => {
                            const meta = getContentTypeMeta(item.contentType ?? '')
                            const index = sortedPlaylist.indexOf(item)
                            const quizQuestions = item.contentType === 'quiz' ? item.quiz?.questions ?? [] : []
                            return (
                              <div
                                key={item._id ?? item.id ?? `${item.title}-${index}`}
                                className="border border-defaultborder rounded-md p-3 bg-white/60 dark:bg-black/20"
                              >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[0.75rem]">
                                      {index + 1}
                                    </span>
                                    <div>
                                      <div className="font-semibold">{item.title || `Lesson ${index + 1}`}</div>
                                      <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                        <i className={`${meta.icon} me-1 ${meta.color}`} />
                                        {meta.label}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[0.75rem] px-2 py-1 rounded bg-black/5 dark:bg-white/5">
                                    {item.duration ?? 0} min
                                  </span>
                                </div>

                                {item.contentType === 'upload-video' && item.videoFile?.url && (
                                  <video
                                    src={item.videoFile.url}
                                    controls
                                    className="w-full max-h-60 rounded border border-defaultborder"
                                  />
                                )}
                                {item.contentType === 'youtube-link' && item.youtubeUrl && (
                                  <div className="mt-2 flex flex-wrap items-center gap-3">
                                    {getYoutubeVideoId(item.youtubeUrl) && (
                                      <a
                                        href={item.youtubeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block shrink-0 w-40 rounded overflow-hidden border border-defaultborder aspect-video bg-[#1a1a1a]"
                                      >
                                        <img
                                          src={`https://img.youtube.com/vi/${getYoutubeVideoId(item.youtubeUrl)}/mqdefault.jpg`}
                                          alt={item.title || 'YouTube video'}
                                          className="w-full h-full object-cover"
                                        />
                                      </a>
                                    )}
                                    <a
                                      href={item.youtubeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary text-[0.875rem] underline shrink-0"
                                    >
                                      Open YouTube video
                                    </a>
                                  </div>
                                )}
                                {item.contentType === 'pdf-document' && item.pdfDocument?.url && (
                                  <a
                                    href={item.pdfDocument.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary text-[0.875rem] underline"
                                  >
                                    Preview PDF document
                                  </a>
                                )}
                                {item.contentType === 'blog' && item.blogContent && (
                                  <div
                                    className="prose prose-sm max-w-none dark:prose-invert mt-2"
                                    dangerouslySetInnerHTML={{ __html: item.blogContent }}
                                  />
                                )}
                                {item.contentType === 'quiz' && (
                                  <div className="mt-2">
                                    <div className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-2">
                                      {quizQuestions.length} question{quizQuestions.length === 1 ? '' : 's'}
                                    </div>
                                    <div className="space-y-3">
                                      {quizQuestions.map((q, qIdx) => (
                                        <div key={`${q.questionText}-${qIdx}`} className="rounded border border-defaultborder p-3">
                                          <div className="font-medium text-[0.875rem] mb-2">{qIdx + 1}. {q.questionText}</div>
                                          <div className="space-y-1">
                                            {(q.options ?? []).map((opt, oi) => (
                                              <div key={`${opt.text}-${oi}`} className="text-[0.8125rem] flex items-center gap-2">
                                                <i
                                                  className={
                                                    opt.isCorrect
                                                      ? 'ri-checkbox-circle-line text-success'
                                                      : 'ri-checkbox-blank-circle-line text-[#8c9097]'
                                                  }
                                                />
                                                <span>{opt.text}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-4 col-span-12 space-y-4">
                  <div className="box custom-box">
                    <div className="box-header">
                      <div className="box-title">This Module Includes</div>
                    </div>
                    <div className="box-body text-[0.875rem] space-y-2">
                      <div><i className="ri-play-circle-line me-2 text-primary" />{summary.videos} video items</div>
                      <div><i className="ri-file-pdf-line me-2 text-danger" />{summary.pdfs + summary.blogs} docs/blogs</div>
                      <div><i className="ri-questionnaire-line me-2 text-warning" />{summary.quiz} quizzes</div>
                      {(summary.essays ?? 0) > 0 && (
                        <div><i className="ri-edit-line me-2 text-primary" />{summary.essays} Q&A</div>
                      )}
                      <div><i className="ri-user-line me-2 text-info" />{moduleData.students?.length ?? 0} students</div>
                      <div><i className="ri-user-star-line me-2 text-info" />{moduleData.mentorsAssigned?.length ?? 0} mentors</div>
                    </div>
                  </div>

                  <div className="box custom-box">
                    <div className="box-header">
                      <div className="box-title">Students</div>
                    </div>
                    <div className="box-body space-y-2 max-h-56 overflow-auto">
                      {(moduleData.students ?? []).length === 0 ? (
                        <div className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">No students assigned.</div>
                      ) : (
                        (moduleData.students ?? []).map((s) => (
                          <div key={s.id} className="text-[0.8125rem]">
                            {s.user?.name || 'Unknown'} <span className="text-[#8c9097]">({s.user?.email || '-'})</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="box custom-box">
                    <div className="box-header">
                      <div className="box-title">Mentors</div>
                    </div>
                    <div className="box-body space-y-2 max-h-56 overflow-auto">
                      {(moduleData.mentorsAssigned ?? []).length === 0 ? (
                        <div className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">No mentors assigned.</div>
                      ) : (
                        (moduleData.mentorsAssigned ?? []).map((m) => (
                          <div key={m.id} className="text-[0.8125rem]">
                            {m.user?.name || 'Unknown'} <span className="text-[#8c9097]">({m.user?.email || '-'})</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-defaultborder">
          {moduleData?.id ? (
            <Link href={`/training/curriculum/modules/edit?id=${moduleData.id}`} className="ti-btn ti-btn-primary !mb-0">
              Edit Module
            </Link>
          ) : null}
          <button type="button" className="ti-btn ti-btn-light !mb-0" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function TrainingModuleCard({
  module: m,
  onDelete,
  onView,
  onClone,
  onAssignFolders,
  onSetStatus,
  statusUpdatingId,
  selected,
  onToggleSelect,
}: TrainingModuleCardProps) {
  const summary = calculateSummary(m.playlist || [])
  const coverImageUrl = m.coverImage?.url || '/assets/images/media/team-covers/1.jpg'
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete Module?',
      text: `Are you sure you want to delete "${m.moduleName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    })

    if (result.isConfirmed) {
      onDelete(m.id)
    }
  }

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!dropdownRef.current) return
    
    const menu = dropdownRef.current.querySelector('.hs-dropdown-menu') as HTMLElement
    const button = dropdownRef.current.querySelector('button') as HTMLElement
    if (!menu || !button) return

    const isHidden = menu.classList.contains('hidden')
    
    // Close all other dropdowns
    document.querySelectorAll('.hs-dropdown-menu').forEach((otherMenu) => {
      if (otherMenu !== menu) {
        const otherMenuEl = otherMenu as HTMLElement
        otherMenuEl.classList.add('hidden')
        otherMenuEl.style.cssText = 'opacity: 0 !important; pointer-events: none !important; display: none !important;'
        const otherButton = otherMenuEl.closest('.hs-dropdown')?.querySelector('button')
        if (otherButton) {
          otherButton.setAttribute('aria-expanded', 'false')
        }
      }
    })
    
    // Toggle current dropdown
    if (isHidden) {
      menu.classList.remove('hidden')
      menu.style.cssText = 'opacity: 1 !important; pointer-events: auto !important; display: block !important;'
      button.setAttribute('aria-expanded', 'true')
    } else {
      menu.classList.add('hidden')
      menu.style.cssText = 'opacity: 0 !important; pointer-events: none !important; display: none !important;'
      button.setAttribute('aria-expanded', 'false')
    }
  }

  const closeDropdown = () => {
    if (!dropdownRef.current) return
    const menu = dropdownRef.current.querySelector('.hs-dropdown-menu') as HTMLElement
    const button = dropdownRef.current.querySelector('button') as HTMLElement
    if (menu) {
      menu.classList.add('hidden')
      menu.style.cssText = 'opacity: 0 !important; pointer-events: none !important; display: none !important;'
    }
    if (button) {
      button.setAttribute('aria-expanded', 'false')
    }
  }

  const handleView = () => {
    closeDropdown()
    onView(m.id)
  }

  const statusBusy = statusUpdatingId === m.id
  const currentStatus = (['draft', 'published', 'archived'] as const).includes(m.status as ModuleLifecycleStatus)
    ? (m.status as ModuleLifecycleStatus)
    : 'draft'

  const handleSetStatus = (next: ModuleLifecycleStatus) => {
    if (statusBusy) return
    closeDropdown()
    onSetStatus(m.id, next)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const menu = dropdownRef.current.querySelector('.hs-dropdown-menu') as HTMLElement
        const button = dropdownRef.current.querySelector('button') as HTMLElement
        if (menu) {
          menu.classList.add('hidden')
          menu.style.cssText = 'opacity: 0 !important; pointer-events: none !important; display: none !important;'
          if (button) {
            button.setAttribute('aria-expanded', 'false')
          }
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="box custom-box overflow-visible">
      <div className="relative h-36 overflow-hidden bg-defaultborder rounded-t-md">
        <img
          src={coverImageUrl}
          alt={m.moduleName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/images/media/team-covers/1.jpg'
          }}
        />
        {onToggleSelect && (
          <label
            className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 rounded bg-white/90 dark:bg-black/60 border border-defaultborder cursor-pointer shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              className="form-check-input !m-0 !w-4 !h-4 cursor-pointer"
              checked={!!selected}
              onChange={() => onToggleSelect(m.id)}
            />
          </label>
        )}
        <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
          m.status === 'published' 
            ? 'bg-success/20 text-success' 
            : m.status === 'draft'
            ? 'bg-warning/20 text-warning'
            : 'bg-danger/20 text-danger'
        }`}>
          {m.status}
        </span>
      </div>
      <div className="box-header items-center !flex pt-3 gap-2 overflow-visible">
        <div className="flex-1 min-w-0 overflow-hidden">
          <button
            type="button"
            onClick={handleView}
            className="font-semibold text-[.875rem] block w-full text-start hover:text-primary truncate"
            title={m.moduleName}
          >
            {m.moduleName}
          </button>
          <span className="text-[#8c9097] dark:text-white/50 block text-[0.75rem]">
            <strong className="text-defaulttextcolor">{m.students?.length || 0}</strong> students enrolled
          </span>
        </div>
        <div className="hs-dropdown ti-dropdown shrink-0" ref={dropdownRef}>
          <button
            type="button"
            id={`dropdown-menu-${m.id}`}
            className="ti-btn ti-btn-sm ti-btn-light !mb-0"
            aria-expanded="false"
            onClick={toggleDropdown}
          >
            <i className="fe fe-more-vertical" />
          </button>
          <ul 
            className="hs-dropdown-menu ti-dropdown-menu hidden absolute right-0 top-full mt-1 z-[100] min-w-[160px] bg-bodybg border border-defaultborder rounded-md shadow-lg"
            aria-labelledby={`dropdown-menu-${m.id}`}
          >
            <li>
              <button type="button" className="ti-dropdown-item w-full text-left" onClick={handleView}>
                <i className="ri-eye-line align-middle me-1 inline-flex" /> View
              </button>
            </li>
            <li>
              <Link className="ti-dropdown-item" href={`/training/curriculum/modules/edit?id=${m.id}`}>
                <i className="ri-edit-line align-middle me-1 inline-flex" /> Edit
              </Link>
            </li>
            <li>
              <button
                type="button"
                className="ti-dropdown-item w-full text-left"
                onClick={() => { closeDropdown(); onClone(m.id); }}
              >
                <i className="ri-file-copy-line me-1 align-middle inline-flex" /> Clone
              </button>
            </li>
            <li>
              <button
                type="button"
                className="ti-dropdown-item w-full text-left disabled:opacity-50 disabled:pointer-events-none"
                disabled={statusBusy || currentStatus === 'published'}
                onClick={() => handleSetStatus('published')}
              >
                <i className="ri-send-plane-2-line me-1 align-middle inline-flex" /> Publish
              </button>
            </li>
            <li>
              <button
                type="button"
                className="ti-dropdown-item w-full text-left disabled:opacity-50 disabled:pointer-events-none"
                disabled={statusBusy || currentStatus === 'draft'}
                onClick={() => handleSetStatus('draft')}
              >
                <i className="ri-file-edit-line me-1 align-middle inline-flex" /> Draft
              </button>
            </li>
            <li>
              <button
                type="button"
                className="ti-dropdown-item w-full text-left disabled:opacity-50 disabled:pointer-events-none"
                disabled={statusBusy || currentStatus === 'archived'}
                onClick={() => handleSetStatus('archived')}
              >
                <i className="ri-archive-2-line me-1 align-middle inline-flex" /> Archive
              </button>
            </li>
            <li>
              <button
                type="button"
                className="ti-dropdown-item w-full text-left"
                onClick={() => {
                  closeDropdown()
                  onAssignFolders(m.id)
                }}
              >
                <i className="ri-folder-transfer-line me-1 align-middle inline-flex" /> Move to folder(s)
              </button>
            </li>
            <li>
              <button
                type="button"
                className="ti-dropdown-item w-full text-left"
                onClick={handleDelete}
              >
                <i className="ri-delete-bin-line me-1 align-middle inline-flex" /> Delete
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="box-body py-2">
        <SummaryBadges summary={summary} />
        <p className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] mb-3 line-clamp-2">
          {m.shortDescription}
        </p>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-semibold mb-1 text-[0.75rem]">Mentors :</div>
            <div className="avatar-list-stacked">
              {m.mentorsAssigned && m.mentorsAssigned.length > 0 ? (
                m.mentorsAssigned.slice(0, 3).map((mentor) => (
                  <span key={mentor.id} className="avatar avatar-sm avatar-rounded">
                    <span className="avatar-initial bg-primary text-white text-xs">
                      {mentor.user?.name?.charAt(0) || 'M'}
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#8c9097] dark:text-white/50">No mentors assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TrainingFolderRow {
  id: string
  name: string
  modules: ApiTrainingModule[]
  isUncategorized?: boolean
}

const TrainingModules = () => {
  const [search, setSearch] = useState('')
  const [sortValue, setSortValue] = useState(SORT_OPTIONS[0])
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [modules, setModules] = useState<ApiTrainingModule[]>([])
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize] = useState(100) // Fetch many modules at once
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedModuleDetail, setSelectedModuleDetail] = useState<ApiTrainingModule | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [assignFoldersModuleId, setAssignFoldersModuleId] = useState<string | null>(null)
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkFolderOpen, setBulkFolderOpen] = useState(false)

  const toggleSelect = useCallback((moduleId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }, [])

  const selectAllInFolder = useCallback((folderModules: ApiTrainingModule[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = folderModules.every((m) => next.has(m.id))
      if (allSelected) {
        folderModules.forEach((m) => next.delete(m.id))
      } else {
        folderModules.forEach((m) => next.add(m.id))
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const fetchModules = useCallback(async () => {
    setLoading(true)
    try {
      const params: trainingModulesApi.ListTrainingModulesParams = {
        page: currentPage,
        limit: pageSize,
        sortBy: sortValue?.value,
        ...(search.trim() && { search: search.trim() }),
      }
      
      const response = await trainingModulesApi.listTrainingModules(params)
      setModules(response.results)
      setTotalPages(response.totalPages)
    } catch (err) {
      console.error('Error fetching modules:', err)
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to load modules.'
      await Swal.fire({
        icon: 'error',
        title: 'Failed to load modules',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      setModules([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, sortValue, search])

  const handleBulkStatus = useCallback(async (status: ModuleLifecycleStatus) => {
    if (selectedIds.size === 0) return
    const confirmResult = await Swal.fire({
      title: `${status.charAt(0).toUpperCase() + status.slice(1)} ${selectedIds.size} module(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Yes, ${status}`,
    })
    if (!confirmResult.isConfirmed) return

    setBulkBusy(true)
    let success = 0
    let fail = 0
    for (const id of selectedIds) {
      try {
        await trainingModulesApi.updateTrainingModule(id, { status })
        success++
      } catch {
        fail++
      }
    }
    setBulkBusy(false)
    clearSelection()
    fetchModules()
    await Swal.fire({
      icon: fail > 0 ? 'warning' : 'success',
      title: `${success} updated${fail > 0 ? `, ${fail} failed` : ''}`,
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
    })
  }, [selectedIds, clearSelection, fetchModules])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    const confirmResult = await Swal.fire({
      title: `Delete ${selectedIds.size} module(s)?`,
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Yes, delete all',
    })
    if (!confirmResult.isConfirmed) return

    setBulkBusy(true)
    let success = 0
    let fail = 0
    for (const id of selectedIds) {
      try {
        await trainingModulesApi.deleteTrainingModule(id)
        success++
      } catch {
        fail++
      }
    }
    setBulkBusy(false)
    clearSelection()
    fetchModules()
    await Swal.fire({
      icon: fail > 0 ? 'warning' : 'success',
      title: `${success} deleted${fail > 0 ? `, ${fail} failed` : ''}`,
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
    })
  }, [selectedIds, clearSelection, fetchModules])

  const handleBulkFolderSave = useCallback(async (categoryIds: string[]) => {
    if (selectedIds.size === 0) return
    setBulkBusy(true)
    let success = 0
    let fail = 0
    for (const id of selectedIds) {
      try {
        await trainingModulesApi.setTrainingModuleFolders(id, categoryIds)
        success++
      } catch {
        fail++
      }
    }
    setBulkBusy(false)
    clearSelection()
    setBulkFolderOpen(false)
    fetchModules()
    await Swal.fire({
      icon: fail > 0 ? 'warning' : 'success',
      title: `${success} moved${fail > 0 ? `, ${fail} failed` : ''}`,
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
    })
  }, [selectedIds, clearSelection, fetchModules])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoriesApi.listCategories({ limit: 100 })
      setCategories(response.results)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  const router = useRouter()

  const handleClone = async (moduleId: string) => {
    try {
      const cloned = await trainingModulesApi.cloneModule(moduleId)
      await Swal.fire('Cloned!', 'Module cloned as draft.', 'success')
      router.push(`/training/curriculum/modules/edit?id=${cloned.id}`)
    } catch (err) {
      const msg = err instanceof AxiosError && err.response?.data?.message ? String(err.response.data.message) : 'Failed to clone module.'
      await Swal.fire({ icon: 'error', title: 'Clone failed', text: msg, toast: true, position: 'top-end', timer: 4000, showConfirmButton: false })
    }
  }

  const handleSetModuleStatus = useCallback(
    async (moduleId: string, status: ModuleLifecycleStatus) => {
      setStatusUpdatingId(moduleId)
      try {
        const updated = await trainingModulesApi.updateTrainingModule(moduleId, { status })
        setSelectedModuleDetail((prev) =>
          prev?.id === moduleId ? { ...prev, status: updated.status } : prev,
        )
        await Swal.fire({
          icon: 'success',
          title: 'Status updated',
          text: `Module is now ${status}.`,
          toast: true,
          position: 'top-end',
          timer: 2500,
          showConfirmButton: false,
          timerProgressBar: true,
        })
        fetchModules()
      } catch (err) {
        const msg =
          err instanceof AxiosError && err.response?.data?.message
            ? String(err.response.data.message)
            : 'Failed to update module status.'
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
        setStatusUpdatingId(null)
      }
    },
    [fetchModules],
  )

  const handleDelete = async (moduleId: string) => {
    try {
      await trainingModulesApi.deleteTrainingModule(moduleId)
      await Swal.fire({
        icon: 'success',
        title: 'Module deleted',
        text: 'The module has been deleted successfully.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      fetchModules()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete module.'
      await Swal.fire({
        icon: 'error',
        title: 'Delete failed',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    }
  }

  const handleView = useCallback(async (moduleId: string) => {
    setDetailModalOpen(true)
    setDetailLoading(true)
    setDetailError(null)
    setSelectedModuleDetail(null)

    try {
      const moduleData = await trainingModulesApi.getTrainingModule(moduleId)
      setSelectedModuleDetail(moduleData)
    } catch (err) {
      console.error('Error fetching module detail:', err)
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
            ? err.message
            : 'Failed to load module details.'
      setDetailError(msg)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetailModal = useCallback(() => {
    setDetailModalOpen(false)
  }, [])

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const categorySelectOptions = useMemo<CategorySelectOption[]>(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  )

  const assignFoldersModule =
    assignFoldersModuleId != null ? modules.find((m) => m.id === assignFoldersModuleId) ?? null : null

  // One row per folder (category), plus optional "Uncategorized" for modules with no folder
  const folderRows = useMemo((): TrainingFolderRow[] => {
    const sortModules = (a: ApiTrainingModule, b: ApiTrainingModule) => {
      switch (sortValue?.value) {
        case 'moduleName:desc':
          return b.moduleName.localeCompare(a.moduleName)
        case 'moduleName:asc':
          return a.moduleName.localeCompare(b.moduleName)
        case 'createdAt:desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'createdAt:asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        default:
          return 0
      }
    }
    const sortedCats = [...categories].sort((a, b) => a.name.localeCompare(b.name))
    const rows: TrainingFolderRow[] = sortedCats.map((cat) => ({
      id: cat.id,
      name: cat.name,
      modules: modules
        .filter((m) => m.categories?.some((c) => c.id === cat.id))
        .sort(sortModules),
    }))
    const uncategorized = modules.filter((m) => !m.categories?.length).sort(sortModules)
    if (uncategorized.length > 0) {
      rows.push({
        id: UNCATEGORIZED_FOLDER_ID,
        name: 'Uncategorized',
        modules: uncategorized,
        isUncategorized: true,
      })
    }
    return rows
  }, [modules, categories, sortValue])

  const handleCreateFolder = async () => {
    const name = newFolderName.trim()
    if (!name) return
    setCreatingFolder(true)
    try {
      await categoriesApi.createCategory({ name })
      setNewFolderName('')
      setNewFolderOpen(false)
      await fetchCategories()
      await Swal.fire({
        icon: 'success',
        title: 'Folder created',
        text: `You can assign modules to "${name}" from the menu on each card or when editing a module.`,
        toast: true,
        position: 'top-end',
        timer: 3500,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to create folder.'
      await Swal.fire({
        icon: 'error',
        title: 'Could not create folder',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
      })
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleSaveFolderAssignment = async (categoryIds: string[]) => {
    const mod = assignFoldersModule
    if (!mod) return
    try {
      await trainingModulesApi.setTrainingModuleFolders(mod.id, categoryIds)
      await Swal.fire({
        icon: 'success',
        title: 'Folders updated',
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
        timerProgressBar: true,
      })
      fetchModules()
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to update folders.'
      await Swal.fire({
        icon: 'error',
        title: 'Update failed',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
      })
      throw err
    }
  }

  useEffect(() => {
    if (!detailModalOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetailModal()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [detailModalOpen, closeDetailModal])

  return (
    <Fragment>
      <Seo title="Training Modules" />
      <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-body p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex flex-wrap gap-1 newproject">
                  <Link
                    href="/training/curriculum/modules/create"
                    className="ti-btn ti-btn-primary-full me-2 !mb-0"
                  >
                    <i className="ri-add-line me-1 font-semibold align-middle" />
                    New Module
                  </Link>
                  <Link
                    href="/training/curriculum/modules/create-with-ai"
                    className="ti-btn ti-btn-success-full me-2 !mb-0"
                  >
                    <i className="ri-magic-line me-1 font-semibold align-middle" />
                    Create with AI
                  </Link>
                  <button
                    type="button"
                    className="ti-btn ti-btn-light me-2 !mb-0"
                    onClick={() => {
                      setNewFolderName('')
                      setNewFolderOpen(true)
                    }}
                  >
                    <i className="ri-folder-add-line me-1 font-semibold align-middle" />
                    New folder
                  </button>
                  <Link
                    href="/training/curriculum/categories"
                    className="ti-btn ti-btn-light me-2 !mb-0"
                  >
                    <i className="ri-settings-3-line me-1 font-semibold align-middle" />
                    Manage folders
                  </Link>
                  <Select
                    value={sortValue}
                    onChange={(v) => {
                      const option = v as { value: string; label: string } | null
                      if (option) setSortValue(option)
                    }}
                    options={SORT_OPTIONS}
                    className="!w-40"
                    menuPlacement="auto"
                    classNamePrefix="Select2"
                    placeholder="Sort By"
                  />
                </div>
                <div className="flex" role="search">
                  <input
                    className="form-control me-2"
                    type="search"
                    placeholder="Search modules"
                    aria-label="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button className="ti-btn ti-btn-light !mb-0" type="button">
                    Search
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 

      {selectedIds.size > 0 && (
        <div
          className="sticky top-0 z-[60] mb-5"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
            borderRadius: '0.75rem',
            boxShadow: '0 8px 32px rgba(79, 70, 229, 0.3), 0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Left: selection info */}
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-lg font-bold text-indigo-700 text-[0.9375rem]"
                  style={{
                    width: '2.25rem',
                    height: '2.25rem',
                    background: 'rgba(255,255,255,0.92)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  }}
                >
                  {selectedIds.size}
                </div>
                <div>
                  <span className="text-white font-semibold text-[0.9375rem] leading-tight block">
                    {selectedIds.size === 1 ? '1 module' : `${selectedIds.size} modules`} selected
                  </span>
                  <button
                    type="button"
                    className="text-white/70 hover:text-white text-[0.75rem] underline underline-offset-2 transition-colors leading-tight"
                    onClick={clearSelection}
                  >
                    Clear selection
                  </button>
                </div>
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.8125rem] font-medium transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    color: '#fff',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
                  disabled={bulkBusy}
                  onClick={() => handleBulkStatus('published')}
                >
                  <i className="ri-send-plane-2-line text-[0.875rem]" />
                  Publish
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.8125rem] font-medium transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    color: '#fff',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
                  disabled={bulkBusy}
                  onClick={() => handleBulkStatus('draft')}
                >
                  <i className="ri-file-edit-line text-[0.875rem]" />
                  Draft
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.8125rem] font-medium transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    color: '#fff',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
                  disabled={bulkBusy}
                  onClick={() => handleBulkStatus('archived')}
                >
                  <i className="ri-archive-2-line text-[0.875rem]" />
                  Archive
                </button>

                <div className="w-px h-6 mx-1" style={{ background: 'rgba(255,255,255,0.25)' }} />

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.8125rem] font-medium transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    color: '#fff',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)' }}
                  disabled={bulkBusy}
                  onClick={() => setBulkFolderOpen(true)}
                >
                  <i className="ri-folder-transfer-line text-[0.875rem]" />
                  Move to folder
                </button>

                <div className="w-px h-6 mx-1" style={{ background: 'rgba(255,255,255,0.25)' }} />

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[0.8125rem] font-medium transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(239, 68, 68, 0.85)',
                    color: '#fff',
                    border: '1px solid rgba(239, 68, 68, 0.5)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)' }}
                  disabled={bulkBusy}
                  onClick={handleBulkDelete}
                >
                  <i className="ri-delete-bin-line text-[0.875rem]" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="box custom-box text-center py-12">
          <p className="text-[#8c9097] dark:text-white/50 mb-0">Loading modules...</p>
        </div>
      ) : search.trim() && modules.length === 0 ? (
        <div className="box custom-box text-center py-12">
          <p className="text-[#8c9097] dark:text-white/50 mb-0">No modules match your search.</p>
        </div>
      ) : !search.trim() && modules.length === 0 && categories.length === 0 ? (
        <div className="box custom-box text-center py-12">
          <p className="text-[#8c9097] dark:text-white/50 mb-0">
            No modules yet. Create a folder (optional) and add your first module to get started.
          </p>
        </div>
      ) : (
        folderRows.map((folder) => {
          const isCollapsed = collapsedCategoryIds.has(folder.id)
          const allInFolderSelected = folder.modules.length > 0 && folder.modules.every((m) => selectedIds.has(m.id))
          return (
            <div key={folder.id} className="mb-6">
              <div className="flex items-center gap-2">
                {folder.modules.length > 0 && (
                  <label
                    className="flex items-center justify-center w-6 h-6 cursor-pointer shrink-0"
                    title={allInFolderSelected ? 'Deselect all in folder' : 'Select all in folder'}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="form-check-input !m-0 !w-4 !h-4 cursor-pointer"
                      checked={allInFolderSelected}
                      onChange={() => selectAllInFolder(folder.modules)}
                    />
                  </label>
                )}
                <button
                  type="button"
                  onClick={() => toggleCategory(folder.id)}
                  className="flex items-center gap-2 flex-1 text-left py-2 px-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  aria-expanded={!isCollapsed}
                >
                  <i
                    className={`text-defaulttextcolor text-lg ${isCollapsed ? 'ri-add-line' : 'ri-subtract-line'}`}
                    aria-hidden
                  />
                  <i
                    className={`text-lg ${folder.isUncategorized ? 'ri-inbox-line text-[#8c9097]' : 'ri-folder-2-line text-primary'}`}
                    aria-hidden
                  />
                  <h2 className="text-lg font-semibold text-defaulttextcolor">{folder.name}</h2>
                  <span className="text-[#8c9097] dark:text-white/50 text-sm ml-1">
                    ({folder.modules.length} module{folder.modules.length !== 1 ? 's' : ''})
                  </span>
                </button>
              </div>
              {!isCollapsed && (
                <>
                  {folder.modules.length === 0 ? (
                    <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mt-2 ms-8 mb-0">
                      {folder.isUncategorized
                        ? 'All modules are assigned to a folder.'
                        : 'No modules in this folder yet. Use “Move to folder(s)” on a module or assign folders when editing.'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-12 gap-x-6 gap-y-6 mt-2">
                      {folder.modules.map((m) => (
                        <div
                          key={m.id}
                          className="xxl:col-span-3 xl:col-span-4 md:col-span-6 col-span-12"
                        >
                          <TrainingModuleCard
                            module={m}
                            onDelete={handleDelete}
                            onView={handleView}
                            onClone={handleClone}
                            onAssignFolders={(id) => setAssignFoldersModuleId(id)}
                            onSetStatus={handleSetModuleStatus}
                            statusUpdatingId={statusUpdatingId}
                            selected={selectedIds.has(m.id)}
                            onToggleSelect={toggleSelect}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })
      )}

      {totalPages > 1 && (
        <nav aria-label="Page navigation">
          <ul className="ti-pagination ltr:float-right rtl:float-left mb-4">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link px-3 py-[0.375rem]"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                <button
                  className="page-link px-3 py-[0.375rem]"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              </li>
            ))}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button
                className="page-link px-3 py-[0.375rem]"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

      <ModuleDetailModal
        open={detailModalOpen}
        moduleData={selectedModuleDetail}
        loading={detailLoading}
        error={detailError}
        onClose={closeDetailModal}
      />

      <NewFolderModal
        open={newFolderOpen}
        folderName={newFolderName}
        onFolderNameChange={setNewFolderName}
        creating={creatingFolder}
        onClose={() => {
          if (!creatingFolder) {
            setNewFolderOpen(false)
            setNewFolderName('')
          }
        }}
        onSubmit={handleCreateFolder}
      />

      <AssignFoldersModal
        open={assignFoldersModuleId !== null && assignFoldersModule !== null}
        module={assignFoldersModule}
        categoryOptions={categorySelectOptions}
        onClose={() => setAssignFoldersModuleId(null)}
        onSave={handleSaveFolderAssignment}
      />

      <BulkAssignFoldersModal
        open={bulkFolderOpen}
        count={selectedIds.size}
        categoryOptions={categorySelectOptions}
        onClose={() => setBulkFolderOpen(false)}
        onSave={handleBulkFolderSave}
        busy={bulkBusy}
      />
    </Fragment>
  )
}

export default TrainingModules
