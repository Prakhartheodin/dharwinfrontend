import { redirect } from "next/navigation";

/** Legacy URL; canonical task board lives under /task/kanban-board */
export default function LegacyProjectManagementTaskPage() {
  redirect("/task/kanban-board");
}
