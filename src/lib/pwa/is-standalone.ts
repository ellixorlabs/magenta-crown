/**
 * Detects installed / home-screen “app” mode (PWA).
 * Call only in the browser; on the server this always returns false.
 */
export function getIsPwaStandalone(): boolean {
  if (typeof window === "undefined") return false;

  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) {
    return true;
  }

  return false;
}

/** Subscribe to standalone display-mode changes (e.g. moving a tab to a window). */
export function subscribeIsPwaStandalone(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mq = window.matchMedia("(display-mode: standalone)");
  const handler = () => onChange();

  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }

  mq.addListener(handler);
  return () => mq.removeListener(handler);
}
