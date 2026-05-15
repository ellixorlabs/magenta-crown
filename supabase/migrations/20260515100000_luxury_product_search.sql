-- Luxury catalog search: pg_trgm + weighted tsvector + ranked RPC.
-- Run on Supabase (extensions may require superuser — use dashboard if CREATE EXTENSION fails).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public."Product"
  ADD COLUMN IF NOT EXISTS "searchKeywords" text,
  ADD COLUMN IF NOT EXISTS "searchSynonyms" text,
  ADD COLUMN IF NOT EXISTS "searchDocument" tsvector;

COMMENT ON COLUMN public."Product"."searchKeywords" IS 'Comma/newline-separated extra tokens for search (admin + auto).';
COMMENT ON COLUMN public."Product"."searchSynonyms" IS 'Comma/newline-separated alternate spellings (admin).';
COMMENT ON COLUMN public."Product"."searchDocument" IS 'Weighted full-text document; maintained by trigger.';

CREATE OR REPLACE FUNCTION public.strip_search_query(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    trim(regexp_replace(lower(coalesce(p, '')), '[^a-z0-9[:space:]]+', ' ', 'g')),
    ''
  );
$$;

-- Token-level typo → canonical (FTS + plainto_tsquery). Add pairs as catalog grows.
CREATE OR REPLACE FUNCTION public.expand_search_typos(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s text := coalesce(p, '');
BEGIN
  s := regexp_replace(s, '\mkurthi\M', 'kurta', 'gi');
  s := regexp_replace(s, '\mkurtha\M', 'kurta', 'gi');
  s := regexp_replace(s, '\mkurti\M', 'kurta', 'gi');
  s := regexp_replace(s, '\mkurtees\M', 'kurti', 'gi');
  s := regexp_replace(s, '\mkurtee\M', 'kurti', 'gi');
  s := regexp_replace(s, '\mlehanga\M', 'lehenga', 'gi');
  s := regexp_replace(s, '\mlehangas\M', 'lehenga', 'gi');
  s := regexp_replace(s, '\manarkalli\M', 'anarkali', 'gi');
  s := regexp_replace(s, '\manarkalis\M', 'anarkali', 'gi');
  s := regexp_replace(s, '\msari\M', 'saree', 'gi');
  s := regexp_replace(s, '\msaris\M', 'saree', 'gi');
  s := regexp_replace(s, '\mshari\M', 'saree', 'gi');
  s := regexp_replace(s, '\mfestival\M', 'festive', 'gi');
  s := regexp_replace(s, '\mfestivals\M', 'festive', 'gi');
  s := regexp_replace(s, '\msherwani\M', 'sherwani', 'gi');
  s := regexp_replace(s, '\msalvar\M', 'salwar', 'gi');
  s := regexp_replace(s, '\msalwaar\M', 'salwar', 'gi');
  s := regexp_replace(s, '\mshalwar\M', 'salwar', 'gi');
  s := regexp_replace(s, '\mchaniya\M', 'ghagra', 'gi');
  s := regexp_replace(s, '\mcholi\M', 'choli', 'gi');
  s := regexp_replace(s, '\mgagra\M', 'ghagra', 'gi');
  RETURN trim(regexp_replace(s, '\s+', ' ', 'g'));
END;
$$;

CREATE OR REPLACE FUNCTION public.product_refresh_search_document()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  tag_blob text := coalesce(array_to_string(NEW.tags, ' '), '');
BEGIN
  NEW."searchDocument" :=
    setweight(to_tsvector('simple', coalesce(lower(NEW.name), '')), 'A')
    || setweight(to_tsvector('simple', coalesce(lower(NEW."styleCode"), '')), 'A')
    || setweight(to_tsvector('simple', coalesce(lower(NEW.category), '')), 'B')
    || setweight(to_tsvector('simple', lower(tag_blob)), 'C')
    || setweight(to_tsvector('simple', coalesce(lower(NEW.occasion), '')), 'C')
    || setweight(to_tsvector('simple', coalesce(lower(NEW.style), '')), 'C')
    || setweight(to_tsvector('simple', coalesce(lower(NEW.material), '')), 'C')
    || setweight(to_tsvector('simple', coalesce(lower(NEW."searchKeywords"), '')), 'B')
    || setweight(to_tsvector('simple', coalesce(lower(NEW."searchSynonyms"), '')), 'D')
    || setweight(to_tsvector('simple', coalesce(lower(NEW.description), '')), 'D')
    || setweight(to_tsvector('simple', coalesce(lower(NEW.story), '')), 'D')
    || setweight(to_tsvector('simple', coalesce(lower(NEW."fitNotes"), '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_search_document_tg ON public."Product";
-- Supabase PG15: EXECUTE FUNCTION. For PG11–13 use EXECUTE PROCEDURE instead.
CREATE TRIGGER product_search_document_tg
  BEFORE INSERT OR UPDATE OF name, description, category, tags, occasion, style, material, story, "fitNotes",
    "styleCode", "searchKeywords", "searchSynonyms"
  ON public."Product"
  FOR EACH ROW
  EXECUTE FUNCTION public.product_refresh_search_document();

UPDATE public."Product"
SET "searchKeywords" = COALESCE("searchKeywords", '');

CREATE INDEX IF NOT EXISTS product_search_document_gin
  ON public."Product" USING gin ("searchDocument");

CREATE INDEX IF NOT EXISTS product_name_trgm_idx
  ON public."Product" USING gin (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_style_code_trgm_idx
  ON public."Product" USING gin (lower(coalesce("styleCode", '')) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_category_trgm_idx
  ON public."Product" USING gin (lower(category) gin_trgm_ops);

-- Ranked shop/search: relevance when p_query set; respects filters + variant prefilter.
CREATE OR REPLACE FUNCTION public.shop_catalog_search(
  p_query text,
  p_category text[] DEFAULT ARRAY[]::text[],
  p_occasion text[] DEFAULT ARRAY[]::text[],
  p_style text[] DEFAULT ARRAY[]::text[],
  p_material text[] DEFAULT ARRAY[]::text[],
  p_min_mrp numeric DEFAULT NULL,
  p_max_mrp numeric DEFAULT NULL,
  p_product_ids uuid[] DEFAULT NULL,
  p_hide_oos boolean DEFAULT false,
  p_sort text DEFAULT 'new',
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 24
)
RETURNS TABLE(
  id uuid,
  search_score double precision,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  q_raw text;
  q_canon text;
  off int := greatest(0, (greatest(1, coalesce(p_page, 1)) - 1) * greatest(1, least(48, coalesce(p_page_size, 24))));
  lim int := greatest(1, least(48, coalesce(p_page_size, 24)));
  sort_key text := lower(trim(coalesce(p_sort, 'new')));
BEGIN
  PERFORM set_config('pg_trgm.similarity_threshold', '0.22', true);
  PERFORM set_config('pg_trgm.word_similarity_threshold', '0.45', true);
  q_raw := public.strip_search_query(p_query);
  IF q_raw IS NULL OR length(q_raw) < 2 THEN
    RETURN;
  END IF;
  q_canon := public.expand_search_typos(q_raw);

  RETURN QUERY
  WITH hits AS (
    SELECT
      p.id,
      (
        coalesce(ts_rank_cd(coalesce(p."searchDocument", ''::tsvector), plainto_tsquery('simple', q_canon)), 0) * 26.0
        + coalesce(ts_rank_cd(coalesce(p."searchDocument", ''::tsvector), plainto_tsquery('simple', q_raw)), 0) * 12.0
        + greatest(similarity(lower(p.name), q_raw), similarity(lower(p.name), q_canon)) * 14.0
        + greatest(
            similarity(lower(coalesce(p."styleCode", '')), q_raw),
            similarity(lower(coalesce(p."styleCode", '')), q_canon)
          ) * 16.0
        + CASE
            WHEN lower(p.category) LIKE '%' || q_raw || '%' OR lower(p.category) LIKE '%' || q_canon || '%' THEN 7.0
            ELSE 0
          END
        + greatest(
            word_similarity(q_raw, lower(coalesce(p.description, ''))),
            word_similarity(q_canon, lower(coalesce(p.description, '')))
          ) * 5.0
        + greatest(
            word_similarity(q_raw, lower(coalesce(p.story, ''))),
            word_similarity(q_canon, lower(coalesce(p.story, '')))
          ) * 3.0
      ) AS sc,
      p.mrp AS mrp_v,
      p."createdAt" AS created_v,
      p.name AS name_v
    FROM public."Product" p
    WHERE p.status = 'ACTIVE'
      AND (p_product_ids IS NULL OR p.id = ANY (p_product_ids))
      AND (cardinality(p_category) = 0 OR p.category = ANY (p_category))
      AND (cardinality(p_occasion) = 0 OR p.occasion = ANY (p_occasion))
      AND (cardinality(p_style) = 0 OR p.style = ANY (p_style))
      AND (
        cardinality(p_material) = 0
        OR EXISTS (
          SELECT 1
          FROM unnest(p_material) m(mat)
          WHERE p.material IS NOT NULL AND lower(p.material) LIKE '%' || lower(trim(mat)) || '%'
        )
      )
      AND (p_min_mrp IS NULL OR p.mrp >= p_min_mrp)
      AND (p_max_mrp IS NULL OR p.mrp <= p_max_mrp)
      AND (
        NOT p_hide_oos
        OR EXISTS (
          SELECT 1
          FROM public."ProductVariant" v
          WHERE v."productId" = p.id AND v."isActive" = true AND v.stock > 0
        )
      )
      AND (
        coalesce(p."searchDocument", ''::tsvector) @@ plainto_tsquery('simple', q_canon)
        OR coalesce(p."searchDocument", ''::tsvector) @@ plainto_tsquery('simple', q_raw)
        OR lower(p.name) OPERATOR (pg_catalog.%) q_raw
        OR lower(p.name) OPERATOR (pg_catalog.%) q_canon
        OR lower(coalesce(p."styleCode", '')) OPERATOR (pg_catalog.%) q_raw
        OR lower(coalesce(p."styleCode", '')) OPERATOR (pg_catalog.%) q_canon
        OR lower(p.category) OPERATOR (pg_catalog.%) q_raw
        OR lower(p.category) OPERATOR (pg_catalog.%) q_canon
        OR EXISTS (
          SELECT 1
          FROM unnest(coalesce(p.tags, array[]::text[])) t(tag)
          WHERE lower(tag) OPERATOR (pg_catalog.%) q_raw OR lower(tag) OPERATOR (pg_catalog.%) q_canon
        )
        OR word_similarity(q_raw, lower(coalesce(p.description, ''))) > 0.32
        OR word_similarity(q_canon, lower(coalesce(p.description, ''))) > 0.32
        OR lower(coalesce(p.occasion, '')) OPERATOR (pg_catalog.%) q_raw
        OR lower(coalesce(p.occasion, '')) OPERATOR (pg_catalog.%) q_canon
        OR lower(coalesce(p.style, '')) OPERATOR (pg_catalog.%) q_raw
        OR lower(coalesce(p.style, '')) OPERATOR (pg_catalog.%) q_canon
        OR lower(coalesce(p.material, '')) OPERATOR (pg_catalog.%) q_raw
        OR lower(coalesce(p.material, '')) OPERATOR (pg_catalog.%) q_canon
      )
  ),
  counted AS (
    SELECT h.*, count(*) OVER () AS tc
    FROM hits h
  ),
  ordered AS (
    SELECT c.id, c.sc::double precision AS scc, c.tc,
      c.mrp_v,
      c.created_v,
      c.name_v
    FROM counted c
    ORDER BY
      CASE WHEN sort_key IN ('price-asc', 'price_asc') THEN c.mrp_v END ASC NULLS LAST,
      CASE WHEN sort_key IN ('price-desc', 'price_desc') THEN c.mrp_v END DESC NULLS LAST,
      CASE WHEN sort_key = 'name' THEN c.name_v END ASC NULLS LAST,
      c.sc DESC NULLS LAST,
      c.created_v DESC NULLS LAST,
      c.id DESC
  )
  SELECT o.id, o.scc, o.tc
  FROM ordered o
  OFFSET off
  LIMIT lim;
END;
$$;

COMMENT ON FUNCTION public.shop_catalog_search IS 'Weighted FTS + pg_trgm match for storefront catalog; typo expansion inside expand_search_typos.';
