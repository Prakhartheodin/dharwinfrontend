"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

/**
 * Returns true when the user has the Candidate role and should see candidate UI (Personal Information candidate sections).
 * Show for: users with Candidate or "user" role who do NOT have Agent/Administrator.
 * Hide for: Agent, Administrator, and other staff roles.
 */
export function useHasCandidateRole(): { hasCandidateRole: boolean; isLoading: boolean } {
  const { user } = useAuth();
  const [hasCandidateRole, setHasCandidateRole] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!user) {
          if (!cancelled) {
            setHasCandidateRole(false);
            setIsLoading(false);
          }
          return;
        }
        const roleStr = (user.role ?? "").toString().toLowerCase();
        const legacyUserOrCandidate = roleStr === "user" || roleStr === "candidate";

        if (!user.roleIds || (user.roleIds as string[]).length === 0) {
          if (!cancelled) {
            setHasCandidateRole(legacyUserOrCandidate);
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
        const hasCandidate =
          !hasStaffRole && (hasCandidateRoleName || (userRoleNames.length === 0 && legacyUserOrCandidate));

        if (!cancelled) {
          setHasCandidateRole(hasCandidate);
        }
      } catch {
        if (!cancelled) {
          const roleStr = (user?.role ?? "").toString().toLowerCase();
          setHasCandidateRole(roleStr === "user" || roleStr === "candidate");
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

  return { hasCandidateRole, isLoading };
}
