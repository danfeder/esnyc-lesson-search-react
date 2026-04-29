# Filter Metadata Drift Repair — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Repair the column-vs-metadata drift that makes most filter clicks return wrong counts (sometimes zero, often undercounting by 10–90%). Ship across three sequential PRs (column-based RPC → writer fix + column hygiene + trigger → canonical vocabulary). PR 4 (cultural heritage canonicalization) is deferred, gated on stakeholder input.

**Architecture:** The normalized text-array/text columns become the **filter source of truth**. `search_lessons` is rewritten to filter on the columns and reconstruct each result row's `metadata` from the columns (per-field COALESCE overlay) so frontend facet counts can't drift from RPC filter behavior. `complete_review_atomic` is rewritten to write canonical-shape metadata + columns. A `lessons_normalize_write` trigger arrives last, after the table is fully canonical, to enforce column⇄metadata sync (column wins) on every future write.

**Tech Stack:** PostgreSQL (Supabase), Edge Functions on Deno (only `complete_review_atomic` is touched directly via SQL), React 19 + TypeScript + Vite for the small `useLessonSearch.ts` and `filterDefinitions.ts` updates, Vitest for unit tests, Playwright for E2E smoke.

**Design reference:** `docs/plans/2026-04-28-filter-metadata-drift-repair-design.md`. Read it before starting any task. The SQL snippets below come from §4–§6 of the design doc; verify the design doc is the source of truth if anything looks ambiguous.

**Sub-skills to invoke (per task):**
- `database-migrations` — before touching any file in `supabase/migrations/` (every PR creates at least one migration)
- `superpowers:test-driven-development` — for the `normalizeMetadata` change in PR 1 (Task 1.3) and any `filterDefinitions.ts` test additions in PR 3
- `superpowers:verification-before-completion` — before claiming any task done, run the verification commands in that task's "Verify" step

