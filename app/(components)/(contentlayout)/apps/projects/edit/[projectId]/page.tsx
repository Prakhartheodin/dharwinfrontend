// SSR dynamic route. We deliberately do NOT export `generateStaticParams`:
// next.config.js no longer sets `output: "export"`, so the placeholder
// `{ projectId: "_" }` was producing an unused static prerender that
// confused Vercel's serverless chunk packer and stranded SSR runtime
// chunks (`[root-of-the-server]__<hash>.js MODULE_NOT_FOUND`). See
// training/attendance/student/[studentId]/page.tsx for the same rationale.

import React from "react";
import { EditProjectClient } from "./EditProjectClient";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <EditProjectClient projectId={projectId} />;
}
