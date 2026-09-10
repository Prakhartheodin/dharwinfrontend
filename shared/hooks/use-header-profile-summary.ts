"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { getMeWithCandidate } from "@/shared/lib/api/auth";
import { isCandidateOnlyRoleNames } from "@/shared/lib/personal-info-wizard";
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
  /** Employee/candidate persona without staff capability — gates self-service-only nav. */
  hasEmployeeRole: boolean;
  /** Candidate-only persona (not Employee role) — trims inbox/task manager from profile menu. */
  isCandidateOnlyPersona: boolean;
  isLoading: boolean;
} {
  const { user, roleNames, permissionsLoaded } = useAuth();
  const { hasEmployeeProfile, hasEmployeeRole, isLoading: personaLoading } = useHasEmployeeRole();
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

  const isCandidateOnlyPersona = useMemo(() => {
    if (!hasEmployeeRole) return false;

    const fromAuth = (roleNames ?? []).map((n) => n.trim()).filter(Boolean);
    const names =
      fromAuth.length > 0
        ? fromAuth
        : (user?.role ?? "").toString().trim()
          ? [(user?.role ?? "").toString().trim()]
          : [];

    if (isCandidateOnlyRoleNames(names)) return true;

    const isCandidateFlag =
      (user as { isCandidate?: boolean } | null | undefined)?.isCandidate ?? null;
    if (isCandidateFlag !== true) return false;

    const lowered = names.map((n) => n.toLowerCase());
    return !lowered.includes("employee");
  }, [hasEmployeeRole, roleNames, user]);

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
    hasEmployeeRole,
    isCandidateOnlyPersona,
    isLoading: personaLoading || employeeIdLoading,
  };
}
