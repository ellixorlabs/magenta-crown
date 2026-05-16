"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LazyProductVideo } from "@/components/product/LazyProductVideo";
import { ProductPdpDeliveryTrust } from "@/components/product/pdp/ProductPdpDeliveryTrust";
import {
  ProductPdpGalleryLuxury,
  computeZoomStyle,
  type MagnifyFrame
} from "@/components/product/pdp/ProductPdpGalleryLuxury";
import { ProductPdpLuxuryAccordions } from "@/components/product/pdp/ProductPdpLuxuryAccordions";
import { ProductPdpPurchaseBlock } from "@/components/product/pdp/ProductPdpPurchaseBlock";
import { ProductPdpStatusPills } from "@/components/product/pdp/ProductPdpStatusPills";
import { ProductShareButton } from "@/components/product/ProductShareButton";
import { ProductWishlistToggle } from "@/components/product/ProductWishlistToggle";
import { shopCategoryHref } from "@/lib/shop-category-url";
import { getProductTotalStock } from "@/lib/variant-stock";
import { useProductPdpPurchase, type ProductPdp } from "@/components/product/pdp/use-product-pdp-purchase";

export type ProductPdpHeroProduct = ProductPdp & {
  story?: string | null;
  fitNotes?: string | null;
  careInstructions?: string | null;
  style?: string | null;
  /** Internal warehouse / rack code (distinct from customer-facing `style`). */
  styleCode?: string | null;
  videoUrls: string[];
};

export type ProductPdpHeroExperienceProps = {
  product: ProductPdpHeroProduct;
  reviewAvg: number | null;
  reviewCount: number;
  initialWishlisted: boolean;
  firstActiveCouponCode: string | null;
  shareMessageTemplate?: string;
  productUrl: string;
  imageAlt: string;
  canQuickEdit: boolean;
  globalSizeChartImageUrl: string;
  /** PDP trust / policy signals (server-provided). */
  trustMeta?: {
    verifiedReviewCount: number;
    returnWindowDays: number;
    returnable: boolean;
    exchangeable: boolean;
    codAvailable: boolean;
  };
};

const MAGNIFIER_VIEW_MARGIN = 12;
const MAGNIFIER_CURSOR_GAP = 16;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Prefer placing the loupe to the **left** of the cursor with a gap; flip to the right if
 * there is not enough room; otherwise center horizontally. Clamp vertically into the viewport.
 */
function computeMagnifierPosition(
  px: number,
  py: number,
  panelW: number,
  panelH: number,
  vw: number,
  vh: number
): { left: number; top: number } {
  const m = MAGNIFIER_VIEW_MARGIN;
  const gap = MAGNIFIER_CURSOR_GAP;
  const w = Math.min(panelW, vw - 2 * m);
  const h = Math.min(panelH, vh - 2 * m);
  if (w < 24 || h < 24) return { left: m, top: m };

  let left = px - gap - w;
  if (left < m) {
    const right = px + gap;
    if (right + w <= vw - m) {
      left = right;
    } else {
      left = clamp(px - w / 2, m, vw - m - w);
    }
  } else {
    left = clamp(left, m, vw - m - w);
  }
  const top = clamp(py - h / 2, m, vh - m - h);
  return { left, top };
}

