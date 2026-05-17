"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  MapPin,
  Settings,
  Smile,
  Truck,
  User
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ROW_ALT = "bg-[#EAE4D9]";
const ROW_BASE = "bg-[#F5F1E9]";

const menuItems = [
  { href: "/account/profile/details", label: "Personal Details", icon: User, alt: false },
  { href: "/account/profile/addresses", label: "Address Management", icon: MapPin, alt: true },
  { href: "/account/orders", label: "My Orders", icon: Truck, alt: false },
  { href: "/support", label: "Customer Support", icon: Smile, alt: true },
  { href: "/account/profile/settings", label: "Settings", icon: Settings, alt: false },
  { href: "/account/profile/information", label: "Information", icon: FileText, alt: true }
] as const;

export function ProfilePwaHub() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-[#F5F1E9] pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-10 bg-[#F5F1E9]/95 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm">
        <div className="relative flex items-center justify-center px-4 py-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
                return;
              }
              router.push("/");
            }}
            className="absolute left-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-900 transition hover:bg-black/5 active:scale-[0.97]"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <h1 className="font-mc-heading text-xl font-semibold tracking-tight text-zinc-900">Profile</h1>
        </div>
      </header>

      <nav className="mt-2" aria-label="Profile menu">
        <ul className="border-y border-zinc-900/5">
          {menuItems.map(({ href, label, icon: Icon, alt }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex min-h-[3.35rem] items-center gap-4 px-5 py-3.5 text-[15px] font-medium text-zinc-900 transition active:opacity-80 ${
                  alt ? ROW_ALT : ROW_BASE
                }`}
              >
                <Icon className="h-[22px] w-[22px] shrink-0 stroke-[1.75]" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 flex justify-center px-6">
        <button
          type="button"
          onClick={() => {
            void logout().then(() => {
              window.location.assign("/auth/signin");
            });
          }}
          className="min-h-11 min-w-[9.5rem] rounded-full bg-[#C5A86B] px-10 py-2.5 text-[15px] font-semibold text-zinc-900 shadow-sm transition hover:bg-[#b8995f] active:scale-[0.98]"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
