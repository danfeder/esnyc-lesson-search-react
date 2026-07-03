# Shelf Audit — Simplification Plan Re-Verification

**Date:** 2026-07-03 · **Re-verifies:** `~/cCode/pr6-overnight-2026-06-12/overnight-review/simplification-groundwork.md` (written 2026-06-12 @ `d693e19`)
**Current tree:** `main` @ `777ab8e` (post T4b/T4c/T5b)
**Method:** every original finding (F1–F15) re-checked against the working tree with fresh file:line evidence; two read-only PROD probes (SELECT-only) settled the data-shape questions. No code or data was changed.

---

## Plain-language summary

The June 12 plan listed 15 clean-up ideas. Three weeks of shipping since then already did the biggest ones for free: the giant review page was split into small tested pieces, the old duplicate-admin pages were deleted, and the review workflow got a real test suite. Several other items turned out to be already fixed a different way, or no longer worth doing because only ~3 staff accounts ever see those screens.

What's genuinely left is housekeeping, not product work — and none of it should happen before launch:

1. **The retired "embeddings" machinery is still plugged in.** The site stopped using AI-embedding duplicate detection in July, but two server functions for it still exist, a daily automated test still pays OpenAI a tiny amount every day to test one of them, and an unused database function is left behind. One deliberate sweep can unplug all of it. *(the one item with a small ongoing cost)*
2. **The `scripts/` folder is still an attic** — 75 files including three generations of old duplicate-analysis tools and 9 orphan SQL files nothing references. Moving dead ones to the existing `archive/` folder makes it safer for future sessions.
3. **A handful of now-dead code files** (5 unused UI components from the deleted duplicate pages, 3 unused helper functions, one dead schema branch) can simply be deleted — the safest kind of cleanup, verified with searches and a live database check.

Everything else on the old plan is either done, superseded, or recommended **won't-do** (splitting a config file, restructuring lightly-used admin pages — more churn than benefit for 3 internal users).

---

## Scoreboard

