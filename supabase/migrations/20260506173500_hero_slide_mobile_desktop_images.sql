alter table if exists public."HeroSlide"
  add column if not exists "imageUrlMobile" text;

alter table if exists public."HeroSlide"
  add column if not exists "imageUrlDesktop" text;

update public."HeroSlide"
set
  "imageUrlMobile" = coalesce(nullif("imageUrlMobile", ''), "imageUrl"),
  "imageUrlDesktop" = coalesce(nullif("imageUrlDesktop", ''), "imageUrl")
where true;

