import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CartClient } from "@/components/cart/CartClient";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review your bag and proceed to secure checkout — Magenta Crown.",
  robots: { index: false, follow: true }
};

export default async function CartPage() {
  const upsells = await prisma.product.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    include: { variants: { select: { stock: true, isActive: true } } }
  });

  return <CartClient upsells={upsells} />;
}
