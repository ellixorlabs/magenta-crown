export function isPWA() {
  if (typeof window === "undefined") return false;

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isIOS = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isStandalone || isIOS;
}