| Old # | Was | Now | Verdict |
|---|---|---|---|
| F1 | P1 ReviewDetail 1,451-line monolith | ReviewDetail.tsx = 508 lines, decomposed + tested | ✅ **DONE** (W5 #552–555 + T4b) |
| F2 | P1 academicIntegration union ×3 sites | Union remains, but object branch is **corpus-dead** (PROD probe: 0 rows) | 🔁 **EVOLVED** — delete dead branch (P3/S) |
| F3 | P1 admin-page state-machine duplication | 2 of 6 pages deleted (T4b); rest unchanged; audience ≈3 accounts | ⬇️ **DOWNGRADED** to opportunistic P3 |
| F4 | P1 scripts/ archaeology | Still true, now 75 entries; embedding scripts newly moot | ✔️ **STILL VALID** — biggest live item (P2/S–M) |
| F5 | P2 CORS consolidation | 3 (not 4) re-implementations; 3 (not 4) wildcards; 2 functions deleted since | ✔️ STILL VALID, smaller (P3/S) |
| F6 | P2 filterDefinitions split (post-PR-E) | Gate cleared, but file shrank 408→302 lines | ❌ **WON'T-DO** (churn > benefit) |
| F7 | P2 zero page tests | Review + search surfaces now heavily tested; dup service deleted | ✅ **DONE** (residual: admin pages, accept) |
| F8 | P2 pin Supabase CLI `version: latest` | Root cause fixed differently (`github-token`, PR #529); 8 occurrences remain | 🔀 **SUPERSEDED** (optional P3) |
| F9 | P2 workflows.backup/ cleanup | Unchanged: 13 files, no README | ✔️ STILL VALID (P3/S) |
| F10 | P3 privatize IntLessonDetail | IntLessonDetail is alive; but **5 other Int\* components died with T4b** | 🔁 **EVOLVED** — delete 5 dead components (P3/S) |
| F11 | P3 filterUtils maps drift | Maps don't drift — 3 of 4 functions are **dead** (test-only) | 🔁 **EVOLVED** — delete dead functions (P3/S) |
| F12 | P3 dep hygiene | All still present (all devDeps); openai/tiktoken now retirement-adjacent | ✔️ STILL VALID (P3/S) |
| F13 | P3 duplicate_pairs table deprecation | Table already GONE from PROD; orphan `find_duplicate_pairs()` fn remains | 🔁 MOSTLY RESOLVED — drop orphan fn (P3/S) |
| F14 | P3 migration re-baseline | Gate cleared; count grew 66→86 active files | ✔️ STILL VALID, post-launch session (P3/M) |
| F15 | P3 tsconfig/ESLint scripts policy | Constraint expired; policy now documented in `eslint.config.js:19-30` | ✅ **CLOSED** (no action) |
| **N1** | — | **Retired embedding pipeline still has live surfaces** (edge fns + daily paid smoke + DB fn) | 🆕 **NEW** (P2/M) |

None of the live items is launch-blocking. All are post-launch housekeeping.

---

## What's actually worth doing (ranked)

1. **N1 — embedding retirement sweep** (P2/M) — the only item with an ongoing external cost/secret surface.
2. **F4 — scripts/ archive sweep** (P2/S–M) — folds in the embedding scripts from N1.
3. **Dead-code deletions: F10 + F11 + F2 + F13** (each P3/S, all high-confidence) — bundle into one "post-T4b dead code" PR.
4. **F9 + F12** (P3/S) — trivial riders on any of the above.
5. **F14 re-baseline** (P3/M) — its own session, post-launch, using the `/baseline-db` skill.
6. **F5 CORS** (P3/S) — only after N1 decides the fate of the wildcard functions.

Recommended **won't-do**: F6 (file split), F3-as-a-wave (hook extraction across admin pages), F8 (CLI pinning).

---

## Detail per finding

### F1 — ReviewDetail monolith → DONE ✅

- `src/pages/ReviewDetail.tsx` is now **508 lines** (was 1,451). Extracted since June 12 (W5 PRs #552–#555, then T4b #578):
  - `src/components/Review/ReviewMetadataForm.tsx` (399 lines), `ReviewDecisionPanel.tsx` (433), plus `ReviewActions/ReviewContent/ReviewDocPanel/ReviewSearchPanel/SubmitterIntentBanner/TitleMismatchWarning`.
  - `src/pages/useReviewSubmission.ts` (486 lines) — submission state machine.
  - Pure helpers with unit tests: `src/pages/reviewDetailHelpers.ts/.test.ts`, `reviewValidation.ts/.test.ts`, `buildCandidateCards.ts/.test.ts`, `reviewMetadataInit`, `reviewMismatch`, `reviewPreselect`.
- The exact three-way extraction the plan proposed happened, essentially as designed.
- **Verdict: closed. No follow-up.** Confidence: high.

### F2 — academicIntegration union → EVOLVED (dead-branch deletion, P3 / S / confidence: high)

Still present at all the predicted sites, with updated pointers:

- Union schema: `src/types/lessonMetadata.zod.ts:372-380` (`academicIntegrationObjectSchema` + `z.union`), used at `:402` with the comment *"array branch closed PR 6e; object branch preserved"*.
- Edge mirror: `supabase/functions/_shared/metadataSchemas.ts:324`.
- Consumer branches: `src/utils/lessonToReviewMapper.ts:72-84` (object path at `:79-84`), `src/utils/facetCounts.ts:75-80` (object path at `:78-79`).

**What changed:** the reason to preserve the object branch is gone. Read-only PROD probe (2026-07-03):

```sql
-- lessons: jsonb_typeof(metadata->'academicIntegration')
-- object = 0, array = 785, total lessons = 785
-- lesson_submissions.ai_draft_metadata->'academicIntegration':
-- object = 0, array = 0 (extractor never emits the key), total subs = 127
```

Zero object-shaped rows anywhere the schema validates at runtime. The comment at `lessonMetadata.zod.ts:376` ("PROD has both array and object regimes") is now stale.

**Action:** delete the object branch from both zod schemas + the two consumer object-paths; the `edgeSharedSchemas.equivalence` test and mapper round-trip tests are the net. The originally-proposed `academicIntegrationToArray` normalizer was never built — good; deletion beats consolidation now.
**Caveat:** `lesson_versions` archive rows may still hold old object shapes, but nothing parses them through this schema at runtime; don't touch archives.

### F3 — Admin-page state-machine duplication → DOWNGRADED (P3 / M / confidence: high on facts, medium on value)

- `AdminDuplicates.tsx` and `AdminDuplicateReview.tsx` were **deleted** in T4b (#578) — the two pages the plan said to migrate first no longer exist.
- Remaining, unchanged: `AdminUsers.tsx` 685 lines (11 useState; canonical state block at `:46-64`, `loadUsers` at `:78`), `AdminInvitations.tsx` 698 (8), `AdminAnalytics.tsx` 631 (8), `AdminUserDetail.tsx` 1,047 (23 — still the largest page, still un-analyzed), `AdminInviteUser.tsx` 551 (9).
- No `usePaginatedList` / `useAsyncLoader` hooks exist (`src/hooks/` verified).

**Re-assessment under audience reality:** these pages serve ~3 internal accounts and work today. A proactive hook-extraction wave is line-count golf on lightly-used surfaces — exactly what the W5 close-out already deferred ("admin tail, audience ≈0"). **Recommend: no scheduled work; extract a hook only when a real bug or feature forces you into one of these files.**

### F4 — scripts/ archaeology → STILL VALID, GREW (P2 / S–M / confidence: high)

Now **75 top-level entries** (was 73). Everything the plan flagged is still there:

- Three duplicate-analysis generations: `scripts/analyze-duplicates.mjs` (orphan), `analyze-duplicates-v2.ts` + `-v3.ts` (still npm scripts, `package.json:36-37`) — **and both v2/v3 are embedding-based** (`analyze-duplicates-v2.ts:52,138,194-197`), i.e. moot since T4b retired embedding dedup.
- Three edge-fn test scripts: `test-edge-function.ts` (superseded, but still documented at `scripts/README.md:68-73`), `test-edge-function-detailed.mjs` (0 refs), `test-edge-functions.mjs` (live: npm script + `edge-function-smoke.yml:60` daily cron).
- Nine orphan `.sql` files re-verified 0 references in package.json / workflows / READMEs: `make-first-admin.sql`, `fix-existing-user-profile.sql`, `fix-existing-user-profile-v2.sql`, `verify-auth-emails.sql`, `fix-rls-enablement.sql`, `check-duplicate-resolution.sql`, `setup-test-users.sql`, `update-test-user-emails.sql`, `verify-user-management-setup.sql`.
- **New archive candidates since June 12** (whole embedding family, see N1): `generate-embeddings.mjs`, `generate-embeddings-long-lessons.mjs`, `regenerate-all-embeddings.mjs`, `test-similarity-search.mjs`, `auto-resolve-duplicates.ts`, `undo-all-duplicate-resolutions.ts`, `test-duplicate-detection.mjs`, plus the completed-initiative dirs (`stage2-retag/`, `heritage/`, `dedup-sweep/`, `orphan-recovery/` — archive deliberately or leave with a ledger note).
- `scripts/archive/` exists (16 entries) as the destination. `scripts/README.md` still has no dead/alive ledger.

**Action unchanged from the plan** (archive + README ledger + pick one dup-analysis npm script or drop both), with the embedding family added. The 2026-06-12 hard exclusion on `stage2-retag/` + `lib/` has **expired** (Stage 2 complete 2026-06-11, metadata rebuild closed 2026-06-19) — but keep `scripts/lib/` (live `require-env.mjs` prod-guard) either way.

### F5 — Edge-function CORS → STILL VALID, SMALLER (P3 / S / confidence: high)

Function census changed: `password-reset` and `search-lessons` **no longer exist** (10 functions remain + `_shared/`). Current split:

- **3 re-implement** the restricted-origin logic that exists in `_shared/cors.ts` (`getRestrictedCorsHeaders` at `_shared/cors.ts:31`): `send-email/index.ts:45-68`, `invitation-management/index.ts:8-24`, `user-management/index.ts:~14-28` (Allow-Origin at `:24`). The copies are line-identical to each other and functionally identical to the shared helper.
- **4 use the shared helper correctly**: `complete-review/index.ts:12`, `detect-duplicates/index.ts:3`, `extract-google-doc/index.ts:8`, `process-submission/index.ts:4`.
- **3 declare inline wildcards** instead of `publicCorsHeaders` (`_shared/cors.ts:39`): `smart-search/index.ts:12-13`, `generate-embeddings/index.ts:3-4`, `generate-gemini-embeddings/index.ts:15-16`.

**Re-assessment:** downgrade P2→P3. The drift the plan feared is hypothetical (copies are still identical after 7 months), the functions are auth-gated in-code, and 2 of the 3 wildcard functions are N1 retirement candidates. **Sequence after N1** so you don't consolidate CORS in functions about to be deleted; then it's a 3-file mechanical change with the daily smoke as the net.

### F6 — filterDefinitions.ts split → WON'T-DO (confidence: high)

The PR-E gate cleared (metadata rebuild shipped 2026-06-19), but the premise weakened: the file is now **302 lines** (was 408) with clear sections (`FILTER_CONFIGS` at `:29`, `METADATA_CONFIGS` at `:173`, `ALL_FIELD_CONFIGS` at `:299-302`). `METADATA_CONFIGS`/`ALL_FIELD_CONFIGS` have exactly two consumers (`src/components/Review/ReviewMetadataForm.tsx`, `src/utils/filterDefinitions.test.ts`). Splitting a 302-line file with 2 metadata consumers adds a module boundary (and invalidates plan-doc references) for near-zero navigational gain. **Drop from the shelf.**

### F7 — Test scaffolds before refactor → DONE ✅ (residual accepted)

The refactors this was protecting (F1) happened *with* the tests the plan asked for:

- Review surface: `src/__tests__/integration/review-detail-page.test.tsx` (47KB), `review-detail-route.test.tsx`, 6 helper test suites in `src/pages/`, plus the new authenticated E2E (`e2e/authenticated/review-journey.spec.ts`, T5b — explicitly not an audit target).
- Search surface: `search-page.test.tsx` (30KB), `search-page-split-view`, 5 `lesson-search.*` integration suites.
- `duplicateGroupService` no longer exists (deleted with the T4b dup-page removal), so its test gap is moot.

**Residual:** the 5 admin pages still have zero tests — acceptable at ~3 internal users; add a render-smoke only if F3-style work ever happens.

### F8 — Pin Supabase CLI version → SUPERSEDED (optional P3 / S / confidence: high)

All **8 `version: latest` occurrences remain** (`migrate-production.yml`, `reset-test-db.yml`, `backup-production.yml`, `e2e.yml`, `deploy-edge-functions.yml` — verified count 8), but the recurring flake's root cause was fixed a better way on 2026-06-21 (PR #529): `github-token: ${{ github.token }}` on all setup-cli steps (verified present in all 6 workflows that use setup-cli, incl. `ci.yml`). Pinning is now purely a reproducibility lever. **Do nothing unless the flake recurs.**

### F9 — `.github/workflows.backup/` → STILL VALID (P3 / S / confidence: high)

Unchanged: **13 files**, no README/expiry note; active `workflows/` has 20 files. Nobody has edited the wrong copy in 7 months, so P2→P3 — but it's a one-command delete (git history preserves). Cheapest item on the list.

### F10 — Internal component hygiene → EVOLVED: 5 dead components (P3 / S / confidence: high)

Original item (privatize `IntLessonDetail`) is void — it's **alive**: used by `IntLessonDrawer.tsx` and `IntSplitDetail.tsx`, which `src/pages/SearchPage.tsx:249,255` renders.

**New, better finding:** T4b's dup-page removal orphaned five `src/components/Internal/` components — each referenced ONLY by the barrel `index.ts` and its own test file (repo-wide grep, external refs = 0):

- `IntGroupReviewBar.tsx` (+ test)
- `IntDetectionMethodChip.tsx`
- `IntMetadataDiff.tsx` (+ test)
- `IntConfidencePill.tsx`
- `IntSpecRail.tsx`

Keep `IntDuplicateCard` and `IntDecisionBar` — both are used by `src/components/Review/ReviewDecisionPanel.tsx`. **Action:** delete the 5 components + tests + their `index.ts` exports; `npm run check` + test suite confirm.

### F11 — filterUtils maps → EVOLVED: dead, not drifting (P3 / S / confidence: high)

The plan worried the hand-maintained maps would drift from `FILTER_CONFIGS`. Reality: **3 of the 4 exports are dead code** — `formatCategoryName` (`src/utils/filterUtils.ts:51`), `getCategoryIcon` (`:70`), and `getCultureDescendantValues` (`:30`) have zero non-test consumers (only `filterUtils.test.ts`). Only `buildCultureLabelMap` (`:13`) is live (`IntActivePills.tsx:3`, `IntListRow.tsx:3`). **Action:** delete the 3 dead functions + their test cases instead of deriving them from configs. Bundle with F10.

### F12 — Dep hygiene → STILL VALID (P3 / S / confidence: high)

All flagged packages remain, all in `devDependencies` (nothing ships to users): `@anthropic-ai/sdk` (`package.json:81`), `@lhci/cli` (`:83` — still a local convenience; CI's `performance.yml` runs its own Lighthouse), `csv-parse` (`:95`), `http-server` (`:104` — still redundant, `performance.yml:42-43` installs it globally), `tiktoken` (`:109`). **New:** `openai` (`:106`) is imported only by the embedding scripts (`generate-embeddings.mjs`, `generate-embeddings-long-lessons.mjs`, `test-similarity-search.mjs`) — if N1/F4 archive those, `openai` + `tiktoken` drop too. Low-stakes; ride along with the N1/F4 PR.

### F13 — `duplicate_pairs` → MOSTLY RESOLVED BY REALITY (P3 / S / confidence: high)

Read-only PROD probe (2026-07-03): the `duplicate_pairs` **table no longer exists** (`information_schema.tables` = 0 rows) — no migration in-tree drops it, so it was removed out-of-band at some point; generated types (`src/types/database.types.ts`) already carry no table type for it. What's left:

- `find_duplicate_pairs()` **function still exists in PROD** (`pg_proc` = 1), created by `20251201_duplicate_detection_revamp.sql:64`, embedding-based per its own COMMENT (`:139`), with **zero app callers** — the T4b removal of `duplicateGroupService` deleted the last one. Only reference left in-tree is the generated type at `src/types/database.types.ts:1614`.

**Action:** `DROP FUNCTION find_duplicate_pairs()` in the same future cleanup migration as N1's DB tail, then regen types.

### F14 — Migration re-baseline → GATE CLEARED, GREW (P3 / M / confidence: medium)

**86 active migration files** now (was 66; excludes `.rollback` siblings and `archive/`). Every blocking track has shipped (metadata rebuild, C02, W6 search, T4 dedup). The `/baseline-db` skill exists for exactly this. Still discretionary and the riskiest item here (baselining touches the deploy pipeline's spine) — schedule as its own post-launch session, not a rider. Note the open C02 follow-up (future `VALIDATE CONSTRAINT` on the two `NOT VALID` CHECKs) is worth folding into the same window.

### F15 — tsconfig×3 / ESLint scripts policy → CLOSED ✅

The "leave alone during PR 6" constraint expired (Stage 2 complete). The policy the plan wanted documented now **is** documented in-code: `eslint.config.js:19-30` explains the `scripts/*` ignore + opt-in dirs (`stage2-retag/`, `heritage/`, `dedup-sweep/`) including the glob gotcha. `tsconfig.json`/`tsconfig.node.json`/`tsconfig.scripts.json` is a standard Vite layout. No action.

---

## N1 — NEW: retired embedding pipeline still has live surfaces (P2 / M / confidence: high)

T4b retired embedding-based dedup (pg_trgm now; `process-submission/index.ts:454-456`: "Step 4 (embedding generation) was removed in T4b"; `:281`: content_embedding intentionally left inert). But the retirement stopped at the product code path — the pipeline's periphery is still running:

1. **Two deployed edge functions with no product callers:** `generate-embeddings/` and `generate-gemini-embeddings/`. Frontend invokes only `smart-search`, `complete-review`, `send-email`, `user-management`, `invitation-management` (repo-wide invoke grep); the only callers of the embedding functions are the moot scripts in F4.
2. **The daily smoke pays OpenAI to test a dead function:** `scripts/test-edge-functions.mjs:78-86` full-smokes `generate-embeddings` with a real `text-embedding-3-small` call, daily via `edge-function-smoke.yml:16` (cron 04:00 UTC); `generate-gemini-embeddings` is health-checked at `:96`. Cost is pennies, but it keeps `OPENAI_API_KEY` live in edge secrets for zero product value — and a future OpenAI failure would redden the smoke signal for a function nothing uses.
3. **Orphan DB function:** `find_duplicate_pairs()` (see F13) — embedding-based, zero callers.
4. Deliberately kept, don't touch: `lessons.content_embedding` / `lesson_submissions.content_embedding` columns (documented inert, `process-submission/index.ts:455-456`).

**Action (one deliberate sweep, post-launch):** delete the two edge functions (mind the edge-deletion ordering hazard in the CI-flakes playbook — remove from the deploy matrix and delete in the right order), trim both entries from `test-edge-functions.mjs` (smoke drops 12→10), archive the embedding scripts (F4), drop `openai`/`tiktoken` devDeps (F12), and drop `find_duplicate_pairs()` via a cleanup migration (F13). Effort M only because it spans repo + workflows + a migration + a PROD edge deploy; each piece is small.

**Why P2 not P3:** it's the only item with an ongoing external dependency (daily third-party API call + a kept-alive secret) and it actively muddies the daily smoke signal — operational degradation, not just polish.

---

## Verification appendix

- **Tree state:** `main` @ `777ab8e` (T5b), 2026-07-03.
- **PROD probes (read-only SELECTs, project `jxlxtzkmicfhchkhiojz`):**
  1. `jsonb_typeof(metadata->'academicIntegration')` over `lessons`: object=0, array=785, total=785; `duplicate_pairs` in `information_schema.tables` = 0; `find_duplicate_pairs` in `pg_proc` = 1.
  2. `jsonb_typeof(ai_draft_metadata->'academicIntegration')` over `lesson_submissions`: object=0, array=0, total=127.
- **Grep-based dead-code claims** (F10, F11, N1 callers) were run repo-wide over `src/`, `e2e/`, `supabase/`, `scripts/`, `.github/` with barrel/test files excluded per finding; counts quoted per item above.
- **Not verified:** whether the two embedding edge functions are actually deployed on PROD right now (in-repo + smoke-listed was treated as sufficient; confirm with `mcp__supabase-remote__list_edge_functions` before the N1 sweep); whether any human runs the orphan scripts manually.
