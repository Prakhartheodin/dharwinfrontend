"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { getMyCandidate } from "@/shared/lib/api/employees";

/**
 * Record-based employee detection: user has an ATS record when
 * `GET /candidates/me` (or `/employees/me`) returns 200.
 */
export function useIsEmployee(): {
  isEmployee: boolean;
  employeeId: string | null;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const [isEmployee, setIsEmployee] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsEmployee(false);
      setEmployeeId(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    getMyCandidate()
      .then((c) => {
        if (cancelled) return;
        setIsEmployee(true);
        setEmployeeId((c as { _id?: string; id?: string })._id ?? (c as { _id?: string; id?: string }).id ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setIsEmployee(false);
          setEmployeeId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isEmployee, employeeId, isLoading };
}
