// SSR dynamic route. No `generateStaticParams` — see
// training/attendance/student/[studentId]/page.tsx for rationale (placeholder
// `{ id: "_" }` strands SSR runtime chunks on Vercel after `output: "export"`
// was removed from next.config.js).

import React from "react";
import CourseLearnLoader from "./course-learn-loader";

export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params;
  return <CourseLearnLoader moduleId={id ?? ""} />;
}
