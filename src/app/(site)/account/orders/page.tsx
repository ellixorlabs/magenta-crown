import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Orders | Magenta Crown" };

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account/orders");
  }

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: true }
      }
    }
  });

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">Orders</h1>
      <p className="mt-2 text-sm text-zinc-600">Order history, tracking, invoices, and returns.</p>

      {orders.length === 0 ? (
        <p className="mt-8 text-zinc-600">No orders yet.{" "}
          <Link href="/shop" className="text-crown-800 underline">
            Start shopping
          </Link>
        </p>
      ) : (
        <ul className="mt-8 space-y-6">
          {orders.map((order) => (
            <li key={order.id} className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm text-zinc-900">{order.id}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(order.createdAt).toLocaleDateString()} · {order.status}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-zinc-900">Rs {order.totalAmount.toFixed(0)}</p>
                  {order.trackingUrl && (
                    <a href={order.trackingUrl} className="mt-1 block text-crown-800 underline" target="_blank" rel="noreferrer">
                      Track shipment
                    </a>
                  )}
                  {order.invoiceUrl && (
                    <a href={order.invoiceUrl} className="mt-1 block text-crown-800 underline" target="_blank" rel="noreferrer">
                      Download invoice
                    </a>
                  )}
                  {!order.invoiceUrl && (
                    <span className="mt-1 block text-xs text-zinc-500">Invoice: available when generated</span>
                  )}
                </div>
              </div>
              <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm text-zinc-700">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.product.name}
                    {(item.size || item.color) && (
                      <span className="text-zinc-500">
                        {" "}
                        ({[item.size && `Size ${item.size}`, item.color && item.color].filter(Boolean).join(", ")})
                      </span>
                    )}{" "}
                    — Rs {item.price}
                  </li>
                ))}
              </ul>
              <Link href="/support/returns" className="mt-4 inline-block text-sm text-crown-800 underline">
                Return / exchange request
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
