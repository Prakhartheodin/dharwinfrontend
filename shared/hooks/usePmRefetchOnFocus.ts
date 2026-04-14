"use client";

import { useEffect } from "react";

/**
 * PM data sync: refetch when the user returns to the tab or window (no React Query in this app).
 * Use after direct mutations or assistant-driven writes so lists stay fresh.
 */
export function usePmRefetchOnFocus(refetch: () => void): void {
  useEffect(() => {
    const run = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refetch();
      }
    };
    const onFocus = () => refetch();
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", onFocus);
    };
  }, [refetch]);
}
