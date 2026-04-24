"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import * as rolesApi from "@/shared/lib/api/roles";
import { userCanListRoles } from "@/shared/lib/permissions";
import type { Role } from "@/shared/lib/types";
import { isEmployeeUserRoleNameLower } from "@/shared/lib/employee-user-role";

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
 * True when the user should call `getMyCandidate` (share-candidate / pending employee-only roles).
 */
export function useIsEmployeeForProfile(): { isEmployee: boolean; isLoading: boolean } {
  const { user, roleNames, permissionsLoaded, permissions } = useAuth();
  const [isEmployee, setIsEmployee] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!user) {
          if (!cancelled) {
            setIsEmployee(false);
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
            setIsEmployee(true);
            setIsLoading(false);
          }
          return;
        }

        const namesFromAuth = (roleNames ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean);
        if (namesFromAuth.length > 0) {
          const onlyEmployee =
            namesFromAuth.length > 0 && namesFromAuth.every((name) => isEmployeeUserRoleNameLower(name));
          if (!cancelled) {
            setIsEmployee(onlyEmployee);
            setIsLoading(false);
          }
          return;
        }

        if (!userCanListRoles(permissions)) {
          if (!cancelled) {
            setIsEmployee(false);
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

        const onlyEmployee =
          userRoleNames.length > 0 && userRoleNames.every((name) => isEmployeeUserRoleNameLower(name));

        if (!cancelled) {
          setIsEmployee(onlyEmployee);
        }
      } catch {
        if (!cancelled) setIsEmployee(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, permissionsLoaded, roleNames, permissions]);

  return { isEmployee, isLoading };
}
