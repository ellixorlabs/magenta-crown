import { auth } from "@/auth";
import { AccountSessionRecover } from "@/components/account/AccountSessionRecover";
import { EmptyState } from "@/components/empty/EmptyState";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { ProductCard } from "@/components/features/ProductCard";
import { PRODUCT_GRID_WISHLIST } from "@/lib/product-grid-classes";
import { getProductTotalStock } from "@/lib/variant-stock";

export const metadata = {
  title: "Wishlist",
  description: "Saved pieces you love — sign in to sync your Magenta Crown wishlist across devices.",
  robots: { index: false, follow: true }
};

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <AccountSessionRecover callbackPath="/account/wishlist" />;
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: links, error: linksError } = await (supabase.from("_UserWishlist") as any)
    .select("A")
    .eq("B", session.user.id);
  if (linksError) throw new Error(linksError.message);
  const ids = [...new Set(((links ?? []) as Array<{ A: string }>).map((x) => x.A).filter(Boolean))];
  let items: any[] = [];
  if (ids.length > 0) {
    const { data: products, error } = await (supabase.from("Product") as any)
      .select("*,variants:ProductVariant(stock,isActive)")
      .eq("status", "ACTIVE")
      .in("id", ids);
    if (error) throw new Error(error.message);
    const byId = new Map(((products ?? []) as any[]).map((p) => [p.id, p]));
    items = ids.map((id) => byId.get(id)).filter(Boolean);
  }

  return (
    <div className="space-y-6 pb-2">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">Wishlist</h1>
        <p className="text-sm text-zinc-600">Saved pieces you love.</p>
      </header>

      {items.length === 0 ? (
        <div>
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
        <div className={PRODUCT_GRID_WISHLIST}>
          {items.map((p: any) => (
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
