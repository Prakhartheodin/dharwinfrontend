import React from "react";
import { EditProjectClient } from "./EditProjectClient";

export function generateStaticParams() {
  // With output: "export", dynamic routes require generateStaticParams.
  // Return one placeholder so build succeeds; real edit URLs are loaded client-side.
  return [{ projectId: "_" }];
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <EditProjectClient projectId={projectId} />;
}
