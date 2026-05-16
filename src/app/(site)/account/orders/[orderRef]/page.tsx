import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  isPendingUpiPayment,
  isStalePendingUpi,
  isUsefulTrackingUrl,
  orderStatusBadge
} from "@/lib/account-orders";
import { normalizePublicOrderRef } from "@/lib/order-public-ref";
import { OrderFulfillmentTimeline } from "@/components/account/OrderFulfillmentTimeline";
import { OrderReturnExchangeTimeline } from "@/components/account/OrderReturnExchangeTimeline";
import { OrderItemReturnExchangeForms } from "@/components/account/OrderItemReturnExchangeForms";
import { getProductDisplayImage } from "@/lib/product-image-display";
import { canRequestExchangeForLine, canRequestReturnForLine } from "@/lib/return-exchange-eligibility";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { NextAppPageParams } from "@/types/next-app";

const PAYMENT_POLICY_NOTICE =
  "Unpaid or pending orders will be cancelled and removed from your account after 7 days if payment is not completed.";

type PageProps = NextAppPageParams<{ orderRef: string }>;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderRef: raw } = await params;
  const ref = normalizePublicOrderRef(raw);
  return {
    title: ref ? `Order ${ref}` : "Order details",
    robots: { index: false, follow: true }
  };
}

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const { orderRef: raw } = await params;
  const ref = normalizePublicOrderRef(raw);
  if (!ref) {
    notFound();
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: order, error } = await (supabase.from("Order") as any)
    .select(
      "id,publicOrderRef,orderStatus,paymentStatus,paymentMethod,createdAt,deliveredAt,totalAmount,trackingUrl,invoiceUrl,trackingNumber,courierPartner,shippingAddress,items:OrderItem(id,productId,variantId,quantity,price,size,color,product:Product(name,slug,imageUrls,listImageIndex,returnable,exchangeable,returnWindowDays))"
    )
    .eq("publicOrderRef", ref)
    .eq("userId", session.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!order?.publicOrderRef) {
    notFound();
  }

  if (isStalePendingUpi(order)) {
    notFound();
  }

  const orderSnap = {
    orderStatus: String(order.orderStatus ?? ""),
    deliveredAt: (order.deliveredAt as string | null) ?? null,
    createdAt: String(order.createdAt)
  };
  const badge = orderStatusBadge(order);

  const [{ data: returnRows }, { data: exchangeRows }] = await Promise.all([
    (supabase.from("ReturnRequest") as any).select("orderItemId,status,createdAt").eq("orderId", order.id),
    (supabase.from("ExchangeRequest") as any).select("orderItemId,status,createdAt").eq("orderId", order.id)
  ]);
  const openReturns = (returnRows ?? []) as Array<{ orderItemId: string | null; status: string }>;
  const openExchanges = (exchangeRows ?? []) as Array<{ orderItemId: string | null; status: string }>;
  const returnTimeline = (returnRows ?? []) as Array<{ status: string; createdAt: string }>;
  const exchangeTimeline = (exchangeRows ?? []) as Array<{ status: string; createdAt: string }>;

  const items = (order.items ?? []) as Array<{
    id: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    price: number;
    size: string | null;
    color: string | null;
    product: {
      name: string;
      slug: string;
      imageUrls: string[] | null;
      listImageIndex: number | null;
      returnable: boolean;
      exchangeable: boolean;
      returnWindowDays: number;
    };
  }>;

  const productIds = [...new Set(items.map((i) => i.productId))];
  const { data: variantRows } = await (supabase.from("ProductVariant") as any)
    .select("id,productId,size,color,isActive,stock")
    .in("productId", productIds)
    .eq("isActive", true);

  const variantsByProduct = new Map<string, Array<{ id: string; size: string; color: string }>>();
  for (const row of (variantRows ?? []) as Array<{ id: string; productId: string; size: string; color: string }>) {
    const list = variantsByProduct.get(row.productId) ?? [];
    list.push({ id: row.id, size: row.size, color: row.color });
    variantsByProduct.set(row.productId, list);
  }

  const ship = order.shippingAddress as Record<string, unknown> | null;
  const shipName = ship && typeof ship.fullName === "string" ? ship.fullName : "";

  return (
    <div className="overflow-x-hidden">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
      >
        <span aria-hidden>←</span>
        All orders
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="break-all font-mono text-lg font-semibold text-zinc-950">{order.publicOrderRef}</p>
          <p className="mt-1 text-sm text-zinc-500">
            Placed{" "}
            {new Date(order.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {isPendingUpiPayment(order) && (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-950"
        >
          <p className="font-semibold text-amber-950">Payment required</p>
          <p className="mt-2 text-amber-950/95">{PAYMENT_POLICY_NOTICE}</p>
          <p className="mt-3">
            <Link href="/checkout" className="font-semibold text-crown-900 underline underline-offset-2">
              Return to checkout
            </Link>{" "}
            to complete payment with the same bag when you are ready.
          </p>
        </div>
      )}

      <OrderFulfillmentTimeline
        orderStatus={order.orderStatus}
        paymentStatus={order.paymentStatus}
        paymentMethod={order.paymentMethod}
      />

      <OrderReturnExchangeTimeline
        returns={(returnTimeline ?? []) as Array<{ status: string; createdAt: string }>}
        exchanges={(exchangeTimeline ?? []) as Array<{ status: string; createdAt: string }>}
      />

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900">Items</h2>
        <ul className="mt-4 divide-y divide-zinc-100">
          {items.map((item) => {
            const img = getProductDisplayImage({
              imageUrls: item.product.imageUrls ?? [],
              listImageIndex: item.product.listImageIndex ?? 0
            }).url;
            const productSnap = {
              returnable: !!item.product.returnable,
              exchangeable: !!item.product.exchangeable,
              returnWindowDays: Number(item.product.returnWindowDays ?? 7)
            };
            const canReturn = canRequestReturnForLine({
              order: orderSnap,
              product: productSnap,
              orderItemId: item.id,
              openReturns
            });
            const canExchange = canRequestExchangeForLine({
              order: orderSnap,
              product: productSnap,
              orderItemId: item.id,
              openExchanges
            });
            const exchangeVariants = (variantsByProduct.get(item.productId) ?? []).filter(
              (v) => v.id !== (item.variantId ?? "")
            );
            return (
              <li key={item.id} className="flex gap-4 py-4 first:pt-0">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                  <Image src={img} alt="" fill className="object-contain" sizes="80px" unoptimized />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="font-semibold text-zinc-900 underline-offset-2 hover:underline"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-1 break-words text-sm text-zinc-500">
                    Qty {item.quantity}
                    {(item.size || item.color) && (
                      <>
                        {" "}
                        · {[item.size && `Size ${item.size}`, item.color].filter(Boolean).join(", ")}
                      </>
                    )}
                  </p>
                  <p className="mt-1 font-medium tabular-nums text-crown-800">
                    Rs {(item.price * item.quantity).toFixed(0)}
                  </p>
                  <OrderItemReturnExchangeForms
                    publicOrderRef={order.publicOrderRef}
                    orderId={order.id}
                    orderItemId={item.id}
                    productName={item.product.name}
                    canReturn={canReturn}
                    canExchange={canExchange && exchangeVariants.length > 0}
                    exchangeVariants={exchangeVariants}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex justify-between border-t border-zinc-100 pt-4 text-base font-semibold text-zinc-900">
          <span>Total</span>
          <span className="tabular-nums text-crown-800">Rs {Number(order.totalAmount).toFixed(0)}</span>
        </div>
      </div>

      {(order.trackingNumber || order.courierPartner) && (
        <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700">
          {order.courierPartner ? (
            <p>
              <span className="text-zinc-500">Courier:</span>{" "}
              <span className="font-medium text-zinc-900">{String(order.courierPartner)}</span>
            </p>
          ) : null}
          {order.trackingNumber ? (
            <p className={order.courierPartner ? "mt-1" : ""}>
              <span className="text-zinc-500">Tracking #:</span>{" "}
              <span className="font-mono font-medium text-zinc-900">{String(order.trackingNumber)}</span>
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {isUsefulTrackingUrl(order.trackingUrl) ? (
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-zinc-900 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 sm:flex-none sm:min-w-[200px]"
          >
            Open tracking link
          </a>
        ) : (
          <span className="inline-flex flex-1 cursor-not-allowed items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-400 sm:flex-none sm:min-w-[200px]">
            Tracking link when shipped
          </span>
        )}
        {order.invoiceUrl ? (
          <a
            href={order.invoiceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Download invoice
          </a>
        ) : (
          <span
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-400"
            title="Invoice generation is not wired yet"
          >
            Invoice — coming soon
          </span>
        )}
      </div>

      <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900">
          Shipping address
        </h2>
        {shipName || ship ? (
          <div className="mt-3 text-sm leading-relaxed text-zinc-700">
            {shipName ? <span className="block font-medium text-zinc-900">{shipName}</span> : null}
            {typeof ship?.street === "string" && <span className="mt-1 block">{String(ship.street)}</span>}
            {typeof ship?.city === "string" && typeof ship?.pincode === "string" && (
              <span className="block">
                {String(ship.city)}, {String(ship.pincode)}
              </span>
            )}
            {typeof ship?.phone === "string" && <span className="mt-2 block text-zinc-500">{String(ship.phone)}</span>}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">Address on file for this order.</p>
        )}
      </div>

      <Link href="/support/returns" className="mt-8 inline-block text-sm font-semibold text-crown-900 underline">
        Return or exchange policy
      </Link>
    </div>
  );
}
