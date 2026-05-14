-- Per-product control for storefront size chart link (default: visible when chart image exists).
ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS "showSizeChart" boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public."Product"."showSizeChart" IS 'When true, PDP may show Size guide if a product or global size chart image is configured.';
