"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ConditionalFooter({ footer }: { footer?: ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (pathname === "/auth/signin" || pathname === "/auth/signup") return null;
  if (pathname === "/checkout/confirmation") return null;
  if (!footer) return null;

  return <div className="mt-auto">{footer}</div>;
}
