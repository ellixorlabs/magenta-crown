"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { useAuth } from "@/context/AuthContext";
import { wishlistGetHeaders } from "@/lib/wishlist-client";

type WishlistDispatchValue = {
  applyOptimisticDelta: (delta: number) => void;
  setServerCount: (n: number) => void;
  refresh: () => Promise<void>;
};

type WishlistCountValue = {
  count: number;
  hydrated: boolean;
};

const WishlistDispatchContext = createContext<WishlistDispatchValue | null>(null);
const WishlistCountContext = createContext<WishlistCountValue | null>(null);
const WISHLIST_COUNT_CACHE_TTL_MS = 45_000;
let wishlistCountCache: { value: number; expiresAt: number } | null = null;

function isStaffRole(role: string) {
  return role === "ADMIN" || role === "SUB_ADMIN" || role === "TECH_SUPPORT";
}

async function fetchWishlistCount(signal?: AbortSignal): Promise<number> {
  const res = await fetch("/api/user/wishlist", {
    headers: await wishlistGetHeaders(),
    cache: "no-store",
    signal
  });
  if (!res.ok) return 0;
  const data = (await res.json()) as { count?: number };
  return typeof data.count === "number" ? data.count : 0;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { userId, isLoading, role } = useAuth();
  const [count, setCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const staff = isStaffRole(role);

  useEffect(() => {
    if (isLoading) return;
    if (!userId || staff) {
      setCount(0);
      setHydrated(true);
      return;
    }
    if (wishlistCountCache && wishlistCountCache.expiresAt > Date.now()) {
      setCount(wishlistCountCache.value);
      setHydrated(true);
      return;
    }
    const ac = new AbortController();
    setHydrated(false);
    void (async () => {
      try {
        const n = await fetchWishlistCount(ac.signal);
        if (ac.signal.aborted) return;
        setCount(n);
        wishlistCountCache = { value: n, expiresAt: Date.now() + WISHLIST_COUNT_CACHE_TTL_MS };
      } catch {
        if (!ac.signal.aborted) setCount(0);
      } finally {
        if (!ac.signal.aborted) setHydrated(true);
      }
    })();
    return () => ac.abort();
  }, [isLoading, userId, staff]);

  const refresh = useCallback(async () => {
    if (!userId || staff) {
      setCount(0);
      setHydrated(true);
      return;
    }
    try {
      const n = await fetchWishlistCount();
      setCount(n);
      wishlistCountCache = { value: n, expiresAt: Date.now() + WISHLIST_COUNT_CACHE_TTL_MS };
    } catch {
      setCount(0);
    } finally {
      setHydrated(true);
    }
  }, [userId, staff]);

  const applyOptimisticDelta = useCallback((delta: number) => {
    setCount((c) => {
      const next = Math.max(0, c + delta);
      wishlistCountCache = { value: next, expiresAt: Date.now() + WISHLIST_COUNT_CACHE_TTL_MS };
      return next;
    });
  }, []);

  const setServerCount = useCallback((n: number) => {
    const next = Math.max(0, n);
    wishlistCountCache = { value: next, expiresAt: Date.now() + WISHLIST_COUNT_CACHE_TTL_MS };
    setCount(next);
  }, []);

  const dispatchValue = useMemo<WishlistDispatchValue>(
    () => ({
      applyOptimisticDelta,
      setServerCount,
      refresh
    }),
    [applyOptimisticDelta, refresh, setServerCount]
  );

  const countValue = useMemo<WishlistCountValue>(() => ({ count, hydrated }), [count, hydrated]);

  return (
    <WishlistDispatchContext.Provider value={dispatchValue}>
      <WishlistCountContext.Provider value={countValue}>{children}</WishlistCountContext.Provider>
    </WishlistDispatchContext.Provider>
  );
}

/** Stable across wishlist count changes — use inside ProductCard / toggles so hearts do not re-render the whole grid. */
export function useWishlistDispatch() {
  const ctx = useContext(WishlistDispatchContext);
  if (!ctx) {
    throw new Error("useWishlistDispatch must be used within WishlistProvider");
  }
  return ctx;
}

/** Subscribes to badge count — use only in navbar or small chrome. */
export function useWishlistCount() {
  const ctx = useContext(WishlistCountContext);
  if (!ctx) {
    throw new Error("useWishlistCount must be used within WishlistProvider");
  }
  return ctx;
}
