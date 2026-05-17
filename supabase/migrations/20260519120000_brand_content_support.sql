-- Brand CMS + support inquiries

CREATE TABLE IF NOT EXISTS "BrandContent" (
  id text PRIMARY KEY,
  "sectionKey" text NOT NULL UNIQUE,
  title text,
  content text,
  "jsonData" jsonb,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "BrandContent_sectionKey_idx" ON "BrandContent" ("sectionKey");

ALTER TABLE "BrandContent" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "SupportInquiry" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" timestamp without time zone,
  CONSTRAINT "SupportInquiry_status_check" CHECK (status IN ('OPEN', 'RESOLVED'))
);

CREATE INDEX IF NOT EXISTS "SupportInquiry_status_created_idx" ON "SupportInquiry" (status, "createdAt" DESC);

ALTER TABLE "SupportInquiry" ENABLE ROW LEVEL SECURITY;
