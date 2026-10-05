/** Coalesce identical in-flight GETs; optional short TTL for Strict Mode remount dedupe. */

type Entry<T> = { expiresAt: number; value?: T; inflight?: Promise<T> };

const store = new Map<string, Entry<unknown>>();

export function coalesceGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleMs = 0
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit?.inflight) return hit.inflight;
  if (staleMs > 0 && hit?.value !== undefined && hit.expiresAt > now) {
    return Promise.resolve(hit.value);
  }

  const inflight = fetcher()
    .then((value) => {
      store.set(key, { expiresAt: Date.now() + staleMs, value });
      return value;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });

  store.set(key, { expiresAt: now + staleMs, value: hit?.value, inflight });
  return inflight;
}

export function invalidateCoalescePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
