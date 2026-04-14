"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/features/Footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/auth/signin" || pathname === "/auth/signup") {
    return null;
  }
  return <Footer />;
}
