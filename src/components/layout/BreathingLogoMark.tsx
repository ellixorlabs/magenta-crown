"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/** Burgundy-canvas monogram (single brand mark asset site-wide). */
export const LOADER_LOGO_SRC = "/branding/mc-loader-logo.png";
export const LOADER_LOGO_WEBP = "/branding/mc-loader-logo.webp";

type Props = {
  className?: string;
  sizeClassName?: string;
  /** Override image path (default is {@link LOADER_LOGO_SRC}). */
  logoSrc?: string;
  /** Forwarded to next/image `sizes` when using the optimizer (remote / non-bundled assets). */
  imageSizes?: string;
  /**
   * Homepage full-screen intro: one 2.5s ease cycle (in → out), then holds steady.
   * Other surfaces keep a gentle infinite pulse.
   */
  homeIntroBreath?: boolean;
  /**
   * When true, never use next/image `priority` and use low fetch priority so the
   * storefront hero (/) can win LCP. When false (e.g. boot on `/shop`), the loader may
   * use `priority` so the mark paints quickly — see `RootWrapper` pathname logic.
   */
  competeWithHeroLcp?: boolean;
  /**
   * Forwarded to next/image when applicable. Ignored when `competeWithHeroLcp` is true
   * (hero route keeps LCP on the first hero slide per product decision).
   */
  priority?: boolean;
};

function LocalLoaderPicture({
  fetchPriority,
  imgClassName
}: {
  fetchPriority: "high" | "low" | "auto";
  imgClassName: string;
}) {
  return (
    <picture>
      <source srcSet={LOADER_LOGO_WEBP} type="image/webp" />
      {/* Explicit intrinsic box: small decode; WebP + PNG fallback without expanding `images.qualities`. */}
      <img
        src={LOADER_LOGO_SRC}
        width={208}
        height={208}
        alt="Magenta Crown"
        className={imgClassName}
        decoding="async"
        loading="eager"
        fetchPriority={fetchPriority}
      />
    </picture>
  );
}

/** Brand mark with a subtle breathing scale animation (loader, nav fallbacks, segment loading). */
export function BreathingLogoMark({
  className = "",
  sizeClassName = "h-28 w-28 sm:h-40 sm:w-40",
  logoSrc = LOADER_LOGO_SRC,
  imageSizes,
  homeIntroBreath = false,
  competeWithHeroLcp = false,
  priority = false
}: Props) {
  const sizes = imageSizes ?? "(max-width: 640px) 112px, 160px";
  const imgClassName = "h-full w-full object-contain";
  const useBuiltInLocal = logoSrc === LOADER_LOGO_SRC || logoSrc === LOADER_LOGO_WEBP;
  const effectivePriority = Boolean(priority) && !competeWithHeroLcp;
  const fetchPriority: "high" | "low" | "auto" = competeWithHeroLcp ? "low" : effectivePriority ? "high" : "auto";

  return (
    <motion.div
      animate={{ scale: homeIntroBreath ? [1, 1.07, 1] : [1, 1.045, 1] }}
      transition={
        homeIntroBreath
          ? { duration: 2.5, ease: [0.42, 0, 0.58, 1], times: [0, 0.5, 1] }
          : {
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut"
            }
      }
      className={`relative ${sizeClassName} ${className}`}
    >
      {useBuiltInLocal ? (
        <LocalLoaderPicture fetchPriority={fetchPriority} imgClassName={imgClassName} />
      ) : (
        <Image
          src={logoSrc}
          alt="Magenta Crown"
          fill
          className="object-contain"
          sizes={sizes}
          quality={75}
          priority={effectivePriority}
          loading="eager"
          fetchPriority={fetchPriority}
        />
      )}
    </motion.div>
  );
}
