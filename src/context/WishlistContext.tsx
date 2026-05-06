"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode
} from "react";
import useSWR from "swr";
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
  const staff = isStaffRole(role);
  const shouldFetch = !isLoading && Boolean(userId) && !staff;
  const key = shouldFetch ? `wishlist-count:${userId}` : null;

  const {
    data: swrCount,
    mutate
  } = useSWR<number>(
    key,
    async () => {
      const n = await fetchWishlistCount();
      wishlistCountCache = { value: n, expiresAt: Date.now() + WISHLIST_COUNT_CACHE_TTL_MS };
      return n;
    },
    {
      fallbackData: wishlistCountCache?.expiresAt && wishlistCountCache.expiresAt > Date.now()
        ? wishlistCountCache.value
        : 0
    }
  );

  const hydrated = !isLoading;
  const count = shouldFetch ? (swrCount ?? 0) : 0;

  const refresh = useCallback(async () => {
    if (!userId || staff) {
      wishlistCountCache = { value: 0, expiresAt: Date.now() + WISHLIST_COUNT_CACHE_TTL_MS };
      await mutate(0, { revalidate: false });
      return;
    }
    await mutate(async () => {
      const n = await fetchWishlistCount();
      wishlistCountCache = { value: n, expiresAt: Date.now() + WISHLIST_COUNT_CACHE_TTL_MS };
      return n;
    });
  }, [mutate, userId, staff]);

  const applyOptimisticDelta = useCallback((delta: number) => {
    const base = shouldFetch ? (swrCount ?? 0) : 0;
    const next = Math.max(0, base + delta);
    wishlistCountCache = { value: next, expiresAt: Date.now() + WISHLIST_COUNT_CACHE_TTL_MS };
    void mutate(next, { revalidate: false });
  }, [mutate, shouldFetch, swrCount]);

  const setServerCount = useCallback((n: number) => {
    const next = Math.max(0, n);
    wishlistCountCache = { value: next, expiresAt: Date.now() + WISHLIST_COUNT_CACHE_TTL_MS };
    void mutate(next, { revalidate: false });
  }, [mutate]);

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
