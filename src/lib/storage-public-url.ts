/** Extract object path from Supabase public storage URL for a bucket. */
export function storageObjectPathFromPublicUrl(url: string, bucketId: string): string | null {
  const marker = `/object/public/${bucketId}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length));
  } catch {
    return null;
  }
}