**Per-PR ritual (mandatory, every PR):**
1. Pre-push review: **dispatch** a `feature-dev:code-reviewer` agent on `git diff main...HEAD` — the agent does the line-by-line read, not you. Investigate findings per `feedback_bot_review_investigation.md`; apply fix-up commits or amend BEFORE push.
2. `npm run type-check && npm run lint` (mandatory pre-PR per CLAUDE.md), then push and open the PR with `gh pr create`.
3. **Wait for external bot reviews** (CodeRabbit, Claude Review, etc.) — they ARE the second-pass review. Do NOT dispatch another `feature-dev:code-reviewer` agent here; that's redundant.
4. **Collect findings from ALL FOUR PR surfaces** (per `feedback_pr_comment_surfaces.md`): (a) `gh pr view <PR> --comments`, (b) `gh api .../pulls/<PR>/reviews`, (c) `gh api .../pulls/<PR>/comments`, (d) `gh pr checks <PR>` + `gh run view --log-failed`. "0 findings" is a claim requiring evidence from all four.
5. **Investigate and triage every finding** (rebuttal pass per `feedback_bot_review_investigation.md`; default-reject hardening per `feedback_pr_bot_review_workflow.md`). Surface accept/reject recommendations with rationale BEFORE applying.
6. Apply accepted findings as consolidated fix-up commits (don't amend pushed commits).
7. **Re-verify TEST DB after each round** that produces DB-affecting fix-ups (per `feedback_per_round_test_db_verification.md`). One-time verification at PR open is NOT sufficient.
8. **Round-cap after 2 rounds** of bot review.

**Beads is broken** (per `project_beads_broken.md`): use `TaskCreate`, NOT `bd`.

**Migration filename rule.** Each migration must sort AFTER the latest existing migration. **Run `ls supabase/migrations/ | sort | tail -3` immediately before creating a new migration.** As of 2026-04-28 the latest is `20260504000000_phase_8b_fk_on_delete_set_null.sql`, so `20260505000000_*` is the next safe slot — but other work may land in between, so verify each session. ASCII gotcha: digits sort BEFORE underscore, so `20260505000000_x` sorts BEFORE `20260505_x` — pad with the full `HHMMSS` zeros, never `YYYYMMDD_x`.

**How to use this plan:**
- Each task has: ID, file paths, anchor symbols, code snippets (or design-doc section references for long SQL), test commands, commit message template.
- Execute in order unless explicitly noted as parallelizable.
- Verify every snippet against the current code before applying — line numbers, imports, types, prop names, and APIs may have drifted since the plan was written. Small repo-conformance adaptations are allowed; product or design changes require stopping to ask.
- Several tasks have **investigation steps** flagged — treat as questions for the user, not guesses. The design doc deferred them deliberately.

## PR breakdown

| PR | Title | Contains | Risk |
|---|---|---|---|
| 1 | **Column-based RPC + alias tolerance** | 1 migration: column-based `search_lessons`, partial metadata reconstruction with per-field COALESCE, alias helpers, `DROP/CREATE/GRANT/NOTIFY pgrst` mechanics, regenerated `database.types.ts`. Plus a 5-line `normalizeMetadata` fix in `useLessonSearch.ts` for object-shape `academicIntegration`. | Defensive only; widens matches, never narrows. RPC change only, no data side effects. |
| 2 | **Writer fix + column hygiene + trigger** | 4 migrations sequenced to prevent drift gaps (writer fix → backfill → column hygiene → install + enable trigger). Plus writer-roundtrip TEST DB verification matrix. | Data-touching but each migration is idempotent. Trigger is soft-coerce-with-NOTICE. Coordinated approval pause for PROD apply. |
| 3 | **Canonical vocabulary** | 3 migrations (data canonicalization; RPC alias-helper removal for lf/at/cm only — heritage alias stays for PR-4; trigger vocab-canonicalization stage) + `filterDefinitions.ts` rewrite + `facetCounts.ts` cleanup. | Coordinated frontend+backend change. Atomic at merge, sequenced at rollout via Netlify-first gate (Task 3.6 step 8). Each migration idempotent. |
| 4 | **Heritage redesign** | TBD — gated on stakeholder. Not in this plan. | Deferred. |

---

## PR 1 — Column-based RPC + alias tolerance

**Branch:** `feat/filter-drift-pr1-column-rpc`

**What ships:** one migration that DROPs the existing `search_lessons` and CREATEs a new one filtering on normalized columns, with per-field COALESCE metadata reconstruction in the SELECT, plus `_alias_lesson_format`, `_alias_activity_type`, `_alias_cultural_heritage`, and `_match_cooking_methods` helpers (transitional — removed in PR 3). Plus regenerated `database.types.ts`. Plus a 5-line `useLessonSearch.ts` `normalizeMetadata` fix for object-shape `academicIntegration` (the 5 NULL-column AI rows that PR 1's reconstruction can't catch read-time).

**Why this is its own PR:** defensive — widens matches, never narrows. No data side effects. Smallest possible blast radius for the layer with the most user-visible impact (most filter clicks go from "0 hits" to "real counts" in this single merge).

**Pre-flight: read these files first to internalize current shape:**
- `supabase/migrations/20251001_production_baseline_snapshot.sql:1198-1357` (current `search_lessons` body — verify line numbers haven't drifted; the design doc was written against this)
- `src/hooks/useLessonSearch.ts:1-50` (entire `normalizeMetadata` helper — line ~36 holds the AI handling we're patching)
- `src/utils/facetCounts.ts:55-65` (the existing `Array.isArray` pattern we'll mirror in `normalizeMetadata`)
- `src/utils/filterDefinitions.ts:22-211` (current vocabulary — for context only; PR 1 does NOT touch this)
- Design doc §3 (per-field COALESCE rationale) and §4 (PR-1 scope, in full)

### Task 1.1: Pre-flight — dependency inventory + line-number verification

**Sub-skill:** `database-migrations` (mandatory before touching anything in `supabase/migrations/`)

**Why first:** PR 1 changes the `search_lessons` parameter signature (`filter_cooking_method text → text[]`), which requires `DROP FUNCTION` + `CREATE FUNCTION` (Postgres won't `CREATE OR REPLACE` across signature changes). If unexpected dependent objects exist, the DROP fails. Surface them before drafting the migration.

**Step 1: Verify the deployed `search_lessons` source matches the baseline**

Run via `mcp__supabase-test__execute_sql`:
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'search_lessons' AND pronamespace = 'public'::regnamespace;
```

Compare the output against `supabase/migrations/20251001_production_baseline_snapshot.sql:1198-1357`. If they don't match, a migration between baseline and now mutated `search_lessons` — find it via `grep -ln "search_lessons" supabase/migrations/`, verify the latest version is what's deployed, and reference that version (not the baseline) when drafting.

**Step 2: Inventory function signature + dependents**

Run via `mcp__supabase-test__execute_sql`:
```sql
-- Identity (current parameter signature — needed verbatim for the DROP)
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'search_lessons' AND pronamespace = 'public'::regnamespace;

-- Dependents (anything that references search_lessons; must be empty or
-- understood before DROP runs)
SELECT
  c.relname AS dependent_object,
  c.relkind AS object_type,
  d.deptype
FROM pg_depend d
JOIN pg_class c ON c.oid = d.objid
JOIN pg_proc p ON p.oid = d.refobjid
WHERE p.proname = 'search_lessons'
  AND p.pronamespace = 'public'::regnamespace
  AND d.deptype <> 'i';   -- exclude internal pg deps
```

Expected: identity-arguments output captures the exact param list (e.g. `search_query text, filter_grade_levels text[], ..., filter_cooking_method text, ...`). Dependents query expected empty — if it returns rows, **stop and surface to the user** before continuing.

**Step 3: Note the verbatim signature in your scratch space**

You'll need it for the migration's `DROP FUNCTION search_lessons(<exact identity arguments>);` line.

**Step 4: No commit needed for this task** — it's information-gathering. Move to Task 1.2.

### Task 1.2: Create the column-based `search_lessons` migration

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<DATE_PREFIX>_filter_drift_pr1_column_based_search_lessons.sql`

Where `<DATE_PREFIX>` = the next safe slot per `ls supabase/migrations/ | sort | tail -3`. Use `YYYYMMDDHHMMSS` form (e.g. `20260505000000_*`).

**Step 1: Draft the migration**

Structure (top to bottom):
1. Comment header — purpose, design-doc reference, ROLLBACK section.
2. Helper function `_alias_lesson_format(text) RETURNS text[]` — input→input plus known synonyms.
3. Helper function `_alias_activity_type(text[]) RETURNS text[]` — `cooking-only`→`['cooking-only', 'cooking']`, etc.
4. Helper function `_alias_cultural_heritage(text[]) RETURNS text[]` — slug→slug + Title-Case-with-spaces.
5. Helper function `_match_cooking_methods(l_methods text[], filter_methods text[]) RETURNS boolean` — case-insensitive match without `lower(text[]::text)::text[]` round-trip.
6. `DROP FUNCTION public.search_lessons(<verbatim identity args from Task 1.1 step 2>);` (no CASCADE).
7. `CREATE FUNCTION public.search_lessons(...)` with the new signature (`filter_cooking_method text[]` instead of `text`) and column-based filter clauses.
8. Inside the new function: per-field COALESCE metadata reconstruction in the SELECT (per design doc §3 — use the verbatim block from there).
9. `GRANT EXECUTE ON FUNCTION public.search_lessons(...) TO anon, authenticated, service_role;` (with the new signature).
10. `NOTIFY pgrst, 'reload schema';`
11. ROLLBACK section as comments.

**For the body of the new function**, work from the design doc:
- Filter param mapping table — design doc §4 Changes step 1.
- Alias-tolerance details for each filter — design doc §4 Changes step 3.
- Metadata reconstruction block — design doc §3 (the exact `original_metadata || jsonb_strip_nulls(jsonb_build_object(...))` snippet).

**Critical mechanics:**
- `_alias_*` helpers: declare `IMMUTABLE PARALLEL SAFE` so they can inline.
- `_match_cooking_methods`: use `EXISTS (SELECT 1 FROM unnest(...) c WHERE lower(c) = ANY(...))` per design doc §4. **Never use `lower(text[]::text)::text[]`** — Postgres array-literal syntax breaks on commas/quotes.
- The reconstruction list is **explicit, not parameterized**. Add a top-of-function SQL comment block enumerating every column included so future migrations adding filter columns surface the requirement.
- `DROP FUNCTION` without `CASCADE` is intentional — if dependents exist, surface them as a migration error rather than silently breaking views/policies. Task 1.1's pg_depend probe should have already cleared this; if it returns rows here, stop and surface.

**ROLLBACK section** (as comments at file end):
```sql
-- =====================================================
-- ROLLBACK
-- =====================================================
-- DROP FUNCTION IF EXISTS public.search_lessons(<NEW signature>);
-- DROP FUNCTION IF EXISTS public._alias_lesson_format(text);
-- DROP FUNCTION IF EXISTS public._alias_activity_type(text[]);
-- DROP FUNCTION IF EXISTS public._alias_cultural_heritage(text[]);
-- DROP FUNCTION IF EXISTS public._match_cooking_methods(text[], text[]);
-- Then re-apply the prior search_lessons body from baseline / latest migration.
```

**Step 2: Apply locally**

Run: `supabase db reset`
Expected: completes without errors.

**Step 3: Smoke-test the new RPC locally**

Run via `mcp__supabase__execute_sql`:
```sql
-- Should return a row count (any positive number) — proves the
-- function loads and the SELECT compiles.
SELECT COUNT(*) FROM search_lessons(
  search_query => 'apple',
  filter_grade_levels => NULL,
  filter_themes => NULL,
  filter_seasons => NULL,
  filter_competencies => NULL,
  filter_cultures => NULL,
  filter_location => NULL,
  filter_activity_type => NULL,
  filter_lesson_format => NULL,
  filter_academic => NULL,
  filter_sel => NULL,
  filter_cooking_method => NULL  -- now text[], can pass ARRAY['stovetop']
  -- ... include any other params from the verbatim signature
);
```

Adjust the keyword-named call to match the actual parameter names in the new function. If positional, switch to positional (the verbatim signature from Task 1.1 step 2 will tell you which).

**Step 4: Run RLS tests** (regression check)

Run: `npm run test:rls`
Expected: all tests pass; no new failures (the 2 pre-existing `archive_duplicate_lesson` failures noted in Phase 8b status are still expected).

**Step 5: Commit**

```bash
git add supabase/migrations/<filename>
git commit -m "feat(db): filter-drift PR-1 — column-based search_lessons + alias tolerance

Rewrites search_lessons to filter on normalized columns instead of
JSONB metadata paths. Adds _alias_lesson_format / _alias_activity_type
/ _alias_cultural_heritage / _match_cooking_methods helpers as
transitional alias tolerance (removed in PR-3). Result rows now have
metadata reconstructed per-field from the columns via COALESCE overlay
so frontend facet counts can't drift from RPC behavior. Signature
change: filter_cooking_method text → text[]. See design doc §3-§4."
```

### Task 1.3: TDD — `normalizeMetadata` fix in `useLessonSearch.ts`

**Sub-skill:** `superpowers:test-driven-development`

**Why:** PR 1's metadata reconstruction handles 99% of rows but **5 production rows have NULL `academic_integration` column + object-shape `metadata.academicIntegration`** (`{selected: [...]}`). For those rows the CASE returns NULL → `jsonb_strip_nulls` drops the key → the original object-shape passes through. `useLessonSearch.ts:36`'s current `normalizeMetadata` produces `["[object Object]"]` for that input, breaking facet counts and pills. PR 2's column hygiene migration cleans up the 5 rows so this defensive code never fires after PR 2 ships, but it stays as belt-and-braces.

**Files:**
- Modify: `src/hooks/useLessonSearch.ts` (around the `normalizeMetadata` helper, ~line 36)
- Create or modify: `src/hooks/useLessonSearch.test.ts` (co-located per repo convention — see Phase 8b decision history)

**Step 1: Read the existing helper**

```bash
sed -n '1,80p' src/hooks/useLessonSearch.ts
```

Find the `normalizeMetadata` function and the existing `asArray` helper. Note: `facetCounts.ts:56-61` already has the object-with-`selected` pattern we need to mirror.

**Step 2: Write a failing test**

If `src/hooks/useLessonSearch.test.ts` doesn't exist yet, create it. If it does, append a `describe('normalizeMetadata academicIntegration')` block.

```typescript
// src/hooks/useLessonSearch.test.ts (or appended to existing)
import { describe, it, expect } from 'vitest';
import { normalizeMetadata } from '@/hooks/useLessonSearch';

describe('normalizeMetadata academicIntegration', () => {
  it('flat array passes through', () => {
    expect(normalizeMetadata({ academicIntegration: ['Math', 'Science'] }).academicIntegration)
      .toEqual(['Math', 'Science']);
  });
  it('legacy object {selected: [...]} unwraps to flat array', () => {
    expect(normalizeMetadata({ academicIntegration: { selected: ['Math'] } }).academicIntegration)
      .toEqual(['Math']);
  });
  it('object with empty selected → empty array', () => {
    expect(normalizeMetadata({ academicIntegration: { selected: [] } }).academicIntegration)
      .toEqual([]);
  });
  it('null/undefined → empty array', () => {
    expect(normalizeMetadata({ academicIntegration: null }).academicIntegration).toEqual([]);
    expect(normalizeMetadata({}).academicIntegration).toEqual([]);
  });
  it('non-array, non-object scalar → empty array (not stringified-object)', () => {
    expect(normalizeMetadata({ academicIntegration: 'Math' as unknown as string[] }).academicIntegration)
      .toEqual([]);
  });
});
```

**Note:** if `normalizeMetadata` is not currently exported, **export it** in step 3 — the test needs it. Adding an export does not change runtime behavior.

**Step 3: Run test, verify it fails**

Run: `npx vitest run src/hooks/useLessonSearch.test.ts`
Expected: at minimum the "legacy object" case fails (returns `['[object Object]']` or similar). The exact failure depends on current `asArray` semantics — confirm the failure mode is the object-shape case before continuing.

**Step 4: Apply the fix**

In `useLessonSearch.ts`, replace the `academicIntegration` handling in `normalizeMetadata`'s return object with:

```typescript
academicIntegration: (() => {
  const ai = m.academicIntegration;
  if (Array.isArray(ai)) return ai as string[];
  if (ai && typeof ai === 'object' && Array.isArray((ai as { selected?: unknown }).selected)) {
    return (ai as { selected: string[] }).selected;
  }
  return [];
})(),
```

(If `normalizeMetadata` was not previously exported, add `export` to its declaration in this step.)

**Step 5: Run tests, verify all pass**

Run: `npx vitest run src/hooks/useLessonSearch.test.ts`
Expected: 5/5 pass.

Then run the full suite to catch regressions:
Run: `npm run test`
Expected: all tests pass.

**Step 6: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: clean.

**Step 7: Commit**

```bash
git add src/hooks/useLessonSearch.ts src/hooks/useLessonSearch.test.ts
git commit -m "fix(search): normalizeMetadata handles legacy object-shape academicIntegration

5 production rows have NULL academic_integration column + object-shape
metadata.academicIntegration ({selected: [...]}). PR 1's metadata
reconstruction can't catch them at read-time (column is NULL → CASE
returns NULL → jsonb_strip_nulls drops the key → original object-shape
passes through). Mirror the unwrap pattern facetCounts.ts already uses.
PR 2's column hygiene migration eliminates the 5 rows; this stays as
belt-and-braces. See design doc §3."
```

### Task 1.4: Regenerate `database.types.ts`

**Why:** The `filter_cooking_method` parameter type changed from `text` to `text[]`. TypeScript will type-check the call against the new signature — without regenerating, the existing call in `useLessonSearch.ts` may continue to type-check against the old types (or the new types may need imports adjusted).

**Sequencing decision (avoiding the prior plan's TEST-DB-but-pre-CI ambiguity):** Task 1.4 runs BEFORE Task 1.6 (push + PR open), so CI hasn't applied the migration to TEST DB yet. **Default = generate from local Docker DB.** Task 1.6 step 6 includes a post-CI re-regenerate-from-TEST sanity check (no-diff is the expected outcome since TEST and local should match the same migration source).

**Step 1: Regenerate from local**

```bash
supabase start  # if not already running
supabase gen types typescript --local > src/types/database.types.ts.new
```

Diff against the current `src/types/database.types.ts`:
```bash
diff src/types/database.types.ts src/types/database.types.ts.new | head -100
```

Confirm the `search_lessons` `Args.filter_cooking_method` field shifts from `string | null` to `string[] | null`, plus the new alias-helper functions (`_alias_lesson_format`, `_alias_activity_type`, `_alias_cultural_heritage`, `_match_cooking_methods`) appear in the `Functions` schema. If unexpected diff appears (e.g., unrelated tables changing), **stop and surface** — local Docker DB may have stale state from prior unrelated migrations.

**Step 2: Replace if diff looks clean**

```bash
mv src/types/database.types.ts.new src/types/database.types.ts
npm run type-check
```

Expected: passes.

**Step 3: Commit (separate from Task 1.2 so the regeneration is auditable)**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): regenerate database.types.ts for column-based search_lessons

filter_cooking_method param type changed text → text[] in PR-1 migration.
Regenerated from local Docker DB; TEST DB sanity-check happens post-CI
in Task 1.6 step 6."
```

**Post-CI follow-up (handled in Task 1.6 step 6):** after the PR opens and CI applies the migration to TEST DB, re-run `npx supabase gen types typescript --project-id rxgajgmphciuaqzvwmox > /tmp/types_from_test.ts` and `diff /tmp/types_from_test.ts src/types/database.types.ts`. Expected: empty diff. If non-empty (i.e. local and TEST drifted because the migration changed in a fix-up round, or TEST has unrelated migrations local doesn't), commit a fresh `database.types.ts` from TEST as a follow-up.

### Task 1.5: TEST DB verification matrix on local

**Sub-skill:** `superpowers:verification-before-completion`

**Why:** the only authoritative way to validate filter semantics is against a real Postgres instance. Frontend tests can validate parameter passing but not RPC behavior. Run the 9-row matrix locally first; CI will re-run against TEST DB after PR open.

**Step 1: Apply migration locally**

Run: `supabase db reset`

**Step 2: Run the 9-row matrix**

Use `mcp__supabase__execute_sql` (LOCAL). For each query, capture the count and compare against the expected. The expected counts come from the design doc §1 production-evidence table (TEST DB has slightly different data; use the local-DB-actual values as the regression baseline once you confirm the function loads and returns sensible counts).

Queries (adjust positional/keyword args to match the verbatim PR-1 signature):

```sql
-- 1. Baseline: no filters
SELECT COUNT(*) FROM search_lessons(NULL, /* ... all NULL ... */);

-- 2. lessonFormat=single-period (alias accepts kebab → matches "Single period" rows)
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_lesson_format => 'single-period', /* ... */);

-- 3. lessonFormat=Single period (canonical Title Case → matches same rows)
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_lesson_format => 'Single period', /* ... */);

-- 4. activityType=cooking-only (alias matches both 'cooking-only' AND 'cooking')
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_activity_type => ARRAY['cooking-only'], /* ... */);

-- 5. activityType=cooking (canonical bare noun → matches same rows)
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_activity_type => ARRAY['cooking'], /* ... */);

-- 6. cookingMethods=stovetop (case-insensitive match)
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_cooking_method => ARRAY['stovetop'], /* ... */);

-- 7. cookingMethods=Stovetop (Title Case → same count)
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_cooking_method => ARRAY['Stovetop'], /* ... */);

-- 8. academicIntegration=Math (now reads column, not object-shape)
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_academic => ARRAY['Math'], /* ... */);

