# Academic Concepts Shape Simplification Report

**Date:** 2026-05-12  
**Scope:** Research/options report for `lessons.metadata.academicConcepts` before opening the Stage 1 curriculum-team worksheet.

## Executive Summary

There is a real simplification path, but it should not be framed as "drop subject information." The evidence points to a better split:

- **Lesson row:** probably wants a flat concept list.
- **Concept registry / worksheet:** should own subject association, synonyms, and any rare cross-subject notes.
- **Per-lesson subject grouping:** is barely load-bearing today and often looks like a v3 tagging artifact rather than a deliberate data model.

The important caveat: the current `{Subject: [concepts]}` shape is not purely accidental anymore. It was inherited from v3 / legacy nested output, then deliberately preserved during the filter-drift and D5 work. So changing it is valid, but it should be treated as a small schema redesign, not casual cleanup.

## 1. Deliberate-Decision Check

**Conclusion:** the current shape is somewhere in between inherited artifact and deliberate decision. The model appears inherited from LLM/import output, but the project later made an explicit preservation decision for data safety and search. What was not clearly decided is whether per-lesson subject grouping is the right long-term canonical model. That question was deferred to Stage 1.

### Evidence That The Shape Was Inherited

- `docs/plans/2026-04-30-metadata-rebuild-foundational-report.md:750`: "Always object-shape today"
- `docs/plans/2026-04-30-metadata-rebuild-foundational-report.md:751`: "Reviewer/LLM-derived, not teacher-written"
- `supabase/migrations/20260507000000_filter_drift_pr2_m2_backfill.sql:108`: "academicIntegration object-shape unwrap WITH concepts rescue"
- `supabase/migrations/20260507000000_filter_drift_pr2_m2_backfill.sql:123`: rescued nested concepts into top-level `academicConcepts`.

The inherited shape was originally embedded under:

```json
{
  "academicIntegration": {
    "selected": ["Science"],
    "concepts": {
      "Science": ["plant parts"]
    }
  }
}
```

The filter-drift work flattened `academicIntegration` into the top-level subject array and rescued the nested `concepts` object into sibling `metadata.academicConcepts`.

### Evidence That It Was Deliberately Preserved

- `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md:311`: "Object-shape preserved"
- `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md:329`: "subject groupings" were explicitly deferred to Stage 1.
- `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md:166`: `academicConcepts` is Stage-1-gated.
- `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md:180`: PR 3a adds concepts to `search_vector`.
- `supabase/migrations/20260521000000_search_vector_with_concepts.sql:10`: concepts "live" as `{Subject: [concept,...]}`.
- `supabase/migrations/20260521000000_search_vector_with_concepts.sql:16`: FTS helper flattens that shape.

The D5 decision did deliberately preserve the object shape, but the rationale was mostly preservation/search/deferral, not a proven argument that subject grouping belongs on each lesson row.

## 2. Consumer Map

### Search / SQL

- `supabase/migrations/20260521000000_search_vector_with_concepts.sql:50` defines `_flatten_academic_concepts(jsonb)`.
  - **Behavior:** flattens subject keys plus concept values into one text string.
  - **Subject grouping:** not used relationally; subject words become search tokens.

- `supabase/migrations/20260521000000_search_vector_with_concepts.sql:93` calls `_flatten_academic_concepts(NEW.metadata->'academicConcepts')`.
  - **Behavior:** inserts concepts into the C-weight FTS block.
  - **Subject grouping:** flattened.

- `supabase/migrations/20260523000000_flatten_academic_concepts_safer.sql:56` hardens the helper.
  - **Behavior:** guards against non-object shapes.
  - **Subject grouping:** still only shape input to flattening.

- `supabase/migrations/20260520020000_search_lessons_filter_retired.sql:147` overlays `academicConcepts` into RPC result metadata from legacy nested shape if needed.
  - **Behavior:** preserves object in result payload.
  - **Subject grouping:** preserved, not interpreted.

- `src/hooks/useLessonSearch.ts:58` normalizes only `academicIntegration`.
  - **Behavior:** if `academicIntegration` is object-shaped, extracts `selected`.
  - **Subject grouping:** concepts ignored.

- `src/hooks/useLessonSearch.ts:117` sends `filter_academic`.
  - **Behavior:** filters by top-level academic subject array.
  - **Subject grouping:** no concept filtering.

### Embeddings

- `scripts/generate-embeddings.mjs:93` documents the current shape.
- `scripts/generate-embeddings.mjs:98` iterates `[subject, concepts]`.
- `scripts/generate-embeddings.mjs:109` emits one `Concepts:` line.
  - **Behavior:** subject keys plus values are flattened into embedding text.
  - **Subject grouping:** subject labels influence embedding as tokens, not as structure.

