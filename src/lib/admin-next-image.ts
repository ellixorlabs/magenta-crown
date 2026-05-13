/**
 * Whether a remote `next/image` src must use `unoptimized` in admin previews.
 * Unknown hosts are opted out so production does not throw on disallowed remotes.
 */
export function adminRemoteImageSrcUnoptimized(src: string): boolean {
  const t = src.trim();
  if (!t) return true;
  if (/^(blob:|data:)/i.test(t)) return true;

  const pathOnly = t.split(/[?#]/)[0]?.toLowerCase() ?? "";
  if (pathOnly.endsWith(".svg") || pathOnly.endsWith(".ico")) return true;

  let u: URL;
  try {
    u = new URL(t.startsWith("//") ? `https:${t}` : t);
  } catch {
    return true;
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") return true;

  const h = u.hostname.toLowerCase();
  if (h.endsWith(".supabase.co")) return false;
  if (h.endsWith(".googleusercontent.com")) return false;

  const allowed = new Set([
    "images.unsplash.com",
    "www.vastranand.in",
    "vastranand.in",
    "lh3.googleusercontent.com",
    "images6.alphacoders.com",
    "azafashions.com",
    "www.azafashions.com",
    "i.imageupload.app"
  ]);
  return !allowed.has(h);
}
