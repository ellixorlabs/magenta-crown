"use client";

import { Heart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

type Props = {
  productId: string;
  initialWishlisted: boolean;
  className?: string;
  variant?: "default" | "overlay";
};

export function ProductWishlistToggle({ productId, initialWishlisted, className = "", variant = "default" }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | null = null;
    (async () => {
      const supabase = await getSupabaseClientOrNull();
      if (!supabase || !mounted) return;
      supabase.auth.getUser().then(({ data }) => {
        if (mounted) setUserId(data.user?.id ?? null);
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) setUserId(session?.user?.id ?? null);
      });
      unsub = () => sub.subscription.unsubscribe();
    })();
    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  const canWishlist = Boolean(userId);

  const toggle = useCallback(async () => {
    if (!canWishlist || busy) return;
    setBusy(true);
    const next = !wishlisted;
    try {
      const supabase = await getSupabaseClientOrNull();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      const res = await fetch("/api/user/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ productId, wishlist: next })
      });
      if (res.ok) setWishlisted(next);
    } finally {
      setBusy(false);
    }
  }, [busy, canWishlist, productId, wishlisted]);

  if (!canWishlist) return null;

  return (
    <button
      type="button"
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center justify-center rounded-full ${
        variant === "overlay"
          ? "border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-md transition hover:border-crown-400 hover:text-crown-800"
          : "border border-zinc-200 bg-white p-3 text-zinc-700 shadow-sm transition hover:border-crown-400 hover:text-crown-800"
      } disabled:opacity-50 ${className}`}
    >
      <Heart className={`h-6 w-6 ${wishlisted ? "fill-rose-500 text-rose-500" : ""}`} strokeWidth={1.5} />
    </button>
  );
}
