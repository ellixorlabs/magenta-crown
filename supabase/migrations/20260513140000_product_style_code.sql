-- Internal inventory / rack code (distinct from customer-facing "style" text).
alter table if exists public."Product"
  add column if not exists "styleCode" text;

-- Snapshot at order time so fulfillment still sees the code if the product row changes later.
alter table if exists public."OrderItem"
  add column if not exists "styleCode" text;
