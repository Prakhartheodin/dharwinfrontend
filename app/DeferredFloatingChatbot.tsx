"use client";

// Isolated from app/providers.tsx so Turbopack HMR does not keep a stale
// providers → next/dynamic loader edge after chatbot load strategy changes.
// Lazy load via useEffect + import() only — no next/dynamic in this file.

import { useState, useEffect, type ComponentType } from "react";

export default function DeferredFloatingChatbot() {
  const [Chatbot, setChatbot] = useState<ComponentType | null>(null);

  useEffect(() => {
    const load = () => {
      void import("@/shared/components/FloatingChatbot/index").then((mod) => {
        setChatbot(() => mod.default);
      });
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(load, 2000);
    return () => window.clearTimeout(t);
  }, []);

  if (!Chatbot) return null;
  return <Chatbot />;
}
