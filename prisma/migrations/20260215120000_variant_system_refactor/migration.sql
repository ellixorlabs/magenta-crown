-- Variant system: stock per (color, size), isActive, remove legacy Product stock fields.
-- OrderItem.variantId optional link to ProductVariant.

-- 1. Rename inventory column
ALTER TABLE "ProductVariant" RENAME COLUMN "quantity" TO "stock";

-- 2. Active flag for storefront visibility
ALTER TABLE "ProductVariant" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- 3. Optional link from order lines to variant row
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;

-- 4. Products with no variant rows: one default SKU (uses legacy stockQuantity before drop)
INSERT INTO "ProductVariant" ("id", "productId", "color", "size", "stock", "isActive")
SELECT
  gen_random_uuid()::text,
  p.id,
  'Default',
  'One size',
  GREATEST(0, COALESCE(p."stockQuantity", 0)),
  true
FROM "Product" p
WHERE NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id);

-- 5. Remove legacy Product fields (stock + merchandising arrays — variants are source of truth)
ALTER TABLE "Product" DROP COLUMN IF EXISTS "stockQuantity";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "colors";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "sizes";

-- 6. FK order line → variant
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
