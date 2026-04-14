import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function ConfirmationPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const orderId = sp.orderId;
  if (!orderId) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } }
  });

  if (!order) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f8f5f6] py-16">
      <div className="section-shell max-w-lg text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Thank you</p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900">
          Order confirmed
        </h1>
        <p className="mt-4 text-zinc-600">
          Your order <span className="font-mono text-sm text-zinc-900">{order.id}</span> has been placed.
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Tracking (demo):{" "}
          <a href={order.trackingUrl ?? "#"} className="text-crown-800 underline" target="_blank" rel="noreferrer">
            View shipment
          </a>
        </p>
        <p className="mt-6 text-sm text-zinc-600">
          Invoice download will appear in{" "}
          <Link href="/account/orders" className="text-crown-800 underline">
            My orders
          </Link>{" "}
          when enabled.
        </p>
        <Link
          href="/shop"
          className="mt-10 inline-block rounded-full bg-crown-800 px-8 py-3 text-sm font-semibold text-white hover:bg-crown-900"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
