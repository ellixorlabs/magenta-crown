"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProductRow } from "@/lib/db/app-types";
import { useAuth } from "@/context/AuthContext";
import { useWishlistDispatch } from "@/context/WishlistContext";
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
  /** When true, shows an “Out of stock” tag (e.g. from server-side stock totals). */
  outOfStock?: boolean;
  /** When set, shows the rating pill on grid cards (shop passes aggregated reviews). */
  reviewSummary?: { avg: number; count: number } | null;
};

export function ProductCard({
  product,
  initialWishlisted = false,
  layout = "grid",
  listDensity = "compact",
  outOfStock = false,
  reviewSummary = null
}: ProductCardProps) {
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

  const { url: primaryImage } = getProductDisplayImage(product);
  const listPos = getListImagePosition(product);

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

  const heartClass = useMemo(
    () =>
      wishlisted
        ? "fill-rose-500 text-rose-500"
        : "fill-zinc-100 text-zinc-700",
    [wishlisted]
  );

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
            <Image
              src={primaryImage}
              alt={imgAlt}
              fill
              className={`object-cover transition duration-700 group-hover:scale-[1.02] ${outOfStock ? "opacity-50 grayscale" : ""}`}
              style={{ objectPosition: listPos }}
              sizes="144px"
              loading="lazy"
              unoptimized
            />
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
              className="absolute right-2 top-2 z-10 rounded-full border border-zinc-200 bg-white p-1.5 shadow-md transition hover:border-crown-400"
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
  const pillTag = product.tags?.[0]?.trim();

  return (
    <Link href={`/product/${product.slug}`} className="group block w-full min-w-0 max-w-full">
      <article className="w-full min-w-0">
        <div className="relative aspect-[3/4] w-full max-w-full overflow-hidden rounded-lg bg-[#ebe4e0] shadow-sm ring-1 ring-black/[0.04] transition duration-300 group-hover:shadow-lg">
          <Image
            src={primaryImage}
            alt={imgAlt}
            fill
            className={`object-cover transition duration-500 group-hover:scale-[1.04] ${outOfStock ? "opacity-50 grayscale" : ""}`}
            style={{ objectPosition: listPos }}
            sizes="(max-width: 640px) 44vw, (max-width: 1024px) 28vw, (max-width: 1536px) 22vw, 18vw"
            loading="lazy"
            unoptimized
          />
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
                {[1, 2, 3, 4, 5].map((i) => (
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
          {showNewBadge && (
            <span className="absolute right-2 top-2 z-10 rounded-full bg-[#5c4033] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-sm ring-2 ring-white/50">
              New
            </span>
          )}
          <button
            type="button"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            onClick={toggleWishlist}
            className={`absolute z-20 rounded-full border border-zinc-200 bg-white p-1.5 shadow-md transition hover:border-crown-400 ${
              isCarousel
                ? "bottom-2 right-2 top-auto"
                : showNewBadge
                  ? "left-2 top-2"
                  : "right-2 top-2"
            }`}
          >
            <Heart className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${heartClass}`} strokeWidth={1.6} />
          </button>
        </div>
        {isCarousel && pillTag && (
          <div className="mt-2 flex justify-center">
            <span className="rounded-full bg-pink-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-pink-800">
              {pillTag}
            </span>
          </div>
        )}
        <div className="mt-3 w-full min-w-0 max-w-full px-0.5 text-left sm:mt-3.5">
          <h3
            className={`break-words font-[family-name:var(--font-body)] text-sm font-medium leading-snug text-[#3d2f2a] sm:text-[15px] ${
              isCarousel ? "line-clamp-2 min-h-[2.5rem]" : "line-clamp-1"
            }`}
          >
            {product.name}
          </h3>
          <div className="mt-1.5 flex min-w-0 max-w-full flex-wrap items-baseline gap-x-2 gap-y-1">
            <span
              className={`text-base font-bold tabular-nums sm:text-[17px] ${isCarousel ? "text-crown-700" : "text-[#2b211e]"}`}
            >
              {formatInr(salePrice)}
            </span>
            {showStrikethrough && (
              <span className="text-xs tabular-nums text-zinc-400 line-through sm:text-sm">
                {formatInr(product.mrp)}
              </span>
            )}
            {offPct != null && offPct > 0 && !isCarousel && (
              <span className="rounded bg-[#E5D3C5] px-1.5 py-px text-[10px] font-semibold leading-tight text-[#4a3428] sm:text-[11px]">
                {offPct}% off
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
