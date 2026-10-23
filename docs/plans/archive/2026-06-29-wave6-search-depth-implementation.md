# Wave 6 — Search Depth (C41 + C42 spike) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Use `database-migrations` before touching `supabase/migrations/`. Use `superpowers:test-driven-development` + `superpowers:verification-before-completion` per task.

**Goal:** Change the public search's term combination from a flat OR to a strict AND-of-ORs (`(food|foods) & (waste) & (decay|decomposition)`), built with PostgreSQL tsquery algebra, proven on the existing search-eval harness — then produce a C42 semantic-tier go/no-go spike (no build).

**Architecture:** One SQL change in the search layer: redefine `expand_search_with_synonyms` to emit a grouped AND-of-ORs `tsquery` (via `plainto_tsquery` + `||` + `&&` + `numnode`), and redefine `search_lessons` to consume the `tsquery` directly with an empty-tsquery guard. The RPC's external signature is unchanged (no frontend change, no PGRST202 window). Canonical WHY: `docs/plans/2026-06-29-wave6-search-depth-design.md` — read it before any task.

**Tech Stack:** PostgreSQL FTS (`tsquery`/`tsvector`, `pg_trgm`), Supabase migrations, React 19 + TS frontend (untouched), the `scripts/search-eval/` TS harness (vitest-adjacent, run via `npm run eval:search`).

**Design reference:** `docs/plans/2026-06-29-wave6-search-depth-design.md`. **Read it before starting any task** — especially §3 (the build), §4 (SQL specifics + the GATE-A F1/F2/F3 fixes), §5 (eval), §7 (shipping).

**Sub-skills to invoke (per phase):**
- `database-migrations` — before touching any file in `supabase/migrations/` (PR B).
- `superpowers:test-driven-development` — PR A's probes are written before the change they measure; PR B's eval scorecard is the failing→green gate.
- `superpowers:verification-before-completion` — run each task's Verify step and see green before claiming done.
- `superpowers:requesting-code-review` — between PRs.

**Per-PR ritual (mandatory, every PR):** canonical spec in the kickoff's PER-PR RITUAL + the cited feedback memories. One-line shape: pre-push reviewer-agent dispatch **+ GATE 3 Codex** → baseline checks → push + `gh pr create` → wait for external bots → four-surface triage → rebuttal-pass every finding (**GATE 4 Codex** on real changes) → consolidated fix-ups → per-round TEST-DB re-verify (PR B) → round-cap after 2. **GATE 2 Codex** on the PR B migration SQL before TEST apply. Don't restate per-task; cite it.

**How to use this plan:** Each task has file paths, anchor symbols, code-shape snippets (adapt to current code — line numbers/bodies may have drifted; re-anchor by symbol), verify commands, commit templates. Execute in order. Small repo-conformance adaptations OK; product/design changes → stop and ask.

## PR breakdown

| PR | Title | Contains | Notes |
|---|---|---|---|
| A | Search-eval probes for multi-term precision | Add C41 gold probes + maxTotalCount guards to `queries.json` (+ provenance); capture before-baseline scorecard | Additive, no behavior change. Establishes the measurable "before". The new probes read "red" by design (eval is not a CI gate). |
| B | C41 — AND-of-ORs term combination | New migration: `expand_search_with_synonyms` → tsquery algebra; `search_lessons` consumes tsquery + empty-guard; re-GRANT + NOTIFY + types-regen; before/after eval scorecard diff | The one behavior change. Full migration discipline + GATE 2. Gated on no-regression. |
| C | C42 semantic-tier scope-spike | The go/no-go doc only | No code. |
| (D) | *(contingent)* two-pass relax | Only if PR B's scorecard shows an unacceptable recall cliff | Not pre-built; evidence-triggered. |

---

## PR A — Search-eval probes for multi-term precision

**Branch:** `test/wave6-search-eval-multiterm-probes`

**What ships:** New gold queries in `scripts/search-eval/queries.json` that exercise the multi-term flood (the C41 target), with `maxTotalCount` guards and predicate scoring, plus their provenance entry. A captured `scorecards/test.md` "before" baseline showing the flood (these probes read red until PR B — that is the intended documentation, and `npm run eval:search` is not run by any CI workflow, so nothing breaks).

