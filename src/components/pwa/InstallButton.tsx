"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** When true, button is non-interactive (e.g. no install prompt yet). */
  inactive?: boolean;
};

/**
 * Primary CTA for triggering `BeforeInstallPromptEvent.prompt()`.
 * Reusable from banners, settings, or marketing surfaces.
 */
export function InstallButton({ inactive, className = "", children, disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      disabled={disabled ?? inactive}
      className={[
        "rounded-full bg-crown-800 py-2.5 text-sm font-semibold text-white transition hover:bg-crown-900 disabled:cursor-not-allowed disabled:opacity-50",
        className
      ].join(" ")}
      {...rest}
    >
      {children ?? "Install app"}
    </button>
  );
}
