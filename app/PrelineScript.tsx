"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import type { IStaticMethods } from "preline/preline";
declare global {
  interface Window {
    HSStaticMethods?: IStaticMethods;
    /** preline's HSOverlay registry. preline only creates it inside autoInit(). */
    $hsOverlayCollection?: unknown[];
  }
}

/**
 * preline 2.7.0 registers a window `resize` listener at import time whose body
 * reads `window.$hsOverlayCollection.length` with NO nullish guard (HSDropdown's
 * resize listener guards its collection; HSOverlay's does not). That collection
 * is only created later, inside HSOverlay.autoInit(). A resize fired between
 * `import("preline/preline")` and autoInit — or if autoInit never reaches
 * HSOverlay — throws "Cannot read properties of undefined (reading 'length')"
 * from inside the listener, outside this component's try/catch.
 *
 * Pre-seeding the array before the import closes the gap. Idempotent: `|| []`
 * never clobbers a collection preline has already populated.
 */
export function ensurePrelineCollections() {
  if (typeof window === "undefined") return;
  window.$hsOverlayCollection = window.$hsOverlayCollection || [];
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
        // Must run BEFORE the import — preline registers the resize listener
        // synchronously during module evaluation.
        ensurePrelineCollections();
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