# Metadata Rebuild — Foundation Phase — Design Document

**Date:** 2026-05-03
**Status:** Design approved (decisions locked through walkthrough sessions 1-9); ready for implementation planning.
**Related:**
- `docs/plans/2026-04-30-metadata-rebuild-foundational-report.md` — corpus audit + ground-truth findings
- `docs/plans/2026-04-30-metadata-rebuild-stakeholder-brief.md` — pristine 10-card stakeholder brief
- `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions.md` — pristine decisions doc
- `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` — **decision journal (authoritative WHY for every locked decision; per-card "Decision" + "Reasoning" + "Downstream implications" blocks)**
- `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/project_metadata_rebuild_initiative.md` — project memory entry tracking the initiative

---

## 1. Why this exists

The lesson corpus has three metadata regimes (legacy ~684 / submission-era ~78 / post-B-update ~7) with different field-name and shape conventions, ~4,920 row-appearances of vocabulary drift across 10 fields, a `lessonFormat` field that conflates three orthogonal axes (time-structure × delivery-mode × context-independence), and ghost rows in three populations. 87% of corpus tags came from a 2025-07-10 v3 GPT-4.1 batch tagging run that never went through a reviewer. v3 enforced Pydantic enums on only 3 of 17 fields — the other 14 drifted under prompt-only constraints.

The audit-found judgment errors in PROD (cosmetics-craft tagged "cooking", grades 3K-8 on stovetop, immigration-stories on African American foodways, CRF rubber-stamping with verbatim-identical 7-element lists) are GPT-4.1's judgment errors on un-reviewed imports, not vocabulary drift and not reviewer judgment errors (per session 9 audit-attribution check). Mechanical drift→canonical translation alone doesn't fix them. **The fix is canonical vocabulary + Opus re-tag with Pydantic on all 17 fields + structural schema rebuild + submission-time LLM auto-tag pipeline so new submissions don't accumulate the same drift.**

This is the **foundation phase** of D0's hybrid frame: schema + vocabulary + three-regime unification + new fields, designed as one coherent layer. **Phase 2 (later)** is reviewer UX redesign + any submitter-side changes. The split is justified because D8 settled teacher-zero in service of D0 — the schema doesn't need to encode submitter-authorship distinctions, removing the schema-coupling that would otherwise force a single window. 2 expert reviewers on staff make Phase 2 cheap to iterate.

## 2. Failure modes the rebuild must close

1. **Vocabulary drift across 10 fields** (~4,920 row-appearances; 36% of corpus affected). `cooking_skills` has 123 distinct values for ~30 real concepts. Title Case mixed with kebab-lowercase across the corpus. **Bar:** every vocabulary-bearing field is Pydantic-validated against a closed canonical enum before write.
2. **Three metadata regimes diverge structurally** — different field names (`gradeLevel` vs `gradeLevels`), different embedded sub-shapes (`academicIntegration` object vs array). **Bar:** Stage 2 corpus re-tag normalizes all rows to a single canonical shape; submission pipeline writes only canonical shape going forward.
3. **`lessonFormat` conflates three orthogonal axes.** **Bar:** field dropped entirely (no replacement, no derivation); axes handled separately (D6 sequences for unit-tying, title convention for mobile, time-structure dropped entirely).
4. **Submission flow generates uncanonical metadata.** No tags on submission means reviewer is sole authority but also sole tagger from scratch. **Bar:** submission-time LLM auto-tag drafts canonical-vocabulary tags from body content for ~10 high-fit reviewer-supplied fields; reviewer validates inline (Phase-2 picker UI redesign deferred).
5. **23 wholesale third-party curriculum imports masquerade as ESYNYC lessons.** **Bar:** drop them; Stage 1 worksheets and Stage 2 re-tag operate on the post-drop corpus of ~749.
6. **Audit-cited "reviewer judgment errors" can't be solved by tooling without verifying provenance.** Per session-9 investigation, those errors are inherited v3 batch tagging on never-reviewed lessons. **Bar:** corpus refresh (D4 + Scope 3) automatically fixes them; reviewer-tooling redesign defers to Phase 2 with empirical evidence in hand.

## 3. The chosen shape: foundation-now / reviewer-UX-later (D0 hybrid)

Foundation phase = one coherent layer of schema, vocabulary, pipeline, and corpus refresh. Phase 2 = reviewer UX redesign (separate window, after foundation lands).

