import Image from "next/image";
import Link from "next/link";
import { getProductDisplayImage } from "@/lib/product-image-display";

type ShippingJson = Record<string, unknown>;

function isPlainObject(v: unknown): v is ShippingJson {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function formatShippingLines(json: unknown): string[] {
  if (!isPlainObject(json)) return [];
  const fullName = typeof json.fullName === "string" ? json.fullName.trim() : "";
  const street = typeof json.street === "string" ? json.street.trim() : "";
  const area = typeof json.area === "string" ? json.area.trim() : "";
  const town = typeof json.town === "string" ? json.town.trim() : "";
  const city = typeof json.city === "string" ? json.city.trim() : "";
  const pin = typeof json.pincode === "string" ? json.pincode.trim() : "";
  const phone = typeof json.phone === "string" ? json.phone.trim() : "";
  const line2 = [area, town].filter(Boolean).join(", ");
  const cityLine = [city, pin].filter(Boolean).join(" ");
  const lines = [fullName, street, line2 || undefined, cityLine, phone].filter(Boolean) as string[];
  return lines;
}

function formatDeliveryWindow(placedAt: Date): string {
  const start = new Date(placedAt);
  start.setDate(start.getDate() + 5);
  const end = new Date(placedAt);
  end.setDate(end.getDate() + 12);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-IN", opts)} – ${end.toLocaleDateString("en-IN", opts)}`;
}

function paymentLabel(pm: string | null | undefined): string {
  if (pm === "UPI") return "UPI";
  if (pm === "CASH_ON_DELIVERY") return "Cash on delivery";
  return pm?.replace(/_/g, " ") ?? "—";
}

function isUsefulTrackingUrl(url: string | null | undefined): url is string {
  if (!url || url === "#") return false;
  try {
    const u = new URL(url);
    return u.hostname !== "example.com";
  } catch {
    return url.length > 0 && !url.startsWith("https://example.com");
  }
}

export type ConfirmationOrderPayload = {
  publicOrderRef: string | null;
  createdAt: string;
  subtotalBeforeDiscount: number;
  discountAmount: number;
  totalAmount: number;
  couponCode: string | null;
  paymentMethod: string | null;
  trackingUrl: string | null;
  shippingAddress: unknown;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    size: string | null;
    color: string | null;
    product: {
      name: string;
      slug: string;
      imageUrls: string[] | null;
      listImageIndex: number | null;
    } | null;
  }>;
};

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <path
        d="M8 12.5l2.5 2.5L16 9"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16h5l3 3v-6h-5M13 16H4"
      />
    </svg>
  );
}

