import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/features/ProductCard";
import { PRODUCT_GRID_COMFORT } from "@/lib/product-grid-classes";
import { getProductTotalStock } from "@/lib/variant-stock";

export const metadata = { title: "Wishlist | Magenta Crown" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account/wishlist");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { wishlist: { include: { variants: { select: { quantity: true } } } } }
  });

  const items = user?.wishlist ?? [];

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">Wishlist</h1>
      <p className="mt-2 text-sm text-zinc-600">Saved pieces you love.</p>

      {items.length === 0 ? (
        <p className="mt-8 text-zinc-600">
          Nothing saved yet.{" "}
          <Link href="/shop" className="text-crown-800 underline">
            Explore the shop
          </Link>
        </p>
      ) : (
        <div className={`mt-8 ${PRODUCT_GRID_COMFORT}`}>
          {items.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              initialWishlisted
              outOfStock={getProductTotalStock(p.variants ?? [], p.stockQuantity) === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
