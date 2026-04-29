/** Inline boot layer id — must match `layout.tsx` beforeInteractive script. */
export const MC_BOOT_SCRIM_ID = "__mc_home_boot_scrim";

export function removeBootScrim(): void {
  if (typeof document === "undefined") return;
  document.getElementById(MC_BOOT_SCRIM_ID)?.remove();
}

/** Removes boot scrim and any maroon inline fills on `html` / `body` (recover from bfcache / partial hydration). */
export function clearLoaderChromeFromDocument(): void {
  if (typeof document === "undefined") return;
  removeBootScrim();
  document.documentElement.style.removeProperty("background-color");
  document.body.style.removeProperty("background-color");
}
