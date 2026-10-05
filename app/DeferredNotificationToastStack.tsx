"use client";

// Lazy via import() only — no next/dynamic (providers HMR stability).
import { useState, useEffect, type ComponentType } from "react";

export default function DeferredNotificationToastStack() {
  const [Stack, setStack] = useState<ComponentType | null>(null);

  useEffect(() => {
    const load = () => {
      void import("@/shared/components/NotificationToastStack").then((mod) => {
        setStack(() => mod.NotificationToastStack);
      });
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(load, 1500);
    return () => window.clearTimeout(t);
  }, []);

  if (!Stack) return null;
  return <Stack />;
}
