"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import { userCanListRoles } from "@/shared/lib/permissions";
import type { Role } from "@/shared/lib/types";

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

/**
 * Returns true only when the user is a "candidate" (from share-candidate-form) who should
 * call getMyCandidate. A user is a candidate only if:
 *   - They have NO roleIds (created via share-candidate-form), OR
 *   - ALL of their roles are named "Candidate".
 * Users with any other role (Student, Administrator, Recruiter, etc.) are NOT candidates.
 *
 * Uses `roleNames` from GET /auth/my-permissions when possible (no roles.read).
 */
export function useIsCandidateForProfile(): { isCandidate: boolean; isLoading: boolean } {
  const { user, roleNames, permissionsLoaded, permissions } = useAuth();
  const [isCandidate, setIsCandidate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!user) {
          if (!cancelled) {
            setIsCandidate(false);
            setIsLoading(false);
          }
          return;
        }

        if (!permissionsLoaded) {
          if (!cancelled) setIsLoading(true);
          return;
        }

        const ids = normalizeRoleIdList(user.roleIds);
        if (ids.length === 0) {
          if (!cancelled) {
            setIsCandidate(true);
            setIsLoading(false);
          }
          return;
        }

        const namesFromAuth = (roleNames ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean);
        if (namesFromAuth.length > 0) {
          const onlyCandidate =
            namesFromAuth.length > 0 && namesFromAuth.every((name) => name === "candidate");
          if (!cancelled) {
            setIsCandidate(onlyCandidate);
            setIsLoading(false);
          }
          return;
        }

        if (!userCanListRoles(permissions)) {
          if (!cancelled) {
            setIsCandidate(false);
            setIsLoading(false);
          }
          return;
        }

        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = (res.results ?? []) as Role[];
        const roleMap = new Map<string, Role>();
        roles.forEach((r) => {
          const id = (r as Role & { _id?: string }).id ?? (r as Role & { _id?: string })._id;
          if (id) roleMap.set(String(id), r);
        });

        const userRoleNames = ids
          .map((id) => roleMap.get(id)?.name?.toLowerCase())
          .filter((x): x is string => Boolean(x));

        const onlyCandidate =
          userRoleNames.length > 0 && userRoleNames.every((name) => name === "candidate");

        if (!cancelled) {
          setIsCandidate(onlyCandidate);
        }
      } catch {
        if (!cancelled) setIsCandidate(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, permissionsLoaded, roleNames, permissions]);

  return { isCandidate, isLoading };
}
