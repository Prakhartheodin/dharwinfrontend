"use client"

import React, { Fragment, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import { getModuleById, getCategoryById } from '../data'

type CurriculumSection = {
  id: string
  title: string
  items: { type: string; title: string; duration?: string }[]
}

function getMockCurriculum(moduleId: string): CurriculumSection[] {
  const sections: Record<string, CurriculumSection[]> = {
    'mod-1': [
      {
        id: 's1',
        title: 'Getting started with React',
        items: [
          { type: 'video', title: 'Welcome and course overview', duration: '5:20' },
          { type: 'video', title: 'Setting up your environment', duration: '12:40' },
          { type: 'pdf', title: 'Course resources and cheat sheet' },
        ],
      },
      {
        id: 's2',
        title: 'React fundamentals',
        items: [
          { type: 'video', title: 'Components and JSX', duration: '18:00' },
          { type: 'video', title: 'Props and state', duration: '22:15' },
          { type: 'quiz', title: 'Knowledge check' },
        ],
      },
      {
        id: 's3',
        title: 'Next.js and deployment',
        items: [
          { type: 'video', title: 'App Router basics', duration: '25:00' },
          { type: 'blog', title: 'Best practices read' },
          { type: 'video', title: 'Deploy to Vercel', duration: '14:30' },
        ],
      },
    ],
    'mod-2': [
      {
        id: 's1',
        title: 'Node.js basics',
        items: [
          { type: 'video', title: 'Introduction to Node.js', duration: '10:00' },
          { type: 'video', title: 'Modules and npm', duration: '15:00' },
        ],
      },
      {
        id: 's2',
        title: 'Building APIs',
        items: [
          { type: 'video', title: 'REST API design', duration: '20:00' },
          { type: 'pdf', title: 'API reference' },
          { type: 'quiz', title: 'API quiz' },
        ],
      },
    ],
    'mod-3': [
      {
        id: 's1',
        title: 'Database design',
        items: [
          { type: 'video', title: 'Relational model', duration: '18:00' },
          { type: 'video', title: 'Normalization', duration: '16:00' },
          { type: 'video', title: 'Writing SQL queries', duration: '24:00' },
        ],
      },
    ],
    'mod-4': [
      {
        id: 's1',
        title: 'Remote collaboration',
        items: [
          { type: 'video', title: 'Async communication', duration: '14:00' },
          { type: 'blog', title: 'Tools and workflows' },
          { type: 'quiz', title: 'Self-assessment' },
        ],
      },
    ],
    'mod-5': [
      {
        id: 's1',
        title: 'Feedback skills',
        items: [
          { type: 'video', title: 'Giving constructive feedback', duration: '16:00' },
          { type: 'video', title: 'Running 1:1s', duration: '12:00' },
        ],
      },
    ],
    'mod-6': [
      {
        id: 's1',
        title: 'UX Research methods',
        items: [
          { type: 'video', title: 'User interviews', duration: '20:00' },
          { type: 'video', title: 'Usability testing', duration: '18:00' },
          { type: 'blog', title: 'Synthesis and reporting' },
        ],
      },
    ],
  }
  return (
    sections[moduleId] ?? [
      {
        id: 's1',
        title: 'Course content',
        items: [
          { type: 'video', title: 'Introduction', duration: '10:00' },
          { type: 'video', title: 'Main concepts', duration: '15:00' },
          { type: 'quiz', title: 'Quiz' },
        ],
      },
    ]
  )
}

const CourseDetailPage = () => {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : ''
  const module = id ? getModuleById(id) : undefined
  const category = module ? getCategoryById(module.categoryId) : undefined
  const curriculum = module ? getMockCurriculum(module.id) : []
  const totalItems = curriculum.reduce((acc, s) => acc + s.items.length, 0)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() =>
    curriculum.length > 0 ? new Set([curriculum[0].id]) : new Set()
  )

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  if (!module) {
    return (
      <Fragment>
        <Seo title="Course not found" />
        <Pageheader
          currentpage="Course not found"
          activepage="Training Curriculum"
          mainpage="Modules"
        />
        <div className="box custom-box text-center py-12">
          <p className="text-[#8c9097] dark:text-white/50 mb-4">This course could not be found.</p>
          <Link href="/training/curriculum/modules" className="ti-btn ti-btn-primary-full">
            Back to Modules
          </Link>
        </div>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <Seo title={module.name} />
      <Pageheader
        currentpage={module.name}
        activepage="Training Curriculum"
        mainpage="Modules"
      />

      {/* Udemy-style banner */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 mb-6 overflow-hidden">
        <div className="relative h-56 sm:h-72 md:h-80 lg:h-96">
          <img
            src={module.coverImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
          <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 lg:p-8 text-white">
            <div className="max-w-4xl">
              {category && (
                <span className="inline-block text-white/80 text-[0.8125rem] font-medium mb-1">
                  {category.name}
                </span>
              )}
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 drop-shadow-sm">
                {module.name}
              </h1>
              <p className="text-white/90 text-sm sm:text-base max-w-2xl line-clamp-2 mb-4">
                {module.shortDescription}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-[0.8125rem] text-white/80">
                <span>
                  <strong className="text-white">{module.studentsEnrolled}</strong> students enrolled
                </span>
                <span>
                  <strong className="text-white">{totalItems}</strong> lessons
                </span>
                <span>
                  <strong className="text-white">{curriculum.length}</strong> sections
                </span>
                <div className="flex items-center gap-1">
                  {module.mentors.map((mentor) => (
                    <span
                      key={mentor.id}
                      className="avatar avatar-xs avatar-rounded ring-2 ring-white/80"
                      title={mentor.name}
                    >
                      <img src={mentor.avatar} alt={mentor.name} />
                    </span>
                  ))}
                  <span className="ml-1">
                    {module.mentors.map((m) => m.name).join(', ')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-8 col-span-12">
          {/* Curriculum */}
          <div className="box custom-box">
            <div className="box-header border-b border-defaultborder pb-3 mb-0">
              <h2 className="text-lg font-semibold mb-0">Curriculum</h2>
              <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mt-1 mb-0">
                {curriculum.length} sections · {totalItems} lessons
              </p>
            </div>
            <div className="box-body p-0">
              <div className="divide-y divide-defaultborder">
                {curriculum.map((section) => {
                  const isOpen = expandedSections.has(section.id)
                  return (
                    <div key={section.id} className="border-0">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        aria-expanded={isOpen}
                      >
                        <span className="font-semibold text-[0.9375rem]">
                          {section.title}
                        </span>
                        <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                          {section.items.length} lessons
                        </span>
                        <i
                          className={`ri-arrow-down-s-line text-xl text-[#8c9097] dark:text-white/50 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-3">
                          <ul className="space-y-0">
                            {section.items.map((item, idx) => (
                              <li
                                key={`${section.id}-${idx}`}
                                className="flex items-center gap-3 py-2.5 px-3 rounded hover:bg-black/5 dark:hover:bg-white/5"
                              >
                                <span className="text-[#8c9097] dark:text-white/50 shrink-0">
                                  {item.type === 'video' && (
                                    <i className="ri-play-circle-line text-lg" />
                                  )}
                                  {item.type === 'quiz' && (
                                    <i className="ri-questionnaire-line text-lg" />
                                  )}
                                  {item.type === 'pdf' && (
                                    <i className="ri-file-pdf-line text-lg" />
                                  )}
                                  {item.type === 'blog' && (
                                    <i className="ri-article-line text-lg" />
                                  )}
                                </span>
                                <span className="flex-1 text-[0.875rem]">{item.title}</span>
                                {item.duration && (
                                  <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                    {item.duration}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="box custom-box mt-6">
            <div className="box-header">
              <h2 className="text-lg font-semibold mb-0">About this course</h2>
            </div>
            <div className="box-body">
              <p className="text-[0.9375rem] text-[#8c9097] dark:text-white/70 leading-relaxed">
                {module.shortDescription}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[0.75rem]">
                  <i className="ri-video-line" /> {module.summary.videos} videos
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[0.75rem]">
                  <i className="ri-file-pdf-line" /> {module.summary.pdfs} PDFs
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[0.75rem]">
                  <i className="ri-article-line" /> {module.summary.blogs} articles
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[0.75rem]">
                  <i className="ri-questionnaire-line" /> {module.summary.quiz} quizzes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar card - Udemy style */}
        <div className="xl:col-span-4 col-span-12">
          <div className="box custom-box sticky top-4">
            <div className="relative overflow-hidden rounded-lg mb-4">
              <img
                src={module.coverImage}
                alt=""
                className="w-full h-40 object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <button
                  type="button"
                  className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-primary shadow-lg hover:bg-white transition-colors"
                  aria-label="Preview"
                >
                  <i className="ri-play-fill text-2xl ml-0.5" />
                </button>
              </div>
            </div>
            <div className="p-0">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-defaulttextcolor">Free</span>
              </div>
              <button
                type="button"
                className="ti-btn ti-btn-primary-full w-full !py-2.5 mb-2"
              >
                Enroll now
              </button>
              <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 text-center mb-0">
                Full lifetime access
              </p>
            </div>
            <div className="border-t border-defaultborder mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-[0.8125rem]">
                <span className="text-[#8c9097] dark:text-white/50">Students</span>
                <span className="font-medium">{module.studentsEnrolled}</span>
              </div>
              <div className="flex justify-between text-[0.8125rem]">
                <span className="text-[#8c9097] dark:text-white/50">Lessons</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex justify-between text-[0.8125rem]">
                <span className="text-[#8c9097] dark:text-white/50">Instructors</span>
                <span className="font-medium">{module.mentors.length}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-defaultborder">
              <Link
                href="/training/curriculum/modules"
                className="ti-btn ti-btn-light w-full !py-2"
              >
                <i className="ri-arrow-left-line me-1" />
                Back to modules
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default CourseDetailPage
