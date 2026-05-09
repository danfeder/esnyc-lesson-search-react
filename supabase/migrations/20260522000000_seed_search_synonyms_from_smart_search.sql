-- Seed search_synonyms with the legacy hardcoded entries from the smart-search edge
-- function (supabase/functions/smart-search/index.ts) that the DB does not already cover,
-- AND add a CHECK constraint preventing whitespace in term/synonyms values.
--
-- Context: smart-search previously maintained a hardcoded TS dictionary (~58 entries)
-- for query expansion, while the search_lessons RPC used the search_synonyms DB table
-- via expand_search_with_synonyms(). PR 3a Task 3a.4 unifies these two paths by
-- refactoring smart-search to read from the DB. Pre-task probe (TEST + PROD identical,
-- 60 rows) showed the DB is already richer than the TS list in most areas, but the TS
-- dictionary covered ~13 distinct (term, synonym_type, synonyms) combinations the DB
-- lacks. This migration adds those before the TS dictionary is removed.
--
-- Multi-word value handling (load-bearing): the legacy TS dictionary contained five
-- multi-word phrases as synonym values ('winter celebration', 'harvest festival',
-- 'fall celebration', 'spring celebration', 'latin american'). These break Postgres
-- to_tsquery() because tsquery requires an explicit operator (&, |, <->) between
-- lexemes — a literal space is a syntax error. The pre-existing DB rows deliberately
-- contain no multi-word values for the same reason. Convention adopted: multi-word
-- phrases are stored as their constituent single-word tokens. The semantic shift
-- (e.g., 'christmas' now also matches content containing just 'winter' OR just
-- 'celebration', not the literal phrase) is acceptable because phrase semantics
-- never worked in either path. The CHECK constraint at the bottom of this migration
-- prevents future contributors from re-introducing the bug.
--
-- Idempotent: WHERE NOT EXISTS prevents duplicate inserts on re-run. Match key is
-- (term, synonym_type, synonyms). The same term may have multiple rows of different
-- types (already true today: 'thanksgiving' has both bidirectional and oneway rows).
--
-- Expected post-apply count on TEST + PROD: 73 (60 existing + 13 new).
--   Verify: SELECT count(*) FROM search_synonyms;
--
-- Verify no tsquery breakage post-apply (each MUST succeed without syntax error):
--   SELECT to_tsquery('english', expand_search_with_synonyms('christmas'));
--   SELECT to_tsquery('english', expand_search_with_synonyms('thanksgiving'));
--   SELECT to_tsquery('english', expand_search_with_synonyms('halloween'));
--   SELECT to_tsquery('english', expand_search_with_synonyms('easter'));
--   SELECT to_tsquery('english', expand_search_with_synonyms('latino'));
--   SELECT to_tsquery('english', expand_search_with_synonyms('hispanic'));

WITH new_rows(term, synonyms, synonym_type) AS (
  VALUES
    -- Bidirectional: gendered terms (existing DB row covers women/female/lady/ladies;
    -- TS list also covered women's, girls, girl, which the DB lacks).
    ('woman', ARRAY['girls', 'women''s', 'girl']::text[], 'bidirectional'::text),

    -- One-way ethnic terms: TS treated 'latino' as a key (DB has 'latin' and 'hispanic'
    -- but no 'latino' entry); TS also linked 'latin american' which is tokenized here
    -- to 'latin' + 'american' to satisfy the CHECK constraint.
    ('latino', ARRAY['hispanic', 'latina', 'latinx', 'latin', 'american', 'spanish']::text[], 'oneway'),
    ('hispanic', ARRAY['latin', 'american']::text[], 'oneway'),

    -- One-way holiday phrases: existing DB rows cover the basics; TS added evocative
    -- "X celebration" / "harvest festival" phrases tokenized here for tsquery safety.
    ('thanksgiving', ARRAY['harvest', 'festival']::text[], 'oneway'),
    ('christmas', ARRAY['winter', 'celebration', 'december']::text[], 'oneway'),
    ('halloween', ARRAY['fall', 'celebration']::text[], 'oneway'),
    ('easter', ARRAY['spring', 'celebration']::text[], 'oneway'),

    -- Typo corrections from the TS spellingSuggestions dictionary that the DB
    -- typo_correction rows do not cover.
    ('womans', ARRAY['woman''s']::text[], 'typo_correction'),
    ('vegatable', ARRAY['vegetable']::text[], 'typo_correction'),
    ('vegatables', ARRAY['vegetables']::text[], 'typo_correction'),
    ('recipie', ARRAY['recipe']::text[], 'typo_correction'),
    ('recipies', ARRAY['recipes']::text[], 'typo_correction'),
    ('middel', ARRAY['middle']::text[], 'typo_correction')
)
INSERT INTO search_synonyms (term, synonyms, synonym_type)
SELECT n.term, n.synonyms, n.synonym_type
FROM new_rows n
WHERE NOT EXISTS (
  SELECT 1 FROM search_synonyms s
  WHERE s.term = n.term
    AND s.synonym_type = n.synonym_type
    AND s.synonyms = n.synonyms
);

-- CHECK constraint: term and individual synonym values must not contain whitespace.
-- Multi-word values would produce invalid tsquery output from
-- expand_search_with_synonyms() (e.g. 'christmas | winter celebration' has no operator
-- between 'winter' and 'celebration'). Prevents the exact bug this migration's
-- tokenization avoids from quietly re-entering via future contributor inserts.
--
-- Constraint expression form: subqueries / unnest are not permitted in CHECK
-- expressions, so the synonyms array is collapsed to a single string that is
-- regex-checked for whitespace. Note: Postgres' '\s' regex (and '[[:space:]]')
-- match a broader range of control chars than POSIX C locale would suggest —
-- in particular they match 0x1f (Unit Separator) and other low-ASCII control
-- chars, so any non-empty separator like E'\x1f' would falsely flag every row
-- with a multi-element array. Empty separator '' avoids this: each synonym is
-- concatenated directly, and any whitespace inside an individual synonym
-- (the only case we want to forbid) still surfaces in the joined string.
ALTER TABLE search_synonyms
ADD CONSTRAINT search_synonyms_lexemes_no_whitespace
CHECK (
  term !~ '\s'
  AND array_to_string(synonyms, '') !~ '\s'
);
