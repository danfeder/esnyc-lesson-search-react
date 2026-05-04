# Metadata Rebuild — Foundation Phase — Validator Architecture (Gate B)

**Date:** 2026-05-03 (Session 2)
**Status:** Decisions captured; scaffold code lands as PR 1 Task 1.0.
**Related:** design doc §5; impl plan §Gate B + §1.0; status doc Session 1 reviewer round 2 entry.

This document records Gate B's decisions: **where canonical metadata vocabulary lives, how it's enforced across four runtimes (Deno edge, browser TS, PLPGSQL, Python batch), and how the four artifacts stay in sync.** Every item below was already pre-locked by reviewer round 2 (status doc lines 25–28); Gate B's job is to record the resolved shape and answer the remaining "where do files live / how do CI gates assert sync" details.

---

## Verified current state (baseline before scaffold lands)

- **Zod:** not installed in `package.json` (verified). PR 1 Task 1.0 adds `zod@^3.24.0` to `dependencies` (browser + scripts).
- **Edge function deps:** no `supabase/functions/deno.json` exists today; functions resolve external imports per-file (e.g., `https://deno.land/std@…`, `npm:@supabase/supabase-js@…`). PR 1 Task 1.0 adds the file.
- **TS interfaces:** `src/types/index.ts:28-49` defines `LessonMetadata` (canonical, array values); `src/types/index.ts:103-121` defines `ReviewMetadata` (review-form, single-select strings + `themes`/`season`/`location` keys). The two schemas genuinely diverge.
- **Pydantic coverage today:** `/Users/danfeder/cCode/taggingv3/gpt_tagger/models.py` strict-enforces closed enums on 5 metadata fields (`gradeLevel`, `thematicCategories`, `locationRequirements`, `socialEmotionalLearning`, `lessonFormat`); a lenient `MetadataO4Mini` subclass adds soft validation on 2 more (`observancesHolidays`, `culturalResponsivenessFeatures`). Foundation phase tightens this to every closed-vocabulary field per design §10.
- **SQL value-validation today:** 1 column-level CHECK (`valid_seasons` on `season_timing` text[]) + 1 shape-only trigger (`lessons_normalize_write_trg`, baseline `20260509000000`) covering column⇄metadata sync for 10 fields (concepts rescue + B–K) but not enum values. Legacy `handle_lessons_metadata_write_trg` exists in baseline:465 but is unattached (Gate A note; verify on TEST DB before PR 1 migration writes).

---

## Decision 1 — Canonical source: TS/Zod (Option B, confirmed)

Codebase is TS-biased: frontend (React + Zustand), edge functions (Deno TS), scripts (mostly TS). Python batch is the only Python runtime, and it's a single downstream consumer. Making Zod canonical and Pydantic the mirror is the lower-friction direction. No new evidence reopens this; **locked**.

---

## Decision 2 — Two TS schemas, not one

`LessonMetadata` and `ReviewMetadata` diverge in three load-bearing ways:

| Aspect | LessonMetadata (canonical) | ReviewMetadata (review-form) |
|---|---|---|
| `activityType` | `string[]` | `string` (single-select) |
| `lessonFormat` | `string` (until D3 drops it in PR 1) | `string` (until D3) |
| `location` key name | `locationRequirements: string[]` | `location: string` |
| `seasons` key name | `seasonTiming: string[]` | `season: string[]` |
| `themes` key name | `thematicCategories: string[]` | `themes: string[]` |

