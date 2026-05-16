import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { absoluteUrl, buildProductKeywords, buildProductMetaDescription, productImageAlt } from "@/lib/seo";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { getProductTotalStock } from "@/lib/variant-stock";
import { auth, type AppSession } from "@/auth";
import { isMerchAdmin, isStorefrontStaff } from "@/lib/admin-permissions";
import { PRODUCT_GRID_COMFORT } from "@/lib/product-grid-classes";
import { ProductCard } from "@/components/features/ProductCard";
import { ProductPdpHeroExperience } from "@/components/product/pdp/ProductPdpHeroExperience";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { ReviewForm } from "@/components/product/ReviewForm";
import { TrackProductView } from "@/components/product/TrackProductView";
import { fetchVerifiedReviewEligibleLines } from "@/lib/review-eligibility";
import type { NextAppPageParams } from "@/types/next-app";

type PageProps = NextAppPageParams<{ slug: string }>;

async function loadWishlistState(
  session: AppSession | null,
  productId: string
): Promise<{ initialWishlisted: boolean; wishlistIds: Set<string> }> {
  const role = session?.user?.role;
  if (!session?.user?.id || isStorefrontStaff(role)) {
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

  const tags = Array.isArray(productData.tags) ? (productData.tags as string[]).filter(Boolean) : [];
  const material = String(productData.material ?? "").trim();

  const tagRelatedPromise =
    tags.length > 0
      ? (supabase.from("Product") as any)
          .select("*,variants:ProductVariant(stock,isActive)")
          .eq("status", "ACTIVE")
          .overlaps("tags", tags)
          .neq("id", productData.id)
          .limit(10)
      : Promise.resolve({ data: [], error: null });

  const materialRelatedPromise =
    material.length > 0
      ? (supabase.from("Product") as any)
          .select("*,variants:ProductVariant(stock,isActive)")
          .eq("status", "ACTIVE")
          .eq("material", material)
          .neq("id", productData.id)
          .limit(6)
      : Promise.resolve({ data: [], error: null });

  const [reviewAgg, crossSells, wishlistState, reviewEligibility, tagRelatedRes, materialRelatedRes, verifiedAgg] =
    await Promise.all([
      (supabase.from("Review") as any)
        .select("rating")
        .eq("productId", productData.id)
        .eq("moderationStatus", "APPROVED"),
      (supabase.from("Product") as any)
        .select("*,variants:ProductVariant(stock,isActive)")
        .eq("status", "ACTIVE")
        .eq("category", productData.category)
        .neq("id", productData.id)
        .order("createdAt", { ascending: false })
        .limit(4),
      loadWishlistState(session, productData.id),
      session?.user?.id
        ? fetchVerifiedReviewEligibleLines(supabase, session.user.id, productData.id)
        : Promise.resolve([]),
      tagRelatedPromise,
      materialRelatedPromise,
      (supabase.from("Review") as any)
        .select("id", { count: "exact", head: true })
        .eq("productId", productData.id)
        .eq("moderationStatus", "APPROVED")
        .eq("verifiedPurchase", true)
    ]);
  if (reviewAgg.error) throw new Error(reviewAgg.error.message);
  if (crossSells.error) throw new Error(crossSells.error.message);
  const crossSellRows = (crossSells.data ?? []) as any[];

  const pickById = new Map<string, any>();
  for (const res of [tagRelatedRes, materialRelatedRes]) {
    if (res.error) continue;
    for (const p of (res.data ?? []) as any[]) {
      if (p?.id && p.id !== productData.id) pickById.set(p.id, p);
    }
  }
  const curatedRows = [...pickById.values()].slice(0, 8);
  const verifiedReviewCount = verifiedAgg.count ?? 0;
  const trustMeta = {
    verifiedReviewCount,
    returnWindowDays: Number(productData.returnWindowDays ?? 7),
    returnable: productData.returnable !== false,
    exchangeable: productData.exchangeable !== false,
    codAvailable: productData.codEnabled !== false
  };
  const product = {
    ...productData,
    reviews: ((productData.reviews ?? []) as any[])
      .filter((r) => r.moderationStatus === "APPROVED" || r.moderationStatus == null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
  };
  const reviewIds = (product.reviews as any[]).map((r) => r.id as string).filter(Boolean);
  const mediaByReview = new Map<string, Array<{ id: string; type: string; url: string; thumbnailUrl: string | null }>>();
  if (reviewIds.length > 0) {
    const { data: mediaRows, error: mediaErr } = await (supabase.from("ReviewMedia") as any)
      .select("id,reviewId,type,url,thumbnailUrl")
      .in("reviewId", reviewIds);
    if (mediaErr) throw new Error(mediaErr.message);
    for (const m of (mediaRows ?? []) as Array<{
      id: string;
      reviewId: string;
      type: string;
      url: string;
      thumbnailUrl: string | null;
    }>) {
      const list = mediaByReview.get(m.reviewId) ?? [];
      list.push(m);
      mediaByReview.set(m.reviewId, list);
    }
  }
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
  const canQuickEdit = isMerchAdmin(session?.user?.role);
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
          trustMeta={trustMeta}
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
                        <span className="flex items-center gap-2 text-sm text-amber-600">
                          {r.verifiedPurchase ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                              Verified purchase
                            </span>
                          ) : null}
                          <span>{"★".repeat(r.rating)}</span>
                        </span>
                      </div>
                      {r.body && <p className="mt-2 text-sm text-zinc-700">{r.body}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(mediaByReview.get(r.id) ?? []).map((m) =>
                          m.type === "IMAGE" ? (
                            <div key={m.id} className="relative h-24 w-24 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
                              <Image
                                src={m.thumbnailUrl || m.url}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="96px"
                                loading="lazy"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <video
                              key={m.id}
                              src={m.url}
                              className="mt-1 max-h-44 w-full max-w-xs rounded-lg border border-zinc-100 bg-black object-contain"
                              controls
                              playsInline
                              preload="metadata"
                            />
                          )
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <ReviewForm
                productId={product.id}
                eligibility={reviewEligibility}
                authorNameDefault={session?.user?.name ?? session?.user?.email ?? ""}
              />
            </div>
          </div>
        </section>

        {curatedRows.length > 0 && (
          <section className="mt-16 border-t border-zinc-200 pt-12">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
              Curated with this piece
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Pieces that share tags or fabric with what you are viewing — styled for the same occasions.
            </p>
            <div className={`mt-8 ${PRODUCT_GRID_COMFORT}`}>
              {curatedRows.map((p: any) => (
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
