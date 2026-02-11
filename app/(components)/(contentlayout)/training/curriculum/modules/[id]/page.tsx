import { getAllModules } from '../data'
import CourseDetailClient from './CourseDetailClient'

export function generateStaticParams() {
  const modules = getAllModules()
  return modules.map((m) => ({ id: m.id }))
}

type PageProps = { params: Promise<{ id: string }> }

export default async function CourseDetailPage({ params }: PageProps) {
  const { id } = await params
  return <CourseDetailClient id={id} />
}
