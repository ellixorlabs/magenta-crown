-- Support inquiry notes + staff assignment

ALTER TABLE "SupportInquiry"
  ADD COLUMN IF NOT EXISTS "assignedStaffId" text,
  ADD COLUMN IF NOT EXISTS "assignedStaffName" text,
  ADD COLUMN IF NOT EXISTS "assignedAt" timestamp without time zone;

CREATE TABLE IF NOT EXISTS "SupportInquiryNote" (
  id text PRIMARY KEY,
  "inquiryId" text NOT NULL REFERENCES "SupportInquiry" (id) ON DELETE CASCADE,
  body text NOT NULL,
  "staffUserId" text,
  "staffName" text NOT NULL,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SupportInquiryNote_inquiry_created_idx"
  ON "SupportInquiryNote" ("inquiryId", "createdAt" ASC);

ALTER TABLE "SupportInquiryNote" ENABLE ROW LEVEL SECURITY;
