# Metadata Rebuild — Foundation Phase — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Ship the foundation-phase substrate of the metadata rebuild — schema + vocabulary canonicalization + LLM submission-time auto-tag pipeline + corpus refresh + import-drop cleanup — that downstream Stage 1 worksheet validation, Stage 2 corpus re-tag, and Phase 2 reviewer UX work all depend on.

**Architecture:** D0's hybrid frame (foundation-now / reviewer-UX-later). Code track ships schema + pipeline + cleanup before D4 vocab canonicalization migrates (which gates on Stage 1 worksheet outputs). Stage 2 corpus re-tag follows D4. Two parallel tracks: code (this plan) and curriculum-team-driven worksheet round.

**Design reference:** `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md`. Read it before starting any task. Decision journal (authoritative WHY): `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md`.

**Tech Stack:** TypeScript / React 19 / Vite (frontend), Supabase / PostgreSQL (database), Deno (edge functions), Vitest + Playwright (testing), Anthropic SDK + Pydantic (LLM tagging pipeline; Pydantic via Python adapter from `/Users/danfeder/cCode/taggingv3/gpt_tagger/`).

**Sub-skills to invoke (per phase):**
- `superpowers:test-driven-development` — every code-bearing task is test-first
- `superpowers:verification-before-completion` — before claiming any task done, run the verification commands in that task's "Verify" step
- `superpowers:requesting-code-review` — between PRs (after PR 1, after PR 2, etc.)
- `database-migrations` — before touching any file in `supabase/migrations/` (mandatory)

**Per-PR ritual (mandatory, every PR):** see kickoff prompt's HARD RULES → PER-PR RITUAL section. Eight steps, four-surface comment triage, per-round TEST DB re-verification, round-cap after 2 rounds.

**How to use this plan:**
- Each task has: ID, file paths, anchor symbols, code snippets, test commands, commit message template.
- Execute in order unless explicitly noted as parallelizable.
- Verify every snippet against the current code before applying — line numbers, imports, types, prop names, and APIs may have drifted since the plan was written. Small repo-conformance adaptations are allowed; product or design changes require stopping to ask.
- **Tasks marked TBD** depend on Stage 1 worksheet outputs or implementation-time decisions; expand them when the dependency lands.

## PR breakdown

| PR | Title | Contains | Notes |
|---|---|---|---|
| 1 | **Structural schema** | D2 enum + D3 column drop + D6 series_id/part_number + D7 tags enum + D9 crf_confirmed + filter UI sidebar updates | Largest blast radius; ships first because pipeline depends on column existence. Idempotent migration. Forward-rollback ready. |
| 2 | **Submission-time LLM auto-tag pipeline** | `process-submission` edge function expansion; eval-gate harness; ~10 field-specific Opus prompts (D5 + D9 + ~8 high-fit) | Per-prompt eval gates before each prompt goes live. |
| 3 | **Search infrastructure (D5)** | `search_vector` rebuild including academicConcepts; `search_synonyms` population; embedding generation script update; smart-search drift resolution | Independent of PR 4+. |
| 4 | **Corpus drops + N1 retitle** | 23 third-party-curriculum imports retired; FSA retitle | Pre-Stage-2 sequencing. |
| 5+ | **D4 vocab canonicalization** | Per-field canonical translation; Pydantic validators tightened across all 17 fields | TBD — depends on Stage 1 worksheet outputs (heritage first, then concepts, then ~8 smaller fields). |
| 6+ | **Stage 2 corpus re-tag** | Opus re-tag pipeline; Pydantic-validated all 17 fields; corpus run on ~749 lessons; spot-check protocol | TBD — depends on PR 5 + Stage 1 closure. Flexible timing per Cross-cutting Scope 3. |

---

## PR 1 — Structural schema

**Branch:** `feat/metadata-foundation-schema`

**What ships:** Schema migration adding `series_id` + `part_number` + `crf_confirmed` columns; dropping `lesson_format` column + 9 JSON-path indexes; rewriting `metadata` JSONB to remove `lessonFormat` key; expanding `activity_type` enum (in code) to 5 values including `craft`; expanding `tags` closed enum (in code) to `["orientation", "bilingual_handouts"]`; locking `cultural_responsiveness_features` enum to the 7 master-list features. Filter UI sidebar updated: lessonFormat section removed; "Lesson Type" tag-based filter added; Activity Type 5-value list.

