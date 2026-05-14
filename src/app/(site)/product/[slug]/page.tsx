import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { absoluteUrl, buildProductKeywords, buildProductMetaDescription, productImageAlt } from "@/lib/seo";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { getProductTotalStock } from "@/lib/variant-stock";
import { auth, type AppSession } from "@/auth";
import { PRODUCT_GRID_COMFORT } from "@/lib/product-grid-classes";
import { ProductCard } from "@/components/features/ProductCard";
import { ProductPdpHeroExperience } from "@/components/product/pdp/ProductPdpHeroExperience";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ReviewForm } from "@/components/product/ReviewForm";
import { TrackProductView } from "@/components/product/TrackProductView";
import type { NextAppPageParams } from "@/types/next-app";

type PageProps = NextAppPageParams<{ slug: string }>;

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
  const supabase = getSupabaseServiceRoleClient();
  const { data: links, error } = await (supabase.from("_UserWishlist") as any)
    .select("A")
    .eq("B", uid);
  if (error) throw new Error(error.message);
  const ids = ((links ?? []) as Array<{ A: string }>).map((w) => w.A);
  const wished = ids.includes(productId);
  return {
    initialWishlisted: wished,
    wishlistIds: new Set(ids)
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServiceRoleClient();
  const { data: product, error } = await (supabase.from("Product") as any)
    .select("name,description,slug,category,tags,occasion,style,material,imageUrls")
    .eq("status", "ACTIVE")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);

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
  const supabase = getSupabaseServiceRoleClient();
  const [productRes, session, homeCfgRes] = await Promise.all([
    (supabase.from("Product") as any)
      .select(
        "*,variants:ProductVariant(*),reviews:Review(*),featuredCoupons:ProductFeaturedCoupon(coupon:Coupon(*))"
      )
      .eq("status", "ACTIVE")
      .eq("slug", slug)
      .maybeSingle(),
    auth(),
    (supabase.from("HomePageConfig") as any).select("payload").eq("id", "default").maybeSingle()
  ]);
  if (productRes.error) throw new Error(productRes.error.message);
  const productData = productRes.data as any;

  if (!productData) {
    notFound();
  }

  const [reviewAgg, crossSells, wishlistState] = await Promise.all([
    (supabase.from("Review") as any).select("rating").eq("productId", productData.id),
    (supabase.from("Product") as any)
      .select("*,variants:ProductVariant(stock,isActive)")
      .eq("status", "ACTIVE")
      .eq("category", productData.category)
      .neq("id", productData.id)
      .order("createdAt", { ascending: false })
      .limit(4),
    loadWishlistState(session, productData.id)
  ]);
  if (reviewAgg.error) throw new Error(reviewAgg.error.message);
  if (crossSells.error) throw new Error(crossSells.error.message);
  const crossSellRows = (crossSells.data ?? []) as any[];
  const product = {
    ...productData,
    reviews: ((productData.reviews ?? []) as any[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ).slice(0, 8)
  };
  const cfgPayload = (homeCfgRes.data?.payload ?? {}) as Record<string, unknown>;
  const globalSizeChartImageUrl =
    typeof cfgPayload.globalSizeChartImageUrl === "string" ? cfgPayload.globalSizeChartImageUrl : "";
  const shareMessageTemplate =
    typeof cfgPayload.shareMessageTemplate === "string" ? cfgPayload.shareMessageTemplate : undefined;

  const ratings = ((reviewAgg.data ?? []) as Array<{ rating: number }>).map((r) => r.rating);
  const reviewCount = ratings.length;
  const reviewAvgNum = reviewCount ? ratings.reduce((s, r) => s + r, 0) / reviewCount : null;
  const reviewAvg = reviewAvgNum != null ? Number(reviewAvgNum) : null;
  const { initialWishlisted, wishlistIds } = wishlistState;
  const canQuickEdit = session?.user?.role === "ADMIN" || session?.user?.role === "SUB_ADMIN";
  const firstActiveCouponCode =
    (((productData.featuredCoupons ?? []) as Array<{ coupon?: { code?: string; isActive?: boolean } }>).find(
      (x) => x.coupon?.isActive && x.coupon?.code
    )?.coupon?.code as string | undefined) ?? null;

  return (
    <main className="bg-white">
      <ProductJsonLd product={product} />
      <TrackProductView productId={product.id} />

      <div className="section-shell py-10">
        <ProductPdpHeroExperience
          product={{ ...product, globalSizeChartImageUrl, videoUrls: product.videoUrls ?? [] }}
          reviewAvg={reviewAvg}
          reviewCount={reviewCount}
          initialWishlisted={initialWishlisted}
          firstActiveCouponCode={firstActiveCouponCode}
          shareMessageTemplate={shareMessageTemplate}
          productUrl={absoluteUrl(`/product/${product.slug}`)}
          imageAlt={productImageAlt(product)}
          canQuickEdit={canQuickEdit}
          globalSizeChartImageUrl={globalSizeChartImageUrl}
        />

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
                  {product.reviews.map((r: any) => (
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

        {crossSellRows.length > 0 && (
          <section className="mt-16 border-t border-zinc-200 pt-12">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
              View similar products
            </h2>
            <div className={`mt-8 ${PRODUCT_GRID_COMFORT}`}>
              {crossSellRows.map((p: any) => (
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