The translation is performed today inside `complete_review_atomic` SQL (per Gate A: line ~142-167 of `20260428000003_phase_4_complete_review_atomic_rpc.sql`). Foundation phase mirrors that contract on the TS side rather than collapsing the two — collapsing would require either changing `ReviewDetail.tsx` form structure (out of foundation scope; defers to Phase 2 reviewer-UX) or making the SQL translation roundtripable from a single canonical source (would entail picking one side's key names and rewriting all consumers of the other).

**Two Zod schemas + two pure-function mappers** is the chosen shape:
- `src/types/lessonMetadata.zod.ts` — imported by `process-submission` (LLM-draft writer; canonical keys), data-import scripts, Stage 2 batch.
- `src/types/reviewFormPayload.zod.ts` — imported by `complete-review` edge function and `ReviewDetail.tsx`.
- `src/utils/reviewToLessonMapper.ts` — `reviewToLesson(input: ReviewMetadata): LessonMetadata`; mirrors the SQL translation.
- `src/utils/lessonToReviewMapper.ts` — inverse for the read site (ReviewDetail.tsx form-init when AI drafts arrive in canonical keys per PR 2 Task 2.2).

**Mapper testing:** property-based round-trip in `src/utils/reviewToLessonMapper.test.ts`:
- Empty payload → empty canonical
- All-fields-populated review payload → matching canonical (assert key renames + array wraps)
- Round-trip: `lessonToReview(reviewToLesson(x)) === x` for representative fixtures
- Mirror SQL test fixtures from `complete_review_atomic` to keep the TS mapper honest against the SQL it mirrors.

---

## Decision 3 — File locations

| Artifact | Path | Rationale |
|---|---|---|
| Canonical Zod schema | `src/types/lessonMetadata.zod.ts` | Discoverable next to existing `types/index.ts`. |
| Review-form Zod schema | `src/types/reviewFormPayload.zod.ts` | Co-located with canonical so reviewers find both. |
| Generated enum mirror | `src/types/generated/enums.json` | Inside `src/types/` so the canonical source's "downstream consumers" are obvious; `generated/` subdir signals don't-edit-by-hand. |
| Generator script | `scripts/generate-enums-json.ts` | Lives with other build/maintenance scripts; runnable via `npm run generate:enums`. |
| Mappers | `src/utils/reviewToLessonMapper.ts` + `src/utils/lessonToReviewMapper.ts` | Co-located with other utility transforms. |
| Edge function deps | `supabase/functions/deno.json` | New file; function-dir-wide so all edge functions resolve `zod` to the same version. |

---

## Decision 4 — Edge function dependency strategy

Add `supabase/functions/deno.json` with:

```json
{
  "imports": {
    "zod": "npm:zod@3.24.0"
  }
}
```

Edge functions import as `import { z } from 'zod';` — the `deno.json` resolves the bare specifier to the npm package. **Verification at PR 1 Task 1.0 task-time:** boot `supabase functions serve process-submission` locally and confirm zod resolves without import errors.

**Fallback if `npm:` doesn't resolve in Supabase Edge Runtime** (low likelihood; npm specifier is supported in modern Deno + Supabase Edge): switch to URL imports `https://esm.sh/zod@3.24.0` per-file inside edge functions. Document the fallback in the Task 1.0 commit message if used.

---

## Decision 5 — Cross-runtime equivalence test

**Approach: Vitest test asserts `enums.json` matches the canonical Zod source.** Python equivalence is asserted separately by whatever repo hosts the Stage 2 batch code (TBD at PR 6+ time — could be in-repo under `scripts/stage2-tagger/` or in the v3 repo with `enums.json` consumed as a fixture).

**Vitest test (this repo):**
- `src/types/generated/enums.json.test.ts` — imports the canonical Zod schema (`lessonMetadata.zod.ts`), walks each closed-enum field's `._def.values`, builds an in-memory map, asserts `JSON.stringify(generated) === JSON.stringify(committed enums.json)`.
- Runs as part of `npm run test`; fails CI if the committed file is stale.
- Effectively replaces a separate "is enums.json up-to-date" CI step.

**Python equivalence (deferred to Stage 2 batch host repo):**
- Python script imports `enums.json` (treats it as the source of truth for closed-enum vocabulary), walks Pydantic model classes, asserts each closed-enum field's `Literal[...]` / `field_validator` enforces exactly the values in `enums.json`.
- Lives wherever the Pydantic code lives (TBD per PR 6+ scope).
- Why deferred: Stage 2 batch infrastructure isn't built yet in foundation phase; locking the Pydantic test-host now would prejudge the in-repo-vs-sibling-repo decision. The contract is what's load-bearing (Pydantic mirrors `enums.json`), not where the test runs.

**Sync discipline:** Zod is the source of truth. Generator script (`generate-enums-json.ts`) is the only writer of `enums.json`. Pydantic models import `enums.json` as JSON fixtures (Pydantic supports `Literal[*VALUES]` via `from typing import Literal; VALUES = json.load(open("enums.json"))["activity_type"]`); they don't duplicate the enum lists in Python source.

---

## Decision 6 — SQL CHECK + trigger value-validation sketch

**PR 1 adds three column-level CHECK constraints** (short, stable enums on text[] columns):

```sql
ALTER TABLE lessons ADD CONSTRAINT valid_activity_type
  CHECK (activity_type IS NULL OR activity_type <@ ARRAY['cooking','garden','both','academic','craft']::text[]);

ALTER TABLE lessons ADD CONSTRAINT valid_tags
  CHECK (tags IS NULL OR tags <@ ARRAY['orientation','bilingual_handouts']::text[]);

ALTER TABLE lessons ADD CONSTRAINT valid_cultural_responsiveness_features
  CHECK (cultural_responsiveness_features IS NULL OR cultural_responsiveness_features <@ <7-element-array>);
```

The existing `valid_seasons` pattern (baseline:line N) is the precedent.

**Trigger value-validation extension (PR 1 Task 1.6 follow-on):** extend `lessons_normalize_write_trg` to also assert that JSONB-embedded enum values in the canonical metadata keys (`metadata->'activityType'`, `metadata->'tags'`, etc.) belong to their canonical enums. RAISE EXCEPTION on violation (not RAISE NOTICE — value-validation is hard-fail, not warn). Use the same `<@` set-containment idiom against PL/pgSQL constants.

**Why both CHECK + trigger:** CHECK guards the column (text[] arrays); trigger guards the JSONB-embedded copy. The lessons_normalize_write_trg already enforces shape-equality between the two, so a value-violation caught on either side fails the write — defense-in-depth without duplication of the column⇄metadata sync logic.

**SQL sync discipline (the meta-rule):** SQL constants are **hand-synced** from `enums.json`. To prevent drift:
- Each CHECK constraint and trigger constant has a **comment line** quoting its `enums.json` key (e.g., `-- SOURCE: enums.json["activity_type"]`).
- A Vitest test (`src/types/generated/enums.json.sql-sync.test.ts`) reads the relevant migration file(s), regex-extracts the `ARRAY['…','…']` literals tagged with `-- SOURCE: enums.json["<key>"]`, asserts they match the JSON.
- Why string match (not parsing pg_constraint live): foundation phase doesn't pull live DB state into CI tests; the migration files are the canonical SQL source on disk. Live-DB drift is caught at TEST DB verification time (per `feedback_per_round_test_db_verification.md`).

---

## Decision 7 — Initial closed-enum coverage in PR 1 scaffold

**Closed-enum (Zod uses `z.enum([...])`):**
- `activity_type` — 5 values (cooking, garden, both, academic, craft) — D2
- `tags` — 2 values (orientation, bilingual_handouts) — D2 + D7
- `cultural_responsiveness_features` — 7 master-list features — D9
- `season_timing` — 4 values (Fall, Winter, Spring, Summer) — pre-existing valid_seasons CHECK precedent

**Open-string-array (Zod uses `z.array(z.string())`) — placeholder, tightens to closed enum as Stage 1 worksheets land:**
- `thematicCategories`, `culturalHeritage`, `coreCompetencies`, `socialEmotionalLearning`, `cookingMethods`, `cookingSkills`, `gardenSkills`, `mainIngredients`, `observancesHolidays`, `gradeLevels`, `locationRequirements`, `academicConcepts` (D5; new key)

**Single-string fields (`lessonFormat`, `duration`, `groupSize`, `processingNotes`, `summary`):** Zod uses `z.string().optional()`. `lessonFormat` drops in PR 1 D3.

PR 5+ tightens the open-string placeholders to closed enums per Stage 1 worksheet outputs.

---

## CI gate summary

| Gate | What it asserts | Where it runs |
|---|---|---|
| `npm run test -- enums.json.test` | Zod source ↔ committed `enums.json` match | Vitest, every PR |
| `npm run test -- enums.json.sql-sync.test` | `enums.json` ↔ migration-file SQL constants match | Vitest, every PR |
| `schema.parse(input)` at write surfaces | Runtime enforcement on every metadata write | Edge functions + ReviewDetail save + scripts |
| Pydantic equivalence (Stage 2 host repo) | Pydantic models ↔ `enums.json` match | TBD per PR 6+ scope |
| Live SQL CHECK enforcement | Column writes fail for non-canonical values | PostgreSQL, runtime |
| Trigger value-validation | JSONB writes fail for non-canonical values | `lessons_normalize_write_trg`, runtime |

---

## Open TBDs (deferred — not blocking PR 1)

1. **Stage 2 batch host repo location** — in-repo (`scripts/stage2-tagger/`) vs sibling-repo (v3-style). Decided at PR 6+ scope. Affects Decision 5's Python equivalence test location. `enums.json` is the contract regardless.
2. **Whether to migrate from `complete_review_atomic` SQL translation to TS-side mappers** as the source of truth for review-form↔canonical conversion. Phase 2 reviewer-UX decision; foundation phase keeps both (SQL is the runtime authority; TS mappers mirror it for read-site display + LLM-draft canonical-keys workflow). The mapper round-trip tests in PR 1 Task 1.0 protect against drift.
3. **Pydantic auto-generation from `enums.json`** vs hand-mirror with json-import. Recommended at PR 6+ time: Pydantic uses `Literal[*VALUES]` with values loaded from `enums.json` at module import — eliminates the hand-mirror step entirely. Document the pattern when Stage 2 batch ships.

---

## Implementation handoff

Gate B output is captured. The actual scaffold code lands as PR 1 Task 1.0 per impl plan §1.0:
- Two Zod schemas + two mappers + mapper tests
- `enums.json` (initial generation) + generator script
- `package.json` zod install + `npm run generate:enums` script
- `supabase/functions/deno.json` zod resolution
- Vitest equivalence tests (enums.json freshness + SQL sync)

Decisions in this doc are **not** pre-emptively committed as code in Gate B itself; they ship inside PR 1 with the rest of the structural-schema work.
