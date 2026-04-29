"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileFormClient } from "@/components/account/ProfileFormClient";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

export function ProfilePageClient() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) {
        router.replace("/auth/signin?callbackUrl=/account/profile");
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/auth/signin?callbackUrl=/account/profile");
        return;
      }
      if (mounted) setChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return <p className="text-sm text-zinc-500">Loading profile…</p>;
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">Profile</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Keep your details and saved addresses up to date for a smoother checkout.
      </p>

      <div className="mt-8">
        <ProfileFormClient />
      </div>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Payment methods</h2>
        <p className="mt-2 text-sm text-zinc-700">
          Cards and UPI are handled at checkout by your payment provider — we never store full card numbers.
        </p>
      </section>

      <p className="mt-8 text-sm">
        <button
          type="button"
          className="text-crown-800 underline"
          onClick={async () => {
            const supabase = await getSupabaseClientOrNull();
            if (!supabase) return;
            await supabase.auth.signOut();
            router.replace("/");
          }}
        >
          Log out
        </button>
      </p>
    </div>
  );
}