-- 9. culturalHeritage=asian (alias accepts slug → matches "Asian" rows)
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_cultures => ARRAY['asian'], /* ... */);
```

For each query, **document the actual count in your scratch space**. These become the baseline for PR open's TEST DB verification block.

**Step 3: Spot-check metadata reconstruction**

Run one search that returns rows and inspect the `metadata` field of the first result row:
```sql
SELECT lesson_id, title, metadata->'lessonFormat' AS lesson_format_meta
FROM search_lessons(NULL, /* ... */, filter_lesson_format => 'Single period', /* ... */)
LIMIT 3;
```
Expected: `lesson_format_meta` is a JSON STRING (`"Single period"`), not array (`["Single period"]`). If array-shape, reconstruction is broken.

**Step 4: No commit needed** — verification is in-session evidence. Capture the matrix in your scratch space for the PR description.

### Task 1.6: Push, open PR, per-PR ritual

**Step 1: Mandatory pre-PR check**

Run: `npm run type-check && npm run lint`
Expected: passes.

**Step 2: Pre-push reviewer agent**

Dispatch `feature-dev:code-reviewer` on `git diff main...HEAD`. Investigate findings per `feedback_bot_review_investigation.md` (rebuttal pass on every finding, including "minor"). Apply fix-up commits BEFORE push.

**Step 3: Push**

```bash
git push -u origin feat/filter-drift-pr1-column-rpc
```

**Step 4: Open PR**

```bash
gh pr create --title "feat: filter-drift PR-1 — column-based search_lessons + alias tolerance" --body "$(cat <<'EOF'
## Summary
- Rewrites `search_lessons` to filter on normalized columns instead of JSONB metadata paths
- Per-field COALESCE metadata reconstruction so frontend facet counts can't drift from RPC behavior
- Transitional alias helpers (`_alias_lesson_format`, `_alias_activity_type`, `_alias_cultural_heritage`, `_match_cooking_methods`) — removed in PR-3
- Signature change: `filter_cooking_method text → text[]` (DROP/CREATE/GRANT/NOTIFY)
- 5-line `useLessonSearch.ts:normalizeMetadata` fix for the 5 NULL-AI-column object-shape rows
- Regenerated `database.types.ts`

## Why this matters
This is PR 1 of 3 in the filter metadata drift repair (see design doc). It widens matches read-side without touching write paths or data shape. PR 2 will fix the writer (`complete_review_atomic`) and backfill historical drift; PR 3 canonicalizes vocabulary.

Most filters go from "0 hits" or "drastically undercounting" to correct counts in this single merge.

## Test plan
- [ ] Local `supabase db reset` succeeds
- [ ] 9-row search_lessons matrix run locally (counts captured below)
- [ ] Result-row metadata.lessonFormat is scalar (not array) — reconstruction working
- [ ] Unit: 5/5 normalizeMetadata tests pass
- [ ] `npm run test:rls` clean (2 pre-existing failures unchanged)
- [ ] `npm run type-check && npm run lint` clean
- [ ] After CI applies migration to TEST DB, re-run 9-row matrix via `mcp__supabase-test__execute_sql`

## Verification matrix (local — re-run on TEST DB after CI)
<paste counts from Task 1.5 step 2 here>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 5: Wait for external bot reviews**, four-surface triage per per-PR ritual. Investigate every finding. Round-cap after 2 rounds.

**Step 6: TEST DB verification + types sanity check (mandatory)**

After CI applies migration to TEST DB:

1. **9-row matrix** — run via `mcp__supabase-test__execute_sql`. Compare counts against the design doc's documented true counts (~483, ~299, ~177, ~189, ~67 — see §1 of design doc). They should be in the right order of magnitude; exact match isn't expected because TEST DB data may differ from PROD.
2. **Types post-CI sanity check** (closes Task 1.4 sequencing loop):
   ```bash
   npx supabase gen types typescript --project-id rxgajgmphciuaqzvwmox > /tmp/types_from_test.ts
   diff /tmp/types_from_test.ts src/types/database.types.ts
   ```
   Expected: empty diff. If non-empty, local-Docker types and TEST types drifted (most likely because a fix-up round altered the migration, or TEST has unrelated newer migrations local doesn't). Commit a fresh `database.types.ts` from TEST as a follow-up (`mv /tmp/types_from_test.ts src/types/database.types.ts && git add ... && git commit -m "chore(types): align database.types.ts with TEST DB"`).

**Step 7: Re-verify TEST DB after each round** that produces DB-affecting fix-ups (per `feedback_per_round_test_db_verification.md`). If the fix-up round modified the migration source, also re-run step 6.2 (types diff) — a migration change in fix-up rounds is the exact case the post-CI sanity check exists to catch.

**Step 8: Merge after approval; PROD migration runs after manual approval in `migrate-production.yml`.** Verify on PROD via `mcp__supabase-remote__execute_sql` (same 9-row matrix). Per `feedback_data_safety_top_priority.md`, MCP verification is mandatory after every PROD migrate. Watch for SASL Apply-step flake — see `MEMORY.md` "migrate-production.yml SASL flake" entry; rerun the failed Apply job and verify state via MCP.

---

## PR 2 — Writer fix + column hygiene + trigger

**Branch:** `feat/filter-drift-pr2-writer-fix-trigger`

**What ships:** four migrations sequenced to prevent drift gaps (writer fix → backfill → column hygiene → install + enable trigger), plus a writer-roundtrip TEST DB verification matrix. After this PR, every future write to `lessons` (RPC, MCP, manual SQL, scripts) goes through the trigger and produces canonical column⇄metadata pairs.

**Why this is its own PR:** data-touching, but each migration is idempotent and the ordering is the safety guarantee. Writer fix lands first so the gaps between subsequent migrations can't produce new drift.

**Pre-flight:**
- Re-read design doc §5 (in full — it's the contract for this PR).
- Read `supabase/migrations/20260428000007_phase_4_fix_metadata_shape.sql` and `20260428000008_phase_4_status_guard.sql` — these contain the current `complete_review_atomic` body that we're patching.
- Read `supabase/migrations/20251001_production_baseline_snapshot.sql:465` — `handle_lessons_metadata_write` (defined but unattached). We are NOT reusing this; we'll define a new `lessons_normalize_write` instead. Baseline function stays as historical artifact.
- **PROD probe (read-only)**: confirm the post-Phase-4 cohort and historical residue counts haven't shifted materially since 2026-04-28. Run via `mcp__supabase-remote__execute_sql`:
  ```sql
  SELECT
    COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'lessonFormat') = 'array') AS array_lf,
    COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'academicIntegration') = 'object') AS object_ai,
    COUNT(*) FILTER (WHERE metadata ?| ARRAY['themes', 'season', 'location']) AS short_keys,
    COUNT(*) AS total_lessons
  FROM lessons;
  ```
  Snapshot the numbers in the PR description.

### Task 2.1: Pre-flight — verify deployed `complete_review_atomic` source

**Sub-skill:** `database-migrations`

**Why:** the design doc §5 was written against `complete_review_atomic` as deployed 2026-04-28 (byte-identical to `20260428000008_phase_4_status_guard.sql`). If a later migration mutated it, the snippets in design doc §5 may no longer apply cleanly.

**Step 1: Get the deployed source**

Run via `mcp__supabase-remote__execute_sql`:
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'complete_review_atomic' AND pronamespace = 'public'::regnamespace;
```

**Step 2: Compare against `20260428000008_phase_4_status_guard.sql`**

Diff the function body. The two specific `v_legacy_meta` keys we care about:
- `lessonFormat` — should be `jsonb_build_array(v_meta->>'lessonFormat')` (the bug we're fixing)
- `academicIntegration` — should be `COALESCE(v_meta->'academicIntegration', '[]'::jsonb)` (the bug we're fixing)

If both bugs are present and the rest matches the baseline, the design doc snippets apply directly. **If the function has drifted further, stop and surface** — the `BEFORE` snippet in design doc §5 won't match cleanly, and the `AFTER` snippet may need revision.

**Step 3: No commit** — pre-flight only.

### Task 2.2: Migration 1 — writer fix in `complete_review_atomic`

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<DATE_PREFIX>_filter_drift_pr2_m1_writer_fix.sql`

**Step 1: Verify the next safe filename**

Run: `ls supabase/migrations/ | sort | tail -3`. Pick `<DATE_PREFIX>` (HHMMSS-padded) > the last entry.

**Step 2: Draft the migration**

The migration is a single `CREATE OR REPLACE FUNCTION public.complete_review_atomic(...)` with the same signature as the deployed version (verified Task 2.1) but with two body changes:

**Change A — `v_legacy_meta` builder.** Per design doc §5 Migration 1 "v_legacy_meta builder":
- `lessonFormat` BEFORE → AFTER (array → scalar)
- `academicIntegration` BEFORE → AFTER (pass-through → typeof-aware unwrap)

Use the verbatim "AFTER" snippet from design doc §5.

**Change B — column derivation for `academic_integration`.** Per design doc §5 Migration 1 "Column derivation":
- BEFORE: `_phase4_jsonb_text_array(v_meta->'academicIntegration')` (broken on object input)
- AFTER: `_phase4_jsonb_text_array(CASE jsonb_typeof(...) WHEN 'object' THEN COALESCE(...->'selected', '[]'::jsonb) ELSE ... END)`

Apply BOTH branches (INSERT for approve_new, UPDATE for approve_update) — the column derivation appears separately in each.

**Pre-flight inside the migration**: `CREATE OR REPLACE FUNCTION` preserves grants. Signature unchanged → no DROP needed.

**ROLLBACK section** (as comments at file end): re-apply the `complete_review_atomic` body from `20260428000008_phase_4_status_guard.sql` (or whatever Task 2.1 found as the current source).

**Step 3: Apply locally**

Run: `supabase db reset`
Expected: no errors.

**Step 4: Confirm function source updated**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'complete_review_atomic' AND pronamespace = 'public'::regnamespace;
```

Grep for `to_jsonb(v_meta->>'lessonFormat')` and `jsonb_typeof(v_meta->'academicIntegration')` in the output. Both should appear (proving the writer fix is live locally).

**Step 5: Commit**

```bash
git add supabase/migrations/<filename>
git commit -m "fix(db): filter-drift PR-2 M1 — writer fix in complete_review_atomic

Two bugs closed:
A) metadata.lessonFormat written as array → scalar
B) academic_integration column derivation handles object-shape
   v_meta->'academicIntegration' (was producing stringified-JSON
   single-element array)

