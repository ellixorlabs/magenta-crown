import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EmptyState } from "@/components/empty/EmptyState";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/features/ProductCard";
import { PRODUCT_GRID_COMFORT } from "@/lib/product-grid-classes";
import { getProductTotalStock } from "@/lib/variant-stock";

export const metadata = {
  title: "Wishlist",
  description: "Saved pieces you love — sign in to sync your Magenta Crown wishlist across devices.",
  robots: { index: false, follow: true }
};

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/account/wishlist");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { wishlist: { include: { variants: { select: { stock: true, isActive: true } } } } }
  });

  const items = user?.wishlist ?? [];

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">Wishlist</h1>
      <p className="mt-2 text-sm text-zinc-600">Saved pieces you love.</p>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Your wishlist is empty"
            description="Save pieces you love from the product page — tap the heart on each card."
            actionHref="/shop"
            actionLabel="Explore the shop"
            secondaryHref="/account/profile"
            secondaryLabel="Back to profile"
          />
        </div>
      ) : (
        <div className={`mt-8 ${PRODUCT_GRID_COMFORT}`}>
          {items.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              initialWishlisted
              outOfStock={getProductTotalStock(p.variants ?? []) === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
