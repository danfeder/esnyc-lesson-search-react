# Wave 4 — Data / Corpus Cleanup — Design Document

**Date:** 2026-06-22
**Status:** Draft — strategy locked, per-item mechanism questions open (see §4 "Open design questions"); Session 1 locks them before any code.
**Related:** `docs/plans/2026-06-20-deferred-work-roadmap.md` (Wave 4 §, source of scope) · `docs/plans/2026-06-21-deferred-campaign-status.md` (master tracker) · memory `reference_data_mutation_gotchas`, `project_imported_non_esynyc_drops`, `project_metadata_cleanup_candidates`, `project_metadata_rebuild_initiative`

---

## 1. Why this exists

Wave 4 is the data/corpus-cleanup wave of the deferred-work campaign. Waves 1–3 shipped public-UX fixes, email/security P1s, and repo/docs hygiene. Wave 4 is **the first wave that mutates real lesson-corpus data** — so data safety, not velocity, is the defining constraint (`feedback_data_safety_top_priority`). Everything here goes through the 3-tier pipeline (local → TEST → PROD-with-manual-approval), snapshot-before-mutate, with reversibility ordered first.

The corpus carries a handful of small, distinct cleanup debts left behind by the metadata-rebuild and submission-pipeline work. Grounded against **TEST DB** 2026-06-22 (read-only):

