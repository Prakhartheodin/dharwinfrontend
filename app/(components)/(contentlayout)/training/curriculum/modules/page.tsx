"use client"

import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import React, { Fragment, useMemo, useState } from 'react'
import { MOCK_CATEGORIES } from './data'
import type { Category, ModuleSummary, TrainingModule } from './data'

const Select = dynamic(() => import('react-select'), { ssr: false })

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name (A - Z)' },
  { value: 'name-desc', label: 'Name (Z - A)' },
  { value: 'enrolled-desc', label: 'Most Enrolled' },
  { value: 'newest', label: 'Newest' },
]

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

function TrainingModuleCard({ module: m }: { module: TrainingModule }) {
  return (
    <div className="box custom-box overflow-hidden">
      <div className="relative h-36 overflow-hidden bg-defaultborder">
        <img
          src={m.coverImage}
          alt=""
          className="w-full h-full object-cover"
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
            <strong className="text-defaulttextcolor">{m.studentsEnrolled}</strong> students enrolled
          </span>
        </div>
        <div className="hs-dropdown ti-dropdown">
          <Link
            aria-label="anchor"
            href="#!"
            scroll={false}
            className="ti-btn ti-btn-sm ti-btn-light !mb-0"
            aria-expanded="false"
          >
            <i className="fe fe-more-vertical" />
          </Link>
          <ul className="hs-dropdown-menu ti-dropdown-menu hidden">
            <li>
              <Link className="ti-dropdown-item" href={`/training/curriculum/modules/${m.id}`}>
                <i className="ri-eye-line align-middle me-1 inline-flex" /> View
              </Link>
            </li>
            <li>
              <Link className="ti-dropdown-item" href="#!" scroll={false}>
                <i className="ri-edit-line align-middle me-1 inline-flex" /> Edit
              </Link>
            </li>
            <li>
              <Link className="ti-dropdown-item" href="#!" scroll={false}>
                <i className="ri-delete-bin-line me-1 align-middle inline-flex" /> Delete
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="box-body py-2">
        <SummaryBadges summary={m.summary} />
        <p className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] mb-3 line-clamp-2">
          {m.shortDescription}
        </p>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-semibold mb-1 text-[0.75rem]">Mentors :</div>
            <div className="avatar-list-stacked">
              {m.mentors.map((mentor) => (
                <span key={mentor.id} className="avatar avatar-sm avatar-rounded">
                  <img src={mentor.avatar} alt={mentor.name} title={mentor.name} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const TrainingModules = () => {
  const [search, setSearch] = useState('')
  const [sortValue, setSortValue] = useState(SORT_OPTIONS[0])
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Set<string>>(new Set())

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const filteredBySearch = useMemo(() => {
    if (!search.trim()) return MOCK_CATEGORIES
    const q = search.toLowerCase()
    return MOCK_CATEGORIES.map((cat) => ({
      ...cat,
      modules: cat.modules.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.shortDescription.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.modules.length > 0)
  }, [search])

  const sortedCategories = useMemo(() => {
    const sortFn = (a: TrainingModule, b: TrainingModule) => {
      switch (sortValue?.value) {
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'enrolled-desc':
          return b.studentsEnrolled - a.studentsEnrolled
        default:
          return 0
      }
    }
    return filteredBySearch.map((cat) => ({
      ...cat,
      modules: [...cat.modules].sort(sortFn),
    }))
  }, [filteredBySearch, sortValue])

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

      {sortedCategories.map((category) => {
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
                    <TrainingModuleCard module={m} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {sortedCategories.every((c) => c.modules.length === 0) && (
        <div className="box custom-box text-center py-12">
          <p className="text-[#8c9097] dark:text-white/50 mb-0">
            No modules match your search.
          </p>
        </div>
      )}

      <nav aria-label="Page navigation">
        <ul className="ti-pagination ltr:float-right rtl:float-left mb-4">
          <li className="page-item disabled">
            <Link className="page-link px-3 py-[0.375rem]" href="#!" scroll={false}>
              Previous
            </Link>
          </li>
          <li className="page-item">
            <Link className="page-link px-3 py-[0.375rem]" href="#!" scroll={false}>
              1
            </Link>
          </li>
          <li className="page-item">
            <Link className="page-link px-3 py-[0.375rem]" href="#!" scroll={false}>
              Next
            </Link>
          </li>
        </ul>
      </nav>
    </Fragment>
  )
}

export default TrainingModules
