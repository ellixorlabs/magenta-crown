"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export const BREATHING_LOGO_SRC = "/branding/mc-logo.png";

type Props = {
  className?: string;
  sizeClassName?: string;
};

/** Brand mark with a subtle breathing scale animation (shared by global loader and nav fallbacks). */
export function BreathingLogoMark({ className = "", sizeClassName = "h-28 w-28 sm:h-40 sm:w-40" }: Props) {
  return (
    <motion.div
      animate={{ scale: [1, 1.06, 1] }}
      transition={{
        duration: 2.4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={`relative ${sizeClassName} ${className}`}
    >
      <Image
        src={BREATHING_LOGO_SRC}
        alt="Magenta Crown"
        fill
        className="object-contain"
        sizes="(max-width: 640px) 112px, 160px"
        priority
      />
    </motion.div>
  );
}
