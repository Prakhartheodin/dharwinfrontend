import { redirect } from "next/navigation";

/** Permission-guarded entry; lists projects created by the current user (see ?mine=1 on project list). */
export default function MyProjectsRedirectPage() {
  redirect("/apps/projects/project-list?mine=1");
}
