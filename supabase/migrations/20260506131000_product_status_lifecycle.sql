alter table if exists public."Product"
  add column if not exists "status" text not null default 'ACTIVE';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_status_check'
  ) then
    alter table public."Product"
      add constraint product_status_check
      check ("status" in ('ACTIVE', 'DRAFT', 'SOLD_OUT', 'ARCHIVED'));
  end if;
end
$$;

create index if not exists idx_product_status on public."Product"("status");

