# Filter Metadata Drift Repair — Design Document

**Date:** 2026-04-28
**Status:** Draft — awaiting review
**Related:** Investigation chat (this session); `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/MEMORY.md` references `project_lesson_format_conflated.md` and the `facetCounts.ts:55` hardening note.

---

## 1. Why this exists

The `search_lessons` RPC and the UI's filter sidebar disagree about what's stored in `lessons.metadata`. Production verification (788 lessons, queried 2026-04-28) shows five distinct mismatches that combine to make most filter clicks return wrong counts — sometimes zero, often undercounting by ~10%, occasionally undercounting by 90%.

The bugs aren't a single regression. They're the cumulative result of two metadata "eras" coexisting in the corpus:

- **Legacy era (~707 rows)** — written before the Phase 5+ submission flow. Uses long-form keys (`thematicCategories`, `seasonTiming`, `locationRequirements`), Title-Case values (`Single period`, `Indoor`, `Asian`), object-shape `academicIntegration` (`{selected: [...]}`).
- **Review era (~81 rows)** — written by Phase 5/6/8b approval flow. Uses short-form keys (`themes`, `season`, `location`), partial slug values, flat-array `academicIntegration` (`[...]`).

Every approval through the new flow grows the review-era cohort. The drift compounds; it does not self-heal. Meanwhile the RPC was last touched 2025-10-01 and only knows the legacy shape.

### Concrete production evidence

| Filter | UI sends | DB has | RPC returns |
|---|---|---|---|
| `lessonFormat=single-period` | `single-period` | `Single period` (483 rows) | **0** hits |
| `lessonFormat=standalone` | `standalone` | `Standalone` (150) + `standalone` (66) | **66** (not 216) |
| `activityType=cooking-only` | `cooking-only` | `cooking` (24 rows) | **0** hits |
| `cookingMethods=Stovetop` | scalar `'Stovetop'` (RPC param is `text`) | array `["Stovetop", …]` | **0** hits |
| `culturalHeritage=asian` | `asian` | `Asian` (66 direct + children) | **1** (not 67) |
| `academicIntegration=Math` | `Math` | object-shape only | 102 (silently drops 87 review-era rows) |

The user impression — "filters don't seem to be working correctly" — is correct. Most clicks on `lessonFormat`, `activityType`, `cookingMethods`, and `culturalHeritage` are functionally broken. The other filters undercount the 81 review-era rows on every multi-axis click.

This is also where the "workflows are not sacred" preference applies to data shape: the cleanest fix is not "patch around the drift" — it's "agree on canonical shape and enforce it at write time so this can't recur."

## 2. Failure modes the fix must close

Each of the five bugs traces to one of four root causes. The fix must close all four; closing only some leaves the corpus diverging.

1. **Key-shape drift.** 81 review-era rows store metadata under short-form keys (`themes`, `season`, `location`) the RPC doesn't read. Filter clicks silently exclude this cohort.
2. **Vocabulary drift.** `lessonFormat`, `activityType`, `cookingMethods`, and `culturalHeritage` have UI values that don't match stored values. Casing differs (`Indoor` vs `indoor`); identifiers differ (`cooking-only` vs `cooking`); whole tail of corpus values has no UI equivalent (`Mexican`, `Lenape`, `African American` for heritage).
3. **Type/shape RPC bugs.** `cookingMethods` is declared `multiple` in `filterDefinitions.ts` but the RPC parameter is scalar `text` and the comparison is scalar-equals — broken end-to-end. `academicIntegration` is read at `metadata->'academicIntegration'->'selected'` (object shape only); 87 review-era rows store flat arrays and are silently dropped.
4. **Write-path leakage.** `process-submission` and `complete-review` edge functions wrote the review-era shape and will keep doing so. Any fix that doesn't add teeth at the write layer regrows the drift cohort.

A successful repair eliminates all four classes simultaneously and prevents new drift from accumulating.

### Out-of-scope failure modes

Two adjacent issues are explicitly NOT in scope:

- **`lessonFormat` semantic conflation** — `lessonFormat` blends time-structure (`Single period`/`Double period`/`Multi-session`) with context-independence (`Standalone`) into one single-select filter where both are often true. This is a real filter-design problem (per `project_lesson_format_conflated.md`) but it's a stakeholder-input filter redesign, not a drift repair. Out of scope here.
- **`grades_taught` / `subjects_taught` non-consultation** — these fields are written but never read by search filters. Tracked separately in `project_grades_subjects_unused.md`.

