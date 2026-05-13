/**
 * Build a shallow tree from flat `Product.category` strings that use ` > ` as a hierarchy separator
 * (e.g. `Ethnic Wear > Anarkali Sets`).
 */

export type CategoryFilterChild = { fullValue: string; displayLabel: string };

export type CategoryFilterGroup = {
  /** First path segment; stable key for expand/collapse. */
  rootKey: string;
  /** Exact category value matching only the root (optional). */
  rootLeafValue?: string;
  /** Deeper paths grouped under `rootKey`. */
  childEntries: CategoryFilterChild[];
};

function splitCategoryPath(raw: string): string[] {
  return raw
    .trim()
    .split(/\s*>\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function buildCategoryFilterGroups(categories: readonly string[]): CategoryFilterGroup[] {
  const byRoot = new Map<string, { rootLeaf?: string; children: CategoryFilterChild[] }>();

  for (const c of categories) {
    const trimmed = c.trim();
    if (!trimmed) continue;
    const parts = splitCategoryPath(trimmed);
    const root = parts[0] ?? trimmed;
    if (!byRoot.has(root)) byRoot.set(root, { children: [] });
    const bucket = byRoot.get(root)!;

    if (parts.length <= 1) {
      bucket.rootLeaf = trimmed;
    } else {
      const displayLabel = parts.slice(1).join(" > ");
      bucket.children.push({ fullValue: trimmed, displayLabel });
    }
  }

  for (const b of byRoot.values()) {
    const seen = new Set<string>();
    b.children = b.children.filter((ch) => {
      if (seen.has(ch.fullValue)) return false;
      seen.add(ch.fullValue);
      return true;
    });
    b.children.sort((a, x) => a.displayLabel.localeCompare(x.displayLabel));
  }

  return [...byRoot.entries()]
    .map(([rootKey, v]) => ({
      rootKey,
      rootLeafValue: v.rootLeaf,
      childEntries: v.children
    }))
    .sort((a, b) => a.rootKey.localeCompare(b.rootKey));
}
