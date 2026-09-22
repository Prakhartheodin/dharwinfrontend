"use client"

import Seo from '@/shared/layout-components/seo/seo'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import React, { Fragment, Suspense, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import Swal from 'sweetalert2'
import * as trainingModulesApi from '@/shared/lib/api/training-modules'
import * as categoriesApi from '@/shared/lib/api/categories'
import type { TrainingModule as ApiTrainingModule, PlaylistItem } from '@/shared/lib/api/training-modules'
import type { Category as ApiCategory } from '@/shared/lib/api/categories'
import type { MultiValue } from 'react-select'
import { sanitizeRichHtml } from '@/shared/lib/sanitize-html'
import { usePmReactSelectStyles } from '@/shared/hooks/usePmReactSelectStyles'
import { mapTrainingModuleError } from '@/shared/lib/training/map-training-module-error'
import { groupTrainingModulesIntoFolders } from '@/shared/lib/training/group-modules-into-folders'
import { type ModuleLifecycleStatus } from './_components/ModuleStatusBadge'
import { ModulesBulkActionsBar } from './_components/ModulesBulkActionsBar'
import { ModulesFolderCardGrid } from './_components/ModulesFolderCardGrid'
import { ModulesListEmptyState } from './_components/ModulesListEmptyState'
import { ModulesListSkeleton } from './_components/ModulesListSkeleton'
import { ModulesListToolbar } from './_components/ModulesListToolbar'
import { parseModulesListStatus } from './_lib/parseModulesListStatus'
import {
  DEFAULT_MODULES_SORT,
  MODULES_PAGE_SIZE_OPTIONS,
  MODULES_SORT_OPTIONS,
  areModulesListQueryStringsEquivalent,
  buildModulesListHref,
  modulesStateAfterFilterChange,
  parseModulesListState,
  toModulesApiSortBy,
  type ModulesSortValue,
} from './_lib/modules-list-query'
import { collectRemainingPages } from './_lib/fetchPagedResults'
import {
  fulfilledIds,
  patchModuleInList,
  patchModulesInList,
  removeModuleFromList,
  removeModulesFromList,
  replaceModuleInList,
} from './_lib/mutateModulesCatalog'
import {
  resolvedModuleCategories,
  statusWhenLeavingArchive,
} from './_lib/leaveArchiveOnFolderMove'

const Select = dynamic(() => import('react-select'), { ssr: false })

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
  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } =
    usePmReactSelectStyles()
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
    } catch (err) {
      console.error('Failed to save folder assignment', err)
      /* parent also shows error via Swal */
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
            menuPortalTarget={selectMenuPortalTarget}
            styles={selectMenuLayerStyles}
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
  const { menuPortalTarget: selectMenuPortalTarget, styles: selectMenuLayerStyles } =
    usePmReactSelectStyles()
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
            menuPortalTarget={selectMenuPortalTarget}
            styles={selectMenuLayerStyles}
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

const SORT_OPTIONS = [...MODULES_SORT_OPTIONS]

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
                                    dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(item.blogContent) }}
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

