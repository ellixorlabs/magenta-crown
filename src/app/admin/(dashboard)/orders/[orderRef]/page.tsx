import Link from "next/link";
import { notFound } from "next/navigation";
import { normalizePublicOrderRef } from "@/lib/order-public-ref";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { NextAppPageParams } from "@/types/next-app";

type Addr = Record<string, unknown>;

function isPlainObject(v: unknown): v is Addr {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function formatAddress(json: unknown): { lines: string[]; pairs: { k: string; v: string }[] } {
  if (!isPlainObject(json)) return { lines: [], pairs: [] };
  const skip = new Set(["lat", "lng", "countryCode"]);
  const pairs: { k: string; v: string }[] = [];
  for (const [k, v] of Object.entries(json)) {
    if (skip.has(k)) continue;
    if (v == null || v === "") continue;
    const s = typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : "";
    if (!s) continue;
    const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
    pairs.push({ k: label, v: s });
  }
  const fullName = typeof json.fullName === "string" ? json.fullName : "";
  const street = typeof json.street === "string" ? json.street : "";
  const city = typeof json.city === "string" ? json.city : "";
  const pin = typeof json.pincode === "string" ? json.pincode : typeof json.postalCode === "string" ? json.postalCode : "";
  const lines = [fullName, street, [city, pin].filter(Boolean).join(" ")].filter(Boolean);
  return { lines, pairs };
}

type PageProps = NextAppPageParams<{ orderRef: string }>;

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { orderRef: orderRefParam } = await params;
  const ref = normalizePublicOrderRef(orderRefParam);
  if (!ref) {
    notFound();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: order, error } = await (supabase.from("Order") as any)
    .select("*,items:OrderItem(*,product:Product(name,slug,styleCode)),user:User(id,email,name)")
    .eq("publicOrderRef", ref)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!order) {
    notFound();
  }
  const lineItems = (order.items ?? []) as any[];

  const { lines: addrLines, pairs: addrPairs } = formatAddress(order.shippingAddress);

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Order</p>
          <h2 className="mt-1 break-all text-xl font-semibold tracking-tight text-zinc-900">
            {order.publicOrderRef ? (
              <span className="font-mono">{order.publicOrderRef}</span>
            ) : (
              <span className="font-mono text-base text-zinc-600">Legacy order (no public ref)</span>
            )}
          </h2>
        </div>
        <Link
          href="/admin/orders"
          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          ← All orders
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Status & totals</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Status</dt>
              <dd className="font-medium text-zinc-900">{order.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Placed at</dt>
                <dd className="break-all text-right font-medium text-zinc-900">
                {new Date(order.createdAt).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Payment</dt>
                <dd className="break-all text-right text-zinc-800">{order.paymentMethod ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Subtotal</dt>
              <dd className="tabular-nums text-zinc-800">Rs {order.subtotalBeforeDiscount.toFixed(0)}</dd>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Discount</dt>
                <dd className="tabular-nums text-zinc-800">
                  −Rs {order.discountAmount.toFixed(0)}
                  {order.couponCode ? ` (${order.couponCode})` : ""}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-zinc-100 pt-3">
              <dt className="font-medium text-zinc-700">Total</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">Rs {order.totalAmount.toFixed(0)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Customer</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Account</dt>
              <dd className="text-right text-zinc-800">
                {order.user ? (
                  <>
                    <span className="font-medium">{order.user.name ?? "—"}</span>
                    <br />
                    <span className="text-zinc-600">{order.user.email}</span>
                  </>
                ) : (
                  <span className="text-zinc-500">No linked user</span>
                )}
              </dd>
            </div>
            {order.guestEmail && (
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Guest email</dt>
                <dd className="text-right text-zinc-800">{order.guestEmail}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Shipping address</h3>
        {addrLines.length > 0 ? (
          <address className="mt-3 not-italic text-sm leading-relaxed text-zinc-800">
            {addrLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        ) : null}
        {addrPairs.length > 0 && (
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {addrPairs.map(({ k, v }) => (
              <div key={k} className="flex flex-col rounded-lg bg-zinc-50 px-3 py-2">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{k}</dt>
                <dd className="mt-0.5 break-words text-zinc-800">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {!addrLines.length && !addrPairs.length && (
          <p className="mt-3 text-sm text-zinc-500">No address on file for this order.</p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Line items</h3>
        <ul className="mt-4 divide-y divide-zinc-100 text-sm">
          {lineItems.map((item: any) => {
            const code =
              (typeof item.styleCode === "string" && item.styleCode.trim()) ||
              (typeof item.product?.styleCode === "string" && item.product.styleCode.trim()) ||
              null;
            return (
            <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
              <div className="min-w-0">
                <p className="font-medium text-zinc-900">{item.product.name}</p>
                <p className="mt-0.5 font-mono text-xs font-semibold tracking-wide text-zinc-700">
                  Style code: {code ?? "—"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Qty {item.quantity}
                  {(item.size || item.color) && (
                    <>
                      {" "}
                      · {[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(", ")}
                    </>
                  )}
                </p>
                <Link
                  href={`/product/${item.product.slug}`}
                  className="mt-1 inline-block text-xs font-semibold text-admin-700 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on storefront
                </Link>
              </div>
              <p className="shrink-0 tabular-nums font-medium text-zinc-900">
                Rs {(item.price * item.quantity).toFixed(0)}
              </p>
            </li>
            );
          })}
        </ul>
      </section>

      {(order.trackingUrl || order.invoiceUrl) && (
        <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-zinc-900">Links</h3>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {order.trackingUrl && (
              <a
                href={order.trackingUrl}
                className="font-medium text-admin-700 underline"
                target="_blank"
                rel="noreferrer"
              >
                Tracking
              </a>
            )}
            {order.invoiceUrl && (
              <a
                href={order.invoiceUrl}
                className="font-medium text-admin-700 underline"
                target="_blank"
                rel="noreferrer"
              >
                Invoice
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
