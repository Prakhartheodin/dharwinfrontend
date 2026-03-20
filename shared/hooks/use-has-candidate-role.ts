"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

/**
 * Returns two flags:
 * - `hasCandidateRole`: “candidate-only” UX — Candidate role and NOT Agent/Administrator (legacy nav / sections).
 * - `hasCandidateProfile`: user has Candidate (or legacy `user`) role in roleIds, **including** Agent+Candidate hybrids.
 *   Use `hasCandidateProfile` to load GET /auth/me/with-candidate so Employee ID and candidate fields resolve when the user is both staff and candidate.
 */
export function useHasCandidateRole(): {
  hasCandidateRole: boolean;
  hasCandidateProfile: boolean;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const [hasCandidateRole, setHasCandidateRole] = useState(false);
  const [hasCandidateProfile, setHasCandidateProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!user) {
          if (!cancelled) {
            setHasCandidateRole(false);
            setHasCandidateProfile(false);
            setIsLoading(false);
          }
          return;
        }

        if (!user.roleIds || (user.roleIds as string[]).length === 0) {
          if (!cancelled) {
            setHasCandidateRole(false);
            setHasCandidateProfile(false);
            setIsLoading(false);
          }
          return;
        }

        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = (res.results ?? []) as Role[];
        const roleMap = new Map<string, Role>();
        roles.forEach((r) => roleMap.set(r.id, r));

        const userRoleNames = (user.roleIds as string[])
          .map((id) => roleMap.get(id)?.name?.toLowerCase())
          .filter(Boolean);

        const hasStaffRole = userRoleNames.some((name) => name === "agent" || name === "administrator");
        const hasCandidateRoleName = userRoleNames.some((name) => name === "candidate" || name === "user");
        const hasCandidate = !hasStaffRole && hasCandidateRoleName;

        if (!cancelled) {
          setHasCandidateRole(hasCandidate);
          setHasCandidateProfile(hasCandidateRoleName);
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
  }, [user]);

  return { hasCandidateRole, hasCandidateProfile, isLoading };
}
