"use client"

import Seo from '@/shared/layout-components/seo/seo'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AxiosError } from 'axios'
import Swal from 'sweetalert2'
import * as modulesApi from '@/shared/lib/api/curriculum-modules'
import * as mentorsApi from '@/shared/lib/api/mentors'
import * as studentsApi from '@/shared/lib/api/students'
import type {
  CurriculumModule,
  ModuleSummary,
  ModuleMentor,
} from '@/shared/lib/api/curriculum-modules'

const Select = dynamic(() => import('react-select'), { ssr: false })

const COVER_PLACEHOLDER = '/assets/images/media/team-covers/1.jpg'
const DEFAULT_PAGE_SIZE = 12

const SORT_OPTIONS = [
  { value: 'name', label: 'Name (A - Z)' },
  { value: '-name', label: 'Name (Z - A)' },
  { value: '-studentsEnrolled', label: 'Most Enrolled' },
  { value: '-createdAt', label: 'Newest' },
]

const defaultSummary: ModuleSummary = {
  videos: 0,
  pdfs: 0,
  blogs: 0,
  quiz: 0,
  tests: 0,
}

function getYoutubeId(url: string | undefined | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  // If it's already an 11-char id, accept it
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed
  const match = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  )
  return match ? match[1] : null
}

/**
 * Normalize raw module from API list endpoint into the shape
 * the UI expects (studentsEnrolled, mentors, summary counts).
 */
function normalizeModule(raw: CurriculumModule): CurriculumModule {
  const m: any = raw

  // studentsEnrolled from studentIds (backend returns array)
  let studentsEnrolled: number | undefined = raw.studentsEnrolled
  if (Array.isArray(m.studentIds)) {
    studentsEnrolled = m.studentIds.length
  }

  // mentors from mentorIds (backend returns mentor objects)
  let mentors: ModuleMentor[] | undefined = raw.mentors
  if ((!mentors || mentors.length === 0) && Array.isArray(m.mentorIds)) {
    mentors = m.mentorIds
      .map((mt: any): ModuleMentor | null => {
        if (!mt) return null
        const rawUser = mt.user
        const name =
          (rawUser && typeof rawUser === 'object' && 'name' in rawUser && (rawUser as any).name) ||
          mt.name ||
          (typeof rawUser === 'string' ? rawUser : 'Unknown')
        const avatar =
          mt.profileImageUrl && typeof mt.profileImageUrl === 'string'
            ? mentorsApi.getMentorProfilePictureUrl(mt.profileImageUrl) || undefined
            : undefined
        return {
          id: mt.id ?? mt._id ?? String(mt.user ?? name),
          name,
          avatar,
          profileImageUrl: mt.profileImageUrl,
        }
      })
      .filter(Boolean) as ModuleMentor[]
  }

  // playlist summary counts
  const playlist = Array.isArray(raw.playlist) ? (raw.playlist as any[]) : []
  const computedSummary: ModuleSummary = {
    videos: playlist.filter((i) => i?.type === 'video').length,
    pdfs: playlist.filter((i) => i?.type === 'pdf').length,
    blogs: playlist.filter((i) => i?.type === 'blog').length,
    quiz: playlist.filter((i) => i?.type === 'quiz').length,
    tests: playlist.filter((i) => i?.type === 'test').length,
  }

  return {
    ...raw,
    studentsEnrolled,
    mentors,
    summary: {
      ...defaultSummary,
      ...computedSummary,
      ...(raw.summary ?? {}),
    },
  }
}

