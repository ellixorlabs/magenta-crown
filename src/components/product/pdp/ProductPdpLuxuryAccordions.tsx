"use client";

import { ChevronDown } from "lucide-react";
import { memo, useCallback, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ProductPdpSizeFitCard, type ProductPdpSizeFitCardProps } from "@/components/product/pdp/ProductPdpSizeFitCard";

type Section = {
  id: string;
  title: string;
  content: ReactNode;
};

type Props = {
  productDetailsContent: ReactNode;
  sizeFit: ProductPdpSizeFitCardProps;
  washCare: string;
  moreInformation: ReactNode;
};

function ProductPdpLuxuryAccordionsInner({ productDetailsContent, sizeFit, washCare, moreInformation }: Props) {
  const baseId = useId();
  const sections = useMemo<Section[]>(
    () => [
      {
        id: "details",
        title: "Product details",
        content: <div className="text-sm leading-relaxed text-zinc-700">{productDetailsContent}</div>
      },
      {
        id: "fit",
        title: "Size & fit",
        content: <ProductPdpSizeFitCard {...sizeFit} />
      },
      {
        id: "wash",
        title: "Wash care",
        content: <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{washCare}</p>
      },
      {
        id: "more",
        title: "More information",
        content: <div className="text-sm leading-relaxed text-zinc-700">{moreInformation}</div>
      }
    ],
    [productDetailsContent, sizeFit, washCare, moreInformation]
  );

  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggle = useCallback((id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <div className="mt-12 border-t border-zinc-200/80 pt-8">
      <div className="divide-y divide-zinc-200/80">
        {sections.map((s) => {
          const isOpen = open[s.id] ?? false;
          const panelId = `${baseId}-${s.id}-panel`;
          const btnId = `${baseId}-${s.id}-btn`;
          return (
            <div key={s.id} className="py-1">
              <h2 className="m-0">
                <button
                  id={btnId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(s.id)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left transition-opacity hover:opacity-80"
                >
                  <span className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-zinc-900">
                    {s.title}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-300 ease-out ${
                      isOpen ? "rotate-180" : "rotate-0"
                    }`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </button>
              </h2>
              <div
                id={panelId}
                role="region"
                aria-labelledby={btnId}
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={`pb-5 pt-0 transition-opacity duration-300 ease-out ${isOpen ? "opacity-100" : "opacity-0"}`}
                  >
                    {s.content}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ProductPdpLuxuryAccordions = memo(ProductPdpLuxuryAccordionsInner);
