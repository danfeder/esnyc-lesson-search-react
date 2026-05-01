# ESYNYC Lesson Search v2 — Metadata System Foundational Report

**Status:** Research / Foundational — not a plan
**Date:** 2026-04-30
**Audience:** Anyone designing the metadata rebuild
**Sources:** 10 parallel research agents (Round 1: schema / filters / pipeline / frontend / search / content / known-issues; Round 2: quantitative distributions / targeted content / versions+orphans), 25+ PRs of git history, 27 memory files, **25 lesson Google Docs read end-to-end**, ~50 SQL queries against TEST DB

This report is the complete picture of how metadata works in ESYNYC Lesson Search v2 today, why it works that way, what is broken, what is dead weight, and what design decisions a rebuild must make. It is structured to enable design without further research — every claim is concrete and traceable. **No prescriptions**; the goal is to produce a shared mental model.

> **Snapshot date / data source.** Quantitative figures are from TEST DB (`rxgajgmphciuaqzvwmox`) on 2026-04-30, ~772 lesson rows, ~130 submissions. PROD figures (~831 lessons) may differ by single-digit row counts, but ratios and tier patterns hold.
>
> **Verification (2026-04-30, post-feedback re-query).** Spot-checked 12 foundational numbers via direct TEST DB queries: total lessons (772 ✓), plural-only rows (78 ✓), singular-only rows (684 ✓), distinct heritage values (78 ✓), `academicConcepts` populated (677 ✓), `culturalResponsivenessFeatures` populated (679 ✓), lessons with strict-kebab anywhere (279 ✓ = 36.1%), and per-field kebab counts for cooking_methods (197 ✓), thematic_categories (104 ✓), garden_skills (58 ✓), academic_integration (49 ✓), cultural_heritage (24 ✓). Two methodology caveats surfaced — see §7 and §2 footnotes. Three factual corrections applied from external review — see §4, §5, §9, §19, Q1, Appendix C.

---

## Table of contents