function SummaryBadges({ summary }: { summary: ModuleSummary | undefined }) {
  const s = summary ?? defaultSummary
  const items = [
    { label: 'Videos', count: s.videos ?? 0, icon: 'ri-video-line' },
    { label: 'PDFs', count: s.pdfs ?? 0, icon: 'ri-file-pdf-line' },
    { label: 'Blogs', count: s.blogs ?? 0, icon: 'ri-article-line' },
    { label: 'Quiz', count: s.quiz ?? 0, icon: 'ri-questionnaire-line' },
    { label: 'Tests', count: s.tests ?? 0, icon: 'ri-file-list-3-line' },
  ]
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

type TrainingModuleCardProps = {
  module: CurriculumModule
  onView: (module: CurriculumModule) => void
  onDelete: (module: CurriculumModule) => void
}

function TrainingModuleCard({ module: m, onView, onDelete }: TrainingModuleCardProps) {
  const coverSrc =
    m.coverImageUrl && modulesApi.getModuleCoverUrl(m.coverImageUrl)
      ? modulesApi.getModuleCoverUrl(m.coverImageUrl)
      : COVER_PLACEHOLDER
  const mentors = m.mentors ?? []
  const summary = m.summary ?? defaultSummary

  return (
    <div className="box custom-box overflow-hidden">
      <div className="relative h-36 overflow-hidden bg-defaultborder">
        <img
          src={coverSrc}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = COVER_PLACEHOLDER
          }}
        />
      </div>
      <div className="box-header items-center !justify-start flex-wrap !flex pt-3">
        <div className="flex-grow min-w-0">
          <Link
            href={`/training/curriculum/modules/${m.id}`}
            className="font-semibold text-[.875rem] block text-truncate"
          >
            {m.name}
          </Link>
          <span className="text-[#8c9097] dark:text-white/50 block text-[0.75rem]">
            <strong className="text-defaulttextcolor">{m.studentsEnrolled ?? 0}</strong> students
            enrolled
          </span>
        </div>
      </div>
      <div className="box-body py-2">
        <SummaryBadges summary={summary} />
        <p className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] mb-3 line-clamp-2">
          {m.shortDescription || '—'}
        </p>
        {mentors.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-semibold mb-1 text-[0.75rem]">Mentors</div>
              <div className="avatar-list-stacked">
                {mentors.map((mentor) => (
                  <span key={mentor.id} className="avatar avatar-sm avatar-rounded">
                    <img
                      src={mentor.avatar || '/assets/images/faces/1.jpg'}
                      alt={mentor.name}
                      title={mentor.name}
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                      }}
                    />
                  </span>
                ))}
              </div>
            </div>

            <div className="ml-auto flex items-center justify-center gap-2">
              {/* View (opens details modal) */}
              <div className="hs-tooltip ti-main-tooltip">
                <button
                  type="button"
                  onClick={() => onView(m)}
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-success"
                >
                  <i className="ri-eye-line" />
                  <span
                    className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                    role="tooltip"
                  >
                    View
                  </span>
                </button>
              </div>

              {/* Edit */}
              <div className="hs-tooltip ti-main-tooltip">
                <Link
                  href={`/training/curriculum/modules/edit?id=${m.id}`}
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-info"
                >
                  <i className="ri-pencil-line" />
                  <span
                    className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                    role="tooltip"
                  >
                    Edit
                  </span>
                </Link>
              </div>

              {/* Delete */}
              <div className="hs-tooltip ti-main-tooltip">
                <button
                  type="button"
                  onClick={() => onDelete(m)}
                  className="hs-tooltip-toggle ti-btn ti-btn-icon ti-btn-sm ti-btn-danger"
                >
                  <i className="ri-delete-bin-line" />
                  <span
                    className="hs-tooltip-content ti-main-tooltip-content py-1 px-2 !bg-black !text-xs !font-medium !text-white shadow-sm dark:bg-slate-700"
                    role="tooltip"
                  >
                    Delete
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

type GroupedModules = { categoryId: string; categoryName: string; modules: CurriculumModule[] }
type SelectedModuleForModal = { module: CurriculumModule; categoryName: string }
type RichModule = CurriculumModule & {
  studentIds?: any[]
  mentorIds?: any[]
  playlist?: any[]
}
type ModulePersonDetail = { id: string; name: string; email: string }

