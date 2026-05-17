"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export function ConditionalFooter({ footer }: { footer?: ReactNode }) {
  const pathname = usePathname() ?? "";

  if (pathname === "/auth/signin" || pathname === "/auth/signup") return null;
  if (pathname === "/checkout/confirmation") return null;
  if (!footer) return null;

  return <div className="mt-auto">{footer}</div>;
}
