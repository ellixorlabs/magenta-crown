"use client";

import { Heart } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useWishlistDispatch } from "@/context/WishlistContext";
import { wishlistPostHeaders } from "@/lib/wishlist-client";

type Props = {
  productId: string;
  initialWishlisted: boolean;
  className?: string;
  variant?: "default" | "overlay";
};

export function ProductWishlistToggle({ productId, initialWishlisted, className = "", variant = "default" }: Props) {
  const { userId } = useAuth();
  const { applyOptimisticDelta, setServerCount } = useWishlistDispatch();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const wishlistedRef = useRef(wishlisted);
  const busyRef = useRef(false);

  const canWishlist = Boolean(userId);

  useEffect(() => {
    setWishlisted(initialWishlisted);
  }, [initialWishlisted]);

  useEffect(() => {
    wishlistedRef.current = wishlisted;
  }, [wishlisted]);

  const toggle = useCallback(async () => {
    if (!canWishlist || busyRef.current) return;
    const prev = wishlistedRef.current;
    const next = !prev;
    setWishlisted(next);
    wishlistedRef.current = next;
    applyOptimisticDelta(next ? 1 : -1);
    busyRef.current = true;
    try {
      const res = await fetch("/api/user/wishlist", {
        method: "POST",
        headers: await wishlistPostHeaders(),
        body: JSON.stringify({ productId, wishlist: next })
      });
      const data = (await res.json()) as { count?: number };
      if (res.ok && typeof data.count === "number") {
        setServerCount(data.count);
      } else {
        setWishlisted(prev);
        wishlistedRef.current = prev;
        applyOptimisticDelta(next ? -1 : 1);
      }
    } catch {
      setWishlisted(prev);
      wishlistedRef.current = prev;
      applyOptimisticDelta(next ? -1 : 1);
    } finally {
      busyRef.current = false;
    }
  }, [applyOptimisticDelta, canWishlist, productId, setServerCount]);

  if (!canWishlist) return null;

  return (
    <button
      type="button"
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      onClick={toggle}
      className={`inline-flex items-center justify-center rounded-full ${
        variant === "overlay"
          ? "border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-md transition hover:border-crown-400 hover:text-crown-800"
          : "border border-zinc-200 bg-white p-3 text-zinc-700 shadow-sm transition hover:border-crown-400 hover:text-crown-800"
      } ${className}`}
    >
      <Heart className={`h-6 w-6 ${wishlisted ? "fill-rose-500 text-rose-500" : ""}`} strokeWidth={1.5} />
    </button>
  );
}
