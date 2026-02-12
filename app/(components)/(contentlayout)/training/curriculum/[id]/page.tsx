import { MY_COURSES } from "@/shared/data/training/courses-data"
import CourseDetailClient from "./course-detail-client"

export function generateStaticParams() {
  return MY_COURSES.map((course) => ({ id: course.id }))
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CourseDetailClient id={id} />
}