function ProductPdpHeroExperienceInner({
  product,
  reviewAvg,
  reviewCount,
  initialWishlisted,
  firstActiveCouponCode,
  shareMessageTemplate,
  productUrl,
  imageAlt,
  canQuickEdit,
  globalSizeChartImageUrl,
  trustMeta
}: ProductPdpHeroExperienceProps) {
  const purchase = useProductPdpPurchase(product, reviewAvg, reviewCount);
  const { price, offPct, isStaff, totalSellable, singleDefault, pricingNote } = purchase;

  const [mag, setMag] = useState<MagnifyFrame | null>(null);
  const magnifierRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState({ w: 1200, h: 800 });
  const [panelBox, setPanelBox] = useState({ w: 280, h: 300 });
  const [isLgFine, setIsLgFine] = useState(false);

  const onMagnifyFrame = useCallback((frame: MagnifyFrame | null) => {
    setMag(frame);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useLayoutEffect(() => {
    if (!mag) return;
    const el = magnifierRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setPanelBox({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setPanelBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [mag]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    const sync = () => setIsLgFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const magnifierPos = useMemo(() => {
    if (!mag) return { left: 0, top: 0 };
    const { clientX, clientY } = mag.pointer;
    return computeMagnifierPosition(clientX, clientY, panelBox.w, panelBox.h, viewport.w, viewport.h);
  }, [mag, panelBox.h, panelBox.w, viewport.h, viewport.w]);

  const zoomStyle = useMemo(() => {
    if (!mag || panelBox.w < 8 || panelBox.h < 8) return undefined;
    return computeZoomStyle(mag.lens, mag.imgBounds, panelBox.w, panelBox.h);
  }, [mag, panelBox.h, panelBox.w]);

  const showZoomOverlay = Boolean(isLgFine && mag && zoomStyle);

  const totalStock = useMemo(() => getProductTotalStock(product.variants), [product.variants]);
  const inStockPill = totalStock > 0;
  const readyToShip = inStockPill && product.status !== "SOLD_OUT";

  const productForPurchase = useMemo(
    () => ({ ...product, globalSizeChartImageUrl }),
    [product, globalSizeChartImageUrl]
  );

  const sizeFitCard = useMemo(
    () => ({
      modelNote:
        product.fitNotes?.trim() ||
        "The model (height 5'7\") is wearing a size S for reference. Fit may vary by silhouette.",
      rows: [
        { label: "Fit type", value: product.style?.trim() || "Tailored drape" },
        { label: "Length", value: "Designed length — refer to size guide for specifics." },
        { label: "Material", value: product.material?.trim() || "Premium blend (see product details)." },
        { label: "Sleeve type", value: "As designed for this piece." },
        { label: "Occasion", value: product.occasion?.trim() || "Versatile occasion wear." }
      ]
    }),
    [product.fitNotes, product.material, product.occasion, product.style]
  );

  const productDetailsNode = useMemo(
    () => (
      <ul className="list-inside list-disc space-y-2">
        <li>
          <span className="font-medium text-zinc-900">Style code:</span>{" "}
          {product.styleCode?.trim() ? (
            <span className="tabular-nums tracking-wide">{product.styleCode.trim()}</span>
          ) : (
            <span className="text-zinc-500">Not set — contact support if you need this for your order.</span>
          )}
        </li>
        <li>Category: {product.category}</li>
        {product.tags?.length ? (
          <li>
            Tags:{" "}
            {product.tags.map((t, i) => (
              <span key={`${t}-${i}`} className="mr-1 inline-block">
                {t}
              </span>
            ))}
          </li>
        ) : null}
        {product.material?.trim() ? <li>Material: {product.material.trim()}</li> : null}
        {product.style?.trim() ? <li>Style: {product.style.trim()}</li> : null}
        {product.occasion?.trim() ? <li>Occasion: {product.occasion.trim()}</li> : null}
      </ul>
    ),
    [product.category, product.material, product.occasion, product.style, product.styleCode, product.tags]
  );

  const moreInfoNode = useMemo(
    () =>
      product.story?.trim() ? (
        <p className="whitespace-pre-line">{product.story.trim()}</p>
      ) : (
        <p className="text-zinc-500">
          Crafted with Magenta Crown attention to detail. Contact concierge for bespoke inquiries.
        </p>
      ),
    [product.story]
  );

  const washCareText =
    product.careInstructions?.trim() || "Dry clean recommended. Store folded with a breathable garment bag.";

  if (isStaff) {
    return (
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <ProductPdpGalleryLuxury
            name={product.name}
            imageAlt={imageAlt}
            imageUrls={product.imageUrls}
            listImageIndex={product.listImageIndex ?? 0}
            listImagePosition={product.listImagePosition ?? "center"}
            onMagnifyFrame={() => {}}
          />
          {product.videoUrls.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Film</p>
              {product.videoUrls.map((url: string) => (
                <LazyProductVideo key={url} src={url} title={product.name} />
              ))}
            </div>
          )}
        </div>
        <div>
          <ProductPdpPurchaseBlock
            product={productForPurchase}
            purchase={purchase}
            reviewAvg={reviewAvg}
            reviewCount={reviewCount}
            variant="luxury"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(280px,0.88fr)] lg:items-start lg:gap-12">
      <div className="min-w-0 space-y-6">
        <ProductPdpGalleryLuxury
          name={product.name}
          imageAlt={imageAlt}
          imageUrls={product.imageUrls}
          listImageIndex={product.listImageIndex ?? 0}
          listImagePosition={product.listImagePosition ?? "center"}
          onMagnifyFrame={onMagnifyFrame}
        />
        {product.videoUrls.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Film</p>
            {product.videoUrls.map((url: string) => (
              <LazyProductVideo key={url} src={url} title={product.name} />
            ))}
          </div>
        )}
      </div>

      <div className="relative min-w-0 lg:sticky lg:top-28 lg:self-start">
        <div
          className={`relative z-10 space-y-6 transition-opacity duration-300 ease-out ${
            showZoomOverlay ? "opacity-[0.14]" : "opacity-100"
          }`}
        >
          <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">
            <Link
              href={product.category ? shopCategoryHref(product.category) : "/shop"}
              className="underline-offset-4 transition hover:text-crown-900 hover:underline"
            >
              {product.category}
            </Link>
          </p>

          <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
            <h1 className="min-w-0 max-w-[22rem] flex-1 font-[family-name:var(--font-heading)] text-3xl font-semibold leading-tight tracking-tight text-zinc-900 sm:max-w-none sm:text-4xl">
              {product.name}
            </h1>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
              <ProductWishlistToggle productId={product.id} initialWishlisted={initialWishlisted} variant="default" />
              <ProductShareButton
                productName={product.name}
                productUrl={productUrl}
                couponCode={firstActiveCouponCode}
                shareTemplate={shareMessageTemplate}
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

          <ProductPdpStatusPills
            inStock={inStockPill}
            readyToShip={readyToShip}
            lowStock={inStockPill && totalStock > 0 && totalStock <= 8}
          />

          {!(!singleDefault && totalSellable <= 0) ? (
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200/60 pb-6">
              <div>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-3xl font-semibold tracking-tight text-crown-900">Rs {price}</span>
                  {product.discountedPrice != null && (
                    <span className="text-lg text-zinc-400 line-through">Rs {product.mrp}</span>
                  )}
                  {offPct != null ? (
                    <span className="text-sm font-semibold text-rose-700">{offPct}% off</span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">{pricingNote}</p>
              </div>
              {reviewCount > 0 && reviewAvg != null ? (
                <div className="text-right text-sm text-zinc-600">
                  <span className="font-semibold text-amber-600">★ {reviewAvg.toFixed(1)}</span>
                  <span className="text-zinc-500"> ({reviewCount})</span>
                  {trustMeta && trustMeta.verifiedReviewCount > 0 ? (
                    <span className="mt-1 block text-[11px] text-emerald-800">
                      {trustMeta.verifiedReviewCount} verified purchase
                      {trustMeta.verifiedReviewCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <ProductPdpDeliveryTrust
            codEnabled={trustMeta?.codAvailable ?? product.codEnabled !== false}
            returnEligible={trustMeta?.returnable ?? product.returnable !== false}
            exchangeEligible={trustMeta?.exchangeable ?? product.exchangeable !== false}
            returnWindowDays={trustMeta?.returnWindowDays ?? Number(product.returnWindowDays ?? 7)}
            verifiedReviewCount={trustMeta?.verifiedReviewCount ?? 0}
            dispatchEstimate="Most orders ship within 2–3 business days; metro delivery typically 3–5 days after dispatch."
          />

          <div className="lg:contents">
            <div className="pointer-events-none max-lg:h-28 max-lg:shrink-0" aria-hidden />
            <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-[60] max-lg:border-t max-lg:border-zinc-200/90 max-lg:bg-[#faf9f8]/95 max-lg:p-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] max-lg:shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.12)] max-lg:backdrop-blur-md lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
              <ProductPdpPurchaseBlock
                product={productForPurchase}
                purchase={purchase}
                reviewAvg={reviewAvg}
                reviewCount={reviewCount}
                variant="luxury"
              />
            </div>
          </div>
        </div>
      </div>

      {mounted &&
        showZoomOverlay &&
        mag &&
        zoomStyle &&
        createPortal(
          <div
            ref={magnifierRef}
            style={{ left: magnifierPos.left, top: magnifierPos.top }}
            className="pointer-events-none fixed z-[6000] box-border h-[min(300px,calc(100dvh-32px))] max-h-[min(300px,calc(100dvh-32px))] w-[280px] max-w-[min(280px,calc(100vw-24px))] overflow-hidden rounded-xl border border-zinc-200/70 bg-zinc-50 shadow-xl ring-1 ring-zinc-950/5"
            aria-hidden
          >
            <Image
              src={mag.url}
              alt=""
              width={2400}
              height={2400}
              draggable={false}
              className="select-none will-change-transform"
              style={zoomStyle}
              unoptimized
            />
          </div>,
          document.body
        )}

      <div className="col-span-full space-y-10 border-t border-zinc-200/70 pt-10">
        <section>
          <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900">Description</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-700">{product.description}</p>
        </section>

        <ProductPdpLuxuryAccordions
          productDetailsContent={productDetailsNode}
          sizeFit={sizeFitCard}
          washCare={washCareText}
          moreInformation={moreInfoNode}
        />
      </div>
    </div>
  );
}

export const ProductPdpHeroExperience = memo(ProductPdpHeroExperienceInner);
