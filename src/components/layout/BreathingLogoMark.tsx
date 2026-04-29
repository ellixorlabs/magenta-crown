"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/** Burgundy-canvas monogram (single brand mark asset site-wide). */
export const LOADER_LOGO_SRC = "/branding/mc-loader-logo.png";

type Props = {
  className?: string;
  sizeClassName?: string;
  /** Override image path (default is {@link LOADER_LOGO_SRC}). */
  logoSrc?: string;
  /** Forwarded to next/image `sizes` for responsive width hints. */
  imageSizes?: string;
  /**
   * Homepage full-screen intro: one 2.5s ease cycle (in → out), then holds steady.
   * Other surfaces keep a gentle infinite pulse.
   */
  homeIntroBreath?: boolean;
};

/** Brand mark with a subtle breathing scale animation (loader, nav fallbacks, segment loading). */
export function BreathingLogoMark({
  className = "",
  sizeClassName = "h-28 w-28 sm:h-40 sm:w-40",
  logoSrc = LOADER_LOGO_SRC,
  imageSizes,
  homeIntroBreath = false
}: Props) {
  const sizes = imageSizes ?? "(max-width: 640px) 112px, 160px";

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
      <Image
        src={logoSrc}
        alt="Magenta Crown"
        fill
        className="object-contain"
        sizes={sizes}
        priority
      />
    </motion.div>
  );
}
