/**
 * Deprecated-field aliases and forward/backward shims.
 * Centralizes legacy field renames so mapper.ts stays clean.
 */

export const BACKEND_TO_UI_ALIASES = {
  qualifications: "educations",
} as const;

export const UI_TO_BACKEND_ALIASES = {
  educations: "qualifications",
} as const;

export function applyBackendAliases<T extends Record<string, unknown>>(
  raw: T,
): T {
  const out: Record<string, unknown> = { ...raw };
  for (const [be, ui] of Object.entries(BACKEND_TO_UI_ALIASES)) {
    if (be in out && !(ui in out)) {
      out[ui] = out[be];
    }
  }
  return out as T;
}

export function applyUiAliases<T extends Record<string, unknown>>(
  raw: T,
): T {
  const out: Record<string, unknown> = { ...raw };
  for (const [ui, be] of Object.entries(UI_TO_BACKEND_ALIASES)) {
    if (ui in out && !(be in out)) {
      out[be] = out[ui];
    }
  }
  return out as T;
}