After this lands, every approval through complete_review_atomic
produces canonical-shape metadata + columns. Drift growth stops here.
See design doc §5 Migration 1."
```

### Task 2.3: Writer-roundtrip test matrix

**Sub-skill:** `superpowers:verification-before-completion`

**Why:** prove BOTH writer bugs are closed before any backfill or trigger lands. Use service-role SQL to call `complete_review_atomic` synthetically with the four AI shapes + 1 lessonFormat shape documented in design doc §5 "Writer-roundtrip test matrix".

**Verification sequencing — read this before running anything.** The design doc says "run on TEST DB after Migration 1 applies, BEFORE Migration 2." But PR-2 opens with all 4 migrations together (Task 2.8), and CI applies them as a batch — there's no TEST DB state with only M1 applied. The substitute is: run the matrix on **local** (Docker DB) immediately after Task 2.2 lands, when only M1 has been applied. That gives you the writer-isolation evidence the design doc intended. Then, after PR open and CI applies all 4 migrations to TEST DB, re-run the matrix as **integrated-flow validation** (writer + trigger together — both produce canonical output, neither masks the other in the success path because the writer is correct). If you want true M1-only TEST DB evidence you'd have to open the PR with M1 alone and add M2/M3/M4 in follow-up commits — extra ceremony, not adopted unless the local rehearsal surfaces something concerning.

**Step 1: Local M1-only verification (the writer-isolation test — design doc §5 intent)**

After Task 2.2 lands, with `supabase db reset` applied (M1 is the latest migration on the branch), run the matrix locally. M2/M3/M4 don't exist yet on local, so this isolates the writer fix.

For each shape:

| Test | Input `v_meta.academicIntegration` | Expected `metadata.academicIntegration` | Expected `academic_integration` column |
|---|---|---|---|
| 1 | `["Math", "Science"]` | `["Math", "Science"]` | `ARRAY['Math', 'Science']` |
| 2 | `{"selected": ["Math"]}` | `["Math"]` | `ARRAY['Math']` |
| 3 | `null` or omitted | `[]` or absent | `ARRAY[]::text[]` |
| 4 | `{"selected": []}` | `[]` | `ARRAY[]::text[]` |

Plus: lessonFormat `'Single period'` input → metadata `"Single period"` (scalar, not array) and column `'Single period'`.

How to call `complete_review_atomic` via SQL:

**Critical: the writer reads from the `p_metadata` argument, not from `lesson_submissions.extracted_metadata`.** Inside the function (verify against `20260428000007_phase_4_fix_metadata_shape.sql`): `v_meta jsonb := COALESCE(p_metadata, '{}'::jsonb);` followed by the `v_legacy_meta` builder. If you pass `p_metadata := NULL` or omit it, the test silently drives an empty-meta path and the writer fix isn't exercised. Each matrix call must pass the test shape as `p_metadata` explicitly.

The current Phase-4 signature is `(p_submission_id uuid, p_reviewer_id uuid, p_decision text, p_metadata jsonb, p_notes text, p_selected_lesson_id text DEFAULT NULL)`. Re-verify against the deployed source via `pg_get_functiondef` from Task 2.1 in case it's drifted further.

```sql
-- Schema verification before writing the fixture: lesson_submissions has
-- (id uuid, teacher_id uuid, google_doc_url text, google_doc_id text,
-- extracted_content text, content_hash, content_embedding,
-- submission_type text, original_lesson_id text, status text,
-- reviewer_*, extracted_title text, ...) — confirmed against
-- 20251001_production_baseline_snapshot.sql lines 1725-1748. Note:
-- the column is teacher_id (NOT submitter_id), and there is NO
-- extracted_metadata column. The matrix payload lives only in p_metadata
-- on the function call.

-- Get reviewer_id (used as p_reviewer_id in the call below)
SELECT id FROM user_profiles WHERE email = 'reviewer@test.com';

-- Get a seeded teacher_id (must exist in auth.users — teacher_id has
-- an FK to auth.users.id). On local, the seed user
-- '11111111-1111-1111-1111-111111111111' is the established convention
-- (see Phase 8b Sessions 10-11 status); confirm it exists locally:
--   SELECT id FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111';
-- If absent on TEST DB, query for any seeded teacher email:
--   SELECT u.id FROM auth.users u JOIN user_profiles p ON p.id = u.id
--   WHERE p.role = 'teacher' LIMIT 1;

-- Build a synthetic submission. The matrix payload is NOT stored on this
-- row — it goes only into p_metadata when calling the function below.
INSERT INTO lesson_submissions (
  id, teacher_id, google_doc_url, google_doc_id,
  submission_type, original_lesson_id, status,
  extracted_title, extracted_content
) VALUES (
  '00000000-aaaa-bbbb-cccc-000000000001',
  '11111111-1111-1111-1111-111111111111',  -- seeded teacher (verify exists locally)
  'https://docs.google.com/document/d/test_writer_roundtrip_1',
  'test_writer_roundtrip_1',
  'new', NULL, 'submitted',
  'Test Writer Roundtrip 1',
  'Lesson body'
);

-- Call complete_review_atomic with the matrix shape passed EXPLICITLY as p_metadata.
-- Each row of the test matrix (1-5) requires one such call with a different p_metadata payload:
--   Row 1 — flat array AI:    '{"academicIntegration": ["Math", "Science"], "lessonFormat": "Single period"}'::jsonb
--   Row 2 — object-shape AI:  '{"academicIntegration": {"selected": ["Math"]}, "lessonFormat": "Single period"}'::jsonb
--   Row 3 — null AI:          '{"lessonFormat": "Single period"}'::jsonb (academicIntegration omitted)
--   Row 4 — empty-object AI:  '{"academicIntegration": {"selected": []}, "lessonFormat": "Single period"}'::jsonb
--   Row 5 — lessonFormat focus (any AI shape works; the assertion is on lessonFormat scalar shape)
SELECT complete_review_atomic(
  p_submission_id      := '00000000-aaaa-bbbb-cccc-000000000001',
  p_reviewer_id        := '<reviewer_id from above>'::uuid,
  p_decision           := 'approve_new',
  p_metadata           := '{"academicIntegration": ["Math", "Science"], "lessonFormat": "Single period"}'::jsonb,  -- ← drives v_meta / v_legacy_meta
  p_notes              := NULL,
  p_selected_lesson_id := NULL  -- approve_new doesn't use this
);

-- Inspect the published lesson
SELECT
  lesson_id,
  metadata->'academicIntegration' AS ai_meta,
  metadata->'lessonFormat' AS lf_meta,
  academic_integration AS ai_col,
  lesson_format AS lf_col
FROM lessons
WHERE original_submission_id = '00000000-aaaa-bbbb-cccc-000000000001';
```

Repeat with each of the 5 matrix shapes — increment the synthetic submission UUID (`...0001` → `...0002` → ...) and pass the corresponding `p_metadata` payload. Confirm each shape produces the expected metadata + column per the table above. Only `p_metadata` drives the writer logic under test; the synthetic `lesson_submissions` row is just the function input handle (the function loads the row by `p_submission_id` for FK validity / status guard, but doesn't read shape from it).

**Cleanup (local) — UUID-safe + FK-safe.** `original_submission_id` and `lesson_submissions.id` are `uuid` columns; `LIKE` against them errors without `::text` cast. `submission_reviews.submission_id` and `submission_similarities.submission_id` have FKs to `lesson_submissions.id` that will block the lesson_submissions DELETE. Use an explicit UUID list and FK-safe order:

```sql
-- Track each synthetic UUID you used in the matrix runs above.
-- Example with 5 IDs (one per matrix row); adapt to your actual count.
WITH synth AS (
  SELECT unnest(ARRAY[
    '00000000-aaaa-bbbb-cccc-000000000001',
    '00000000-aaaa-bbbb-cccc-000000000002',
    '00000000-aaaa-bbbb-cccc-000000000003',
    '00000000-aaaa-bbbb-cccc-000000000004',
    '00000000-aaaa-bbbb-cccc-000000000005'
  ]::uuid[]) AS id
)
DELETE FROM lessons WHERE original_submission_id IN (SELECT id FROM synth);

WITH synth AS (
  SELECT unnest(ARRAY[
    '00000000-aaaa-bbbb-cccc-000000000001',
    '00000000-aaaa-bbbb-cccc-000000000002',
    '00000000-aaaa-bbbb-cccc-000000000003',
    '00000000-aaaa-bbbb-cccc-000000000004',
    '00000000-aaaa-bbbb-cccc-000000000005'
  ]::uuid[]) AS id
)
DELETE FROM submission_reviews WHERE submission_id IN (SELECT id FROM synth);

-- submission_similarities is empty for these synthetic rows in practice
-- (we bypass dup detection) but defensive include is cheap:
WITH synth AS (
  SELECT unnest(ARRAY[
    '00000000-aaaa-bbbb-cccc-000000000001',
    '00000000-aaaa-bbbb-cccc-000000000002',
    '00000000-aaaa-bbbb-cccc-000000000003',
    '00000000-aaaa-bbbb-cccc-000000000004',
    '00000000-aaaa-bbbb-cccc-000000000005'
  ]::uuid[]) AS id
)
DELETE FROM submission_similarities WHERE submission_id IN (SELECT id FROM synth);

WITH synth AS (
  SELECT unnest(ARRAY[
    '00000000-aaaa-bbbb-cccc-000000000001',
    '00000000-aaaa-bbbb-cccc-000000000002',
    '00000000-aaaa-bbbb-cccc-000000000003',
    '00000000-aaaa-bbbb-cccc-000000000004',
    '00000000-aaaa-bbbb-cccc-000000000005'
  ]::uuid[]) AS id
)
DELETE FROM lesson_submissions WHERE id IN (SELECT id FROM synth);
```

(A simpler alternative is `psql \set` variables or a bash script, but inline CTEs are reliable across MCP/psql/Supabase Studio.)

**Step 2: TEST DB integrated-flow verification (post-CI apply of the full PR-2 batch)**

After PR open (Task 2.8) and CI applies M1+M2+M3+M4 together to TEST DB, re-run the matrix via `mcp__supabase-test__execute_sql`. This now tests writer + trigger as an integrated system: the writer (M1) produces canonical output, the trigger (M4) is a no-op on already-canonical input. If anything in the matrix produces non-canonical output, either the writer is broken OR the trigger is masking a writer bug — both are blocking findings.

Use the same synthetic SQL from Step 1, but against TEST DB's seeded reviewer (per `reference_test_credentials.md`) and a fresh UUID prefix to avoid collisions with anything left from the matrix's prior runs. Apply the same UUID-safe + FK-safe cleanup pattern from Step 1 afterwards.

**Step 3: Capture results**

Document the local matrix outcomes (Step 1) in your scratch space; document the TEST DB integrated-flow outcomes (Step 2) in the PR description (4 rows + 1 lessonFormat row, all expected/actual aligning).

**Step 4: No commit** — verification is in-session evidence.

### Task 2.4: Migration 2 — backfill historical drift rows

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<DATE_PREFIX>_filter_drift_pr2_m2_backfill.sql`

**Step 1: Verify next filename**

Run: `ls supabase/migrations/ | sort | tail -3`. Use a prefix > Migration 1's.

**Step 2: Draft the migration**

Three idempotent UPDATE statements per design doc §5 Migration 2:

1. **Long-form key promotion** — promotes `themes`/`season`/`location` to `thematicCategories`/`seasonTiming`/`locationRequirements` with scalar→array coercion. Verbatim from design doc §5 Migration 2.
2. **academicIntegration object-shape unwrap** — `{selected: [...]}` → flat array. Verbatim from design doc §5 Migration 2.
3. **lessonFormat array unwrap** — `["x"]` → `"x"` for the 1 array-shape outlier. Verbatim from design doc §5 Migration 2.

**ROLLBACK note:** these UPDATEs are one-way (the original short-key data is gone after promotion). If rollback is needed, the `lesson_versions` archive holds the pre-Phase-4 historical content but reconstructing the exact pre-backfill metadata shape would require consulting the lesson_versions table per row. ROLLBACK section as comments documents this caveat.

