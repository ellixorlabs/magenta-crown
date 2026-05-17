-- Dedupe transactional emails per order + event while pending/sent

CREATE UNIQUE INDEX IF NOT EXISTS email_outbox_order_event_dedupe_idx
  ON email_outbox (event_type, ((payload ->> 'orderId')))
  WHERE status IN ('PENDING', 'SENT')
    AND (payload ->> 'orderId') IS NOT NULL
    AND (payload ->> 'orderId') <> '';
