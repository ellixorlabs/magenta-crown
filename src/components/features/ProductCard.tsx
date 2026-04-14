"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Heart, Star } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { Product } from "@prisma/client";
import { getListImagePosition, getProductDisplayImage } from "@/lib/product-image-display";

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

const NEW_MS = 21 * 24 * 60 * 60 * 1000;

type ProductCardProps = {
  product: Product;
  /** SSR hint to avoid flash before session hydrates */
  initialWishlisted?: boolean;
  layout?: "grid" | "list";
  /** When true, shows an “Out of stock” tag (e.g. from server-side stock totals). */
  outOfStock?: boolean;
  /** When set, shows the rating pill on grid cards (shop passes aggregated reviews). */
  reviewSummary?: { avg: number; count: number } | null;
};

export function ProductCard({
  product,
  initialWishlisted = false,
  layout = "grid",
  outOfStock = false,
  reviewSummary = null
}: ProductCardProps) {
  const { data: session, status } = useSession();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [busy, setBusy] = useState(false);

  const isStaff =
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "SUB_ADMIN" ||
    session?.user?.role === "TECH_SUPPORT";
  const canWishlist = status === "authenticated" && session?.user?.id && !isStaff;

  const { url: primaryImage } = getProductDisplayImage(product);
  const listPos = getListImagePosition(product);

  const salePrice = product.discountedPrice ?? product.mrp;
  const showStrikethrough = product.discountedPrice != null && product.discountedPrice < product.mrp;
  const offPct = showStrikethrough ? discountPct(product.mrp, product.discountedPrice!) : null;

  const isNew = Date.now() - new Date(product.createdAt).getTime() < NEW_MS;
  const showNewBadge = isNew && !outOfStock;

  const fabric = product.material?.trim();
  const occasion = product.occasion?.trim();
  const showMetaOverlay = Boolean(fabric || occasion);

  const toggleWishlist = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canWishlist || busy) return;
      setBusy(true);
      const next = !wishlisted;
      try {
        const res = await fetch("/api/user/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, wishlist: next })
        });
        if (res.ok) {
          setWishlisted(next);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, canWishlist, product.id, wishlisted]
  );

  const heartClass = useMemo(
    () =>
      wishlisted
        ? "fill-rose-500 text-rose-500"
        : "fill-white/90 text-white drop-shadow-md hover:scale-110",
    [wishlisted]
  );

  if (layout === "list") {
    return (
      <Link href={`/product/${product.slug}`} className="group block">
        <article className="flex gap-4 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/90 transition shadow-sm hover:shadow-md">
          <div className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-xl bg-[#ebe4e0] sm:w-36">
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              className="object-cover transition duration-700 group-hover:scale-[1.02]"
              style={{ objectPosition: listPos }}
              sizes="144px"
              unoptimized
            />
            {outOfStock && (
              <span className="absolute left-2 top-2 z-10 rounded-full bg-zinc-900/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                Out of stock
              </span>
            )}
            {canWishlist && (
              <button
                type="button"
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                onClick={toggleWishlist}
                disabled={busy}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/35 p-1.5 backdrop-blur-sm transition hover:bg-black/50 disabled:opacity-50"
              >
                <Heart className={`h-4 w-4 ${heartClass}`} strokeWidth={1.6} />
              </button>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-3 pr-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">{product.category}</p>
            <h3 className="line-clamp-2 text-base font-medium text-[#3d2f2a]">{product.name}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-[#3d2f2a]">{formatInr(salePrice)}</span>
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

  return (
    <Link href={`/product/${product.slug}`} className="group block w-full">
      <article className="w-full">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-[#ebe4e0] shadow-sm ring-1 ring-black/[0.04] transition duration-300 group-hover:shadow-lg">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            style={{ objectPosition: listPos }}
            sizes="(max-width: 640px) 44vw, (max-width: 1024px) 28vw, (max-width: 1536px) 22vw, 18vw"
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
            <span className="absolute left-2 top-2 z-10 rounded-full bg-zinc-900/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              Out of stock
            </span>
          )}
          {showNewBadge && (
            <span className="absolute right-2 top-2 z-10 rounded-full bg-[#5c4033] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-sm ring-2 ring-white/50">
              New
            </span>
          )}
          {canWishlist && (
            <button
              type="button"
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              onClick={toggleWishlist}
              disabled={busy}
              className={`absolute ${showNewBadge ? "left-2 top-2" : "right-2 top-2"} z-20 rounded-full bg-black/30 p-1.5 backdrop-blur-sm transition hover:bg-black/45 disabled:opacity-50`}
            >
              <Heart className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${heartClass}`} strokeWidth={1.6} />
            </button>
          )}
        </div>
        <div className="mt-3 w-full px-0.5 text-left sm:mt-3.5">
          <h3 className="line-clamp-1 font-[family-name:var(--font-body)] text-sm font-medium leading-snug text-[#3d2f2a] sm:text-[15px]">
            {product.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-base font-bold tabular-nums text-[#2b211e] sm:text-[17px]">{formatInr(salePrice)}</span>
            {showStrikethrough && (
              <span className="text-xs tabular-nums text-zinc-400 line-through sm:text-sm">
                {formatInr(product.mrp)}
              </span>
            )}
            {offPct != null && offPct > 0 && (
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