```
┌────────────────────────────────────────────────────────────────────────┐
│                       FOUNDATION PHASE (this design)                    │
├──────────────┬─────────────────────┬──────────────┬────────────────────┤
│   Schema     │     Vocabulary      │   Pipeline   │   Corpus refresh   │
│              │                     │              │                    │
│ D2 craft     │ D4 Title Case       │ D5 LLM auto- │ Stage 1 worksheets │
│ D3 drop fmt  │ canonical, 10 flds  │ tag for      │ (~10 fields, on    │
│ D6 series_id │ Pydantic on all 17  │ academic-    │ curriculum team)   │
│ D7 biling.   │ Stage 1 worksheets: │ Concepts at  │                    │
│ tags         │ v3 baseline +       │ submission   │ Stage 2 re-tag     │
│ D9 CRF +     │ curriculum-team-    │ D9 CRF auto- │ (~749 lessons,     │
│ crf_         │ validated           │ tag at sub-  │ Opus, Pydantic     │
│ confirmed    │                     │ mission      │ all-17, after      │
│ N1: FSA      │                     │ ~10 high-fit │ Stage 1 lands)     │
│ retitle      │                     │ field auto-  │                    │
│ 23 import    │                     │ tag prompts  │ search_synonyms    │
│ drops        │                     │ (per-prompt  │ populated from     │
│              │                     │ eval gates)  │ academicConcepts   │
└──────────────┴─────────────────────┴──────────────┴────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASE 2 (deferred, separate)                     │
│                                                                        │
│  Reviewer UX redesign (Stage 2 batch validation flow + concepts/CRF    │
│  pickers + LLM-draft accept/edit/reject UI + reviewer guidance text)   │
│  Marginal-field LLM prompts (grade_levels, location)                   │
│  Dedup-pipeline third-state mechanism (separate work track)            │
│  CRF UI surfacing (sidebar / badge / silent)                           │
└────────────────────────────────────────────────────────────────────────┘
```

**Two parallel foundation-phase tracks** (different work-shape, mutually gating):

