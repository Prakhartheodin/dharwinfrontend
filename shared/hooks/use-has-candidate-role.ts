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
 * Returns two flags:
 * - `hasCandidateRole`: “candidate-only” UX — Candidate role and NOT Agent/Administrator (legacy nav / sections).
 * - `hasCandidateProfile`: user has Candidate (or legacy `user`) role in roleIds, **including** Agent+Candidate hybrids.
 *   Use `hasCandidateProfile` to load GET /auth/me/with-candidate so Employee ID and candidate fields resolve when the user is both staff and candidate.
 *
 * Uses `roleNames` from GET /auth/my-permissions (no roles.read). Only calls GET /roles when names are missing and the user has `roles.read`.
 */
export function useHasCandidateRole(): {
  hasCandidateRole: boolean;
  hasCandidateProfile: boolean;
  isLoading: boolean;
} {
  const { user, roleNames, permissionsLoaded, permissions } = useAuth();
  const [hasCandidateRole, setHasCandidateRole] = useState(false);
  const [hasCandidateProfile, setHasCandidateProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const applyFromRoleNames = (names: string[]) => {
      const lower = names.map((n) => n.trim().toLowerCase()).filter(Boolean);
      const hasStaffRole = lower.some((n) => n === "agent" || n === "administrator");
      const hasCandidateRoleName = lower.some((n) => n === "candidate" || n === "user");
      const hasCandidate = !hasStaffRole && hasCandidateRoleName;
      setHasCandidateRole(hasCandidate);
      setHasCandidateProfile(hasCandidateRoleName);
    };

    const load = async () => {
      if (!user) {
        if (!cancelled) {
          setHasCandidateRole(false);
          setHasCandidateProfile(false);
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
          setHasCandidateRole(false);
          setHasCandidateProfile(false);
          setIsLoading(false);
        }
        return;
      }

      const namesFromAuth = (roleNames ?? []).map((n) => n.trim()).filter(Boolean);
      if (namesFromAuth.length > 0) {
        if (!cancelled) {
          applyFromRoleNames(namesFromAuth);
          setIsLoading(false);
        }
        return;
      }

      if (!userCanListRoles(permissions)) {
        const r = (user.role ?? "").toString().trim().toLowerCase();
        const hasCandidateRoleName = r === "user" || r === "candidate";
        const hasStaffRole = r === "agent" || r === "administrator";
        if (!cancelled) {
          setHasCandidateRole(!hasStaffRole && hasCandidateRoleName);
          setHasCandidateProfile(hasCandidateRoleName);
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = (res.results ?? []) as Role[];
        const roleMap = new Map<string, Role>();
        roles.forEach((r) => {
          const id = (r as Role & { _id?: string }).id ?? (r as Role & { _id?: string })._id;
          if (id) roleMap.set(String(id), r);
        });

        const resolvedNames = ids
          .map((id) => roleMap.get(id)?.name?.toLowerCase())
          .filter((x): x is string => Boolean(x));

        if (resolvedNames.length > 0) {
          const hasStaffRole = resolvedNames.some((name) => name === "agent" || name === "administrator");
          const hasCandidateRoleName = resolvedNames.some((name) => name === "candidate" || name === "user");
          const hasCandidate = !hasStaffRole && hasCandidateRoleName;
          if (!cancelled) {
            setHasCandidateRole(hasCandidate);
            setHasCandidateProfile(hasCandidateRoleName);
          }
        } else if (!cancelled) {
          setHasCandidateRole(false);
          setHasCandidateProfile(false);
        }
      } catch {
        if (!cancelled) {
          setHasCandidateRole(false);
          setHasCandidateProfile(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, permissionsLoaded, roleNames, permissions]);

  return { hasCandidateRole, hasCandidateProfile, isLoading };
}
