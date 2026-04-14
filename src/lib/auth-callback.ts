/** Prevent open redirects: only same-site relative paths. */

export function getSafeCallbackUrl(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/";
  let t = raw.trim();
  try {
    t = decodeURIComponent(t);
  } catch {
    return "/";
  }
  if (!t.startsWith("/")) return "/";
  if (t.startsWith("//")) return "/";
  if (t.includes("://")) return "/";
  return t.slice(0, 2048);
}
