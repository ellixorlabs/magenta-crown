import { prisma } from "@/lib/prisma";
import { CartClient } from "@/components/cart/CartClient";

export default async function CartPage() {
  const upsells = await prisma.product.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    include: { variants: { select: { quantity: true } } }
  });

  return <CartClient upsells={upsells} />;
}