- `scripts/test-prepare-lesson-text.mjs:6` tests shape flattening.
- `scripts/test-prepare-lesson-text.mjs:61` expects interleaved subjects and concepts.
  - **Behavior:** locks flattening behavior.
  - **Subject grouping:** not tested as semantic grouping.

### Reviewer UI / Mapping

- `src/pages/ReviewDetail.tsx:933` renders "Academic".
- `src/pages/ReviewDetail.tsx:935` uses `ALL_FIELD_CONFIGS.academicIntegration`.
  - **Behavior:** reviewer edits top-level academic subjects.
  - **Subject grouping:** no concepts editor today.

- `src/types/reviewFormPayload.zod.ts:52` accepts only `academicIntegration: string[]`.
  - **Behavior:** review form surface excludes concepts.
  - **Subject grouping:** unavailable in reviewer form.

- `src/utils/lessonToReviewMapper.ts:15` documents canonical object regimes.
- `src/utils/lessonToReviewMapper.ts:72` extracts `selected` from object-shaped `academicIntegration`.
  - **Behavior:** concepts are dropped when entering review form.
  - **Subject grouping:** ignored.

- `src/utils/reviewToLessonMapper.ts:69` writes only `academicIntegration`.
  - **Behavior:** review form does not produce concepts.
  - **Subject grouping:** not produced.

- `src/utils/reviewToLessonMapper.test.ts:237` documents `academicConcepts` as canonical-only.
- `src/utils/reviewToLessonMapper.test.ts:267` confirms round-trip drops `academicConcepts`.
  - **Behavior:** lossiness is intentional/tested.
  - **Subject grouping:** intentionally absent from current review payload.

### Public / Internal UI

- `src/utils/filterDefinitions.ts:172` defines `academicIntegration` with six subject values.
  - **Behavior:** subject-level filter.
  - **Subject grouping:** no concepts.

- `src/utils/facetCounts.ts:63` unwraps `academicIntegration.selected`.
  - **Behavior:** counts subjects.
  - **Subject grouping:** no concepts.

- `src/components/Internal/IntLessonDetail.tsx:20` extracts selected subjects.
- `src/components/Internal/IntLessonDetail.tsx:77` renders "Academic" subjects.
  - **Behavior:** detail view shows subjects only.
  - **Subject grouping:** concepts not rendered.

### Schemas / Types

- `src/types/lessonMetadata.zod.ts:75` has `academicIntegrationObjectSchema`.
- `src/types/lessonMetadata.zod.ts:108` defines `academicConcepts: z.record(z.string(), z.array(z.string())).optional()`.
  - **Behavior:** preserves current object shape.
  - **Subject grouping:** accepted but open-string.

- `supabase/functions/_shared/metadataSchemas.ts:54` mirrors the object schema.
- `supabase/functions/_shared/metadataSchemas.ts:87` mirrors top-level `academicConcepts`.
  - **Behavior:** Deno mirror accepts same shape.
  - **Subject grouping:** accepted but not constrained.

- `src/types/index.ts:1` says academic integration can be array or object with concepts.
- `src/types/index.ts:45` exposes `academicIntegration` on `LessonMetadata`.
  - **Behavior:** app-level UI type does not expose top-level `academicConcepts`.
  - **Subject grouping:** mostly invisible to app code.

- `src/types/database.types.ts:1474` has RPC `metadata: Json`.
  - **Behavior:** raw JSON only.
  - **Subject grouping:** untyped.

### Writers / Migrations

- `supabase/migrations/20260515000000_metadata_value_validation.sql:197` rescues nested `academicIntegration.concepts`.
- `supabase/migrations/20260515000000_metadata_value_validation.sql:206` copies it into `academicConcepts`.
  - **Behavior:** preservation path.
  - **Subject grouping:** preserved.

- `supabase/migrations/20260519000000_complete_review_atomic_tags_side_channel.sql:173` rescues object-shape concepts.
- `supabase/migrations/20260519000000_complete_review_atomic_tags_side_channel.sql:286` carries forward existing `academicConcepts` when review UI omits them.
  - **Behavior:** prevents silent wipe.
  - **Subject grouping:** preserved, but not editable.

### LLM Prompts

- `supabase/functions/process-submission/index.ts:351` current auto-tag path is CRF.
- `supabase/functions/process-submission/index.ts:447` current auto-tag path is activity type.
  - **Behavior:** no live concepts prompt yet.

- `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md:172` says Stage-1-gated prompts do not deploy with v3 baseline vocabulary.
- `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status-archive.md:327` says the planned prompt bundles top-level subjects plus nested concepts in one body read.
  - **Behavior:** future concept prompt currently assumes object shape.
  - **Subject grouping:** forward-looking, not live.

