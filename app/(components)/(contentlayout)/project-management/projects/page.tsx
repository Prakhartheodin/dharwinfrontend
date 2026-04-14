import { redirect } from "next/navigation";

/** Legacy URL; canonical project list lives under /apps/projects/project-list */
export default function LegacyProjectManagementProjectsPage() {
  redirect("/apps/projects/project-list");
}
