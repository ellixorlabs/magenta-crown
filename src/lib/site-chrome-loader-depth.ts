/**
 * Ref-count full-bleed loaders so we hide the fixed site chrome (navbar, glass back) only while at least one is active.
 */
let depth = 0;

export function pushHideSiteChrome(): void {
  if (typeof document === "undefined") return;
  depth += 1;
  document.documentElement.classList.add("mc-hide-site-chrome");
}

export function popHideSiteChrome(): void {
  if (typeof document === "undefined") return;
  depth = Math.max(0, depth - 1);
  if (depth === 0) {
    document.documentElement.classList.remove("mc-hide-site-chrome");
  }
}
