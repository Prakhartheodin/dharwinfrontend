import React from "react";
import CourseLearnLoader from "./course-learn-loader";

/** Required for static export (output: "export"). At least one param needed; real IDs are loaded at runtime. */
export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default async function CourseLearnPage({
  params,
}: {
  params: Promise<{ id?: string }>;
}) {
  const { id } = await params;
  return <CourseLearnLoader moduleId={id ?? ""} />;
}
