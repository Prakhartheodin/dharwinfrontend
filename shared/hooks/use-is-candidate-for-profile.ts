"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import type { Role } from "@/shared/lib/types";

/**
 * Returns true only when the user is a "candidate" (from share-candidate-form) who should
 * call getMyCandidate. A user is a candidate only if:
 *   - They have NO roleIds (created via share-candidate-form), OR
 *   - ALL of their roles are named "Candidate".
 * Users with any other role (Student, Administrator, Recruiter, etc.) are NOT candidates.
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
        if (!user.roleIds || (user.roleIds as string[]).length === 0) {
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

        const userRoleNames = (user.roleIds as string[])
          .map((id) => roleMap.get(id)?.name?.toLowerCase())
          .filter(Boolean);

        const onlyCandidate =
          userRoleNames.length > 0 &&
          userRoleNames.every((name) => name === "candidate");

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
  }, [user]);

  return { isCandidate, isLoading };
}
