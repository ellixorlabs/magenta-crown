"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ProductRow } from "@/lib/db/app-types";
import { useAuth } from "@/context/AuthContext";
import { useWishlistDispatch } from "@/context/WishlistContext";
import { useDevRenderLog } from "@/lib/dev-performance";
import { getListImagePosition, getProductDisplayImage } from "@/lib/product-image-display";
import { productImageAlt } from "@/lib/seo";
import { wishlistPostHeaders } from "@/lib/wishlist-client";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function formatInr(n: number) {
  return INR.format(n);
}

function discountPct(mrp: number, sale: number) {
  if (mrp <= 0 || sale >= mrp) return null;
  return Math.round((1 - sale / mrp) * 100);
}

function isNewTagActive(product: Pick<ProductRow, "tags" | "newTagExpiresAt">): boolean {
  const hasNewTag = (product.tags ?? []).some((t) => t.trim().toLowerCase() === "new");
  if (!hasNewTag) return false;
  if (!product.newTagExpiresAt) return false;
  return new Date(product.newTagExpiresAt).getTime() > Date.now();
}

type ProductCardProps = {
  product: ProductRow;
  /** SSR hint to avoid flash before session hydrates */
  initialWishlisted?: boolean;
  layout?: "grid" | "list" | "carousel";
  /** Wider list row (e.g. shop list view). */
  listDensity?: "compact" | "comfortable";
  /** Homepage luxury grid / carousel density. */
  cardDensity?: "default" | "compact";
  /** When true, shows an “Out of stock” tag (e.g. from server-side stock totals). */
  outOfStock?: boolean;
  /** When set, shows the rating pill on grid cards (shop passes aggregated reviews). */
  reviewSummary?: { avg: number; count: number } | null;
};

const STAR_STEPS = [1, 2, 3, 4, 5] as const;

