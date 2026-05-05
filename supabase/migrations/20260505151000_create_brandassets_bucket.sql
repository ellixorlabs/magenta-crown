-- Brand-managed assets: favicon, breathing logo, and optional header wordmark image.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'brandassets',
  'brandassets',
  true,
  8388608,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/x-icon'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
