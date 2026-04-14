"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { makeLineKey, parseLineKey } from "@/lib/cart-line";
import {
  clearCartStorage,
  readCartPayload,
  writeCartPayload,
  type CartPersistedPayload
} from "@/lib/cart-persistence";

export type CartItem = {
  lineKey: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  /** Server stock for this variant when added; used to clamp qty in the bag. */
  maxStock?: number;
  imageUrl?: string;
  size?: string;
  color?: string;
};

type CartContextValue = {
  items: CartItem[];
  /** True after local/session storage has been read (avoid empty flash on checkout). */
  cartHydrated: boolean;
  couponCode: string | null;
  subtotal: number;
  discountedTotal: number;
  addItem: (item: Omit<CartItem, "lineKey"> & { lineKey?: string }) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  removeItem: (lineKey: string) => void;
  /** Validates against the database; clears coupon if invalid. */
  applyCoupon: (code: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  clearCart: () => void;
  /** Call before navigating to sign-in so cart is on disk immediately. */
  flushCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

type PersistedItem = CartItem | (Omit<CartItem, "lineKey" | "slug"> & { slug?: string; lineKey?: string });

function normalizeItem(it: PersistedItem): CartItem {
  const slug = "slug" in it && it.slug ? it.slug : "";
  const lineKey =
    it.lineKey ??
    makeLineKey(it.productId, (it as CartItem).size ?? "", (it as CartItem).color ?? "");
  return {
    lineKey,
    productId:
      "productId" in it && typeof it.productId === "string" && it.productId
        ? it.productId
        : parseLineKey(lineKey).productId,
    slug,
    name: it.name,
    price: it.price,
    quantity: it.quantity,
    maxStock: (it as CartItem).maxStock,
    imageUrl: it.imageUrl,
    size: (it as CartItem).size,
    color: (it as CartItem).color
  };
}

function payloadFromState(
  items: CartItem[],
  couponCode: string | null,
  discountPct: number
): CartPersistedPayload {
  return { items, couponCode, discountPct };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [cartHydrated, setCartHydrated] = useState(false);

  useLayoutEffect(() => {
    const payload = readCartPayload();
    if (payload) {
      const normalized: CartItem[] = (payload.items as PersistedItem[]).map((it) => normalizeItem(it));
      setItems(normalized);
      setCouponCode(payload.couponCode);
      setDiscountPct(payload.discountPct);
    }
    setCartHydrated(true);
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    writeCartPayload(payloadFromState(items, couponCode, discountPct));
  }, [cartHydrated, items, couponCode, discountPct]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const discountedTotal = subtotal - subtotal * (discountPct / 100);

  const applyCoupon = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setCouponCode(null);
      setDiscountPct(0);
      return { ok: true as const };
    }
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed })
      });
      const data = (await res.json()) as { error?: string; code?: string; discountPct?: number };
      if (!res.ok) {
        setCouponCode(null);
        setDiscountPct(0);
        return { ok: false as const, message: data.error ?? "Invalid coupon" };
      }
      setCouponCode(data.code ?? trimmed);
      setDiscountPct(typeof data.discountPct === "number" ? data.discountPct : 0);
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "Could not validate coupon." };
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      cartHydrated,
      couponCode,
      subtotal,
      discountedTotal,
      flushCart: () => {
        writeCartPayload(payloadFromState(items, couponCode, discountPct));
      },
      addItem: (item) => {
        const lineKey = item.lineKey ?? makeLineKey(item.productId, item.size, item.color);
        const cap =
          item.maxStock != null && Number.isFinite(item.maxStock) ? Math.max(0, Math.floor(item.maxStock)) : null;
        setItems((prev) => {
          const found = prev.find((p) => p.lineKey === lineKey);
          const maxStock = cap ?? found?.maxStock;
          const clamp = (q: number) => {
            if (maxStock != null) return Math.min(q, maxStock);
            return q;
          };
          if (!found) {
            const qty = clamp(item.quantity);
            if (qty <= 0) return prev;
            return [...prev, { ...item, lineKey, quantity: qty, maxStock: maxStock ?? item.maxStock }];
          }
          const mergedQty = clamp(found.quantity + item.quantity);
          return prev.map((p) =>
            p.lineKey === lineKey
              ? {
                  ...p,
                  quantity: mergedQty,
                  slug: item.slug || p.slug,
                  imageUrl: item.imageUrl ?? p.imageUrl,
                  price: item.price,
                  maxStock: maxStock ?? p.maxStock
                }
              : p
          );
        });
      },
      updateQuantity: (lineKey, quantity) => {
        if (quantity <= 0) {
          setItems((prev) => prev.filter((item) => item.lineKey !== lineKey));
          return;
        }
        setItems((prev) =>
          prev.map((item) => {
            if (item.lineKey !== lineKey) return item;
            const cap =
              item.maxStock != null && Number.isFinite(item.maxStock)
                ? Math.max(0, Math.floor(item.maxStock))
                : null;
            const q = cap != null ? Math.min(quantity, cap) : quantity;
            return { ...item, quantity: q };
          })
        );
      },
      removeItem: (lineKey) => {
        setItems((prev) => prev.filter((item) => item.lineKey !== lineKey));
      },
      applyCoupon,
      clearCart: () => {
        setItems([]);
        setCouponCode(null);
        setDiscountPct(0);
        clearCartStorage();
      }
    }),
    [applyCoupon, cartHydrated, couponCode, discountPct, discountedTotal, items, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
