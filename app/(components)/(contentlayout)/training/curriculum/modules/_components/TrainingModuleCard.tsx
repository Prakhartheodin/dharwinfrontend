'use client'

import Link from 'next/link'
import React, { memo, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import type { TrainingModule as ApiTrainingModule } from '@/shared/lib/api/training-modules'
import { calculateSummary, type ModuleSummary } from '../_lib/moduleSummary'
import ModuleStatusBadge, { type ModuleLifecycleStatus } from './ModuleStatusBadge'
import ModuleRowActions, { closeHsDropdown, toggleHsDropdown } from './ModuleRowActions'

export type { ModuleLifecycleStatus }

export interface TrainingModuleCardProps {
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

const LESSON_ICONS: { key: keyof ModuleSummary; icon: string; label: string }[] = [
  { key: 'videos', icon: 'ri-video-line', label: 'Videos' },
  { key: 'pdfs', icon: 'ri-file-pdf-line', label: 'PDFs' },
  { key: 'blogs', icon: 'ri-article-line', label: 'Blogs' },
  { key: 'quiz', icon: 'ri-questionnaire-line', label: 'Quiz' },
  { key: 'essays', icon: 'ri-edit-line', label: 'Q&A' },
]

/**
 * Two-letter initials from a module title for the cover fallback.
 */
function moduleInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'M'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

/**
 * First letter of a mentor display name for the avatar stack.
 */
function mentorInitial(name: string | undefined): string {
  const trimmed = name?.trim() ?? ''
  return trimmed ? trimmed[0]!.toUpperCase() : '?'
}

/**
 * `{n} student(s) enrolled` copy matching screenshot grammar.
 */
function enrolledLabel(count: number): string {
  return count === 1 ? '1 student enrolled' : `${count} students enrolled`
}

/**
 * Icon + count pills; zeros stay visible (e.g. `0 PDFs`).
 */
function LessonCountPills({ summary }: { summary: ModuleSummary }) {
  return (
    <ul
      className="flex flex-wrap items-center gap-1.5 mb-0 ps-0 list-none"
      aria-label="Lesson types"
    >
      {LESSON_ICONS.map(({ key, icon, label }) => (
        <li key={key}>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.6875rem] font-medium text-primary">
            <i className={`${icon} text-[0.8125rem]`} aria-hidden />
            <span className="tabular-nums">
              {summary[key]} {label}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Stacked letter avatars, or muted empty copy when none assigned.
 */
function MentorsBlock({ module }: { module: ApiTrainingModule }) {
  const mentors = module.mentorsAssigned ?? []
  return (
    <div>
      <p className="mb-1 text-[0.75rem] font-semibold">Mentors :</p>
      {mentors.length === 0 ? (
        <p className="mb-0 text-[0.75rem] text-[#8c9097] dark:text-white/50">No mentors assigned</p>
      ) : (
        <ul className="mb-0 flex list-none items-center ps-0" aria-label="Assigned mentors">
          {mentors.map((mentor, index) => {
            const name = mentor.user?.name?.trim() ?? 'Mentor'
            return (
              <li key={mentor.id} className={index > 0 ? '-ms-2' : ''} title={name}>
                <span
                  className="avatar avatar-sm avatar-rounded bg-primary/10 text-primary font-semibold"
                  aria-label={name}
                >
                  {mentorInitial(mentor.user?.name)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * h-36 cover with object-cover, or initials tile when URL is missing/broken.
 */
function ModuleCardCover({
  name,
  url,
  status,
  selected,
  onToggleSelect,
  moduleId,
}: {
  name: string
  url: string | undefined
  status: string | undefined
  selected?: boolean
  onToggleSelect?: (moduleId: string) => void
  moduleId: string
}) {
  const [broken, setBroken] = useState(false)
  const showImg = Boolean(url) && !broken

  return (
    <div className="relative h-36 shrink-0 overflow-hidden rounded-t-xl bg-primary/10">
      {showImg ? (
        <img
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-primary" aria-hidden>
          <span className="text-2xl font-semibold tracking-wide">{moduleInitials(name)}</span>
        </div>
      )}
      {onToggleSelect ? (
        <label className="absolute start-2 top-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm border border-black/10 bg-white shadow-sm">
          <input
            type="checkbox"
            className="form-check-input !m-0 !h-3.5 !w-3.5 cursor-pointer"
            checked={!!selected}
            onChange={() => onToggleSelect(moduleId)}
            aria-label={`Select ${name}`}
          />
        </label>
      ) : null}
      <ModuleStatusBadge
        status={status}
        className="absolute end-2 top-2 z-10 !border-0 !px-2 !py-0.5 !text-[0.625rem] !font-medium !normal-case !lowercase !tracking-normal shadow-sm"
      />
    </div>
  )
}

/**
 * Draft-only Edit + Publish under mentors. Published cards use header kebab only.
 */
function ModuleDraftActions({
  moduleId,
  statusBusy,
  onPublish,
}: {
  moduleId: string
  statusBusy: boolean
  onPublish: () => void
}) {
  return (
    <div className="mt-3 flex items-center gap-1.5">
      <Link
        href={`/training/curriculum/modules/edit?id=${moduleId}`}
        className="ti-btn ti-btn-sm ti-btn-light !mb-0 flex-1 justify-center !px-2.5 min-h-9"
      >
        Edit
      </Link>
      <button
        type="button"
        className="ti-btn ti-btn-sm ti-btn-primary-full !mb-0 flex-1 justify-center !px-2.5 min-h-9"
        disabled={statusBusy}
        onClick={onPublish}
      >
        {statusBusy ? 'Saving…' : 'Publish'}
      </button>
    </div>
  )
}

function TrainingModuleCardInner({
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
  const studentCount = m.students?.length || 0
  const coverUrl = m.coverImage?.url
  const dropdownRef = useRef<HTMLDivElement>(null)
  const statusBusy = statusUpdatingId === m.id
  const currentStatus: ModuleLifecycleStatus = (['draft', 'published', 'archived'] as const).includes(
    m.status as ModuleLifecycleStatus
  )
    ? (m.status as ModuleLifecycleStatus)
    : 'draft'
  const isDraft = currentStatus === 'draft'

  const handleDelete = async () => {
    closeHsDropdown(dropdownRef.current)
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
    if (result.isConfirmed) onDelete(m.id)
  }

  const handleView = () => {
    closeHsDropdown(dropdownRef.current)
    onView(m.id)
  }

  /**
   * Applies a lifecycle change after closing the kebab.
   */
  const handleSetStatus = (next: ModuleLifecycleStatus) => {
    if (statusBusy) return
    closeHsDropdown(dropdownRef.current)
    onSetStatus(m.id, next)
  }

  return (
    <article
      className={`flex h-full flex-col rounded-xl border border-defaultborder bg-white shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/30 hover:shadow-md dark:bg-bodybg ${
        selected ? 'ring-2 ring-primary/30' : ''
      }`}
    >
      <ModuleCardCover
        name={m.moduleName}
        url={coverUrl}
        status={m.status}
        selected={selected}
        onToggleSelect={onToggleSelect}
        moduleId={m.id}
      />

      <div className="flex min-h-0 flex-1 flex-col p-3.5 sm:p-4">
        <div className="flex items-start gap-2">
          {isDraft ? (
            <Link
              href={`/training/curriculum/modules/edit?id=${m.id}`}
              className="min-w-0 flex-1 truncate font-semibold text-[0.9375rem] leading-snug hover:text-primary"
              title={`Edit ${m.moduleName}`}
            >
              {m.moduleName}
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleView}
              className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-start font-semibold text-[0.9375rem] leading-snug hover:text-primary"
              title={m.moduleName}
            >
              {m.moduleName}
            </button>
          )}
          <ModuleRowActions
            moduleId={m.id}
            moduleName={m.moduleName}
            currentStatus={currentStatus}
            statusBusy={statusBusy}
            dropdownRef={dropdownRef}
            onView={handleView}
            onClone={() => {
              closeHsDropdown(dropdownRef.current)
              onClone(m.id)
            }}
            onAssignFolders={() => {
              closeHsDropdown(dropdownRef.current)
              onAssignFolders(m.id)
            }}
            onSetStatus={handleSetStatus}
            onDelete={handleDelete}
            onToggle={(e) => toggleHsDropdown(dropdownRef.current, e)}
          />
        </div>

        <p className="mb-0 mt-0.5 text-[0.75rem] text-[#8c9097] dark:text-white/50">
          {enrolledLabel(studentCount)}
        </p>

        <div className="mt-2.5">
          <LessonCountPills summary={summary} />
        </div>

        {m.shortDescription ? (
          <p
            className="mb-0 mt-2.5 line-clamp-2 text-[0.8125rem] leading-snug text-[#8c9097] dark:text-white/50"
            title={m.shortDescription}
          >
            {m.shortDescription}
          </p>
        ) : null}

        <div className="mt-auto pt-3">
          <MentorsBlock module={m} />
          {isDraft ? (
            <ModuleDraftActions
              moduleId={m.id}
              statusBusy={statusBusy}
              onPublish={() => handleSetStatus('published')}
            />
          ) : null}
        </div>
      </div>
    </article>
  )
}

export const TrainingModuleCard = memo(TrainingModuleCardInner)
