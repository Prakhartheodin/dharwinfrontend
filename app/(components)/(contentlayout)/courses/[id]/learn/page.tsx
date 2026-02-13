import React, { Fragment } from "react"
import Link from "next/link"
import { MY_COURSES, getCourseById } from "@/shared/data/training/courses-data"
import CourseLearnClient from "./course-learn-client"
import Seo from "@/shared/layout-components/seo/seo"

export function generateStaticParams() {
  return MY_COURSES.map((c) => ({ id: c.id }))
}

export default async function CourseLearnPage({
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
          <h2 className="text-xl font-bold mb-2">Course not found</h2>
          <Link href="/courses/" className="text-primary hover:underline">Back to My Courses</Link>
        </div>
      </Fragment>
    )
  }

  return <CourseLearnClient course={course} />
}
