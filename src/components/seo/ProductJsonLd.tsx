import { getCanonicalSiteUrl } from "@/lib/seo";
import { getProductTotalStock } from "@/lib/variant-stock";
import type { Product, ProductVariant } from "@prisma/client";

type Row = Product & { variants?: Pick<ProductVariant, "stock" | "isActive">[] };

/**
 * Schema.org Product JSON-LD for rich results (price, availability).
 */
export function ProductJsonLd({ product }: { product: Row }) {
  const base = getCanonicalSiteUrl();
  const url = `${base}/product/${product.slug}`;
  const inStock = getProductTotalStock(product.variants ?? []) > 0;
  const price = product.discountedPrice ?? product.mrp;
  const images = (product.imageUrls?.length ? product.imageUrls : []).filter(Boolean).slice(0, 8);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.slug,
    category: product.category,
    url,
    image: images.length ? images : undefined,
    brand: {
      "@type": "Brand",
      name: "Magenta Crown"
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: String(price),
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "Magenta Crown"
      }
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