## 3. Load-Bearingness Of Subject Grouping

Subject grouping is storage-preserved but not very load-bearing in runtime behavior.

### What Uses It Structurally

- Zod schemas accept it.
- SQL triggers and review RPCs preserve / carry it forward.
- FTS and embeddings include subject keys as tokens.
- Future prompt plan currently expects "subjects array + concepts object."

### What Does Not Use It Structurally

- No UI presents concepts grouped by subject.
- No filter lets users filter by concept or subject-concept pair.
- The public filter only uses top-level `academicIntegration` subjects.
- Reviewer UI edits subjects only; concepts are invisible and carried forward.
- FTS does not know "`biodiversity` under Science"; it indexes "Science biodiversity."
- Embeddings do not know a relation; they receive one flat `Concepts:` line.

The current object shape mostly serves data preservation and future-work compatibility. It is not currently needed for user-facing behavior.

## 4. Cross-Subject Lens Story

TEST verification after reconnect:

- TEST URL verified: `https://rxgajgmphciuaqzvwmox.supabase.co`
- Live rows with `retired_at is null`: 751
- Live rows with object `academicConcepts`: 663
- Live rows missing the key: 88
- Live non-object keys: 0

Subject-count summary from TEST for the 8 cross-subject concepts plus two controls:

| Concept | Subject counts | Read |
|---|---:|---|
| biodiversity | Science 6, Social Studies 1 | Mostly artifact |
| companion planting | Science 10, Social Studies 3 | Mixed |
| historical figures | Social Studies 68, Literacy/ELA 1 | Mostly artifact / weak ELA lens |
| nutrition education | Health 100, Science 7 | Mixed |
| observation | Science 5, Arts 1 | Real lens distinction |
| poetry | Arts 1, Literacy/ELA 1 | Mixed / likely weak singleton |
| preservation | Science 3, Social Studies 1 | Real lens distinction |
| storytelling | Literacy/ELA 75, Arts 1 | Likely artifact |
| plant parts | Science 239 | Clean control |
| measurement | Math 66 | Clean control |

### Concept Reads

#### Biodiversity

Science examples are directly ecological. The Social Studies singleton is a Three Sisters / Lenape story row where biodiversity looks like a science concept placed under Social Studies.

**Classification:** tagging artifact.

#### Companion Planting

Science rows use it as an agricultural / planting technique. Social Studies rows tie it to Three Sisters cultural tradition. This is genuinely cross-curricular, but the term itself is still science / agriculture-shaped.

**Classification:** mixed / unclear.

#### Historical Figures

Social Studies is dominant. The one Literacy/ELA row is Dr. Carver via story reading; that is a possible literacy lens, but it is also a biography/history concept.

**Classification:** mostly artifact / weak ELA lens.

#### Nutrition Education

Health dominates. Science rows range from defensible, like glucose testing, to generic tasting/culture rows that look misplaced.

**Classification:** mixed / unclear.

#### Observation

Clean lens split. Science = nature observation. Arts = observational drawing.

**Classification:** real per-subject lens distinction.

#### Poetry

ELA is natural. The Arts singleton had weak title/summary support.

**Classification:** mixed / likely weak singleton.

#### Preservation

Clean but small lens split. Science = food/plant preservation process. Social Studies = historical preservation methods.

**Classification:** real per-subject lens distinction.

#### Storytelling

The Arts singleton is also tagged Literacy/ELA in the same row; that reads as duplicate/artifact.

**Classification:** tagging artifact.

### Controls

- `plant parts` under Science: titles/summaries support Science.
- `measurement` under Math: titles/summaries support Math.

### Lens-Story Conclusion

Only 2 of 8 cross-subject concepts showed a clean per-subject lens. Most cross-subject evidence is either singleton noise, same concept under a better primary subject, or cross-curricular context that could be modeled in a registry rather than repeated on every lesson row.

## 5. Simplification Options

### Option 1: Keep Current Shape, Open Worksheet As Planned

**Description:** Keep `metadata.academicConcepts = {Subject: [concepts]}` and ask curriculum team to canonicalize within / alongside subject groupings.

**Costs:**

- No immediate migration.
- No FTS regeneration beyond what already shipped.
- No embedding regeneration beyond current PR 3a work.
- No schema/type/UI churn.
- Worksheet must explicitly handle subject grouping, near-duplicates, and concept-vs-theme redundancy.

**Gains:**

- Lowest operational risk.
- Preserves rare real lens distinctions like `observation` and `preservation`.
- Respects D5's explicit "object-shape preserved" decision.

**Losses / risks:**

- Curriculum team works against the complex substrate.
- Subject grouping may harden v3 artifacts into canonical structure.
- The worksheet may spend time resolving subject buckets that almost no runtime consumer uses.