## 3. The chosen shape: tolerant-RPC first, canonicalize second

The fix is sequenced in three contained, independently-shippable PRs, with an optional fourth gated on stakeholder input:

```
PR-1: Tolerant RPC          ──┐
                              │  unblocks ~190 rows immediately
PR-2: Key-shape backfill     ──┤  no vocabulary debate yet
      + write-path teeth      │  closes the drift growth path
                              │
PR-3: Canonical vocabulary   ──┤  one-shot data migration
      (lessonFormat /          │  + filterDefinitions.ts rewrite
       activityType /          │  + RPC alias awareness
       cookingMethods)         │
                              │
PR-4: Cultural heritage      ──┘  GATED on stakeholder input;
      vocabulary redesign         may ship weeks later or never
```

The ordering is deliberate. PR-1 + PR-2 are mechanical (no curriculum-side decisions) and produce immediate user-visible improvement. PR-3 needs canonical-form choices but they're choices we can make today. PR-4 needs the curriculum stakeholder to decide how granular `culturalHeritage` should be (e.g. is `Mexican` a first-class filter or a child of `Latin American`?) — that conversation has its own pace.

### Why this shape over the alternatives

| Option | Why rejected |
|---|---|
| **Single mega-PR** ("fix everything atomically") | Bundles vocabulary decisions (which need stakeholder input) with mechanical RPC bugs (which don't). Mixed-confidence changes in one diff make review and rollback harder. Ships nothing until everything is decided. |
| **Vocabulary-first, RPC-tolerance later** | Inverts risk: changes filter values in `filterDefinitions.ts` before the RPC tolerates them, creating a window where every filter click returns 0. Even if landed in one PR, the data migration runs at deploy time — not atomic with the code change. |
| **Fix data only, leave RPC alone** | Doesn't solve the type/shape bugs (`cookingMethods` text-vs-array, `academicIntegration` object-vs-array). Those are RPC-side bugs no amount of data normalization fixes. |
| **Patch the UI to match the data** (e.g. send `Single period` from `filterDefinitions.ts`) | Quick win for some filters (`lessonFormat`, `culturalHeritage`) but doesn't help the type/shape bugs and locks in casing-sensitivity. Also loses the slugs-with-display-labels separation that's worth having long-term. |

The chosen shape lets PR-1 ship as pure mechanical RPC tolerance — no decisions to debate. PR-2 ships data shape consistency without changing any user-visible value. PR-3 then makes the vocabulary debate explicit, with the RPC already tolerant of either side, so the migration window is safe.

## 4. Section 1 — RPC tolerance (PR-1)

Single migration that updates `search_lessons` to handle both metadata eras. No data changes. No frontend changes. No vocabulary decisions.

### Changes

1. **`cookingMethods` parameter type fix.** `filter_cooking_method` parameter changes from `text` → `text[]`. Comparison changes from `metadata->>'cookingMethods' = filter_cooking_method` to `EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'cookingMethods') c WHERE c = ANY(filter_cooking_method))`. Plus a `lower()` wrap on both sides for casing tolerance.
2. **`academicIntegration` shape tolerance.** Replace the single object-shape path with a `CASE jsonb_typeof(...)` branching: object-shape reads `->'selected'`, array-shape reads the array directly. Both paths feed into the same `jsonb_array_elements_text → ANY(filter_academic)` comparison.
3. **Key-name fallback** (transitional, removed in PR-2). For each long-form key the RPC reads, fall back to the short-form key if the long-form is null:
   - `metadata->'thematicCategories'` falls back to `metadata->'themes'`
   - `metadata->'seasonTiming'` falls back to `metadata->'season'`
   - `metadata->'locationRequirements'` falls back to `metadata->'location'`
   This is intentional dead code — PR-2's data migration eliminates the short-form keys and the fallback can be removed in PR-3.
4. **Casing tolerance on `location`.** `lower(loc) = ANY(filter_location_lower)` to absorb the 14 lowercase outliers.

### What's NOT in this PR

- No frontend changes. `filterDefinitions.ts` stays as-is.
- No data migration. The 81 review-era rows stay short-key-shaped.
- No vocabulary canonicalization. `lessonFormat` slugs still don't match `Single period` — that's PR-3's job.
- No write-path constraints. PR-2 owns that.

### Frontend hook update

`src/hooks/useLessonSearch.ts:113` currently sends an array as the `filter_cooking_method` value (the RPC param was scalar `text`, so this was already a latent error coerced to a Postgres array string). After the RPC param type change to `text[]`, this just works. No frontend change required for that bug; PR-1 fixes both sides simultaneously.

## 5. Section 2 — Key-shape backfill + write-path teeth (PR-2)

Two migrations and one edge-function update. No frontend changes. No vocabulary decisions.

### Migration 1: backfill the 81 short-key rows

Idempotent SQL that, for every row where the short-form key exists and the long-form key is null:

```sql
UPDATE lessons
SET metadata = metadata
  - 'themes' - 'season' - 'location'
  || jsonb_build_object(
       'thematicCategories', COALESCE(metadata->'thematicCategories', metadata->'themes'),
       'seasonTiming',       COALESCE(metadata->'seasonTiming',       metadata->'season'),
       'locationRequirements', COALESCE(metadata->'locationRequirements', metadata->'location')
     )
WHERE metadata ?| ARRAY['themes', 'season', 'location'];
```

Plus the `academicIntegration` flat-array → object-shape conversion:

```sql
UPDATE lessons
SET metadata = jsonb_set(
  metadata, '{academicIntegration}',
  jsonb_build_object('selected', metadata->'academicIntegration')
)
WHERE jsonb_typeof(metadata->'academicIntegration') = 'array';
```

Verification query (post-migration on TEST DB):

```sql
SELECT
  COUNT(*) FILTER (WHERE metadata ? 'themes')             AS short_key_remaining,
  COUNT(*) FILTER (WHERE jsonb_typeof(metadata->'academicIntegration') = 'array') AS array_shape_remaining
FROM lessons;
-- Expected: 0, 0
```

### Migration 2: write-path normalization trigger

A `BEFORE INSERT OR UPDATE` trigger on `lessons` that runs the same shape transforms above. Implementation: trigger function calls a normalizer that:

1. If `NEW.metadata` has `themes` → renames to `thematicCategories` (similarly for `season`, `location`).
2. If `NEW.metadata->'academicIntegration'` is an array → wraps in `{selected: ...}`.
3. Returns `NEW` with normalized metadata.

This serves dual duty: same code path that backfills existing rows runs on every future insert/update, so the bug class can't recur from edge functions, MCP tools, scripts, or anywhere else writes to `lessons.metadata`. **Trigger over CHECK constraint** because we want soft-coerce-on-write behavior, not hard reject — a write that uses `themes` shouldn't fail, it should be normalized.

### Edge-function fix

Update `process-submission/index.ts` and `complete-review/index.ts` to write canonical-shape metadata directly. The trigger is the safety net; fixing the source means the trigger rarely has work to do (and any work it does is a "this writer was misbehaving" signal worth logging).

### Order of apply

1. Migration 1 first (backfill existing rows).
2. Migration 2 second (install trigger).
3. Edge-function deploy last.

This sequence means the trigger never has to coerce a real write during the migration window — the data is already canonical when the trigger comes online. If we install the trigger first, every backfill-migration UPDATE fires the trigger redundantly (still correct, just wasteful).

### What's NOT in this PR

- No vocabulary changes. `lessonFormat=Single period` stays Title Case. `activityType=cooking` stays without `-only`. PR-3 owns this.
- No removal of the PR-1 RPC fallbacks. Those get removed in PR-3 once vocabulary is also canonical.

## 6. Section 3 — Canonical vocabulary (PR-3)

Single PR that ships RPC alias-awareness, the data migration, and the `filterDefinitions.ts` rewrite **together** to avoid the zero-results window.

### Canonical-form decisions (locked)

| Field | Canonical form | Rationale |
|---|---|---|
| `lessonFormat` | Title-Case-with-spaces (`Single period`, `Standalone`, `Multi-session unit`, …) | Corpus-dominance argument applies (483/788 rows already this shape). The values *are* user-friendly labels — no need for a separate display layer. |
| `activityType` | Stable nouns (`cooking`, `garden`, `academic`, `both`) — UI renders display labels separately | Decouples display ("Cooking Only") from storage ("cooking"). Future label changes don't require migrations. Plus `-only` suffix is UI-side semantics, not a real category distinction. |
| `cookingMethods` | Lowercase nouns (`stovetop`, `oven`, `basic-prep`, …) — UI renders display labels separately | Same rationale as activityType. Plus the corpus already has casing chaos (`Stovetop`/`stovetop`/`Sautéing`); lowercase normalization is the cleanest collapse. |
| `culturalHeritage` | **DEFERRED to PR-4** | Needs stakeholder input on hierarchy depth + unmapped tail. PR-3 leaves heritage values untouched. |

### Display-label separation pattern

For `activityType` and `cookingMethods`, `filterDefinitions.ts` keeps the existing `{ value, label }` pattern — `value` becomes the canonical stored form, `label` is the user-facing string. The UI was already rendering `label`; only the wire-protocol value changes:

```typescript
// Before:
{ value: 'cooking-only', label: 'Cooking Only' }
// After:
{ value: 'cooking',      label: 'Cooking Only' }
```

### Data migration

Idempotent UPDATE that maps existing values to canonical:

| Field | Drift values → canonical |
|---|---|
| `lessonFormat` | `'standalone'` → `'Standalone'`; `'mobile-education'` → `'Mobile education format'`; `'["standalone"]'` → `'Standalone'` (the 1 array-shape outlier) |
| `activityType` | `'cooking-only'` → `'cooking'` (none in corpus, but for future-write-path safety); `'["garden"]'` → `'garden'` (the 1 array-shape outlier); `'garden-only'`, `'academic-only'` → `'garden'`, `'academic'` |
| `cookingMethods` | array-element-wise: `'Stovetop'` → `'stovetop'`, `'Oven'` → `'oven'`, `'Basic prep only'` → `'basic-prep'`, `'No-cook'` → `'no-cook'`, etc. Outliers `'Sautéing'` and `'Stovetop (sautéing, boiling, simmering)'` and `'Steam'` get manually-mapped (3 rows total). |

### RPC update

- Remove the PR-1 short-form-key fallbacks (`themes`/`season`/`location`) — they're now dead code thanks to PR-2's backfill+trigger.
- Remove the `lower()` casing tolerance on `cookingMethods` and `location` — data is now canonical lowercase.
- Update `cookingMethods` filter to use the canonical lowercase values.

### Trigger update (PR-2 → PR-3 evolution)

The PR-2 normalization trigger gets a vocabulary-canonicalization stage added: if a write comes in with `'cooking-only'`, the trigger maps it to `'cooking'` before storing. This prevents future regressions from any writer (edge function, MCP, manual SQL).

### `filterDefinitions.ts` rewrite

Mechanical: update `value` fields to canonical form. `label` fields stay user-friendly. The `IntActivePills` and `IntSidebar` components already render `label`, so no UI changes beyond `filterDefinitions.ts`.

### `facetCounts.ts:55` hardening

Drop the array-shape fallback for `lessonFormat` (the deferred follow-up from `MEMORY.md`). After PR-3, no lesson has array-shape `lessonFormat`. The defensive `Array.isArray` check can be removed.

## 7. Section 4 — Cultural heritage (PR-4, GATED)

Out of scope for the immediate repair. Captured here for completeness because the design needs to acknowledge what's deferred.

### What's broken

- `cultural_heritage_hierarchy` table uses Title Case parents (`Asian`, `Latin American`).
- `filterDefinitions.ts` uses kebab-case slugs (`asian`, `latin-american`).
- Production data is mostly Title Case (`Asian` 66, `East Asian` 36) with 13 stragglers in slug form (`east-asian` 4, `north-american` 13).
- Long tail of corpus values has no `filterDefinitions.ts` representation: `Mexican` (41 rows), `Italian` (26), `African American` (25), `Mediterranean` (42), `Indigenous` (24), `Lenape` (7), `Native American` (5), and ~10 more.

### Why deferred

- Canonical-form choice (slug or Title Case) interacts with hierarchy-depth decisions (is `Mexican` a first-class filter or a `Latin American` child?).
- Hierarchy-depth interacts with curriculum priorities — the team has explicit cultural-priority preferences that need to be surfaced.
- The PR-1 RPC tolerance handles the immediate breakage by widening matches; users see clicks return *some* rows even if not the full set.

### What PR-4 would contain (placeholder)

- Stakeholder conversation on canonical form + hierarchy depth.
- Migration to canonicalize heritage values across all 731 rows that have the field.
- `cultural_heritage_hierarchy` table rebuild.
- `filterDefinitions.ts` heritage section rewrite.
- Removal of any heritage-specific RPC tolerance from PR-1.

## 8. Section 5 — Migration / shipping strategy

### PR breakdown

| # | PR | Contains | Risk |
|---|---|---|---|
| 1 | **RPC tolerance** | 1 migration: shape-tolerant `search_lessons`, type-fixed `cookingMethods`, key-name fallbacks, casing tolerance | Defensive only; widens matches, never narrows. Pure RPC change, no data side effects. |
| 2 | **Key-shape backfill + trigger** | 2 migrations (backfill + trigger) + 2 edge-function updates | Data-touching but idempotent. Trigger is soft-coerce, not hard-reject. Edge-function deploy is reversible. |
| 3 | **Canonical vocabulary** | 1 migration (data canonicalization) + RPC alias removal + `filterDefinitions.ts` rewrite + trigger vocab stage + `facetCounts.ts` hardening | Atomic frontend+backend change to avoid zero-results window. Idempotent migration. |
| 4 | **Heritage redesign** | TBD — gated on stakeholder | Significant blast radius; deferred until canonical decisions made. |

### Gap risk between PRs

- **Between PR-1 and PR-2**: None. PR-1 ships RPC tolerance for both shapes; if PR-2 lands two days or two weeks later, the corpus stays partially-drift but searches work in the meantime.
- **Between PR-2 and PR-3**: None. After PR-2, all rows are canonical-shape but vocabulary is unchanged. RPC still tolerates both vocabularies via PR-1 fallbacks. Searches keep working.
- **Inside PR-3**: This is where the gap risk concentrates. The atomicity guarantee — RPC vocabulary changes + data migration + frontend changes ship together — is what avoids zero-results. Migration must run BEFORE the RPC removes its old-vocabulary fallbacks; CI must apply migration before deploy preview gets the new RPC.

### TEST DB rehearsal

Each PR ships a verification query block in the PR description, run via `mcp__supabase-test__execute_sql` after CI applies the migration:

- **PR-1**: 9-row test matrix mirroring the production verification done 2026-04-28 (`lessonFormat=single-period`, `lessonFormat=Single period`, `activityType=cooking-only`, `activityType=cooking`, `cookingMethods=stovetop`, `cookingMethods=Stovetop`, `academicIntegration=Math`, baseline). After PR-1, all of these should return non-zero hits matching the documented true counts (or close to them — casing tolerance widens matches).
- **PR-2**: `SELECT COUNT(*) FILTER (WHERE metadata ? 'themes')` and academic-integration-shape-distribution queries. Expected: 0 short-key rows, 0 array-shape rows.
- **PR-3**: same matrix as PR-1 plus distinct-values check on `lessonFormat`, `activityType`, `cookingMethods`. Expected: only canonical values.

### Rollback paths

- **PR-1**: forward-rollback migration that restores the prior `search_lessons` body. Idempotent. RPC change only, no data touched.
- **PR-2**: backfill is one-way (can't easily un-rename `thematicCategories` back to `themes` for just the 81 rows without tracking which were which). If catastrophic, the trigger gets dropped; the long-form keys stay populated; the short-form keys are gone but the RPC reads long-form so functional behavior is preserved. Forward-rollback is "drop the trigger"; the data backfill stays.
- **PR-3**: same one-way data migration concern. If vocabulary canonicalization needs to be undone, the recovery path is "ship a new migration that restores the prior vocabulary." The PR-1 RPC tolerance gives us multiple fallback vocabularies in flight, so a partial rollback is survivable.

### Per-PR ritual

Per `feedback_pr_bot_review_workflow.md`:

1. Pre-push reviewer agent dispatch (catch RPC-syntax bugs, missing RLS, etc.)
2. Push → open PR
3. CI applies migration to TEST DB; deploy preview builds
4. Wait for external bot reviewers (claude-review, copilot, codex)
5. Four-surface comment triage (`pulls/<PR>/comments`, `pulls/<PR>/reviews`, `issues/<PR>/comments`, the PR description itself)
6. Investigate every finding (rebuttal pass per `feedback_bot_review_investigation.md`)
7. Consolidated fix-up commits per round
8. Per-round TEST DB re-verification (per `feedback_per_round_test_db_verification.md` — re-run verification queries after every DB-affecting fix-up)
9. Round-cap after 2 rounds; stalemate → escalate

### Known issues / pre-existing flakes

- `migrate-production.yml` Apply-step SASL flake: confirmed pattern as of 2026-04-28 (PR #468). Mitigation: rerun the failed Apply job; verify post-apply state via `mcp__supabase-remote__execute_sql` regardless. Migrations are idempotent.
- `migrate-production.yml` Verify-step SASL flake: cosmetic; PROD MCP verification is the real check.
- Edge-function deferred-approval ordering hazard: PR-2's edge-function deploy interacts with any in-flight `deploy-edge-functions.yml` runs. Cancel queued production-approval runs whose head pre-dates the PR-2 merge before approving PR-2's deploy.

## 9. Section 6 — Testing strategy

### Unit

- `facetCounts.test.ts` — add cases covering both metadata eras (object-shape AI, array-shape AI, short-key, long-key). Existing tests cover only legacy era.
- `filterDefinitions.test.ts` — update vocabulary assertions in PR-3.

### Integration

- `lesson-search.params.test.tsx` — currently asserts that the right RPC params are sent. Add semantic assertions: given a fixture row with array-shape AI, filtering by `academicIntegration=Math` should match it. (Currently passes because nothing checks semantics.)
- New test: `lesson-search.both-eras.test.tsx` — fixture with one legacy-era row + one review-era row, exercise every filter, assert both rows match where appropriate.

### E2E

- Playwright smoke for each filter category, asserting non-zero result counts on the canonical filter values. Easy to do for PR-1 verification.

### RLS

- No RLS changes. `npm run test:rls` must pass unchanged.

### Manual smoke checklist

Per `superpowers:verification-before-completion`, after each PR:

- Visit the search page on the deploy preview, click each filter category, confirm result counts match the TEST-DB verification matrix.
- Specifically: click `Single period` lessonFormat — expect ~483 results. Click `Cooking Only` activityType — expect ~24. Click `Stovetop` cookingMethods — expect ~177 (159 + 18 lowercase). Click `Math` academicIntegration — expect ~102+ (legacy) or higher after PR-2 (covers review-era rows).

## 10. Out of scope (captured for future work)

- **`lessonFormat` semantic conflation** (`project_lesson_format_conflated.md`) — single-select forces one value when both time-structure and context-independence often apply. Filter redesign, not drift repair.
- **`grades_taught` / `subjects_taught` non-consultation** (`project_grades_subjects_unused.md`) — fields written but never read by search.
- **Cultural heritage vocabulary canonicalization (PR-4)** — gated on stakeholder input on hierarchy depth and the unmapped corpus tail.
- **`cultural_heritage_hierarchy` table redesign** — coupled to PR-4.
- **New filter categories** — stakeholder consult is its own decision.
- **Search ranking changes (`rank` calculation)** — unrelated.
- **Embedding-pipeline mismatch** (`project_embedding_pipeline_mismatch.md`) — separate active follow-up.
- **`facetCounts.ts:55` lessonFormat array-shape hardening** — folded into PR-3 (no longer needed once data is canonical).
- **`@lhci/cli` upgrade, Supabase CLI version pinning, etc.** — `MEMORY.md` "Open hygiene follow-ups" — unrelated.

## 11. References

- Investigation chat (this session, 2026-04-28) — concrete production verification numbers cited in §1.
- `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/MEMORY.md` — `project_lesson_format_conflated.md`, `project_grades_subjects_unused.md`, `feedback_data_safety_top_priority.md`, `feedback_workflows_not_sacred.md`.
- `supabase/migrations/20251001_production_baseline_snapshot.sql:1198-1357` — current `search_lessons` definition.
- `src/utils/filterDefinitions.ts:22-211` — current UI filter vocabulary.
- `src/hooks/useLessonSearch.ts:81-130` — frontend → RPC param mapping.
- `src/utils/facetCounts.ts` — facet computation; `:55` is the array-shape hardening note.
- `~/.claude/plans/lesson-submission-tier1-implementation.md` — Phase 5/6/8b context for why review-era metadata exists.
