import type { User } from "@/shared/lib/types";

function normalizeRoleIdList(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === "string" || typeof x === "number") return String(x);
      if (x && typeof x === "object") {
        const o = x as { id?: string; _id?: string };
        return String(o.id ?? o._id ?? "");
      }
      return "";
    })
    .filter(Boolean);
}

/** Map legacy backend role labels to user-facing names. Preserves API role names (Candidate, Employee, Recruiter, etc.). */
export function normalizeRoleNameForDisplay(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower === "user") return "Employee";
  if (lower === "candidate") return "Candidate";
  if (lower === "employee") return "Employee";
  return trimmed;
}

const ADMINISTRATOR_ROLE = "administrator";

/** Administrator first, then remaining roles A–Z (case-insensitive). */
export function sortRoleNamesForDisplay(names: readonly string[]): string[] {
  const list = names.map((n) => n.trim()).filter(Boolean);
  return [...list].sort((a, b) => {
    const aIsAdmin = a.toLowerCase() === ADMINISTRATOR_ROLE;
    const bIsAdmin = b.toLowerCase() === ADMINISTRATOR_ROLE;
    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
}

export function resolveUserRoleDisplayNames(input: {
  user: User | null | undefined;
  roleNames?: string[] | null;
  permissionsLoaded?: boolean;
}): string[] {
  const { user, roleNames, permissionsLoaded } = input;
  if (!user) return [];

  const apiNames = sortRoleNamesForDisplay(
    (roleNames ?? [])
      .map((n) => normalizeRoleNameForDisplay(n))
      .filter(Boolean),
  );

  if (permissionsLoaded && apiNames.length > 0) {
    return apiNames;
  }

  const ids = normalizeRoleIdList(user.roleIds);
  if (ids.length === 0) {
    const r = (user.role ?? "").toString().trim();
    if (!r) return [];
    const normalized = normalizeRoleNameForDisplay(r);
    return normalized ? [normalized] : [];
  }

  const fallback = (user.role ?? "").toString().trim();
  if (!fallback) return [];
  const normalized = normalizeRoleNameForDisplay(fallback);
  return normalized ? [normalized] : [];
}

export function formatUserRoleDisplayName(input: {
  user: User | null | undefined;
  roleNames?: string[] | null;
  permissionsLoaded?: boolean;
}): string {
  const names = resolveUserRoleDisplayNames(input);
  return names.length > 0 ? names.join(", ") : "—";
}