- **Code track** (this design's primary scope): schema migrations, edge function expansion, search infra, corpus drops, retitle.
- **Worksheet track** (curriculum-team-driven, parallel): Stage 1 per-field canonical worksheets — heritage first (~78 values), concepts second (~211 values, biggest), then ~8 smaller fields. Methodology = v3 baseline + Opus-corpus-read evidence column + reviewer + user validate. Output gates D4 canonicalization migration + Stage 2 re-tag prompt design.

Code track ships schema + pipeline first; vocab-canonicalization migration + Stage 2 re-tag wait on worksheet outputs. Stage 2 timing is intentionally flexible (decision: Cross-cutting Scope 3 in walkthrough doc).

### Why foundation-now / reviewer-UX-later

| Option | Why rejected |
|---|---|
| **Refine** (incremental fixes within current shape) | Pain is interlocking (3 regimes + cross-field drift + lessonFormat conflation), not local; refining piecemeal would migrate the corpus multiple times as later decisions land. Ruled out at D0. |
| **Rebuild** (single window covering schema + reviewer UX) | D8 teacher-zero removed schema-coupling to submitter authorship; phase 2 reviewer UX is cheap to iterate with 2 expert reviewers in the room; risk-splitting across two phases of different shapes is materially safer. Ruled out at D0. |
| **Hybrid (chosen)** | Schema decoupled from reviewer UI; foundation phase ships one coherent migration sweep; Phase 2 iterates on reviewer surfaces with foundation already proven in PROD. |

## 4. Schema changes (locked)

All schema changes ship in the structural-schema PR. **D4 vocabulary canonicalization is a separate later migration** that depends on Stage 1 worksheet outputs; structural changes can ship before worksheets land.

**Add columns:**
- `lessons.series_id text` (nullable, default NULL, indexed) — D6
- `lessons.part_number int` (nullable, default NULL, indexed) — D6
- `lessons.crf_confirmed boolean default false` — D9 backend-only marker

**Drop columns / keys:**
- `lessons.lesson_format` column — D3
- `metadata.lessonFormat` JSONB key (data migration / rewrite metadata column) — D3
- 1 JSON-path index `idx_lessons_format` (on `metadata->>'lessonFormat'`) + 1 column-based index `idx_lessons_lesson_format` — D3
- `_alias_lesson_format` runtime helper (becomes dead code) — D3

**lessonFormat removal — coordinated cross-surface sweep required.** Dropping the column without coordinated changes to dependent surfaces breaks the runtime. The PR-1 migration must coordinate with: `lessons_with_metadata` view (CREATE OR REPLACE — otherwise smart-search 5xx's); 4 RPCs that reference the column (`search_lessons`, `complete_review_atomic`, `get_lesson_details_for_review`, `archive_duplicate_lesson`); `lessons_normalize_write_trg` trigger (rewrite to drop column⇄metadata sync for lessonFormat); `_alias_lesson_format` helper drop; `_shared/search-helpers.ts` (3 references); ~30 TypeScript surfaces (`LessonMetadata.lessonFormat` and `SearchFilters.lessonFormat` are non-optional); duplicate-review subsystem (separate column appearance via duplicate-detection RPC); `lesson_archive.lesson_format` column decision (keep historical vs drop); `supabase/seed.sql`; `database.types.ts` regen; ~6 test fixture files. See implementation plan PR 1 for per-surface task breakdown; the comprehensive sweep is **pre-PR-1 Gate A**.

**Vocabulary expansions (closed-enum changes in code; data left unchanged at this stage):**
- `activity_type` enum: 4 values (`cooking / garden / academic / craft`); **multi-select** — D2 + D2.1 (refined 2026-05-06; `both` retired in PR 1b, replaced by `[cooking, garden]`).
- `tags` closed enum: from `[]` (empty allowed-values list, column unused) → `["orientation", "bilingual_handouts"]` — D2 + D7
- `cultural_responsiveness_features` enum locked to the 7 master-list features (Brown CR framework) — D9

**Filter UI changes (sidebar):**
- `lessonFormat` filter section removed — D3
- New "Lesson Type" tag-based filter section, starting with `orientation` and `bilingual_handouts` — D2 + D7
- Activity Type filter: 4-value multi-select chip group (`cooking-only / garden-only / academic-only / craft-only`); old `'both'` chip retired in PR 1b — teachers select cooking-only + garden-only simultaneously to get the previous behavior — D2 + D2.1

### Schema items dropped from prior session drafts

- **No `lesson_function` general field** — over-engineering for one confirmed value (orientation). D2.
- **No `school_id` column / `schools` table** — site identity stays in title; "valid variations" principle. D7.4.
- **No `mobile_ed_adaptation` boolean** — title convention + dedup-pipeline handle Mobile Ed externalized siblings. D7.5.
- **No `dish_canonical` field** — dedup-pipeline third-state memory mechanism handles same-dish-different-lesson; not metadata. D7.3.
- **No `parent_lesson_id` / `relationship_kind`** — corpus stays a flat collection; lesson-to-lesson cross-references essentially don't exist (1-2 in 772 rows). D7 net.
- **No `is_multi_lesson_pack` schema column** — 2 N1 cases is too rare to justify a column. N1.
- **No `audience_population` field** — special-pop is N=1 (Atole), descriptive-only / FTS. D2.
- **No multi-select on `activity_type`** — Dr. Carver Lotion-Making (1 case) accepted as one mis-classification rather than redesigning storage. D2.

## 5. Vocabulary canonicalization (locked methodology, content TBD via worksheet round)

**Scope:** all ~10 vocabulary-bearing fields canonicalized in foundation phase. No targeted/partial cleanup. (D4)

**Case convention:** Title Case across all fields (replaces today's Title Case + kebab-lowercase mix). (D4)

**Methodology:** Claude-synthesized + curriculum-team-validated.
- Claude drafts per-field canonical worksheets using `/Users/danfeder/cCode/taggingv3/esynyc-taxonomy-schema-v2.md` as baseline + a corpus audit (Counter-style) showing PROD-actual values vs canonicals.
- Each worksheet has two inputs: (a) v3 schema as baseline, (b) Opus-derived qualitative analysis of N sample lessons (per-value sample reads + novelty pass against random corpus stratification).
- The 2 expert reviewers + user validate / amend / reject the worksheets.
- Per-field judgment on whether Opus-corpus-reads are needed: heritage / concepts / format → yes (content-heavy); cooking_methods / grade_levels → probably no (vocabulary is short and shape-stable).
- Worksheet outputs include canonical key, surface label, alias list (every variant form found in the corpus, doubles as Stage 2 migration map), schema position, filter-UI tier, frequency, content-evidence verdict.

**Per-field reduction philosophy:** case-by-case at worksheet time. Some fields tolerate aggressive collapse (cooking_methods has 8-10 real concepts max); others preserve pedagogically meaningful distinctions (heritage values like Lenape vs. Indigenous).

**Validator architecture (cross-runtime).** v3 enforced ~5 of 17 closed-vocabulary enums in one runtime (Python/Pydantic). Foundation phase enforces all 17 across four runtimes (Deno edge functions, browser TypeScript, PLPGSQL RPC + trigger, Python batch) via coordinated artifacts derived from canonical source(s). **Option B (TS/Zod canonical)** chosen for the codebase's TS bias.

**Two TS schemas, not one** (per reviewer round 2 — `LessonMetadata` and `ReviewMetadata` genuinely diverge: review-form uses `themes`/`season`/`location:string`; canonical uses `thematicCategories`/`seasonTiming`/`locationRequirements:string[]`. Translation today happens server-side inside `complete_review_atomic`. Foundation phase mirrors the contract in TS):

- **`src/types/lessonMetadata.zod.ts`** — canonical lesson shape (matches `LessonMetadata` interface, array values). Imported by `process-submission` (LLM-draft writer), data-import scripts, Stage 2 batch.
- **`src/types/reviewFormPayload.zod.ts`** — review-form shape (matches `ReviewMetadata` interface, single-select strings + `themes`/`season`/`location` keys). Imported by `complete-review` edge function and `ReviewDetail.tsx`.
- **`src/utils/{reviewToLesson,lessonToReview}Mapper.ts`** — bidirectional pure-function mappers mirroring the SQL translation in `complete_review_atomic`. Tested with property-based round-trips.

**Cross-runtime enforcement:**
- **TS-runtime enforcement:** appropriate schema imported by every TS write surface. `schema.parse(input)` on every metadata write (edge function entry, ReviewDetail save, scripts). Edge functions resolve `zod` via `supabase/functions/deno.json` (`"imports": { "zod": "npm:zod@3" }`); fallback option is `https://esm.sh/zod@3` URL imports if the npm: specifier isn't supported.
- **Python-runtime enforcement:** Pydantic models for the Stage 2 batch pipeline. Mirror enum lists from a generated `enums.json` constants file emitted from the canonical Zod schema; CI asserts Zod ↔ Pydantic enum-list equivalence.
- **SQL-runtime enforcement:** SQL CHECK constraints (column-level, where types permit — e.g., `text[]`) + value-validation extensions to the existing `lessons_normalize_write_trg` trigger covering JSONB-embedded enum keys. Hand-synced from the canonical Zod source.

Today's actual coverage: 1 SQL CHECK on values (`valid_seasons`); 1 shape-only trigger covering 10 of 17 fields; 0 Zod schemas; 5-of-17 Pydantic in v3. Foundation phase establishes all artifacts. Validator-architecture scaffolding is **pre-PR-1 Gate B**.

**Rollout-compatibility pattern (PR 1).** PostgREST returns hard `PGRST202` 404 on unknown RPC parameters. Netlify caches JS bundles for 1 year (immutable, hash-keyed); TanStack Query staleTime is 5 min — so stale browser tabs can keep emitting old RPC parameters after a column drop. **Pattern: keep deprecated parameters with `DEFAULT NULL` for one release; drop in a follow-up migration ≥24-48h after frontend deploys.** Applies to PR 1's `filter_lesson_format` parameter and the `lessons_with_metadata` view's `lesson_format` projection.

**Worksheet round sequence (curriculum-team track):** heritage (~78 values, first), concepts (~211 values, biggest), then ~8 smaller fields. Stage 1 estimated at low-thousands of Opus reads + reviewer/user validation hours over weeks-to-months.

## 6. Pipeline (LLM auto-tag at submission time)

**D5 + D9 + ~10 high-fit fields share one Opus tagging infrastructure** layered into `process-submission` edge function. One model + one base prompt design + N field-specific prompts; per-prompt eval gates before launch.

**Per-prompt readiness gates.** Each prompt's vocabulary must be locked before the prompt ships. Three readiness categories:

- **Vocab-locked (ships in PR 2 once eval gate passes):** fields whose canonical vocabulary is settled by foundation-phase walkthrough decisions, independent of Stage 1 worksheets.
  - `cultural_responsiveness_features` — D9 — vocab is the 7 master-list Brown CR features + 35 example practices for body-text mapping; older lessons (no body CR section, ~45% of corpus) skipped.
  - `activity_type` — D2 + D2.1 — vocab locked at 4 values (`cooking / garden / academic / craft`); **multi-label** output (LLM emits `["cooking"]`, `["cooking","garden"]`, `["craft","garden"]`, etc. — array of 1+ applicable values per lesson). `both` retired post-PR-1b.
  - `tags` — D2 + D7 — vocab locked at `["orientation", "bilingual_handouts"]`.

- **Stage-1-gated (deploys after corresponding worksheet lands):** fields whose canonical vocabulary depends on the Stage 1 worksheet round.
  - `academicConcepts` — D5 — depends on Stage 1 concepts worksheet (~211 values + everyday-vocab synonym mapping).
  - `cultural_heritage` — depends on Stage 1 heritage worksheet (~78 values + structural placement decisions).

- **Per-field audit pending:** ~6 remaining candidate fields (high-fit = closed vocab + body signal present; **not** marginal fields like `grade_levels` / `location`, which defer to Phase 2). Each undergoes a per-field readiness audit at implementation planning time before being committed to either category. Audit asks: is the canonical vocabulary settled today (vocab-locked) or worksheet-pending (Stage-1-gated)? The list of which ~6 is decided at impl-plan time, **not in this design doc** — over-locking field commitments before the per-field audit is itself a failure mode. This audit is **pre-PR-1 Gate C**.

**Operational gating choice:** prompts in the Stage-1-gated category do **not** deploy with v3-baseline vocabulary. Per session 9 + reviewer feedback, deploying pre-canonical prompts creates submission rows that Stage 2 then has to clean up — that cost outweighs the benefit of earlier auto-tagging on those fields. Each prompt waits for its corresponding worksheet.

**Eval gate per prompt:** before any prompt ships to PROD, run a labeled hold-out evaluation against a curriculum-team-validated sample. Drop or rewrite any prompt that doesn't clear the gate.

**Reviewer flow:** reviewer validates / edits / replaces LLM drafts at review time as one more field in their existing review pass. The picker-UI redesign for editing drafts is **Phase 2** — foundation phase ships LLM tagging that pre-populates the existing reviewer surfaces; reviewers see drafted values in current ReviewDetail.tsx and edit via current controls. Frankenstein UX between foundation and Phase 2 is acceptable per D0 (2 expert reviewers, scoped at phase-1 design time).

**Search infrastructure consequence (D5).** Splits into two phases by data dependency:

- **Ships in PR 3a (independent of Stage 1):**
  - Add `academicConcepts` to `search_vector` (FTS reads concept tags as content)
  - Add `academicConcepts` to corpus-side embedding generation (`scripts/generate-embeddings.mjs`; currently includes themes / heritage / skills / ingredients but not concepts)
  - Resolve smart-search-vs-DB-synonyms drift (TS hardcoded list in `smart-search/index.ts:18-75` vs DB table)

- **Ships in PR 3b (depends on Stage 2 re-tag outputs):**
  - Populate `search_synonyms` with everyday ↔ framework vocab pairs produced by Stage 2 re-tag prompts. Folds into the PR 6+ Stage 2 work track since it consumes Stage 2 output.

## 7. Corpus refresh (Stage 2)

**Scope 3 — full re-tag with Opus, sequenced after Stage 1 worksheet validation.** Pydantic-validated for ALL 17 fields (not just 3 of 17 like v3).

- Adapts v3's existing Batch API + validation infrastructure (`/Users/danfeder/cCode/taggingv3/gpt_tagger/`); swaps OpenAI for Anthropic + extends validators (Pydantic, mirroring the canonical Zod source per §5) to all 17 fields.
- Operates on post-drop corpus of ~749 lessons (after import drops apply).
- Cost ~$200-300; 1-2 sessions of pipeline engineering.
- Stage 2 timing intentionally flexible: not blocking on Stage 1 closure; can be scheduled separately.
- CRF re-tag scope = ~55% of corpus (modern-template lessons with body CR section); older 45% (legacy template, no body CR section) skipped entirely. D9.

**Stage 2 reviewer model — two layers:**

1. **Locked QC floor (Cross-cutting Scope 3, session 1):** reviewers spot-check ~50-100 sampled lessons; flagged patterns or specific lessons get full review. Sampling protocol (random / stratified-by-activity-type / targeted-at-audit-found-lessons) and review surface (re-tag DIFF view vs. fresh-tag review) TBD at implementation time.
2. **Stage 2 reviewer-validation UX walk (deferred — not yet decided):** whether Stage 2 also requires broader per-field reviewer validation across the ~700 unreviewed lessons (beyond the spot-check QC floor) — and what that flow looks like (which fields, batch vs per-lesson, accept/edit/reject UX, prioritization, escalation rules) — is the **deferred Stage 2 reviewer-validation UX walk** per session 9. Walked during foundation-phase implementation planning when the LLM-draft-validation flow becomes the active design surface (likely just before PR 6+ scopes). The mechanism inventory archived from D8 phase-2 (guided pickers, validation rules, audit/diff views, paired-review prompts, per-field guidance text) serves as candidate inputs for the walk.

Both layers belong to Stage 2; the walk decides whether the floor is sufficient or whether broader reviewer validation is needed across the corpus.

## 8. Cleanup tracks (foundation-phase scope)

**23 imported non-ESYNYC-format curriculum drops** (per `project_imported_non_esynyc_drops.md`):
- 5 PFLP (2003 vintage)
- 11 FoodCorps (2017 vintage)
- 7 one-offs (CAS, NYC DOE, City Blossoms, NYC DEP, Oregon DOE, 1 stub)

Soft-vs-hard-delete + cleanup-track sequencing TBD at implementation time. Pre-Stage-2 sequencing preferred so re-tag operates on a clean corpus. Consider hide-from-search before delete (preserve linked user state — bookmarks).

**Archive-only `academicConcepts` recovery** (per decision journal D5 deferred sub-question, line 269): a small one-shot copy migration from `lesson_versions.metadata.academicIntegration.concepts` → `lessons.metadata.academicConcepts` for the rows where the live `lessons` row lost concepts but the archive preserves them. Schedule pre-Stage-2 so re-tag operates on complete data. Row count needs TEST DB verification at task time — decision journal says "7 archive rows," project memory's `project_metadata_cleanup_candidates.md` references "16 concepts surviving only in `lesson_versions` archive"; clarify before migrating.

**N1 cleanup** (per `project_imported_non_esynyc_drops.md` cross-cutting):
- **Food System Advocates retitle** — drop "& 2"; Pt 2 is byte-identical to Pt 1 minus one worksheet link. ~10 minutes of foundation-phase work.
- **Winter After School Session 2** — leave as-is (intentional ESYNYC unit).

## 9. Migration / shipping strategy

PR breakdown is the **proposed** sequencing; final scoping happens at implementation-plan time when current code shape is verified. Schema-first, then pipeline, then cleanup, then vocab+corpus refresh.

**Pre-PR-1 gates (no PR; investigation/decision tasks before PR 1 starts):**

| Gate | What it produces | Notes |
|---|---|---|
| **A — lessonFormat dependency sweep** | Per-surface task list folded into PR 1's task breakdown | Initial sweep ~95 surfaces (verified by Opus agent); confirm against current repo before PR 1 ships. |
| **B — Validator architecture decision** | Zod canonical scaffold (`src/types/lessonMetadata.zod.ts` or similar); decide where the `enums.json` mirror lives for Pydantic; decide cross-runtime equivalence test approach | Confirms Option B (TS/Zod canonical, per §5); affects every write surface in PR 1+. |
| **C — Per-prompt readiness audit** | Each ~6 candidate-field beyond the locked 3 + gated 2 classified as vocab-locked, Stage-1-gated, or dropped from foundation-phase scope | Affects PR 2 scope; do NOT pre-commit field list in design doc — audit decides. |

| # | PR (proposed) | Contains | Notes |
|---|---|---|---|
| 1 | **Structural schema + lessonFormat dependency sweep** | D2 enum + D3 full column drop coordinated across 4 RPCs + view + trigger + helper + ~30 TS surfaces + D6 series_id/part_number + D7 tags enum + D9 crf_confirmed + filter UI sidebar updates + Zod canonical scaffolding (Gate B output) | Largest blast radius. Multi-task PR; per-surface tasks per Gate A output. Idempotent migration. Forward-rollback ready. |
| 2 | **Submission-time LLM auto-tag — vocab-locked prompts** | `process-submission` edge function expansion; eval-gate harness; CRF + activity_type + tags prompts (and any additional fields classified vocab-locked by Gate C) | Per-prompt eval gates before each goes live. Stage-1-gated prompts (academicConcepts, cultural_heritage, etc.) deploy after their corresponding worksheets land — separate post-foundation deploys, not new PRs unless infrastructure changes. |
| 3a | **Search infra now (D5 — independent of Stage 1)** | `search_vector` rebuild including `academicConcepts`; `scripts/generate-embeddings.mjs` update; smart-search-vs-DB-synonyms drift resolution | Independent of PR 4+. |
| 3b | **Search synonym population (depends on Stage 2 re-tag outputs)** | Populate `search_synonyms` with everyday↔framework vocab pairs produced by Stage 2 re-tag | Folds into PR 6+ Stage 2 work track. |
| 4 | **Corpus drops + archive-concepts recovery + N1 retitle** | 23 imports retired (soft-delete approach TBD); archive `academicConcepts` recovery migration (per §8); FSA retitle | Pre-Stage-2 sequencing so re-tag operates on clean+complete corpus. |
| 5+ | **D4 vocab canonicalization migration** (depends on Stage 1 worksheet outputs) | Per-field canonical translation migrations; Zod canonical source extended with worksheet outputs; Pydantic enums refreshed; SQL CHECK / trigger value-validation tightened | <!-- TBD: split per-field or all-at-once based on worksheet timing --> |
| 6+ | **Stage 2 corpus re-tag + reviewer validation flow** (depends on PR 5 + Stage 1 + Stage 2 reviewer-validation UX walk) | Opus re-tag pipeline; Pydantic on all 17 fields mirroring Zod; corpus run; QC floor (50-100 spot-check); broader reviewer-validation flow per the walk | Flexible timing; doesn't have to immediately follow PR 5. |

### Gap risk between PRs

- **PR 1 → PR 2 gap.** Once column drops land but submission-time auto-tag isn't wired up, new submissions land without LLM-drafted tags (same as today; no regression). Acceptable.
- **PR 2 → Stage-1-gated prompt deploys.** Vocab-locked prompts (CRF / activity_type / tags / Gate-C-classified) ship in PR 2; Stage-1-gated prompts (academicConcepts / cultural_heritage / Gate-C-classified) deploy after their corresponding worksheets land. Submissions between PR 2 and the Stage-1-gated deploys auto-tag only the vocab-locked fields; Stage-1-gated fields remain reviewer-supplied (same as today). Stage 2 catches up at re-tag time. No separate mitigation needed.
- **PR 5+ vs Stage 2 gap.** Foundation-phase corpus refresh has catch-up built in: lessons submitted between PR 1 and Stage 2 → Stage 2 re-tags everything against canonical D4 vocab. Stage 2 catches them up; no pre-canonical drift to clean up because Stage-1-gated prompts never deployed with v3 baseline.

### TEST DB rehearsal

- PR 1: schema migration applied; verify column shapes via `mcp__supabase-test__list_tables` + `execute_sql` on each table; verify filter dropdowns render via Netlify deploy preview.
- PR 2: edge function deployed to TEST; submit a test lesson; verify async pipeline writes drafted tags; eval-gate logs persist.
- PR 3: `search_vector` regenerated; query test for academicConcepts hit; `search_synonyms` rows verified.
- PR 4: corpus drops applied to TEST; verify FK references handled (bookmarks, dismissals, etc.); FSA row updated.
- PR 5+ / 6+: TEST DB rehearsal for D4 + Stage 2 spec'd at implementation time.

### Rollback paths

- PR 1: forward-rollback migration (re-add columns + restore JSONB key) prepared before merge; idempotent.
- PR 2: edge function pin/rollback to prior version; submission flow degrades gracefully (no LLM drafts means current behavior).
- PR 3: `search_vector` rebuild can be re-run with prior content; `search_synonyms` rows tagged with origin so D5-origin rows can be deleted.
- PR 4: soft-delete reversal (restore status flag) + FSA title restore.
- PR 5+: per-field forward-rollback migrations; Stage 2 staged re-tag with versioning so PROD's existing tags can be restored.

### Per-PR ritual

Per `feedback_pr_bot_review_workflow.md`:
1. Pre-push code-reviewer agent dispatch
2. Push → open PR
3. Wait for external bot reviewers
4. Four-surface comment triage
5. Investigate every finding (rebuttal pass per `feedback_bot_review_investigation.md`)
6. Consolidated fix-up commits
7. Per-round TEST DB re-verification (every round, not just at open)
8. Round-cap after 2 rounds

### Known issues / pre-existing flakes

- **`migrate-production.yml` SASL flake (apply-step variant).** Confirmed reproducible. Mitigation: rerun `gh run rerun --failed <run_id>`. PROD MCP verification mandatory after every apply.
- **`migrate-production.yml` SASL flake (verify-step variant).** Cosmetic; PROD MCP verification is the source of truth.
- **Edge function deploy false-success.** Verify deployment via `mcp__supabase-remote__get_edge_function <slug>` after every PROD deploy; compare ezbr_sha256 or grep for known new code line.
- **Edge function deletion ordering hazard.** When retiring functions, drain queued production-approval runs before approving them.

## 10. Testing strategy

### Unit
- Pydantic validators (all 17 fields) — cover happy path + every closed-enum value + every drift variant from corpus audit.
- D2 / D7 closed-enum tags validation — only `["orientation", "bilingual_handouts"]` accepted.
- D9 CRF closed-enum (7 master-list features) — Pydantic + edge function validation.

### Integration
- `process-submission` edge function — submission with full body content → LLM auto-tag drafts populate ~10 fields → reviewer-fetch surfaces drafts.
- Eval-gate harness — labeled hold-out runs per prompt; pass/fail thresholds documented.
- `search_vector` regeneration — verify academicConcepts hits via FTS.
- `search_synonyms` query expansion — verify everyday→framework expansion via `smart-search` edge function.

### E2E
- Submit lesson → reviewer queue → reviewer sees LLM-drafted tags inline → reviewer validates → publish.
- Filter sidebar: Activity Type 5-value selection; Lesson Type tag filter (orientation, bilingual_handouts); lessonFormat filter absent.

### RLS
- No RLS changes in foundation phase; `npm run test:rls` must pass unchanged.

### Manual smoke checklist (per `superpowers:verification-before-completion`)
- After PR 1: TEST DB verify all column shapes via MCP; deploy preview filter UI verified; lesson detail renders without lessonFormat.
- After PR 2: TEST submission writes drafted tags; reviewer queue surfaces them; eval-gate logs persist.
- After PR 3: smart-search query in TEST returns expanded synonym results.
- After PR 4: 23 imports + FSA retitle verified in TEST; FK references handled.
- After PR 5+ / 6+: per migration / re-tag run verification spec'd at implementation time.

## 11. Out of scope (captured for Phase 2 / later tracks)

**Deferred to foundation-phase implementation planning** (walked when LLM-draft-validation flow becomes the active design surface, likely just before PR 6+ scopes):
- **Stage 2 reviewer-validation UX walk** — whether Stage 2 needs broader per-field reviewer validation across the ~700 unreviewed lessons beyond the locked QC floor (§7); what fields, batch vs per-lesson, accept/edit/reject UX, prioritization, escalation rules. Mechanism inventory archived from D8 phase-2 (guided pickers, validation rules, audit/diff views, paired-review prompts, per-field guidance text) serves as candidate inputs.

**Phase 2 (separate window, after foundation lands):**
- Reviewer UX redesign — guided pickers, validation rules, audit/diff views, paired-review prompts, per-field guidance text. Note overlap with the foundation-phase implementation walk above; some of this may land in foundation phase if the walk decides so.
- Reviewer concepts editor (clearing semantics + LLM-draft accept/edit/replace UI patterns).
- CRF UI surfacing to end users (sidebar / badge / silent).
- Reviewer-facing `crf_confirmed` indicator.
- Submission UI for guideline doc surfacing to teachers.
- Marginal-field LLM prompts (`grade_levels`, `location`) — gated on stronger evidence.
- N1 surveillance for new submissions (reviewer flag at review time).
- Per-N1 "[School]: Plan A" / Plan B title-encoding convention (if pairs accumulate).
- "For [school]:" inline-customization reviewer guidance.
- Reviewer guidance: tasting ≠ cooking; cosmetics → craft.
- Submission-time mobile-title enforcement (post-D3).

**Separate work tracks (foundation-parallel or post-foundation):**
- Stage 1 worksheet rounds (heritage, concepts, ~8 smaller fields) — curriculum-team-driven; gates D4 migration timing.
- Dedup-pipeline third-state memory mechanism (handles same-dish-sibling, cross-site variants, cross-version siblings, series_id-driven skip-comparison) — own work track, scheduled separately.
- Spot-check protocol for Stage 2 re-tag (random / stratified / targeted; DIFF vs fresh-tag review).
- Stage 1 cleanup-track sequencing for the 23 import drops (timing + soft-vs-hard delete + search hiding).

## 12. References

- Decision journal: `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` — per-card "Decision" + "Reasoning" + "Downstream implications" blocks. Read before re-debating any locked decision.
- Foundational report: `docs/plans/2026-04-30-metadata-rebuild-foundational-report.md`
- Stakeholder brief: `docs/plans/2026-04-30-metadata-rebuild-stakeholder-brief.md`
- Project memory: `project_metadata_rebuild_initiative.md`, `project_metadata_three_regimes.md`, `project_vocabulary_drift_scope.md`, `project_lesson_format_conflated.md`, `project_dedup_third_state.md`, `project_metadata_cleanup_candidates.md`, `project_crf_stamp_theater.md`, `project_teacher_zero_metadata_model.md`, `project_imported_non_esynyc_drops.md`
- v3 taxonomy reference: `/Users/danfeder/cCode/taggingv3/esynyc-taxonomy-schema-v2.md`
- v3 tagging infrastructure: `/Users/danfeder/cCode/taggingv3/gpt_tagger/` (adapt for Stage 2 Opus re-tag)
- Brown CR framework master list: `~/Downloads/Cultural Responsiveness Guidelines.md`
- Working preferences: `feedback_data_safety_top_priority.md`, `feedback_per_round_test_db_verification.md`, `feedback_pr_bot_review_workflow.md`, `feedback_multi_session_execution.md`, `feedback_workflows_not_sacred.md`, `feedback_user_relearning.md`, `feedback_plain_language.md`