- **766 lesson rows** — 745 live (`retired_at IS NULL`), 21 retired. The 21 retired rows are exactly the non-ESYNYC curriculum imports soft-deleted by PR #478 (`supabase/migrations/20260520000000_corpus_cleanup_retire_imports.sql`, `retired_at = 2026-05-08`).
- **3 ghost "Unknown" rows** still live (`retired_at IS NULL`): `1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd`, `1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU`, `1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8` — `title='Unknown'`, sharing one fabricated `content_hash` (`238f211f…`). Hidden from public search only by a **hardcoded 3-ID exclusion list inside the `search_lessons` RPC** (the W1b band-aid, PR3a `3c592b1`), not retired.
- **17 stuck submissions** in `lesson_submissions` (`status='submitted'`): 15 `new` (oldest 2025-07-23 ≈ 11 months) + 2 `update` (both 2026-04-28, the orphan-recovery artifacts).
- **17 zod-failing season values** in `submission_reviews.tagged_metadata->'season'` (GATE-A-grounded on TEST 2026-06-22): all 113 review rows carry the `season` key; 96 are arrays (pass), **17 are string-typed and fail** the Zod `seasonTiming: z.array(SeasonTimingEnum)` schema (`SeasonTimingEnum = ['Fall','Winter','Spring','Summer']`): `year-round`×13, `end-of-year`×2, `winter`×2. The published `lessons.metadata.seasonTiming` is **766/766 clean arrays** — so this is **reviews-only validation hygiene, no live-lesson impact** (source: roadmap C83 line + the metadata-rebuild source doc — NOT `project_metadata_cleanup_candidates`, which doesn't cover seasonTiming).

None of these are blocking; all are small. The wave's job is to clear them carefully without breaking user state, search, or FK integrity.

## 2. Constraints (the bar every item must clear)

1. **Data safety supersedes velocity.** No PROD mutation without explicit user go. TEST-DB MCP verify before merge; PROD MCP verify after the manual approval gate (CI's own verify step flakes — MCP is source of truth, `reference_ci_flakes`).
2. **Snapshot before mutate.** Every destructive or bulk change writes a rollback artifact first (forward-rollback migration and/or a snapshot/archive table), idempotent, ready before merge.
3. **Reversibility-first ordering.** Reversible status/normalization changes ship first; the single irreversible hard-delete is isolated in its own PR; the bulk metadata rewrite is isolated in its own PR.
4. **Blast-radius isolation.** One concern per PR. The irreversible delete and the corpus-wide metadata update never share a PR with anything else.
5. **No silent search/filter regressions.** Any `search_lessons` RPC edit re-verified end-to-end on TEST (and the additive/removed-param deploy-ordering rule, `reference_ci_flakes`, respected).

## 3. The chosen shape: isolated-blast-radius PRs, lowest-risk-first

Four PRs, ordered by ascending risk. Reversible bundle → irreversible delete (isolated) → bulk metadata rewrite (isolated) → a no-DB repo-file refresh.

| # | PR | Items | Risk | Reversibility |
|---|-----|-------|------|---------------|
| 1 | Reversible data cleanups | C12, C83, C08 | low | fully reversible (status flip / value normalize / soft-delete) |
| 2 | Ghost-row hard-delete + search-RPC cleanup | C11 (+ C49 folded) | **highest** | irreversible delete (snapshot-archived first); RPC change git-revertable |
| 3 | Vocabulary canonicalization | C02 | medium | reversible (metadata snapshot table) |
| 4 | Local dev-seed refresh | C88 | none (no DB, no PROD) | git revert |

### Why this shape over the alternatives

| Option | Why rejected |
|---|---|
| **One big "corpus cleanup" migration** (all items in one PR) | Concentrates an irreversible hard-delete + a corpus-wide metadata rewrite + status flips in one blast radius. A single bad section forces a full rollback of unrelated good work. Violates Constraint 4. |
| **Data-only via MCP `execute_sql`** (CLAUDE.md allows it for "data" changes) | Loses the rollback artifact, the TEST→PROD-approval gate, the migration-file audit trail, and idempotent re-runnability. PR #478 set the precedent that *bulk* corpus data changes go through **migration files** (with `.rollback`), even though they're "data". We follow that. |
| **Defer C11 hard-delete to soft-delete** | Considered and rejected by user verdict 2026-06-22: the 3 ghosts are fabricated error-skeletons (shared fake hash), not real lessons — hard-delete is correct, and it lets us *remove* the hardcoded RPC exclusion rather than convert it. |

**Scope provenance (so a future reader doesn't read a silent scope add):** C11/C12/C08/C02/C01/C09 come from the roadmap's Wave-4 § + master tracker. C49/C83/C88 are pulled from the roadmap's per-item detail table (lines 156/158/160) **plus the user's locked-scope decision 2026-06-22** ("Core 5 + tiny extras"). The user's locked scope is the binding authority: PR1 = C12/C83/C08, PR2 = C11 (hard-delete) + C49, PR3 = C02, PR4 = C88; deferred = C01, C09/C07/C03.

## 4. Open design questions — TO LOCK IN SESSION 1

Strategy (scope, ordering, hard-delete, PR grouping, data-safety protocol) is **locked** — do not re-debate. What's open is per-item *mechanism*, which needs discovery against current code/data. Session 1 works this list in order, writes a locked answer + one-line rationale under each, flips Status to Locked, then authors the impl plan's concrete tasks. Respect the tags.

**PR 1 — C12 (stuck submissions):**
1. **Target end-state for the 17 rows: `status='rejected'` vs a distinct stale/archived value + the exact reason-note text/field.** `[user-verdict]` — GATE-A-grounded: the note column is **`reviewer_notes`** (text) — there is no `review_notes`/`notes` column; the status CHECK is `status = ANY(['submitted','in_review','needs_revision','approved','rejected'])` so `'rejected'` is valid. Default leaning: `status='rejected'` + a `reviewer_notes` note like "Auto-closed: stale submission (>N months, never reviewed)". <!-- TBD Session 1 -->
2. **Does flipping status to rejected trigger any side effect (email, trigger, FK cascade)?** `[evidence-lockable]` — verify on TEST: rejection-email/Phase-8a UI is unbuilt and Resend is unconfigured, so expectation is "no email fires", but confirm no trigger/edge path sends one before bulk-applying. <!-- TBD Session 1 -->
3. **Do the 2 `update`-type stuck rows (orphan-recovery artifacts) get the same treatment or a different note?** `[evidence-lockable]` — default: same flip, note them as orphan-recovery artifacts. <!-- TBD Session 1 -->

**PR 1 — C83 (seasonTiming):**
4. **Normalization for the 17 failing `submission_reviews.tagged_metadata->'season'` string values.** Mechanism `[evidence-lockable]`; the semantic mapping `[user-verdict]` — GATE-A-grounded (TEST): the failing values are `year-round`×13, `end-of-year`×2, `winter`×2. `winter`→`['Winter']` is a trivial string→array + case cast, but **`year-round` and `end-of-year` are NOT in the canonical enum** → mapping them is a curriculum-semantics call. **Cleanest mechanism to evaluate first:** backfill each failing review's `season` from its already-approved lesson's clean `seasonTiming` array (avoids inventing a mapping). Note the Zod key is `seasonTiming` but the stored review key is `season` (renamed downstream in `reviewToLessonMapper.ts`). Re-verify count at lock. <!-- TBD Session 1 -->
5. **Companion `lessons.metadata.seasonTiming` asymmetry — in scope?** `[evidence-lockable]` — GATE-A-grounded: `lessons.metadata.seasonTiming` is **766/766 clean arrays, 0 non-canonical** on TEST → no companion work needed; C83 is confirmed reviews-only. (Prior drift-repair migrations `20260511120000` / `20260520120000_season_timing_drift_repair` already cleaned the lessons side.) Confirm at lock. <!-- TBD Session 1 -->

**PR 1 — C08 (last imports):**
6. **Which lessons are still live (`retired_at IS NULL`) and match the non-ESYNYC drop signature, beyond the 21 already retired?** `[evidence-lockable]` — re-run the drop-signature sweep (`project_imported_non_esynyc_drops` §"Drop signature") against current live rows; memory expects ~2 (a stub + 1 one-off whose IDs weren't captured). <!-- TBD Session 1 -->
7. **Retire-or-keep verdict on each straggler found.** `[user-verdict]` — present the candidates + evidence; user confirms each before `retired_at` is set (same soft-delete pattern as PR #478). <!-- TBD Session 1 -->

**PR 2 — C11 (ghost hard-delete) + C49:**
8. **Pre-delete reference scan for the 3 ghost IDs — SPLIT BY ENFORCEMENT** (GATE A's key correction: an unenforced text ref does NOT block a `DELETE`, so "zero refs" must be *data-queried*, never inferred from FK-absence). `[evidence-lockable]` (escalate `[user-verdict]` if any ref found). GATE-A-grounded all-clear on TEST for the 3 ghosts; **re-run on PROD with verbatim IDs** (`feedback_verbatim_identifiers_in_probes`):
   - **(a) Enforced FKs to `lessons` (6) — `DELETE` blocks/cascades on these:** `bookmarks.lesson_id`(CASCADE), `canonical_lessons.canonical_id`(NO ACTION), `canonical_lessons.duplicate_id`(CASCADE), `duplicate_resolutions.canonical_lesson_id`(NO ACTION), `lesson_archive.canonical_id`(SET NULL), `lesson_submissions.original_lesson_id`(SET NULL). **The IN-ref FK column is `lesson_submissions.original_lesson_id`** (NOT `lesson_id`).
   - **(b) UNENFORCED text/text[] refs — `DELETE` SUCCEEDS silently, leaving a dangling ref → each MUST be data-queried:** `lesson_versions.lesson_id`(text), `lesson_archive.lesson_id`(text, distinct from its `canonical_id` FK), `submission_similarities.lesson_id`(text), `submission_reviews(+_archive).canonical_lesson_id`(text), `lesson_collections.lesson_ids[]`(text[], user collections — probe with array-overlap `&&`), `duplicate_group_dismissals.lesson_ids[]`(text[], `&&`).
   - **OUT-ref (Phase-6.2 gotcha):** `lessons.original_submission_id` — verified NULL on all 3 ghosts (doesn't bite here), keep the check belt-and-braces.
   - **CASCADE-child precondition:** the 2 CASCADE FKs (`bookmarks.lesson_id`, `canonical_lessons.duplicate_id`) verified 0 child rows for the 3 ghosts → a parent-row `.rollback` is whole. If any CASCADE child appears on PROD, escalate `[user-verdict]` (rollback can't restore cascade-deleted children).
   - **GUARDED DELETE (Codex):** the migration `DELETE` must match the 3 IDs **AND** identity predicates — `title='Unknown'`, the shared fabricated `content_hash` (`238f211f…`), `retired_at IS NULL`, `original_submission_id IS NULL` — and **assert exactly 3 rows matched/deleted, failing loudly otherwise** (guards against a row having been repaired, or differing TEST↔PROD). <!-- TBD Session 1 -->
9. **Snapshot mechanism before delete.** `[evidence-lockable]` — default leaning (revised per GATE A): a **dedicated single-purpose rollback table** with a full `SELECT *` of the 3 rows, created by the migration, is the safer default. `lesson_versions` is feasible (it has no FK back to `lessons`) but requires computing its NOT-NULL `version_number` and pollutes the forensic-version stream with synthetic rows. Insert the snapshot BEFORE the `DELETE`. <!-- TBD Session 1 -->
10. **C49 — drop the dead `filter_lesson_format` param.** `[evidence-lockable]` — GATE-A-grounded: a caller DOES reference it (`src/hooks/useLessonSearch.ts:150` sends `filter_lesson_format: undefined`; `src/types/database.types.ts:1444` types it), **BUT `JSON.stringify` strips `undefined`-valued keys so PostgREST never receives the arg** (verified on TEST: omitting the param returns rows; the W1b RPC already removed its WHERE clause — inert-but-present). So the RPC param drop is **safe to fold into PR2's `DROP+CREATE`**, and C49 should ALSO delete the now-dead `useLessonSearch.ts:150` line + regenerate `database.types.ts` (so the §7 grep comes back truly clean). The reverse-PGRST202 split is only needed if a caller sent a *real* value — not the case here. **Stale-client note (Codex):** dropping the param would PGRST202 any caller that still sends a real value; none do today (lesson_format UI long removed, param inert since W1b), so the only exposure is a stale browser tab → one failed search until refresh. **Recommended default = expand/contract:** drop the frontend line + regen types FIRST (deploy), THEN drop the RPC param in PR2 (or a follow-up), per `reference_ci_flakes`. Lock the ordering in Session 1. <!-- TBD Session 1 -->

**PR 3 — C02 (vocab canonicalization):**
11. **Locked vocab + messy→canonical mapping + WHICH SURFACE IS CANONICAL (typed `text[]` columns vs `metadata` JSONB).** `[evidence-lockable]` (canonical-surface choice may be `[user-verdict]`) — load the worksheet (commit `93b929e` = `...cooking-skills-ingredients-worksheet-decided.md`: ~23 cooking skills, two-level main ingredients); confirm both fields; derive the mapping. **GATE-A/Codex: the fields are dual-represented (`text[]` columns + JSONB) AND feed `search_vector`, and the surfaces are out of sync today (430 vs 709 / 425 vs 709) — lock the canonical surface + reconciliation BEFORE authoring SQL.** <!-- TBD Session 1 -->
12. **Rollback-snapshot shape + UPDATE scope — covering BOTH surfaces.** `[evidence-lockable]` — snapshot the affected rows' typed columns AND `metadata` keys into a migration-created rollback table; UPDATE both atomically + refresh `search_vector`; scope `retired_at IS NULL` and exclude the 3 ghost IDs (PR2/PR3 overlap insurance); UPDATE only rows whose values change. <!-- TBD Session 1 -->
13. **Scope: one PR or split — AND does C02's true size (dual-write + `search_vector` + the 430/709 sync gap + reviewer-entry surface) still fit Wave 4 as one PR, or warrant its own session?** `[user-verdict]` — default leaning: keep in Wave 4 if the mapping is mechanical; but GATE A revealed C02 is bigger than filed → re-confirm scope with the user at lock time. <!-- TBD Session 1 -->
14a. **(C02 reviewer-entry) Does the reviewer-entry surface already use the decided vocab, or must C02 update it too?** `[evidence-lockable]` (current state) + `[user-verdict]` (fold-in vs defer) — GATE-A/Codex: `cookingSkills`/`mainIngredients` are reviewer `METADATA_CONFIGS` (`filterDefinitions.ts:271`/`:174`) + have a Zod schema. If the dropdown options + Zod still hold OLD vocab, a data-only canonicalization gets re-polluted as reviewers save → check whether UI/Zod already use the `93b929e` vocab; if not, fold the UI+Zod update into PR3 or name it an explicit follow-up with risk accepted. <!-- TBD Session 1 -->

**PR 4 — C88 (dev seed):**
14. **Source + field set for the `data/consolidated_lessons.json` re-export (PROD vs TEST; which fields; post-retirement corpus or full).** `[user-verdict]` — default leaning: re-export from PROD live rows (excludes retired), include current schema fields; it's local-dev seed only, never touches PROD/DB. <!-- TBD Session 1 -->

## 5. Per-PR data changes (scope + hazards)

### PR 1 — Reversible data cleanups (C12 + C83 + C08)
- **What changes:** 17 `lesson_submissions.status` flips (C12); ~17 `submission_reviews` seasonTiming value normalizations (C83); `retired_at` set on the ~2 import stragglers (C08).
- **Hazards:** all low. C12 — verify no email side-effect (Q2). C83 — normalize on already-approved rows; cosmetic/validation only. C08 — soft-delete, reversible by nulling `retired_at`.
- **Mechanism:** one migration file + `.rollback`. (If the three sub-changes read more cleanly as separate sequential statements within one migration, keep them sectioned + individually reversible.)

### PR 2 — Ghost-row hard-delete + search-RPC cleanup (C11 + C49)
- **What changes:** snapshot 3 ghost rows → `DELETE FROM lessons WHERE lesson_id IN (…3…)`; `DROP+CREATE search_lessons` to (a) remove the hardcoded 3-ID exclusion and (b) drop the dead `filter_lesson_format` param (C49, gated on Q10).
- **Hazards:** **highest in the wave.** Irreversible delete → split-by-enforcement reference scan IN+OUT (Q8) on TEST *and* PROD with verbatim IDs, snapshot first (Q9). RPC signature change → reverse-PGRST202 ordering (Q10); after `DROP+CREATE` re-grant `EXECUTE` to `anon, authenticated, service_role` **and emit `NOTIFY pgrst, 'reload schema'`** (the W1b migration `20260620000000_search_lessons_w1b.sql:397-405` did both — mirror it, including the cache reload). Re-verify search end-to-end on TEST (live count, location-Both, sort) so the RPC recreate didn't regress W1b behavior. **The `DELETE` is guarded** (Q8: identity predicates + exactly-3 assertion, fail otherwise).
- **Mechanism:** one migration (snapshot + delete + RPC recreate) + `.rollback`. The `.rollback` recreates the prior RPC and re-INSERTs the snapshot — but it restores the **parent `lessons` row only**; this relies on the Q8-verified precondition that the 3 ghosts have zero CASCADE-child rows (re-confirm on PROD). Deleted rows are recoverable **only** from the snapshot — call that out.

### PR 3 — Vocabulary canonicalization (C02)
- **What changes:** canonicalize `cooking_skills` / `main_ingredients` to the locked vocab — **a DUAL-WRITE, not metadata-only** (GATE-A/Codex catch): these are typed `text[]` columns on `lessons` (`cooking_skills` / `main_ingredients`) **AND** `metadata.cookingSkills` / `metadata.mainIngredients` JSONB keys, AND the typed columns feed `search_vector` (the SEL trigger, `20260618000000_search_vector_add_sel.sql:62,67`).
- **Hazards:** medium-**high** (revised UP from "metadata-only"). The two surfaces are **already out of sync on TEST** — `cooking_skills` column non-empty on 430 rows vs `metadata.cookingSkills` key on 709 (`main_ingredients` 425 vs 709) — so Session 1 must lock which surface is canonical + the reconciliation strategy before writing SQL. Not sidebar facets (`filterDefinitions.ts:271`/`:174` are `METADATA_CONFIGS`, "NOT search filters") → no sidebar regression, **but** the reviewer-entry surface + `search_vector` ARE affected (Q15 + re-verify search).
- **Mechanism:** one migration + rollback table snapshotting **both** surfaces; UPDATE both atomically; refresh `search_vector` on touched rows; scope to `retired_at IS NULL` excluding the 3 ghost IDs. Verify column distribution + JSONB-mirror distribution + search behavior on TEST (+ PROD after approval). Reuse the rebuild canonicalization machinery (vocab-locked).

### PR 4 — Local dev-seed refresh (C88)
- **What changes:** regenerate `data/consolidated_lessons.json`.
- **Hazards:** none — repo file, local-dev seed only; never read by PROD or the deployed app. No migration, no PROD approval.

## 6. Migration / shipping strategy

**PR breakdown:** see §3 table. Order: PR1 → PR2 → PR3; PR4 anytime (independent, no DB).

**Migration naming (every Wave-4 migration):** use the full `YYYYMMDDHHMMSS_` prefix with a timestamp strictly greater than the latest existing (`20260621000000`); if two Wave-4 migrations land the same calendar day, give them distinct `HHMMSS` so file-sort == apply-order (the ASCII gotcha: digit < underscore, so `YYYYMMDDHHMMSS_x` sorts before a bare `YYYYMMDD_x`). Use the `/new-migration` skill (it enforces this) + the `database-migrations` skill before editing any migration file.

### Gap risk between PRs
Mostly independent — PR1/PR3 reversible, PR2 isolated + snapshot-protected — **with one coupling:** PR2 (delete the 3 ghosts) and PR3 (C02 metadata UPDATE) share those 3 rows (the ghosts carry `cookingSkills`/`mainIngredients` keys). So either **PR2 must precede PR3**, or C02's UPDATE must scope to `retired_at IS NULL` and exclude the 3 ghost IDs (cheap insurance, order-independent — preferred). No dangerous state either way (a wasted update of 3 doomed rows is harmless).

### TEST DB rehearsal (per `feedback_per_round_test_db_verification`)
- **PR 1:** apply to TEST; verify 17 submissions flipped + note set; ~17 seasonTiming rows now pass the Zod shape; straggler imports show `retired_at` set. Re-verify after every fix-up round.
- **PR 2:** apply to TEST; verify the 3 rows gone (`count=0`), snapshot archive populated, `search_lessons` returns expected live count with no ghost IDs, location-Both + sort still correct, FK integrity intact. **Then PROD MCP verify after approval.**
- **PR 3:** apply to TEST; verify value distribution matches the locked vocab; rollback table populated; spot-check sample rows.
- **PR 4:** no DB — local `npm run dev` smoke + build.

### Rollback paths
- **PR 1:** `.rollback` migration restores `status='submitted'` for the 17 IDs, reverts seasonTiming values, nulls `retired_at` on the stragglers.
- **PR 2:** `.rollback` recreates the prior `search_lessons` (with exclusion + param) and re-INSERTs from the snapshot — restoring the **parent `lessons` rows only** (whole, given the Q8-verified zero-CASCADE-child precondition). Deleted rows are recoverable **only** from the snapshot — this is why the snapshot is mandatory before delete.
- **PR 3:** `.rollback` restores `metadata` from the snapshot table.
- **PR 4:** `git revert`.

### Per-PR ritual
Per `feedback_pr_bot_review_workflow` + the kickoff PER-PR RITUAL: pre-push code-reviewer agent **+ GATE 3 Codex** (parallel, different family) → baseline checks → push + `gh pr create` → wait for external bots → four-surface triage (`feedback_pr_comment_surfaces`) → rebuttal-pass every finding + **GATE 4 Codex** on real suggested changes → consolidated fix-ups → per-round TEST re-verify → round-cap after 2. **GATE 2 Codex** on every migration SQL before TEST apply.

### Known issues / pre-existing flakes
`migrate-production.yml` SASL apply/verify flake → PROD MCP verification mandatory + rerun. esm.sh 522 flake. See `reference_ci_flakes` before any PROD migration.

## 7. Testing strategy

### Unit / Integration
- C83: if a shared Zod schema validates seasonTiming, add a fixture asserting the normalized values now parse.
- C49: the grep WILL find the inert `filter_lesson_format: undefined` at `useLessonSearch.ts:150` — that's harmless (`JSON.stringify` strips undefined keys so PostgREST never sees it), but the C49 PR should delete that line + regen `database.types.ts` so the grep returns truly clean.

### E2E
- No new E2E. PR2's `search_lessons` recreate is covered by re-running the existing search E2E against the TEST deploy preview (must stay green) + manual search smoke.

### RLS
- No RLS changes expected. `npm run test:rls` must pass unchanged after each migration.

### Manual smoke (per `superpowers:verification-before-completion`)
- PR2: public search returns results, no "Unknown" rows surface, location-Both + sort behave, count drops by exactly 3.
- PR1: reviewer queue no longer shows the 17 stuck submissions as actionable.

## 8. Out of scope (captured for future work)

- **C01 — full-corpus embeddings regeneration** (L). Blocked on fixing the embedding-pipeline bugs (C89/C87) + the `lesson_submissions`-vs-`lessons` vector-space mismatch (C07). Own session.
- **C09 / C07 / C03 — dedup-pipeline rework** (L, feature-scale: sibling-variant "third state", series handling, parser title-case). ~Wave 5.
- **The 21 already-retired imports stay soft-deleted** — no hard-delete of them this wave (only the 3 ghost rows are hard-deleted, by user verdict). Revisit only if a future archival policy calls for it.
- **C65** (Seed Bursts near-dup pair) — observation feeding the dedup track; stays with C09.
- **C67** (guyanese/cuban heritage dual-membership) — a curriculum/UX decision, not buildable cleanup; stays parked.
- **C117** (schools soft-delete) — a hardening feature, not corpus cleanup; defer.
- **C36** (clearing concepts via reviewer UI) — design-flag only; surfaces if a concepts-editor UI is ever built (`reference_data_mutation_gotchas` "clearing concepts").
- **Wave-3 edge-CI follow-ups** (C33 composite-action extraction; poll-budget bump) — route to a future edge-CI track, NOT Wave 4.

## 9. References

- `docs/plans/2026-06-20-deferred-work-roadmap.md` — Wave 4 §, item table (C11/C12/C08/C02/C49/C88 + deferred C01/C09/C07/C03)
- `docs/plans/2026-06-21-deferred-campaign-status.md` — master cross-wave tracker
- memory `reference_data_mutation_gotchas` — pre-delete FK checklist (IN + OUT), facetCounts, concepts-clearing
- memory `project_imported_non_esynyc_drops` — drop signature + the 23-import list (21 retired)
- memory `project_metadata_cleanup_candidates` — the 3 ghost rows + 14 (now 17) stuck submissions + seasonTiming
- memory `project_metadata_rebuild_initiative` — the canonicalization pipeline C02 reuses; PR #478 corpus_cleanup precedent
- memory `reference_ci_flakes` — SASL flake, additive/removed-RPC-param deploy ordering, 3-signal edge verify
- `feedback_data_safety_top_priority`, `feedback_per_round_test_db_verification`, `feedback_pr_bot_review_workflow`, `feedback_bot_review_investigation`, `feedback_codex_over_crossexamine`
