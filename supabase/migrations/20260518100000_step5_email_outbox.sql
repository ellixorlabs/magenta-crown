-- Step 5D: transactional email queue (snake_case for reliable PostgREST)

CREATE TABLE IF NOT EXISTS email_outbox (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at timestamp without time zone,
  CONSTRAINT email_outbox_status_check CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS email_outbox_status_created_idx ON email_outbox (status, created_at DESC);

ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;
