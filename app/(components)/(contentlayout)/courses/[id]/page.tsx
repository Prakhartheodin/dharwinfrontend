// SSR dynamic route. No `generateStaticParams` — see
// training/attendance/student/[studentId]/page.tsx for rationale (placeholder
// `{ id: "_" }` strands SSR runtime chunks on Vercel after `output: "export"`
// was removed from next.config.js).

import React from "react";
import CourseDetailLoader from "./course-detail-loader";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params;
  return <CourseDetailLoader moduleId={id ?? ""} />;
}
