-- Homepage merchandising banners (separate from HomePageConfig.payload for clean per-block fields).
create table if not exists public."HomePageBanner" (
  id text primary key,
  "desktopImageUrl" text not null default '',
  "mobileImageUrl" text not null default '',
  "redirectUrl" text not null default '/shop',
  title text not null default '',
  "sortOrder" integer not null default 0,
  "isVisible" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "HomePageBanner_sortOrder_idx" on public."HomePageBanner" ("sortOrder");

alter table public."HomePageBanner" enable row level security;

-- Public storefront reads banners via service role; optional anon read of visible rows.
create policy "HomePageBanner_select_visible"
  on public."HomePageBanner"
  for select
  to anon, authenticated
  using ("isVisible" = true);

grant select on table public."HomePageBanner" to anon, authenticated;
grant all on table public."HomePageBanner" to service_role;

-- Ensure public homepage asset bucket (WebP-only after app pipeline).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'homepage',
  'homepage',
  true,
  8388608,
  array['image/webp', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
