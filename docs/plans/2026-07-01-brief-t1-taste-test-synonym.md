# T1 Executor Brief — `taste test` synonym fix (search closes after this)

**For:** an Opus execution session. This brief is self-contained; you should not need to make
design decisions. If any STOP condition fires, halt, write down what you observed, and end the
session with a report — do NOT design an alternative fix.

## Context (read, don't re-derive)

C41 (shipped #569, live on PROD) made multi-word search strict AND-of-ORs. Diagnosed side
effect (Fable, 2026-07-01, live PROD probes): the query `taste test` expands to
`'tast' & 'test'`, and most genuine tasting lessons never contain the literal word "test" — so
they are excluded from the result set entirely. Only 32 lessons match both stems; the top-10 is
dominated by lessons that casually mention "do a taste test" (Black Bean Dip, Hummus) or use
"test" academically (Argumentative Writing). Eval predicate q18 fell 7/10 → 1/10. The two-pass
relax correctly does not fire (32 ≥ K_relax 10) — this is its designed blind spot.

Diagnostic evidence (PROD, 2026-07-01): top-ranked matches for `taste test` were
School and Garden Communities (fts_rank .2208, no tasting content in title/summary),
Salsa Toast (.1890), Three Sisters in the Kitchen (.1884), Black Bean Dip (.1010) — ranking is
pure `ts_rank`; trigram branches are negligible. It is a result-SET problem, not a ranking
problem. Do not touch the ranking expression.

## The fix (exactly this, nothing else)

One data-only migration adding ONE oneway synonym row: `test → taste`. Mechanism (verified in
the S3 precedent): `expand_search_with_synonyms` OR-appends a oneway row's synonyms into that
query word's group, so `taste test` becomes `'tast' & ( 'test' | 'tast' )` — every lesson
containing the taste stem satisfies both groups, readmitting the genuine tasting lessons, while
literal "taste test" mentions still rank-boost. No DDL, no function change, no frontend change.

**Template to copy structurally:** `supabase/migrations/20260618120000_seed_search_synonym_decay_decomposition.sql`
(same table, same idempotent WHERE-NOT-EXISTS-on-exact-tuple pattern, same commented ROLLBACK
block). Both sides single-token (satisfies the `search_synonyms_lexemes_no_whitespace` CHECK).

**New file:** `supabase/migrations/20260701000000_seed_search_synonym_test_taste.sql`
(no other `20260701*` file exists; sorts after `20260629010000`). Use the `database-migrations`
skill / `/new-migration` conventions.

```sql
INSERT INTO public.search_synonyms (term, synonyms, synonym_type)
SELECT 'test', ARRAY['taste']::text[], 'oneway'
WHERE NOT EXISTS (
  SELECT 1 FROM public.search_synonyms s
  WHERE s.term = 'test'
    AND s.synonym_type = 'oneway'
    AND s.synonyms = ARRAY['taste']::text[]
);
-- ROLLBACK (keep as comments) — exact-tuple DELETE:
-- DELETE FROM public.search_synonyms
-- WHERE term = 'test' AND synonym_type = 'oneway' AND synonyms = ARRAY['taste']::text[];
```

Write a header comment in the migration documenting the eval gate results (like the S3 file
does), filled in with YOUR measured numbers from step 2 below.

Known accepted side effect (documented, not a bug): any query containing the bare word "test"
(e.g. a hypothetical "soil test") will now also match taste-stem lessons inside that word's
OR-group. The frozen gold has no such query; acceptable for this corpus. Note it in the
migration header.

## Execution order

1. Branch off fresh `main` (`git fetch` first): `fix/search-taste-test-synonym`.
2. **Faithful TEST-load eval (S3 flow):** via `mcp__supabase-test__execute_sql`, INSERT the exact
   row into TEST → run `npm run eval:search` → DELETE the exact row from TEST (verify deletion
   with a SELECT). Inspect the regenerated `scripts/search-eval/scorecards/test.md` diff.
3. **Gates (pre-registered — all must hold):**
   - q18 `taste test`: satisfied ≥ 7/10, pass flips to true.
   - The scorecard diff shows movement ONLY in q18 (+ the aggregate lines it feeds:
     predicate pass-rate 14/21 → 15/21). Every other per-query row byte-identical — same
     standard the S3 migration met. (The q22 sentinel already alarms vs its stale pre-C41
     snapshot; unchanged-alarming is fine, NEW movement is not.)
   - maxTotalCount violations stay 0; dup-flood stays 0; frozen-recall mean stays 0.728;
     frozen-precision mean stays 0.800.
   - **STOP conditions:** q18 lands < 7/10, OR any other query row moves, OR the expander
     produces anything other than `'tast' & ( 'test' | 'tast' )` for `taste test`
     (check: `SELECT expand_search_with_synonyms('taste test')::text` on TEST while the row is
     loaded). Halt and report the scorecard; do not tune further.
4. If gates pass: author the migration file, commit the scorecard delta + migration together.
   Also `git add` and include in this PR: `docs/plans/2026-07-01-go-live-tracker.md`,
   `docs/plans/2026-07-01-brief-t1-taste-test-synonym.md`, the modified
   `docs/plans/2026-06-29-wave6-search-depth-execution-status.md`, and the untracked
   `docs/plans/2026-06-29-c42-search-engine-options-notes.md` (they're queued to ride this PR).
   Do NOT `git add -A` blindly — other untracked `*-kickoff.md` files in `docs/plans/` stay
   untracked.
5. `npm run check` + `npm run test:run` + `npm run test:rls` (all fast). Fix lint only via
   `npm run lint:fix`.
6. Push, open PR. Title: `fix(search): taste-test recall — eval-gated oneway synonym test→taste`.
   Body: root cause (3 sentences from Context above), gate table (before/after q18 + aggregates),
   rollback note. After CI applies the migration to TEST, re-run `npm run eval:search` and
   confirm the committed scorecard reproduces (byte-identical). Re-run the TEST verify after any
   later fix-up commit that touches the DB.
7. Bot triage via `/pr-triage <PR#>` (all four comment surfaces). Investigate each finding and
   write a rebuttal-or-fix for each — expected noise: suggestions to add more synonym rows
   (reject: ship only on measured lift), suggestions to change ranking (reject: out of scope).
8. Report back to the user: PR link, gate table, and the sentence "search track closes on merge."
   The user merges and approves the PROD migration (do not merge yourself).
9. **After PROD apply** (user approval in GitHub Actions), verify on PROD via
   `mcp__supabase-remote__execute_sql` (read-only), expecting ≥7 of 10 rows `is_tasting=true`:

```sql
SELECT title, (title ILIKE '%tast%' OR summary ILIKE '%tast%') AS is_tasting
FROM search_lessons(search_query := 'taste test', page_size := 10);
```

   Then follow the tracker's **session-end protocol** (`docs/plans/2026-07-01-go-live-tracker.md`,
   Working model section): update the T1 status line to DONE with the measured PROD result,
   update the "Last updated" line (leave both as uncommitted edits — they ride the next track's
   PR), and end your report to the user with the next-step pointer. For T1 that pointer is:
   **next is T2 — a live walkthrough session WITH the user (any model, no brief needed); its
   outputs are a UX punch-list + an inventory of every email the flow tries to send, which go to
   Fable to write the T3 brief.**

## Out of scope (do not do)

Ranking changes; more synonym rows; C162/unaccent; WHERE-block refactors; frontend changes;
eval-gold edits (q18's frozen definition is untouched — the fix must clear the bar as-is);
anything in the tracker's "NOT doing" list.
