export function safeParseJson<T>(raw: string | null): T | null {
  if (raw == null || raw === "") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota or private mode */
  }
}

export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeGet<T>(key: string): T | null {
  return safeParseJson<T>(safeGetItem(key));
}

import { trackTaskBoard } from "./telemetry";

export function safeSet(key: string, value: unknown): "ok" | "quota" | "unavailable" {
  if (typeof window === "undefined") return "ok";
  if (!window.localStorage) {
    trackTaskBoard("taskboard.localStorage_unavailable", { op: "set", key });
    return "unavailable";
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return "ok";
  } catch {
    return "quota";
  }
}

export function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
