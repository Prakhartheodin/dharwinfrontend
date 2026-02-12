"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import React, { Fragment, useMemo, useState, useEffect, useCallback, useRef } from 'react'
import Swal from 'sweetalert2'
import { AxiosError } from 'axios'
import * as trainingModulesApi from '@/shared/lib/api/training-modules'
import * as categoriesApi from '@/shared/lib/api/categories'
import type { TrainingModule as ApiTrainingModule, PlaylistItem } from '@/shared/lib/api/training-modules'
import type { Category as ApiCategory } from '@/shared/lib/api/categories'

const Select = dynamic(() => import('react-select'), { ssr: false })

const SORT_OPTIONS = [
  { value: 'moduleName:asc', label: 'Name (A - Z)' },
  { value: 'moduleName:desc', label: 'Name (Z - A)' },
  { value: 'createdAt:desc', label: 'Newest' },
  { value: 'createdAt:asc', label: 'Oldest' },
]

interface ModuleSummary {
  videos: number
  pdfs: number
  blogs: number
  quiz: number
  tests: number
}

function calculateSummary(playlist: PlaylistItem[]): ModuleSummary {
  return {
    videos: playlist.filter((item) => 
      item.contentType === 'upload-video' || item.contentType === 'youtube-link'
    ).length,
    pdfs: playlist.filter((item) => item.contentType === 'pdf-document').length,
    blogs: playlist.filter((item) => item.contentType === 'blog').length,
    quiz: playlist.filter((item) => item.contentType === 'quiz').length,
    tests: playlist.filter((item) => item.contentType === 'test').length,
  }
}

function SummaryBadges({ summary }: { summary: ModuleSummary }) {
  const items = [
    { label: 'Videos', count: summary.videos, icon: 'ri-video-line' },
    { label: 'PDFs', count: summary.pdfs, icon: 'ri-file-pdf-line' },
    { label: 'Blogs', count: summary.blogs, icon: 'ri-article-line' },
    { label: 'Quiz', count: summary.quiz, icon: 'ri-questionnaire-line' },
    { label: 'Tests', count: summary.tests, icon: 'ri-file-list-3-line' },
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

interface TrainingModuleCardProps {
  module: ApiTrainingModule
  onDelete: (moduleId: string) => void
}

function TrainingModuleCard({ module: m, onDelete }: TrainingModuleCardProps) {
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
    <div className="box custom-box">
      <div className="relative h-36 overflow-hidden bg-defaultborder">
        <img
          src={coverImageUrl}
          alt={m.moduleName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/assets/images/media/team-covers/1.jpg'
          }}
        />
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
      <div className="box-header items-center !justify-start flex-wrap !flex pt-3">
        <div className="flex-grow min-w-0">
          <Link
            href={`/training/curriculum/modules/${m.id}`}
            className="font-semibold text-[.875rem] block text-truncate"
          >
            {m.moduleName}
          </Link>
          <span className="text-[#8c9097] dark:text-white/50 block text-[0.75rem]">
            <strong className="text-defaulttextcolor">{m.students?.length || 0}</strong> students enrolled
          </span>
        </div>
        <div className="hs-dropdown ti-dropdown" ref={dropdownRef}>
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
            className="hs-dropdown-menu ti-dropdown-menu hidden absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-bodybg border border-defaultborder rounded-md shadow-lg"
            aria-labelledby={`dropdown-menu-${m.id}`}
          >
            <li>
              <Link className="ti-dropdown-item" href={`/training/curriculum/modules/${m.id}`}>
                <i className="ri-eye-line align-middle me-1 inline-flex" /> View
              </Link>
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

interface CategoryWithModules extends ApiCategory {
  modules: ApiTrainingModule[]
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

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  // Group modules by category
  const categoriesWithModules = useMemo(() => {
    const categoryMap = new Map<string, CategoryWithModules>()
    
    // Initialize all categories
    categories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, modules: [] })
    })

    // Assign modules to categories
    modules.forEach((module) => {
      module.categories?.forEach((cat) => {
        const category = categoryMap.get(cat.id)
        if (category) {
          category.modules.push(module)
        } else {
          // If category not found, create it
          categoryMap.set(cat.id, {
            id: cat.id,
            name: cat.name,
            createdAt: '',
            updatedAt: '',
            modules: [module],
          })
        }
      })
    })

    return Array.from(categoryMap.values()).filter((cat) => cat.modules.length > 0)
  }, [modules, categories])

  const sortedCategories = useMemo(() => {
    const sortFn = (a: ApiTrainingModule, b: ApiTrainingModule) => {
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
    return categoriesWithModules.map((cat) => ({
      ...cat,
      modules: [...cat.modules].sort(sortFn),
    }))
  }, [categoriesWithModules, sortValue])

  return (
    <Fragment>
      <Seo title="Training Modules" />
      <div className="grid grid-cols-12 gap-6">
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
                  <Select
                    value={sortValue}
                    onChange={(v: { value: string; label: string } | null) => v && setSortValue(v)}
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

      {loading ? (
        <div className="box custom-box text-center py-12">
          <p className="text-[#8c9097] dark:text-white/50 mb-0">Loading modules...</p>
        </div>
      ) : sortedCategories.length > 0 ? (
        sortedCategories.map((category) => {
          const isCollapsed = collapsedCategoryIds.has(category.id)
          return (
            <div key={category.id} className="mb-6">
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-2 w-full text-left py-2 px-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-expanded={!isCollapsed}
              >
                <i
                  className={`text-defaulttextcolor text-lg ${isCollapsed ? 'ri-add-line' : 'ri-subtract-line'}`}
                  aria-hidden
                />
                <h2 className="text-lg font-semibold text-defaulttextcolor">
                  {category.name}
                </h2>
                <span className="text-[#8c9097] dark:text-white/50 text-sm ml-1">
                  ({category.modules.length} module{category.modules.length !== 1 ? 's' : ''})
                </span>
              </button>
              {!isCollapsed && (
                <div className="grid grid-cols-12 gap-x-6 gap-y-6 mt-2">
                  {category.modules.map((m) => (
                    <div
                      key={m.id}
                      className="xxl:col-span-3 xl:col-span-4 md:col-span-6 col-span-12"
                    >
                      <TrainingModuleCard module={m} onDelete={handleDelete} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      ) : (
        <div className="box custom-box text-center py-12">
          <p className="text-[#8c9097] dark:text-white/50 mb-0">
            {search.trim() ? 'No modules match your search.' : 'No modules found. Create your first module to get started.'}
          </p>
        </div>
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
    </Fragment>
  )
}

export default TrainingModules
