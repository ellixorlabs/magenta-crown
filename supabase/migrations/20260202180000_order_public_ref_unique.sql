-- Public order reference: external identifier only (UUID remains primary key on "Order").
-- Enables fast, conflict-free lookups by reference at checkout confirmation and payment APIs.
CREATE UNIQUE INDEX IF NOT EXISTS "Order_publicOrderRef_key" ON public."Order" ("publicOrderRef");
