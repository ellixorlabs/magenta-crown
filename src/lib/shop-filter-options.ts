import { prisma } from "@/lib/prisma";

export type ShopFilterOptions = {
  categories: string[];
  occasions: string[];
  styles: string[];
  materials: string[];
  colors: string[];
  sizes: string[];
  /** Min/max MRP in catalog for price slider (shop only). */
  priceMin: number;
  priceMax: number;
};

function uniqSorted(values: (string | null | undefined)[]): string[] {
  const s = new Set<string>();
  for (const v of values) {
    const t = v?.trim();
    if (t) s.add(t);
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

function uniqFromArrays(arrays: string[][]): string[] {
  const s = new Set<string>();
  for (const arr of arrays) {
    for (const v of arr) {
      const t = v?.trim();
      if (t) s.add(t);
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

export async function getShopFilterOptions(): Promise<ShopFilterOptions> {
  const [products, agg] = await Promise.all([
    prisma.product.findMany({
      select: {
        category: true,
        occasion: true,
        style: true,
        material: true,
        colors: true,
        sizes: true
      }
    }),
    prisma.product.aggregate({
      _min: { mrp: true },
      _max: { mrp: true }
    })
  ]);

  let priceMin = Math.floor(agg._min.mrp ?? 0);
  let priceMax = Math.ceil(agg._max.mrp ?? 100_000);
  if (!Number.isFinite(priceMin)) priceMin = 0;
  if (!Number.isFinite(priceMax) || priceMax <= priceMin) priceMax = Math.max(priceMin + 1000, 100_000);

  return {
    categories: uniqSorted(products.map((p) => p.category)),
    occasions: uniqSorted(products.map((p) => p.occasion)),
    styles: uniqSorted(products.map((p) => p.style)),
    materials: uniqSorted(products.map((p) => p.material)),
    colors: uniqFromArrays(products.map((p) => p.colors)),
    sizes: uniqFromArrays(products.map((p) => p.sizes)),
    priceMin,
    priceMax
  };
}

export const PRICE_BUCKETS = [
  { value: "", label: "Any price" },
  { value: "0-5000", label: "Under ₹5,000" },
  { value: "5000-10000", label: "₹5,000 – ₹10,000" },
  { value: "10000-25000", label: "₹10,000 – ₹25,000" },
  { value: "25000-50000", label: "₹25,000 – ₹50,000" },
  { value: "50000-", label: "₹50,000+" }
] as const;

export function priceBucketToMinMax(value: string): { min: string | null; max: string | null } {
  if (!value) return { min: null, max: null };
  if (value === "0-5000") return { min: null, max: "5000" };
  if (value === "5000-10000") return { min: "5000", max: "10000" };
  if (value === "10000-25000") return { min: "10000", max: "25000" };
  if (value === "25000-50000") return { min: "25000", max: "50000" };
  if (value === "50000-") return { min: "50000", max: null };
  return { min: null, max: null };
}

export function minMaxToPriceBucket(minPrice?: string, maxPrice?: string): string {
  const min = minPrice ?? "";
  const max = maxPrice ?? "";
  if (!min && max === "5000") return "0-5000";
  if (min === "5000" && max === "10000") return "5000-10000";
  if (min === "10000" && max === "25000") return "10000-25000";
  if (min === "25000" && max === "50000") return "25000-50000";
  if (min === "50000" && !max) return "50000-";
  return "";
}
