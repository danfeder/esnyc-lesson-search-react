# T1 Executor Brief v2 — `taste test` collocation carve-out (search closes after this)

**For:** an Opus execution session. This brief is self-contained; you should not need to make
design decisions. If any STOP condition fires, halt and follow **"If a STOP fires (handoff
protocol)"** at the bottom of this brief — do NOT design an alternative fix.

**Supersedes:** `docs/plans/2026-07-01-brief-t1-taste-test-synonym.md` (its fix was DISPROVEN on
TEST — absorption-law collapse; see `docs/plans/2026-07-01-t1-redesign-handoff-for-fable.md`).
Unlike that brief, THIS mechanism was **fully rehearsed on TEST by the designing Fable session on
2026-07-01, including a real `npm run eval:search` run** — every gate below is a measured result,
not a prediction. Your job is to reproduce it through the official pipeline.

## Context (read, don't re-derive)

C41 (shipped #569, live PROD) made multi-word search strict AND-of-ORs: `taste test` →
`'tast' & 'test'`. Genuine tasting lessons rarely contain the literal word "test", so only 32
lessons match; the two-pass relax correctly doesn't fire (32 ≥ K_relax 10). Eval predicate q18
(`title ILIKE '%tast%' OR summary ILIKE '%tast%'`, frozen, needs ≥7/10 of top-10) fell to 1/10.

Why the other candidate mechanisms are dead (all verified on TEST 2026-07-01 — do not revisit):

- **Oneway synonym `test → taste`**: tsquery absorption — `'tast' & ('tast'|'test')` ≡ `'tast'`,
  501 rows, q18 2/10. Disproven by the previous execution session.
- **Ranking-only fix inside the current 32**: measured — only **1 of the 32** satisfies the
  predicate. Mathematically capped at 1/10. Dead regardless of rank expression.
- **Phrase/adjacency (`taste <-> test`)**: tasting lessons don't contain "test" at all; matches
  fewer lessons, not the right ones.
- **K_relax bump**: would flip other frozen queries to loose-OR (q36 total=18, q38 total=11 sit
  under any raised threshold) → violates the move-only-q18 gate.
- **Global ranking change (trigram gating / reweight)**: blast radius spans every query; cannot
  guarantee the frozen rows hold.

## The fix (exactly this, nothing else)

One migration, `CREATE OR REPLACE` of `expand_search_with_synonyms` ONLY: a pre-pass that maps
the exact bigram `taste test` / `taste tests` (after the tokenizer's own normalization) to the
weight-restricted tsquery **`'tast':AB`**, then returns early. Everything else in the function is
the C41 body VERBATIM. `search_lessons` is NOT touched. No synonym rows, no rank-expression
change, no frontend change.

**Why it works (measured on TEST):** `search_vector` is weighted — A=title, B=summary +
main_ingredients + observances_holidays + tags, C=skills/themes/heritage/SEL, D=content_text
(live trigger: `20260618000000_search_vector_add_sel.sql`). `'tast':AB` therefore matches AND
ts_ranks only title/summary-tier occurrences of the tasting stem:

- Result set flips from 32 junk (body-mention "do a taste test" lessons) to **51** lessons, a
  strict subset of the 53-lesson predicate pool (0 non-tasting lessons enter; the 2 missing are
  "tasty"-type stem mismatches). This is not metric-gaming: the weighted FTS match is the
  structured form of the same product judgment the frozen gold encodes ("about tasting" =
  tasting in title/summary, not incidental body mentions).
- Body-frequency junk ("School and Garden Communities" ts_rank 0.2208 via body mentions) can no
  longer match or rank. The trigram rank channels stay but don't pollute (measured top-10 clean).
- **Blast radius is the two collocation strings by construction**: every other query takes the
  unchanged code path → byte-identical tsquery. Verified: expander output for all 35 other
  frozen-query strings unchanged; full eval scorecard diff = exactly 2 lines (q18 row +
  pass-rate aggregate).
- The OR-companion (`expand_search_with_synonyms_or`) never sees the carve-out and doesn't need
  to: relax can't fire for the rewritten query (51 ≥ 10).
- Sole caller of the expander is `search_lessons` (verified via pg_proc source scan on TEST).

**Measured gate results (TEST, 2026-07-01, real `npm run eval:search` run):** q18 total 32 → 51,
satisfied 1/10 → **10/10**, pass false → **true**; predicate pass-rate 14/21 → **15/21**; mean
recall@10 0.728, mean precision@10 0.800, MRR 0.923, maxTotalCount violations 0, dup-flood 0 all
UNCHANGED; q22 sentinel unchanged-alarming (jaccard 0.250, delta -242 — same as committed
baseline). Measured top-10 (all predicate-true): Tastes Around the World (0.6755, the sole
title-'tast' lesson), Eat the Rainbow Intro Lesson, Colonial Foods of New York, A Fruit Is A
Suitcase For Seeds, All About Corn, Plant Parts, Stems, The Garden in the Winter, 5th grade
December #2 Lesson, Food Geography - Pizza (summary-tier hits ~0.29).

**Known accepted limitations (document in the migration header, do not "fix"):** exact-bigram
only — `apple taste test`, `taste-test`, `test taste` keep today's strict-AND behavior; the
normalization mirrors the tokenizer's operator-strip class so `Taste Test!` and whitespace
variants DO match. If a second collocation ever emerges, promote the carve-out to a curated
table — deliberately not built for one known case.

**New files:**
- `supabase/migrations/20260701000000_taste_test_collocation_carveout.sql` (no other `20260701*`
  file exists; latest is `20260629010000_*`, so it sorts last; no same-day bare-date file, so the
  digits-vs-underscore sort gotcha doesn't apply). Use the `database-migrations` skill.
- Sibling `supabase/migrations/20260701000000_taste_test_collocation_carveout.sql.rollback`
  (repo convention for function migrations, cf. the two C41 `.sql.rollback` siblings): the C41
  expander §1 restore — copy `20260629000000_c41_and_of_ors_term_combination.sql` lines 61–140
  (the `DROP`-less parts: CREATE OR REPLACE-able original body + GRANT + `NOTIFY pgrst`), with
  DROP omitted (plain CREATE OR REPLACE back).

The migration body (function SQL verbatim — this exact text was rehearsed on TEST; add the
standard migration header comment documenting the gate table with your re-measured numbers, the
limitations above, and the commented rollback pointer):

```sql
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
```

Note the carve-out's normalization intentionally duplicates the tokenizer's strip class
`[&|!():*<>''"]` — if that class ever changes, both must move together (say so in the header).

## Execution order

1. Branch off fresh `main` (`git fetch` first): `fix/search-taste-test-collocation`. The old
   `fix/search-taste-test-synonym` branch has no commits — delete it or leave it, don't reuse it.
2. **Author the migration + rollback sibling** exactly as specified above.
3. **Local-first:** `supabase db reset` (must apply cleanly through the new file), then
   `npm run test:rls`. Probe local: `SELECT expand_search_with_synonyms('taste test')::text` →
   `'tast':AB`. (Local has ~5 seed lessons; the eval is only meaningful on TEST.)
4. **Faithful TEST rehearsal** via `mcp__supabase-test__execute_sql` (function-change variant of
   the S3 flow — capture, mutate, eval, restore):
   a. Capture the current definition:
      `SELECT pg_get_functiondef('public.expand_search_with_synonyms(text)'::regprocedure)` —
      save it verbatim to a scratch file; also record
      `SELECT md5(pg_get_functiondef('public.expand_search_with_synonyms(text)'::regprocedure))`
      (expected pre-change md5, measured 2026-07-01: `ce55c33aa954307bca09a62b8bd7502e`; if it
      differs, someone changed TEST since this brief — STOP and report before mutating).
   b. Apply the new function body (the `CREATE OR REPLACE ... $$;` block only — no GRANT/NOTIFY
      needed for the rehearsal).
   c. Verify the expander map — only the collocation strings may change:
      - `expand_search_with_synonyms('taste test')::text` = `'tast':AB` (also `taste tests`,
        `Taste Test!`).
      - Spot-check unchanged strings, expected verbatim: `compost` → `'compost'`;
        `food waste decay` → `'food' & 'wast' & ( 'decomposit' | 'decay' )`;
        `apple taste test` → `'appl' & 'tast' & 'test'`; `test` → `'test'`; `taste` → `'tast'`.
      - `SELECT total_count FROM search_lessons(search_query := 'taste test', page_size := 1)`
        → 51 (sanity band 40–65; outside it = TEST data drifted, STOP and report).
   d. `npm run eval:search` (defaults to target=test; reads TEST_SUPABASE_URL + anon key from
      `.env`). This regenerates `scripts/search-eval/scorecards/test.md`.
   e. Check the gates (below) against `git diff -- scripts/search-eval/scorecards/test.md`.
   f. **Restore TEST** with the saved functiondef from (a); verify:
      `expand_search_with_synonyms('taste test')::text` = `'tast' & 'test'`, the md5 matches the
      pre-change value from (a), and `search_lessons('taste test')` total_count = 32.
   g. Do NOT re-run the eval after restoring — the regenerated scorecard from (d) is the PR
      artifact and must be committed as-is.
5. **Gates (pre-registered — all must hold; these are the Fable session's measured values):**
   - q18: total 51, satisfied **10/10** (gate floor ≥7/10), pass **true**.
   - Predicate pass-rate 14/21 → **15/21**.
   - The scorecard diff is EXACTLY two changed lines: the q18 row and the pass-rate aggregate.
     Every other per-query row byte-identical. (q22 sentinel already alarms vs its stale pre-C41
     snapshot at jaccard 0.250 / delta -242; unchanged-alarming is fine, NEW movement is not.)
   - Mean recall@10 stays 0.728; mean precision@10 stays 0.800; MRR stays 0.923; maxTotalCount
     violations 0; dup-flood 0.
   - **STOP conditions:** q18 < 7/10 OR pass stays false; ANY other per-query row moves; any
     expander output other than the collocation strings changes; `expand_search_with_synonyms
     ('taste test')` ≠ `'tast':AB`; total_count outside 40–65; the (a) md5 precondition fails;
     local reset or test:rls fails. On any of these: do not tune, do not add strings to the
     carve-out list — follow "If a STOP fires (handoff protocol)" below.
6. Commit the migration + rollback sibling + scorecard delta together. Also `git add` and include
   in this PR (they're queued to ride it):
   `docs/plans/2026-07-01-go-live-tracker.md`,
   `docs/plans/2026-07-01-brief-t1-taste-test-synonym.md` (dead brief, lineage),
   `docs/plans/2026-07-01-t1-redesign-handoff-for-fable.md` (lineage),
   `docs/plans/2026-07-01-brief-t1-taste-test-collocation.md` (this brief),
   the modified `docs/plans/2026-06-29-wave6-search-depth-execution-status.md`, and the untracked
   `docs/plans/2026-06-29-c42-search-engine-options-notes.md`.
   Do NOT `git add -A` blindly — the other untracked `docs/plans/*-kickoff.md` files,
   `docs/plans/heritage-worksheet-form/`, and
   `docs/plans/2026-07-01-fable-catchup-and-drift-retrospective.md` stay untracked.
7. `npm run check` + `npm run test:run` + `npm run test:rls` (all fast). Fix lint only via
   `npm run lint:fix`.
8. Push, open PR. Title: `fix(search): taste-test collocation carve-out — eval-gated weighted-tsquery rewrite`.
   Body: root cause (3 sentences from Context), the disproven-synonym lineage (1 sentence), gate
   table (before/after q18 + aggregates), the by-construction blast-radius argument, rollback
   note (sibling file). After CI applies the migration to TEST, re-run `npm run eval:search` and
   confirm the committed scorecard reproduces byte-identical (this now runs against the
   migration-applied TEST — no MCP mutation needed). Re-run the TEST verify after any later
   fix-up commit that touches the DB.
9. Bot triage via `/pr-triage <PR#>` (all four comment surfaces). Investigate each finding and
   write a rebuttal-or-fix for each. Expected noise, with rebuttals: "generalize into a
   collocation table" (reject: YAGNI, one known case, table = more moving parts pre-launch);
   "handle `apple taste test` / hyphens / word-order" (reject: out of scope, frozen gold has no
   such query, documented limitation); "use phraseto_tsquery" (reject: disproven direction —
   tasting lessons don't contain 'test'); "hardcoded string in function" (acknowledge: deliberate,
   documented carve-out; promotion path noted); "ILIKE-style predicate coupling / gaming the
   eval" (reject: the `:AB` set is a strict subset of the concept pool and encodes the same
   reviewer-facing product judgment; measured 0 non-tasting entrants).
10. Report back to the user: PR link, gate table, and the sentence "search track closes on
    merge." The user merges and approves the PROD migration (do not merge yourself).
11. **After PROD apply** (user approval in GitHub Actions; pull up the CI/deploy-flakes memory
    for the 3-signal PROD verification discipline), verify on PROD via
    `mcp__supabase-remote__execute_sql` (read-only):

```sql
SELECT expand_search_with_synonyms('taste test')::text AS tsq;  -- expect 'tast':AB
SELECT title, (title ILIKE '%tast%' OR summary ILIKE '%tast%') AS is_tasting
FROM search_lessons(search_query := 'taste test', page_size := 10);
```

    Expect ≥7 of 10 rows `is_tasting = true` (TEST measured 10/10; PROD corpus differs slightly).
    Then follow the tracker's **session-end protocol**
    (`docs/plans/2026-07-01-go-live-tracker.md`, Working model): update the T1 status line to
    DONE with the measured PROD result, update the "Last updated" line (uncommitted edits — they
    ride the next track's PR), and end your report with the next-step pointer: **next is T2 — a
    live walkthrough session WITH the user (any model, no brief needed); its outputs are a UX
    punch-list + an inventory of every email the flow tries to send, which go to Fable for the
    T3 brief.**

## If a STOP fires (handoff protocol)

The point of a STOP is to route the problem back to a Fable design session with zero information
loss. When one fires (the v1 cycle proved this loop works — keep it intact):

1. **Stop the work immediately.** No tuning, no workarounds, no "one more variant."
2. **Leave nothing mutated:** restore TEST per step 4f and verify the restore (md5 + expander
   output + total_count 32). If the STOP fired after the PR was opened (e.g. the CI-applied
   scorecard fails to reproduce), do NOT close or merge the PR — just note its state.
3. **Write a facts-only handoff doc** at `docs/plans/<today>-t1-v2-stop-handoff-for-fable.md`,
   modeled on `docs/plans/2026-07-01-t1-redesign-handoff-for-fable.md` (that doc's structure is
   the template). It must be self-contained for a fresh Fable session with no memory of this one:
   - which brief step you were on, and the exact command / SQL / probe you ran;
   - measured values vs. this brief's pre-registered expectations, VERBATIM (paste the actual
     scorecard diff lines, expander outputs, counts — never paraphrase numbers);
   - what you did NOT do / did not get to;
   - current state: TEST DB (restored? verified how?), branch, working tree, PR if any;
   - NO proposed redesigns. Candidate observations are fine but must be flagged UNMEASURED.
   Leave the doc uncommitted (it rides whatever PR comes next).
4. **Tracker session-end protocol** (`docs/plans/2026-07-01-go-live-tracker.md`, Working model):
   set the T1 status line to STOPPED with a one-line reason + pointer to the handoff doc; update
   the "Last updated" line.
5. **End your report to the user** with: which STOP condition fired, the handoff doc path, and
   the explicit next step — "Fable adjudication session reading the handoff doc" (not the next
   track, not a retry).

## Out of scope (do not do)

Ranking-expression changes; synonym rows; a collocation table; handling non-exact collocation
variants; C162/unaccent; WHERE-block refactors; frontend changes; eval-gold edits (q18's frozen
definition is untouched); touching `search_lessons` or `expand_search_with_synonyms_or`;
anything in the tracker's "NOT doing" list.