**Why this is its own PR:** Schema-only change. Largest blast radius (touches 9 JSON-path indexes + JSONB rewrite). Pipeline (PR 2) and search infra (PR 3) depend on these columns existing. Forward-rollback migration ready before merge.

**Pre-flight: read these files first to verify current shape (line numbers may have drifted):**
- `supabase/migrations/CLAUDE.md` (entire — migration discipline)
- `src/utils/filterDefinitions.ts` (entire — filter declarations)
- Recent migrations affecting `lessons` / `metadata`: `ls supabase/migrations | tail -20`
- v3 taxonomy reference: `/Users/danfeder/cCode/taggingv3/esynyc-taxonomy-schema-v2.md`
- Decision journal D2 / D3 / D6 / D7 / D9 sections

### Task 1.1: Pre-migration corpus verification (TEST DB)

**Sub-skill:** none (read-only)

**Goal:** Confirm corpus shape matches what the design assumes before writing the migration. Catch any post-walkthrough drift.

**Steps:**
1. Verify `lessons.lesson_format` column is unused in any UI surface beyond what the foundational report enumerates (`IntCard` activity pill is skills-derived per L420; drawer/`IntLessonDetail` doesn't render lesson_format per L424; cosmetic L595 confirms not rendered). Run `grep -r "lesson_format\|lessonFormat" src/ supabase/functions/` and triage every hit.
2. Verify activity_type column shape and current value distribution via `mcp__supabase-test__execute_sql` — confirm text[] storage; single-element on populated rows; no rows currently use `craft`.
3. Verify `tags` column is unused in production data via `mcp__supabase-test__execute_sql` — confirm null/empty on (almost) every row.
4. Verify `cultural_responsiveness_features` current shape and distribution.
5. Snapshot the 9 JSON-path indexes referencing lessonFormat: `select indexname, indexdef from pg_indexes where indexname ~ 'lessonFormat' or indexdef ~ 'lessonFormat';` → save count to status doc.

**Verify:** all hits have a documented disposition (drop / migrate / leave). Status doc updated with corpus shape evidence.

**No commit** — investigation only.

### Task 1.2: Migration file (additive: series_id + part_number + crf_confirmed)

**Sub-skill:** `database-migrations` (mandatory)

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_metadata_foundation_schema_additive.sql`

**Approach:**
1. `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS series_id text` (default NULL).
2. `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS part_number int` (default NULL).
3. `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS crf_confirmed boolean DEFAULT false NOT NULL`.
4. `CREATE INDEX IF NOT EXISTS lessons_series_id_idx ON lessons(series_id) WHERE series_id IS NOT NULL`.
5. `CREATE INDEX IF NOT EXISTS lessons_part_number_idx ON lessons(part_number) WHERE part_number IS NOT NULL`.
6. Idempotent (every statement IF NOT EXISTS).

**Verify locally:**
```bash
supabase db reset
supabase db diff
```

**Commit:**
```bash
git add supabase/migrations/*_metadata_foundation_schema_additive.sql
git commit -m "feat(metadata-foundation): add series_id, part_number, crf_confirmed columns

D6 series modeling + D9 CRF backend marker. Additive only; no data migration.
See docs/plans/2026-05-03-metadata-rebuild-foundation-design.md §4."
```

### Task 1.3: Migration file (drop: lesson_format column + indexes + JSONB key)

**Sub-skill:** `database-migrations` (mandatory)

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_drop_lesson_format.sql`

**Approach:**
1. Drop the 9 JSON-path indexes referencing `lessonFormat` (use the snapshot from 1.1).
2. `UPDATE lessons SET metadata = metadata - 'lessonFormat'` to strip JSONB key.
3. `ALTER TABLE lessons DROP COLUMN IF EXISTS lesson_format`.
4. Forward-rollback migration prepared as a sibling `.sql.rollback` file (re-add column nullable; re-create indexes; metadata key restoration not feasible without snapshot — accepted).

**Verify locally:**
```bash
supabase db reset
mcp__supabase-test__execute_sql: SELECT count(*) FROM lessons WHERE metadata ? 'lessonFormat';  -- expect 0
mcp__supabase-test__execute_sql: SELECT count(*) FROM information_schema.columns WHERE table_name='lessons' AND column_name='lesson_format';  -- expect 0
```

**Commit:**
```bash
git add supabase/migrations/*_drop_lesson_format.sql
git commit -m "feat(metadata-foundation): drop lesson_format column + 9 JSON-path indexes + JSONB key

D3 — drop the lessonFormat field entirely. No replacement, no derivation.
Three axes (time-structure / standalone-vs-unit / mobile-delivery) lost their
case independently. See decision journal D3 + design doc §4."
```

### Task 1.4: Filter UI updates (frontend)

**Files:**
- Edit: `src/utils/filterDefinitions.ts` — remove `lessonFormat` filter section; expand Activity Type to 5 values; add new "Lesson Type" tag-based filter section starting with `["orientation", "bilingual_handouts"]`; rename/migrate `academic-cooking` slug.
- Edit: any sidebar component that hardcodes `lessonFormat` references.
- Edit: `src/components/CLAUDE.md` if filter category guidance needs updating.

**Verify:** `npm run type-check && npm run lint`; manual smoke: filter sidebar renders without lessonFormat; Activity Type shows 5 values; Lesson Type filter visible with 2 tags.

**Commit:** consolidated frontend filter updates.

### Task 1.5: Closed-enum constants (code-level vocabulary)

**Files:**
- Edit / create: TypeScript closed-enum constants for `activity_type` (5 values), `tags` (orientation, bilingual_handouts), `cultural_responsiveness_features` (7 master-list features). <!-- TBD: confirm whether to live in `src/types/` or alongside filterDefinitions -->

**Verify:** type errors surface for any value not in the enum at every write surface.

**Commit:** consolidated.

### Task 1.6: PR ritual

Per the kickoff prompt's PER-PR RITUAL. After bot-review rounds settle, merge → wait for production migration approval → verify PROD via `mcp__supabase-remote__execute_sql` (column shapes, index drop, JSONB key absence).

---

## PR 2 — Submission-time LLM auto-tag pipeline

**Branch:** `feat/metadata-foundation-llm-tagging`

**What ships:** `process-submission` edge function expanded with an Opus-based async tagging step. ~10 field-specific prompts (D5 academicConcepts + D9 cultural_responsiveness_features + ~8 high-fit reviewer-supplied fields TBD at impl time). Per-prompt eval-gate harness with labeled hold-out evaluation. Drafts populate canonical fields on the submission row; reviewer surfaces them in existing ReviewDetail.tsx (Phase 2 redesigns the picker UI).

**Pre-flight:**
- Read `supabase/functions/process-submission/index.ts` (entire) — current async submission processing.
- Read `supabase/functions/CLAUDE.md` — edge function patterns.
- Read v3 prompt patterns: `/Users/danfeder/cCode/taggingv3/gpt_tagger/` — adapt to Anthropic SDK.
- Read decision journal D5 (lines 244-285), D9 (lines 423-491), D8 phase-2 → "extend to ~10 fields" note (lines 416).

### Task 2.1: Identify the ~10 high-fit fields

<!-- TBD: at implementation time, surface candidate field list from D5 + D9 + ~8 more. Filtering rule: "closed vocab from D4 + body signal present, NOT marginal fields like grade_levels / location." Verify each candidate against design doc §6. -->

**Output:** A field-by-field list with vocabulary source, expected body-signal, and a sample-size estimate for the eval gate.

### Task 2.2: Eval-gate harness

**Goal:** Build a labeled hold-out evaluation harness that runs per prompt before the prompt ships. Drop or rewrite any prompt that doesn't clear the gate.

**Files:**
- Create: `scripts/eval-llm-tagging-prompt.ts` (or similar). Inputs: prompt text + labeled sample. Outputs: precision/recall metrics per closed-enum value.

**Verify:** dry-run on a known v3 batch with v3 vocab; confirm metrics match v3's known accuracy.

### Task 2.3: First prompt (academicConcepts — D5)

**Goal:** Ship the academicConcepts prompt as the canonical reference implementation; remaining ~9 prompts mirror its shape.

**Files:**
- Edit: `supabase/functions/process-submission/index.ts` — add Opus call, prompt, output validation, write to submission row.
- Create: prompt file (location TBD — likely `supabase/functions/process-submission/prompts/academic-concepts.md` or similar).

**Eval gate:** run on labeled hold-out. If metrics clear threshold, deploy. Otherwise iterate on prompt and re-run.

**Verify (TEST DB):** submit test lesson with concept-rich body; confirm draft tags populate; reviewer queue surfaces them.

**Commit:**
```bash
git commit -m "feat(metadata-foundation): submission-time academicConcepts auto-tag (D5)

Opus extracts framework + everyday-vocab tags from body content; reviewer
validates inline. Eval-gate metrics: <gate output>. See design doc §6."
```

### Task 2.4: Second prompt (CRF — D9)

Same shape as 2.3. Body CR section parsed; matched against 35 master-list example practices; drafts the corresponding 7-feature tags. Older lessons (no body CR section) bypass auto-tag. Set `crf_confirmed = false` on draft.

### Tasks 2.5 - 2.N: Remaining ~8 high-fit field prompts

<!-- TBD: one task per field, each gated by eval evaluation. -->

### Task 2.N+1: PR ritual

Standard.

---

## PR 3 — Search infrastructure (D5)

**Branch:** `feat/metadata-foundation-search-infra`

**What ships:** `search_vector` rebuild including `academicConcepts`; `search_synonyms` population from concept-tag pairs (Stage 2 will populate further; foundation-phase seeds the table); `scripts/generate-embeddings.mjs` updated to include concepts; smart-search-vs-DB-synonyms drift resolution.

**Pre-flight:**
- Read `supabase/functions/smart-search/index.ts` — note the TS hardcoded synonym list at lines 18-75.
- Read `scripts/generate-embeddings.mjs` — currently includes themes / heritage / skills / ingredients but not concepts.
- Read decision journal D5 deferred sub-questions (lines 264-274) — drift resolution options.

### Task 3.1: Decide smart-search drift resolution

<!-- TBD at implementation time: option A — populate both layers (TS hardcoded mirrors DB); option B — refactor smart-search to read from `search_synonyms` table at request time; option C — hybrid. Decision lands here in the impl plan, not at task execution. -->

### Task 3.2: search_vector regeneration migration

**Sub-skill:** `database-migrations`

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_search_vector_with_concepts.sql`

**Verify (TEST DB):** FTS query for a known academic concept hits matching lesson rows.

### Task 3.3: search_synonyms seeding

**Files:**
- Create: `supabase/migrations/<YYYYMMDDHHMMSS>_seed_search_synonyms_from_concepts.sql` <!-- TBD: full seed lands at Stage 2; foundation-phase seeds with placeholder set -->

### Task 3.4: Embedding generation script update

**Files:**
- Edit: `scripts/generate-embeddings.mjs` — add `academicConcepts` to the embedded text.
- Re-run on TEST corpus; confirm vectors regenerate.

### Task 3.5: Smart-search drift fix

Per Task 3.1's decision.

### Task 3.6: PR ritual

Standard.

---

## PR 4 — Corpus drops + N1 retitle

**Branch:** `feat/metadata-foundation-corpus-cleanup`

**What ships:** 23 third-party-curriculum imports retired (per `project_imported_non_esynyc_drops.md` — soft-delete approach TBD); FSA retitle (drop "& 2"; ~10 minutes).

**Pre-flight:**
- Read `project_imported_non_esynyc_drops.md` for full lesson_id list and per-row evidence.
- Read decision journal "Cross-cutting: imported non-ESYNYC-format curriculum drops" (lines 530-571) and "Cross-cutting: N1 multi-lesson-per-doc packing" (lines 495-528).
- Confirm Phase 6.2 §4D pre-delete checklist (per memory's hygiene-follow-ups note): for any DELETE FROM lessons, check FK refs INTO the row + `lessons.original_submission_id` ON the row.

### Task 4.1: Soft-delete approach decision

<!-- TBD: status flag (`retired_at timestamp`?) vs archive table vs hard-delete with content-preserving Drive folder backup. Decision: pre-Stage-2 hide-from-search before delete; preserve linked user state. -->

### Task 4.2: Apply pre-delete checklist for each of 23 lessons

For every lesson_id in the drop list:
1. FK refs INTO the row from bookmarks / canonical_lessons / duplicate_resolutions / lesson_archive / lesson_submissions / lesson_versions / collections+dismissals arrays / submission_reviews+_archive / submission_similarities.
2. FK ref OUT FROM the row via `lessons.original_submission_id`.
3. Document mitigation per row.

### Task 4.3: Migration applying the cleanup

<!-- TBD: shape depends on 4.1 -->

### Task 4.4: FSA retitle

**Files:**
- Migration: `UPDATE lessons SET title = '<new title>' WHERE id = '<FSA lesson_id>'`. Read decision journal N1 lines 495-528 for current vs target title.

### Task 4.5: PR ritual

Standard. PROD MCP verification mandatory after every applied migration.

---

## PR 5+ — D4 vocab canonicalization

**Status:** TBD — depends on Stage 1 worksheet outputs (heritage first, concepts second, ~8 smaller fields).

**Pre-flight when picking up:** confirm worksheet outputs in hand for the field(s) being canonicalized; verify alias map covers every variant in the corpus (worksheet round produces exhaustive variant capture).

<!-- TBD: per-field migration template (canonical translation) + Pydantic validator tightening + per-field commit. Split per-field or all-at-once based on worksheet timing. -->

---

## PR 6+ — Stage 2 corpus re-tag

**Status:** TBD — depends on PR 5 + Stage 1 closure. Timing intentionally flexible per Cross-cutting Scope 3.

**Approach:**
1. Adapt `/Users/danfeder/cCode/taggingv3/gpt_tagger/` Python infrastructure: swap OpenAI for Anthropic; extend Pydantic validators to all 17 fields.
2. Run on post-drop ~749-lesson corpus.
3. Spot-check ~50-100 sampled lessons (sampling protocol TBD: random / stratified-by-activity-type / targeted-at-audit-found).
4. Re-tag DIFF view vs. fresh-tag review (TBD).
5. Cost ~$200-300; 1-2 sessions of pipeline engineering.

<!-- TBD: full plan when prerequisites land. -->

---

## Test plan

### Unit
- Pydantic validators on all 17 fields — happy path + every closed-enum value + every drift variant from corpus audit.
- TypeScript closed-enum constants (`activity_type`, `tags`, `cultural_responsiveness_features`) — type errors surface for invalid values at every write surface.
- Filter definition updates — sidebar renders 5-value Activity Type, tag-based Lesson Type filter, no lessonFormat section.

### Integration
- `process-submission` edge function — submit lesson with full body content → LLM auto-tag drafts populate ~10 fields; reviewer queue surfaces them.
- Eval-gate harness — labeled hold-out runs per prompt; pass/fail logged.
- `search_vector` regeneration — FTS query for known concept hits matching rows.
- `search_synonyms` query expansion — `smart-search` returns expanded synonym matches.

### E2E
- Submit lesson → reviewer queue → reviewer sees LLM-drafted tags → reviewer validates → publish.
- Filter sidebar: Activity Type 5-value selection; Lesson Type tag filter (orientation, bilingual_handouts); lessonFormat filter absent.
- Series-aware dedup (post-PR 1, dedup pipeline reads `series_id`): submit a Pt 2 lesson with metadata identical to existing Pt 1; confirm dedup does NOT flag (skip-comparison logic).

### RLS
- No RLS changes in foundation phase; `npm run test:rls` must pass unchanged.

### Manual smoke checklist (per `superpowers:verification-before-completion`)
- After PR 1: TEST DB column shapes verified via MCP; deploy preview filter UI verified; lesson detail renders without lessonFormat. PROD verification after migration approval.
- After PR 2: TEST submission writes drafted tags; reviewer queue surfaces them; eval-gate logs persist. PROD verification of edge function deploy via `mcp__supabase-remote__get_edge_function`.
- After PR 3: smart-search query in TEST returns expanded synonym results; embedding regeneration confirmed.
- After PR 4: 23 imports + FSA retitle verified in TEST; FK references handled; PROD verification after merge.
- After PR 5+ / 6+: spec'd at implementation time per dependent worksheet round.
