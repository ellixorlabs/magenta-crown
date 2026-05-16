-- Phase 3: return/exchange model expansion, verified reviews, notifications actionUrl,
-- admin audit log, review storage buckets, partial uniques, realtime publication hint.

-- ---------------------------------------------------------------------------
-- Product: default return window 7 days (existing rows unchanged)
-- ---------------------------------------------------------------------------
ALTER TABLE "Product" ALTER COLUMN "returnWindowDays" SET DEFAULT 7;

-- ---------------------------------------------------------------------------
-- ReturnRequest: align statuses with Phase 3, expand columns
-- ---------------------------------------------------------------------------
ALTER TABLE "ReturnRequest" DROP CONSTRAINT IF EXISTS "ReturnRequest_status_check";

UPDATE "ReturnRequest" SET status = 'RECEIVED' WHERE status = 'COMPLETED';

UPDATE "ReturnRequest" SET "adminNotes" = COALESCE("adminNotes", "adminResponse")
WHERE "adminResponse" IS NOT NULL AND ("adminNotes" IS NULL OR trim("adminNotes") = '');

ALTER TABLE "ReturnRequest" DROP COLUMN IF EXISTS "adminResponse";

ALTER TABLE "ReturnRequest"
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS "customerNotes" text,
  ADD COLUMN IF NOT EXISTS "pickupTrackingNumber" text,
  ADD COLUMN IF NOT EXISTS "pickupCourier" text,
  ADD COLUMN IF NOT EXISTS "refundAmount" double precision,
  ADD COLUMN IF NOT EXISTS "refundStatus" text NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "approvedAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "rejectedAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "pickedUpAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "receivedAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "refundedAt" timestamp without time zone;

ALTER TABLE "ReturnRequest" DROP CONSTRAINT IF EXISTS "ReturnRequest_refundStatus_check";
ALTER TABLE "ReturnRequest"
  ADD CONSTRAINT "ReturnRequest_refundStatus_check" CHECK ("refundStatus" IN ('NONE', 'PENDING', 'COMPLETED', 'FAILED'));

ALTER TABLE "ReturnRequest" DROP CONSTRAINT IF EXISTS "ReturnRequest_status_check_v2";
ALTER TABLE "ReturnRequest"
  ADD CONSTRAINT "ReturnRequest_status_check_v2" CHECK (status IN (
    'REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'RECEIVED', 'REFUNDED'
  ));

DROP INDEX IF EXISTS "ReturnRequest_orderItemId_open_idx";
CREATE UNIQUE INDEX "ReturnRequest_orderItemId_open_idx"
  ON "ReturnRequest" ("orderItemId")
  WHERE "orderItemId" IS NOT NULL
    AND status NOT IN ('REJECTED', 'REFUNDED');

-- ---------------------------------------------------------------------------
-- ExchangeRequest: Phase 3 fields
-- ---------------------------------------------------------------------------
ALTER TABLE "ExchangeRequest"
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS "customerNotes" text,
  ADD COLUMN IF NOT EXISTS "requestedSize" text,
  ADD COLUMN IF NOT EXISTS "requestedVariantId" text REFERENCES "ProductVariant"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "approvedAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "rejectedAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "pickedUpAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "completedAt" timestamp without time zone;

DROP INDEX IF EXISTS "ExchangeRequest_orderItemId_open_idx";
CREATE UNIQUE INDEX "ExchangeRequest_orderItemId_open_idx"
  ON "ExchangeRequest" ("orderItemId")
  WHERE "orderItemId" IS NOT NULL
    AND status NOT IN ('REJECTED', 'COMPLETED');

-- ---------------------------------------------------------------------------
-- Review: verified purchase linkage + moderation
-- ---------------------------------------------------------------------------
ALTER TABLE "Review"
  ADD COLUMN IF NOT EXISTS "orderId" text REFERENCES "Order"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "orderItemId" text REFERENCES "OrderItem"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "moderationStatus" text NOT NULL DEFAULT 'APPROVED';

UPDATE "Review" SET "moderationStatus" = 'APPROVED' WHERE "moderationStatus" IS NULL;

ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_moderationStatus_check";
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_moderationStatus_check" CHECK ("moderationStatus" IN ('PENDING', 'APPROVED', 'REJECTED'));

CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderItemId_unique_idx"
  ON "Review" ("orderItemId")
  WHERE "orderItemId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Review_productId_moderation_idx" ON "Review" ("productId", "moderationStatus");

-- ---------------------------------------------------------------------------
-- Notification: deep link for admin UI
-- ---------------------------------------------------------------------------
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "actionUrl" text;

-- ---------------------------------------------------------------------------
-- Admin audit trail (role changes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "actorId" text NOT NULL,
  "actorRole" text NOT NULL,
  action text NOT NULL,
  "targetUserId" text REFERENCES "User"(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog" ("targetUserId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog" ("createdAt" DESC);

ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Staff can read own notifications (browser Supabase client = same auth user id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Notification_select_own" ON "Notification";
CREATE POLICY "Notification_select_own"
  ON "Notification"
  FOR SELECT
  TO authenticated
  USING ("recipientUserId" IS NOT NULL AND "recipientUserId" = (SELECT auth.uid()::text));

-- Realtime: enable "Notification" in Dashboard → Database → Publications → supabase_realtime if needed.

-- ---------------------------------------------------------------------------
-- Storage: review media (upload architecture; UI later)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review_images',
  'review_images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review_videos',
  'review_videos',
  false,
  52428800,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {userId}/{reviewId}/...
DROP POLICY IF EXISTS "review_images_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "review_images_select_own" ON storage.objects;
DROP POLICY IF EXISTS "review_images_update_own" ON storage.objects;
DROP POLICY IF EXISTS "review_videos_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "review_videos_select_own" ON storage.objects;
DROP POLICY IF EXISTS "review_videos_update_own" ON storage.objects;

CREATE POLICY "review_images_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review_images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "review_images_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'review_images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "review_images_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'review_images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "review_videos_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review_videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "review_videos_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'review_videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

CREATE POLICY "review_videos_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'review_videos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );
