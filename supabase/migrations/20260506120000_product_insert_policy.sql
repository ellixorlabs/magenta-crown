-- Allow authenticated users to insert products through Data API when RLS is enabled.
alter table if exists public."Product" enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'Product'
      and policyname = 'product_insert_authenticated'
  ) then
    create policy "product_insert_authenticated"
      on public."Product"
      for insert
      to authenticated
      with check (true);
  end if;
end
$$;
