"use client";

import { useEffect, useMemo } from "react";
import { useWorkforceStore } from "../state/workforce.store";
import type { StepId } from "../types/wizard.types";
import type { WorkforceFormState } from "../types/workforce.types";

const sectionKeys: Array<keyof WorkforceFormState> = [
  "personalInfo",
  "qualification",
  "experience",
  "documents",
  "salary",
];

const sectionToStepId: Record<keyof WorkforceFormState, StepId> = {
  personalInfo: "personal-info",
  qualification: "qualification",
  experience: "work-experience",
  documents: "documents",
  salary: "salary",
};

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
      return false;
    }
  }
  return true;
}

export function useDirtyState(opts?: { enableUnloadGuard?: boolean }) {
  const enableUnload = opts?.enableUnloadGuard ?? true;

  const state = useWorkforceStore();
  const snapshot = state.snapshot;

  const dirtySections = useMemo(() => {
    const out: Partial<Record<StepId, boolean>> = {};
    for (const key of sectionKeys) {
      out[sectionToStepId[key]] = !deepEqual(state[key], snapshot[key]);
    }
    return out;
  }, [state, snapshot]);

  const isDirty = useMemo(
    () => Object.values(dirtySections).some(Boolean),
    [dirtySections],
  );

  useEffect(() => {
    if (!enableUnload || typeof window === "undefined") return;
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enableUnload, isDirty]);

  return { isDirty, dirtySections };
}
