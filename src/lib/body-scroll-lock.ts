/**
 * Ref-counted body scroll lock so overlapping modals / sheets / loaders
 * do not leave `overflow: hidden` stuck or wipe each other's cleanup.
 */
let depth = 0;
let savedOverflow = "";

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (depth === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  depth += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  depth = Math.max(0, depth - 1);
  if (depth === 0) {
    document.body.style.overflow = savedOverflow;
    savedOverflow = "";
  }
}
