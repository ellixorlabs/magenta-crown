-- Shop / search catalog: partial indexes for active inventory (Postgres + Supabase).
-- Safe to run multiple times (IF NOT EXISTS).

create index if not exists idx_product_active_category_created
  on public."Product" ("category", "createdAt" desc)
  where "status" = 'ACTIVE';

create index if not exists idx_product_active_mrp
  on public."Product" ("mrp")
  where "status" = 'ACTIVE';

create index if not exists idx_product_active_occasion
  on public."Product" ("occasion")
  where "status" = 'ACTIVE' and "occasion" is not null and trim("occasion") <> '';

create index if not exists idx_product_active_style
  on public."Product" ("style")
  where "status" = 'ACTIVE' and "style" is not null and trim("style") <> '';

create index if not exists idx_product_active_material
  on public."Product" ("material")
  where "status" = 'ACTIVE' and "material" is not null and trim("material") <> '';

create index if not exists idx_product_variant_product_active
  on public."ProductVariant" ("productId")
  where "isActive" = true;

create index if not exists idx_product_variant_color_active
  on public."ProductVariant" ("color", "productId")
  where "isActive" = true and "color" is not null;

create index if not exists idx_product_variant_size_active
  on public."ProductVariant" ("size", "productId")
  where "isActive" = true and "size" is not null;

create index if not exists idx_product_variant_instock
  on public."ProductVariant" ("productId")
  where "isActive" = true and coalesce("stock", 0) > 0;
