import "server-only";

type CacheRecord<T> = {
  value: T;
  /** Unix ms timestamp */
  expiresAt: number;
};

const GLOBAL_KEY = "__mc_cache_v1__";

function getCacheMap() {
  const g = globalThis as unknown as { [GLOBAL_KEY]?: Map<string, CacheRecord<unknown>> };
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map();
  return g[GLOBAL_KEY]!;
}

function isExpired(rec: CacheRecord<unknown>, now: number) {
  return rec.expiresAt <= now;
}

/** Read from in-memory cache (server-only). */
export function getCache<T>(key: string): T | undefined {
  const map = getCacheMap();
  const rec = map.get(key);
  if (!rec) return undefined;
  const now = Date.now();
  if (isExpired(rec, now)) {
    map.delete(key);
    return undefined;
  }
  return rec.value as T;
}

/** Write to in-memory cache (server-only) with TTL. */
export function setCache<T>(key: string, value: T, ttlMs: number): void {
  const map = getCacheMap();
  map.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
}

/** Remove one cache entry. */
export function clearCache(key: string): void {
  getCacheMap().delete(key);
}

/** Remove all cache entries whose keys start with `prefix`. */
export function clearCacheByPrefix(prefix: string): void {
  const map = getCacheMap();
  for (const key of Array.from(map.keys())) {
    if (key.startsWith(prefix)) map.delete(key);
  }
}

