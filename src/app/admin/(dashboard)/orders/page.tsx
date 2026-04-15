import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      items: { include: { product: true } },
      user: { select: { email: true, name: true } }
    }
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        Latest 100 orders. For revenue and product analytics, use{" "}
        <Link href="/admin" className="font-medium text-admin-700 hover:underline">
          Overview
        </Link>
        .
      </p>
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-2xl border border-zinc-200/90 bg-white p-4 text-sm shadow-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="font-mono text-xs">{o.id}</span>
              <span className="text-zinc-600">{new Date(o.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-zinc-700">
              {o.status} · Rs {o.totalAmount.toFixed(0)}
              {o.discountAmount > 0 ? (
                <span className="text-zinc-500">
                  {" "}
                  (subtotal Rs {o.subtotalBeforeDiscount.toFixed(0)}, discount −Rs {o.discountAmount.toFixed(0)}
                  {o.couponCode ? `, ${o.couponCode}` : ""})
                </span>
              ) : null}{" "}
              · {o.user?.email ?? o.guestEmail ?? "Guest"}
            </p>
            {o.trackingUrl && (
              <a href={o.trackingUrl} className="mt-2 inline-block font-medium text-admin-700 underline" target="_blank" rel="noreferrer">
                Tracking
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
