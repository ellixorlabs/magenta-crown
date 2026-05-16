-- Phase 2B–2G: normalize Order payment vs fulfillment, timeline, returns/exchange foundation,
-- notifications foundation, Product return flags, Review verifiedPurchase, OrderItem.styleCode.
-- Preconditions: legacy "Order".status (text) exists. Data preserved via backfill before drop.

-- ---------------------------------------------------------------------------
-- Product return / exchange flags (2E)
-- ---------------------------------------------------------------------------
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "returnable" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "exchangeable" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "returnWindowDays" integer NOT NULL DEFAULT 14;

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_returnWindowDays_check";
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_returnWindowDays_check" CHECK ("returnWindowDays" >= 0 AND "returnWindowDays" <= 365);

-- ---------------------------------------------------------------------------
-- Review verified purchase flag (2F)
-- ---------------------------------------------------------------------------
ALTER TABLE "Review"
  ADD COLUMN IF NOT EXISTS "verifiedPurchase" boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- OrderItem.styleCode (align with app inserts; 2A gap)
-- ---------------------------------------------------------------------------
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "styleCode" text;

-- ---------------------------------------------------------------------------
-- New Order columns (2B) — add nullable first, backfill, then enforce
-- ---------------------------------------------------------------------------
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "orderStatus" text,
  ADD COLUMN IF NOT EXISTS "paymentStatus" text,
  ADD COLUMN IF NOT EXISTS "returnStatus" text,
  ADD COLUMN IF NOT EXISTS "exchangeStatus" text,
  ADD COLUMN IF NOT EXISTS "trackingNumber" text,
  ADD COLUMN IF NOT EXISTS "courierPartner" text,
  ADD COLUMN IF NOT EXISTS "deliveredAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "returnedAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "exchangeCompletedAt" timestamp without time zone,
  ADD COLUMN IF NOT EXISTS "adminNotes" text,
  ADD COLUMN IF NOT EXISTS "customerNotes" text;

-- Backfill from legacy status + paymentMethod (see docs/PHASE_2A_LIVE_SCHEMA.md)
UPDATE "Order" o
SET
  "paymentStatus" = CASE o.status
    WHEN 'PAID' THEN 'PAID'
    WHEN 'CANCELLED' THEN 'FAILED'
    ELSE 'PENDING'
  END,
  "orderStatus" = CASE
    WHEN o.status = 'CANCELLED' THEN 'CANCELLED'
    WHEN o.status IN ('PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED') THEN o.status
    WHEN o.status = 'RETURNED' THEN 'DELIVERED'
    WHEN o.status IN ('PENDING', 'PAID') THEN 'ORDER_PLACED'
    ELSE 'ORDER_PLACED'
  END,
  "returnStatus" = CASE WHEN o.status = 'RETURNED' THEN 'RETURNED' ELSE 'NONE' END,
  "exchangeStatus" = 'NONE'
WHERE o."orderStatus" IS NULL;

-- Normalize payment methods (2B / 2C)
UPDATE "Order" SET "paymentMethod" = 'COD' WHERE "paymentMethod" = 'CASH_ON_DELIVERY';

ALTER TABLE "Order" ALTER COLUMN "orderStatus" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "returnStatus" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "exchangeStatus" SET NOT NULL;

ALTER TABLE "Order" ALTER COLUMN "orderStatus" SET DEFAULT 'ORDER_PLACED';
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'PENDING';
ALTER TABLE "Order" ALTER COLUMN "returnStatus" SET DEFAULT 'NONE';
ALTER TABLE "Order" ALTER COLUMN "exchangeStatus" SET DEFAULT 'NONE';

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_orderStatus_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_orderStatus_check" CHECK ("orderStatus" IN (
  'ORDER_PLACED', 'PROCESSING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
));

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_paymentStatus_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentStatus_check" CHECK ("paymentStatus" IN (
  'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'
));

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_returnStatus_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_returnStatus_check" CHECK ("returnStatus" IN (
  'NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'RETURNED', 'REFUNDED'
));

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_exchangeStatus_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_exchangeStatus_check" CHECK ("exchangeStatus" IN (
  'NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'EXCHANGED'
));

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_paymentMethod_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentMethod_check" CHECK (
  "paymentMethod" IS NULL OR "paymentMethod" IN ('COD', 'RAZORPAY', 'UPI', 'CARD')
);

-- Drop legacy mixed column (2B)
ALTER TABLE "Order" DROP COLUMN IF EXISTS status;

CREATE INDEX IF NOT EXISTS "Order_orderStatus_idx" ON "Order" ("orderStatus");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order" ("paymentStatus");
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order" ("userId", "createdAt" DESC);

-- ---------------------------------------------------------------------------
-- OrderTimelineEvent (2B)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "OrderTimelineEvent" (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "orderId" text NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "actorRole" text,
  "actorId" text,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "OrderTimelineEvent_orderId_createdAt_idx"
  ON "OrderTimelineEvent" ("orderId", "createdAt" DESC);

ALTER TABLE "OrderTimelineEvent" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- ReturnRequest / ExchangeRequest (2E foundation)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ReturnRequest" (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "orderId" text NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "orderItemId" text REFERENCES "OrderItem"(id) ON DELETE SET NULL,
  "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'REQUESTED',
  "mediaUrls" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "adminResponse" text,
  "adminNotes" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReturnRequest_status_check" CHECK (status IN (
    'REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'COMPLETED', 'REFUNDED'
  ))
);

CREATE INDEX IF NOT EXISTS "ReturnRequest_orderId_idx" ON "ReturnRequest" ("orderId");
CREATE INDEX IF NOT EXISTS "ReturnRequest_userId_idx" ON "ReturnRequest" ("userId");
CREATE INDEX IF NOT EXISTS "ReturnRequest_status_idx" ON "ReturnRequest" (status);

ALTER TABLE "ReturnRequest" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "ExchangeRequest" (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  "orderId" text NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  "orderItemId" text REFERENCES "OrderItem"(id) ON DELETE SET NULL,
  "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'REQUESTED',
  "mediaUrls" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "adminResponse" text,
  "adminNotes" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExchangeRequest_status_check" CHECK (status IN (
    'REQUESTED', 'APPROVED', 'REJECTED', 'PICKED_UP', 'COMPLETED'
  ))
);

CREATE INDEX IF NOT EXISTS "ExchangeRequest_orderId_idx" ON "ExchangeRequest" ("orderId");
CREATE INDEX IF NOT EXISTS "ExchangeRequest_userId_idx" ON "ExchangeRequest" ("userId");
CREATE INDEX IF NOT EXISTS "ExchangeRequest_status_idx" ON "ExchangeRequest" (status);

ALTER TABLE "ExchangeRequest" ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Notification (2G) — recipientUserId for targeting; keep recipientRole per spec
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Notification" (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "isRead" boolean NOT NULL DEFAULT false,
  "recipientRole" text,
  "recipientUserId" text REFERENCES "User"(id) ON DELETE CASCADE,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" timestamp without time zone
);

CREATE INDEX IF NOT EXISTS "Notification_recipientUserId_isRead_idx"
  ON "Notification" ("recipientUserId", "isRead", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification" ("createdAt" DESC);

ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; explicit policies can be added in a follow-up migration for anon/auth clients.
