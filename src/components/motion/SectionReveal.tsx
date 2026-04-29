"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { SectionTransition } from "@/lib/home-page-types";

const presets: Record<
  SectionTransition,
  { initial: Record<string, number>; animate: Record<string, number> }
> = {
  fade: { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 } },
  slide: { initial: { opacity: 0, x: -36 }, animate: { opacity: 1, x: 0 } },
  zoom: { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 } },
  none: { initial: {}, animate: {} }
};

export function SectionReveal({
  transition,
  className = "",
  children
}: {
  transition: SectionTransition;
  className?: string;
  children: ReactNode;
}) {
  if (transition === "none") {
    return <div className={className}>{children}</div>;
  }

  const p = presets[transition];
  return (
    <motion.div
      className={className}
      initial={p.initial}
      whileInView={p.animate}
      /** Positive root margin so below-the-fold sections still intersect on first paint; avoid negative margin (harder to trigger on mobile). */
      viewport={{ once: true, amount: 0.08, margin: "0px 0px 120px 0px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
