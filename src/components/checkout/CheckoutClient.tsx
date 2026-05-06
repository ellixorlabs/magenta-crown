"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BagPromoAppliedRow, BagPromoSection } from "@/components/cart/BagPromoSection";
import { ProductCard } from "@/components/features/ProductCard";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import type { ProductRow } from "@/lib/db/app-types";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";
import { getProductTotalStock } from "@/lib/variant-stock";
import { photonFeatureToAddress } from "@/lib/photon-address";
import type { SavedAddress } from "@/types/profile";
import { randomId } from "@/lib/random-id";

type RazorpayCtorOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  handler: (resp: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (opts: RazorpayCtorOptions) => { open: () => void };
  }
}

type UpsellRow = ProductRow & { variants?: { stock: number; isActive: boolean }[] };

const ALL_PAYMENT_OPTIONS = [
  { value: "CASH_ON_DELIVERY", label: "Cash on delivery" },
  { value: "UPI", label: "UPI" }
] as const;

const PHONE_DIAL_OPTIONS = [
  { value: "+91", label: "IN +91" },
  { value: "+1", label: "US +1" },
  { value: "+44", label: "UK +44" },
  { value: "+971", label: "AE +971" },
  { value: "+65", label: "SG +65" },
  { value: "+61", label: "AU +61" },
  { value: "+49", label: "DE +49" },
  { value: "+33", label: "FR +33" }
];