- [Executive summary](#executive-summary)
- [Part I — What metadata IS today](#part-i--what-metadata-is-today)
  1. [Four storage layers](#1-four-storage-layers)
  2. [Three regimes (the central reframing)](#2-three-regimes-the-central-reframing)
  3. [The fields inventory](#3-the-fields-inventory)
  4. [The lifecycle](#4-the-lifecycle)
  5. [The participating systems](#5-the-participating-systems)
- [Part II — How it actually behaves](#part-ii--how-it-actually-behaves)
  6. [Field population distribution](#6-field-population-distribution)
  7. [Vocabulary canonicalization scope](#7-vocabulary-canonicalization-scope)
  8. [The teacher-zero-metadata model](#8-the-teacher-zero-metadata-model)
  9. [Search and filter participation](#9-search-and-filter-participation)
  10. [Frontend rendering surfaces](#10-frontend-rendering-surfaces)
- [Part III — What the lessons actually contain](#part-iii--what-the-lessons-actually-contain)
  11. [Three template eras](#11-three-template-eras)
  12. [Content patterns metadata doesn't capture](#12-content-patterns-metadata-doesnt-capture)
  13. [Hidden curriculum / sequence / variants](#13-hidden-curriculum--sequence--variants)
  14. [Specific case studies](#14-specific-case-studies)
- [Part IV — What is broken / hygiene / dead](#part-iv--what-is-broken--hygiene--dead)
  15. [Resolved bugs (do NOT re-fix)](#15-resolved-bugs-do-not-re-fix)
  16. [Latent issues (rebuild must address)](#16-latent-issues-rebuild-must-address)
  17. [Carry-forward / clearing semantics traps](#17-carry-forward--clearing-semantics-traps)
  18. [Three "ghost" populations](#18-three-ghost-populations)
  19. [Dead weight to drop](#19-dead-weight-to-drop)
- [Part V — Design questions for the rebuild](#part-v--design-questions-for-the-rebuild)
- [Appendices](#appendices)

---

## Executive summary

ESYNYC Lesson Search v2 stores 772 lesson plans (TEST DB; ~831 in PROD) with rich classification metadata supporting an 11-category filter UI, full-text + embedding-based search, a teacher submission → reviewer approval pipeline, and duplicate detection. The metadata system is structurally sound — 100% of lessons carry their core skeleton — but has accumulated debt across **three distinct historical regimes** (legacy import, submission-era, post-B-update) that produce vocabulary inconsistency, key-name drift, and one true semantic schema problem (`lessonFormat` conflation). Phase 1's column extraction (added typed `text[]` columns alongside the original JSONB blob) created a double-storage problem that the recently-added `lessons_normalize_write` trigger (PR-2 M4, 2026-04-29) substantially solves — drift on 14 of 18 fields is now <0.5%. Two material issues remain: **vocabulary canonicalization** (36% of corpus has kebab-case variants of canonical concepts; 4,920 row-appearances of drift) was deferred indefinitely as PR-3, and **`lessonFormat` collapses three orthogonal axes** (time-structure × delivery-mode × context-independence) into one single-select string. Beyond the schema, lesson Google Doc bodies are dramatically richer than metadata captures: a hidden curriculum-sequence layer (~25 of 772 lessons; small in count, large in design importance), Plan A/Plan B contingencies, mobile-education adaptations, vocabulary lists, NYS/CCSS standards codes (29% of corpus), book references, and external-resource dependencies all exist as content but have no metadata representation. Submitters provide zero classification metadata — all 17 fields are reviewer-supplied — which puts the entire classification load on the review pipeline and makes the reviewer UX disproportionately important.

### 7 key tensions

1. **Three regimes, not three shapes.** ~687 legacy rows (Title Case, singular `gradeLevel`, rich `academicIntegration: {selected, concepts}` object), ~78 submission-era rows (kebab-case, plural `gradeLevels`, flat `academicIntegration` array), ~7 post-B-update rows (hybrid; lost rich legacy concepts). Cleaning vocabulary alone won't reconcile these — the field-name and shape conventions differ between regimes.

2. **Vocabulary chaos at the value layer.** `lesson_format`: 4 distinct strings for 2 concepts. `cooking_methods`: entire column is kebab-case. `social_emotional_learning`: 5 CASEL competencies written 10 ways. `cooking_skills`: **123 distinct values** for ~30 real concepts. PR-3 (canonicalize-at-rest) was deferred indefinitely; runtime aliases bridge.

3. **Double storage with mostly-resolved drift.** Every filter field exists as both a column and a JSON key; trigger keeps 10 of 17 fields synced; remaining drift is <0.5% on most fields. The architectural duplication remains as cognitive overhead even when data is in sync.

4. **`lessonFormat` conflates three axes.** The only deeply structural schema problem; needs stakeholder input before any redesign.

5. **Teacher-zero-metadata model.** Submitters paste a Google Doc URL; reviewers tag everything via 1361-line `ReviewDetail.tsx`. Classification quality depends entirely on reviewer training and consistency.

6. **Content >> metadata.** Lesson docs contain explicit standards, vocabulary lists, time estimates, book references, external resources, sequence pointers, contingency plans, and bilingual variants — none captured.

7. **Three "ghost" populations exist.** 3 broken Unknown rows (failed-import placeholders, sharing one content_hash, the only cross-row hash collision in the corpus); 17 stuck submissions (>60 days, NULL extracted_title); 7 lesson_versions rows holding the only surviving copy of 16 specific richer legacy concepts data.

### 8 must-decide design questions

The rebuild plan must explicitly answer each:

1. **Storage shape** — column-only, JSON-only, or formalized hybrid?
2. **Vocabulary canonicalization** — one-shot rewrite (~4,920 affected appearances) or maintain runtime aliases?
3. **`lessonFormat` semantic split** — decompose into multiple fields or rebuild as multi-select?
4. **Cultural heritage taxonomy** — reconcile two extant hierarchies (slug vs Title-Case), expand to long-tail values, hierarchy depth?
5. **`activityType` taxonomy** — expand beyond the 4 values to capture cosmetics-craft, classroom-orientation, multi-class units, STEM, special-pop, mobile?
6. **`academicConcepts` positioning** — promote to filter, treat as derived index, or drop?
7. **Teacher intake** — should teachers tag anything, or stay zero-metadata?
8. **Sequence / variants / site-specific model** — add `series_id` + `part_index`? `parent_lesson_id` for Plan A/B and Mobile-Education? `site_id` for school-tagged lessons?

The remainder of this document supports each of the above with evidence.

---

## Part I — What metadata IS today

### 1. Four storage layers

Metadata for one logical lesson is materialized across four storage layers, each with its own naming conventions and shape conventions:

| Layer | Where | Key naming | Shape | Role |
|---|---|---|---|---|
| **A. Column store** | `lessons.<column>` (text/text[]) | `snake_case` (`thematic_categories`, `lesson_format`) | Typed scalars or text[] arrays | Filter source (post-PR-1), search index input, FTS source for some fields |
| **B. JSONB blob** | `lessons.metadata` (jsonb) | `camelCase` (`thematicCategories`, `lessonFormat`) | Flexible JSON; older rows carry legacy shapes (e.g., `academicIntegration` as object) | Frontend display source (after `normalizeMetadata` defensive coercion), historical record |
| **C. Frozen archive** | `lesson_versions.metadata` (jsonb only — no columns) | `camelCase`, may carry legacy nested shapes | Whatever was canonical at archival time; never updated | One-shot pre-B-update snapshot (write-only audit log) |
| **D. Reviewer shape** | `submission_reviews.tagged_metadata` (jsonb) | **Different keys**: `themes` (≠ thematicCategories), `season` (≠ seasonTiming), `location` (≠ locationRequirements), `activityType` scalar (≠ array) | jsonb only | What reviewers write through the UI; gets translated to layers A and B by `complete_review_atomic` RPC at approval time |

There is also a fifth, type-system-only layer — `LessonMetadata` / `ReviewMetadata` / `SearchFilters` interfaces in `src/types/index.ts` — which has its own internal inconsistencies (`gradeLevel` vs `gradeLevels`, `lessonFormat: string` despite array-shape historical data, `as LessonMetadata` casts hide drift).

**Translation between layers** happens in exactly two places:
- `complete_review_atomic` RPC (latest revision: `supabase/migrations/20260510000000_approve_update_concepts_carry_forward.sql`) — translates Layer D → Layers A + B at approval time, and on `approve_update` archives Layer A+B to Layer C before overwriting.
- `lessons_normalize_write` BEFORE INSERT/UPDATE trigger (PR-2 M4, `20260509000000_filter_drift_pr2_m4_normalize_trigger.sql`) — synchronizes column ⇄ JSON for **10 of 17 fields**. Does NOT cover: `mainIngredients`, `gardenSkills`, `cookingSkills`, `observancesHolidays`, `culturalResponsivenessFeatures`, `tags`, `gradeLevels`. (Drift on those is <0.5% per Round 2 SQL audit, so the gap is small.)

### 2. Three regimes (the central reframing)

The same JSONB blob (Layer B) contains three distinct historical regimes, each with its own conventions. **These differ not only in shape (object vs array) but in vocabulary case, key names, and confidence shape.** This is the single most important framing for the rebuild.

| Regime | Population | Convention summary |
|---|---|---|
| **Legacy import** | ~684 rows (88%) | Singular `gradeLevel` key (684/772 rows); Title-Case vocab (`Indoor`, `All Seasons`, `Garden Basics`, `Single period`, `Stovetop`, `Americas`, `Asian`); rich `academicIntegration: {selected: [...], concepts: {Subject: [...]}}` nested object; old-shape `confidence: {level, quality_markers, validation_status, lesson_plan_confidence}`; AI-validated or Pattern-based confidence |
| **Submission-era** | ~78 rows (10%) | Plural `gradeLevels` key; kebab-case vocab (`indoor`, `garden-basics`, `standalone`, `environmental-stewardship`, `science`); `activityType` as array; flat `academicIntegration: ["science", "social-studies"]` array; **empty `confidence: {}`** (submission flow does not run AI-validation); always has `original_submission_id` populated |
| **Post-B-update** | 7 rows (<1%) | Hybrid: original legacy shape archived to `lesson_versions`; live row replaced with submission-era shape, often losing rich legacy concepts data in the process; `has_versions=true`, `version_number=2` |

The 78 plural-only rows ALL satisfy: `original_submission_id IS NOT NULL`, `metadata ? 'activityType' = true`, `confidence` is empty. They came through the submission pipeline since Phase 5/6.

> **Methodology note (verification 2026-04-30).** Confirmed: 78 plural-only rows, 684 singular-only rows, 0 with both keys, **10 with neither key**. The triple-predicate matches **80 rows**, not 78 — so it's a near-perfect but not exact identifier of the submission-era cohort: 2 rows match the predicate but have legacy singular `gradeLevel` rather than plural `gradeLevels`. The 10 rows with neither key are a small fourth bucket worth investigating during the rebuild. If precise cohort identification matters for migration scope, prefer the plural-only-key check over the triple-predicate.

The 7 post-B-update rows ALL have `archive_reason = 'historical_b_update_recovery_2026_04'` (Phase 7c PR #465).

**Cleaning vocabulary alone won't reconcile these regimes.** The field-name semantics (`gradeLevel` singular vs `gradeLevels` plural) and embedded sub-shapes (`academicIntegration` object vs array) differ. A unified schema requires harmonizing all three regimes' rows, which is migration scope.

### 3. The fields inventory

The complete inventory of metadata-bearing fields, with authoritative sources, drift status, and where each is consumed:

| Logical field | Column (Layer A) | JSON key (Layer B) | Trigger sync | Display | Filter? | FTS weight | Editable? |
|---|---|---|---|---|---|---|---|
| Title | `title` (NOT NULL) | n/a | trigger (FTS) | Card, list, detail, picker | n/a | A | Reviewer @ approval (extracted from doc, not editable in UI) |
| Summary | `summary` (NOT NULL) | n/a | trigger (FTS) | Card, list, detail | n/a | B | Reviewer @ approval (extracted) |
| File link | `file_link` (NOT NULL) | n/a | — | Detail "Open Lesson Plan" | n/a | — | — (derived from doc URL) |
| Grade levels | `grade_levels text[] NOT NULL DEFAULT '{}'` | `gradeLevel` (684 legacy) **OR** `gradeLevels` (78 submission-era) | NOT in trigger; column is canonical | Card eyebrow, list, detail tag | YES (multi) | — | Reviewer (`gradeLevels` in form) |
| Activity type | `activity_type text[]` (769/772, all size 1; 0 size>1) | `activityType` (90/772; mixed scalar / array) | trigger | Card-level activity pill is **derived from skills count, not from this field**; detail row | YES (UI single-select, schema multi) | — | Reviewer (single, IntPillGroup) |
| Location | `location_requirements text[]` (771/772) | `locationRequirements` (772/772) | trigger | Detail row | YES (UI single, schema multi) | — | Reviewer (`location` scalar in form) |
| Season | `season_timing text[]` (707/772) | `seasonTiming` (711/772; **146 rows: column has 4 explicit, JSON says `["All Seasons"]`**) | trigger | Card meta strip first value, detail | YES (multi) | — | Reviewer (`season` in form) |
| Themes | `thematic_categories text[]` (771/772) | `thematicCategories` (772/772) | trigger | Card meta strip, list, detail | YES (multi) | C | Reviewer (`themes` in form) |
| Cultural heritage | `cultural_heritage text[]` (335/772 — 43%) | `culturalHeritage` (335/772) | trigger | List meta strip, detail | YES (hierarchical — UI vs DB hierarchies don't reconcile) | C | Reviewer |
| Core competencies | `core_competencies text[]` (771/772) | `coreCompetencies` (772/772) | trigger | Detail | YES (multi) | — | Reviewer |
| Lesson format | `lesson_format text` (748/772 — scalar) | `lessonFormat` (749/772 — scalar) | trigger | Card meta strip last, list | YES (UI single-select, conflated semantics) | — | Reviewer |
| Academic integration | `academic_integration text[]` (759/772) | `academicIntegration` (legacy: object `{selected, concepts}`; submission/current: flat array) | trigger | Detail "Academic" row | YES (multi) | — | Reviewer |
| SEL | `social_emotional_learning text[]` (771/772) | `socialEmotionalLearning` (772/772) | trigger | Detail "SEL" row | YES (multi) | — | Reviewer |
| Cooking methods | `cooking_methods text[]` (430/772 — 56%) | `cookingMethods` (428/772; entire column is kebab-case) | trigger | Detail | YES (multi) | — | Reviewer (conditional on cooking) |
| Main ingredients | `main_ingredients text[]` (426/772 — 55%) | `mainIngredients` (424/772) | NOT in trigger | Detail | NO (filter) | B | Reviewer (CreatableSelect) |
| Garden skills | `garden_skills text[]` (412/772 — 53%) | `gardenSkills` (413/772) | NOT in trigger | Detail | NO | C | Reviewer (CreatableSelect, conditional) |
| Cooking skills | `cooking_skills text[]` (431/772 — 56%) | `cookingSkills` (429/772) | NOT in trigger | Detail | NO | C | Reviewer (CreatableSelect, conditional) |
| Observances/holidays | `observances_holidays text[]` (117/772 — 15%) | `observancesHolidays` (116/772) | NOT in trigger | Detail | NO | B | Reviewer (CreatableSelect) |
| Cultural responsiveness | `cultural_responsiveness_features text[]` (679/772 — 88%) | `culturalResponsivenessFeatures` (680/772) | NOT in trigger | **NOT rendered anywhere in public UI** | NO | — | Reviewer (CreatableSelect) |
| `tags` | `tags text[]` (0/772 — DEAD) | `tags` (0/772) | NOT in trigger | Not rendered | NO | B (in FTS but no data) | — |
| Academic concepts | (no column) | `academicConcepts` object `{Subject: [concept,...]}` (677/772 — 88%; **211 distinct concepts**) | rescued by trigger via concept-rescue block | **Object stored, never displayed** | NO | — | Cannot be edited (no UI; cannot be cleared either due to carry-forward semantics) |
| Confidence | (no column) | `confidence` jsonb NOT NULL DEFAULT `{}`; **two shapes coexist** (old: `{level, quality_markers, validation_status, lesson_plan_confidence}` 667 rows; new: `{overall, byCategory}` 20 rows; empty `{}` 85 rows) | — | Used as secondary sort tiebreaker only | NO | — | — (pipeline-derived) |
| Processing notes | `processing_notes text` (20/772) | (no JSON key) | — | Not rendered | NO | indexed (`idx_lessons_processing_notes`) but rare | — (mixed-purpose) |
| Search vector | `search_vector tsvector` | — | trigger (`update_lesson_search_vector`) | — (search index) | n/a | n/a | — (derived) |
| Content text | `content_text text` (772/772; median 3,835 chars) | — | trigger input | — (search index) | n/a | D | — (extracted from doc) |
| Content embedding | `content_embedding vector(1536)` | — | — | — (semantic search) | n/a | n/a | — (LLM-derived; **preprocessing differs from `lesson_submissions.content_embedding`**) |
| Content hash | `content_hash varchar` | — | — | — (exact-dupe match) | n/a | n/a | — (SHA-256 of normalized content) |

**Type-defined or schema-defined but DEAD fields** (no UI consumer):
- `LessonMetadata.skills` (legacy, replaced by `gardenSkills` + `cookingSkills`)
- `LessonMetadata.equipment`, `duration`, `groupSize`
- `LessonMetadata.gradeLevel` (singular — duplicate of top-level `lessons.grade_levels` column)
- `LessonMetadata.culturalResponsivenessFeatures` (editable but not displayed publicly — paradoxically the highest "invisible" field at 88% population)
- Top-level `processing_notes` column (not rendered)
- `tags` column (0 populated rows, indexed)
- `season_timing_backup` column (vestigial)
- `confidence.overall` btree index (key not present in any row)
- `idx_lessons_tags` GIN index (dead)

### 4. The lifecycle

```
Stage 0: Submitter visits /submit
  ↓ Picks "new" or "revising" intent (Phase 8b: intent-first)
  ↓
Stage 1: Submitter fills form
  ↓ NEW: just Google Doc URL
  ↓ UPDATE: LessonSearchPicker (typeahead against lessons.title) + Google Doc URL
  ↓ NO classification metadata collected
  ↓
Stage 2: process-submission edge function
  ↓ Auth + normalize (Phase 8b normalizeSubmissionInputs)
  ↓ FK pre-check (lessons.lesson_id exists if update)
  ↓ INSERT lesson_submissions (no metadata yet)
  ↓ Google Doc extract → extracted_title, extracted_content (metadataSketch returned but NOT persisted)
  ↓ generate content_embedding (text-embedding-3-small, ${title}\n${content}, 8000-char truncation)
  ↓ store content_hash
  ↓
Stage 3: detect-duplicates edge function
  ↓ SHA-256 hash match (find_lessons_by_hash RPC)
  ↓ pgvector cosine search (find_similar_lessons_by_embedding, threshold 0.5, top 20)
  ↓ TS-side weighted Jaccard on metadataSketch ↔ lessons.metadata
  ↓ combinedScore = titleSim*0.3 + metaOverlap*0.2 + semanticSim*0.5
  ↓ Write submission_similarities (top 10 with combinedScore >= 0.45)
  ↓
Stage 4: Reviewer opens /review/:id
  ↓ ReviewDetail.tsx loads:
  ↓   - lesson_submissions row
  ↓   - submission_similarities (joined with lessons_with_metadata)
  ↓   - off-list submitter target (Phase 8b)
  ↓   - latest submission_reviews row (if exists, for restore)
  ↓ Reviewer fills 17-field metadata form (inline editor in ReviewDetail.tsx using IntFormField + IntPillGroup + CreatableSelect directly; ReviewMetadataForm.tsx exists in barrel export but is unreferenced — see §19)
  ↓ Picks decision: approve_new / approve_update / needs_revision (rejection NOT in UI yet)
  ↓
Stage 5: Reviewer saves → complete-review edge function
  ↓ Auth (reviewer/admin/super_admin)
  ↓ Validate body, decision, optional selectedLessonId (required for approve_update)
  ↓ Embedding regen if approve_update (always) or approve_new (if missing)
  ↓ Calls complete_review_atomic RPC
  ↓ Fires send-email (fail-open) for submission-approved/needs-revision/rejected
  ↓
Stage 6: complete_review_atomic RPC (the heart)
  ↓ Lock + load submission FOR UPDATE
  ↓ Idempotency guard (status approved/rejected → ERRCODE 55000 reject)
  ↓ Build v_legacy_meta from p_metadata (translates Layer D shape → Layer B shape)
  ↓   - Renames: themes → thematicCategories, season → seasonTiming, location → locationRequirements
  ↓   - Coerces: location scalar → array, lessonFormat scalar
  ↓   - Typeof-aware: academicIntegration array stays array, object unwraps `selected`
  ↓ academicConcepts rescue: legacy object {selected, concepts} → top-level academicConcepts
  ↓ academicConcepts forward-compat: top-level wins over rescue
  ↓ UPSERT submission_reviews (writes tagged_metadata, decision, notes)
  ↓ UPDATE lesson_submissions (status, reviewer_id, review_completed_at)
  ↓ Branch on decision:
  ↓   - approve_new: INSERT lessons (text[] cols + metadata = v_legacy_meta)
  ↓   - approve_update:
  ↓     - SELECT existing lesson FOR UPDATE
  ↓     - academicConcepts carry-forward (PR #473): preserve existing if input missing
  ↓     - INSERT lesson_versions snapshot (full prior state)
  ↓     - UPDATE lessons (text[] use COALESCE preserve, metadata = v_legacy_meta replace)
  ↓     - increment version_number, set has_versions = true
  ↓ trigger lessons_normalize_write fires BEFORE the INSERT/UPDATE
  ↓   - Forces column ⇄ metadata sync for 10 fields
  ↓   - academicConcepts rescue/normalize block
  ↓ trigger update_lesson_search_vector fires
  ↓   - Rebuilds search_vector from title, summary, ingredients, skills, themes, heritage, holidays, tags, content_text
```

**Email flow caveat**: The `send-email` edge fn is wired for `submission-approved`, `submission-needs-revision`, `submission-rejected`. Resend is configured with sandbox `from: onboarding@resend.dev` and sandbox-domain — **PROD email delivery is broken for any recipient other than `mail@danfeder.org`**. All seven non-submission email types silently fail too. Phase 7c shipped the call sites; Resend setup was deferred 2026-04-27.

### 5. The participating systems

**Database**:
- Tables: `lessons` (primary), `lesson_submissions`, `submission_reviews`, `submission_reviews_archive`, `lesson_versions`, `lesson_archive`, `canonical_lessons`, `duplicate_resolutions`, `duplicate_group_dismissals`, `submission_similarities`, `cultural_heritage_hierarchy`, `search_synonyms`, `bookmarks`, `lesson_collections`, `saved_searches` (no UI consumer)
- Triggers: `lessons_normalize_write_trg`, `update_lesson_search_vector_trigger`, `update_lesson_submissions_updated_at`, plus 4 timestamp triggers on auxiliary tables. **No triggers on `lesson_versions`, `lesson_archive`, `submission_reviews`, `submission_similarities`** — those tables trust the caller for shape.
- Generated columns: None. `search_vector` is trigger-maintained, not `GENERATED ALWAYS AS`.
- Indexes: ~33 on `lessons`. **~6 are confidently dead** (4 outright duplicates `idx_lessons_title` + `_title_trgm`, etc.; 2 dead `idx_lessons_tags` and `idx_lessons_confidence`). 9 JSON-path indexes (`idx_lessons_themes`, `_cultures`, `_seasons`, `_competencies`, `_sel`, `_academic`, `_format`, `_location`, `_activity_type`, `_cooking`) are **NOT dead** despite no longer serving the column-based `search_lessons` RPC — `smart-search` edge fn keeps them operationally live via JSON-path predicates (see §9 Two query paths).

**RPCs (Postgres functions)**:
- `complete_review_atomic` — atomic review finalizer (head: `20260510000000_*.sql`)
- `search_lessons` — primary search RPC (`20260505000000_filter_drift_pr1_column_based_search_lessons.sql`, reads from columns, reconstructs metadata via per-field COALESCE overlay)
- `expand_search_with_synonyms` — query-time synonym expansion via `search_synonyms` table
- `expand_cultural_heritage` — query-time hierarchical expansion via `cultural_heritage_hierarchy` table
- `_alias_lesson_format`, `_alias_activity_type`, `_alias_cultural_heritage`, `_match_cooking_methods` — runtime vocabulary canonicalization (PR-3 deferred indefinitely)
- `find_similar_lessons_by_embedding`, `find_lessons_by_hash` — dedup support
- `_phase4_jsonb_text_array`, `_phase4_jsonb_text_array_or_null` — write helpers
- `lessons_normalize_write` — trigger function
- `archive_duplicate_lesson` — duplicate-resolution UI

**Edge functions**:
- `process-submission` — submission entry
- `complete-review` — review finalizer
- `extract-google-doc` — pulls Doc body, returns `metadataSketch` (heuristic; not persisted)
- `detect-duplicates` — hash + semantic + Jaccard scoring
- `send-email` — Resend wrapper, currently broken in PROD
- `smart-search` — suggestions chip; **TS-hardcoded synonym map** (does NOT read `search_synonyms` table — two synonym sources!). Filters via `_shared/search-helpers.ts:applyFilters` which uses **JSON-path predicates** (`metadata->thematicCategories` etc.) — NOT column-based. So while frontend results go through column-based `search_lessons` RPC, every suggestion keystroke runs JSON-path queries against `lessons_with_metadata`. (See §9 Two query paths.)
- `search-lessons` — deprecated, not invoked from frontend
- `generate-embeddings`, `generate-gemini-embeddings` — backfill paths

**Frontend (React)**:
- State: Zustand store at `src/stores/searchStore.ts`. Persists ONLY `view` and `density` to localStorage; **filters reset on reload**.
- Hooks: `useLessonSearch` (RPC bridge with `normalizeMetadata` defensive coercion), `useFacetCounts` (client-side, **page-scoped not corpus-scoped**), `useLessonSuggestions`
- Filter UI: `IntSidebar`, `IntCulturalHeritageSection` (bespoke hierarchical), `IntActivePills`, `IntFilterSection`, `IntMobileFilterDrawer`
- Result UI: `IntCard`, `IntListRow`, `IntLessonDetail` (drawer + split-pane share this), `IntLessonDrawer`, `IntSplitDetail`
- Submission UI: `SubmissionPage`, `NewSubmissionForm`, `RevisingSubmissionForm`
- Review UI: `ReviewDetail` (1361 lines, all metadata editing inline via `IntFormField` + `IntPillGroup` + `CreatableSelect`), `IntDocFrame`, `IntDecisionBar`. (`ReviewMetadataForm.tsx` exists in barrel export but is unreferenced — see §19 Dead/unused components.)
- Admin UI: `AdminDuplicates`, `AdminDuplicateReview`, `IntLessonSpecCard`, `IntMetadataDiff` (compares only 9 of 17 fields)
- **NO admin "edit published lesson" surface** — fixing a typo requires re-submission + review
- **NO Bookmarks or Collections routes** — DB tables exist, no UI

---

## Part II — How it actually behaves

### 6. Field population distribution

**TEST DB, 772 rows.** This is the most important table for prioritizing the rebuild. It splits into five tiers:

**Tier 1: Universal taxonomy (≥99%)** — these are "every lesson must have":

| Field | % populated |
|---|---|
| grade_levels | 100.0 |
| core_competencies | 99.9 |
| location_requirements | 99.9 |
| thematic_categories | 99.9 |
| social_emotional_learning | 99.9 |
| activity_type | 99.6 |
| academic_integration | 98.3 |

**Tier 2: Common but not universal (88-97%)**:

| Field | % populated |
|---|---|
| lesson_format | 96.9 |
| season_timing | 91.6 |
| cultural_responsiveness_features | 88.0 (paradox: highest invisibility — never rendered) |

**Tier 3: Conditional (53-56%)** — the cooking/garden practice cluster, correctly null on inapplicable lessons:

| Field | % populated |
|---|---|
| cooking_skills | 55.8 |
| cooking_methods | 55.7 |
| main_ingredients | 55.2 |
| garden_skills | 53.4 |

**Tier 4: Sparse (15-44%)**:

| Field | % populated |
|---|---|
| cultural_heritage | 43.4 |
| observances_holidays | 15.2 |
| processing_notes | 2.6 |

**Tier 5: Dead**:

| Field | % populated |
|---|---|
| tags | 0.0 |

Mean populated field count per row is **12.55** (median 13, σ 2.00, min 3, max 17). 427 of 772 rows have 13+ populated fields. The corpus is uniformly metadata-rich — even bottom-percentile lessons have 7+ filter fields populated. **Filter-field absence is therefore a weak signal**: most absences are correctly null (cooking fields on a garden lesson), not "incomplete metadata."

### 7. Vocabulary canonicalization scope

**279 of 772 lessons (36.1%) have at least one kebab-case value somewhere in metadata.** Field-by-field kebab appearance counts:

| Field | Kebab appearances | Total appearances | Notes |
|---|---|---|---|
| cooking_methods | 197 | 475 | **Entire column is kebab** (`basic-prep` 189, `stovetop` 174, `oven` 104, `basic-prep-only` 6, `no-cook` 2). 5 distinct values for ~3 concepts. |
| social_emotional_learning | 169 | 1824 | 5 CASEL competencies → 10 strings (Title-Case + kebab) |
| core_competencies | 162 | 1777 | 8-ish concepts → 13 strings |
| thematic_categories | 104 | 1602 | 7 concepts → **14 strings** |
| garden_skills | 58 | 887 | 46 distinct values |
| academic_integration | 49 | 1369 | 6 official subjects → 12 strings |
| cultural_heritage | 24 | 939 | **78 distinct values** including authentic long-tail |
| cooking_skills | 21 | 1748 | **123 distinct** values for ~30 real concepts (`Cutting Skills` 127 vs `Cutting` 15 vs `Knife skills` 4 vs `Knife safety` 16; `Sautéing` 35 vs `Sauteing` 10) |
| main_ingredients | 19 | 1819 | **227 distinct** — mixes categories (`Alliums`, `Leafy greens`) with specifics (`Cilantro`, `Bananas`) |
| lesson_format | 1 | 748 | One outlier `["standalone"]` literal-array string |

**Total row-affected vocabulary-drift appearances: ~4,920** (per the original research; see methodology note below). A single lowercase-then-recapitalize migration pass per field would collapse 100+ vocabulary entries to canonical forms.

> **Methodology note (verification 2026-04-30).** The per-field "Kebab appearances" column above uses **inconsistent regex per field**. Strict kebab `^[a-z]+(-[a-z]+)+` reproduces exactly for cooking_methods (197), thematic_categories (104), garden_skills (58), academic_integration (49), cultural_heritage (24). Lowercase-leading `^[a-z]` reproduces exactly for SEL (169) and core_competencies (162) — strict-kebab would overcount Title-Case hyphenated values like `Self-Awareness`. For cooking_skills (21), main_ingredients (19), lesson_format (1), neither variant reproduces the figure (strict-kebab returns 25/40/29; lowercase-leading returns 86/56/64). The headline aggregate **4,920** does NOT reconcile with the per-field sum: 804 by strict-kebab, 1,377 by lowercase-leading. The qualitative claim — 36% of corpus has drift, vocabulary debt is real — is solid (`279/772 = 36.1%` confirmed). Treat 4,920 as approximate; if the rebuild needs a precise migration-scope number, re-query against the canonical filter enums in `filterDefinitions.ts`.

#### Why this matters
- **Filter UI silently drops rows.** A `lesson_format` filter sending `"Standalone"` does not match the 63 lowercase `"standalone"` rows or the 1 `["standalone"]` literal-array string. Runtime aliases (`_alias_lesson_format`) bridge for that field, but coverage is partial.
- **Search ranking is degraded.** The same concept written two ways doesn't accrue a single high-rank signal in the FTS tsvector.
- **`detect-duplicates` Jaccard scoring drops candidates.** When two lessons use different vocabulary for the same skill, Jaccard overlap registers as 0 even though concepts are identical. **The two Fattoush lessons are an example** — same dish, different vocabulary versions for the same cooking skills.
- **Reviewer cognitive load.** The reviewer UI is rendered from `filterDefinitions.ts` (frozen-at-Title-Case enum); reviewers can only choose canonical forms. But corpus contains both — admin queries on the corpus see both forms.
- **PR-3 was deferred indefinitely.** The user decision (2026-04-29) was: "future content reclassification pass would likely revisit the taxonomy anyway, so don't canonicalize at rest now." The runtime aliases stay. **This is a decision the rebuild needs to revisit.**

#### The two Fattoush case
The two Fattoush lessons (Round 2 case study) have **identical mainIngredients and culturalHeritage but different vocabulary versions for cooking skills**: Variant A says `Chopping`, `Measuring`, `Salad assembly`, `Dressing making`; Variant B says `Cutting Skills`, `Basic Skills`, `Measuring (dry/liquid)`, `Assembling cold dishes`, `Recipe reading`. Same skills, different words. Embedding similarity will catch them; tag-overlap won't. The vocab inconsistency is itself a structural enabler of duplicate-detection failures.

### 8. The teacher-zero-metadata model

Teacher submission UI collects exactly:
- A Google Doc URL (regex-validated for `/document/d/<id>` pattern)
- An intent picker (new vs update)
- For updates: a typeahead lesson picker against `lessons.title` (or "can't find it" escape)

**No classification metadata is provided by the teacher.** All 17 fields above are added by the reviewer.

This means:
- **All metadata quality depends on reviewer training and consistency.** The content audit found multiple inconsistencies — Mashama Bailey lesson tagged "all 11 grades 3K-8" though it involves stovetop cooking; Lotion & Soap tagged `cooking` though it's cosmetics-craft "NOT for eating"; African American Food Traditions tagged `immigration stories` though African American foodways emerged from enslavement, not voluntary immigration.
- **The 7-CRF stamp is theater.** 5 lessons share verbatim 7-element `cultural_responsiveness_features` lists. Reading the lessons, several CRFs (e.g., "Reshapes curriculum") have no concrete textual anchor in the doc — they are claimed-by-stamp rather than evidenced. The metadata claims granularity it doesn't have.
- **`academicConcepts` is reviewer/LLM-derived, not teacher-written.** Across 8 sampled lessons with rich academicConcepts, teachers write "natural resources," "conservation," "fattoush," "Lunar calendar," "decompose," "chlorophyll," "Hoppin' John." Metadata writes "ecosystems," "community systems," "decomposition," "photosynthesis," "plant needs," "cultural traditions," "immigration stories." These are **two different vocabularies serving two different needs.**
- **Reviewer UX matters disproportionately.** ReviewDetail.tsx is 1361 lines — the only metadata authoring surface for the entire system. Any rebuild needs to consider this surface as primary, not secondary.
- **Silent renaming.** The reviewer form uses `themes`, `season`, `location`, `gradeLevels`. The published lesson uses `thematicCategories`, `seasonTiming`, `locationRequirements`, `gradeLevels`. **102 of 102 approved-new submissions** had this rename happen invisibly in the edge function.
- **Submission flow has lost confidence data.** All 78 submission-era rows have empty `confidence`. The submission pipeline doesn't run AI-validation. The 20 rows with new-shape `{overall, byCategory}` confidence are a different population (likely admin re-validation runs).

#### In-doc teacher tagging exists but doesn't roundtrip
Some middle-template lessons (e.g., Decomposition Pt 1+2, PS 109 Plans) have a "Tags–Pick a tag from each category" block where teachers fill in tags inside the Google Doc. Examples: "fall garden jobs", "decomposition, compost jobs, worms, roly polys", "Indicate if lesson is co-taught and/or double period". **None of these tags roundtrip to structured metadata.** This is a missed opportunity if the rebuild considers any kind of teacher-side intake.

### 9. Search and filter participation

Of the 17 metadata fields, only **2** participate in BOTH filtering AND full-text search: `thematic_categories` (FTS weight C) and `cultural_heritage` (FTS weight C). The rest split:

- **Filter-only (10 fields)**: `grade_levels`, `season_timing`, `location_requirements`, `core_competencies`, `activity_type`, `lesson_format`, `academic_integration`, `social_emotional_learning`, `cooking_methods`, `cultural_heritage` (also FTS).
- **FTS-only (4 fields)**: `main_ingredients` (B), `tags` (B — 0 data), `observances_holidays` (B), `garden_skills` + `cooking_skills` (C, concatenated).
- **Display-only (5+ fields)**: `academicConcepts` (object), `culturalResponsivenessFeatures`, `confidence`, `equipment`, `duration`, `groupSize`.

The `search_vector` includes: title (A), summary (B), main_ingredients (B), observances_holidays (B), tags (B), garden_skills + cooking_skills + thematic_categories + cultural_heritage (C concat), content_text (D). **Notable absences**: season, location, competencies, format, activity_type, cooking_methods, AI, SEL — none participate in textual search. A user typing "winter" or "indoor" does not get those filters auto-suggested via FTS; they hit the synonym table instead.

#### Two query paths, two filter shapes

The frontend hits two distinct backends depending on what's being searched:

- **Result list** (`useLessonSearch` → `search_lessons` RPC): reads from columns post-PR-1, reconstructs JSON via per-field COALESCE overlay for the return shape.
- **Suggestions chip** (`useLessonSuggestions` → `smart-search` edge fn): queries `lessons_with_metadata` view + applies `_shared/search-helpers.ts:applyFilters`, which uses **JSON-path predicates** for thematicCategories, seasonTiming, coreCompetencies, culturalHeritage, activityType, lessonFormat. Only `grade_levels` and `location_requirements` are column-based here.

This means the 9 JSON-path GIN indexes on `lessons` are **operationally live** for every suggestion keystroke, despite no longer serving the column-based result-list path. They cannot be dropped until smart-search migrates to column-based filtering or is retired. The `_shared/search-helpers.ts` module is shared between `smart-search` and `search-lessons` edge functions, so retiring just `search-lessons` (not invoked from frontend, but still smoked daily — see §19) leaves the JSON-path code path alive via smart-search.

#### Embedding pipeline asymmetry
Both `lessons.content_embedding` and `lesson_submissions.content_embedding` are `vector(1536)` from `text-embedding-3-small`. **Same model, same dimensions.** But the prompts differ sharply:

| Aspect | `lessons` (corpus path, `scripts/generate-embeddings.mjs`) | `lesson_submissions` (submission path, `process-submission/index.ts`) |
|---|---|---|
| Source text prefix | `Title:`/`Summary:`/`Grade Levels:`/`Theme:`/`Culture:`/`Skills:`/`Ingredients:` + free-form `Content:` | Just `${title}\n${content}` — no labels, no metadata blob |
| Includes structured metadata? | YES (selectively: thematicCategory, culturalHeritage, skills, ingredients) | NO |
| Truncation | tiktoken-aware ~7990 tokens | `.substring(0, 8000)` chars |

Modern embedding models are sensitive to leading/structural tokens. Cosine across tables is significantly degraded — **`detect-duplicates` silently has worse semantic recall than it could**.

#### Two synonym sources
- **DB-driven** (`search_synonyms` table → `expand_search_with_synonyms()`) drives the result list. 5 seed rows in local; PROD likely has more.
- **TS-hardcoded** (`smart-search/index.ts` lines 18-75) drives the suggestions chip. Has 17-cluster semantic synonym map plus 30+ spelling corrections (`kindergarden→kindergarten`, `recipie→recipe`).

These don't sync. If a stakeholder adds `kale → leafy green/superfood` to `search_synonyms`, the suggestions chip won't suggest "leafy green" when the user types "kale."

### 10. Frontend rendering surfaces

The lesson card surface is **deliberately minimal**:

- **`IntCard` (grid card)**: shows 4 fields — grades (range-collapsed via `intGradesLabel`), derived activity pill (computed from skills count, NOT from `metadata.activityType`), one season value, one theme value, one lessonFormat value
- **`IntListRow` (list row)**: same as card + heritage (1st value)
- **Card visual hierarchy**: activity = "pill" treatment (most-important), grades = top strip, everything else = inline text in meta strip

**`IntLessonDetail` (drawer + split-pane)**: shows 12 metadata rows in a `<dl>`: Grades, Location, Season, Themes, Competencies, Cultural, Academic, Garden Skills, Cooking Skills, Ingredients, Cooking Method, SEL, Observances. **Notably omits**: `lessonFormat` (despite being on every card!), `culturalResponsivenessFeatures`, `processingNotes`, all derived/dead fields.

**`IntMetadataDiff` (admin duplicate review)**: compares only **9 of 17** fields side-by-side: activity_type, grade_levels, thematic_categories, season_timing, cultural_heritage, core_competencies, lesson_format, content_length, has_table_format. **Cooking/garden skills, ingredients, observances, SEL, AI all NOT compared.**

**Facet counts are window-scoped, not corpus-scoped.** The count next to "Garden Only" reflects the lessons in the current paginated result page, not corpus totals. Confusing UX during scrolling.

**Filter persistence**: filters do NOT survive a reload. URL is not updated. The `saved_searches` table exists with no UI consumer.

---

## Part III — What the lessons actually contain

Drawn from 25 lesson Google Docs read end-to-end across two rounds (15 in Round 1 + 10 targeted gap-fillers in Round 2).

### 11. Three template eras

Round 1 found two clear template families. Round 2 surfaced a third middle-template family.

| Era | Header structure | Distribution | Examples |
|---|---|---|---|
| **Old / "Aim/Standards"** | Aim, Question of the Day, Standards (NYS/CCSS codes), Materials, Vocabulary, Procedure: Day One, Opening Circle, Inquiry Activity One/Two, Closing Circle, Common Core Extensions, Other Extensions | ~25% | Plant Part Salad 4, Simple Machines, Will It Decompose Part II, Carrot Fries, Factory Farming, Natural Resources, Photosynthesis Pt 1 (.docx) |
| **Middle / "Self-tagged"** | Modern body + "Tags–Pick a tag from each category" / "Garden Connection" / "How Does This Lesson Promote Critical Thinking/Independence?" + Site-Based Variations | ~15% | Decomposition Pt 1+2, Photosynthesis Pt 2, Lunar New Year 25-26, PS 109 Plans A+B, Food Justice Advocates |
| **Modern / "CR+SEL framework"** | Summary, Objectives, Cultural Responsiveness, Social-Emotional Skills (with sub-justifications), Agenda/Class Flow, Materials, Prep work, Anticipated problems, Background, Questions for students/extensions, Back pocket activities, Task cards, Photos, Notes | ~55% | Fattoush #2, Pasta, Arroz con Gandules, Winter Fruit Salad (Mobile), African American Food Traditions, Lotion & Soap, Lunar New Year (K-3), Juneteenth, Plant Adaptations |

The middle template is interesting because it has a **self-tagging interface inside the doc body** — teachers fill in tags at write time. None of these in-doc tags roundtrip to structured metadata.

### 12. Content patterns metadata doesn't capture

These are present in the actual lesson docs across the 25-lesson sample but have no metadata representation:

1. **NYS / Common Core / NGSS standards codes**. 29% of corpus has NYS standards in body text; 9% has CCSS. Never extracted to structured fields. A user search for "NYS PS 5.1f" returns nothing.
2. **Specific time / duration estimates**. Many docs have explicit minute breakdowns (5+30+5, 10+20+10). `lesson_format` text-tag is the only proxy and is too coarse.
3. **Vocabulary lists**. 15% of docs (mostly older-era) have explicit defined-term lists. Currently flattened into `academicConcepts` as broad concept tags.
4. **Book references / read-alouds**. "Leaf Man" by Lois Ehlert, "Diary of a Worm", "And Then It's Spring", "A Fruit Is a Suitcase For Seeds", "An Orange in January" — recurring lesson anchors. Not captured.
5. **External resource / video / web links**. 12 of 15 (Round 1) sampled lessons embed external links. Corpus-wide: **90 lessons (12%) have ≥1 URL in content_text.** Brittle dependencies — these can rot.
6. **Differentiated content by grade band**. Plant Part Salad 4 has separate task cards for PK-K, 1-2, 3, 4-5; Carrot Fries differentiates PK-2/2-5/6-8. The data model has one grades array; doesn't capture which grades use which variant.
7. **Procedural timing breakdown**. Most opening rituals 5-15 min, activity 20-30 min, closing 5-10 min.
8. **Special-population delivery markers**. "Lesson done for small pull-out speech groups with 3-5 students" — invisible. ENL bilingual prompts — invisible.
9. **Cross-curricular content type**. Seed Dispersal is engineering; Winter After School is health/nutrition; Lotion & Soap is cosmetics-craft. `academicIntegration` covers Science/Math/ELA but doesn't flag a lesson as "STEM engineering challenge" or "cosmetics craft" or "nutrition unit."
10. **Safety / heat-cold-prep flags**. Carrot Fries + Lotion & Soap both call out hot mixtures cooling needs.
11. **Sequence prerequisites**. "Do this class after Rules/Tool ID" (Green Room Scavenger). "This is part 2 in a 2 part series" (Decomposition).
12. **Tasting as a discrete event**. 55% of lessons have a tasting step. Could be the WHOLE lesson (Seed Dispersal = sunflower seeds only) or part of a broader cooking lesson. Buried in `cookingSkills` as "Tasting".
13. **Weather / conditional content**. Juneteenth's "if strawberries are in the garden, harvest them"; PS 109 Plan A/Plan B contingency.
14. **Bilingual worksheets**. Decomposition has English/Spanish Canva. No `languages_available` metadata.
15. **Site-specific authorship**. PS 7, PS 109, PS 216 references in titles + content. No `site_id`. Specific teacher persona references ("Mr. Selwyn") with no `author_id`.
16. **"Plan A / Plan B" weather contingencies**. Distinct rows in DB but operationally one teaching slot.
17. **Mobile-Education adaptation**. Some lessons (Fattoush #2) have explicit "Adaptations for Mobile Education" body sections. `lesson_format` accepts only one value, so this multi-modal capability is invisible.
18. **Multi-recipe lessons**. Arroz con Gandules / Apple Jicama Slaw is two recipes in one row. Plant Part Salad 4 is one row but contains a year's calendar of 9 recipes in body text.
19. **Reviewer comments inside docs**. Liza Engelberg, Jaimie Sanita comments live in Google Docs comment threads, not in the DB. The system doesn't fetch comments.
20. **Time-locked political content**. Food Justice Advocates references a specific 2025 federal policy action; reviewer comment thread acknowledges this and suggests future-proofing. No "needs periodic review" flag.

### 13. Hidden curriculum / sequence / variants

Round 2 SQL agent quantified what Round 1 inferred. **Counts are small but the lesson DESIGN is sequenced.**

- **12 lessons** have "Part N" / "Session N" / "Day N" / "Stop N" pattern in title (5 series total: 2× Decomposition Part 1+2, 2× Photosynthesis Part 1+2, 1× Knife Cuts Part 2, 1× Will It Decompose Part II, 1× Winter After School Session 2, 1× Food System Advocates 1&2)
- **0 lessons** have the same pattern in summary (summaries are LLM-generated and don't preserve sequence references)
- **~25 lessons (3.2%)** have real curriculum-sequence dependencies in body text (not template boilerplate)
- **0 sequence pointers** in structured metadata

Decomposition Pt 1 and Pt 2 have **months between them** (fall predict, spring observe). Photosynthesis Pt 1 and Pt 2 are similar. **Identical metadata between Pt 1 and Pt 2** (same `academicConcepts`, `gardenSkills`, `thematicCategories`). Embedding similarity will likely flag them as near-duplicates while they are designed pairs — a structural anti-pattern for embedding-based dedup.

### 14. Specific case studies

#### 14a. The two Fattoush lessons

Two distinct rows in the corpus (`1TUWRgAO...` and `1Dz-Jv4cV...`), both titled with "Fattoush", created **1 second apart** on 2025-07-10. Memory called them "byte-duplicates"; **they are not**.

| Field | Row 1 (Middle Eastern Salad - Fattoush) | Row 2 (Fattoush) |
|---|---|---|
| Doc body title | "September in the Kitchen: Middle Eastern Salad - Fattoush" | "Fattoush" |
| Template | Hybrid (old Standards table + modern body) | Modern (with explicit Mobile Education adaptation block) |
| content_text length | 9550 | 3708 |
| content_hash | 1ba9502202... | f4aceaf942... (DIFFERENT) |
| culturalResponsivenessFeatures | 3 features | 5 features |
| socialEmotionalLearning | 2 entries | 5 entries |
| academicConcepts | Social Studies only | Health, Science, Social Studies (4 sub-tags) |
| observancesHolidays | empty | ["Ramadan"] |
| Recipe ingredients | Whole tomatoes/cucumbers/peppers, parsley/mint/scallions, pita, garlic, olive oil, lemons, salt | Cucumber, tomato, scallion, parsley, mint, pita, dressing |
| Key activities | "Wild Wind Blows" social game + "What Do You Eat Bingo" + "My Plate" identity | Culture box mapping (world map stickers) + 3-table rotation |

These are **distinct lessons** — different authors, different teaching theory, different scaffolding (Brooklyn-pride accommodation in Row 2, school-year-month framing prefix in Row 1). They make the same dish.

**This is a third dedup state the rebuild needs**: not "duplicate" (different content, different scoring methods), not "unrelated" (clearly the same dish/cuisine/heritage), but "**same-dish-different-lesson**" — sibling variants. Embedding similarity alone will misrank these; tag-overlap will register `mainIngredients` and `culturalHeritage` 100% but other axes 0% with vocab differences.

#### 14b. The 3 broken Unknown rows

`title='Unknown'`, `summary LIKE '%Error processing lesson%'`, all sharing one content_hash `238f211fc9915924a2c8c1a8772039846ea736f0d3af04fa403d875d668e83ef`:
- `lesson_ids: 1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd, 1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU, 1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8`
- content_text length: 273, 2442, 273
- `processing_notes: "Fixed grade levels 9-12 -> High School"` (stamped on all three)
- Metadata identical skeleton — auto-fabricated, not real
- `original_submission_id: NULL`

**This is the only set of cross-row content_hash duplicates in the corpus** (770 distinct hashes / 772 rows). All three are artifacts of a failed legacy import. They appear in search results unless filtered. Hard-delete candidates.

#### 14c. The 14 stuck submissions

14 submissions in `status='submitted'` past 60 days (oldest 265 days, 2025-07-23). 13 of 14 are `submission_type='new'`; most have `extracted_title = NULL` (extraction step never completed or content malformed). 2 of 130 submissions are `submission_type='update'` and both are stuck (other artifact rows from orphan recovery). **Bulk-reject candidates** with a stale-reason note.

#### 14d. Plan A / Plan B contingency (PS 109 Garden Jobs / Leaf Rubbing Cards 10/31-11/2)

Two distinct rows (`326c1cc6-...` and `8a395801-...`) for one teaching slot. Plan A is outdoor garden-jobs; Plan B is indoor leaf-rubbing if weather doesn't permit. The contingency relationship is **embedded in title text only** ("10/31-11/2, Plan A" / "Plan B"). DB models them as two unrelated lessons.

#### 14e. Sequenced pairs (Decomposition + Photosynthesis)

Each is a 2-part series with **months between parts** (fall predict, spring observe). Cross-link is a hyperlink in the Background-information section of Pt 2's doc body. **Identical metadata between Pt 1 and Pt 2** (same `academicConcepts`, `gardenSkills`, `thematicCategories`). Embedding similarity will likely flag them as near-duplicates because they have identical metadata and substantially overlapping content. They are designed pairs, not duplicates.

#### 14f. `lesson_versions` is a one-shot pre-B-update snapshot

7 rows total in TEST DB. All `archive_reason = 'historical_b_update_recovery_2026_04'` (Phase 7c PR #465). All `version_number = 1`. **All 7 carry legacy object-shape `academicIntegration: {selected, concepts}` — and 16 lesson-concept pairs survive ONLY in this archive**. The corresponding live `lessons` rows have stripped, slug-cased, post-update metadata with NULL `academicConcepts` (the rich data was lost in B-update).

PR #473's carry-forward fix only operates on `lessons.metadata.academicConcepts` (top-level key). It does NOT recover from the legacy nested location. **The 7 archive rows are therefore the only place 16 specific concept entries exist in the database** (e.g., "decomposition", "soil science", "trade routes", "immigration stories", "beneficial insect identification", "pollinators", "global connections", "garden exploration"). If `lesson_versions` is ever pruned, that data is gone.

#### 14g. Time-locked political content (Food Justice Advocates)

`d704b6fc` references "the 2025 federal cut to NYC public-school fresh-fruits-and-vegetables snack program... in Donald Trump's government". A reviewer comment thread inside the Google Doc explicitly acknowledges this and suggests future-proofing: "If we are teaching this lesson in a post-Donald Trump future, you can instead say that not all schools have funding..." There is no metadata flag for "time-bound political content needing periodic review."

#### 14h. The "yearbook" lesson (n=1)

Plant Part Salad 4 (15,601 chars) contains a calendar in body text:
```
September: Panzanella (Italian Bread Salad with Tomato, Basil and Cucumber)
October: Callaloo (Caribbean Stew with Greens, Sweet Potatoes and Coconut Milk)
November/December: Borscht (Eastern European...)
```
**One row standing in for ~9 recipes.** Surfaces a structural mismatch between the row tag and the doc content. At n=1, hand-curate is fine; if the pattern grows, model as multi-recipe.

---

## Part IV — What is broken / hygiene / dead

### 15. Resolved bugs (do NOT re-fix)

These have been fixed in the last 60 days; the rebuild should preserve the fix, not redo it:

- `lessonFormat` array-shape writer bug → PR-2 M1 (`20260506000000`)
- `academicIntegration` object/array shape pass-through → PR-2 M1 + frontend defensive normalization (`useLessonSearch.ts:60-67`)
- `academicConcepts` silent-wipe on `approve_update` → PR #473 (`20260510000000`) carry-forward fix
- `cookingMethods` scalar-RPC vs array-UI mismatch → PR #471 (now `text[]`)
- 92 lowercase `location_requirements` rows → PR-2 M2 backfill
- 17 rows where `activity_type` column had been populated with location values → PR #472 M3
- 5 Phase-5 rows + 4 Phase-6 rows where `metadata.lessonFormat` drifted to array → backfilled
- Multi-review duplicate rows in `submission_reviews` → Phase 3 dedup + UNIQUE constraint
- `complete_review_atomic` idempotency (re-entry guard for `approved`/`rejected` status)
- `original_submission_id` FK softened to `ON DELETE SET NULL` (Phase 8b)
- Phase 8b intent-first redesign (3-state queue badges, off-list submitter target rendering, title-mismatch warning)
- 30 orphan B-update submissions recovered (Phase 6) — `true_unrecovered_orphans = 0` on PROD probe

### 16. Latent issues (rebuild must address)

| # | Issue | Severity | Layer | Rebuild decision needed |
|---|---|---|---|---|
| 1 | Vocabulary canonicalization (4,920 row-appearances) | High | DB data | One-shot rewrite migration vs maintain runtime aliases |
| 2 | `lessonFormat` semantic conflation (3 axes in 1 field) | High | Schema | Stakeholder decision — split or rebuild as multi-select |
| 3 | Cultural heritage two-source split (slug vs Title-Case + 78-value long tail) | High | Schema | Reconcile two hierarchies, expand to long-tail values, decide depth |
| 4 | `academicConcepts` cannot be cleared via UI | Medium (latent) | DB writer | Design clearing semantics deliberately before any concepts editor lands |
| 5 | Embedding pipeline mismatch (different prompts → degraded cross-table cosine) | Medium | Edge fn | Unify preprocessing before any cross-table semantic work |
| 6 | `gradeLevel` (singular) vs `gradeLevels` (plural) split — 684 vs 78 rows | Low | DB data | Migrate 684 legacy rows to plural during rebuild |
| 7 | 14 stuck submissions > 60 days | Low | Process | Bulk-reject with stale reason |
| 8 | 3 broken Unknown rows (cross-hash collision) | Low | DB data | Hard-delete in cleanup |
| 9 | 16 concept pairs surviving only in `lesson_versions` archive | Low | Data | One-shot recovery migration to populate `lessons.metadata.academicConcepts` from archive |
| 10 | 78 submission-era rows have empty confidence | Medium | Pipeline | Decide: re-validate or retire confidence as a field |
| 11 | `submission_reviews.canonical_lesson_id` not written | Medium | RPC | Override-tracking admin queries blocked until populated |
| 12 | Search query with special chars `&\|!:*()` breaks tsquery | Medium | RPC | Open beads `jyr` (P2); needs sanitization |
| 13 | `super_admin` role mismatch (TS defines, DB CHECK forbids) | Medium | RLS | Open beads `zt1` (P2) — adjacent to metadata |
| 14 | Two synonym sources (`search_synonyms` table + `smart-search` hardcoded) | Low | Edge fn | Unify or document explicit contract |
| 15 | Filter values don't persist across reload (no URL sync) | Low | Frontend | Decide: implement `saved_searches` UI consumer or add URL-based persistence |
| 16 | Facet counts are window-scoped, not corpus-scoped | Low | Frontend | Decide: corpus-wide counts via separate aggregate query, or rename "count" to "in this view" |
| 17 | The 7-CRF stamp is theater (5 lessons share verbatim 7-element list) | Medium | Data quality | Decide: retire `cultural_responsiveness_features` as tag list, or require evidence pointers |
| 18 | `processing_notes` is mixed-purpose dead weight (746/772 NULL; 20 entries split into 3 unrelated uses) | Low | Schema | Split into `derivation_notes` + `audit_log` table, or drop |
| 19 | `lessonFormat` not rendered in `IntLessonDetail` despite being on every card | Low | Frontend | Cosmetic — fix during rebuild |
| 20 | No admin "edit published lesson" surface | Medium | UX | Decide: add admin edit, or accept re-submit-and-merge as the only path |

### 17. Carry-forward / clearing semantics traps

The "key present iff data present" rule is now adopted across all 4 write paths (PR-1 reconstruction, PR-2 M1 writer, M2 backfill, M4 trigger, plus PR #473 carry-forward).

This means:
- Empty `{}` for `academicConcepts` produces NO key in JSON
- Non-empty produces the key
- **Sending `{}` from a future concepts editor would NOT clear** — the carry-forward block fires because `v_legacy_meta` ends up without the key
- Three options when a concepts editor lands (documented in `20260510000000_*.sql` comment lines 295-305):
  - (a) UI sends a non-empty sentinel
  - (b) Add `p_clear_concepts boolean` parameter to `complete_review_atomic`
  - (c) Change carry-forward to skip when `p_metadata` includes the key with any value (incl. JSON null) — needs PostgREST→PostgreSQL null-jsonb verification

**The `approve_update` whole-blob-replace pattern is the structural reason.** Any new top-level key NOT derived from `p_metadata` would have the same vulnerability. Today only `academicConcepts` is at risk; if new sibling keys are added (e.g., `culturalResponsivenessFeatures` rich content, NYS standards extraction), the carry-forward block would need extending.

The text[] columns in `approve_update` use a different semantic: `COALESCE(_phase4_jsonb_text_array_or_null(input), v_existing.<col>, ARRAY[]::text[])`. Empty input preserves existing — **you cannot clear a text[] column via approve_update by sending an empty array**.

### 18. Three "ghost" populations

Each is a small but distinct cleanup target:

- **Population A — 3 broken Unknown rows.** `title='Unknown'`, fabricated metadata, shared content_hash. Auto-imported placeholders from a failed pass. Hard-delete candidates.
- **Population B — 14 stuck submissions.** Status `submitted` >60 days, mostly NULL `extracted_title`. Pre-Phase-8b artifacts. Bulk-reject candidates.
- **Population C — 7 lesson_versions rows holding the only surviving copy of legacy concepts data.** 16 concept-pairs across these 7 rows exist nowhere else. Recovery candidate (one-shot migration to copy `lesson_versions.metadata.academicIntegration.concepts` → `lessons.metadata.academicConcepts` for these specific 7 lesson_ids).

### 19. Dead weight to drop

These can be removed in the rebuild with no behavioral consequence:

**Dead/redundant indexes** (~15 of ~33 on `lessons`):
- 9 JSON-path indexes that the column-based `search_lessons` RPC no longer uses (replaced by column GINs in PR-1): `idx_lessons_themes`, `_cultures`, `_seasons`, `_competencies`, `_sel`, `_academic`, `_format`, `_location`, `_activity_type`, `_cooking`. **NOT actually dead** — still actively used by `smart-search` edge fn via `_shared/search-helpers.ts:applyFilters` JSON-path predicates (see §9 Two query paths). Drop candidates only after smart-search is rewritten to read columns or retired.
- 4 outright duplicates: `idx_lessons_title` + `_title_trgm`, `_summary` + `_summary_trgm`
- 2 dead: `idx_lessons_tags` (0 rows have tags), `idx_lessons_confidence` (key doesn't exist)

**Dead/duplicate columns**:
- `season_timing_backup` (vestigial)
- `tags text[]` (0 rows populated)
- `lessons.activity_type` array column (functionally always size 1; can be scalar)
- `reviewed_at` / `reviewed_by` on `lesson_submissions` (duplicates of `review_completed_at` / `reviewer_id`)
- `lesson_archive.activity_type text` (scalar — should match `lessons.activity_type` shape after rebuild)

**Dead/duplicate JSON keys**:
- `metadata.gradeLevel` (singular — duplicate of top-level `lessons.grade_levels` column)
- `metadata.skills` (legacy, replaced by gardenSkills + cookingSkills)
- `metadata.equipment`, `duration`, `groupSize`, `culturalResponsivenessFeatures` (in type definition but never displayed)

**Dead/unused components**:
- `src/components/Review/ReviewMetadataForm.tsx` — 235-line component, defined and barrel-exported (`src/components/Review/index.ts:5`) but unreferenced. Replaced by the inline metadata editor in `src/pages/ReviewDetail.tsx` (around line 740). Verified 2026-04-30 by checking ReviewDetail's import block (lines 18-29) — no reference to ReviewMetadataForm. The dead component uses different conditional-render logic from the active editor (`activityType === 'cooking-only'` vs the active flow's gating), suggesting it was an alternative implementation that never got wired up or was wired up at some point and then replaced. Consider deleting in the rebuild's cleanup phase.

**Dead RPCs / endpoints**:
- `publish_approved_submissions` — REVOKED in `20260426000000_*.sql` (was a foot-gun)
- `search-lessons` edge function — deprecated frontend path (not invoked from frontend), but **still deployed and smoked daily** by `edge-function-smoke.yml` → `scripts/test-edge-functions.mjs:64`. Drop candidate only after the smoke check is also retired or redirected.

**Dead infrastructure**:
- `getSearchRpcName()` v2 flag — pinned off, no `search_lessons_v2` exists
- `bookmarks`, `lesson_collections`, `saved_searches` tables — schema exists, no UI consumer
- `grades_taught` / `subjects_taught` on `user_profiles` — kept only for backend invitation edge functions

---

## Part V — Design questions for the rebuild

Each of these is a decision the rebuild plan must explicitly answer. Laid out as questions with relevant evidence, not prescriptions.

### Q1. Storage shape — column-only, JSON-only, or formalized hybrid?

**Evidence:**
- Today's hybrid (column + JSON) was created by Phase 1 to fix slow JSON-path filtering. Trigger keeps 10 of 17 fields synced; remaining drift is <0.5% but mental overhead remains.
- Search RPC reads from columns post-PR-1; reconstructs metadata for return rows via per-field COALESCE overlay.
- 9 JSON-path indexes are NOT dead — actively used by `smart-search` edge fn via `_shared/search-helpers.ts:applyFilters` (suggestions chip path). Storage decision must consider whether smart-search migrates to column-based filtering or keeps JSON-path. Until then, the indexes are operationally required.
- Frontend reads from `metadata` JSON (after `normalizeMetadata` defensive coercion).
- `complete_review_atomic` writes to BOTH column and metadata; trigger enforces consistency.

**Options:**
- **Column-only as source of truth**: drop the JSON blob for filter-relevant fields; keep `metadata` JSON only for true side-channel content (e.g., `academicConcepts`, `confidence`, future structured-extraction outputs). Eliminates trigger as a sync mechanism. Backfill columns from JSON for any field-key currently column-null.
- **JSON-only as source of truth**: drop the columns; rebuild filter RPCs to read JSON via expression indexes. Reverts to pre-Phase-1 architecture. Doesn't address vocabulary canonicalization independently.
- **Formalized hybrid**: explicitly document which fields go where. e.g., "filter fields = column-only; rich content = JSON-only." Requires no migration if current state is acceptable.

**Tradeoffs**: column-only is the cleanest mental model but requires migration scope (drop 9 indexes, drop JSON keys, regenerate). JSON-only is simplest but reverses the column-extraction work and keeps drift risk. Hybrid is the de-facto current state.

### Q2. Vocabulary canonicalization strategy

**Evidence:**
- 36% of corpus has at least one kebab-case value
- 4,920 row-appearances of drift across 10 fields
- `lesson_format` has 4 strings for 2 concepts
- `cooking_methods` is entirely kebab-case
- `social_emotional_learning` has 5 CASEL competencies written 10 ways
- `cooking_skills` has **123 distinct values** for ~30 real concepts (`Cutting Skills` 127 vs `Cutting` 15 vs `Knife skills` 4 vs `Knife safety` 16)
- PR-3 (canonicalize-at-rest) was deferred indefinitely on 2026-04-29
- Runtime aliases bridge UI vs corpus today

**Options:**
- **One-shot rewrite migration**: lowercase + recapitalize + dedupe each affected field. ~10 migration files (one per field). Removes runtime aliases. Idempotent.
- **Maintain aliases indefinitely**: accept the drift; let aliases handle UI/corpus mismatch. Doesn't help dedup or FTS quality.
- **Hybrid**: canonicalize during the rebuild's data-cleanup phase, then drop aliases after backfill verification.

**Tradeoffs**: rewrite is real migration risk (every existing row touched) but improves search quality, dedup quality, reviewer cognitive load, and FTS-vector richness. The decision is partly about confidence in test coverage and rollback plan.

### Q3. `lessonFormat` semantic split

**Evidence:**
- Today: single string field with 7 distinct values across 3 axes (time-structure × delivery-mode × context-independence)
- 213 lessons have a context value (`Standalone`, `standalone`, `Mobile education format`, `mobile-education`) which leaves time-structure invisible
- 471 lessons have `Single period`, 23 have `Double period`, 28 have `Multi-session unit` — time-structure data is rich
- 11 lessons have `Mobile education format` — a delivery mode, not a time structure
- One lesson (Fattoush #2) has explicit "Adaptations for Mobile Education" body section but `lesson_format` accepts only one value

**Options:**
- **Split into 3 fields**: `time_structure` ∈ {Single, Double, Multi-session} × `presentation_context` ∈ {Standalone, Unit-embedded} × `delivery_mode` ∈ {In-person, Mobile, Co-taught, Remote}. Most expressive.
- **Split into 2 fields**: `time_structure` + `delivery_mode`. Drops the standalone-vs-unit axis.
- **Multi-select rebuild**: keep one field but make it multi-select. Allows "Single + Standalone + Mobile" as 3 simultaneous tags. Simpler migration.
- **Stakeholder decision required**: this is the only deeply structural schema problem in the system.

**Tradeoffs**: 3 fields is most expressive but adds 3 filter UI sections. Multi-select is easier for users. Stakeholder input on which axis matters most is needed.

### Q4. Cultural heritage taxonomy

**Evidence:**
- Two extant hierarchies: `filterDefinitions.ts` slugs (5 regions × ~12 children) vs `cultural_heritage_hierarchy` DB table (Title-Case parents with different children)
- Long-tail unfilterable values: Mexican 41, Italian 26, African American 25, Mediterranean 42, Indigenous 24, Lenape 7
- `_alias_cultural_heritage` runtime helper bridges; PR-4 (full taxonomy redesign) was deferred indefinitely
- 78 distinct values total in the corpus
- Selecting parent "Asian" in UI relies on alias to match Title-Case `Asian` in DB

**Options:**
- **Reconcile slug vs Title-Case**: pick one form, migrate corpus + filterDefinitions + DB hierarchy. PR-4-equivalent.
- **Expand to long-tail**: make the corpus's 78 distinct values all filterable, not just the canonical 17.
- **Flat vs hierarchical**: keep the hierarchical filter (parent-includes-children) or flatten to a single tag set.
- **Stakeholder decision required**: heritage taxonomy is content-area sensitive.

**Tradeoffs**: hierarchy is good UX for parent-broadcast searches but adds complexity. Long-tail values are real; ignoring them excludes 100+ lesson-tag combinations from search.

### Q5. `activityType` taxonomy expansion

**Evidence:**
- Today: 4 values (cooking, garden, both, academic)
- Content audit found activities outside this lens: cosmetics-craft (Lotion & Soap), classroom-orientation (Green Room), STEM-engineering (Seed Dispersal), after-school nutrition unit (Winter After School), pull-out special-population (Atole), mobile education (Winter Fruit Salad mobile)
- Card-level activity pill is computed from skills count, NOT from `metadata.activityType` — implicit acknowledgment that the column is not authoritative

**Options:**
- **Expand to 6-8 values**: add craft, orientation, STEM, nutrition-unit, special-population, mobile. Migrate corpus.
- **Make multi-select**: allow `[cooking, craft]` for Lotion & Soap. Migrate corpus.
- **Replace with derived classification**: drop the column; classify from skills + content_text via a derivation rule. Changes the UI affordance.
- **Keep as-is**: accept the lossiness; let new lessons get crammed into the 4 buckets.

### Q6. `academicConcepts` positioning

**Evidence:**
- 88% of lessons have non-empty `academicConcepts`
- 211 distinct concept strings across 6 subjects
- 1,977 total concept appearances
- **Always object-shape today** (no array-shape post-PR-2)
- **Reviewer/LLM-derived, not teacher-written** — content audit confirmed teachers write "natural resources," "conservation," "Hoppin' John"; metadata writes "ecosystems," "cultural traditions," "immigration stories"
- No filter UI exposes it
- Cannot be cleared via UI (carry-forward semantics)
- 16 concept-pairs survive only in `lesson_versions` archive

**Options:**
- **Promote to filter**: surface in sidebar; let users filter by subject + concept hierarchy.
- **Derived index**: re-compute from content_text on every change; positional in the rebuild (don't let the submission UI write it).
- **Drop from authored UI; keep as read-only display**: status quo.
- **Hierarchical filter**: subject-level filter expands to concept-level (similar to cultural heritage hierarchy).

**Tradeoffs**: 211 distinct values is too many for a flat-list filter UI. A hierarchy or a search-only field is more realistic.

### Q7. Teacher intake form scope

**Evidence:**
- Today: zero classification metadata from teachers
- Reviewers tag everything (1361-line ReviewDetail.tsx)
- Reviewer tagging quality is uneven (immigration mistag, all-grades over-tagging, cosmetics-as-cooking)
- Teachers DO add ad-hoc tags inside their docs in middle-template lessons ("Tags–Pick a tag from each category"), but these don't roundtrip
- Submission volume is low (~10/year per memory) — reviewer load is small

**Options:**
- **Stay teacher-zero**: accept the reviewer load; invest in reviewer training and UX.
- **Light teacher tagging**: ask teachers for grade levels + activity type + season at submission. Reviewer can override.
- **Full teacher tagging**: mirror the reviewer form for teachers. Reviewer's job becomes verification + standards-alignment.
- **In-doc tag extraction**: parse the "Tags–Pick a tag from each category" middle-template block as authoritative for those lessons.

**Tradeoffs**: shifting load to teachers improves throughput but only if teacher quality is consistent.

### Q8. Sequence / variants / site-specific model

**Evidence:**
- ~25 lessons (3.2%) have real curriculum-sequence dependencies in body text
- Plan A / Plan B contingency model exists in 2 lessons
- Mobile-Education variants exist in 1+ lesson body
- Multi-class units (Winter After School Sessions) packaged as 1 lesson row
- Site-specific lessons (PS 7, PS 109, PS 216) — at least 4 in sample
- Bilingual variants (Decomposition English/Spanish) — 1 in sample

**Options:**
- **Add `series_id` + `part_index`**: model the ~25 sequenced lessons explicitly.
- **Add `parent_lesson_id` + `variant_kind`**: model Plan A/B and mobile adaptations.
- **Add `site_id`**: model school-specific authorship.
- **Add `languages_available`**: model bilingual variants.
- **Hand-curate vs structural**: count is small enough that hand-curation might suffice.

**Tradeoffs**: structural models add schema scope; hand-curation defers indefinitely. Decision is partly about how often the user-facing search needs to surface "this is part of a series."

### Additional decisions worth flagging

- **`cultural_responsiveness_features` design** — the 7-CRF stamp is theater. Drop, require evidence pointers, or replace with free-text + auto-extraction?
- **`processing_notes` design** — split into `derivation_notes` + `audit_log` table, or drop?
- **Confidence shape** — old `{level, quality_markers, ...}` (667 rows) vs new `{overall, byCategory}` (20 rows) coexist. Retire one or revalidate?
- **Embedding pipeline unification** — same model, same dims, different prompts. Worth aligning before any cross-table semantic work.
- **Dedup states** — today `detect-duplicates` produces "duplicate or not." Should there be a "same-dish-different-lesson" sibling state for cases like the two Fattoush?
- **External resources / book references / NYS standards extraction** — opt-in to structured extraction, or leave as free-text in content_text?
- **`saved_searches` UI consumer** — build it, or drop the table?
- **In-doc Comments fetch** — surface reviewer/author comments inside Google Docs, or leave invisible?

---

## Appendices

### Appendix A — Migration history (last 60 days, metadata-relevant)

| Migration | Date | Scope |
|---|---|---|
| `20260424_enrich_lesson_details_for_review.sql` | 2026-04-24 | RPC for in-review reviewers to see proposed-update lesson side-by-side |
| `20260425000000_fix_lesson_details_permissions.sql` | 2026-04-25 | Permission fix |
| `20260426010000_phase_2_category_a_backfill.sql` | 2026-04-26 | Phase-2 backfill of cooking/garden/SEL category metadata |
| `20260426000000_revoke_publish_approved_submissions.sql` | 2026-04-26 | Revoked dangerous foot-gun RPC |
| `20260427000000_phase_3_multi_review_dedup.sql` | 2026-04-27 | UNIQUE on `submission_reviews.submission_id` + archive table |
| `20260428000000_phase_4_constraints.sql` | 2026-04-28 | Phase-4 constraint setup |
| `20260428000003_phase_4_complete_review_atomic_rpc.sql` | 2026-04-28 | Initial `complete_review_atomic` |
| `20260428000007_phase_4_fix_metadata_shape.sql` | 2026-04-28 | First round of Shape III ⇄ Shape I translation |
| `20260428000008_phase_4_status_guard.sql` | 2026-04-28 | Idempotency guard |
| `20260429000000_phase_5_b_new_publish.sql` | 2026-04-29 | `approve_new` flow |
| `20260430000000_phase_6_b_update_merge.sql` | 2026-04-30 | `approve_update` flow |
| `20260501000000_phase_6_metadata_corrections.sql` | 2026-05-01 | Per-row metadata fixups; introduced plural `gradeLevels` |
| `20260502000000_phase_6_2_held_out_orphan_recovery.sql` | 2026-05-02 | Orphan recovery |
| `20260503000000_phase_6_2_fix_lost_applesauce_link.sql` | 2026-05-03 | Synthetic archive row |
| `20260504000000_phase_8b_fk_on_delete_set_null.sql` | 2026-05-04 | FK softened |
| `20260505000000_filter_drift_pr1_column_based_search_lessons.sql` | 2026-05-05 | search_lessons rewrite to read from columns |
| `20260505010000_filter_drift_pr1_activity_type_gin_index.sql` | 2026-05-05 | GIN index on `activity_type` |
| `20260506000000_filter_drift_pr2_m1_writer_fix.sql` | 2026-05-06 | Fixed lessonFormat array→scalar, AI object→array |
| `20260507000000_filter_drift_pr2_m2_backfill.sql` | 2026-05-07 | Backfill at-rest drift; extracted academicConcepts |
| `20260508000000_filter_drift_pr2_m3_column_hygiene.sql` | 2026-05-08 | Column-side hygiene |
| `20260509000000_filter_drift_pr2_m4_normalize_trigger.sql` | 2026-05-09 | Installed `lessons_normalize_write_trg` |
| `20260510000000_approve_update_concepts_carry_forward.sql` | 2026-05-10 | PR #473 carry-forward fix |

### Appendix B — Quick-reference frequencies

For sizing migration scope and prioritization:

- **Total corpus**: 772 lessons (TEST DB) / ~831 (PROD)
- **Total submissions**: 130 (TEST), 113 approved + 17 stuck
- **lesson_versions**: 7 rows (all from Phase 7c historical recovery)
- **Submission flow contribution**: 102 of 772 lessons (13.2%) came via submission flow
- **Three regimes**: ~684 legacy, ~78 submission-era, ~7 post-B-update
- **Lessons with kebab-case anywhere in metadata**: 279 (36.1%)
- **Total drift row-appearances**: ~4,920 across 10 fields (see §7 methodology footnote — figure is approximate; per-field sum reconciles to 804 by strict-kebab or 1,377 by lowercase-leading)
- **Lessons with `academicConcepts` populated**: 677 (87.7%); 211 distinct concepts; 1,977 appearances
- **Lessons with `cultural_heritage` populated**: 335 (43.4%); 78 distinct values
- **Lessons with `culturalResponsivenessFeatures` populated**: 679 (88.0%) — but never rendered
- **Lessons with content URL**: 90 (11.7%) — external resource dependency
- **Lessons with sequence pattern in title**: 12 (1.6%) — small but real
- **Lessons with year in title**: 3 (0.4%)
- **Three Unknown rows**: 3 (cleanup candidate)
- **Stuck submissions**: 14 (cleanup candidate)
- **lessons.metadata mean field count per row**: 12.55 (min 3, max 17)
- **content_text length**: median 3,835 chars (min 273, p25 2,783, p75 5,173, p95 9,439, max 49,914)
- **Update-type submissions**: 2 of 130 (the update flow is essentially unexercised in TEST)

### Appendix C — File path index

(Selection — full lists in agent reports)

**Schema / migrations**:
- `supabase/migrations/CLAUDE.md`
- `supabase/migrations/20251001_production_baseline_snapshot.sql`
- `supabase/migrations/20260505000000_filter_drift_pr1_column_based_search_lessons.sql`
- `supabase/migrations/20260506000000_filter_drift_pr2_m1_writer_fix.sql`
- `supabase/migrations/20260509000000_filter_drift_pr2_m4_normalize_trigger.sql`
- `supabase/migrations/20260510000000_approve_update_concepts_carry_forward.sql`

**Edge functions**:
- `supabase/functions/process-submission/index.ts`
- `supabase/functions/complete-review/index.ts`
- `supabase/functions/detect-duplicates/index.ts`
- `supabase/functions/extract-google-doc/`
- `supabase/functions/send-email/index.ts`
- `supabase/functions/smart-search/index.ts` (note: hardcoded synonyms)
- `supabase/functions/_shared/google-docs-parser.ts`

**Frontend types / state**:
- `src/types/index.ts` (LessonMetadata, ReviewMetadata, SearchFilters)
- `src/utils/filterDefinitions.ts` (canonical filter taxonomy)
- `src/utils/filterConstants.ts` (legacy cultural hierarchy)
- `src/utils/facetCounts.ts` (window-scoped facet computation; line 55 fragility)
- `src/stores/searchStore.ts`
- `src/lib/search.ts` (`getSearchRpcName()`)

**Frontend components**:
- `src/pages/SearchPage.tsx`
- `src/pages/SubmissionPage.tsx`, `NewSubmissionForm.tsx`, `RevisingSubmissionForm.tsx`
- `src/pages/ReviewDetail.tsx` (1361 lines)
- `src/pages/AdminDuplicates.tsx`, `AdminDuplicateReview.tsx`
- `src/components/Internal/IntCard.tsx`, `IntListRow.tsx`, `IntLessonDetail.tsx`
- `src/components/Internal/IntSidebar.tsx`, `IntCulturalHeritageSection.tsx`, `IntActivePills.tsx`
- `src/components/Internal/IntMetadataDiff.tsx`, `IntLessonSpecCard.tsx`
- `src/components/Review/ReviewMetadataForm.tsx` (dead — barrel-exported but unreferenced; replaced by inline editor in `ReviewDetail.tsx`)
- `src/components/LessonSearchPicker.tsx`

**Hooks**:
- `src/hooks/useLessonSearch.ts` (RPC bridge, normalizeMetadata defensive coercion)
- `src/hooks/useLessonSuggestions.ts`

**Plan / design docs**:
- `docs/plans/2026-04-27-phase-8b-approve-update-redesign-design.md`
- `docs/plans/2026-04-28-filter-metadata-drift-repair-design.md`
- `docs/plans/2026-04-28-filter-metadata-drift-repair-execution-status.md`
- `~/.claude/plans/lesson-submission-tier1-implementation.md`

### Appendix D — Glossary

- **Layer A / B / C / D**: the four metadata storage shapes (column, JSONB blob, frozen archive, reviewer shape) — see §1
- **Three regimes**: legacy import / submission-era / post-B-update populations of rows — see §2
- **Phase N**: ESYNYC's internal phase numbering for the lesson submission Tier-1 initiative (Phases 1-8b)
- **PR-1 / PR-2 / PR-3 / PR-4**: filter-drift-repair work organized as 4 PRs; PR-1 + PR-2 shipped (column-based search + writer/backfill/trigger fixes); PR-3 (vocabulary canonicalization) + PR-4 (heritage redesign) deferred
- **Carry-forward**: the rule that `complete_review_atomic` preserves existing data when input is missing/empty
- **B-update**: ESYNYC shorthand for the `approve_update` flow (vs `B-new` for `approve_new`)
- **Trigger**: `lessons_normalize_write_trg`, BEFORE INSERT/UPDATE on `lessons`, syncs column ⇄ JSONB for 10 of 17 fields
- **Alias helpers**: `_alias_lesson_format`, `_alias_activity_type`, `_alias_cultural_heritage`, `_match_cooking_methods` — runtime vocabulary canonicalization, intended to be removed by PR-3 (deferred)
- **Same-dish-different-lesson**: a third dedup state surfaced by the two Fattoush case study — neither "duplicate" nor "unrelated", but sibling variants of the same canonical concept

### Appendix E — How this report was assembled

This report consolidates findings from 10 parallel research agents dispatched in two rounds against the codebase, TEST DB, project memory, git history, and Google Docs:

**Round 1 (foundational coverage)**:
1. Database schema deep-dive (general-purpose, opus) — schemas, columns, JSON shapes, indexes, triggers, drift counts
2. Filter system architecture (code-explorer, opus) — filterDefinitions, store, URL, RPC, hierarchy
3. Submission/review pipeline (general-purpose, opus) — edge fns, RPCs, Phase 8b changes, carry-forward
4. Frontend metadata UX (code-explorer, opus) — cards, details, forms, dead fields, accessibility
5. Search/FTS/embeddings (general-purpose, opus) — ts_vector, embedding pipeline, synonym sources
6. Lesson content via Google Docs (general-purpose, opus) — 15 representative lessons read end-to-end
7. Known issues / tech debt (general-purpose, opus) — memory + git + beads + PR audit

**Round 2 (depth-confidence)**:
8. Quantitative metadata distributions (general-purpose, opus) — ~50 SQL queries against TEST DB for population rates, value cardinalities, drift counts
9. Targeted content sampling (general-purpose, opus) — 10 more lessons targeting under-sampled categories (academic-only, mobile-education, both Fattoush, year-tagged, sequenced)
10. lesson_versions / orphans / cross-references (general-purpose, opus) — frozen-shape verification, broken-row analysis, sequence-pattern quantification

All agents were read-only. No code was written, no migrations were applied, no production data was touched.

---

*Report prepared 2026-04-30. For questions or amendments, see git history or the linked agent transcripts.*
