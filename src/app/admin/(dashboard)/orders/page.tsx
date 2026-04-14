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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Orders</h2>
        <Link href="/admin" className="text-sm text-crown-800 underline">
          ← Admin home
        </Link>
      </div>
      <ul className="space-y-4">
        {orders.map((o) => (
          <li key={o.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
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
              <a href={o.trackingUrl} className="mt-2 inline-block text-crown-800 underline" target="_blank" rel="noreferrer">
                Tracking
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
