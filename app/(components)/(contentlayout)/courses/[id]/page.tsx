import React, { Fragment } from "react"
import Link from "next/link"
import { MY_COURSES, getCourseById } from "@/shared/data/training/courses-data"
import CourseDetailClient from "./course-detail-client"
import Seo from "@/shared/layout-components/seo/seo"

export function generateStaticParams() {
  return MY_COURSES.map((c) => ({ id: c.id }))
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id?: string }>
}) {
  const { id } = await params
  const course = id ? getCourseById(id) : undefined

  if (!course) {
    return (
      <Fragment>
        <Seo title="Course not found" />
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-defaulttextcolor dark:text-white mb-2">Course not found</h2>
          <Link href="/courses/" className="text-primary hover:underline">Back to My Courses</Link>
        </div>
      </Fragment>
    )
  }

  return <CourseDetailClient course={course} />
}