**Step 3: Apply locally** (after Migration 1 is also applied — they're sequential)

Run: `supabase db reset`. Expected: no errors.

**Step 4: Verification on local**

Run via `mcp__supabase__execute_sql`:
```sql
SELECT
  COUNT(*) FILTER (WHERE metadata ?| ARRAY['themes', 'season', 'location'])           AS short_keys_remaining,
  COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'academicIntegration') = 'object')    AS object_shape_remaining,
  COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'lessonFormat') = 'array')            AS array_lesson_format_remaining
FROM lessons;
```
Expected: 0, 0, 0.

(Local DB may not have all the drift shapes that PROD has — focus on "no NEW drift introduced." TEST DB verification post-CI is where we check the drift counts go to zero against real corpus.)

**Step 5: Commit**

```bash
git add supabase/migrations/<filename>
git commit -m "fix(db): filter-drift PR-2 M2 — backfill historical drift rows

Three idempotent UPDATEs:
- Promote short-form keys (themes/season/location) to long-form
  (thematicCategories/seasonTiming/locationRequirements) with
  scalar→array coercion. ~81 rows.
- Unwrap object-shape academicIntegration to flat array. ~14+ rows.
- Unwrap single-element array lessonFormat to scalar. 1 row.

Sequential after M1 (writer fix) so no new drift is being written
during backfill. See design doc §5 Migration 2."
```

### Task 2.5: Investigate the 17 `activity_type` location-leak rows

**Why:** design doc §5 Migration 3 flags this as an investigation step before drafting. **Some rows may need manual mapping; the worst-case fallback is dropping the leaked value entirely.** Don't guess.

**Step 1: Query the 17 rows on PROD**

Run via `mcp__supabase-remote__execute_sql`:
```sql
SELECT
  lesson_id,
  title,
  activity_type,
  location_requirements,
  metadata->>'activityType' AS activity_type_meta,
  metadata->'locationRequirements' AS location_meta
FROM lessons
WHERE activity_type IN (ARRAY['indoor'], ARRAY['outdoor'])
   OR ('indoor' = ANY(activity_type))
   OR ('outdoor' = ANY(activity_type))
ORDER BY lesson_id;
```

Expected: 17 rows (14 `['indoor']` + 3 `['outdoor']` per design doc §5).

**Step 2: Categorize each row**

For each row, look at:
- `metadata->>'activityType'` — does it suggest the correct value (`cooking`, `garden`, `academic`, `both`)?
- `location_requirements` — does it duplicate the value (in which case `activity_type` is purely leaked and should be cleared)?
- `title` and a quick scan of `summary` if helpful — does the lesson actually involve cooking/garden/academic activity?

**Step 3: Surface findings to the user as a question**

Don't draft Migration 3 yet. Present the user with:
- A table of the 17 rows + what you think the correct value (or NULL) should be.
- A recommendation for any rows where the correct value is ambiguous.
- Confirmation that the worst-case fallback (set `activity_type = ARRAY[]::text[]`) is acceptable for any ambiguous rows — `complete_review_atomic` will populate correctly on next approve_update.

**Wait for the user's decision** on each row category before proceeding to Task 2.6.

**Step 4: No commit** — investigation only.

### Task 2.6: Migration 3 — column-data hygiene

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<DATE_PREFIX>_filter_drift_pr2_m3_column_hygiene.sql`

**Step 1: Verify filename**

Run: `ls supabase/migrations/ | sort | tail -3`. Use a prefix > Migration 2's.

**Step 2: Draft the migration**

Two cleanups per design doc §5 Migration 3 — **both must update column AND metadata.** The trigger (M4) is BEFORE INSERT/UPDATE, NOT retroactive — it only canonicalizes future writes. Any column-vs-metadata mismatch left at the end of M3 will still be in the table when the trigger arrives, and PR-1's metadata reconstruction has a known asymmetry that lets old metadata leak through when the column is empty:

```sql
-- PR-1 reconstruction snippet (from §3 of design doc):
'activityType', CASE WHEN COALESCE(array_length(l.activity_type, 1), 0) > 0
                     THEN to_jsonb(l.activity_type) END
```

When the column is empty, the CASE returns NULL, `jsonb_strip_nulls` drops the key, and `original_metadata || ...` leaves `original_metadata->'activityType'` unchanged. So the location-leak `'indoor'`/`'outdoor'` value would still surface in result-row metadata even though the column is canonical. M3 must write both surfaces.

1. **`activity_type` location-leak fix (BOTH surfaces, array-shape canonical).** Apply per Task 2.5's investigation findings. **Canonical shape for `metadata.activityType`** is a JSON array (matches `to_jsonb(l.activity_type)` in PR-1 reconstruction §3 line 117 of design doc, and matches what the PR-2 trigger M4 syncs from column → metadata). Writing scalar would leave the row physically non-canonical at rest, even though PR-1's reconstruction would mask it on read; the trigger is BEFORE INSERT/UPDATE and is NOT retroactive. M3 must write array.

   ```sql
   -- Per Task 2.5's investigation — substitute the actual lesson_id list and
   -- canonical-value mapping. If worst-case fallback (clear entirely):
   UPDATE lessons
   SET
     activity_type = ARRAY[]::text[],
     metadata = metadata - 'activityType'
   WHERE lesson_id IN (
     -- 17 leaked rows from Task 2.5 PROD probe
     -- '<lesson_id_1>', '<lesson_id_2>', ...
   );

   -- Or, if any rows got a per-row canonical mapping (e.g., 'indoor' is actually
   -- a 'cooking' lesson based on title/summary review):
   UPDATE lessons
   SET
     activity_type = ARRAY['cooking']::text[],
     metadata = jsonb_set(
       COALESCE(metadata, '{}'::jsonb),
       '{activityType}',
       to_jsonb(ARRAY['cooking']::text[])  -- ARRAY shape, matching PR-1 reconstruction + PR-2 trigger contract
     )
   WHERE lesson_id IN ('<mapped_id_1>', '<mapped_id_2>', ...);
   ```
   Verification cross-check before drafting: spot-check one currently-canonical row in production (e.g. `SELECT activity_type, metadata->'activityType' FROM lessons WHERE COALESCE(array_length(activity_type, 1), 0) > 0 LIMIT 3;`) — `metadata->'activityType'` should already be a JSON array on the canonical rows. If you find scalar shape on canonical rows, the PR-1 reconstruction contract is wrong (would be a design-doc-level concern; surface it before drafting M3).

2. **`academic_integration` column-vs-meta mismatch fix (BOTH surfaces).** Two distinct row populations:

   **Population A — column NULL, metadata has canonical-shape data (~5 rows post-M2 backfill):** derive column from metadata.
   ```sql
   UPDATE lessons
   SET academic_integration = (
     SELECT array_agg(value)
     FROM jsonb_array_elements_text(metadata->'academicIntegration')
   )
   WHERE academic_integration IS NULL
     AND jsonb_typeof(metadata->'academicIntegration') = 'array'
     AND jsonb_array_length(metadata->'academicIntegration') > 0;
   ```

   **Population B — column has values not in metadata (~4 rows):** force metadata to match column (column-wins, consistent with the trigger's policy). Don't skip this — leaving it for the trigger means waiting for an unrelated future write to that row, which may never happen.
   ```sql
   UPDATE lessons
   SET metadata = jsonb_set(
     COALESCE(metadata, '{}'::jsonb),
     '{academicIntegration}',
     to_jsonb(academic_integration)
   )
   WHERE academic_integration IS NOT NULL
     AND COALESCE(array_length(academic_integration, 1), 0) > 0
     AND (
       metadata->'academicIntegration' IS NULL
       OR jsonb_typeof(metadata->'academicIntegration') <> 'array'
       OR (SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::text[])
           FROM jsonb_array_elements_text(metadata->'academicIntegration'))
          <> (SELECT COALESCE(array_agg(v ORDER BY v), ARRAY[]::text[])
              FROM unnest(academic_integration) v)
     );
   ```
   The ordered-array comparison handles the unordered-set semantics — two sets with same elements but different orderings are considered equal. If the comparison SQL feels brittle, an alternative is to enumerate the ~4 specific lesson_ids from the PR-2 pre-flight PROD probe and rewrite as `WHERE lesson_id IN (...)`.

**Step 3: Apply locally + verify (both surfaces)**

Run: `supabase db reset`. Run sanity queries that check BOTH column AND metadata:
```sql
SELECT
  -- activity_type leaks (both surfaces)
  COUNT(*) FILTER (WHERE 'indoor'  = ANY(activity_type) OR 'outdoor' = ANY(activity_type))                    AS leaked_col_remaining,
  COUNT(*) FILTER (WHERE metadata->>'activityType' IN ('indoor', 'outdoor'))                                  AS leaked_meta_remaining,
  -- academicIntegration null-col / meta-mismatch
  COUNT(*) FILTER (
    WHERE academic_integration IS NULL
      AND jsonb_typeof(metadata->'academicIntegration') = 'array'
      AND jsonb_array_length(metadata->'academicIntegration') > 0
  ) AS ai_null_col_with_meta_remaining,
  COUNT(*) FILTER (
    WHERE COALESCE(array_length(academic_integration, 1), 0) > 0
      AND (
        metadata->'academicIntegration' IS NULL
        OR jsonb_typeof(metadata->'academicIntegration') <> 'array'
        OR (SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::text[])
            FROM jsonb_array_elements_text(metadata->'academicIntegration'))
           <> (SELECT COALESCE(array_agg(v ORDER BY v), ARRAY[]::text[])
               FROM unnest(academic_integration) v)
      )
  ) AS ai_col_meta_mismatch_remaining
FROM lessons;
```
Expected: 0/0/0/0.

**Step 4: Commit**

```bash
git add supabase/migrations/<filename>
git commit -m "fix(db): filter-drift PR-2 M3 — column-data hygiene

Fixes two specific column-vs-metadata mismatches per design doc §5
Migration 3:
- 17 activity_type location-leak rows (per Task 2.5 investigation)
- ~5 NULL academic_integration column rows where metadata has
  canonical-shape data (post-M2 backfill)

Sequential after M2 so backfill has already canonicalized the meta
shapes that this migration reads from."
```

### Task 2.7: Migration 4 — install + enable normalization trigger

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<DATE_PREFIX>_filter_drift_pr2_m4_normalize_trigger.sql`

**Step 1: Verify filename**

Run: `ls supabase/migrations/ | sort | tail -3`. Use a prefix > Migration 3's.

**Step 2: Draft the migration**

Three pieces per design doc §5 Migration 4:

1. `CREATE OR REPLACE FUNCTION public.lessons_normalize_write() RETURNS trigger AS $$ ... $$ LANGUAGE plpgsql;`
2. `CREATE TRIGGER lessons_normalize_write_trg BEFORE INSERT OR UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.lessons_normalize_write();`
3. `COMMENT ON FUNCTION ... / COMMENT ON TRIGGER ...` documenting the contract.

**Function body** (paraphrased from design doc §5 Migration 4 — write the SQL inline, not pseudo-code):

