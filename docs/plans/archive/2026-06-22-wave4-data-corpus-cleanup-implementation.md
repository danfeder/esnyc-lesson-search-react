# Wave 4 — Data / Corpus Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to implement task-by-task. **Status: tasks AUTHORED (design locked Session 1, 2026-06-22).** Each PR-1/PR-2 migration task is GATE-2-gated (Codex SQL review before TEST apply) and follows the kickoff PER-PR RITUAL. Verify every snippet against current code/schema before applying — the SQL below is a reference skeleton, not a copy-paste; small repo-conformance adaptations OK, product/design changes require stopping to ask.

**Goal:** Clear the corpus's small, distinct data-cleanup debts safely, reversible-first, one blast-radius per PR. Scope (reshaped at lock): **PR1 = C12 + C83 · PR2 = C11 + C49 · PR3 = C88.** C08 closed (no-op); C02 relocated to its own re-tag session.

**Architecture:** 3 PRs, lowest-risk-first — see design doc §3. Design doc is canonical for WHY; **read its §4 locked answers for the task you're on before writing any SQL.**

**Tech Stack:** PostgreSQL (Supabase migrations + `.rollback`), React/TS frontend (PR2's C49), Vitest, MCP TEST/PROD verification.

**Design reference:** `docs/plans/2026-06-22-wave4-data-corpus-cleanup-design.md`.

**Sub-skills to invoke (per phase):**
- `database-migrations` — before touching any file in `supabase/migrations/` (every PR1–PR2 migration)
- `/new-migration` — to create each migration file (enforces the `YYYYMMDDHHMMSS_` ASCII-sort rule; **latest existing is `20260621000000` — check `ls supabase/migrations | sort | tail -3` at creation time and pick a strictly-greater timestamp**)
- `superpowers:test-driven-development` — C83 Zod fixture + C49 frontend removal are test-first
- `superpowers:verification-before-completion` — before claiming any task done
- `superpowers:requesting-code-review` — between PRs

**Per-PR ritual (mandatory):** canonical spec in the kickoff PER-PR RITUAL section + cited feedback memories. One-line: pre-push reviewer agent + GATE 3 Codex → `npm run check` → push + `gh pr create` → wait for bots → four-surface triage → rebuttal-pass every finding + GATE 4 Codex → consolidated fix-ups → per-round TEST-DB re-verify → round-cap after 2. **GATE 2 Codex on every migration SQL before TEST apply.** Don't restate per-task; cite it.

**Branch cut:** PR1 branches from `chore/wave4-scaffold` (NOT `main`) so the scaffold + design-lock docs bundle into PR1 (user decision 2026-06-22). PR2/PR3 branch from `main` after PR1 merges (or from the prior PR's branch if stacking — supervisor calls it).

**Evidence baseline (supervisor-verified TEST+PROD 2026-06-22 — re-confirm before each apply, never trust these stale):**
- Corpus: TEST 766/745/21 · PROD 788/767/21. **C11 post-delete is a −3 DELTA, not an absolute count.**
- C12 stuck: **TEST 17 (15 new + 2 update) · PROD 14 (14 new, 0 update)**; 0 submitted after 2026-05-01 on both. → env-independent scope.
- C83 failing season: TEST=PROD=17 string (year-round×13/end-of-year×2/winter×2) + 96 array; 14 backfillable / 3 empty-source → `[]`.
- C11 ghosts: 3 rows, all 14 ref probes = 0, guarded count = 3 — on BOTH DBs.

## PR breakdown

| PR | Title | Contains | Notes |
|---|---|---|---|
| 1 | Reversible data cleanups | C12 (close stale submissions, env-independent) + C83 (backfill season from published lesson; 3→`[]`) | One migration + `.rollback`, two snapshot tables. Reversible. Ships first. |
| 2 | Ghost hard-delete + search-RPC cleanup | C11 (snapshot + guarded `DELETE` 3 ghosts + remove RPC exclusion) + C49 (drop dead param + 4 frontend lines + types regen) | **Highest risk, isolated.** Irreversible delete (snapshot first). RPC `DROP+CREATE` → re-grant + `NOTIFY pgrst`. |
| 3 | Local dev-seed refresh | C88 (author read-only generator; re-export `data/consolidated_lessons.json` from PROD-live) | No DB write, no PROD mutation. Land anytime. |

---

## PR 1 — Reversible data cleanups (C12 + C83)

**Branch:** `chore/wave4-pr1-reversible-cleanups` (cut from `chore/wave4-scaffold`).

**What ships:** one migration + `.rollback` that (C12) closes the stale never-reviewed submission backlog and (C83) normalizes the 17 string-typed review season values to arrays. Each section has its own snapshot table populated BEFORE its UPDATE. Plus a C83 Zod fixture (TDD).

**Pre-flight (do first):** invoke `database-migrations`; read design §4 Q1–Q5; `ls supabase/migrations | sort | tail -3`; re-run the TEST+PROD count probes from the evidence baseline (counts drift — never trust the doc's numbers blind).

### Task 1.1 — C83 Zod fixture (TDD, write FIRST)
- **Target the CORRECT schemas (Codex C83-LOW):** the review row's key is **`season`** on `reviewFormPayloadSchema` (`src/types/reviewFormPayload.zod.ts:44-50`); the lesson's key is **`seasonTiming`** on `lessonMetadataSchema` (`src/types/lessonMetadata.zod.ts:193-198`). A whole-object test of `lessonMetadataSchema` using `season` proves nothing. Locate exact lines with `rg -n "SeasonTimingEnum|seasonTiming|\\bseason\\b" src/types/*.zod.ts`.
- **Assert (file e.g. `src/types/__tests__/seasonTiming.backfill.test.ts`):**
  - `reviewFormPayloadSchema.safeParse({ season: [] })` → success (the 3-fallback shape is valid).
  - `reviewFormPayloadSchema.safeParse({ season: ['Winter','Spring'] })` → success (backfilled shape).
  - `reviewFormPayloadSchema.safeParse({ season: 'year-round' })` → **failure** (the bug being fixed).
  - `lessonMetadataSchema.safeParse({ seasonTiming: [] })` → success; and `reviewToLesson({ season: ['Winter'] }).seasonTiming` → `['Winter']` (the rename path stays correct).
- **Verify:** `npm run test:run -- <file>` green. Value = locking the `[]` + backfilled-array acceptance and the string-rejection on the right schema.
- **Commit:** `test(wave4): pin seasonTiming review-normalization shape (C83)`

### Task 1.2 — PR1 migration: C12 + C83 + `.rollback`
- **Create:** `/new-migration wave4_pr1_close_stuck_submissions_fix_season` → `supabase/migrations/<TS>_wave4_pr1_close_stuck_submissions_fix_season.sql` (+ author the matching `.rollback`). Timestamp strictly > `20260621000000`.
- **Section C12** (env-independent — see design Q1; do NOT hardcode 17):
  ```sql
  -- C12: close the stale, never-reviewed submission backlog.
  -- Env-independent: status='submitted' AND created_at < '2026-05-01'
  --   (TEST 17 [15 new+2 update] / PROD 14 [14 new]; 0 submitted after 2026-05-01 on either)
  CREATE TABLE IF NOT EXISTS public.wave4_c12_submissions_rollback (
    id uuid PRIMARY KEY,
    status text NOT NULL,
    reviewer_notes text,
    reviewed_at timestamptz,
    updated_at timestamptz,        -- Codex C12-MED: trigger re-stamps updated_at; snapshot it for an exact rollback
    snapshotted_at timestamptz NOT NULL DEFAULT now()
  );
  INSERT INTO public.wave4_c12_submissions_rollback (id, status, reviewer_notes, reviewed_at, updated_at)
  SELECT id, status, reviewer_notes, reviewed_at, updated_at FROM public.lesson_submissions
  WHERE status='submitted' AND created_at < '2026-05-01'
  ON CONFLICT (id) DO NOTHING;

  DO $$
  DECLARE n_new int; n_upd int; n_left int;
  BEGIN
    UPDATE public.lesson_submissions
      SET status='rejected', reviewed_at=now(),
          reviewer_notes='Auto-closed during Wave 4 corpus cleanup (2026-06-22): stale submission, never reviewed (submitted '||to_char(created_at,'YYYY-MM-DD')||'). Closing to clear the review queue.'
      WHERE status='submitted' AND created_at < '2026-05-01' AND submission_type='new';
    GET DIAGNOSTICS n_new = ROW_COUNT;

    UPDATE public.lesson_submissions
      SET status='rejected', reviewed_at=now(),
          reviewer_notes='Auto-closed during Wave 4 corpus cleanup (2026-06-22): orphan-recovery artifact from the 2026-04-28 submission reconciliation; never a real teacher-driven update. Closing to clear the review queue.'
      WHERE status='submitted' AND created_at < '2026-05-01' AND submission_type='update';
    GET DIAGNOSTICS n_upd = ROW_COUNT;

    SELECT count(*) INTO n_left FROM public.lesson_submissions WHERE status='submitted' AND created_at < '2026-05-01';
    IF n_left <> 0 THEN RAISE EXCEPTION 'C12 post-condition failed: % stale submitted rows remain', n_left; END IF;
    RAISE NOTICE 'C12: closed % new + % update stale submissions', n_new, n_upd;
  END $$;
  ```
  Idempotent: a re-run matches 0 rows (already `rejected`) → asserts cleanly.
- **Section C83** (CTE-driven, no hardcoded review IDs — see design Q4):
  ```sql
  -- C83: normalize 17 string-typed submission_reviews.tagged_metadata->'season' to arrays.
  CREATE TABLE IF NOT EXISTS public.wave4_c83_season_rollback (
    review_id uuid PRIMARY KEY,
    original_season jsonb NOT NULL,
    snapshotted_at timestamptz NOT NULL DEFAULT now()
  );
  INSERT INTO public.wave4_c83_season_rollback (review_id, original_season)
  SELECT id, tagged_metadata->'season' FROM public.submission_reviews
  WHERE jsonb_typeof(tagged_metadata->'season')='string'
  ON CONFLICT (review_id) DO NOTHING;

  -- PRE-UPDATE guard (Codex C83-MED): every failing row must resolve to exactly ONE lesson whose
  -- seasonTiming is a JSON array (length 0 allowed). Fail loud on null/non-array/unresolved — NEVER
  -- let the UPDATE silently coerce an unresolved row to []. (The scalar subqueries below already ERROR
  -- on multi-resolution, so >1 is covered; this catches 0-resolution + non-array.)
  DO $$
  DECLARE n_bad int;
  BEGIN
    SELECT count(*) INTO n_bad FROM (
      SELECT COALESCE(
               (SELECT lc.metadata->'seasonTiming' FROM public.lessons lc WHERE lc.lesson_id = f.canonical_lesson_id),
               (SELECT lo.metadata->'seasonTiming' FROM public.lessons lo WHERE lo.original_submission_id = f.submission_id)
             ) AS lesson_season
      FROM (SELECT id, canonical_lesson_id, submission_id FROM public.submission_reviews
            WHERE jsonb_typeof(tagged_metadata->'season')='string') f
    ) q
    WHERE q.lesson_season IS NULL OR jsonb_typeof(q.lesson_season) <> 'array';
    IF n_bad <> 0 THEN RAISE EXCEPTION 'C83 pre-condition failed: % failing review(s) do not resolve to a single lesson with an array seasonTiming', n_bad; END IF;
  END $$;

  -- UPDATE: write the resolved array directly (empty [] ONLY from a genuinely empty-source lesson — the guard above proved it).
  WITH failing AS (
    SELECT sr.id, sr.canonical_lesson_id, sr.submission_id
    FROM public.submission_reviews sr
    WHERE jsonb_typeof(sr.tagged_metadata->'season')='string'
  ),
  resolved AS (
    SELECT f.id,
      COALESCE(
        (SELECT lc.metadata->'seasonTiming' FROM public.lessons lc WHERE lc.lesson_id = f.canonical_lesson_id),
        (SELECT lo.metadata->'seasonTiming' FROM public.lessons lo WHERE lo.original_submission_id = f.submission_id)
      ) AS lesson_season
    FROM failing f
  )
  UPDATE public.submission_reviews sr
  SET tagged_metadata = jsonb_set(sr.tagged_metadata, '{season}', r.lesson_season)
  FROM resolved r WHERE sr.id = r.id;

  -- POST-condition: 0 string-typed season values remain (all 17 are now arrays).
  DO $$
  DECLARE n int;
  BEGIN
    SELECT count(*) INTO n FROM public.submission_reviews WHERE jsonb_typeof(tagged_metadata->'season')='string';
    IF n <> 0 THEN RAISE EXCEPTION 'C83 post-condition failed: % string-typed season values remain', n; END IF;
  END $$;
  ```
  (The scalar OUT-ref subquery ERRORs if a submission ever maps to >1 lesson — multi-resolution fails loud automatically; the pre-guard adds the 0-resolution / non-array cases. Discovery confirmed exactly-1 per row; the guards make it env-safe regardless.)
- **`.rollback`:** restore `lesson_submissions` from `wave4_c12_submissions_rollback` (`UPDATE … SET status/reviewer_notes/reviewed_at/updated_at = snapshot … FROM … WHERE id`). **Restore `updated_at` exactly (Codex C12-MED):** the `updated_at` trigger would re-stamp it on the rollback UPDATE, so wrap the restore in `ALTER TABLE public.lesson_submissions DISABLE TRIGGER trigger_lesson_submissions_updated_at; <UPDATE>; ALTER TABLE … ENABLE TRIGGER …;` (or `SET session_replication_role='replica'` for the statement). Restore `submission_reviews.tagged_metadata->'season'` from `wave4_c83_season_rollback` via `jsonb_set`. (Leave the snapshot tables in place — they're the recovery artifact; a future cleanup migration drops them once PROD-stable.)
- **GATE 2 (Codex, pre-TEST):** `/codex:adversarial-review --base main --scope branch "idempotency, env-independent C12 scope vs hardcoded 17, C83 OUT-ref join scalar-safety, jsonb_set writing array not string, snapshot-before-update ordering, post-condition asserts, rollback completeness"` — return findings INLINE. Triage + fix-up before push.
- **Local verify:** `supabase db reset && npm run test:rls` (RLS unchanged); `npm run check`.
- **TEST verify (after CI applies, via `mcp__supabase-test__execute_sql`):** 0 rows `status='submitted' AND created_at<'2026-05-01'`; 17 rows now `status='rejected'` with the two note texts; 0 string-typed season values; the 3 empty-source reviews now `[]`; both snapshot tables populated (17 + 17). **PROD verify after approval** (counts differ: 14 closed, season identical).
- **Commit:** `feat(wave4): close stale submissions + normalize review season values (C12, C83)`

---

## PR 2 — Ghost hard-delete + search-RPC cleanup (C11 + C49)

**Branch:** `chore/wave4-pr2-ghost-delete-rpc`.

**What ships:** the irreversible ghost-row delete (snapshot first, guarded) + the `search_lessons` recreate (remove the 3-ID exclusion + drop the dead `filter_lesson_format` param) + the C49 frontend cleanup. **Highest-risk PR — isolated.**

**Pre-flight:** invoke `database-migrations`; read design §4 Q8–Q10 + §5 PR2; **re-run the full Q8 pre-delete scan on TEST *and* PROD with verbatim IDs immediately before authoring** (don't trust the baseline); read `supabase/migrations/20260620000000_search_lessons_w1b.sql` in full (the recreate baseline).

### Task 2.1 — C49 frontend cleanup (first commit — deploy-safe, expand/contract step 1)
- **Files:** `src/hooks/useLessonSearch.ts` (delete lines `147-150`: the `filter_lesson_format: undefined` line **+ its 3-line `Task 1.3a` TODO**); regenerate `src/types/database.types.ts` (**never hand-edit**, per `src/types/CLAUDE.md`).
- **Types-regen ordering (Codex C49-LOW):** regen with **`npm run db:types` against the LOCAL reset DB AFTER Task 2.2's migration is applied locally** (`supabase db reset`). Do NOT use `db:types:remote` until the migration is confirmed on TEST/PROD — against a not-yet-migrated remote it would regenerate the stale 16-arg signature. So in practice: Task 2.1 deletes the frontend line first (deploy-safe); the types regen happens after Task 2.2's local apply, in the same PR.
- **Leave untouched:** `database.types.ts` `lesson_archive.lesson_format` column, the `_alias_lesson_format` RPC, `src/utils/__tests__/urlParams.test.ts` guard assertions.
- **Verify:** `npm run check`; `rg -n "filter_lesson_format" src/` returns only the (now-removed) hits / the regenerated types. Search smoke unaffected (`undefined` was already stripped at the wire).
- **Commit:** `refactor(wave4): drop dead filter_lesson_format frontend param (C49)`

### Task 2.2 — PR2 migration: snapshot + guarded DELETE + `search_lessons` recreate + `.rollback`
- **Create:** `/new-migration wave4_pr2_delete_ghosts_search_rpc` (timestamp strictly > PR1's).
- **(a) Snapshot** (BEFORE delete — see Q9):
  ```sql
  CREATE TABLE IF NOT EXISTS public.wave4_c11_ghost_rollback (LIKE public.lessons INCLUDING ALL);
  INSERT INTO public.wave4_c11_ghost_rollback
  SELECT * FROM public.lessons
  WHERE lesson_id IN ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd','1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU','1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8')
  ON CONFLICT DO NOTHING;

  -- SNAPSHOT-COMPLETENESS GUARD (Codex C11-HIGH): a pre-existing/partial snapshot table must NOT let the
  -- DELETE proceed against an incomplete rollback artifact. Assert the snapshot holds exactly the 3 target
  -- rows matching the ghost identity predicates BEFORE deleting anything.
  DO $$
  DECLARE n int;
  BEGIN
    SELECT count(*) INTO n FROM public.wave4_c11_ghost_rollback
    WHERE lesson_id IN ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd','1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU','1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8')
      AND title='Unknown'
      AND content_hash='238f211fc9915924a2c8c1a8772039846ea736f0d3af04fa403d875d668e83ef';
    IF n <> 3 THEN RAISE EXCEPTION 'C11 snapshot incomplete: % of 3 ghost rows captured — aborting before DELETE', n; END IF;
  END $$;
  ```
  (`LIKE … INCLUDING ALL` may carry constraints — if the snapshot insert fights a copied constraint, fall back to `INCLUDING DEFAULTS` or a plain column list. Verify on `supabase db reset` locally.)
- **(b) GUARDED DELETE** (see Q8 — match IDs AND identity predicates, assert exactly 3):
  ```sql
  DO $$
  DECLARE n int;
  BEGIN
    DELETE FROM public.lessons
    WHERE lesson_id IN ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd','1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU','1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8')
      AND title='Unknown'
      AND content_hash='238f211fc9915924a2c8c1a8772039846ea736f0d3af04fa403d875d668e83ef'
      AND retired_at IS NULL
      AND original_submission_id IS NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 3 THEN RAISE EXCEPTION 'C11 guarded delete matched % rows, expected 3 — aborting', n; END IF;
  END $$;
  ```
- **(c) `search_lessons` DROP+CREATE** from the `20260620000000_search_lessons_w1b.sql` baseline, with EXACTLY these diffs and nothing else:
  - Remove BOTH whole ghost-exclusion blocks (COUNT path lines `283-287`, RESULT path `376-380` — the full `AND l.lesson_id <> ALL (ARRAY[…]::text[])` construct + its comment, not just the ID literals).
  - Drop `filter_lesson_format` from the DROP arg-list (`:184`) and the CREATE signature (`:203`) → a 15-arg signature.
  - Preserve everything else verbatim (all other filter WHERE clauses, `_match_location`/location-Both, `order_by`, COALESCE metadata reconstruction, `retired_at` filter).
  - Re-emit `GRANT EXECUTE ON FUNCTION public.search_lessons(<15-arg type list>) TO anon, authenticated, service_role;` + `NOTIFY pgrst, 'reload schema';` (mirror `w1b:397-405`).
- **`.rollback`:** recreate the prior `search_lessons` (WITH the ghost exclusion + 16-arg `filter_lesson_format` param) from the w1b baseline, then **re-`GRANT EXECUTE` to `anon, authenticated, service_role` (the 16-arg type list) + `NOTIFY pgrst, 'reload schema'`** (Codex C11-HIGH — the rollback is itself a DROP+CREATE and loses grants / needs the cache reload, same as the forward recreate). Then `INSERT INTO public.lessons SELECT * FROM public.wave4_c11_ghost_rollback` (restores parent rows only — whole, given 0 CASCADE children). Keep the snapshot table.
- **GATE 2 (Codex):** `/codex:adversarial-review --base main --scope branch "guarded-delete predicate + assert-3, snapshot-before-delete + LIKE INCLUDING ALL pitfalls, search_lessons recreate completeness vs w1b (both exclusion blocks removed, 15-arg signature, all other filters intact), re-GRANT + NOTIFY pgrst, rollback recreates prior RPC + reinserts snapshot, expand/contract ordering for C49"` — return findings INLINE.
- **Local verify:** `supabase db reset && npm run test:rls`; `npm run check`; search smoke against local.
- **TEST verify (`mcp__supabase-test__execute_sql`):** the 3 ghosts gone (live-count **delta = −3**); `wave4_c11_ghost_rollback` has 3 rows; `search_lessons` returns expected results with no ghost IDs; location-Both + sort intact; re-run the Q8 ref-probe scan post-delete (all still 0, no dangling); existing search E2E green on the TEST preview. **PROD: re-run the full Q8 scan immediately before the approval apply; PROD verify after.**
- **Commit:** `feat(wave4): hard-delete 3 ghost rows + clean search_lessons RPC (C11, C49)`

---

## PR 3 — Local dev-seed refresh (C88)

**Branch:** `chore/wave4-pr3-dev-seed-refresh` (independent; land anytime). **No DB write, no PROD mutation, no migration.**

**Pre-flight:** read design §4 Q14 + §5 PR3; read `scripts/import-data.js:38,52,59-74` (the consumer's reverse mapping) + `scripts/lib/require-env.mjs`.

### Task 3.1 — Author a read-only PROD→seed generator + regenerate the seed
- **File:** new `scripts/export-dev-seed.mjs` (mirror the conventions of `scripts/import-data.js`). It connects to **PROD read-only** (PROD URL + the publishable/anon key — `lessons` is publicly readable under RLS; **no service key, no writes**), `SELECT`s live rows (`retired_at IS NULL`, ~745), and writes `data/consolidated_lessons.json`.
- **Output shape — pin field-by-field to what `import-data.js:59-74` ACTUALLY reads (Codex C88-MED).** The importer consumes ONLY: `lessonId`→`lesson_id`, `lessonTitle`→`title`, `lessonSummary`→`summary`, `fileLink`→`file_link`, `metadata`→`metadata` (as-is), `confidence`→`confidence`, and **singular `metadata.gradeLevel`→`grade_levels`**. It **ignores** `lastModified`, `flaggedForReview`, `reviewNotes`, `processingNotes` (emit them only for shape-fidelity; they don't import). **The trap:** the current schema/metadata uses **`gradeLevels` (plural)**, but the importer reads **`metadata.gradeLevel` (singular)** — emit metadata as-is and `grade_levels` imports as NULL on every row.
- **Reconcile the gradeLevel key (lock one):** RECOMMENDED — **modernize `import-data.js` to read `metadata.gradeLevels ?? metadata.gradeLevel`** in the same PR (tolerate both; the plural is the current truth) AND have the generator emit current metadata (with `gradeLevels`). Alternative — generator emits a legacy-exact `metadata.gradeLevel = row.grade_levels` and leaves the importer untouched. Either works; the round-trip test below is the gate that proves it.
- **Verify (round-trip — the real gate):** regenerate the seed; `rg -c "lessonFormat" data/consolidated_lessons.json` → 0 (was 1662); row count ~745 (was 831); the file parses; run `import-data.js` against a LOCAL/TEST target (`requireNonProd`-guarded) and **confirm rows import with non-NULL `grade_levels`** (not just non-zero rows — assert the grade mapping survived); `npm run dev` loads + `npm run build`.
- **Commit:** `chore(wave4): refresh local dev seed from PROD-live corpus (C88)`

---

## Test plan

### Unit / Integration
- C83: the Zod fixture (Task 1.1) asserts the post-backfill `season` values — backfilled arrays AND the 3 `[]` fallbacks — parse against `z.array(SeasonTimingEnum)`, no string-typed value remains.
- C49: `npm run check` clean after the frontend line removal + types regen.

### E2E
- PR2: existing search E2E must stay green on the TEST deploy preview (RPC recreate); manual search smoke (no "Unknown" rows, location-Both + sort intact, live count delta −3).

### RLS
- No RLS changes expected. `npm run test:rls` must pass unchanged after each migration.

### Manual smoke (per `superpowers:verification-before-completion`)
- PR1: reviewer queue no longer shows the closed submissions as actionable; TEST shows 17 closed + the two note texts, 0 string-typed season values, the 3 fallbacks `[]`, both snapshot tables populated.
- PR2: 3 ghosts gone (delta −3), snapshot table populated, search live count −3, no dangling refs (re-run Q8 probes post-delete), location-Both + sort intact.
- PR3: regenerated seed has 0 `lessonFormat`, ~745 rows, round-trips `import-data.js`; `npm run dev` loads.
