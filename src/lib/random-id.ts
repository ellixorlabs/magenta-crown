/**
 * Client-safe ID generation. `crypto.randomUUID()` requires a secure context
 * (HTTPS or localhost); plain HTTP over LAN often throws or is missing on mobile.
 */
export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      /* fall through */
    }
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
