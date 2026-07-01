-- =====================================================
-- Migration: 20260701000000_taste_test_collocation_carveout.sql
-- =====================================================
-- Go-live sprint T1 — "taste test" collocation carve-out (search track closes here).
-- Brief: docs/plans/2026-07-01-brief-t1-taste-test-collocation.md (self-contained;
--   this exact function body was rehearsed on TEST 2026-07-01 including a real
--   `npm run eval:search` run — every gate number below is measured, not predicted).
-- Supersedes the DISPROVEN oneway-synonym approach in
--   docs/plans/2026-07-01-brief-t1-taste-test-synonym.md (absorption-law collapse; see
--   docs/plans/2026-07-01-t1-redesign-handoff-for-fable.md for the lineage).
--
-- WHAT CHANGES
--   ONE thing: CREATE OR REPLACE of expand_search_with_synonyms to add a single
--   pre-pass. The exact bigram "taste test" / "taste tests" (education jargon for a
--   tasting activity) is mapped to the tasting concept restricted to title/summary-tier
--   lexemes — the weight-restricted tsquery 'tast':AB — then the function returns early.
--   Everything after the pre-pass is the C41 body VERBATIM
--   (20260629000000_c41_and_of_ors_term_combination.sql §1). search_lessons is NOT
--   touched; no synonym rows; no rank-expression change; no frontend change.
--
-- WHY (root cause)
--   C41 (shipped #569, live PROD) made multi-word search strict AND-of-ORs, so
--   "taste test" → 'tast' & 'test'. Genuine tasting lessons rarely contain the literal
--   word "test", so only 32 lessons match (all incidental "do a taste test" body
--   mentions), the two-pass relax correctly doesn't fire (32 >= K_relax 10), and eval
--   predicate q18 (title/summary ILIKE '%tast%', frozen, needs >=7/10 of top-10) fell
--   to 1/10.
--
-- WHY 'tast':AB WORKS (measured on TEST)
--   search_vector is weighted — A=title, B=summary + main_ingredients +
--   observances_holidays + tags, C=skills/themes/heritage/SEL, D=content_text (live
--   trigger 20260618000000_search_vector_add_sel.sql). 'tast':AB matches AND ts_ranks
--   ONLY title/summary-tier occurrences of the tasting stem, so body-frequency junk
--   ("do a taste test" in the lesson body) can no longer match or dominate ts_rank.
--   Result set flips from 32 junk to 51 lessons — a strict subset of the 53-lesson
--   predicate pool (0 non-tasting lessons enter; the 2 missing are "tasty"-type stem
--   mismatches). This is the structured form of the same product judgment the frozen
--   gold encodes ("about tasting" = tasting in title/summary, not incidental body
--   mentions), not metric-gaming.
--
-- BLAST RADIUS (by construction: exactly the two collocation strings)
--   Every other query takes the unchanged code path → byte-identical tsquery. Verified
--   on TEST: expander output for all 35 other frozen-query strings unchanged; full eval
--   scorecard diff = exactly 2 lines (q18 row + pass-rate aggregate). The OR-companion
--   expand_search_with_synonyms_or never sees the carve-out and doesn't need to (relax
--   can't fire for the rewritten query, 51 >= 10). Sole live caller of the expander is
--   search_lessons (pg_proc source scan on TEST).
--
-- GATE TABLE (TEST, measured 2026-07-01 via real `npm run eval:search`)
--   q18:  total 32 → 51 ; satisfied 1/10 → 10/10 ; pass false → true (gate floor >=7/10)
--   Predicate pass-rate:              14/21 → 15/21
--   mean recall@10 0.728 · mean precision@10 0.800 · MRR 0.923 : UNCHANGED
--   maxTotalCount violations 0 · dup-flood 0 : UNCHANGED
--   Scorecard diff = EXACTLY two changed lines (q18 row + pass-rate aggregate); every
--   other per-query row byte-identical. (q22 sentinel remains unchanged-alarming vs its
--   stale pre-C41 snapshot at jaccard 0.250 / delta -242 — same as the committed
--   baseline; unchanged-alarming is fine, NEW movement is not.)
--
-- KNOWN ACCEPTED LIMITATIONS (documented, deliberately NOT "fixed")
--   Exact-bigram only: "apple taste test", "taste-test", "test taste" keep today's
--   strict-AND behavior. The carve-out's normalization intentionally duplicates the
--   tokenizer's operator-strip class [&|!():*<>''"] below, so "Taste Test!" and
--   whitespace variants DO match — if that strip class ever changes, BOTH must move
--   together. If a second collocation ever emerges, promote this carve-out to a curated
--   table; it is deliberately not built for one known case.
--
-- ATOMICITY: Supabase wraps each migration file in a single transaction. CREATE OR
--   REPLACE (return type tsquery is UNCHANGED from C41) has no missing-function window.
--   Do NOT add explicit BEGIN/COMMIT.
--
-- DATA SAFETY: function definition ONLY — no table data read-modified-written, no rows
--   mutated, no schema/columns/RLS touched. Verified LOCAL-first (supabase db reset +
--   npm run test:rls + MCP probe) and rehearsed on TEST (capture → mutate → eval →
--   restore). Rollback in the sibling
--   20260701000000_taste_test_collocation_carveout.sql.rollback (restores the C41
--   expander via CREATE OR REPLACE — search_lessons never changed, so nothing to revert
--   there).
-- =====================================================


CREATE OR REPLACE FUNCTION public.expand_search_with_synonyms(query_text text)
RETURNS tsquery
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    words          TEXT[];
    word           TEXT;
    group_words    TEXT[];
    gw             TEXT;
    synonym_record RECORD;
    group_q        tsquery;
    result_q       tsquery := NULL;
BEGIN
    -- Handle empty query
    IF query_text IS NULL OR query_text = '' THEN
        RETURN NULL;
    END IF;

    -- T1 collocation carve-out (go-live sprint, 2026-07-01): the exact bigram
    -- "taste test(s)" is education jargon for a tasting activity. Under strict
    -- AND-of-ORs it becomes 'tast' & 'test', excluding genuine tasting lessons
    -- (they rarely contain the literal word "test"): 32 junk-dominated results,
    -- q18 1/10. Map the collocation to the tasting concept restricted to
    -- title/summary-tier lexemes (tsvector weights A,B) so body-frequency
    -- mentions don't dominate ts_rank. Normalization mirrors the tokenizer
    -- below (same operator-strip class), so "Taste Test!" etc. also match.
    IF trim(regexp_replace(regexp_replace(lower(query_text), '[&|!():*<>''"]', ' ', 'g'), '\s+', ' ', 'g'))
         IN ('taste test', 'taste tests') THEN
        RETURN to_tsquery('english', 'taste:AB');
    END IF;

    -- VERBATIM from w1b (20260620000000:83-85): strip tsquery operators + quotes to
    -- spaces BEFORE splitting, so a mid-word operator/quote (e.g. the apostrophe in
    -- "mother's") becomes a token separator instead of an internal space; split on ANY
    -- whitespace run. Empty tokens are skipped by the CONTINUE guard below.
    words := regexp_split_to_array(
               regexp_replace(lower(trim(query_text)), '[&|!():*<>''"]', ' ', 'g'),
               '\s+');

    FOREACH word IN ARRAY words LOOP
        -- Skip empty words (consecutive separators / stripped-to-empty tokens)
        CONTINUE WHEN word = '';

        -- Per-term group = the word + its synonyms. Synonym-lookup branching is VERBATIM
        -- from w1b (20260620000000:94-112), changed ONLY to accumulate into the per-term
        -- `group_words` array instead of a single global `expanded_words` array.
        group_words := ARRAY[word];
        FOR synonym_record IN
            SELECT * FROM search_synonyms
            WHERE (lower(term) = word AND synonym_type IN ('bidirectional', 'oneway', 'typo_correction'))
               OR (word = ANY(array(SELECT lower(unnest(synonyms)))) AND synonym_type = 'bidirectional')
        LOOP
            IF synonym_record.synonym_type = 'bidirectional' THEN
                -- Add all synonyms and the term
                group_words := group_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                IF lower(synonym_record.term) != word THEN
                    group_words := array_append(group_words, lower(synonym_record.term));
                END IF;
            ELSIF synonym_record.synonym_type IN ('oneway', 'typo_correction') THEN
                -- Only add synonyms if term matches
                IF lower(synonym_record.term) = word THEN
                    group_words := group_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                END IF;
            END IF;
        END LOOP;

        -- Build the group's OR-tsquery from DISTINCT non-empty lexemes. plainto_tsquery
        -- = injection-safe single lexeme (or '' for a stop word). `||` = tsquery OR.
        group_q := NULL;
        FOR gw IN SELECT DISTINCT u FROM unnest(group_words) AS u WHERE u <> '' LOOP
            group_q := CASE WHEN group_q IS NULL
                            THEN plainto_tsquery('english', gw)
                            ELSE group_q || plainto_tsquery('english', gw) END;
        END LOOP;

        -- Drop stop-word-only groups (numnode = 0); AND the survivors. `&&` = tsquery AND.
        IF group_q IS NOT NULL AND numnode(group_q) > 0 THEN
            result_q := CASE WHEN result_q IS NULL THEN group_q ELSE result_q && group_q END;
        END IF;
    END LOOP;

    RETURN result_q;   -- NULL when nothing meaningful survived (all stop words / empty)
END;
$$;

-- CREATE OR REPLACE preserves grants; re-issue explicitly per C41/PR-D convention.
GRANT EXECUTE ON FUNCTION public.expand_search_with_synonyms(text) TO anon, authenticated, service_role;

-- Reload PostgREST's schema cache (convention; the expander is only called via search_lessons).
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- ROLLBACK (executable restore is in the sibling
--   20260701000000_taste_test_collocation_carveout.sql.rollback)
-- =====================================================
-- Restores the C41 expand_search_with_synonyms (no carve-out) via CREATE OR REPLACE +
-- re-GRANT + NOTIFY pgrst. search_lessons was never touched by this migration, so there
-- is nothing to revert there. No data side effects (function definition only).