**Why this is its own PR:** Establishes the measurable "before" independent of the behavior change, so PR B's scorecard is a clean before/after diff. Additive and trivially revertable.

**Pre-flight: read these first to internalize current shape:**
- `scripts/search-eval/queries.json` (the gold-set schema: scoring families `frozen-recall` / `frozen-precision` / `predicate` / `g3-isolation` / `sentinel` / `control-maxcount`; how `maxTotalCount` and predicates are expressed — find the existing `food waste` entry `q30`).
- `scripts/search-eval/gold-provenance.md` (the provenance-recording convention).
- `scripts/search-eval/metrics.ts` (how precision@10 / maxTotalCount / dup-flood are computed — so the new probes are well-formed).
- `scripts/search-eval/run-search-eval.ts` (how a run is invoked + where scorecards are written).

### Task A.1: Propose the probe predicates, confirm with the product owner

**Files:** none yet (this is the confirmation gate before editing the frozen gold set).

**Step 1:** From the design §5, draft the concrete probe set with explicit predicates (which lessons/attributes count as "correct"):
- 3-term AND precision: `food waste decay`, `food scraps decomposition`, `worm compost food waste` (+ `maxTotalCount` guards — pick the target ceiling from the current flood numbers, e.g. well under `food waste`'s 568).
- synonym+AND typo: `decay food waste`, `decompasition food waste` (must still surface the decay/decomposition lessons proven by `20260618120000_…`).
- stop-word/connector: one "meaningful terms with stop-word middle" + one no-crash case (`lesson about the garden`).
- keep single-term controls unchanged (`compost`, `garden`, `apple`, `tomato` already present — do not edit).

**Step 2: STOP and present to the user (supervisor surfaces this).** The gold set is "frozen, product-owner-confirmed"; new entries + their predicates need the user's sign-off before they're added. Present the proposed queries + predicate definitions; get confirmation or adjustments.

**Step 3: Verify** — user confirmed the probe set + predicates.

### Task A.2: Add the confirmed probes + provenance; capture the before-baseline

**Files:**
- Edit: `scripts/search-eval/queries.json` — add the confirmed entries (follow the existing schema exactly).
- Edit: `scripts/search-eval/gold-provenance.md` — record each new query's provenance + rationale (C41 multi-term flood coverage).

**Step 1:** Add the entries. Match the existing object shape (id, query, family, predicate/expected, `maxTotalCount` where applicable) verbatim — copy the `q30 food waste` entry as the structural template.

**Step 2: Run the harness against TEST, capture baseline**

Run: `npm run eval:search` (default target=test, anon-only — confirm `readonly-guard` passes).
Expected: a scorecard at `scripts/search-eval/scorecards/test.md` showing the new probes (the 3-term ones read red — high `total`, low precision — by design; that's the "before").

**Step 3: Verify**

Run: `npm run eval:search` again (determinism) + confirm the scorecard committed reflects the new probes.
Expected: new probe rows present; single-term control rows unchanged vs the prior scorecard (no accidental movement).

**Step 4: Commit**

```bash
git add scripts/search-eval/queries.json scripts/search-eval/gold-provenance.md scripts/search-eval/scorecards/test.md
git commit -m "test(search-eval): add C41 multi-term precision probes + before-baseline

Adds 3-term AND / synonym+typo / stop-word probes that exercise the
multi-term flood C41 fixes (design §5). Probes read red against current
flat-OR behavior by design — captures the measurable 'before'.
Ref: docs/plans/2026-06-29-wave6-search-depth-design.md §5"
```

Then run the per-PR ritual (GATE 3, push, `gh pr create`, four-surface triage, round-cap). No DB change → no TEST-DB migration verify.

---

## PR B — C41: AND-of-ORs term combination

**Branch:** `feat/wave6-c41-and-of-ors`

**What ships:** One migration that redefines `expand_search_with_synonyms` to emit an AND-of-ORs `tsquery` (default: return-type `text`→`tsquery`) and redefines `search_lessons` to consume it directly with the empty-tsquery guard, plus re-GRANTs, `NOTIFY pgrst`, and a `database.types.ts` regen. The eval scorecard flips the PR A probes from red to green with zero regression on the frozen families.

**Why this is its own PR:** It is the behavior change on the live public search path — isolated, fully migration-disciplined, independently revertable.

**Pre-flight: read these first:**
- `supabase/migrations/20260620000000_search_lessons_w1b.sql:59-120` (the **current** `expand_search_with_synonyms` body — the exact sanitize/split/synonym-lookup logic to preserve; re-anchor by symbol, the file may have drifted).
- `supabase/migrations/20260622010000_wave4_pr2_delete_ghosts_search_rpc.sql` (the **current** `search_lessons` — the expander call ~:199, the FTS+trigram WHEREs ~:215-219/:302-306, the rank `GREATEST(ts_rank(search_vector, to_tsquery('english', expanded_query)), …)` ~:289-297, the GRANT ~:350, the `NOTIFY pgrst` ~:355).
- `supabase/migrations/20260522000000_seed_search_synonyms_from_smart_search.sql:13-23,93-98` (the `search_synonyms` shape + no-whitespace constraint — confirms single-token synonyms).
- `src/types/database.types.ts:~1606-1609` (the generated `expand_search_with_synonyms` return type that will need regen).
- The `database-migrations` skill decision tree (invoke it before creating the file).

### Task B.1: Pre-flight — resolve the return-type path (caller grep)

**Step 1:** `grep -rn 'expand_search_with_synonyms' supabase/ src/ scripts/` — enumerate every reference, then **classify** (GATE-B area-2: the grep is deliberately broad and will return noise). A reference is a **LIVE runtime caller** only if it is a function/RPC body that calls the expander at query time — in practice just `search_lessons` (`…wave4_pr2…:199`). The rest are **historical/non-runtime**: prior migration definitions, the rollback/`archive/` copies, the generated `src/types/database.types.ts:~1606`, docs, and any artifact JSON — these do NOT block a return-type change and must not be misread as extra callers.

**Step 2: Decide (design §4 LOCKED rule):**
- If the **only live caller** is `search_lessons` → take the **default path**: function returns `tsquery`, `search_lessons` redefined to consume it.
- If a **hidden live caller** exists that would break on a return-type change → take the **fallback path**: keep `text` return (build tsquery via algebra, `RETURN query::text`), leave `search_lessons` untouched.

**Step 3: Verify** — record the classified grep result + the chosen path in the status doc's decisions section. (Expected from current survey: only `search_lessons` is a live caller → default path. Confirm, don't assume.)

### Task B.2: Author the migration (TDD via the eval scorecard)

**Sub-skill:** `database-migrations` (invoke first — "has it been pushed?" decision tree).

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_c41_and_of_ors_term_combination.sql` — date prefix verified via **`ls supabase/migrations/*.sql | sort | tail -3`** (GATE-B area-4: filter to `*.sql`, or `CLAUDE.md`/`README.md`/`archive/` sort after the numeric files and mislead `tail`). The new file must sort after the **latest migration overall** (currently `20260626000000_*`, not `20260622010000_*` — the latter is only the latest that *touches `search_lessons`*). **Same-day ASCII trap** (MEMORY.md + `supabase/migrations/CLAUDE.md:91`): a 14-digit `20260629HHMMSS_` prefix sorts AFTER a bare-date `20260629_` (digits < `_`) — check for any same-day bare-date migration before picking the time component.

**Step 1: Build the new `expand_search_with_synonyms`** — reference shape (ADAPT to the real current body's sanitize + synonym-lookup logic; this is illustrative, not literal):

```sql
-- default path: return tsquery
DROP FUNCTION IF EXISTS expand_search_with_synonyms(text);
CREATE FUNCTION expand_search_with_synonyms(search_query text)
RETURNS tsquery
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  cleaned   text;
  words     text[];
  word      text;
  group_q   tsquery;
  syn_val   text;
  result_q  tsquery := NULL;
BEGIN
  cleaned := <REUSE THE CURRENT OPERATOR/QUOTE STRIP from w1b:75-85>;
  IF cleaned IS NULL OR btrim(cleaned) = '' THEN RETURN NULL; END IF;
  words := regexp_split_to_array(lower(btrim(cleaned)), '\s+');

  FOREACH word IN ARRAY words LOOP
    -- group = the word OR each of its synonyms, built injection-safe (GATE-A F1)
    group_q := plainto_tsquery('english', word);          -- NOT to_tsquery
    FOR syn_val IN
      SELECT unnest(synonyms) FROM search_synonyms
      WHERE <REUSE THE CURRENT LOOKUP — term = word, honoring oneway/bidirectional>
    LOOP
      group_q := group_q || plainto_tsquery('english', syn_val);
    END LOOP;

    -- drop stop-word-only groups (GATE-A F2); AND the survivors
    IF group_q IS NOT NULL AND numnode(group_q) > 0 THEN
      result_q := CASE WHEN result_q IS NULL THEN group_q ELSE result_q && group_q END;
    END IF;
  END LOOP;

  RETURN result_q;  -- NULL when nothing meaningful survived
END;
$$;
```

Notes: `plainto_tsquery` returns `''::tsquery` (not NULL) for a stop word, so `'' || syn = syn` and `numnode('') = 0` — the empty-group skip works. `||` = tsquery OR, `&&` = tsquery AND.

**Step 2: Redefine `search_lessons` (default path)** — change the three `to_tsquery('english', expanded_query)` sites to the passed `expanded_tsquery`, and guard the FTS predicate for the empty/NULL case (GATE-A F2):

```sql
-- expander call:
expanded_tsquery := expand_search_with_synonyms(search_query);
-- FTS predicate (both count + results WHERE):
(expanded_tsquery IS NOT NULL AND numnode(expanded_tsquery) > 0
   AND l.search_vector @@ expanded_tsquery)
OR l.title % search_query OR l.summary % search_query   -- trigram cushion unchanged
-- rank: COALESCE(ts_rank(l.search_vector, expanded_tsquery), 0)  -- PRESERVE the existing COALESCE (GATE-B); don't drop it
```

Keep the raw `search_query IS NULL OR search_query = ''` browse short-circuit as-is.

**Step 3: Finish the migration** — re-`GRANT EXECUTE` on `expand_search_with_synonyms` + `search_lessons` to the same roles as the prior definitions; `NOTIFY pgrst, 'reload schema';` at the end.

**Step 4: Apply locally + RLS**

Run: `supabase db reset && npm run test:rls`
Expected: reset clean; `test:rls` passes unchanged (no RLS change).

**Step 5: Author the rollback migration** (or a documented forward-restore) — DROP+CREATE restoring the prior `text`-returning expander + prior `search_lessons`, re-GRANT, `NOTIFY pgrst`. Keep it ready before merge (design §7).

**Step 6: Local eval (before/after on local DB if seeded; the authoritative run is TEST)**

Run: `npm run eval:search` (target as appropriate).
Expected: the PR A multi-term probes flip red→green (total collapses under `maxTotalCount`, precision rises); **frozen-recall / frozen-precision / dup-flood / sentinel / G3** families show **zero regression**; single-term controls unchanged.

**Step 7: Commit**

```bash
git add supabase/migrations/<file>.sql <rollback file> src/types/database.types.ts scripts/search-eval/scorecards/test.md
git commit -m "feat(search): C41 — AND-of-ORs term combination via tsquery algebra

expand_search_with_synonyms now groups synonyms per term (plainto_tsquery
|| within a group) and ANDs across distinct terms (&&), dropping
stop-word-only groups (numnode). search_lessons consumes the tsquery
directly with an empty-tsquery guard. Cuts the multi-term flood
(food waste: 568→<target>) with zero regression on frozen eval families.
Ref: docs/plans/2026-06-29-wave6-search-depth-design.md §3-4"
```

### Task B.3: GATE 2 (Codex) on the migration SQL, then TEST + PROD verify

**Step 1: GATE 2** — dispatch the `codex:codex-rescue` agent (pin `--model gpt-5.5`, READ-ONLY, return INLINE) on the migration SQL: idempotency, DROP/CREATE ordering, the `plainto_tsquery`/`numnode`/`&&` logic, the empty-tsquery guard, GRANT completeness, `NOTIFY pgrst`, rollback completeness, and any interaction with the trigram fallback / rank `COALESCE`. Rebuttal-pass + fix-ups before push.

**Step 2: regen types** — `mcp__supabase__generate_typescript_types` (or `supabase gen types`) → update `src/types/database.types.ts`; `npm run check` clean.

**Step 3:** run the per-PR ritual (GATE 3, push, PR). After CI applies the migration to TEST:
- `npm run eval:search` against TEST → commit the after-scorecard; confirm green probes + zero regression.
- `mcp__supabase-test__execute_sql` (runnable as written — GATE-B area-3):
  - `SELECT expand_search_with_synonyms('food waste decay');` → grouped AND-of-ORs tsquery.
  - `SELECT total_count FROM public.search_lessons('food waste decay') LIMIT 1;` → collapsed count (one positional arg; the rest default).
  - `SELECT expand_search_with_synonyms('the of and');` → NULL/empty (no error).
  - `SELECT count(*) FROM public.search_lessons('the of and');` → no crash (exercises the rewritten RPC's empty-tsquery guard + COALESCE'd rank path, not just the expander).
- Re-verify TEST DB after EACH DB-affecting fix-up round (`feedback_per_round_test_db_verification`).

**Step 4:** after the user authorizes merge + PROD applies → `mcp__supabase-remote__execute_sql` (read-only) re-verify the same probes on PROD (design §7 / `reference_ci_flakes`: MCP is the source of truth, CI verify flakes).

### Task B.4 (optional): lightweight SQL-level assertion

If cheap, add a small assertion (a test script under `scripts/search-eval/` or a `*.test.ts`) pinning `expand_search_with_synonyms` output for: a multi-term input (grouped form), a single-term input (unchanged), and a stop-word-only input (NULL/empty). Not new pgTAP infra. Skip if it fights the harness's read-only/anon model — the eval scorecard is the primary gate.

---

## PR C — C42 semantic-tier scope-spike

**Branch:** `docs/wave6-c42-semantic-spike`

**What ships:** `docs/plans/2026-06-29-c42-semantic-tier-spike.md` — a go/no-go decision doc, **no code**.

### Task C.1: Write the spike

**Step 1:** Cover (design §6): current state (no embedding integration on the public path; `find_similar_lessons_by_embedding` is dedup-only; ivfflat not HNSW); the real prerequisites with **live-DB verification** of the C07 provenance question (use `mcp__supabase-remote__execute_sql` READ-ONLY to sample `lessons` vs `lesson_submissions` embedding provenance/norms — confirm or refute the mixed-space risk before costing it); C01 regen scope; what a hybrid tier needs (query-time embed, fusion ranker, index upgrade, C43 seed data); an effort estimate; a recommended prerequisite sequence (C07 → C01 → query-time-embed + fusion + index); and a clear **go/no-go recommendation** for a future wave.

**Step 2: Verify** — doc is self-contained, cites the live-DB findings, ends with a recommendation. `npm run check` unaffected (docs only).

**Step 3: Commit**

```bash
git add docs/plans/2026-06-29-c42-semantic-tier-spike.md
git commit -m "docs(search): C42 semantic-tier scope spike — go/no-go

Costs the heavy semantic/hybrid tier (C07/C01 prereqs verified against
live DB, query-time embed + fusion + index) with a recommended sequence
and go/no-go. No build. Ref: 2026-06-29-wave6-search-depth-design.md §6"
```

---

## Test plan

### Search-eval (primary gate)
- `npm run eval:search` before (PR A) / after (PR B); commit scorecards. Require: PR A probes flip red→green; frozen-recall/precision/dup-flood/sentinel/G3 zero regression; single-term controls unchanged.

### Unit / SQL-level
- `src/utils/parseSearchQuery.test.ts` green unchanged (C41 doesn't touch it).
- Optional Task B.4 SQL-level assertion of expander output.

### Integration
- `src/hooks/useLessonSearch.wiring.test.tsx` + `src/__tests__/integration/lesson-search.*.test.tsx` green unchanged (RPC signature + frontend call unchanged).

### E2E
- `e2e/search.spec.ts` green unchanged.

### RLS
- No RLS changes. `npm run test:rls` passes unchanged.

### Manual smoke (per `superpowers:verification-before-completion`, PR B deploy preview = TEST DB)
- `food waste decay` → tight, on-topic, far fewer results than before.
- `compost` (single term) → unchanged.
- `lesson about the garden` → no crash, sensible results.
- An everyday multi-term query the user cares about → behaves.
- TEST-DB MCP: `expand_search_with_synonyms('food waste decay')` grouped; `SELECT total_count FROM public.search_lessons('food waste decay') LIMIT 1` collapsed; `expand_search_with_synonyms('the of and')` NULL/empty (no error); `SELECT count(*) FROM public.search_lessons('the of and')` no crash.
