"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { IStaticMethods } from "preline/preline";
declare global {
  interface Window {
    HSStaticMethods?: IStaticMethods;
  }
}

/** Run after layout paint so Preline’s DOM queries don’t see transient/undefined nodes (avoids getAttribute on undefined). */
function runWhenDomStable(fn: () => void) {
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

export default function PrelineScript() {
  const path = usePathname();

  useEffect(() => {
    let cancelled = false;

    const loadPreline = async () => {
      try {
        await import("preline/preline");
        if (cancelled || typeof document === "undefined") return;

        runWhenDomStable(() => {
          if (cancelled) return;
          try {
            window.HSStaticMethods?.autoInit?.();
          } catch (e) {
            console.warn("[Preline] autoInit failed:", e);
          }
        });
      } catch (e) {
        console.warn("[Preline] load failed:", e);
      }
    };

    void loadPreline();

    return () => {
      cancelled = true;
    };
  }, [path]);

  return null;
}