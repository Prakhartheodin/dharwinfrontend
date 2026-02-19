"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

/**
 * Returns true only when the user is a "candidate" (from share-candidate-form) who should
 * call getMyCandidate. All users have role 'user'; admins have Administrator in roleIds.
 * We must NOT call getMyCandidate for admins (they have no candidate record).
 */
export function useIsCandidateForProfile(): { isCandidate: boolean; isLoading: boolean } {
  const { user } = useAuth();
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
        // role === "user" is true for everyone (enum only has 'user'); admins have Administrator in roleIds
        if (user.role !== "user") {
          if (!cancelled) {
            setIsCandidate(false);
            setIsLoading(false);
          }
          return;
        }
        if (!user.roleIds || (user.roleIds as string[]).length === 0) {
          // No roleIds = candidate from share-candidate-form
          if (!cancelled) {
            setIsCandidate(true);
            setIsLoading(false);
          }
          return;
        }
        const res = await rolesApi.listRoles({ limit: 100 });
        const roles = (res.results ?? []) as Role[];
        const roleMap = new Map<string, Role>();
        roles.forEach((r) => roleMap.set(r.id, r));
        let hasAdministrator = false;
        (user.roleIds as string[]).forEach((id) => {
          const role = roleMap.get(id);
          if (role?.name === "Administrator") hasAdministrator = true;
        });
        if (!cancelled) {
          setIsCandidate(!hasAdministrator);
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
  }, [user]);

  return { isCandidate, isLoading };
}
