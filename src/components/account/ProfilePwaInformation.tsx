"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProfilePwaSubpage } from "@/components/account/ProfilePwaSubpage";

const links = [
  { href: "/about", label: "About Magenta Crown" },
  { href: "/legal/terms", label: "Terms & conditions" },
  { href: "/legal/privacy", label: "Privacy policy" },
  { href: "/legal/cookies", label: "Cookie policy" },
  { href: "/returns", label: "Returns & exchanges" },
  { href: "/faqs", label: "FAQs" },
  { href: "/support/shipping", label: "Shipping information" }
] as const;

export function ProfilePwaInformation() {
  return (
    <ProfilePwaSubpage title="Information">
      <ul className="overflow-hidden rounded-2xl border border-zinc-900/5 bg-white/50">
        {links.map((item, i) => (
          <li key={item.href} className={i > 0 ? "border-t border-zinc-900/5" : ""}>
            <Link
              href={item.href}
              className="flex min-h-[3rem] items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-[#EAE4D9]/60 active:bg-[#EAE4D9]"
            >
              <span>{item.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </ProfilePwaSubpage>
  );
}
