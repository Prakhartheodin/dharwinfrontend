"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { getMyCandidate } from "@/shared/lib/api/candidates";

/**
 * Record-based candidate detection: user is a candidate iff they have a Candidate
 * record (owner === user._id). Call /candidates/me; 200 = candidate, 404 = not.
 * Use this instead of role-name checks so recruiters with custom roles are not
 * incorrectly treated as candidates.
 */
export function useIsCandidate(): {
  isCandidate: boolean;
  candidateId: string | null;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const [isCandidate, setIsCandidate] = useState(false);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsCandidate(false);
      setCandidateId(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    getMyCandidate()
      .then((c) => {
        if (cancelled) return;
        setIsCandidate(true);
        setCandidateId((c as { _id?: string; id?: string })._id ?? (c as { _id?: string; id?: string }).id ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setIsCandidate(false);
          setCandidateId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return { isCandidate, candidateId, isLoading };
}
