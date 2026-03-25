export type SopStripPrefsV1 = {
  v: 1;
  /** checkerKey of the incomplete step the user is browsing */
  focusedOpenKey: string | null;
  expanded: boolean;
};

const PREFIX = "dharwin:sop-strip:";

function key(candidateId: string): string {
  return `${PREFIX}${candidateId}`;
}

export function loadSopStripPrefs(candidateId: string): SopStripPrefsV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(candidateId));
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<SopStripPrefsV1>;
    if (o?.v !== 1) return null;
    return {
      v: 1,
      focusedOpenKey: typeof o.focusedOpenKey === "string" ? o.focusedOpenKey : null,
      expanded: Boolean(o.expanded),
    };
  } catch {
    return null;
  }
}

export function saveSopStripPrefs(candidateId: string, prefs: SopStripPrefsV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(candidateId), JSON.stringify(prefs));
  } catch {
    /* quota / private mode */
  }
}

export const SOP_STRIP_REFRESH_EVENT = "dharwin-candidate-sop-refresh";

export function dispatchSopStripRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SOP_STRIP_REFRESH_EVENT));
}
