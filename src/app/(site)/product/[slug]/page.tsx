import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getProductTotalStock } from "@/lib/variant-stock";
import { auth } from "@/auth";
import { ProductWishlistToggle } from "@/components/product/ProductWishlistToggle";
import { PRODUCT_GRID_COMFORT } from "@/lib/product-grid-classes";
import { ProductCard } from "@/components/features/ProductCard";
import { AddToCartSection } from "@/components/product/AddToCartSection";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ReviewForm } from "@/components/product/ReviewForm";
import { TrackProductView } from "@/components/product/TrackProductView";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  return { title: product ? `${product.name} | Magenta Crown` : "Product" };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      variants: true,
      reviews: { orderBy: { createdAt: "desc" }, take: 12 }
    }
  });

  if (!product) {
    notFound();
  }

  const session = await auth();
  let initialWishlisted = false;
  let wishlistIds = new Set<string>();
  if (
    session?.user?.id &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "SUB_ADMIN" &&
    session.user.role !== "TECH_SUPPORT"
  ) {
    const onList = await prisma.product.count({
      where: { id: product.id, wishedBy: { some: { id: session.user.id } } }
    });
    initialWishlisted = onList > 0;

    const u = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { wishlist: { select: { id: true } } }
    });
    wishlistIds = new Set(u?.wishlist.map((w) => w.id) ?? []);
  }

  const crossSells = await prisma.product.findMany({
    where: { category: product.category, NOT: { id: product.id } },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: { variants: { select: { quantity: true } } }
  });

  return (
    <main className="bg-[#f8f5f6]">
      <TrackProductView productId={product.id} />

      <div className="section-shell py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <ProductImageGallery
              name={product.name}
              imageUrls={product.imageUrls}
              listImageIndex={product.listImageIndex ?? 0}
              listImagePosition={product.listImagePosition ?? "center"}
            />
            {product.videoUrls.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Video</p>
                {product.videoUrls.map((url) => (
                  <video key={url} src={url} controls className="w-full rounded-xl border border-zinc-200" />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{product.category}</p>
            <div className="mt-2 flex flex-wrap items-start gap-3">
              <h1 className="flex-1 font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900 sm:text-4xl">
                {product.name}
              </h1>
              <ProductWishlistToggle productId={product.id} initialWishlisted={initialWishlisted} />
            </div>
            <p className="mt-4 text-zinc-600">{product.description}</p>

            {product.story && (
              <div className="mt-8 border-t border-zinc-200 pt-8">
                <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-zinc-900">
                  Product story
                </h2>
                <p className="mt-3 whitespace-pre-line text-zinc-700">{product.story}</p>
              </div>
            )}

            <div className="mt-8 grid gap-6 border-t border-zinc-200 pt-8 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Fit & style</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  {product.fitNotes ?? "Tailored for an elegant drape; model is 5'10\" for reference."}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Material & care</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  {product.material && `${product.material}. `}
                  {product.careInstructions ?? "Dry clean only. Store folded with breathable cover."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href="/support/faqs#sizing" className="text-crown-800 underline underline-offset-4">
                Size guide
              </Link>
              <Link href="/support/shipping" className="text-crown-800 underline underline-offset-4">
                Delivery & returns
              </Link>
            </div>

            <div className="mt-8">
              <AddToCartSection product={product} />
            </div>
          </div>
        </div>

        <section className="mt-16 border-t border-zinc-200 pt-12">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
            Reviews & ratings
          </h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div>
              {product.reviews.length === 0 ? (
                <p className="text-sm text-zinc-500">No reviews yet — be the first.</p>
              ) : (
                <ul className="space-y-4">
                  {product.reviews.map((r) => (
                    <li key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-900">{r.authorName}</span>
                        <span className="text-sm text-amber-600">{"★".repeat(r.rating)}</span>
                      </div>
                      {r.body && <p className="mt-2 text-sm text-zinc-700">{r.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <ReviewForm productId={product.id} />
            </div>
          </div>
        </section>

        {crossSells.length > 0 && (
          <section className="mt-16 border-t border-zinc-200 pt-12">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
              Complete the look
            </h2>
            <div className={`mt-8 ${PRODUCT_GRID_COMFORT}`}>
              {crossSells.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  initialWishlisted={wishlistIds.has(p.id)}
                  outOfStock={getProductTotalStock(p.variants, p.stockQuantity) === 0}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <RecentlyViewed excludeId={product.id} />
    </main>
  );
}