**Timing:** can happen now, but this is not a meaningful simplification.

### Option 2: Concept-First Worksheet, Keep DB Shape For Now

**Description:** Do not migrate yet. Redesign the worksheet around canonical concepts first, with observed subjects as evidence columns rather than the primary organizing structure.

**Costs:**

- No code/migration before the worksheet.
- Worksheet template changes: canonical concept, current subject(s), primary subject(s), allowed secondary subjects, synonyms, theme overlap, and "per-lesson subject override needed?"
- Later implementation can choose whether to keep object storage or flatten.

**Gains:**

- Gives curriculum team a simpler mental model immediately.
- Avoids locking in subject artifacts.
- Still preserves all current data until the worksheet tells us what is real.
- Turns the 8 cross-subject cases into evidence questions, not schema commitments.

**Losses / risks:**

- Does not simplify runtime code yet.
- Requires discipline: the worksheet must not silently become six separate subject worksheets.
- If curriculum team decides subject grouping really matters, a later migration may still keep the object.

**Timing:** should happen before the concepts worksheet opens.

### Option 3: Flatten Lesson Row + Add Concept Registry

**Description:** Change lesson rows to store flat `academicConcepts: string[]`; introduce a canonical registry where each concept owns `subjects`, optional `primarySubject`, synonyms, and notes.

**Costs:**

- New migration to transform existing objects into flat arrays.
- Possibly new `academic_concept_registry` table, or generated enum/JSON artifact if registry should stay out of DB at first.
- Update `_flatten_academic_concepts` and FTS trigger.
- Re-run FTS regeneration.
- Update `scripts/generate-embeddings.mjs` and `scripts/test-prepare-lesson-text.mjs`.
- Update TS Zod schema and Deno mirror.
- Update `complete_review_atomic` rescue/carry-forward paths.
- Update normalize trigger that rescues nested `academicIntegration.concepts`.
- Update `search_lessons` metadata overlay.
- Regenerate/patch database types.
- Update tests that expect object shape.
- Decide whether subject tokens still go into FTS/embeddings from registry.
- Decide how to represent rare per-lesson subject overrides.

**Gains:**

- Cleanest long-term substrate.
- Aligns with the empirical fact that nearly all concepts are subject-invariant.
- Makes cross-subject meaning explicit in one registry, not repeated in every lesson row.
- Future LLM prompt can output flat concepts plus top-level `academicIntegration` subjects.

**Losses / risks:**

- Real lens distinctions may be flattened unless registry supports multi-subject or overrides.
- More implementation work before worksheet.
- Requires stakeholder/product decision on registry fields before curriculum work starts.
- If done too early, it bakes current inference into schema before the worksheet validates the taxonomy.

**Timing:** only before worksheet if the project is willing to pause and make a schema/model decision now. Otherwise let Option 2's worksheet produce the registry and migrate after.

### Option 4: Drop Concepts Into Themes/Tags

**Description:** Remove `academicConcepts` as its own field and fold values into `thematicCategories` or tags.

**Costs:**

- Migration/backfill.
- FTS and embedding rewrite.
- Prompt/schema/test rewrites.
- Curriculum worksheet loses a distinct concept layer.

**Gains:**

- Simplest field count.
- Removes a hidden metadata surface.

**Losses / risks:**

- Wrong granularity. Themes are broad; concepts are fine-grained.
- TEST data shows only 3 strings overlap with themes: `ecosystems`, `food systems`, `plant growth`.
- D5 reasoning says concepts capture ideas not named in body text; dropping them costs findability.
- Tags are operational labels, not academic taxonomy.

**Timing:** should not happen.

## 6. Recommendation

If I were maintaining this, I would not open a subject-first concepts worksheet. I would open a concept-first worksheet now, with subject grouping demoted from "storage shape we must preserve" to "evidence to validate." That gives the curriculum team the simpler substrate immediately without doing a risky pre-worksheet migration.

Concretely: keep production storage unchanged for the moment, but make the worksheet canonical-concept-first. Add columns for observed subjects, recommended primary/secondary subjects, synonyms, theme overlap, and "needs per-lesson subject lens?" After the worksheet, if almost all concepts have stable subject ownership and only a tiny handful need exceptions, migrate to flat lesson-row concepts plus a registry. If the worksheet finds that per-lesson subject lens is pedagogically important at scale, keep the object shape knowingly.

My bias: **Option 2 now, with Option 3 as the likely post-worksheet implementation path.** This avoids locking in v3's subject buckets, protects current search/embedding behavior, and lets the curriculum team answer the question the data cannot fully answer: whether subject association belongs to the concept itself or to each lesson-concept assignment.
