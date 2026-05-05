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
  const inFlightRef = useRef(false);
  const desiredRef = useRef(wishlisted);

  const canWishlist = Boolean(userId);

  useEffect(() => {
    setWishlisted(initialWishlisted);
    desiredRef.current = initialWishlisted;
  }, [initialWishlisted]);

  useEffect(() => {
    wishlistedRef.current = wishlisted;
  }, [wishlisted]);

  const syncDesiredState = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      while (true) {
        const target = desiredRef.current;
        const res = await fetch("/api/user/wishlist", {
          method: "POST",
          headers: await wishlistPostHeaders(),
          body: JSON.stringify({ productId, wishlist: target })
        });
        const data = (await res.json()) as { count?: number };
        if (res.ok && typeof data.count === "number") {
          setServerCount(data.count);
        } else {
          const rollback = !target;
          setWishlisted(rollback);
          wishlistedRef.current = rollback;
          desiredRef.current = rollback;
          applyOptimisticDelta(target ? -1 : 1);
          break;
        }
        if (desiredRef.current === target) break;
      }
    } catch {
      const rollback = !desiredRef.current;
      setWishlisted(rollback);
      wishlistedRef.current = rollback;
      desiredRef.current = rollback;
    } finally {
      inFlightRef.current = false;
      if (desiredRef.current !== wishlistedRef.current) {
        void syncDesiredState();
      }
    }
  }, [applyOptimisticDelta, productId, setServerCount]);

  const toggle = useCallback(() => {
    if (!canWishlist) return;
    const prev = wishlistedRef.current;
    const next = !prev;
    setWishlisted(next);
    wishlistedRef.current = next;
    desiredRef.current = next;
    applyOptimisticDelta(next ? 1 : -1);
    void syncDesiredState();
  }, [applyOptimisticDelta, canWishlist, syncDesiredState]);

  if (!canWishlist) return null;

  return (
    <button
      type="button"
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      onClick={toggle}
      className={`inline-flex items-center justify-center ${
        variant === "overlay"
          ? "border border-zinc-200 bg-white p-2.5 text-zinc-700 shadow-md transition hover:border-crown-400 hover:text-crown-800"
          : "p-1 text-zinc-700 transition hover:text-crown-800"
      } ${className}`}
    >
      <Heart className={`h-6 w-6 ${wishlisted ? "fill-rose-500 text-rose-500" : ""}`} strokeWidth={1.5} />
    </button>
  );
}