function ProductCardInner({
  product,
  initialWishlisted = false,
  layout = "grid",
  listDensity = "compact",
  cardDensity = "default",
  outOfStock = false,
  reviewSummary = null
}: ProductCardProps) {
  useDevRenderLog("ProductCard", 25);
  const router = useRouter();
  const { userId } = useAuth();
  const { applyOptimisticDelta, setServerCount } = useWishlistDispatch();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const wishlistedRef = useRef(wishlisted);
  const busyRef = useRef(false);

  const canWishlist = Boolean(userId);

  useEffect(() => {
    setWishlisted(initialWishlisted);
  }, [initialWishlisted]);

  useEffect(() => {
    wishlistedRef.current = wishlisted;
  }, [wishlisted]);

  const { url: primaryImage, index: primaryImageIndex } = getProductDisplayImage(product);
  const listPos = getListImagePosition(product);
  const galleryUrls = product.imageUrls ?? [];
  const hoverSwapUrl =
    galleryUrls.find((u, i) => Boolean(u) && i !== primaryImageIndex && u !== primaryImage) ?? null;

  const salePrice = product.discountedPrice ?? product.mrp;
  const showStrikethrough = product.discountedPrice != null && product.discountedPrice < product.mrp;
  const offPct = showStrikethrough ? discountPct(product.mrp, product.discountedPrice!) : null;

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  const showNewBadge = hydrated && isNewTagActive(product) && !outOfStock;

  const fabric = product.material?.trim();
  const occasion = product.occasion?.trim();
  const showMetaOverlay = Boolean(fabric || occasion);
  const imgAlt = productImageAlt(product);

  const toggleWishlist = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canWishlist) {
        const callback = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/auth/signin?callbackUrl=${callback}`);
        return;
      }
      if (busyRef.current) return;
      const prev = wishlistedRef.current;
      const next = !prev;
      setWishlisted(next);
      wishlistedRef.current = next;
      applyOptimisticDelta(next ? 1 : -1);
      busyRef.current = true;
      try {
        const res = await fetch("/api/user/wishlist", {
          method: "POST",
          headers: await wishlistPostHeaders(),
          body: JSON.stringify({ productId: product.id, wishlist: next })
        });
        const data = (await res.json()) as { count?: number };
        if (res.ok && typeof data.count === "number") {
          setServerCount(data.count);
        } else {
          setWishlisted(prev);
          wishlistedRef.current = prev;
          applyOptimisticDelta(next ? -1 : 1);
        }
      } catch {
        setWishlisted(prev);
        wishlistedRef.current = prev;
        applyOptimisticDelta(next ? -1 : 1);
      } finally {
        busyRef.current = false;
      }
    },
    [applyOptimisticDelta, canWishlist, product.id, router, setServerCount]
  );

  const heartClass = wishlisted ? "fill-mc-accent text-mc-accent" : "fill-white text-mc-ink/55";

  if (layout === "list") {
    const comfy = listDensity === "comfortable";
    return (
      <Link href={`/product/${product.slug}`} className="group block min-w-0 max-w-full">
        <article
          className={`flex overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 transition shadow-sm hover:shadow-md ${comfy ? "gap-6 p-1 sm:gap-8" : "gap-4"}`}
        >
          <div
            className={`relative aspect-[4/5] shrink-0 overflow-hidden rounded-xl bg-[#ebe4e0] ${comfy ? "w-40 sm:w-52 md:w-60" : "w-28 sm:w-36"}`}
          >
            <div className="relative h-full w-full min-h-0">
              <Image
                src={primaryImage}
                alt={imgAlt}
                fill
                className={`object-cover transition duration-700 group-hover:scale-[1.02] ${outOfStock ? "opacity-50 grayscale" : ""}`}
                style={{ objectPosition: listPos }}
                sizes={comfy ? "(max-width: 640px) 160px, (max-width: 1024px) 208px, 240px" : "(max-width: 640px) 112px, (max-width: 1024px) 144px, 180px"}
                quality={75}
                loading="lazy"
              />
            </div>
            {outOfStock && (
              <div className="absolute inset-0 z-[14] flex items-center justify-center bg-zinc-900/30 p-1 backdrop-blur-[0.5px]">
                <span className="rounded-md border border-white/25 bg-gradient-to-b from-zinc-900/95 to-black/90 px-2 py-2 text-center text-[9px] font-bold uppercase leading-tight tracking-[0.16em] text-white shadow-md">
                  OUT OF STOCK
                </span>
              </div>
            )}
            <button
              type="button"
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              onClick={toggleWishlist}
              className="absolute right-2 top-2 z-10 rounded-full border border-white/80 bg-white/95 p-1.5 shadow-md transition hover:bg-white"
            >
              <Heart className={`h-4 w-4 ${heartClass}`} strokeWidth={1.6} />
            </button>
          </div>
          <div className={`flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 pr-4 ${comfy ? "py-5 sm:pr-8" : ""}`}>
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">{product.category}</p>
            <h3
              className={`line-clamp-2 font-medium text-[#3d2f2a] ${comfy ? "text-lg sm:text-xl md:text-2xl" : "text-base"}`}
            >
              {product.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-semibold text-[#3d2f2a] ${comfy ? "text-xl sm:text-2xl" : "text-lg"}`}>
                {formatInr(salePrice)}
              </span>
              {showStrikethrough && (
                <span className="text-sm text-zinc-400 line-through">{formatInr(product.mrp)}</span>
              )}
              {offPct != null && offPct > 0 && (
                <span className="rounded bg-[#E5D3C5] px-1.5 py-0.5 text-[10px] font-semibold text-[#4a3428]">
                  {offPct}% off
                </span>
              )}
            </div>
          </div>
        </article>
      </Link>
    );
  }

  const hasRatingPill = Boolean(reviewSummary && reviewSummary.count > 0);
  const isCarousel = layout === "carousel";
  const isCompactLuxury = cardDensity === "compact" && (layout === "grid" || layout === "carousel");
  const pillTag = product.tags?.[0]?.trim();

  return (
    <Link href={`/product/${product.slug}`} className="group mc-tap block h-full w-full min-w-0 max-w-full">
      <article
        className={`flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl bg-mc-card shadow-sm ring-1 ring-mc-ink/[0.06] transition duration-300 group-hover:shadow-md ${isCompactLuxury ? "rounded-xl" : ""}`}
      >
        <div
          className={`relative w-full max-w-full min-h-0 overflow-hidden bg-mc-creamDeep ${isCompactLuxury ? "aspect-[3/4]" : "aspect-[3/4] lg:aspect-[4/5]"}`}
        >
          <div className="absolute inset-0 min-h-0">
            <div className="relative h-full w-full min-h-0">
              <Image
                src={primaryImage}
                alt={imgAlt}
                fill
                className={`object-cover ${isCompactLuxury ? "transition duration-500 group-hover:scale-[1.02]" : "transition duration-500 group-hover:scale-[1.04]"} ${outOfStock ? "opacity-50 grayscale" : ""} ${
                  hoverSwapUrl ? "group-hover:opacity-0" : ""
                }`}
                style={{ objectPosition: listPos }}
                sizes={
                  isCompactLuxury
                    ? "(max-width: 640px) 46vw, (max-width: 1024px) 28vw, (max-width: 1536px) 20vw, 280px"
                    : "(max-width: 640px) 48vw, (max-width: 1024px) 30vw, (max-width: 1536px) 24vw, 320px"
                }
                quality={75}
                loading="lazy"
              />
            </div>
          </div>
          {hoverSwapUrl ? (
            <div className="absolute inset-0 min-h-0">
              <div className="relative h-full w-full min-h-0">
                <Image
                  src={hoverSwapUrl}
                  alt=""
                  fill
                  className={`object-cover opacity-0 ${isCompactLuxury ? "transition duration-500 group-hover:scale-[1.02] group-hover:opacity-100" : "transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100"}`}
                  style={{ objectPosition: listPos }}
                  sizes={
                    isCompactLuxury
                      ? "(max-width: 640px) 46vw, (max-width: 1024px) 28vw, (max-width: 1536px) 20vw, 280px"
                      : "(max-width: 640px) 48vw, (max-width: 1024px) 30vw, (max-width: 1536px) 24vw, 320px"
                  }
                  quality={75}
                  loading="lazy"
                />
              </div>
            </div>
          ) : null}
          {showMetaOverlay && (
            <div
              className="pointer-events-none absolute inset-0 z-[8] flex flex-col justify-end opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
              aria-hidden
            >
              <div
                className={`w-full bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pt-12 text-left sm:px-4 ${hasRatingPill ? "pb-12 sm:pb-14" : "pb-3 sm:pb-4"}`}
              >
                {fabric && (
                  <p className="font-[family-name:var(--font-body)] text-[11px] font-bold leading-snug text-white drop-shadow sm:text-xs">
                    <span className="text-white/95">Fabric: </span>
                    <span className="font-semibold">{fabric}</span>
                  </p>
                )}
                {fabric && occasion && <div className="my-2 h-px w-full bg-white/45" />}
                {occasion && (
                  <>
                    {!fabric && <div className="mb-2 h-px w-full bg-white/45" />}
                    <p className="font-[family-name:var(--font-body)] text-[11px] font-bold leading-snug text-white drop-shadow sm:text-xs">
                      <span className="text-white/95">Occasion: </span>
                      <span className="font-semibold">{occasion}</span>
                    </p>
                    <div className="mt-2 h-px w-full bg-white/45" />
                  </>
                )}
              </div>
            </div>
          )}
          {hasRatingPill && (
            <div
              className="pointer-events-none absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-md border border-white/90 bg-white/95 px-2 py-1 text-[10px] shadow-sm backdrop-blur-sm sm:bottom-2.5 sm:left-2.5 sm:px-2.5 sm:py-1.5"
              aria-label={`Rated ${reviewSummary!.avg.toFixed(1)} from ${reviewSummary!.count} reviews`}
            >
              <span className="flex shrink-0 gap-px">
                {STAR_STEPS.map((i) => (
                  <Star
                    key={i}
                    className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${
                      i <= Math.round(reviewSummary!.avg)
                        ? "fill-amber-600 text-amber-600"
                        : "fill-zinc-200 text-zinc-200"
                    }`}
                    strokeWidth={0}
                    aria-hidden
                  />
                ))}
              </span>
              <span className="shrink-0 font-medium tabular-nums text-[#5c4033] sm:text-[11px]">
                {reviewSummary!.count} reviews
              </span>
            </div>
          )}
          {outOfStock && (
            <div className="absolute inset-0 z-[14] flex items-center justify-center bg-zinc-900/35 backdrop-blur-[0.5px]">
              <span className="rounded-md border border-white/25 bg-gradient-to-b from-zinc-900/95 to-black/90 px-4 py-3 text-center text-[11px] font-bold uppercase leading-tight tracking-[0.2em] text-white shadow-lg sm:text-xs">
                OUT OF STOCK
              </span>
            </div>
          )}
          {isCarousel && offPct != null && offPct > 0 && !outOfStock && (
            <span className="absolute left-2 top-2 z-10 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              Save {offPct}%
            </span>
          )}
          {showNewBadge && !isCompactLuxury && (
            <span className="absolute right-2 top-2 z-10 rounded-full bg-[#5c4033] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-sm ring-2 ring-white/50">
              New
            </span>
          )}
          {showNewBadge && isCompactLuxury && (
            <span className="absolute left-2 top-2 z-10 rounded-full bg-[#5c4033] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-sm ring-2 ring-white/50">
              New
            </span>
          )}
          <button
            type="button"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            onClick={toggleWishlist}
            className={`absolute right-2 top-2 z-20 rounded-full border border-white/80 bg-white/95 p-1.5 shadow-md transition hover:bg-white ${
              isCarousel && !isCompactLuxury
                ? "bottom-2 right-2 top-auto"
                : ""
            }`}
          >
            <Heart className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${heartClass}`} strokeWidth={1.6} />
          </button>
        </div>
        {isCarousel && pillTag && (
          <div className="flex justify-center bg-mc-card px-2 pt-2">
            <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-mc-maroon">
              {pillTag}
            </span>
          </div>
        )}
        <div
          className={`flex w-full min-w-0 max-w-full flex-1 flex-col justify-between bg-mc-card text-center ${
            isCompactLuxury
              ? "px-2 pb-2 pt-1.5 sm:px-2.5 sm:pb-2 sm:pt-2"
              : "px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3 lg:px-2.5 lg:pb-2.5 lg:pt-2"
          }`}
        >
          <h3
            className={`break-words font-[family-name:var(--font-body)] font-medium leading-snug text-mc-ink ${
              isCompactLuxury
                ? "line-clamp-2 min-h-[2.35rem] text-[13px] sm:text-sm"
                : `min-h-[3.25rem] text-sm sm:text-[15px] lg:min-h-[3rem] ${
                    isCarousel ? "line-clamp-2 min-h-[2.5rem]" : "line-clamp-2 min-h-[2.5rem] sm:line-clamp-2"
                  }`
            }`}
          >
            {product.name}
          </h3>
          <div
            className={`mt-1.5 flex min-w-0 max-w-full flex-wrap items-baseline justify-center gap-x-2 gap-y-1 ${
              isCompactLuxury ? "min-h-[2.25rem]" : "min-h-[2.75rem] lg:min-h-[2.5rem]"
            }`}
          >
            <span className="text-base font-bold tabular-nums text-mc-price sm:text-[17px]">{formatInr(salePrice)}</span>
            {showStrikethrough && (
              <span className="text-xs tabular-nums text-mc-muted line-through sm:text-sm">{formatInr(product.mrp)}</span>
            )}
            {offPct != null && offPct > 0 && !isCarousel && (
              <span className="rounded-md bg-white/80 px-1.5 py-px text-[10px] font-semibold leading-tight text-mc-maroon sm:text-[11px]">
                {offPct}% off
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

function areEqualProductCardProps(prev: ProductCardProps, next: ProductCardProps) {
  return (
    prev.product.id === next.product.id &&
    prev.product.slug === next.product.slug &&
    prev.product.name === next.product.name &&
    prev.product.mrp === next.product.mrp &&
    prev.product.discountedPrice === next.product.discountedPrice &&
    prev.product.newTagExpiresAt === next.product.newTagExpiresAt &&
    prev.product.imageUrls === next.product.imageUrls &&
    prev.product.tags === next.product.tags &&
    prev.product.material === next.product.material &&
    prev.product.occasion === next.product.occasion &&
    prev.product.listImageIndex === next.product.listImageIndex &&
    prev.product.listImagePosition === next.product.listImagePosition &&
    prev.product.category === next.product.category &&
    prev.initialWishlisted === next.initialWishlisted &&
    prev.layout === next.layout &&
    prev.listDensity === next.listDensity &&
    prev.cardDensity === next.cardDensity &&
    prev.outOfStock === next.outOfStock &&
    prev.reviewSummary?.avg === next.reviewSummary?.avg &&
    prev.reviewSummary?.count === next.reviewSummary?.count
  );
}

export const ProductCard = memo(ProductCardInner, areEqualProductCardProps);
ProductCard.displayName = "ProductCard";
