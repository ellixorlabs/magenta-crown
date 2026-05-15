/** Admin writes `authVisualImageUrl`; tolerate legacy keys. */
export function pickAuthVisualUrl(payload: Record<string, unknown>): string {
  const keys = ["authVisualImageUrl", "authImageUrl", "auth_visual_image_url"] as const;
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}
