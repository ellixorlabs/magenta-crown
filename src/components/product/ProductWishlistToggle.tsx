"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";

type Props = {
  productId: string;
  initialWishlisted: boolean;
};

export function ProductWishlistToggle({ productId, initialWishlisted }: Props) {
  const { data: session, status } = useSession();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [busy, setBusy] = useState(false);

  const isStaff =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUB_ADMIN" ||
    session?.user?.role === "TECH_SUPPORT";
  const canWishlist = status === "authenticated" && session?.user?.id && !isStaff;

  const toggle = useCallback(async () => {
    if (!canWishlist || busy) return;
    setBusy(true);
    const next = !wishlisted;
    try {
      const res = await fetch("/api/user/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white p-3 text-zinc-700 shadow-sm transition hover:border-crown-400 hover:text-crown-800 disabled:opacity-50"
    >
      <Heart className={`h-6 w-6 ${wishlisted ? "fill-rose-500 text-rose-500" : ""}`} strokeWidth={1.5} />
    </button>
  );
}
