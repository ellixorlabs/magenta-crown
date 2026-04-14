/**
 * Cart snapshot: localStorage (primary) + sessionStorage (backup) + small cookie (extra resilience).
 * Cookie is skipped if payload would exceed ~3.5KB (browser limits).
 */

export const CART_STORAGE_KEY = "magenta-crown-cart";
export const CART_SESSION_BACKUP_KEY = "magenta-crown-cart-backup";

const CART_COOKIE = "mc_cart_v1";
const COOKIE_MAX = 3500;

export type CartPersistedPayload = {
  items: unknown[];
  couponCode: string | null;
  discountPct: number;
};

function setCookie(value: string | null) {
  if (typeof document === "undefined") return;
  if (value == null) {
    document.cookie = `${CART_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    return;
  }
  if (value.length > COOKIE_MAX) return;
  document.cookie = `${CART_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
}

export function readCartPayload(): CartPersistedPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLocal = localStorage.getItem(CART_STORAGE_KEY);
    const fromSession = sessionStorage.getItem(CART_SESSION_BACKUP_KEY);
    const raw = fromLocal ?? fromSession;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartPersistedPayload;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return {
      items: parsed.items,
      couponCode: parsed.couponCode ?? null,
      discountPct: typeof parsed.discountPct === "number" ? parsed.discountPct : 0
    };
  } catch {
    return null;
  }
}

export function writeCartPayload(payload: CartPersistedPayload) {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(payload);
  try {
    localStorage.setItem(CART_STORAGE_KEY, json);
    sessionStorage.setItem(CART_SESSION_BACKUP_KEY, json);
    setCookie(json.length <= COOKIE_MAX ? json : null);
  } catch (e) {
    console.warn("[cart] persist failed", e);
  }
}

/** Flush before auth redirect so the next page load always sees the latest cart. */
export function ensureCartPayloadWritten(payload: CartPersistedPayload) {
  writeCartPayload(payload);
}

export function clearCartStorage() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    sessionStorage.removeItem(CART_SESSION_BACKUP_KEY);
    setCookie(null);
  } catch {
    /* ignore */
  }
}
