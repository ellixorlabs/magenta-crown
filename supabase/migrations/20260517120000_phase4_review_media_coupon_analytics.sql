-- Phase 4: ReviewMedia, coupon analytics aggregates + usage ledger, moderation HIDDEN,
-- Notification realtime (publication), review_images public read for storefront URLs.

-- ---------------------------------------------------------------------------
-- Review media (per review, multiple assets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ReviewMedia" (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "reviewId" text NOT NULL REFERENCES "Review"(id) ON DELETE CASCADE,
  type text NOT NULL,
  url text NOT NULL,
  "thumbnailUrl" text,
  "sizeBytes" integer NOT NULL DEFAULT 0,
  "mimeType" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewMedia_type_check" CHECK (type IN ('IMAGE', 'VIDEO'))
);

CREATE INDEX IF NOT EXISTS "ReviewMedia_reviewId_idx" ON "ReviewMedia" ("reviewId", "createdAt" DESC);

ALTER TABLE "ReviewMedia" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Coupon operational analytics (denormalized + usage ledger)
-- ---------------------------------------------------------------------------
ALTER TABLE "Coupon"
  ADD COLUMN IF NOT EXISTS "totalUses" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalRevenueGenerated" double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalDiscountGiven" double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "uniqueCustomersUsed" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastUsedAt" timestamp without time zone;

CREATE TABLE IF NOT EXISTS "CouponUsage" (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "couponId" text NOT NULL REFERENCES "Coupon"(id) ON DELETE CASCADE,
  "orderId" text NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "userId" text REFERENCES "User"(id) ON DELETE SET NULL,
  "discountAmount" double precision NOT NULL,
  "orderTotal" double precision NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponUsage_orderId_key" UNIQUE ("orderId")
);

CREATE INDEX IF NOT EXISTS "CouponUsage_couponId_createdAt_idx" ON "CouponUsage" ("couponId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "CouponUsage_userId_idx" ON "CouponUsage" ("userId");

ALTER TABLE "CouponUsage" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Moderation: hidden state (still server-filtered on storefront)
-- ---------------------------------------------------------------------------
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_moderationStatus_check";
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_moderationStatus_check" CHECK ("moderationStatus" IN ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'));

-- ---------------------------------------------------------------------------
-- Storefront can hotlink review images (bucket remains write-restricted via RLS)
-- ---------------------------------------------------------------------------
UPDATE storage.buckets SET public = true WHERE id = 'review_images';

UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 20971520
WHERE id = 'review_videos';

UPDATE storage.buckets
SET file_size_limit = 6291456
WHERE id = 'review_images';

-- ---------------------------------------------------------------------------
-- CouponUsage → Coupon aggregates (ledger is source of truth)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_coupon_stats_from_usage(p_coupon_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_n integer := 0;
  v_rev double precision := 0;
  v_disc double precision := 0;
  v_uniq integer := 0;
  v_last timestamp without time zone := NULL;
BEGIN
  SELECT
    COUNT(*)::integer,
    COALESCE(SUM(cu."orderTotal"), 0)::double precision,
    COALESCE(SUM(cu."discountAmount"), 0)::double precision,
    COUNT(DISTINCT cu."userId") FILTER (WHERE cu."userId" IS NOT NULL)::integer,
    MAX(cu."createdAt")
  INTO v_n, v_rev, v_disc, v_uniq, v_last
  FROM "CouponUsage" cu
  WHERE cu."couponId" = p_coupon_id;

  UPDATE "Coupon" c
  SET
    "totalUses" = v_n,
    "totalRevenueGenerated" = v_rev,
    "totalDiscountGiven" = v_disc,
    "uniqueCustomersUsed" = v_uniq,
    "lastUsedAt" = v_last
  WHERE c.id = p_coupon_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_coupon_usage_refresh_stats_ins()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_coupon_stats_from_usage(NEW."couponId");
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_coupon_usage_refresh_stats_del()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.refresh_coupon_stats_from_usage(OLD."couponId");
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS coupon_usage_refresh_stats ON "CouponUsage";
CREATE TRIGGER coupon_usage_refresh_stats
AFTER INSERT ON "CouponUsage"
FOR EACH ROW
EXECUTE FUNCTION public.trg_coupon_usage_refresh_stats_ins();

DROP TRIGGER IF EXISTS coupon_usage_refresh_stats_del ON "CouponUsage";
CREATE TRIGGER coupon_usage_refresh_stats_del
AFTER DELETE ON "CouponUsage"
FOR EACH ROW
EXECUTE FUNCTION public.trg_coupon_usage_refresh_stats_del();

-- ---------------------------------------------------------------------------
-- Realtime: staff notification inserts
-- ---------------------------------------------------------------------------
DO $pub$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "Notification";
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$pub$;
