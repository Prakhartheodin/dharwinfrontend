import { listProjects } from "@/shared/lib/api/projects";
import { listUsers } from "@/shared/lib/api/users";

export type ProjectRow = { id: string; name: string };
export type UserRow = { id: string; name: string; email: string };

function mapProjects(
  results: Awaited<ReturnType<typeof listProjects>>["results"]
): ProjectRow[] {
  return (results ?? []).map((p) => ({
    id: (p as { id?: string }).id ?? p._id,
    name: p.name ?? "",
  }));
}

function mapUsers(
  results: Awaited<ReturnType<typeof listUsers>>["results"]
): UserRow[] {
  return (results ?? []).map((u) => ({
    id: u.id ?? u._id ?? "",
    name: u.name ?? "",
    email: u.email ?? "",
  }));
}

/** Projects/users for kanban filters; tasks fetch is separate and must succeed. */
export async function fetchBoardMetadata(limit: number): Promise<{
  projects: ProjectRow[];
  users: UserRow[];
}> {
  const [projSettled, userSettled] = await Promise.allSettled([
    listProjects({ limit }),
    listUsers({ limit }),
  ]);

  let projects: ProjectRow[] = [];
  if (projSettled.status === "fulfilled") {
    projects = mapProjects(projSettled.value.results);
  } else {
    try {
      const mineRes = await listProjects({ limit, mine: true });
      projects = mapProjects(mineRes.results);
    } catch {
      projects = [];
    }
  }

  const users =
    userSettled.status === "fulfilled"
      ? mapUsers(userSettled.value.results)
      : [];

  return { projects, users };
}
