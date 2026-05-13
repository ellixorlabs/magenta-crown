/** Build shop/search URL with only preserved query keys + page=1 (filters cleared). */
export function buildShopUrlPreservingOnly(
  basePath: string,
  sp: URLSearchParams,
  preserveKeys: readonly string[]
): string {
  const next = new URLSearchParams();
  for (const key of preserveKeys) {
    for (const v of sp.getAll(key)) {
      if (v) next.append(key, v);
    }
  }
  next.set("page", "1");
  const qs = next.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
