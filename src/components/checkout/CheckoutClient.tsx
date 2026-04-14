"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { photonFeatureToAddress } from "@/lib/photon-address";
import type { SavedAddress } from "@/types/profile";

const paymentOptions = [
  { value: "CASH_ON_DELIVERY", label: "Cash on delivery" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Credit / Debit card" },
  { value: "NETBANKING", label: "Netbanking" },
  { value: "WALLET", label: "Wallets" }
];

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

export function CheckoutClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, subtotal, discountedTotal, couponCode, clearCart, cartHydrated, flushCart } = useCart();

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
  const [addressMode, setAddressMode] = useState<"saved" | "new">("new");
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [saveKind, setSaveKind] = useState<"none" | "home" | "work" | "other">("none");
  const [otherLabel, setOtherLabel] = useState("");
  const [replaceHomeConfirmed, setReplaceHomeConfirmed] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = session?.user?.email ?? "";

  const isStaff = useMemo(
    () =>
      session?.user?.role === "ADMIN" ||
      session?.user?.role === "SUB_ADMIN" ||
      session?.user?.role === "TECH_SUPPORT",
    [session?.user?.role]
  );

  const hasSaved = profileAddresses.length > 0;
  const hasHome = useMemo(() => profileAddresses.some((a) => a.kind === "home"), [profileAddresses]);

  useEffect(() => {
    if (status === "unauthenticated") {
      flushCart();
      router.replace("/auth/signin?callbackUrl=" + encodeURIComponent("/checkout"));
    }
  }, [flushCart, router, status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetch("/api/user/profile")
      .then((r) => r.json())
      .then(
        (d: {
          addresses?: unknown;
          phone?: string;
        }) => {
          const raw = Array.isArray(d.addresses) ? d.addresses : [];
          const list: SavedAddress[] = [];
          for (const x of raw) {
            if (!x || typeof x !== "object") continue;
            const o = x as Record<string, unknown>;
            list.push({
              id: typeof o.id === "string" && o.id ? o.id : crypto.randomUUID(),
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
            setAddressMode("saved");
            setSelectedSavedId(list[0]!.id);
          }
          if (d.phone && typeof d.phone === "string") {
            const digits = d.phone.replace(/\D/g, "");
            if (digits.length >= 10) setPhoneLocal(digits.slice(-10));
          }
        }
      )
      .catch(() => {})
      .finally(() => setProfileLoaded(true));
  }, [status]);

  useEffect(() => {
    if (addressMode === "saved") {
      setSaveKind("none");
      setReplaceHomeConfirmed(false);
    }
  }, [addressMode]);

  useEffect(() => {
    if (saveKind !== "home") setReplaceHomeConfirmed(false);
  }, [saveKind]);

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
    if (session?.user?.name && !prefilledName.current) {
      setFullName(session.user.name);
      prefilledName.current = true;
    }
  }, [session?.user?.name]);

  useEffect(() => {
    if (status === "authenticated" && isStaff) {
      router.replace("/admin");
    }
  }, [isStaff, router, status]);

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
    if (addressMode === "new" && saveKind === "home" && hasHome && !replaceHomeConfirmed) {
      setError('A home address is already saved. Check "Replace existing home address" below, then place order again.');
      return;
    }

    const savePayload =
      addressMode === "new" && saveKind !== "none"
        ? {
            kind: saveKind,
            customLabel: saveKind === "other" ? otherLabel.trim() : undefined,
            replaceHomeConfirmed: saveKind === "home" && hasHome ? replaceHomeConfirmed : false
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
            color: i.color ?? ""
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
      const data = (await res.json()) as { orderId?: string; error?: string; message?: string };
      if (!res.ok) {
        if (res.status === 409 && data.error === "HOME_EXISTS") {
          setError(data.message ?? "Confirm replacing your saved home address, then submit again.");
          setLoading(false);
          return;
        }
        setError(typeof data.error === "string" ? data.error : "Checkout failed");
        return;
      }
      clearCart();
      router.push(`/checkout/confirmation?orderId=${data.orderId}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#f8f5f6] py-10">
        <div className="section-shell max-w-3xl text-sm text-zinc-500">Loading…</div>
      </main>
    );
  }

  if (status === "authenticated" && !cartHydrated) {
    return (
      <main className="min-h-screen bg-[#f8f5f6] py-10">
        <div className="section-shell max-w-3xl text-sm text-zinc-500">Loading your bag…</div>
      </main>
    );
  }

  if (status === "unauthenticated") {
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

  return (
    <main className="min-h-screen bg-[#f8f5f6] py-10">
      <div className="section-shell max-w-3xl">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900">Checkout</h1>
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
          <form onSubmit={onSubmit} className="mt-8 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Contact & shipping</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Inventory is reserved only when your order is placed. Totals and promo are confirmed on the server.
              </p>

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
                      className="ml-7 w-full max-w-lg rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
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
                    <span className="text-sm text-zinc-800">Enter a new address</span>
                  </label>
                </div>
              )}

              {addressMode === "new" && (
                <>
                  <div className="relative mt-4">
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
                </>
              )}

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

              {addressMode === "new" && (
                <div className="mt-6 border-t border-zinc-200 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Save this address</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Optional. One &quot;Home&quot; address per account. You can replace an existing home address below.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="saveKind"
                        checked={saveKind === "none"}
                        onChange={() => setSaveKind("none")}
                      />
                      Don&apos;t save
                    </label>
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
                  {saveKind === "home" && hasHome && (
                    <label className="mt-3 flex items-start gap-2 text-sm text-zinc-800">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={replaceHomeConfirmed}
                        onChange={(e) => setReplaceHomeConfirmed(e.target.checked)}
                      />
                      <span>I understand this replaces my current saved home address.</span>
                    </label>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-zinc-500">Payment method</label>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {paymentOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-zinc-500">
                Online methods are simulated in this demo. COD orders stay pending until you confirm payment on dispatch.
              </p>
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Subtotal</span>
                <span>Rs {subtotal.toFixed(0)}</span>
              </div>
              {couponCode ? (
                <div className="mt-1 flex justify-between text-sm text-green-700">
                  <span>Promo ({couponCode})</span>
                  <span>− Rs {(subtotal - discountedTotal).toFixed(0)}</span>
                </div>
              ) : null}
              <div className="mt-3 flex justify-between text-lg font-semibold text-zinc-900">
                <span>Order total</span>
                <span>Rs {discountedTotal.toFixed(0)}</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Final amount is calculated on the server; invalid coupons are rejected at payment.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-crown-800 py-3 text-sm font-semibold text-white hover:bg-crown-900 disabled:opacity-50"
            >
              {loading ? "Placing order…" : "Place order"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
