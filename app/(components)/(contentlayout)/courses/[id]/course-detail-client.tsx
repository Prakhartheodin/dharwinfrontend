"use client"

import Seo from "@/shared/layout-components/seo/seo"
import React, { Fragment, useEffect, useMemo, useState } from "react"
import { CourseHeaderBack } from "../course-header-back"
import type { Course, CourseSection } from "@/shared/data/training/courses-data"
import { firstIncompleteLectureId, includeTiles, outcomePoints, totalLecturesAndDuration } from "./course-detail-helpers"
import { CourseDetailHero } from "./course-detail-hero"
import { CourseDetailCurriculum } from "./course-detail-curriculum"
import {
  CourseCodingBlurb,
  CourseIncludesGrid,
  CourseLearnOutcomes,
  CourseRelatedTopics,
  CourseRequirements,
} from "./course-detail-highlights"

export default function CourseDetailClient({ course }: { course: Course }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandAll, setExpandAll] = useState(false)

  const learningPoints = outcomePoints(course)
  const relatedTopics = course.relatedTopics ?? []
  const requirements = course.requirements ?? []
  const tiles = course.courseIncludes ? includeTiles(course.courseIncludes) : []
  const codingDesc = course.codingExercisesDescription
  const learnHref = `/courses/${course.id}/learn/`

  const sections: CourseSection[] = useMemo(() => {
    if (course.courseSections?.length) return course.courseSections
    if (course.lessons?.length) {
      return [{ id: "default", title: "Course content", lectures: course.lessons }]
    }
    return []
  }, [course.courseSections, course.lessons])

  const { lectures: totalLectures, durationStr: totalDuration } = useMemo(
    () => (sections.length ? totalLecturesAndDuration(sections) : { lectures: 0, durationStr: "0m", totalMin: 0 }),
    [sections]
  )

  const totalCompleted = useMemo(
    () => sections.reduce((acc, s) => acc + s.lectures.filter((l) => l.isCompleted).length, 0),
    [sections]
  )

  const upNextId = useMemo(() => firstIncompleteLectureId(sections), [sections])

  useEffect(() => {
    if (sections[0]) setExpandedSections(new Set([sections[0].id]))
  }, [sections])

  /**
   * Toggle a single curriculum section open or closed.
   */
  const toggleSection = (id: string) => {
    setExpandAll(false)
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /**
   * Expand or collapse every curriculum section.
   */
  const setExpandAllSections = (open: boolean) => {
    setExpandAll(open)
    if (open) setExpandedSections(new Set(sections.map((s) => s.id)))
    else setExpandedSections(new Set())
  }

  return (
    <Fragment>
      <Seo title={course.title} />

      <header className="sticky top-0 z-30 flex items-center gap-3 h-14 px-4 lg:px-6 border-b border-[#d1d7dc] dark:border-white/10 bg-white dark:bg-[#1c1d1f] mb-6">
        <CourseHeaderBack href="/courses/" label="Back to My Courses" />
        <h1 className="truncate text-[0.9375rem] font-semibold min-w-0">{course.title}</h1>
      </header>

      <div className="max-w-[1120px] mx-auto px-4 lg:px-6 pb-12">

        <CourseDetailHero
          course={course}
          totalLectures={totalLectures}
          totalDuration={totalDuration}
          learnHref={learnHref}
        />

        <div className="mt-8 space-y-6">
          <CourseLearnOutcomes points={learningPoints} />
          <CourseIncludesGrid tiles={tiles} />
          {codingDesc && <CourseCodingBlurb description={codingDesc} />}
          {sections.length > 0 && totalLectures > 0 && (
            <CourseDetailCurriculum
              sections={sections}
              totalLectures={totalLectures}
              totalDuration={totalDuration}
              totalCompleted={totalCompleted}
              expandAll={expandAll}
              expandedIds={expandedSections}
              upNextId={upNextId}
              onToggleSection={toggleSection}
              onSetExpandAll={setExpandAllSections}
            />
          )}
          <CourseRequirements items={requirements} />
          <CourseRelatedTopics topics={relatedTopics} />
        </div>
      </div>
    </Fragment>
  )
}
