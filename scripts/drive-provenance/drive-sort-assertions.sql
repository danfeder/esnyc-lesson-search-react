-- =====================================================
-- Drive-true 'modified' sort assertions (LOCAL ONLY — PR-B scope).
-- =====================================================
-- Validates migration 20260717174811_drive_modified_sort_switch.sql:
-- `order_by => 'modified'` = drive_modified_at DESC NULLS LAST with the
-- deterministic title/lesson_id tie-breakers and NO updated_at fallback.
-- Split from drive-provenance-db-assertions.sql (PR-A) because PR-A's
-- search_lessons deliberately still sorts 'modified' by updated_at.
--
-- Run against the LOCAL stack only, after `supabase db reset` on a tree that
-- contains BOTH provenance migrations:
--   docker exec -i supabase_db_esynyc-lessonsearch-v2 psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < scripts/drive-provenance/drive-sort-assertions.sql
--
-- One transaction, ends ROLLBACK — never persists anything.
-- =====================================================

BEGIN;

DO $$
DECLARE
  ids text[];
BEGIN
  -- A clean, fully-controlled corpus for the sort assertion.
  DELETE FROM public.lessons;

  INSERT INTO public.lessons (lesson_id, title, summary, file_link, drive_modified_at, updated_at)
  VALUES
    -- updated_at values are deliberately INVERTED vs drive_modified_at so a
    -- silent fallback to updated_at (the failure this suite exists to catch)
    -- produces a detectably different order.
    ('T-SORT-NEWEST', 'Newest', 's', '#', '2026-06-01T00:00:00Z', '2020-01-01T00:00:00Z'),
    ('T-SORT-MID',    'Middle', 's', '#', '2025-01-01T00:00:00Z', '2024-01-01T00:00:00Z'),
    ('T-SORT-OLD',    'Oldest', 's', '#', '2020-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
    -- NULL drive_modified_at rows sink LAST regardless of title/updated_at,
    -- tie-breaking among themselves on title then lesson_id.
    ('T-SORT-NULL-B', 'A-title-but-null-date', 's', '#', NULL, '2026-05-01T00:00:00Z'),
    ('T-SORT-NULL-A', 'A-title-but-null-date', 's', '#', NULL, '2026-05-01T00:00:00Z');

  SELECT array_agg(r.lesson_id ORDER BY ord)
  INTO ids
  FROM (SELECT ROW_NUMBER() OVER () AS ord, * FROM public.search_lessons(order_by => 'modified')) r;

  IF ids IS DISTINCT FROM ARRAY['T-SORT-NEWEST','T-SORT-MID','T-SORT-OLD','T-SORT-NULL-A','T-SORT-NULL-B'] THEN
    RAISE EXCEPTION 'ASSERT SORT FAILED: modified order was % (updated_at fallback or broken tie-breakers?)', ids;
  END IF;

  RAISE NOTICE 'PASS: modified sort = drive_modified_at DESC NULLS LAST, no updated_at fallback';
END $$;

ROLLBACK;
