import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, buildProductKeywords, buildProductMetaDescription, productImageAlt } from "@/lib/seo";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { getProductTotalStock } from "@/lib/variant-stock";
import { auth, type AppSession } from "@/auth";
import { ProductWishlistToggle } from "@/components/product/ProductWishlistToggle";
import { PRODUCT_GRID_COMFORT } from "@/lib/product-grid-classes";
import { ProductCard } from "@/components/features/ProductCard";
import { AddToCartSection } from "@/components/product/AddToCartSection";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ReviewForm } from "@/components/product/ReviewForm";
import { TrackProductView } from "@/components/product/TrackProductView";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { LazyProductVideo } from "@/components/product/LazyProductVideo";
import { ProductShareButton } from "@/components/product/ProductShareButton";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function loadWishlistState(
  session: AppSession | null,
  productId: string
): Promise<{ initialWishlisted: boolean; wishlistIds: Set<string> }> {
  const role = session?.user?.role;
  if (
    !session?.user?.id ||
    role === "ADMIN" ||
    role === "SUB_ADMIN" ||
    role === "TECH_SUPPORT"
  ) {
    return { initialWishlisted: false, wishlistIds: new Set() };
  }
  const uid = session.user.id;
  const [onList, u] = await Promise.all([
    prisma.product.count({
      where: { id: productId, wishedBy: { some: { id: uid } } }
    }),
    prisma.user.findUnique({
      where: { id: uid },
      select: { wishlist: { select: { id: true } } }
    })
  ]);
  return {
    initialWishlisted: onList > 0,
    wishlistIds: new Set((u?.wishlist ?? []).map((w) => w.id))
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      slug: true,
      category: true,
      tags: true,
      occasion: true,
      style: true,
      material: true,
      imageUrls: true
    }
  });

  if (!product) {
    return { title: "Product" };
  }

  const description = buildProductMetaDescription(product);
  const keywords = buildProductKeywords(product);
  const ogImage = product.imageUrls?.[0];
  const ogImages = ogImage ? [{ url: ogImage }] : undefined;

  return {
    title: product.name,
    description,
    keywords: keywords.split(", ").filter(Boolean),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      url: absoluteUrl(`/product/${product.slug}`),
      images: ogImages
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: ogImage ? [ogImage] : undefined
    }
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const [product, session] = await Promise.all([
    prisma.product.findUnique({
      where: { slug },
      include: {
        variants: true,
        reviews: { orderBy: { createdAt: "desc" }, take: 8 },
        featuredCoupons: { include: { coupon: true } }
      }
    }),
    auth()
  ]);

  if (!product) {
    notFound();
  }

  const [reviewAgg, crossSells, wishlistState] = await Promise.all([
    prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { _all: true }
    }),
    prisma.product.findMany({
      where: { category: product.category, NOT: { id: product.id } },
      take: 4,
      orderBy: { createdAt: "desc" },
      include: { variants: { select: { stock: true, isActive: true } } }
    }),
    loadWishlistState(session, product.id)
  ]);

  const reviewCount = reviewAgg._count._all;
  const reviewAvgNum = reviewAgg._avg.rating;
  const reviewAvg = reviewAvgNum != null ? Number(reviewAvgNum) : null;
  const { initialWishlisted, wishlistIds } = wishlistState;
  const canQuickEdit = session?.user?.role === "ADMIN" || session?.user?.role === "SUB_ADMIN";

  return (
    <main className="bg-[#f8f5f6]">
      <ProductJsonLd product={product} />
      <TrackProductView productId={product.id} />

      <div className="section-shell py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="relative">
            <ProductImageGallery
              name={product.name}
              imageAlt={productImageAlt(product)}
              imageUrls={product.imageUrls}
              listImageIndex={product.listImageIndex ?? 0}
              listImagePosition={product.listImagePosition ?? "center"}
            />
            {product.videoUrls.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Video</p>
                {product.videoUrls.map((url) => (
                  <LazyProductVideo key={url} src={url} title={product.name} />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              <Link
                href={`/shop?category=${encodeURIComponent(product.category)}`}
                className="transition hover:text-crown-800 underline-offset-4 hover:underline"
              >
                {product.category}
              </Link>
            </p>
            <div className="mt-2 flex flex-wrap items-start gap-3">
              <h1 className="flex-1 font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900 sm:text-4xl">
                {product.name}
              </h1>
              <div className="flex items-center gap-2">
                <ProductWishlistToggle
                  productId={product.id}
                  initialWishlisted={initialWishlisted}
                  variant="default"
                />
                <ProductShareButton
                  productName={product.name}
                  productUrl={absoluteUrl(`/product/${product.slug}`)}
                />
                {canQuickEdit && (
                  <Link
                    href={`/admin/inventory/${product.id}`}
                    className="inline-flex items-center rounded-full border border-crown-700/30 bg-crown-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-crown-800 transition hover:bg-crown-100"
                  >
                    Edit product
                  </Link>
                )}
              </div>
            </div>
            <div className="mt-6">
              <AddToCartSection
                product={product}
                reviewAvg={reviewAvg}
                reviewCount={reviewCount}
              />
            </div>
            <p className="mt-6 text-zinc-600">{product.description}</p>

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
                  outOfStock={getProductTotalStock(p.variants) === 0}
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