export function OrderConfirmationView({ order }: { order: ConfirmationOrderPayload }) {
  const refDisplay = order.publicOrderRef ?? "—";
  const placedAt = new Date(order.createdAt);
  const deliveryWindow = formatDeliveryWindow(placedAt);
  const addrLines = formatShippingLines(order.shippingAddress);
  const ship = isPlainObject(order.shippingAddress) ? order.shippingAddress : null;
  const customerEmail = ship && typeof ship.email === "string" ? ship.email.trim() : "";

  const tracking = order.trackingUrl;
  const showTrackingCta = isUsefulTrackingUrl(tracking);

  return (
    <div className="min-h-screen bg-[#f5f3f4]">
      {/* Hero band — subtle pattern & gradient */}
      <div className="relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-b from-zinc-200/50 via-[#ebe8ea] to-[#f5f3f4]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          aria-hidden
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%2378716c' fill-opacity='0.35'%3E%3Cpath fill-rule='evenodd' d='M40 0L45 10 55 12 47 20 48 30 40 25 32 30 33 20 25 12 35 10z'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "80px 80px"
          }}
        />
        <div className="section-shell relative max-w-5xl pb-6 pt-8 text-left md:pb-8 md:pt-10">
          {/* lg+: headline + cards row; below lg: stacked full-width — avoids flex squeeze (0-width text) beside two fixed cards */}
          <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-8 xl:gap-12">
            <div className="min-w-0 w-full lg:max-w-xl lg:flex-1">
              <div className="flex items-start gap-4 sm:items-center sm:gap-5">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center text-emerald-600 sm:h-14 sm:w-14">
                  <CheckIcon className="h-full w-full" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
                    Order placed
                  </p>
                  <h1 className="mt-2 break-words font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl md:text-[2.5rem] md:leading-tight">
                    Thank you for your order
                  </h1>
                  <p className="mt-3 max-w-lg text-base leading-relaxed text-zinc-600 sm:mt-4 sm:text-lg">
                    Your selection is being prepared with care. We will email you when it ships.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch sm:justify-center sm:gap-4 lg:ml-auto lg:w-auto lg:max-w-none lg:shrink-0 lg:justify-end xl:gap-5">
              <div className="w-full min-w-0 sm:max-w-[min(100%,20.5rem)] lg:max-w-[22rem]">
                <div className="h-full overflow-hidden rounded-xl border border-zinc-200/90 bg-white/95 shadow-sm backdrop-blur-sm">
                  <div className="px-4 py-3.5 text-left sm:py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Order reference</p>
                    <p className="mt-1.5 font-mono text-base font-semibold tabular-nums text-zinc-900 sm:text-lg">
                      {refDisplay}
                    </p>
                  </div>
                  <div className="border-t border-zinc-100 px-4 py-3.5 text-left sm:py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Estimated delivery
                    </p>
                    <p className="mt-1.5 text-base font-semibold tabular-nums text-zinc-900 sm:text-lg">{deliveryWindow}</p>
                    <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                      Typical window after dispatch; subject to location.
                    </p>
                  </div>
                </div>
              </div>

              <section className="w-full min-w-0 sm:max-w-[min(100%,20.5rem)] lg:max-w-[22rem]">
                <div className="h-full rounded-xl border border-zinc-200/90 bg-white/95 p-4 shadow-sm backdrop-blur-sm sm:p-5">
                  <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Delivery address</h2>
                  {addrLines.length > 0 ? (
                    <address className="mt-3 not-italic text-sm leading-relaxed text-zinc-800">
                      {addrLines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </address>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500">Address on file for this order.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <div className="section-shell max-w-5xl pb-14 pt-8 sm:pb-16 sm:pt-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
          {/* Order summary */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-zinc-900 sm:text-2xl">
              Order summary
            </h2>
            <ul className="mt-6 divide-y divide-zinc-100">
              {order.items.map((item) => {
                const p = item.product;
                const img = p
                  ? getProductDisplayImage({
                      imageUrls: p.imageUrls ?? [],
                      listImageIndex: p.listImageIndex ?? 0
                    }).url
                  : "/branding/mc-loader-logo.png";
                const lineTotal = item.price * item.quantity;
                return (
                  <li key={item.id} className="flex gap-4 py-5 first:pt-0">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
                      <Image
                        src={img}
                        alt={p?.name ?? "Product"}
                        fill
                        className="object-contain"
                        sizes="80px"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold leading-snug text-zinc-900">{p?.name ?? "Product"}</p>
                        <p className="shrink-0 tabular-nums text-base font-semibold text-zinc-900">
                          Rs {lineTotal.toFixed(0)}
                        </p>
                      </div>
                      <p className="mt-1.5 text-sm text-zinc-600">
                        {item.size ? (
                          <>
                            <span className="text-zinc-500">Size </span>
                            <span className="font-bold text-zinc-900">{item.size}</span>
                          </>
                        ) : null}
                        {item.size && item.color ? <span className="text-zinc-300"> | </span> : null}
                        {item.color ? (
                          <>
                            <span className="text-zinc-500">Color </span>
                            <span className="font-semibold text-zinc-800">{item.color}</span>
                          </>
                        ) : null}
                        {(item.size || item.color) && <span className="text-zinc-300"> | </span>}
                        <span className="font-medium text-zinc-800">Qty: {item.quantity}</span>
                      </p>
                      {p?.slug ? (
                        <Link
                          href={`/product/${p.slug}`}
                          className="mt-2 inline-block text-xs font-semibold text-crown-800 underline-offset-2 hover:underline"
                        >
                          View product
                        </Link>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 space-y-3 border-t border-zinc-200 pt-6 text-sm">
              <div className="flex justify-between gap-4 text-zinc-600">
                <span>Subtotal</span>
                <span className="tabular-nums text-zinc-800">Rs {order.subtotalBeforeDiscount.toFixed(0)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between gap-4 text-zinc-600">
                  <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                  <span className="tabular-nums text-emerald-700">−Rs {order.discountAmount.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 text-zinc-600">
                <span>Shipping</span>
                <span className="font-medium text-emerald-700">Complimentary</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-zinc-200 pt-4 text-base font-semibold text-zinc-900">
                <span>Total amount</span>
                <span className="tabular-nums">Rs {order.totalAmount.toFixed(0)}</span>
              </div>
              <p className="text-xs text-zinc-500">
                Payment: <span className="font-medium text-zinc-700">{paymentLabel(order.paymentMethod)}</span>
              </p>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="text-lg font-semibold text-zinc-900">Next steps</h2>
              <ul className="mt-5 space-y-5 text-sm leading-relaxed text-zinc-600">
                <li className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-zinc-400">
                    <MailIcon className="h-5 w-5" />
                  </span>
                  <span>
                    {customerEmail ? (
                      <>
                        A confirmation has been sent to{" "}
                        <span className="font-medium text-zinc-800">{customerEmail}</span>.
                      </>
                    ) : (
                      <>A confirmation email is on its way to your inbox.</>
                    )}
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-zinc-400">
                    <TruckIcon className="h-5 w-5" />
                  </span>
                  <span>
                    {showTrackingCta ? (
                      <>
                        Track your shipment:{" "}
                        <a
                          href={tracking}
                          className="font-semibold text-crown-800 underline underline-offset-2"
                          target="_blank"
                          rel="noreferrer"
                        >
                          View tracking
                        </a>
                        .
                      </>
                    ) : (
                      <>You will receive a tracking link once your order ships.</>
                    )}
                  </span>
                </li>
              </ul>

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href="/shop"
                  className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-950 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
                >
                  Shop more collections
                </Link>
                <Link
                  href="/account/orders"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-3.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                >
                  View my orders
                </Link>
              </div>
              <p className="mt-6 text-center text-xs text-zinc-500">
                Invoices and receipts appear in{" "}
                <Link href="/account/orders" className="font-medium text-crown-800 underline underline-offset-2">
                  My orders
                </Link>{" "}
                when available.
              </p>
            </section>
          </aside>
        </div>

        {/* Page footer strip */}
        <div className="relative mt-14 border-t border-zinc-200 pt-10">
          <div className="absolute left-1/2 top-0 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-[#f5f3f4] text-xs font-medium text-zinc-400">
            ?
          </div>
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm">
            <Link href="/support/shipping" className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
              Shipping policy
            </Link>
            <Link href="/support/returns" className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
              Returns &amp; exchanges
            </Link>
            <Link href="/support/contact" className="text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline">
              Contact us
            </Link>
          </nav>
          <p className="mt-8 text-center text-xs text-zinc-400">
            © {new Date().getFullYear()} Magenta Crown. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
