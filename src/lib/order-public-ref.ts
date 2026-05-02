/**
 * Public order reference (`Order.publicOrderRef`) is the only customer-facing identifier.
 * Internal `Order.id` (UUID) must not appear in URLs, JSON to browsers, or user-visible APIs.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function looksLikeUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

/** Normalize `publicOrderRef` from query params, path segments, or request bodies for DB lookup. */
export function normalizePublicOrderRef(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (!s) return null;
  try {
    s = decodeURIComponent(s);
  } catch {
    /* invalid escape — use raw */
  }
  s = s.trim();
  return s || null;
}

/** Encodes a public ref for use in URL path or query (handles `#`, spaces, etc.). */
export function encodeOrderRefForUrl(ref: string): string {
  return encodeURIComponent(ref);
}