const TrainingModules = () => {
  const [search, setSearch] = useState('')
  const [searchSubmitted, setSearchSubmitted] = useState('')
  const [sortValue, setSortValue] = useState(SORT_OPTIONS[0])
  const [page, setPage] = useState(1)
  const [limit] = useState(DEFAULT_PAGE_SIZE)
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(new Set<string>())
  const [selectedModule, setSelectedModule] = useState<SelectedModuleForModal | null>(null)
  const [selectedDetails, setSelectedDetails] = useState<{
    students: ModulePersonDetail[]
    mentors: ModulePersonDetail[]
  } | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [data, setData] = useState<modulesApi.ModulesListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchModules = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: modulesApi.ListModulesParams = {
        page,
        limit,
        sortBy: sortValue?.value,
        ...(searchSubmitted.trim() && { search: searchSubmitted.trim() }),
      }
      const response = await modulesApi.listModules(params)
      setData(response)
    } catch (err) {
      const msg =
        err instanceof AxiosError && err.response?.data?.message
          ? String(err.response.data.message)
          : err instanceof Error
            ? err.message
            : 'Failed to load modules'
      setError(msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, limit, sortValue?.value, searchSubmitted])

  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchSubmitted(search)
    setPage(1)
  }

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const groupedByCategory = useMemo((): GroupedModules[] => {
    if (!data?.results?.length) return []
    const map = new Map<string, GroupedModules>()
    for (const raw of data.results) {
      const m = normalizeModule(raw)
      const cid = m.categoryId || 'uncategorized'
      const name = (m as CurriculumModule & { category?: { name: string } }).category?.name ?? cid
      if (!map.has(cid)) {
        map.set(cid, { categoryId: cid, categoryName: name, modules: [] })
      }
      map.get(cid)!.modules.push(m)
    }
    return Array.from(map.values())
  }, [data?.results])

  const openDetailsForModule = useCallback(
    async (module: CurriculumModule, categoryName: string) => {
      const rich = module as RichModule
      setSelectedModule({ module, categoryName })
      setSelectedDetails(null)

      const studentIdList =
        Array.isArray(rich.studentIds) && rich.studentIds.length
          ? rich.studentIds.map((s: any) => s.id).filter((id: unknown): id is string => typeof id === 'string')
          : []
      const mentorIdList =
        Array.isArray(rich.mentorIds) && rich.mentorIds.length
          ? rich.mentorIds.map((m: any) => m.id).filter((id: unknown): id is string => typeof id === 'string')
          : []

      if (studentIdList.length === 0 && mentorIdList.length === 0) return

      setDetailsLoading(true)
      try {
        const [students, mentors] = await Promise.all([
          Promise.all(
            studentIdList.map(async (id) => {
              try {
                const s = await studentsApi.getStudent(id)
                return {
                  id,
                  name: s.user?.name ?? 'Unknown',
                  email: s.user?.email ?? '',
                } as ModulePersonDetail
              } catch {
                return { id, name: 'Unknown', email: '' } as ModulePersonDetail
              }
            }),
          ),
          Promise.all(
            mentorIdList.map(async (id) => {
              try {
                const m = await mentorsApi.getMentor(id)
                return {
                  id,
                  name: m.user?.name ?? 'Unknown',
                  email: m.user?.email ?? '',
                } as ModulePersonDetail
              } catch {
                return { id, name: 'Unknown', email: '' } as ModulePersonDetail
              }
            }),
          ),
        ])
        setSelectedDetails({
          students,
          mentors,
        })
      } finally {
        setDetailsLoading(false)
      }
    },
    [],
  )

  const handleDeleteModule = useCallback(
    async (module: CurriculumModule) => {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Delete module?',
        text: `Are you sure you want to delete "${module.name}"? This action cannot be undone.`,
        showCancelButton: true,
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33',
      })
      if (!result.isConfirmed) return

      try {
        await modulesApi.deleteModule(module.id)
        await Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: `"${module.name}" has been deleted.`,
          timer: 2000,
          showConfirmButton: false,
          position: 'top-end',
          toast: true,
        })
        fetchModules()
      } catch (err) {
        const msg =
          err instanceof AxiosError && err.response?.data?.message
            ? String(err.response.data.message)
            : err instanceof Error
              ? err.message
              : 'Failed to delete module'
        await Swal.fire({
          icon: 'error',
          title: 'Delete failed',
          text: msg,
          timer: 3000,
          showConfirmButton: false,
          position: 'top-end',
          toast: true,
        })
      }
    },
    [fetchModules],
  )

  const totalResults = data?.totalResults ?? 0
  const totalPages = data?.totalPages ?? 0
  const hasPrev = page > 1
  const hasNext = page < totalPages
  const start = totalResults === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, totalResults)

  return (
    <>
      <Seo title="Training Modules" />
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box custom-box">
            <div className="box-body p-4">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center justify-between flex-wrap gap-4"
              >
                <div className="flex flex-wrap gap-1 newproject">
                  <Link
                    href="/training/curriculum/modules/create"
                    className="ti-btn ti-btn-primary-full me-2 !mb-0"
                  >
                    <i className="ri-add-line me-1 font-semibold align-middle" />
                    New Module
                  </Link>
                  <Select
                    value={sortValue}
                    onChange={(v) => {
                      const opt = v as { value: string; label: string } | null
                      if (opt) setSortValue(opt)
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
                  <button className="ti-btn ti-btn-light !mb-0" type="submit">
                    Search
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="box custom-box border-danger/30 bg-danger/5">
          <div className="box-body py-4">
            <p className="text-danger mb-0">{error}</p>
            <button
              type="button"
              className="ti-btn ti-btn-sm ti-btn-danger mt-2"
              onClick={() => fetchModules()}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="box custom-box text-center py-12">
          <p className="text-[#8c9097] dark:text-white/50 mb-0">Loading modules...</p>
        </div>
      )}

      {!loading &&
        !error &&
        groupedByCategory.map((group) => {
          const isCollapsed = collapsedCategoryIds.has(group.categoryId)
          return (
            <div key={group.categoryId} className="mb-6">
              <button
                type="button"
                onClick={() => toggleCategory(group.categoryId)}
                className="flex items-center gap-2 w-full text-left py-2 px-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-expanded={!isCollapsed}
              >
                <i
                  className={`text-defaulttextcolor text-lg ${
                    isCollapsed ? 'ri-add-line' : 'ri-subtract-line'
                  }`}
                  aria-hidden
                />
                <h2 className="text-lg font-semibold text-defaulttextcolor">
                  {group.categoryName}
                </h2>
                <span className="text-[#8c9097] dark:text-white/50 text-sm ml-1">
                  ({group.modules.length} module{group.modules.length !== 1 ? 's' : ''})
                </span>
              </button>
              {!isCollapsed && (
                <div className="grid grid-cols-12 gap-x-6 gap-y-6 mt-2">
                  {group.modules.map((m) => (
                    <div
                      key={m.id}
                      className="xxl:col-span-3 xl:col-span-4 md:col-span-6 col-span-12"
                    >
                      <TrainingModuleCard
                        module={m}
                        onView={(module) => openDetailsForModule(module, group.categoryName)}
                        onDelete={handleDeleteModule}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

      {!loading && !error && groupedByCategory.length === 0 && (
        <div className="box custom-box text-center py-12">
          <p className="text-[#8c9097] dark:text-white/50 mb-0">No modules found.</p>
          <Link
            href="/training/curriculum/modules/create"
            className="ti-btn ti-btn-primary-full mt-3"
          >
            Create your first module
          </Link>
        </div>
      )}

      {!loading && !error && totalResults > 0 && (
        <nav aria-label="Page navigation" className="mt-4">
          <ul className="ti-pagination ltr:float-right rtl:float-left mb-4 flex flex-wrap items-center gap-2">
            <li className="text-sm text-[#8c9097] dark:text-white/50">
              Showing {start} to {end} of {totalResults}
            </li>
            <li className="page-item">
              <button
                type="button"
                className="page-link px-3 py-[0.375rem]"
                disabled={!hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
            </li>
            <li className="page-item">
              <span className="page-link px-3 py-[0.375rem]">
                Page {page} of {totalPages || 1}
              </span>
            </li>
            <li className="page-item">
              <button
                type="button"
                className="page-link px-3 py-[0.375rem]"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Detailed module modal */}
      {selectedModule && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelectedModule(null)}
        >
          <div
            className="bg-bodybg border border-defaultborder rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const rich = selectedModule.module as RichModule
              const students = Array.isArray(rich.studentIds) ? rich.studentIds : []
              const playlist = Array.isArray(rich.playlist) ? rich.playlist : []
              const mentorDetailsMap = new Map(
                (selectedDetails?.mentors ?? []).map((m) => [m.id, m] as const),
              )
              const studentDetailsMap = new Map(
                (selectedDetails?.students ?? []).map((s) => [s.id, s] as const),
              )

              return (
                <>
            <div className="flex items-center justify-between p-4 border-b border-defaultborder">
              <div>
                <h3 className="text-lg font-semibold mb-1">{selectedModule.module.name}</h3>
                <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-0">
                  {selectedModule.categoryName}
                </p>
              </div>
              <button
                type="button"
                className="ti-btn ti-btn-light !py-1 !px-2"
                onClick={() => setSelectedModule(null)}
              >
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-12 gap-4">
              <div className="lg:col-span-7 col-span-12 space-y-3">
                {/* Cover image */}
                <div className="rounded-lg overflow-hidden border border-defaultborder bg-black/5 dark:bg-white/5">
                  <img
                    src={
                      selectedModule.module.coverImageUrl
                        ? modulesApi.getModuleCoverUrl(selectedModule.module.coverImageUrl)
                        : COVER_PLACEHOLDER
                    }
                    alt="Cover"
                    className="w-full h-40 object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = COVER_PLACEHOLDER
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-[0.875rem] font-semibold mb-1">Description</h4>
                  <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/70 mb-0">
                    {selectedModule.module.shortDescription || '—'}
                  </p>
                </div>

                {/* Playlist summary */}
                <div>
                  <h4 className="text-[0.875rem] font-semibold mb-1">Content summary</h4>
                  <SummaryBadges summary={selectedModule.module.summary} />
                </div>

                {/* Playlist detail */}
                {playlist.length > 0 && (
                  <div>
                    <h4 className="text-[0.875rem] font-semibold mb-1">Playlist</h4>
                    <div className="space-y-2">
                      {playlist.map((item: any, index: number) => (
                        <div
                          key={item._id ?? `${selectedModule.module.id}-item-${index}`}
                          className="border border-defaultborder rounded-md p-2 bg-black/5 dark:bg-white/5"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[0.75rem]">
                                {item.order ?? index + 1}
                              </span>
                              <span className="font-semibold text-[0.8125rem]">
                                {item.title || '(Untitled item)'}
                              </span>
                            </div>
                            <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                              {item.type}
                              {item.duration ? ` · ${item.duration} min` : ''}
                            </span>
                          </div>

                          {/* Type-specific info */}
                          {item.type === 'video' && item.sourceUrl && (
                            <div className="mt-1">
                              <video
                                src={modulesApi.getPlaylistItemSourceUrl(item.sourceUrl)}
                                controls
                                className="w-full max-h-40 rounded border border-defaultborder bg-black/80"
                              />
                            </div>
                          )}
                          {item.type === 'youtube' && item.sourceUrl && (
                            <div className="mt-2 flex gap-3 items-center">
                              {getYoutubeId(item.sourceUrl) ? (
                                <div className="relative w-40 rounded-md overflow-hidden border border-defaultborder bg-black/80 shrink-0">
                                  <img
                                    src={`https://img.youtube.com/vi/${getYoutubeId(item.sourceUrl)}/mqdefault.jpg`}
                                    alt={item.title || 'YouTube preview'}
                                    className="w-full h-24 object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-primary shadow">
                                      <i className="ri-play-fill text-xl" />
                                    </span>
                                  </div>
                                </div>
                              ) : null}
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[0.75rem] text-primary underline break-all"
                              >
                                {item.sourceUrl}
                              </a>
                            </div>
                          )}
                          {item.type === 'pdf' && item.sourceUrl && (
                            <div className="text-[0.75rem] text-[#8c9097] dark:text-white/60">
                              PDF document attached
                            </div>
                          )}

                          {item.type === 'quiz' && Array.isArray(item.quizData) && item.quizData.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.quizData.map((q: any, qIndex: number) => (
                                <div
                                  key={`q-${qIndex}`}
                                  className="border border-defaultborder rounded-md p-2 bg-bodybg/60"
                                >
                                  <div className="font-semibold text-[0.75rem] mb-1">
                                    Q{qIndex + 1}. {q.question || 'Untitled question'}
                                  </div>
                                  {Array.isArray(q.options) && q.options.length > 0 && (
                                    <ul className="list-disc list-inside space-y-0.5 text-[0.75rem]">
                                      {q.options.map((opt: any, oIndex: number) => (
                                        <li
                                          key={`q-${qIndex}-opt-${oIndex}`}
                                          className={opt.correct ? 'text-success' : ''}
                                        >
                                          {opt.text || '(Empty option)'}
                                          {opt.correct ? ' (correct)' : ''}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 col-span-12 space-y-3">
                {/* Stats */}
                <div className="border border-defaultborder rounded-lg p-3 bg-black/5 dark:bg-white/5 space-y-1 text-[0.8125rem]">
                  <div className="flex justify-between">
                    <span className="text-[#8c9097] dark:text-white/50">Students enrolled</span>
                    <span className="font-semibold">
                      {selectedModule.module.studentsEnrolled ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8c9097] dark:text-white/50">Videos</span>
                    <span className="font-semibold">{selectedModule.module.summary?.videos ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8c9097] dark:text-white/50">PDFs</span>
                    <span className="font-semibold">{selectedModule.module.summary?.pdfs ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8c9097] dark:text-white/50">Quizzes</span>
                    <span className="font-semibold">{selectedModule.module.summary?.quiz ?? 0}</span>
                  </div>
                </div>

                {/* Mentors list */}
                {selectedModule.module.mentors && selectedModule.module.mentors.length > 0 && (
                  <div className="border border-defaultborder rounded-lg p-3 bg-black/5 dark:bg-white/5">
                    <h4 className="text-[0.875rem] font-semibold mb-2">Mentors</h4>
                    <div className="space-y-2">
                      {selectedModule.module.mentors.map((mentor: ModuleMentor) => {
                        const detail = mentorDetailsMap.get(mentor.id)
                        const displayName = detail?.name || mentor.name
                        const displayEmail = detail?.email || ''
                        return (
                          <div
                            key={mentor.id}
                            className="flex items-center justify-between gap-2 text-[0.8125rem]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="avatar avatar-sm avatar-rounded">
                                <img
                                  src={mentor.avatar || '/assets/images/faces/1.jpg'}
                                  alt={displayName}
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                                  }}
                                />
                              </span>
                              <span>{displayName}</span>
                            </div>
                            {displayEmail && (
                              <span className="text-[0.75rem] text-[#8c9097] dark:text-white/60 break-all">
                                {displayEmail}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Students list */}
                {students.length > 0 && (
                  <div className="border border-defaultborder rounded-lg p-3 bg-black/5 dark:bg-white/5">
                    <h4 className="text-[0.875rem] font-semibold mb-2">Students</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {students.map((s: any) => {
                        const rawUser = s.user
                        const baseName =
                          (rawUser && typeof rawUser === 'object' && 'name' in rawUser && (rawUser as any).name) ||
                          (typeof rawUser === 'string' ? rawUser : 'Unknown')
                        const detail = studentDetailsMap.get(s.id)
                        const displayName = detail?.name || baseName
                        const displayEmail = detail?.email || ''
                        const avatar =
                          s.profileImageUrl && typeof s.profileImageUrl === 'string'
                            ? studentsApi.getStudentProfilePictureUrl(s.profileImageUrl)
                            : '/assets/images/faces/1.jpg'
                        return (
                          <div
                            key={s.id ?? s.user ?? displayName}
                            className="flex items-center justify-between gap-2 text-[0.8125rem]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="avatar avatar-sm avatar-rounded">
                                <img
                                  src={avatar}
                                  alt={displayName}
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).src = '/assets/images/faces/1.jpg'
                                  }}
                                />
                              </span>
                              <span className="truncate">{displayName}</span>
                            </div>
                            {displayEmail && (
                              <span className="text-[0.75rem] text-[#8c9097] dark:text-white/60 break-all">
                                {displayEmail}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-defaultborder">
              <Link
                href={`/training/curriculum/modules/${selectedModule.module.id}`}
                className="ti-btn ti-btn-light"
                onClick={() => setSelectedModule(null)}
              >
                Go to course page
              </Link>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full"
                onClick={() => setSelectedModule(null)}
              >
                Close
              </button>
            </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}

export default TrainingModules