For each filter-relevant field:
- **lesson_format (text):** if `NEW.lesson_format` is non-NULL/non-empty → ensure `NEW.metadata->'lessonFormat'` is the same scalar (coerce array `["x"]`→`"x"` if needed; replace whatever's there). If `NEW.lesson_format` is NULL/empty AND metadata has a usable scalar → derive column.
- **activity_type (text[]):** if `NEW.activity_type` non-empty → set `NEW.metadata->'activityType'` to `to_jsonb(NEW.activity_type)`. If column empty AND metadata has array/scalar → derive column.
- **cooking_methods (text[]):** same as activity_type.
- **academic_integration (text[]):** if `NEW.academic_integration` non-empty → set `NEW.metadata->'academicIntegration'` to flat-array `to_jsonb(NEW.academic_integration)`. If column empty AND metadata has array (or `{selected: [...]}` object) → flatten/derive.
- **thematic_categories, season_timing, location_requirements, core_competencies, cultural_heritage, social_emotional_learning** — same column⇄metadata sync pattern.

**`RAISE NOTICE` on every coercion.** Format:
```sql
RAISE NOTICE 'lessons_normalize_write coerced field=% before_shape=% after_shape=% lesson_id=%',
  'lessonFormat', jsonb_typeof(OLD_value), jsonb_typeof(NEW_value), NEW.lesson_id;
```

Logs go to Supabase log streams. (No audit table in this PR — design doc §10 captured an audit table as a possible PR-2-round-2 follow-up if log-only proves insufficient.)

**Step 3: Apply locally + smoke**

Run: `supabase db reset`. Then test the trigger:
```sql
-- Insert a deliberately drifted row (array-shape lessonFormat) directly via SQL
INSERT INTO lessons (
  lesson_id, title, summary, file_link, grade_levels, metadata
) VALUES (
  'test_trigger_smoke_1', 'Trigger smoke', 'test', 'https://example.com',
  ARRAY['3'], '{"lessonFormat": ["Single period"]}'::jsonb
);

-- Inspect the row
SELECT lesson_format, metadata->'lessonFormat' AS lf_meta
FROM lessons WHERE lesson_id = 'test_trigger_smoke_1';
-- Expected: lesson_format='Single period' (text), lf_meta='"Single period"' (jsonb scalar).

-- Cleanup
DELETE FROM lessons WHERE lesson_id = 'test_trigger_smoke_1';
```

(Check the Supabase logs panel locally — should show the `RAISE NOTICE` line.)

**Step 4: Commit**

```bash
git add supabase/migrations/<filename>
git commit -m "feat(db): filter-drift PR-2 M4 — install lessons_normalize_write trigger

BEFORE INSERT OR UPDATE on lessons. Enforces column⇄metadata sync
(column wins on disagreement) and proactively coerces known drift
shapes (array→scalar lessonFormat, {selected:...}→flat array
academicIntegration). Logs RAISE NOTICE on every coercion. Arrives
last to a fully-canonical table (M1+M2+M3 already applied), so no
DISABLE/session_replication_role dance needed.

After this lands, every future write to lessons (RPC, MCP, manual
SQL, scripts) goes through the trigger. See design doc §5
Migration 4."
```

### Task 2.8: Push, coordinate approval pause, per-PR ritual

**Step 1: Mandatory pre-PR check**

Run: `npm run type-check && npm run lint`
Expected: passes.

**Step 2: Pre-push reviewer agent**

Dispatch `feature-dev:code-reviewer` on `git diff main...HEAD`. Investigate findings; apply fix-up commits BEFORE push.

**Step 3: Push**

```bash
git push -u origin feat/filter-drift-pr2-writer-fix-trigger
```

**Step 4: Open PR**

```bash
gh pr create --title "feat: filter-drift PR-2 — writer fix + column hygiene + trigger" --body "$(cat <<'EOF'
## Summary
- Migration 1: writer fix in `complete_review_atomic` (lessonFormat array→scalar; academicIntegration object→array)
- Migration 2: backfill historical drift rows (~95 rows)
- Migration 3: column-data hygiene (17 activity_type location-leaks + ~5 AI mismatches)
- Migration 4: install + enable `lessons_normalize_write` trigger
- Sequenced so writer fix lands first → no drift gaps between migrations

## Why this matters
This is PR 2 of 3. PR 1 (column-based RPC) is already merged. After this, every future write to lessons goes through canonical-shape enforcement. Drift growth stops.

## PROD coordination needed (~5 min)
The writer fix migration needs a brief approval pause to eliminate the ~few-second window during apply where a `complete_review_atomic` call could land on the OLD writer. Notify reviewers in advance; resume approvals once the post-deploy drift query is clean.

## Test plan
- [ ] Local `supabase db reset` succeeds (4 migrations apply in order)
- [ ] Writer-roundtrip test matrix on local (4 AI shapes + 1 lessonFormat) — all pass
- [ ] Trigger smoke (deliberately drifted INSERT coerces with NOTICE)
- [ ] Shape-residue verification on TEST DB after CI: `array_lesson_format=0`, `object_ai=0`, `short_keys=0`
- [ ] Writer-roundtrip matrix re-run on TEST DB
- [ ] `npm run test:rls` clean
- [ ] `npm run type-check && npm run lint` clean

## Verification (TEST DB — paste post-CI results here)
- Shape residue counts: …
- Writer roundtrip matrix: …
- Trigger NOTICE log capture: …

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 5: Wait for external bot reviews**, four-surface triage, investigate every finding. Round-cap after 2 rounds.

**Step 6: TEST DB verification (mandatory)**

After CI applies all 4 migrations to TEST DB:
1. Run shape-residue query (expected 0/0/0).
2. Run writer-roundtrip matrix (synthetic call to `complete_review_atomic` with each of the 4 AI shapes + 1 lessonFormat shape).
3. Insert + delete a deliberately-drifted lesson row directly via SQL; capture the `RAISE NOTICE` from Supabase logs.

**Step 7: Re-verify TEST DB after each round** that produces DB-affecting fix-ups.

**Step 8: PROD apply coordination**

Before approving the PROD migration in `migrate-production.yml`:
1. Notify reviewers (Slack / email): "filter-drift PR-2 applying in ~5 min, please pause approvals."
2. Approve the migration.
3. Watch for SASL Apply-step flake; rerun via `gh run rerun --failed` if needed.
4. After all 4 migrations apply cleanly, run via `mcp__supabase-remote__execute_sql`:
   ```sql
   -- Drift-residue + post-deploy safety query
   SELECT
     COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'lessonFormat') = 'array' AND created_at >= '<migration_start_time>') AS post_deploy_array_lf,
     COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'academicIntegration') = 'object' AND created_at >= '<migration_start_time>') AS post_deploy_object_ai
   FROM lessons;
   ```
   Expected: 0, 0. If non-zero, run the same shape-coercion UPDATE from Migration 2 against just those rows (per design doc §5 §residual-concern paragraph).
5. Run the full shape-residue query (no time filter) — expected 0/0/0.
6. Notify reviewers: "applies clean, you may resume approvals."

---

## PR 3 — Canonical vocabulary

**Branch:** `feat/filter-drift-pr3-canonical-vocab`

**What ships:** coordinated frontend+backend change ending the alias era for `lessonFormat` / `activityType` / `cookingMethods`. Heritage stays alias-tolerant pending PR-4. **Three migrations** (Task 3.1 data canonicalization across columns + metadata; Task 3.2 RPC alias-helper removal for lf/at/cm only via `CREATE OR REPLACE` + `DROP FUNCTION` of the three helpers; Task 3.4 trigger vocab-canonicalization stage via `CREATE OR REPLACE FUNCTION lessons_normalize_write`) + `filterDefinitions.ts` rewrite (lf/at/cm only) + `facetCounts.ts` hardening.

**Why this is its own PR:** keeps the data migration, RPC simplification, and frontend wire-protocol change in one merge so they ship as a unit. Operational ordering between Netlify deploy (frontend goes canonical) and DB migration (RPC stops accepting drift-era values) is enforced by the per-PR ritual gate at Task 3.6 step 8 — atomic at the merge level, sequenced at the rollout level.

**Pre-flight:**
- Re-read design doc §6 (in full).
- Confirm PR-2 has merged + applied to PROD before drafting PR-3 (the data migration assumes PR-2's M2 backfill is complete).
- PROD probe (read-only): confirm the corpus state matches design doc §6 expected canonical-form decisions:
  ```sql
  -- lesson_format distinct values
  SELECT lesson_format, COUNT(*) FROM lessons GROUP BY lesson_format ORDER BY 2 DESC;
  -- activity_type distinct values
  SELECT unnest(activity_type) AS at, COUNT(*) FROM lessons GROUP BY at ORDER BY 2 DESC;
  -- cooking_methods distinct values
  SELECT unnest(cooking_methods) AS cm, COUNT(*) FROM lessons GROUP BY cm ORDER BY 2 DESC;
  ```
  Snapshot the distinct-values lists in the PR description (they'll be shorter post-PR-2).

### Task 3.1: Migration — canonical vocabulary (data + columns + metadata)

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<DATE_PREFIX>_filter_drift_pr3_canonical_vocab.sql`

**Step 1: Verify filename**

Run: `ls supabase/migrations/ | sort | tail -3`. Use prefix > latest.

**Step 2: Draft the migration**

Three idempotent UPDATE blocks per design doc §6 "Data migration":

1. **`lesson_format`** — scalar drift → Title Case. Map `'standalone'`→`'Standalone'`, `'mobile-education'`→`'Mobile education format'`, `'["standalone"]'`→`'Standalone'`. Apply to BOTH `lesson_format` column AND `metadata->'lessonFormat'`. Verbatim from design doc §6.

2. **`activity_type`** — already cleaned in PR-2 M3 for the location-leak rows. PR-3's job here is making sure no `*-only` suffix values lingered (corpus showed `cooking`/`garden`/`both`/`academic` already dominant, so this is mostly defensive). Add a sanity check first:
   ```sql
   SELECT unnest(activity_type) AS at, COUNT(*) FROM lessons GROUP BY at ORDER BY 2 DESC;
   ```
   If any `*-only` values appear post-PR-2, write a strip migration; otherwise omit.

3. **`cooking_methods`** — array element-wise lowercasing + outlier mapping. Use `ARRAY(SELECT ...)` not `array_agg` (empty-input → NULL gotcha). Apply to BOTH column AND `metadata->'cookingMethods'`. Use `COALESCE(jsonb_agg(...), '[]'::jsonb)` for the metadata version. Verbatim SQL from design doc §6.

**ROLLBACK note:** one-way data migration. If rollback needed, recovery is "ship a new migration that restores the prior vocabulary." The PR-1 alias tolerance is gone in this PR's RPC update (Task 3.2), so a partial rollback would also need to re-add aliases.

**Step 3: Apply locally + verify**

Run: `supabase db reset`. Then:
```sql
-- Distinct values check
SELECT lesson_format, COUNT(*) FROM lessons GROUP BY lesson_format ORDER BY 2 DESC;
-- Should show only canonical Title Case (no 'standalone' / 'mobile-education').

SELECT unnest(activity_type) AS at, COUNT(*) FROM lessons GROUP BY at;
-- Should show only canonical bare nouns: cooking, garden, academic, both.

SELECT unnest(cooking_methods) AS cm, COUNT(*) FROM lessons GROUP BY cm;
-- Should show only canonical lowercase: stovetop, oven, basic-prep, no-cook.
```

**Step 4: Commit**

```bash
git add supabase/migrations/<filename>
git commit -m "fix(db): filter-drift PR-3 — canonical vocabulary

Three idempotent UPDATEs (column + metadata):
- lesson_format: scalar drift → Title Case
- activity_type: any lingering *-only suffix stripping (defensive,
  most cleaned in PR-2)
- cooking_methods: array element-wise lowercasing + outlier mapping
  (Sautéing/Stovetop variants → 'stovetop')

Atomic with the RPC alias-helper removal (Task 3.2) and
filterDefinitions.ts rewrite (Task 3.3) in this PR. See design doc §6."
```

### Task 3.2: RPC update — remove alias helpers, direct column comparisons

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<DATE_PREFIX>_filter_drift_pr3_rpc_no_aliases.sql`

**Step 1: Draft the migration**

Two parts:

1. **`CREATE OR REPLACE FUNCTION public.search_lessons(...)`** with same signature as PR-1. Body simplified — direct column comparisons for the three vocabulary-canonicalized fields, but heritage **still** uses the alias helper because PR-4 hasn't shipped:
   - `l.lesson_format = filter_lesson_format` (no `_alias_lesson_format`)
   - `l.activity_type && filter_activity_type` (no `_alias_activity_type`)
   - `l.cooking_methods && filter_cooking_method` (no `_match_cooking_methods`)
   - `l.cultural_heritage && expand_cultural_heritage(_alias_cultural_heritage(filter_cultures))` — **same as PR-1**. PR-3 leaves stored heritage values untouched (Title Case + slug mix), `filterDefinitions.ts` heritage section untouched (slug values), and `cultural_heritage_hierarchy` untouched (Title Case parents). All three need PR-4 to canonicalize together. Removing the alias here would regress slug filters like `asian` / `east-asian` instantly. Verify the SQL clause matches PR-1 verbatim, no changes.

2. **DROP only the three vocabulary-canonicalized helpers; KEEP `_alias_cultural_heritage`:**
   ```sql
   DROP FUNCTION IF EXISTS public._alias_lesson_format(text);
   DROP FUNCTION IF EXISTS public._alias_activity_type(text[]);
   DROP FUNCTION IF EXISTS public._match_cooking_methods(text[], text[]);
   -- _alias_cultural_heritage(text[]) is intentionally NOT dropped — used by
   -- search_lessons heritage filter clause until PR-4 canonicalizes heritage.
   ```

3. **Keep the metadata reconstruction block** in the SELECT (still serves the facet-count-correctness goal).

4. `GRANT EXECUTE ...` (preserved by `CREATE OR REPLACE`, but explicit if signature is unchanged is fine).

5. `NOTIFY pgrst, 'reload schema';`

**Step 2: Apply locally + smoke**

Run: `supabase db reset`. Run RPC calls to confirm the canonical paths AND the still-tolerant heritage path:
```sql
-- Canonical-form filters (alias-removed)
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_lesson_format => 'Single period', /* ... */);
-- Should return same count as PR-1's "lessonFormat=Single period" matrix entry.

SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_activity_type => ARRAY['cooking'], /* ... */);
-- Should return same count as PR-1's "activityType=cooking" matrix entry.

-- Slug-form for the THREE canonicalized fields → should now return 0 (alias gone)
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_lesson_format => 'single-period', /* ... */);
-- Should return 0 (no canonical row matches lowercase slug post-PR-3).

SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_activity_type => ARRAY['cooking-only'], /* ... */);
-- Should return 0 (alias removed, '-only' suffix no longer mapped).

-- Heritage slug → should STILL return non-zero (alias preserved for PR-4 gating)
SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_cultures => ARRAY['asian'], /* ... */);
-- Should return ~67 (matches PR-1's heritage matrix entry — Title-Case rows
-- in the corpus + alias mapping).

SELECT COUNT(*) FROM search_lessons(NULL, /* ... */, filter_cultures => ARRAY['east-asian'], /* ... */);
-- Should return ~36+ (Title-Case "East Asian" rows via alias).
```

**Step 3: Commit**

```bash
git add supabase/migrations/<filename>
git commit -m "feat(db): filter-drift PR-3 — RPC alias removal, direct column comparisons

Drops _alias_lesson_format, _alias_activity_type,
_match_cooking_methods (canonicalized in this PR). Keeps
_alias_cultural_heritage until PR-4. RPC body simplified to
direct column comparisons. Metadata reconstruction stays in
the SELECT for facet-count correctness. See design doc §6."
```

### Task 3.3: Rewrite `filterDefinitions.ts`

**Files:**
- Modify: `src/utils/filterDefinitions.ts:22-211`
- Modify or create: `src/utils/filterDefinitions.test.ts` (if it exists, update vocabulary assertions)

**Step 1: Apply value/label changes**

Per design doc §6 "Display-label separation":

- `lessonFormat` options: `value` becomes Title Case, `label` stays user-friendly.
- `activityType` options: `value` becomes bare noun (`cooking`, `garden`, `academic`, `both`), `label` stays user-friendly (`Cooking Only`, etc.).
- `cookingMethods` options: `value` becomes lowercase (`stovetop`, `oven`, `basic-prep`, `no-cook`), `label` stays user-friendly.
- `culturalHeritage` options: **leave untouched** — PR-4 owns canonicalization here.
- `thematicCategories`, `coreCompetencies`, `seasonTiming`, `locationRequirements`, `academicIntegration`, `socialEmotionalLearning`, `gradeLevels` — leave untouched (per design doc §6 "Out of scope").

**Step 2: Update tests if they exist**

Run: `find src -name 'filterDefinitions.test.*'`
If a test file exists, update vocabulary assertions to canonical values. If not, no test added (the existing usage in components covers the contract).

**Step 3: Verify**

```bash
npm run type-check && npm run lint
npm run test
```
Expected: all pass.

**Step 4: Commit**

```bash
git add src/utils/filterDefinitions.ts src/utils/filterDefinitions.test.ts  # if test file exists
git commit -m "feat(filters): canonical wire-protocol values in filterDefinitions.ts

Updates value fields to canonical-form post-PR-3 data migration:
- lessonFormat: Title Case
- activityType: bare nouns (cooking/garden/academic/both)
- cookingMethods: lowercase (stovetop/oven/basic-prep/no-cook)
- culturalHeritage: untouched (PR-4 territory)

Label fields stay user-friendly. UI was already rendering label,
so no visual change. See design doc §6."
```

### Task 3.4: Trigger update — prepend vocabulary canonicalization stage

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<DATE_PREFIX>_filter_drift_pr3_trigger_vocab_stage.sql`

**Step 1: Draft the migration**

`CREATE OR REPLACE FUNCTION public.lessons_normalize_write()` with the SAME function body as PR-2 M4 plus a NEW stage prepended:

**Vocabulary canonicalization stage** — runs first, applied to NEW.lesson_format, NEW.activity_type, NEW.cooking_methods (and the parallel metadata keys). Lookup tables baked into a `_canonicalize_vocab(...)` helper (or inline if simpler).

**Coverage requirement: every value present in `filterDefinitions.ts` BEFORE the PR-3 rewrite must map to its canonical form.** Cached browser bundles, MCP writes, manual SQL, and any non-RPC writer can land pre-PR-3 vocabulary at any time after the migration applies; the trigger's job is to canonicalize them silently. Verified against `src/utils/filterDefinitions.ts:163-175` (lessonFormat), `:25-32` (activityType), `:202-210` (cookingMethods) BEFORE the PR-3 rewrite — fill in the FULL map for each:

```sql
-- Canonicalize lesson_format (covers ALL pre-PR-3 filterDefinitions.ts values)
IF NEW.lesson_format IS NOT NULL THEN
  NEW.lesson_format := CASE NEW.lesson_format
    WHEN 'standalone'        THEN 'Standalone'
    WHEN 'multi-session'     THEN 'Multi-session unit'
    WHEN 'double-period'     THEN 'Double period'
    WHEN 'single-period'     THEN 'Single period'
    WHEN 'co-taught'         THEN 'Co-taught'
    WHEN 'remote-virtual'    THEN 'Remote/virtual adapted'
    WHEN 'mobile-education'  THEN 'Mobile education format'
    -- Already-canonical values pass through unchanged via ELSE.
    -- Cross-check: when adding/removing lessonFormat options in
    -- filterDefinitions.ts in future PRs, update this map.
    ELSE NEW.lesson_format
  END;
END IF;

-- Canonicalize activity_type (pre-PR-3 values: cooking-only, garden-only,
-- both, academic-only). 'both' is already canonical — no transform.
IF NEW.activity_type IS NOT NULL THEN
  NEW.activity_type := ARRAY(
    SELECT
      CASE x
        WHEN 'cooking-only'  THEN 'cooking'
        WHEN 'garden-only'   THEN 'garden'
        WHEN 'academic-only' THEN 'academic'
        -- 'both' was canonical pre-PR-3 in filterDefinitions.ts (no -only suffix),
        -- passes through ELSE.
        ELSE x
      END
    FROM unnest(NEW.activity_type) x
  );
END IF;

-- Canonicalize cooking_methods. Pre-PR-3 filterDefinitions.ts had
-- 'Stovetop' / 'Oven' / 'Basic prep only' (Title Case + spaces).
-- Corpus also has historical outliers (Sautéing variants, Steam, No-cook)
-- already cleaned by Task 3.1's data migration — defensive include for
-- any non-RPC writer that might still produce them.
IF NEW.cooking_methods IS NOT NULL THEN
  NEW.cooking_methods := ARRAY(
    SELECT DISTINCT
      CASE x
        WHEN 'Stovetop'                                  THEN 'stovetop'
        WHEN 'Oven'                                      THEN 'oven'
        WHEN 'Basic prep only'                           THEN 'basic-prep'
        WHEN 'No-cook'                                   THEN 'no-cook'
        WHEN 'Sautéing'                                  THEN 'stovetop'
        WHEN 'Stovetop (sautéing, boiling, simmering)'   THEN 'stovetop'
        WHEN 'Steam'                                     THEN 'stovetop'
        ELSE lower(x)  -- catch-all: lowercase any unmapped element
      END
    FROM unnest(NEW.cooking_methods) x
  );
END IF;
```

After this stage, the existing column⇄metadata sync stage from PR-2 runs and the metadata gets the canonicalized values.

**`RAISE NOTICE` on every coercion** as before.

**Step 2: Apply locally + smoke**

```sql
-- Insert a deliberately drift-vocab row
INSERT INTO lessons (lesson_id, title, summary, file_link, grade_levels, lesson_format)
VALUES ('test_vocab_smoke', 'Vocab smoke', 't', 'https://e.com', ARRAY['3'], 'standalone');

SELECT lesson_format, metadata->'lessonFormat' FROM lessons WHERE lesson_id = 'test_vocab_smoke';
-- Expected: lesson_format='Standalone', metadata->>'lessonFormat'='Standalone'

DELETE FROM lessons WHERE lesson_id = 'test_vocab_smoke';
```

**Step 3: Commit**

```bash
git add supabase/migrations/<filename>
git commit -m "feat(db): filter-drift PR-3 — trigger vocab canonicalization stage

Prepends vocab-canonicalization to lessons_normalize_write so any
future write with drift-era vocabulary (slug-form lesson_format,
mixed-case cooking_methods, etc.) coerces to canonical at the DB
boundary. Belt-and-braces for any non-RPC writer (MCP, manual SQL,
scripts). See design doc §6."
```

### Task 3.5: `facetCounts.ts` hardening

**Files:**
- Modify: `src/utils/facetCounts.ts:55` (lessonFormat handling)

**Why:** the `MEMORY.md` "Open hygiene follow-ups" entry flags `facetCounts.ts:55` for array-shape input hardening. Post-PR-3, no lesson has array-shape `lessonFormat` (PR-2 M2 unwrapped the 1 outlier; PR-3 trigger prevents recurrence). The defensive check can stay or be removed — design doc §6 notes the RPC's metadata reconstruction makes `facetCounts.ts` largely a no-op anyway. Apply the defensive fix per `MEMORY.md`:

**Step 1: Apply the fix**

```typescript
// Before:
case 'lessonFormat':
  return meta.lessonFormat ? [meta.lessonFormat] : [];

// After:
case 'lessonFormat':
  if (Array.isArray(meta.lessonFormat)) return meta.lessonFormat;
  return meta.lessonFormat ? [meta.lessonFormat] : [];
```

**Step 2: Run tests**

```bash
npm run test
```
Expected: existing tests pass (canonical metadata is a strict subset of what tests assume).

**Step 3: Commit**

```bash
git add src/utils/facetCounts.ts
git commit -m "fix(filters): facetCounts.ts handles array-shape lessonFormat defensively

Belt-and-braces against any future submission/migration path that
writes array shape. PR-3's trigger prevents this at the DB layer,
but the defensive check costs nothing. See MEMORY.md hygiene
follow-up."
```

### Task 3.6: Push, per-PR ritual

**Step 1: Mandatory pre-PR check**

Run: `npm run type-check && npm run lint`

**Step 2: Pre-push reviewer agent**

Dispatch `feature-dev:code-reviewer` on `git diff main...HEAD`. Investigate findings; apply fix-up commits BEFORE push.

**Step 3: Push**

```bash
git push -u origin feat/filter-drift-pr3-canonical-vocab
```

**Step 4: Open PR**