const TrainingModules = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const listState = useMemo(() => parseModulesListState(searchParams), [searchParams])
  const statusFilter = listState.status
  const sortValue = useMemo(
    () => SORT_OPTIONS.find((o) => o.value === listState.sortBy) ?? SORT_OPTIONS[0],
    [listState.sortBy]
  )

  const [searchDraft, setSearchDraft] = useState(listState.search)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modules, setModules] = useState<ApiTrainingModule[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [categories, setCategories] = useState<ApiCategory[]>([])
  const [lifecycleCounts, setLifecycleCounts] = useState({
    all: 0,
    draft: 0,
    published: 0,
    archived: 0,
  })
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
  /** Shut folder cards. Held here so the toolbar's collapse-all can drive every card. */
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkFolderOpen, setBulkFolderOpen] = useState(false)

  const fetchRequestIdRef = useRef(0)
  const hasLoadedOnceRef = useRef(false)
  const searchDebounceRef = useRef<number | null>(null)

  const replaceListUrl = useCallback(
    (next: ReturnType<typeof parseModulesListState>, historyMode: 'replace' | 'push') => {
      const href = buildModulesListHref(pathname, next)
      const currentQs = searchParams.toString()
      const nextQs = href.includes('?') ? href.slice(href.indexOf('?') + 1) : ''
      if (areModulesListQueryStringsEquivalent(currentQs, nextQs)) return
      if (historyMode === 'replace') router.replace(href, { scroll: false })
      else router.push(href, { scroll: false })
    },
    [pathname, router, searchParams]
  )

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

  const fetchLifecycleCounts = useCallback(async () => {
    try {
      const [draft, published, archived] = await Promise.all([
        trainingModulesApi.listTrainingModules({ page: 1, limit: 1, status: 'draft' }),
        trainingModulesApi.listTrainingModules({ page: 1, limit: 1, status: 'published' }),
        trainingModulesApi.listTrainingModules({ page: 1, limit: 1, status: 'archived' }),
      ])
      const draftTotal = draft.totalResults ?? 0
      const publishedTotal = published.totalResults ?? 0
      const archivedTotal = archived.totalResults ?? 0
      setLifecycleCounts({
        all: draftTotal + publishedTotal,
        draft: draftTotal,
        published: publishedTotal,
        archived: archivedTotal,
      })
    } catch {
      /* counts are decorative; list still works */
    }
  }, [])

  /**
   * Loads one server page for the current URL contract. Does not walk all pages.
   */
  const fetchModules = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current
    const isFirst = !hasLoadedOnceRef.current
    if (isFirst) setInitialLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const params: trainingModulesApi.ListTrainingModulesParams = {
        page: listState.page,
        limit: listState.limit,
        sortBy: toModulesApiSortBy(listState.sortBy),
      }
      if (listState.search.trim()) params.search = listState.search.trim()
      if (listState.status === 'all') {
        params.status = 'active'
      } else {
        params.status = listState.status
      }

      const response = await trainingModulesApi.listTrainingModules(params)
      if (requestId !== fetchRequestIdRef.current) return
      setModules(response.results ?? [])
      setTotalResults(response.totalResults ?? 0)
      setTotalPages(Math.max(1, response.totalPages ?? 1))
      hasLoadedOnceRef.current = true
    } catch (err) {
      if (requestId !== fetchRequestIdRef.current) return
      console.error('Error fetching modules:', err)
      const msg = mapTrainingModuleError(err, 'Failed to load modules.')
      setLoadError(msg)
      if (!hasLoadedOnceRef.current) {
        setModules([])
        setTotalResults(0)
      }
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
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setInitialLoading(false)
        setRefreshing(false)
      }
    }
  }, [listState.page, listState.limit, listState.search, listState.status, listState.sortBy])

  const commitPageModules = useCallback((next: ApiTrainingModule[]) => {
    setModules(next)
  }, [])

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
    const ids = Array.from(selectedIds)
    const results = await Promise.allSettled(
      ids.map((id) => trainingModulesApi.updateTrainingModule(id, { status })),
    )
    const ok = fulfilledIds(ids, results)
    if (ok.size > 0) commitPageModules(patchModulesInList(modules, ok, { status }))
    const success = ok.size
    const fail = results.length - success
    setBulkBusy(false)
    clearSelection()
    void fetchLifecycleCounts()
    void Swal.fire({
      icon: fail > 0 ? 'warning' : 'success',
      title: `${success} updated${fail > 0 ? `, ${fail} failed` : ''}`,
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
    })
  }, [selectedIds, clearSelection, commitPageModules, modules, fetchLifecycleCounts])

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
    const ids = Array.from(selectedIds)
    const results = await Promise.allSettled(
      ids.map((id) => trainingModulesApi.deleteTrainingModule(id)),
    )
    const ok = fulfilledIds(ids, results)
    if (ok.size > 0) {
      commitPageModules(removeModulesFromList(modules, ok))
      void fetchModules()
      void fetchLifecycleCounts()
    }
    const success = ok.size
    const fail = results.length - success
    setBulkBusy(false)
    clearSelection()
    void Swal.fire({
      icon: fail > 0 ? 'warning' : 'success',
      title: `${success} deleted${fail > 0 ? `, ${fail} failed` : ''}`,
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
    })
  }, [selectedIds, clearSelection, commitPageModules, modules, fetchModules, fetchLifecycleCounts])

  const handleBulkFolderSave = useCallback(async (categoryIds: string[]) => {
    if (selectedIds.size === 0) return
    setBulkBusy(true)
    const ids = Array.from(selectedIds)
    const cats = categoryIds.map((id) => {
      const match = categories.find((c) => c.id === id)
      return { id, name: match?.name ?? id }
    })
    const results = await Promise.allSettled(
      ids.map((id) => {
        const current = modules.find((m) => m.id === id)
        const leaveArchive = statusWhenLeavingArchive(current?.status)
        return trainingModulesApi.setTrainingModuleFolders(
          id,
          categoryIds,
          leaveArchive ? { status: leaveArchive } : undefined,
        )
      }),
    )
    let next = modules
    results.forEach((result, index) => {
      const id = ids[index]
      if (!id || result.status !== 'fulfilled') return
      const previous = modules.find((m) => m.id === id)
      const leaveArchive = statusWhenLeavingArchive(previous?.status)
      next = replaceModuleInList(next, id, {
        ...result.value,
        categories: resolvedModuleCategories(result.value, cats),
        status: result.value.status ?? leaveArchive ?? previous?.status ?? result.value.status,
      })
    })
    if (next !== modules) commitPageModules(next)
    if (statusFilter === 'archived' && results.some((r) => r.status === 'fulfilled')) {
      replaceListUrl(modulesStateAfterFilterChange(listState, { status: 'published' }), 'replace')
    }
    const success = results.filter((r) => r.status === 'fulfilled').length
    const fail = results.length - success
    setBulkBusy(false)
    clearSelection()
    setBulkFolderOpen(false)
    void fetchLifecycleCounts()
    void Swal.fire({
      icon: fail > 0 ? 'warning' : 'success',
      title: `${success} moved${fail > 0 ? `, ${fail} failed` : ''}`,
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false,
      timerProgressBar: true,
    })
  }, [selectedIds, clearSelection, commitPageModules, categories, statusFilter, modules, listState, replaceListUrl, fetchLifecycleCounts])

  const fetchCategories = useCallback(async () => {
    try {
      const first = await categoriesApi.listCategories({ limit: 200, page: 1 })
      const all = await collectRemainingPages(
        first,
        (page) => categoriesApi.listCategories({ limit: 200, page }),
        () => false
      )
      setCategories(all)
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    void fetchModules()
    return () => {
      fetchRequestIdRef.current += 1
    }
  }, [fetchModules])

  useEffect(() => {
    void fetchLifecycleCounts()
  }, [fetchLifecycleCounts])

  useEffect(() => {
    setSearchDraft(listState.search)
  }, [listState.search])

  // Debounce search draft → URL (replace).
  useEffect(() => {
    if (searchDraft === listState.search) return
    if (searchDebounceRef.current != null) window.clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = window.setTimeout(() => {
      searchDebounceRef.current = null
      replaceListUrl(modulesStateAfterFilterChange(listState, { search: searchDraft }), 'replace')
    }, 350)
    return () => {
      if (searchDebounceRef.current != null) window.clearTimeout(searchDebounceRef.current)
    }
  }, [searchDraft, listState, replaceListUrl])

  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchDraft(e.target.value)
  }, [])

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      if (searchDebounceRef.current != null) {
        window.clearTimeout(searchDebounceRef.current)
        searchDebounceRef.current = null
      }
      replaceListUrl(modulesStateAfterFilterChange(listState, { search: searchDraft }), 'push')
    },
    [searchDraft, listState, replaceListUrl]
  )

  const handleStatusFilterChange = useCallback(
    (next: ReturnType<typeof parseModulesListStatus>) => {
      replaceListUrl(modulesStateAfterFilterChange(listState, { status: next }), 'push')
    },
    [listState, replaceListUrl]
  )

  const handleSortChange = useCallback(
    (option: { value: string; label: string }) => {
      const allowed = new Set(MODULES_SORT_OPTIONS.map((o) => o.value))
      const sortBy = (allowed.has(option.value as ModulesSortValue)
        ? option.value
        : DEFAULT_MODULES_SORT) as ModulesSortValue
      replaceListUrl(modulesStateAfterFilterChange(listState, { sortBy }), 'push')
    },
    [listState, replaceListUrl]
  )

  const handleClone = useCallback(async (moduleId: string) => {
    try {
      const cloned = await trainingModulesApi.cloneModule(moduleId)
      await Swal.fire('Cloned!', 'Module cloned as draft.', 'success')
      router.push(`/training/curriculum/modules/edit?id=${cloned.id}`)
    } catch (err) {
      const msg = mapTrainingModuleError(err, 'Failed to clone module.')
      await Swal.fire({ icon: 'error', title: 'Clone failed', text: msg, toast: true, position: 'top-end', timer: 4000, showConfirmButton: false })
    }
  }, [router])

  const handleSetModuleStatus = useCallback(
    async (moduleId: string, status: ModuleLifecycleStatus) => {
      setStatusUpdatingId(moduleId)
      try {
        const updated = await trainingModulesApi.updateTrainingModule(moduleId, { status })
        const nextStatus = updated.status ?? status
        commitPageModules(
          patchModuleInList(modules, moduleId, {
            status: nextStatus,
          }),
        )
        setSelectedModuleDetail((prev) =>
          prev?.id === moduleId ? { ...prev, status: nextStatus } : prev,
        )
        if (statusFilter === 'archived' && nextStatus !== 'archived') {
          replaceListUrl(
            modulesStateAfterFilterChange(listState, {
              status: nextStatus === 'draft' ? 'draft' : 'published',
            }),
            'replace'
          )
        }
        void fetchLifecycleCounts()
        void Swal.fire({
          icon: 'success',
          title: 'Status updated',
          text: `Module is now ${nextStatus}.`,
          toast: true,
          position: 'top-end',
          timer: 2500,
          showConfirmButton: false,
          timerProgressBar: true,
        })
      } catch (err) {
        const msg = mapTrainingModuleError(err, 'Failed to update module status.')
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
    [commitPageModules, statusFilter, modules, listState, replaceListUrl, fetchLifecycleCounts],
  )

  const handleDelete = useCallback(async (moduleId: string) => {
    try {
      await trainingModulesApi.deleteTrainingModule(moduleId)
      commitPageModules(removeModuleFromList(modules, moduleId))
      setSelectedIds((prev) => {
        if (!prev.has(moduleId)) return prev
        const next = new Set(prev)
        next.delete(moduleId)
        return next
      })
      void fetchModules()
      void fetchLifecycleCounts()
      void Swal.fire({
        icon: 'success',
        title: 'Module deleted',
        text: 'The module has been deleted successfully.',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch (err) {
      const msg = mapTrainingModuleError(err, 'Failed to delete module.')
      await Swal.fire({
        icon: 'error',
        title: 'Delete failed',
        text: msg,
        toast: true,
        position: 'top-end',
        timer: 4000,
        showConfirmButton: false,
      })
    }
  }, [commitPageModules, modules, fetchModules, fetchLifecycleCounts])

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
      const msg = mapTrainingModuleError(err, 'Failed to load module details.')
      setDetailError(msg)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetailModal = useCallback(() => {
    setDetailModalOpen(false)
  }, [])

  const handleAssignFolders = useCallback((id: string) => {
    setAssignFoldersModuleId(id)
  }, [])

  const categorySelectOptions = useMemo<CategorySelectOption[]>(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  )

  const assignFoldersModule =
    assignFoldersModuleId != null ? modules.find((m) => m.id === assignFoldersModuleId) ?? null : null

  const folderRows = useMemo(
    () =>
      groupTrainingModulesIntoFolders(
        modules,
        categories,
        sortValue,
        listState.search.trim().length > 0,
        {
          statusFilter,
          includeEmptyDrafts: false,
          includeArchivedOnAll: false,
          // Paginated module pages: only folders that have modules on this page.
          includeEmptyCategories: false,
        },
      ),
    [modules, categories, sortValue, listState.search, statusFilter],
  )

  const showFolderHeaders = statusFilter === 'all' || statusFilter === 'published'
  const folderIds = useMemo(() => folderRows.map((f) => f.id), [folderRows])
  const allCollapsed =
    folderIds.length > 0 && folderIds.every((id) => collapsedFolderIds.has(id))

  /**
   * Expand all when every folder is shut; otherwise collapse all (partial counts as open).
   */
  const toggleAllFolders = useCallback(() => {
    setCollapsedFolderIds(allCollapsed ? new Set() : new Set(folderIds))
  }, [allCollapsed, folderIds])

  const toggleFolder = useCallback((folderId: string) => {
    setCollapsedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])
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
      const msg = mapTrainingModuleError(err, 'Failed to create folder.')
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
      const leaveArchive = statusWhenLeavingArchive(mod.status)
      const updated = await trainingModulesApi.setTrainingModuleFolders(
        mod.id,
        categoryIds,
        leaveArchive ? { status: leaveArchive } : undefined,
      )
      const cats = categoryIds.map((id) => {
        const match = categories.find((c) => c.id === id)
        return { id, name: match?.name ?? id }
      })
      const nextStatus = updated.status ?? leaveArchive ?? mod.status
      commitPageModules(
        replaceModuleInList(modules, mod.id, {
          ...updated,
          categories: resolvedModuleCategories(updated, cats),
          status: nextStatus,
        }),
      )
      if (statusFilter === 'archived' && nextStatus !== 'archived') {
        replaceListUrl(modulesStateAfterFilterChange(listState, { status: 'published' }), 'replace')
      }
      void fetchLifecycleCounts()
      const folderLabel =
        cats.length > 0 ? cats.map((c) => c.name).join(', ') : 'Uncategorized'
      void Swal.fire({
        icon: 'success',
        title: leaveArchive ? 'Moved out of archive' : 'Folders updated',
        text: `Now in ${folderLabel}.`,
        toast: true,
        position: 'top-end',
        timer: 2500,
        showConfirmButton: false,
        timerProgressBar: true,
      })
    } catch (err) {
      const msg = mapTrainingModuleError(err, 'Failed to update folders.')
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

  const hasActiveFilters =
    Boolean(listState.search.trim()) || listState.status !== 'all'
  const startIndex = totalResults === 0 ? 0 : (listState.page - 1) * listState.limit + 1
  const endIndex = Math.min(listState.page * listState.limit, totalResults)

  const clearFilters = () => {
    setSearchDraft('')
    replaceListUrl(
      modulesStateAfterFilterChange(listState, {
        search: '',
        status: 'all',
        sortBy: DEFAULT_MODULES_SORT,
      }),
      'push'
    )
  }

  return (
    <Fragment>
      <Seo title="Training Modules" />
      <div className="mt-5 grid grid-cols-12 gap-6 sm:mt-6">
        <div className="xl:col-span-12 col-span-12">
          <ModulesListToolbar
            search={searchDraft}
            onSearchChange={handleSearchInputChange}
            onSearchKeyDown={handleSearchKeyDown}
            sortValue={sortValue}
            sortOptions={SORT_OPTIONS}
            onSortChange={handleSortChange}
            statusFilter={statusFilter}
            lifecycleCounts={lifecycleCounts}
            hrefForStatus={(id) =>
              buildModulesListHref(
                pathname,
                modulesStateAfterFilterChange(listState, { status: id })
              )
            }
            onStatusChange={handleStatusFilterChange}
            showFolderHeaders={showFolderHeaders}
            allCollapsed={allCollapsed}
            folderCount={folderIds.length}
            onToggleAll={toggleAllFolders}
            onNewFolder={() => {
              setNewFolderName('')
              setNewFolderOpen(true)
            }}
          />
        </div>
      </div>

      {selectedIds.size > 0 ? (
        <ModulesBulkActionsBar
          count={selectedIds.size}
          busy={bulkBusy}
          onClear={clearSelection}
          onSetStatus={handleBulkStatus}
          onMove={() => setBulkFolderOpen(true)}
          onDelete={handleBulkDelete}
        />
      ) : null}

      {initialLoading ? (
        <ModulesListSkeleton />
      ) : loadError && modules.length === 0 ? (
        <div className="box custom-box text-center py-12 mt-4">
          <p className="font-medium text-defaulttextcolor dark:text-white mb-1">
            Could not load modules
          </p>
          <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-3">{loadError}</p>
          <button
            type="button"
            className="ti-btn ti-btn-primary-full !mb-0"
            onClick={() => void fetchModules()}
          >
            Retry
          </button>
        </div>
      ) : totalResults === 0 ? (
        hasActiveFilters ? (
          <div className="text-center py-10">
            <p className="text-[0.875rem] text-defaulttextcolor dark:text-white mb-1">
              No modules match your filters
            </p>
            <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-3">
              Try a different search or clear status/search filters.
            </p>
            <button type="button" className="ti-btn ti-btn-light !mb-0" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <ModulesListEmptyState
            statusFilter={statusFilter}
            archivedCount={lifecycleCounts.archived}
          />
        )
      ) : (
        <div
          className={
            refreshing
              ? 'pointer-events-none opacity-60 transition-opacity'
              : 'transition-opacity'
          }
          aria-busy={refreshing}
        >
          <ModulesFolderCardGrid
            folderRows={folderRows}
            collapsedFolderIds={collapsedFolderIds}
            onToggleFolder={toggleFolder}
            onPositionsChanged={fetchModules}
            selectedIds={selectedIds}
            statusUpdatingId={statusUpdatingId}
            showFolderHeaders={showFolderHeaders}
            onSelectAllInFolder={selectAllInFolder}
            onDelete={handleDelete}
            onView={handleView}
            onClone={handleClone}
            onAssignFolders={handleAssignFolders}
            onSetStatus={handleSetModuleStatus}
            onToggleSelect={toggleSelect}
          />
        </div>
      )}

      <div className="mt-4 mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <select
            className="form-control select-show-page-size !w-auto !py-1 !px-4 !text-[0.75rem]"
            style={{ colorScheme: 'light' }}
            value={listState.limit}
            onChange={(e) =>
              replaceListUrl(
                modulesStateAfterFilterChange(listState, {
                  limit: Number(e.target.value),
                }),
                'push'
              )
            }
            aria-label="Entries per page"
            disabled={refreshing}
          >
            {MODULES_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                Show {size}
              </option>
            ))}
          </select>
          <span className="text-[0.8125rem] text-[#8c9097] dark:text-white/50">
            Showing {startIndex} to {endIndex} of {totalResults} entries
          </span>
        </div>
        {totalPages > 1 ? (
          <nav aria-label="Page navigation" className="ms-auto">
            <ul className="ti-pagination mb-0">
              <li className={`page-item ${listState.page === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link px-3 py-[0.375rem]"
                  onClick={() =>
                    replaceListUrl({ ...listState, page: Math.max(1, listState.page - 1) }, 'push')
                  }
                  disabled={listState.page === 1 || refreshing}
                >
                  Previous
                </button>
              </li>
              <li className={`page-item ${listState.page >= totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link px-3 py-[0.375rem]"
                  onClick={() =>
                    replaceListUrl(
                      { ...listState, page: Math.min(totalPages, listState.page + 1) },
                      'push'
                    )
                  }
                  disabled={listState.page >= totalPages || refreshing}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        ) : null}
      </div>

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

export default function TrainingModulesPage() {
  return (
    <Suspense
      fallback={
        <div className="box custom-box text-center py-12 mt-5">
          <p className="text-[#8c9097] dark:text-white/50 mb-0">Loading modules...</p>
        </div>
      }
    >
      <TrainingModules />
    </Suspense>
  )
}
