import React from "react";
import CourseDetailLoader from "./course-detail-loader";

/** Required for static export (output: "export"). At least one param needed; real IDs are loaded at runtime. */
export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params;
  return <CourseDetailLoader moduleId={id ?? ""} />;
}