type PhotonFeature = {
  properties?: Record<string, string | undefined | number | null>;
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

function savedSummary(a: SavedAddress): string {
  const tag = a.kind === "home" ? "Home" : a.kind === "work" ? "Work" : a.customLabel || a.label || "Address";
  return `${tag}: ${a.line1}, ${a.city} ${a.postalCode}`;
}

function validPaymentMethod(pm: string | undefined): "CASH_ON_DELIVERY" | "UPI" | null {
  if (!pm) return null;
  return pm === "CASH_ON_DELIVERY" || pm === "UPI" ? pm : null;
}

export function CheckoutClient({ defaultPaymentMethod }: { defaultPaymentMethod?: string | null } = {}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, role, userEmail, userName } = useAuth();
  const {
    items,
    subtotal,
    discountedTotal,
    couponCode,
    clearCart,
    cartHydrated,
    flushCart,
    updateQuantity,
    removeItem
  } = useCart();

  const [fullName, setFullName] = useState("");
  const [phoneDial, setPhoneDial] = useState("+91");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [town, setTown] = useState("");
  const [city, setCity] = useState("");
  const [pin, setPin] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSuggestClose = useRef(false);

  const [profileAddresses, setProfileAddresses] = useState<SavedAddress[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [addressMode, setAddressMode] = useState<"saved" | "new">("saved");
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [saveKind, setSaveKind] = useState<"home" | "work" | "other">("home");
  const [otherLabel, setOtherLabel] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"" | "CASH_ON_DELIVERY" | "UPI">(() => {
    return validPaymentMethod(defaultPaymentMethod ?? undefined) ?? "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<UpsellRow[]>([]);

  const ensureRazorpayScript = useCallback(async () => {
    if (window.Razorpay) return true;
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      await new Promise<void>((resolve, reject) => {
        if (window.Razorpay) return resolve();
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Razorpay script failed")), { once: true });
      });
      return Boolean(window.Razorpay);
    }
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Razorpay script failed"));
      document.body.appendChild(s);
    });
    return Boolean(window.Razorpay);
  }, []);

  const paymentOptions = ALL_PAYMENT_OPTIONS;

  const email = userEmail ?? "";

  const isStaff = useMemo(() => role === "ADMIN" || role === "SUB_ADMIN" || role === "TECH_SUPPORT", [role]);

  const hasSaved = profileAddresses.length > 0;
  const couponProductIds = useMemo(() => [...new Set(items.map((i) => i.productId))], [items]);

  useEffect(() => {
    if (couponProductIds.length === 0) {
      setSimilarProducts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/public/similar-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: couponProductIds, limit: 4 })
        });
        const data = (await res.json()) as { products?: UpsellRow[] };
        if (!cancelled) setSimilarProducts(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (!cancelled) setSimilarProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [couponProductIds]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      flushCart();
      router.replace("/auth/signin?callbackUrl=" + encodeURIComponent("/checkout"));
    }
  }, [flushCart, isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = await getSupabaseClientOrNull();
        const token = (await supabase?.auth.getSession())?.data.session?.access_token;
        if (!token) {
          if (!cancelled) setProfileLoaded(true);
          return;
        }
        const res = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          if (!cancelled) setProfileLoaded(true);
          return;
        }
        const d = (await res.json()) as { addresses?: unknown; phone?: string };
        if (cancelled) return;
        const raw = Array.isArray(d.addresses) ? d.addresses : [];
        const list: SavedAddress[] = [];
        for (const x of raw) {
          if (!x || typeof x !== "object") continue;
          const o = x as Record<string, unknown>;
          list.push({
            id: typeof o.id === "string" && o.id ? o.id : randomId(),
            kind: o.kind === "home" || o.kind === "work" || o.kind === "other" ? o.kind : undefined,
            customLabel: o.customLabel != null ? String(o.customLabel) : undefined,
            label: o.label != null ? String(o.label) : undefined,
            line1: String(o.line1 ?? ""),
            line2: o.line2 != null ? String(o.line2) : undefined,
            city: String(o.city ?? ""),
            state: String(o.state ?? ""),
            postalCode: String(o.postalCode ?? ""),
            country: o.country != null ? String(o.country) : undefined,
            phone: o.phone != null ? String(o.phone) : undefined
          });
        }
        setProfileAddresses(list);
        if (list.length > 0) {
          const first = list[0]!;
          setAddressMode("saved");
          setSelectedSavedId(first.id);
          setStreet(first.line1);
          setArea(first.line2 ?? "");
          setTown(first.state ?? "");
          setCity(first.city);
          setPin(first.postalCode);
          if (first.phone) {
            const digits = first.phone.replace(/\D/g, "");
            if (digits.length >= 10) setPhoneLocal(digits.slice(-10));
          }
        } else {
          setAddressMode("new");
          setSelectedSavedId(null);
        }
        if (d.phone && typeof d.phone === "string") {
          const digits = d.phone.replace(/\D/g, "");
          if (digits.length >= 10) setPhoneLocal(digits.slice(-10));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setProfileLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (addressMode === "saved") {
      setSaveKind("home");
    }
  }, [addressMode]);

  useEffect(() => {
    if (addressMode !== "saved" || !selectedSavedId) return;
    const a = profileAddresses.find((x) => x.id === selectedSavedId);
    if (!a) return;
    setStreet(a.line1);
    setArea(a.line2 ?? "");
    setTown(a.state ?? "");
    setCity(a.city);
    setPin(a.postalCode);
    if (a.phone) {
      const digits = a.phone.replace(/\D/g, "");
      if (digits.length >= 10) setPhoneLocal(digits.slice(-10));
    }
  }, [addressMode, selectedSavedId, profileAddresses]);

  const prefilledName = useRef(false);
  useEffect(() => {
    if (userName && !prefilledName.current) {
      setFullName(userName);
      prefilledName.current = true;
    }
  }, [userName]);

  useEffect(() => {
    if (isAuthenticated && isStaff) {
      router.replace("/admin");
    }
  }, [isAuthenticated, isStaff, router]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q.trim())}`);
      const data = (await res.json()) as PhotonResponse;
      setSuggestions(data.features ?? []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(searchQuery);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchSuggestions, searchQuery]);

  const applySuggestion = useCallback((f: PhotonFeature) => {
    const a = photonFeatureToAddress(f);
    setStreet(a.street);
    setArea(a.area);
    setTown(a.town);
    setCity(a.city);
    setPin(a.pincode);
    setSuggestOpen(false);
    setSearchQuery("");
    setSuggestions([]);
  }, []);

  const phoneCombined = useMemo(() => {
    const digits = phoneLocal.replace(/\D/g, "");
    return `${phoneDial}${digits}`;
  }, [phoneDial, phoneLocal]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (isStaff) {
      setError("Staff cannot place orders.");
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }
    if (!profileLoaded) {
      setError("Please wait — loading your saved addresses.");
      return;
    }
    if (!email?.trim()) {
      setError("Your account must have an email for order confirmation. Update your profile or sign in with email.");
      return;
    }
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!phoneLocal.trim() || phoneCombined.length < 8) {
      setError("Enter a valid phone number with country code.");
      return;
    }
    if (!street.trim() || !city.trim() || !pin.trim()) {
      setError("Street, city, and PIN / postal code are required.");
      return;
    }
    if (addressMode === "new" && saveKind === "other" && !otherLabel.trim()) {
      setError("Enter a name for your custom address label.");
      return;
    }
    if (paymentMethod !== "CASH_ON_DELIVERY" && paymentMethod !== "UPI") {
      setError("Choose a payment method — cash on delivery or UPI.");
      return;
    }
    const savePayload =
      addressMode === "new"
        ? {
            kind: saveKind,
            customLabel: saveKind === "other" ? otherLabel.trim() : undefined
          }
        : undefined;

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            size: i.size ?? "",
            color: i.color ?? "",
            variantId: i.variantId ?? null
          })),
          shippingAddress: {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phoneCombined,
            phoneCountryCode: phoneDial,
            phoneLocal: phoneLocal.trim(),
            street: street.trim(),
            area: area.trim(),
            town: town.trim(),
            city: city.trim(),
            pincode: pin.trim()
          },
          paymentMethod,
          couponCode,
          addressSource: addressMode,
          saveAddress: savePayload
        })
      });
      const data = (await res.json()) as {
        publicOrderRef?: string | null;
        error?: string;
        message?: string;
        requiresOnlinePayment?: boolean;
      };
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Checkout failed");
        return;
      }
      const publicOrderRef = typeof data.publicOrderRef === "string" ? data.publicOrderRef.trim() : "";
      if (!publicOrderRef) {
        setError("Order could not be initialized.");
        return;
      }

      if (!data.requiresOnlinePayment) {
        clearCart();
        router.push(`/checkout/confirmation?orderRef=${encodeURIComponent(publicOrderRef)}`);
        return;
      }

      const canLaunch = await ensureRazorpayScript();
      if (!canLaunch || !window.Razorpay) {
        setError("Could not load Razorpay. Please try again.");
        return;
      }

      const rpInitRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicOrderRef })
      });
      const rpInit = (await rpInitRes.json()) as {
        error?: string;
        keyId?: string;
        razorpayOrderId?: string;
        amount?: number;
        currency?: string;
      };
      if (!rpInitRes.ok || !rpInit.keyId || !rpInit.razorpayOrderId || !rpInit.amount || !rpInit.currency) {
        setError(
          rpInit.error ??
            "Payment could not be started. Please try again, or use cash on delivery if available."
        );
        return;
      }

      const razorpay = new window.Razorpay({
        key: rpInit.keyId,
        amount: rpInit.amount,
        currency: rpInit.currency,
        name: "Magenta Crown",
        description: "Order payment",
        order_id: rpInit.razorpayOrderId,
        prefill: {
          name: fullName.trim(),
          email: email.trim(),
          contact: phoneCombined
        },
        notes: { publicOrderRef },
        handler: async (resp) => {
          const verifyRes = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              publicOrderRef,
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature
            })
          });
          const verifyData = (await verifyRes.json()) as { ok?: boolean; error?: string };
          if (!verifyRes.ok || !verifyData.ok) {
            setError(
              verifyData.error ??
                "Payment was unsuccessful. Your order was not completed. Please try paying again with UPI, or choose cash on delivery if available."
            );
            return;
          }
          clearCart();
          router.push(`/checkout/confirmation?orderRef=${encodeURIComponent(publicOrderRef)}`);
        },
        modal: {
          ondismiss: () =>
            setError(
              "Payment was not completed. Tap “Proceed to payment” to try again, or switch to cash on delivery if available."
            )
        }
      });
      razorpay.open();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f8f5f6] py-10">
        <div className="section-shell max-w-3xl text-sm text-zinc-500">Loading…</div>
      </main>
    );
  }

  if (isAuthenticated && !cartHydrated) {
    return (
      <main className="min-h-screen bg-[#f8f5f6] py-10">
        <div className="section-shell max-w-3xl text-sm text-zinc-500">Loading your bag…</div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#f8f5f6] py-10">
        <div className="section-shell max-w-3xl text-sm text-zinc-600">
          Redirecting to sign in so you can complete checkout…
        </div>
      </main>
    );
  }

  if (isStaff) {
    return (
      <main className="min-h-screen bg-[#f8f5f6] py-10">
        <div className="section-shell max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-950">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold">Checkout unavailable</h1>
          <p className="mt-2 text-sm">Staff accounts cannot place orders. Use admin inventory or view the storefront.</p>
          <Link href="/admin" className="mt-6 inline-block text-sm font-semibold text-crown-900 underline">
            Go to admin
          </Link>
        </div>
      </main>
    );
  }

  const proceedCtaLabel =
    loading
      ? "Processing…"
      : paymentMethod === ""
        ? "Choose payment method"
        : paymentMethod === "CASH_ON_DELIVERY"
          ? "Place order"
          : "Proceed to payment";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f5f6] py-10">
      <div className="section-shell max-w-6xl overflow-x-hidden">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Checkout
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Signed in as <span className="font-medium text-zinc-800">{email}</span>.{" "}
          <Link href="/auth/signin?callbackUrl=%2Fcheckout" className="text-crown-800 underline">
            Switch account
          </Link>
        </p>

        {items.length === 0 ? (
          <p className="mt-8 text-zinc-600">
            Nothing to checkout.{" "}
            <Link href="/shop" className="text-crown-800 underline">
              Shop
            </Link>
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10"
          >
            <div className="min-w-0 space-y-8">
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 bg-zinc-50/90 px-4 py-3">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Order items</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-left text-sm sm:min-w-[640px]">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-white">
                        <th className="px-4 py-3 font-semibold text-zinc-600">Item</th>
                        <th className="whitespace-nowrap px-4 py-3 text-base font-semibold text-zinc-700 md:text-lg">
                          Price
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 font-semibold text-zinc-600">Qty</th>
                        <th className="whitespace-nowrap px-4 py-3 text-right text-base font-semibold text-zinc-700 md:text-lg">
                          Subtotal
                        </th>
                        <th className="w-24 px-2 py-3 text-right font-semibold text-zinc-500">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((line) => {
                        const img = line.imageUrl ?? "/branding/mc-loader-logo.png";
                        const lineSubtotal = line.price * line.quantity;
                        const productHref = line.slug ? `/product/${line.slug}` : null;
                        return (
                          <tr key={line.lineKey} className="border-b border-zinc-100 last:border-b-0">
                            <td className="align-top min-w-0 max-w-[min(100%,36rem)] px-3 py-4 sm:px-4 sm:py-5">
                              <div className="flex w-full min-w-0 gap-3 sm:gap-5">
                                <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50 sm:h-32 sm:w-28">
                                  <Image
                                    src={img}
                                    alt={line.name}
                                    fill
                                    sizes="112px"
                                    className="object-contain"
                                    unoptimized
                                  />
                                </div>
                                <div className="min-w-0 flex-1 space-y-2 py-0.5">
                                  <p className="text-base font-bold leading-snug tracking-tight text-zinc-950 sm:text-xl md:text-2xl">
                                    {line.name}
                                  </p>
                                  {(line.size || line.color) && (
                                    <p className="max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
                                      {line.size ? (
                                        <>
                                          <span className="font-medium text-zinc-500">Size </span>
                                          <span className="font-bold text-zinc-900">{line.size}</span>
                                        </>
                                      ) : null}
                                      {line.size && line.color ? (
                                        <span className="mx-1.5 font-normal text-zinc-300">·</span>
                                      ) : null}
                                      {line.color ? (
                                        <>
                                          <span className="font-medium text-zinc-500">Color </span>
                                          <span className="font-semibold text-zinc-800">{line.color}</span>
                                        </>
                                      ) : null}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 pt-1 md:hidden">
                                    <span className="text-xs font-medium text-zinc-500">Rs {line.price} each</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="align-top whitespace-nowrap px-4 py-5 text-base font-semibold tabular-nums text-zinc-900 sm:text-lg md:text-xl">
                              Rs {line.price.toFixed(0)}
                            </td>
                            <td className="align-top px-4 py-5">
                              <div className="inline-flex items-stretch rounded-full border border-zinc-300 bg-white">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  onClick={() => updateQuantity(line.lineKey, line.quantity - 1)}
                                  className="flex h-9 w-9 items-center justify-center rounded-l-full text-zinc-800 transition hover:bg-zinc-50"
                                >
                                  <Minus className="h-4 w-4" strokeWidth={2} />
                                </button>
                                <span className="flex min-w-[2.5rem] items-center justify-center border-x border-zinc-300 px-2 text-sm font-semibold tabular-nums">
                                  {line.quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  disabled={line.maxStock != null && line.quantity >= line.maxStock}
                                  onClick={() => updateQuantity(line.lineKey, line.quantity + 1)}
                                  className="flex h-9 w-9 items-center justify-center rounded-r-full text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Plus className="h-4 w-4" strokeWidth={2} />
                                </button>
                              </div>
                            </td>
                            <td className="align-top whitespace-nowrap px-4 py-5 text-right text-base font-bold tabular-nums text-zinc-950 sm:text-lg md:text-xl">
                              Rs {lineSubtotal.toFixed(0)}
                            </td>
                            <td className="align-top px-2 py-5">
                              <div className="flex justify-end gap-1">
                                {productHref ? (
                                  <Link
                                    href={productHref}
                                    className="rounded p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                                    aria-label="Edit on product page"
                                  >
                                    <Pencil className="h-4 w-4" strokeWidth={1.5} />
                                  </Link>
                                ) : null}
                                <button
                                  type="button"
                                  className="rounded p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                                  aria-label="Remove from bag"
                                  onClick={() => removeItem(line.lineKey)}
                                >
                                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">Contact & shipping</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Inventory is reserved only when your order is placed. Totals and promo are confirmed on the server.
              </p>

              {!profileLoaded && (
                <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-600">
                  Loading your saved addresses…
                </p>
              )}

              {profileLoaded && hasSaved && (
                <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Delivery address</p>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="addrMode"
                      className="mt-1"
                      checked={addressMode === "saved"}
                      onChange={() => setAddressMode("saved")}
                    />
                    <span className="text-sm text-zinc-800">Use a saved address</span>
                  </label>
                  {addressMode === "saved" && (
                    <select
                      className="ml-7 w-full max-w-lg min-h-[2.75rem] rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base leading-normal text-zinc-900"
                      value={selectedSavedId ?? ""}
                      onChange={(e) => setSelectedSavedId(e.target.value || null)}
                    >
                      {profileAddresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {savedSummary(a)}
                        </option>
                      ))}
                    </select>
                  )}
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="radio"
                      name="addrMode"
                      className="mt-1"
                      checked={addressMode === "new"}
                      onChange={() => setAddressMode("new")}
                    />
                    <span className="text-sm text-zinc-800">Create new address</span>
                  </label>
                </div>
              )}

              {profileLoaded && !hasSaved && (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Delivery address</p>
                  <p className="mt-1 text-sm text-zinc-700">
                    No saved addresses yet. Enter your delivery details below.
                  </p>
                </div>
              )}

              {profileLoaded && addressMode === "new" && (
              <div className="mt-4 grid gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-500">Full name</label>
                  <input
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="As on ID / for delivery"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-500">Email</label>
                  <input
                    readOnly
                    className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                    value={email}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-zinc-500">Phone</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <select
                      className="w-[min(8rem,32%)] shrink-0 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm"
                      value={phoneDial}
                      onChange={(e) => setPhoneDial(e.target.value)}
                      aria-label="Country code"
                    >
                      {PHONE_DIAL_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      placeholder="Phone number"
                      value={phoneLocal}
                      onChange={(e) => setPhoneLocal(e.target.value)}
                      inputMode="tel"
                    />
                  </div>
                </div>
                <div className="relative col-span-full">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Search address
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </span>
                    <input
                      type="search"
                      autoComplete="off"
                      className="w-full rounded-full border-2 border-zinc-200 bg-zinc-50 py-3 pl-12 pr-4 text-sm shadow-inner outline-none ring-crown-800/20 transition placeholder:text-zinc-400 focus:border-crown-700 focus:bg-white focus:ring-4"
                      placeholder="Search street, area, landmark, or city…"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSuggestOpen(true);
                      }}
                      onFocus={() => setSuggestOpen(true)}
                      onBlur={() => {
                        setTimeout(() => {
                          if (!skipSuggestClose.current) setSuggestOpen(false);
                          skipSuggestClose.current = false;
                        }, 180);
                      }}
                    />
                  </div>
                  {suggestOpen && suggestions.length > 0 && (
                    <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 text-sm shadow-xl">
                      {suggestions.map((f, i) => {
                        const p = f.properties ?? {};
                        const label =
                          [p.name, p.street, p.city, p.postcode].filter(Boolean).join(", ") || `Result ${i + 1}`;
                        return (
                          <li key={i}>
                            <button
                              type="button"
                              className="w-full px-4 py-2.5 text-left hover:bg-zinc-50"
                              onMouseDown={() => {
                                skipSuggestClose.current = true;
                              }}
                              onClick={() => applySuggestion(f)}
                            >
                              {String(label)}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <input
                  required
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Street / house & road"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
                <input
                  required
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Area / locality"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    required
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="Town / district"
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                  />
                  <input
                    required
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <input
                  required
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="PIN / postal code"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
              )}

              {profileLoaded && addressMode === "new" && (
                <div className="mt-6 border-t border-zinc-200 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Label this address</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="saveKind"
                        checked={saveKind === "home"}
                        onChange={() => setSaveKind("home")}
                      />
                      Home
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="saveKind"
                        checked={saveKind === "work"}
                        onChange={() => setSaveKind("work")}
                      />
                      Work
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="saveKind"
                        checked={saveKind === "other"}
                        onChange={() => setSaveKind("other")}
                      />
                      Other
                    </label>
                  </div>
                  {saveKind === "other" && (
                    <input
                      className="mt-3 w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      placeholder="Name for this address (e.g. Parents&apos; house)"
                      value={otherLabel}
                      onChange={(e) => setOtherLabel(e.target.value)}
                    />
                  )}
                </div>
              )}
              </div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-28">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Promo &amp; coupons</h2>
                <div className="mt-4">
                  <BagPromoSection productIds={couponProductIds} />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-6 shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Order summary</h2>

                <div className="mt-5 space-y-0 border-b border-zinc-200/80 pb-4">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-zinc-600">Subtotal (items)</span>
                    <span className="min-w-[6.5rem] shrink-0 text-right text-base font-semibold tabular-nums text-zinc-900">
                      Rs {subtotal.toFixed(0)}
                    </span>
                  </div>
                </div>

                {couponCode ? (
                  <div className="mt-4 border-t border-dashed border-zinc-300 pt-4">
                    <BagPromoAppliedRow discountAmount={subtotal - discountedTotal} layout="bill" />
                  </div>
                ) : null}

                <div
                  className={`flex items-baseline justify-between gap-4 border-t border-zinc-200/80 pt-4 ${
                    couponCode ? "mt-4" : ""
                  }`}
                >
                  <span className="text-base font-semibold text-zinc-900">Total payable</span>
                  <span className="min-w-[6.5rem] shrink-0 text-right text-xl font-bold tabular-nums tracking-tight text-zinc-950 sm:text-2xl">
                    Rs {discountedTotal.toFixed(0)}
                  </span>
                </div>

                <label className="mt-8 block text-xs font-semibold uppercase text-zinc-500">Payment method</label>
                <select
                  className="mt-1.5 w-full min-h-[2.75rem] rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base leading-normal text-zinc-900"
                  required
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as "" | "CASH_ON_DELIVERY" | "UPI")
                  }
                >
                  <option value="" disabled>
                    Select cash on delivery or UPI
                  </option>
                  {paymentOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>

                {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading || !profileLoaded || paymentMethod === ""}
                  className="mt-6 w-full rounded-lg bg-crown-800 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-crown-900 disabled:opacity-50"
                >
                  {proceedCtaLabel}
                </button>
              </div>
              {similarProducts.length > 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    View similar products
                  </h2>
                  <div className="mt-4 grid gap-4">
                    {similarProducts.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        outOfStock={getProductTotalStock(p.variants ?? []) === 0}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}
