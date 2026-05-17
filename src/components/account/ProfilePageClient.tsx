"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ProfileFormClient } from "@/components/account/ProfileFormClient";
import { useAuth } from "@/context/AuthContext";

export function ProfilePageClient() {
  const router = useRouter();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/signin?callbackUrl=/account/profile");
      return;
    }
    setReady(true);
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !ready) {
    return <p className="text-sm text-zinc-500">Loading profile…</p>;
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">Profile</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Keep your details and saved addresses up to date for a smoother checkout.
      </p>
      <button
        type="button"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
        onClick={() => {
          void logout().then(() => {
            window.location.assign("/auth/signin");
          });
        }}
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>

      <div className="mt-8">
        <ProfileFormClient />
      </div>

    </div>
  );
}

