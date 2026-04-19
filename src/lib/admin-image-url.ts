/**
 * imageupload.app “share” pages (`/i/{id}`) are HTML, not images — `<img src>` will fail.
 * Their CDN serves the file at `https://i.imageupload.app/{id}.jpeg` (see page HTML / og tags).
 */
const IMAGEUPLOAD_SHARE_PAGE =
  /^https?:\/\/(?:www\.)?imageupload\.app\/(?:en\/)?i\/([a-z0-9]+)\/?(?:\?.*)?$/i;

/** Normalize pasted image URLs for admin previews and DB storage (protocol-relative, known hosts). */
export function normalizeAdminImageUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const u = t.startsWith("//") ? `https:${t}` : t;
  if (/^https?:\/\/i\.imageupload\.app\//i.test(u)) return u;
  const m = u.match(IMAGEUPLOAD_SHARE_PAGE);
  if (m?.[1]) return `https://i.imageupload.app/${m[1]}.jpeg`;
  return u;
}
