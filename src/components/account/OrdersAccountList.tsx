import Image from "next/image";
import Link from "next/link";
import { getProductDisplayImage } from "@/lib/product-image-display";
import {
  isPendingUpiPayment,
  isUsefulTrackingUrl,
  matchesAccountOrderFilter,
  orderStatusBadge,
  type AccountOrderFilter
} from "@/lib/account-orders";
import { encodeOrderRefForUrl } from "@/lib/order-public-ref";

const FILTER_TABS: { id: AccountOrderFilter; label: string }[] = [
  { id: "all", label: "All orders" },
  { id: "processing", label: "Processing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "returns", label: "Returns" }
];

const PENDING_POLICY_SNIPPET =
  "Unpaid or pending UPI orders are removed from this list after 7 days and may be cancelled if not paid.";

type OrderRow = {
  id: string;
  publicOrderRef: string | null;
  status: string;
  /** UPI + PENDING = awaiting payment; excluded from "Processing" filter. */
  paymentMethod: string | null;
  createdAt: string;
  totalAmount: number;
  trackingUrl: string | null;
  items: Array<{
    id: string;
    quantity: number;
    product: {
      name: string;
      imageUrls: string[] | null;
      listImageIndex: number | null;
    } | null;
  }>;
};

function countForFilter(orders: OrderRow[], f: AccountOrderFilter): number {
  if (f === "all") return orders.length;
  return orders.filter((o) => matchesAccountOrderFilter(o, f)).length;
}

export function OrdersAccountList({
  orders,
  activeFilter
}: {
  orders: OrderRow[];
  activeFilter: AccountOrderFilter;
}) {
  const filtered = orders.filter((o) => matchesAccountOrderFilter(o, activeFilter));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            My orders
          </h1>
          <p className="mt-1 text-sm text-zinc-600">Track shipments and manage returns.</p>
        </div>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 self-start text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline sm:self-auto"
        >
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
          Continue shopping
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin [-webkit-overflow-scrolling:touch]">
        {FILTER_TABS.map((tab) => {
          const count = countForFilter(orders, tab.id);
          const active = activeFilter === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.id === "all" ? "/account/orders" : `/account/orders?filter=${tab.id}`}
              scroll={false}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-zinc-950 text-white shadow-sm"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 tabular-nums ${active ? "text-zinc-300" : "text-zinc-400"}`}>({count})</span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-200 bg-white px-6 py-14 text-center">
          <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900">
            No orders in this view
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            {activeFilter === "returns"
              ? "Return requests are available for shipped or delivered orders. See our returns policy for details."
              : "When you place an order, it will appear here."}
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex rounded-full bg-crown-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-crown-900"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {filtered.map((order) => {
            const badge = orderStatusBadge(order);
            const first = order.items[0];
            const product = first?.product;
            const img = product
              ? getProductDisplayImage({
                  imageUrls: product.imageUrls ?? [],
                  listImageIndex: product.listImageIndex ?? 0
                }).url
              : "/branding/mc-loader-logo.png";
            const lineCount = order.items.length;
            const itemLabel = lineCount === 1 ? "1 item" : `${lineCount} items`;
            const showPendingNote = isPendingUpiPayment(order);
            const refLabel = order.publicOrderRef ?? "Order";
            const detailHref = order.publicOrderRef
              ? `/account/orders/${encodeOrderRefForUrl(order.publicOrderRef)}`
              : null;
            const canTrack = isUsefulTrackingUrl(order.trackingUrl);

            return (
              <li
                key={order.publicOrderRef ?? order.id}
                className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4 sm:px-5">
                  <div>
                    <p className="font-mono text-sm font-semibold text-zinc-950">{refLabel}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                <div className="flex gap-4 px-4 py-4 sm:px-5">
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                    <Image
                      src={img}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="72px"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-zinc-900">{product?.name ?? "Your order"}</p>
                    <p className="mt-0.5 text-sm text-zinc-500">{itemLabel}</p>
                    <p className="mt-2 font-semibold tabular-nums text-crown-800">Rs {order.totalAmount.toFixed(0)}</p>
                  </div>
                </div>

                {showPendingNote && (
                  <div className="mx-4 mb-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-xs leading-relaxed text-amber-950 sm:mx-5">
                    <span className="font-semibold">Payment needed:</span> {PENDING_POLICY_SNIPPET}{" "}
                    {detailHref ? (
                      <Link href={detailHref} className="font-semibold text-crown-900 underline underline-offset-2">
                        View details
                      </Link>
                    ) : null}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 px-4 py-4 sm:px-5">
                  {canTrack ? (
                    <a
                      href={order.trackingUrl!}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-zinc-900 bg-white px-4 py-2.5 text-center text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50 sm:min-h-0 sm:flex-none sm:px-8"
                    >
                      Track order
                    </a>
                  ) : (
                    <span
                      title="Tracking is available once your order ships."
                      className="inline-flex min-h-[44px] flex-1 cursor-not-allowed items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-center text-sm font-semibold text-zinc-400 sm:min-h-0 sm:flex-none sm:px-8"
                    >
                      Track order
                    </span>
                  )}
                  {detailHref ? (
                    <Link
                      href={detailHref}
                      className="ml-auto text-sm font-semibold text-crown-900 underline-offset-4 hover:underline"
                    >
                      Details
                    </Link>
                  ) : (
                    <span className="ml-auto text-xs text-zinc-400">Details unavailable</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