```bash
gh pr create --title "feat: filter-drift PR-3 — canonical vocabulary (data + RPC + UI + trigger)" --body "$(cat <<'EOF'
## Summary
- 1 data migration (lesson_format Title Case, cooking_methods lowercase + outlier map)
- RPC update: drop _alias_lesson_format / _alias_activity_type / _match_cooking_methods
- _alias_cultural_heritage stays until PR-4
- filterDefinitions.ts: value→canonical, label stays
- Trigger: prepend vocab-canonicalization stage to lessons_normalize_write
- facetCounts.ts:55 defensive Array.isArray hardening

## Why this matters
This is PR 3 of 3 in the filter metadata drift repair (PR-4 heritage redesign deferred). Coordinated frontend+backend change — atomic at the merge level, sequenced at the rollout level via the Netlify-first ordering gate (see Task 3.6 step 8). The gate prevents the zero-results window where the DB drops alias tolerance before browsers receive the new bundle that sends canonical values.

After this lands, the corpus is fully canonical for lesson_format / activity_type / cooking_methods. Vocabulary cleanup for cultural_heritage stays in PR-4 (gated on stakeholder).

## Test plan
- [ ] Local `supabase db reset` succeeds (3 migrations apply: data canonicalization, RPC update, trigger vocab stage)
- [ ] Distinct-values check: lesson_format / activity_type / cooking_methods all canonical
- [ ] PR-1 9-row matrix re-run on TEST DB — all expected counts match
- [ ] Trigger smoke (deliberately drift-vocab INSERT coerces with NOTICE)
- [ ] `npm run test` clean
- [ ] `npm run type-check && npm run lint` clean

## Verification (TEST DB — paste post-CI results here)
- Distinct-values pre-PR / post-PR: …
- 9-row matrix counts: …

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Step 5: Wait for external bot reviews**, four-surface triage, investigate every finding. Round-cap after 2 rounds.

**Step 6: TEST DB verification (mandatory)**

After CI applies migrations to TEST DB:

1. **Distinct-values check** — `lesson_format` / `activity_type` / `cooking_methods` columns should show only canonical values.

2. **PR-1 matrix re-run, with split expectations.** The PR-1 9-row matrix mixed canonical-form and drift-era values; PR-3 changes the expected counts. Don't say "counts should still align" — that contradicts Task 3.2's slug-form-zero smoke. Split:

   **Canonical-value rows (counts preserve from PR-1):**
   - Row 3 — `filter_lesson_format = 'Single period'` → ~483 (PR-1 alias matched both shapes; PR-3 data migration unified the corpus to `'Single period'` only)
   - Row 5 — `filter_activity_type = ARRAY['cooking']` → ~299 (corpus already dominated by `'cooking'`; alias matched `'cooking-only'` rows that no longer exist post-data-migration)
   - Row 6 — `filter_cooking_method = ARRAY['stovetop']` → ~177 (corpus all lowercase post-data-migration)
   - Row 8 — `filter_academic = ARRAY['Math']` → ~189 (vocabulary unchanged — PR-3 doesn't canonicalize academicIntegration)

   **Drift-era rows (now return 0 — alias removed for lf/at/cm):**
   - Row 2 — `filter_lesson_format = 'single-period'` → **0** (alias dropped; data migration eliminated slug-form rows)
   - Row 4 — `filter_activity_type = ARRAY['cooking-only']` → **0** (alias dropped; corpus has no `'cooking-only'` rows)
   - Row 7 — `filter_cooking_method = ARRAY['Stovetop']` → **0** (alias dropped; corpus all lowercase)

   **Heritage rows (still alias-tolerant — `_alias_cultural_heritage` preserved for PR-4):**
   - Row 9 — `filter_cultures = ARRAY['asian']` → ~67 (heritage alias still maps slug → Title Case in the corpus)

   **Baseline (no filters):**
   - Row 1 — `COUNT(*)` baseline → unchanged

   If a "drift-era → 0" row returns non-zero, either (a) the alias helper wasn't actually dropped (verify `\df _alias_lesson_format` returns nothing), or (b) the data migration didn't fully canonicalize (re-run distinct-values check). If a "canonical-value preserve" row drops in count, the data migration over-coerced (rare; investigate the specific rows that disappeared).

3. **Trigger smoke against TEST DB** (insert deliberately drift-vocab row directly via SQL; confirm trigger coerces with NOTICE entry in logs; clean up).

**Step 7: Re-verify TEST DB after each round** that produces DB-affecting fix-ups.

**Step 8: PROD apply — Netlify-first ordering gate (mandatory)**

This PR has a real frontend-vs-DB ordering hazard. PR-3 simultaneously (a) removes RPC alias helpers (so the DB stops accepting drift-era values like `'single-period'` / `'cooking-only'`) and (b) updates `filterDefinitions.ts` so the UI sends canonical values (`'Single period'` / `'cooking'`). On merge, two things happen in parallel:

1. Netlify auto-build kicks off (~3-5 min) and eventually deploys the new bundle
2. `migrate-production.yml` queues for manual approval

If the migration is approved BEFORE the Netlify deploy goes live, browsers still loading the OLD bundle send drift-era values to the canonical-only DB → **filters return zero hits** for affected categories until the new bundle propagates. This is the same shape of hazard as PR-2's reviewer-approval pause, but with frontend deploy ordering instead of writer pause.

**Required ordering before approving the PROD migration:**

1. **After merge, wait for the new Netlify bundle to be live.** Watch the Netlify deploys page or run `netlify deploys --status=ready --json | jq '.[0]'` until the production deploy for the merge commit is `state=ready`.
2. **Hard-refresh and verify the new bundle is served.** Cache-bust the production URL and check in DevTools Network tab that the JS bundle hash has changed compared to pre-merge. If hash is unchanged, Netlify is still serving the old bundle from CDN — wait.
3. **Pre-migration smoke (frontend canonical, DB still alias-tolerant).** With the new bundle live but DB aliases still in place, the UI is now sending canonical wire-protocol values (`'Single period'`, `'cooking'`, `'stovetop'`) and the still-PR-1 RPC tolerates them via the alias helpers — both sides agree on the canonical names, so filters should return canonical-form counts. Click `Single period` lessonFormat, `Cooking Only` activityType, `Stovetop` cookingMethods on production and capture the counts. These are your baseline.
4. **Approve the migration in `migrate-production.yml`.**
5. **Watch for SASL Apply-step flake;** rerun via `gh run rerun --failed` if needed.
6. **Post-migration smoke (frontend canonical, DB now alias-removed).** Re-click the same three filters. Counts MUST match step 3 exactly — both sides are now canonical-only, so filtering produces the same result set. Any divergence means either (a) data wasn't fully canonical (re-check PR-2's M2/M3 took on PROD), (b) the frontend is still serving the old bundle (CDN lag), or (c) heritage alias was accidentally removed (verify the `_alias_cultural_heritage` helper still exists via `\df _alias_cultural_heritage`).
7. **MCP verification:** `mcp__supabase-remote__execute_sql` distinct-values check (only canonical values present in `lesson_format` / `activity_type` / `cooking_methods` columns) + 9-row matrix matches expected counts.

**Why not just leave aliases in for one more PR cycle?** Considered. The reviewer suggested this as an alternative — keep helpers in PR-3, drop them in a PR-3.5 after grace period. The downside is an extra PR ceremony (one more migrate-production.yml approval, one more bot-review cycle, one more set of fix-ups). The Netlify-first gate is operationally simpler and the same kind of ordering discipline PR-2 already requires. **Decision: ordering gate, not extra PR.** If a future session encounters the gate as friction (e.g. Netlify is flaky, or approval-window urgency forces approving without confirming live), surface to the user and the PR-3.5 split becomes the fallback.

---

## Done

After PR-3 merges + smoke-passes on PROD:

1. **Update auto-memory** `MEMORY.md`:
   - Move filter drift initiative from "Active initiatives" to a "Recently shipped" section, OR mark closed in `project_lesson_format_conflated.md` if that becomes the surviving thread (the lessonFormat semantic-conflation issue stays open as a separate concern).
   - Mark the `MEMORY.md` "facetCounts.ts:55 hardening" hygiene-follow-up as done.
2. **Verify on PROD** — exercise filter clicks via deploy preview + production for each of the canonical-form filters (lessonFormat, activityType, cookingMethods, academicIntegration, culturalHeritage with PR-4 still pending).
3. **Capture follow-ups** in MEMORY.md or new memory entries:
   - **PR 4 (heritage redesign)** — gated on stakeholder. Keep as an open initiative until stakeholder convo happens.
   - **`lessonFormat` semantic conflation** (`project_lesson_format_conflated.md`) — still open, separate from drift repair.
   - **Audit-table observability** for trigger coercion — current design uses `RAISE NOTICE`; if log-only proves insufficient, revisit.
   - **PR-3 RPC test infrastructure** — pgTAP or custom SQL-level harness against local Docker DB. Deferred unless a regression slips through MCP-based verification.

## Test plan

### Unit
- `src/hooks/useLessonSearch.test.ts` — 5 cases for `normalizeMetadata` academicIntegration handling (PR 1, Task 1.3).
- `src/utils/filterDefinitions.test.ts` — vocabulary assertions updated in PR 3, Task 3.3 (if file exists).
- `src/utils/facetCounts.test.ts` — existing tests pass post-PR-3 (canonical metadata is a strict subset of what tests assume).

### Integration
- `lesson-search.params.test.tsx` (existing) — keep as-is for parameter-passing regression. **Do NOT expand to claim semantic coverage** — fixture rows prove nothing about RPC behavior unless tests hit a real RPC.

### TEST DB SQL (the authoritative semantics layer)
- **PR 1**: 9-row search_lessons test matrix mirroring 2026-04-28 production verification. After PR-1, all return non-zero hits matching documented true counts (~483, ~299, ~177, ~189, ~67). Spot-check result-row metadata is column-derived.
- **PR 2**: shape-residue queries (`array_lesson_format=0`, `object_ai=0`, `short_keys=0`). Writer-roundtrip matrix on synthetic `complete_review_atomic` calls (4 AI shapes + 1 lessonFormat). Trigger NOTICE log capture from a deliberately-drifted INSERT.
- **PR 3**: distinct-values check (only canonical values in lesson_format / activity_type / cooking_methods columns). Re-run PR-1's 9-row matrix (counts align). Trigger vocab-stage smoke from a slug-form INSERT.

### E2E
- Playwright smoke per filter category, asserting non-zero result counts on canonical filter values. Especially valuable for PR-1 verification (most filters go from "0 hits" to "real counts" in one merge). Run against Netlify deploy preview against TEST DB.
- `e2e/filter-counts.spec.ts` (new file, optional in PR-1; mandatory if E2E coverage already exists for filter clicks). Add `.skip`-able tests for canonical filter values per category.

### RLS
- No RLS changes in any PR. `npm run test:rls` must pass unchanged across all three PRs.

### Manual smoke checklist (per `superpowers:verification-before-completion`)

- After PR-1: click each filter category, confirm result counts match the TEST-DB verification matrix. `Single period` → ~483, `Cooking Only` → ~299, `Stovetop` → ~177, `Math` → ~189.
- After PR-2: insert a synthetic `(update, X)` submission via `process-submission` edge function on deploy preview; reviewer-approves via `complete_review_atomic`; inspect the merged lesson row → metadata + columns canonical-shape.
- After PR-3: confirm filter sidebar still works (UI still renders canonical labels); check distinct-value sets in lesson_format / activity_type / cooking_methods columns are minimal.

## References

### Code
- `supabase/migrations/20251001_production_baseline_snapshot.sql:1198-1357` — `search_lessons` body (current).
- `supabase/migrations/20251001_production_baseline_snapshot.sql:465` — `handle_lessons_metadata_write` (defined but unattached; NOT being reused).
- `supabase/migrations/20260428000007_phase_4_fix_metadata_shape.sql` — Phase 4 metadata-shape fix (the source of the array-shape bug we're fixing in PR-2 M1).
- `supabase/migrations/20260428000008_phase_4_status_guard.sql` — Phase 4 status guard (current `complete_review_atomic` deployed source as of 2026-04-28).
- `src/hooks/useLessonSearch.ts:1-50` — frontend → RPC param mapping; `normalizeMetadata` helper.
- `src/utils/filterDefinitions.ts:22-211` — UI filter vocabulary.
- `src/utils/facetCounts.ts` — facet computation.

### Plans
- `docs/plans/2026-04-28-filter-metadata-drift-repair-design.md` — locked design doc (this plan's source of truth for WHY).
- `docs/plans/2026-04-28-filter-metadata-drift-repair-design-v1-jsonb.md` — archived v1 (JSONB-as-source-of-truth, rejected). Refer here if a future session tries to re-debate JSONB-based filtering.
- `docs/plans/2026-04-27-phase-8b-approve-update-redesign-implementation.md` — Phase 8b worked example (style reference for this plan).

### Memory
- `MEMORY.md` — "Open hygiene follow-ups" (facetCounts.ts:55, SASL flake mitigation, edge-function deletion ordering hazard).
- `project_lesson_format_conflated.md` — lessonFormat semantic conflation (out of scope here; separate filter-redesign concern).
- `feedback_data_safety_top_priority.md`, `feedback_workflows_not_sacred.md`, `feedback_pr_bot_review_workflow.md`, `feedback_bot_review_investigation.md`, `feedback_pr_comment_surfaces.md`, `feedback_per_round_test_db_verification.md`.
