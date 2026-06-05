"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { getMeWithCandidate } from "@/shared/lib/api/auth";
import { resolveUserRoleDisplayNames } from "@/shared/lib/user-role-display";
import { useHasEmployeeRole } from "@/shared/hooks/use-has-employee-role";

/**
 * Header profile subtitle: resolved role label(s) and optional employee ID.
 */
export function useHeaderProfileSummary(): {
  roleDisplayName: string;
  roleDisplayNames: string[];
  employeeId: string | null;
  showEmployeeId: boolean;
  isLoading: boolean;
} {
  const { user, roleNames, permissionsLoaded } = useAuth();
  const { hasEmployeeProfile, isLoading: personaLoading } = useHasEmployeeRole();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employeeIdLoading, setEmployeeIdLoading] = useState(false);

  const roleDisplayNames = useMemo(
    () => resolveUserRoleDisplayNames({ user, roleNames, permissionsLoaded }),
    [user, roleNames, permissionsLoaded]
  );

  const roleDisplayName = useMemo(
    () => (roleDisplayNames.length > 0 ? roleDisplayNames.join(", ") : "—"),
    [roleDisplayNames]
  );

  useEffect(() => {
    let cancelled = false;

    if (!user || !hasEmployeeProfile) {
      setEmployeeId(null);
      setEmployeeIdLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setEmployeeIdLoading(true);
    getMeWithCandidate()
      .then((res) => {
        if (cancelled) return;
        const id = res?.candidate?.employeeId?.trim();
        setEmployeeId(id || null);
      })
      .catch(() => {
        if (!cancelled) setEmployeeId(null);
      })
      .finally(() => {
        if (!cancelled) setEmployeeIdLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, hasEmployeeProfile]);

  return {
    roleDisplayName,
    roleDisplayNames,
    employeeId,
    showEmployeeId: hasEmployeeProfile,
    isLoading: personaLoading || employeeIdLoading,
  };
}
