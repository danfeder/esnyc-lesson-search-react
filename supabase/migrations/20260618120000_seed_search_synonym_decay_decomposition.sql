-- =====================================================
-- Migration: 20260618120000_seed_search_synonym_decay_decomposition.sql
-- =====================================================
-- Description: S3 (Search Modernization "Medium") — add ONE curated everyday->official
-- synonym-bridge row to public.search_synonyms:  'decay' -> 'decomposition'.
--
-- WHY (eval-gated, single row): the S3 synonym bridge is gated on MEASURED lift against the
-- frozen, product-owner-confirmed search-eval gold (scripts/search-eval/queries.json). A
-- read-only pre-screen + a FAITHFUL TEST-load eval (npm run eval:search, target=test, with this
-- exact row loaded into TEST then removed) showed that under the frozen gold exactly ONE
-- candidate pair produces a clean, regression-free win:
--     q05 "decay":  recall@10 0.000 -> 0.857,  top1 false -> true,  RR 0.000 -> 1.000
--                   total_count 1 -> 60  (q05 carries no maxTotalCount guard).
--                   -> brings the everyday word "decay" to parity with "decomposition" itself.
--     Aggregate:    mean recall@10 0.642 -> 0.728 ;  corpus MRR 0.846 -> 0.923.
--     ZERO regression: mean precision@10 (0.833), predicate pass-rate (11/16), dup-flood (0),
--     the q22 sentinel (jaccard 1.000, count delta 0), and every maxTotalCount guard are all
--     byte-identical before/after. No new control/sentinel movement anywhere.
--
-- Every other design-listed candidate was REJECTED by the eval gate (measured on TEST):
--   * compost->decomposition   — regresses the q21 "compost" control (precision 8->6 primaries
--                                in top-10; total_count 178->189 > its 178 guard) AND the q22
--                                sentinel (top-10 overlap 10->7 => jaccard ~0.54 < 0.8 alarm).
--   * rotting->decomposition   — partial recall lift but trips q06's maxTotalCount guard
--                                (567->582); the multi-word "food" flood is the deferred
--                                server-side OR->AND work (design §9), not a synonym fix.
--   * pickling->preservation   — q08 already at recall@10 1.000 (no headroom; pure noise).
--   * chlorophyll->photosynthesis, pollination->pollinators, camouflage->adaptations,
--     fungi|yeast->microorganisms, composting|decomposers->decomposition — all CORRECT synonyms
--     but with NO discriminating query in the frozen gold, so their lift cannot be measured and
--     they cannot ship under "ship only on measured lift". (composting also has hidden blast
--     radius on q03's normalized "worm composting" call.) Independently confirmed by an
--     adversarial Codex review (verdict A: ship decay->decomposition only; B = scope creep).
-- The design's "~12-18 rows" was an estimate, not a requirement; the frozen gold justifies one.
--
-- MECHANISM: public.search_lessons() calls expand_search_with_synonyms(query). For a `oneway`
-- row whose term == a query word, the synonyms are OR-appended into the tsquery — so the word
-- "decay" expands to the tsquery `decay | decomposition` (verified live on TEST). `oneway` is
-- DIRECTIONAL: searching "decomposition" does NOT pull in "decay", so results for the official
-- term are unchanged (q07 "decomposition" byte-identical in the eval).
--
-- CONSTRAINTS / SHAPE: both sides are single-token (the search_synonyms_lexemes_no_whitespace
-- CHECK forbids whitespace). Idempotent: WHERE NOT EXISTS on the EXACT (term, synonym_type,
-- synonyms) tuple — the table has NO UNIQUE on `term` and NO tag/source column, so the full
-- tuple is the only match key (same pattern as 20260522000000_seed_search_synonyms_*).
--
-- DATA SAFETY: this is a single DATA-ROW INSERT into an existing table — NO schema/DDL change.
-- The table + the CHECK constraint already exist (created in 20260522000000). Fully reversible
-- via the exact-tuple DELETE in the ROLLBACK block below.
-- =====================================================

INSERT INTO public.search_synonyms (term, synonyms, synonym_type)
SELECT 'decay', ARRAY['decomposition']::text[], 'oneway'
WHERE NOT EXISTS (
  SELECT 1 FROM public.search_synonyms s
  WHERE s.term = 'decay'
    AND s.synonym_type = 'oneway'
    AND s.synonyms = ARRAY['decomposition']::text[]
);

-- =====================================================
-- ROLLBACK (keep as comments) — exact-tuple DELETE, same VALUES as the INSERT
-- =====================================================
-- DELETE FROM public.search_synonyms
-- WHERE term = 'decay'
--   AND synonym_type = 'oneway'
--   AND synonyms = ARRAY['decomposition']::text[];
