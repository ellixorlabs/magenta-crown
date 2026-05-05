/**
 * Ref-counted body scroll lock so overlapping modals / sheets / loaders
 * do not leave `overflow: hidden` stuck or wipe each other's cleanup.
 *
 * Uses `position: fixed` on the body while locked so iOS Safari does not
 * keep scrolling the page behind overlays when a nested panel scrolls.
 */
let depth = 0;
let savedHtmlOverflow = "";
let savedBodyOverflow = "";
let savedBodyPosition = "";
let savedBodyTop = "";
let savedBodyWidth = "";
let lockedScrollY = 0;

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (depth === 0) {
    lockedScrollY = window.scrollY;
    savedHtmlOverflow = document.documentElement.style.overflow;
    savedBodyOverflow = document.body.style.overflow;
    savedBodyPosition = document.body.style.position;
    savedBodyTop = document.body.style.top;
    savedBodyWidth = document.body.style.width;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.width = "100%";
  }
  depth += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  depth = Math.max(0, depth - 1);
  if (depth === 0) {
    document.documentElement.style.overflow = savedHtmlOverflow;
    document.body.style.overflow = savedBodyOverflow;
    document.body.style.position = savedBodyPosition;
    document.body.style.top = savedBodyTop;
    document.body.style.width = savedBodyWidth;
    savedHtmlOverflow = "";
    savedBodyOverflow = "";
    savedBodyPosition = "";
    savedBodyTop = "";
    savedBodyWidth = "";
    window.scrollTo(0, lockedScrollY);
  }
}

/** Drop ref-count to zero and restore the document (e.g. route error after a sheet/modal crash). */
export function resetBodyScrollLock(): void {
  if (typeof document === "undefined") return;
  if (depth === 0) return;
  depth = 0;
  document.documentElement.style.overflow = savedHtmlOverflow;
  document.body.style.overflow = savedBodyOverflow;
  document.body.style.position = savedBodyPosition;
  document.body.style.top = savedBodyTop;
  document.body.style.width = savedBodyWidth;
  savedHtmlOverflow = "";
  savedBodyOverflow = "";
  savedBodyPosition = "";
  savedBodyTop = "";
  savedBodyWidth = "";
  window.scrollTo(0, lockedScrollY);
}
