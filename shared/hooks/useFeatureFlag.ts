"use client";

import { useEffect, useState } from "react";

export type FeatureFlagKey = "taskboard-v2" | (string & {});

const ENDPOINT = (key: string) => `/api/v1/feature-flags/${key}`;
const TIMEOUT_MS = 800;
const STORAGE_PREFIX = "ff:";

const ENV_KEY = (key: string) =>
  `NEXT_PUBLIC_${key.replace(/-/g, "_").toUpperCase()}`;

const memCache = new Map<string, boolean>();

/** Test-only: clear in-memory cache between cases. */
export function __resetFeatureFlagCache(): void {
  memCache.clear();
}

function readSeed(key: string): boolean {
  if (memCache.has(key)) return memCache.get(key)!;
  if (typeof window !== "undefined") {
    try {
      const s = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (s != null) return s === "true";
    } catch {
      /* private mode */
    }
  }
  const env = (process.env as Record<string, string | undefined>)[ENV_KEY(key)];
  return env === "true";
}

function persist(key: string, value: boolean): void {
  memCache.set(key, value);
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, String(value));
  } catch {
    /* private mode */
  }
}

/**
 * Client-side feature flag: session cache → env default → optional GET (timeout 800ms).
 * Safe for SSR: initial state uses env only until mount, then session cache applies on client.
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const [value, setValue] = useState<boolean>(() => readSeed(key));

  useEffect(() => {
    setValue(readSeed(key));
  }, [key]);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    fetch(ENDPOINT(key), { signal: ctrl.signal, credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { enabled?: boolean } | null) => {
        if (body?.enabled === undefined) return;
        persist(key, body.enabled);
        setValue((prev) => (prev === body.enabled ? prev : body.enabled!));
      })
      .catch(() => {
        /* keep cached / env */
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [key]);

  return value;
}
