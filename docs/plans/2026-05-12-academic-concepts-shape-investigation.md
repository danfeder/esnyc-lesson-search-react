# `lessons.metadata.academicConcepts` — shape simplification investigation

**Date:** 2026-05-12
**Context:** Pre-flight check before opening the Stage 1 curriculum-team worksheet for `academicConcepts`. The maintainer asked whether the field's shape (`{Subject: [concept, ...]}`) should be simplified or restructured before the worksheet locks the current complexity in.

**Method:** Four read-only Opus subagents fanned out in parallel across (A) the decision journal + design docs, (B) the search + embedding pipeline, (C) the frontend / Zod / reviewer UI, and (D) a TEST-DB data-lens read of all 8 cross-subject concepts plus 2 single-subject controls. This document synthesizes their findings.

---

## 1. Was the current shape a deliberate decision?

**Verdict: IN-BETWEEN — the shape was *acknowledged and retained*, never *comparatively evaluated*.**

The decision journal records, in `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` lines 305-325 (D5, status DECIDED 2026-05-01):

> **Schema:** `metadata.academicConcepts` stays. Object-shape preserved (`{Subject: [concept, ...]}`).
> **UI surfacing:** none in foundation phase. No sidebar filter, no card rendering, no detail-view rendering.

That's the entire shape statement — one bullet, in a Decision whose actual *content* is about UI/search positioning. The 5-bullet Reasoning block argues *whether to keep concepts at all* and *whether to surface them as a UI filter* (211 distinct values too many for a flat filter). It never argues why a subject-keyed object beats alternatives like a flat array, an array of `{subject, concept}` pairs, or split columns.

The only place subject-grouping appears as an OPEN question is line 329, in the deferred sub-question list:

> **Per-concept canonicalization, hierarchy structure, subject groupings** — Stage 1 worksheet for concepts.

So D5 explicitly *deferred* the subject-grouping question to the worksheet, but D5 itself preserved the shape as a passive premise.

The original framing in `2026-04-30-metadata-rebuild-stakeholder-decisions.md` describes concepts as "organized by subject" — treating subject grouping as a property of the data, not as a design choice. All 4 options enumerated for D5 ("Promote to filter", "Treat as derived index", "Drop it", "Hybrid") are about UI surfacing; none touches storage shape.

The foundational report (`2026-04-30-metadata-rebuild-foundational-report.md`) confirms two things:
- Line 109 traces the subject-keyed pattern to the legacy `academicIntegration: {selected, concepts: {Subject: [...]}}` regime — i.e., **the shape predates the v3 GPT-4.1 batch run; it's an inherited legacy-import convention.** The B-update reshape lifted `concepts` from inside `academicIntegration` up to a top-level `academicConcepts`, but kept the inner subject-keyed object intact.
- Line 372 explicitly acknowledges the field is "reviewer/LLM-derived, not teacher-written" — vocabulary like "ecosystems," "cultural traditions," "decomposition" was *not* in the teacher source text but appears in the metadata.

The PR 3a migration body (`supabase/migrations/20260521000000_search_vector_with_concepts.sql:6-23`) describes the shape as a data fact to flatten over — no rationale discussion at all:

> Concepts live in lessons.metadata.academicConcepts as a `{Subject: [concept,...]}` object (663/751 active rows on TEST as of this migration). They are absent from FTS today...
> (1) Helper public._flatten_academic_concepts(jsonb) -> text. Flattens the `{Subject: [concept,...]}` shape to a single space-separated string of subject keys + concept values.

**Bar-to-change calibration.** The shape isn't a deliberate v3-era design choice you'd be overturning. It's a legacy-import inheritance that D5 preserved as a side-effect of a UI-positioning decision, with the subject-grouping question explicitly punted to the Stage 1 worksheet. The maintainer is, in effect, asking whether to surface that punted question *now* (as a shape question) rather than at worksheet-decision time (as a content question with a fixed shape).

---

## 2. Consumer map

Below is every consumer that READS the field, with `FLATTENS` / `USES-SUBJECT` / `OTHER` per consumer. (Writers excluded because nothing in the live UI writes `academicConcepts` — it's reviewer/LLM-derived only.)

### Server-side (search + embeddings pipeline)

- `supabase/migrations/20260521000000_search_vector_with_concepts.sql:50-66` — `_flatten_academic_concepts(jsonb) -> text` helper — **FLATTENS** (joins subject keys + concept values into one space-separated string for FTS).
- `supabase/migrations/20260521000000_search_vector_with_concepts.sql:88-95` — `update_lesson_search_vector()` trigger — **FLATTENS** (calls the helper inside the C-weight bucket alongside thematic_categories/cultural_heritage/skills).
- `supabase/migrations/20260521000000_search_vector_with_concepts.sql:121` — backfill `UPDATE lessons SET metadata = metadata` — **FLATTENS** (re-fires trigger).
- `supabase/migrations/20260523000000_flatten_academic_concepts_safer.sql:56-76` — defensive rewrite of helper (handles non-object inputs) — **FLATTENS**.
- `scripts/generate-embeddings.mjs:71-122` — `prepareLessonText()` builds the OpenAI embedding input — **FLATTENS** (emits a single `Concepts: subject, concept, subject, concept, ...` comma-joined line).
- `scripts/test-prepare-lesson-text.mjs:53-117` — verification harness asserting flatten contract — **FLATTENS**.
- `supabase/functions/smart-search/index.ts:129-158` — issues `textSearch('search_vector', …)` — **OTHER** (FTS-only; passes whole `metadata` jsonb through opaque to caller).
- `supabase/functions/search-lessons/index.ts:62-78` — sibling edge fn (deployed, no live front-end caller) — **OTHER**.
- `supabase/functions/_shared/search-helpers.ts:116-153` — `transformRow()` — does NOT reference `academicConcepts` at all.
- `supabase/migrations/20260514000000_search_lessons_filter_tags.sql:183-187` — current `search_lessons` RPC overlay — **OTHER** (promotes the `{Subject: [...]}` jsonb subtree verbatim into the result row's top-level `academicConcepts` field; doesn't read subject keys; passing them through to a caller that may or may not look at them).
- Prior versions of the same RPC at `20260512000000_drop_lesson_format.sql:255-260` and `20260505000000_filter_drift_pr1_column_based_search_lessons.sql:349-353` — byte-identical overlay — **OTHER**.

### Frontend, Zod schemas, types, reviewer UI, public surfaces

- `src/types/lessonMetadata.zod.ts:108` — canonical Zod schema: `academicConcepts: z.record(z.string(), z.array(z.string())).optional()` — **OTHER** (declares shape, no closed enum on subject keys, fully permissive).
- `supabase/functions/_shared/metadataSchemas.ts:87` — Deno-runtime mirror, identical — **OTHER**.
- `src/types/database.types.ts:247` — DB row's `metadata` is `Json`, opaque — no `academicConcepts` field at all.
- `src/types/index.ts:28-48` — hand-written `LessonMetadata` interface used by every live UI component — **does not declare `academicConcepts`**. The field is invisible to UI's type system.
- `src/pages/ReviewDetail.tsx` (~1451 lines) — **zero references** to `academicConcepts` or "concept" in the reviewer body. No form widget, no render block, no save call. Reviewers cannot add, view, edit, or remove concepts.
- `src/utils/filterDefinitions.ts:172-183` — `academicIntegration` filter (flat 6-pill subject multi-select, e.g., "Math", "Science"). No `academicConcepts` filter. Filters operate on a flat `string[]` of subject names, not on concepts.
- `src/utils/facetCounts.ts:63-68` — `academicIntegration` facet bucket — **FLATTENS** (extracts `selected[]`, ignores `concepts` map; no `academicConcepts` facet key exists).
- `src/components/Internal/IntLessonDetail.tsx`, `IntSidebar.tsx`, `IntCard.tsx`, `IntListRow.tsx` — admin-side lesson surfaces — **none reads `academicConcepts`**.
- `src/components/Common/ScreenReaderAnnouncer.tsx:31-32` — announces "N academic subjects" — **FLATTENS** (subject count of the flat filter, not concepts).
- `src/utils/lessonToReviewMapper.ts:72-82` — when canonical metadata has the legacy `academicIntegration: {concepts, selected}` form, extracts `selected[]` only and discards `concepts` — **FLATTENS by design**.
- `src/utils/reviewToLessonMapper.ts:26-88` — review→canonical mapper does NOT write `academicConcepts`; documented as a lossy-round-trip case.
- Tests in `reviewToLessonMapper.test.ts`, `facetCounts.test.ts`, `useLessonSearch.test.ts`, `edgeSharedSchemas.equivalence.test.ts` — most assert flatten behavior; one (`equivalence.test.ts`) preserves shape end-to-end through Zod parse but has no downstream UI.
- `supabase/functions/process-submission/` — **zero references** to `academicConcepts`. Field is gated on future Stage 1 worksheet; no scaffold, no prompt, no stub type, no LLM output schema mentions it.

**Tally.** In the server pipeline: 6 FLATTENS, 0 USES-SUBJECT, 5 OTHER (mostly opaque pass-through). In the UI/Zod side: 0 PRESERVES-SUBJECT (in live render or filter code), 5 FLATTEN (on the *legacy* `academicIntegration.concepts` sibling — not the field under question), and the rest don't touch it at all. **Zero live consumers anywhere read the subject keys for branching, weighting, faceting, or grouping.**

---

## 3. Load-bearing analysis

The single most important finding: **the field is schema-declared but UI-orphaned.** No live UI reads it; no filter exposes it; no reviewer can edit it; no public surface displays it. Even the hand-written `LessonMetadata` interface in `src/types/index.ts` (used by every component) doesn't declare it — only the Zod schema does. The DB has 663 populated rows, but the application's runtime type system pretends the field doesn't exist on the lesson object.

On the server side, the subject grouping is *structurally preserved but semantically discarded*. The FTS trigger emits subject keys as additional tokens at the same C-weight as the concept values — so a search for "Science" matches lessons tagged with concepts under Science, but only as a coincidental token-match, not via any branching logic. The embedding pipeline does the same: subject and concept values get joined into one `Concepts: a, b, c, d` line and embedded together. The `search_lessons` RPC passes the `{Subject: [...]}` jsonb through verbatim to the frontend — where nothing reads it.

**So the answer to "where does subject grouping matter?" is: nowhere, today.** The only place it survives end-to-end is inside the Zod schema's type signature and the database row itself. Every downstream branch either flattens it (FTS, embeddings) or ignores it (UI).

This dramatically lowers the cost of a shape change: there is no UI to migrate, no reviewer workflow to retrain, no user-visible behavior to preserve. The change-cost is purely mechanical.

It also raises a different question: if subject grouping isn't load-bearing now, *would it become load-bearing in the future?* That depends on whether anyone plans a subject-aware UI (a hierarchical filter, a subject-grouped concept display, a subject-scoped reviewer editor). D5 deferred that question; the foundation phase explicitly chose "none in foundation phase."

---

## 4. Cross-subject lens story

Of 8 cross-subject concepts, the TEST-DB data-lens read produced **4 REAL LENS DISTINCTION / 4 MIXED-UNCLEAR / 0 pure TAGGING ARTIFACT**.

The strongest lens-distinction cases:

- **observation** (Arts vs Science) — Arts side: "Spring Special Spot" pairs observation with `drawing` (looking-to-render). Science side: "4 Color Scavenger Hunt," "Rachel Carson," "In the Garden with Dr. Carver" (looking-to-record). Textbook lens case — same word, distinct cognitive practices.
- **historical figures** (Literacy/ELA vs Social Studies) — ELA side: "In the Garden with Dr. Carver" treats Carver as a read-aloud protagonist (story-subject lens). SS side: 5 lessons treat figures as actors in historical eras (Cesar Chavez, colonial era, Black History Month) — agency-in-context lens.
- **preservation** (Science vs Social Studies) — Science side: pickling, canning, glycerite extraction (process chemistry). SS side: "Three Sisters Succotash" comparing modern vs past methods (historical-technique lens). Notably the Great Depression "Bud Not Buddy/Jam" canning lesson got tagged Science — suggesting reviewers' subject calls are deliberate, not random.
- **biodiversity** (Science vs Social Studies) — Science side: ecological-mechanism lessons (5 examples). SS side (1 example, "The Story of the 3 Sisters") — biodiversity as a property of Lenape agricultural tradition. Real lens, but the SS side is thin.

The 4 unclear cases:

- **companion planting** — only Social Studies rows surfaced; the Science side returned 0 rows in TEST snapshot. Can't actually demonstrate the cross-subject.
- **nutrition education** — mostly interchangeable cooking-and-tasting lessons across Health and Science; only "Glucose Regulation" (Science) is clearly lab-shaped. Borderline tagging-artifact, saved by one real exemplar.
- **poetry** — Literacy/ELA side has explicit writing-poetry lessons ("Sensory Poetry", "Summer Sun Risin'"); Arts side has 1 row where "poetry" appears as a passing hook in a general garden lesson. Tagging-artifact-leaning.
- **storytelling** — only Arts-side row is *also* tagged Literacy/ELA storytelling on the same lesson, so doesn't isolate an Arts-only frame.

Controls (plant parts Science only, measurement Math only) tagged consistently with lesson focus — single-subject tagging is not randomly noisy.

**Synthesis.** Subject grouping carries real signal for the strongest cross-subject concepts (observation, historical figures, preservation, biodiversity all distinguish Science/inquiry vs humanities/context lenses), and is interchangeable noise for the weaker ones. The 4/8 lens-signal cases are real and would be irreversibly lost if subject grouping were flattened without preserving it elsewhere. But because zero UI surfaces subject grouping today, the signal is currently doing no work — it exists only as a potential affordance for future subject-aware features.

---

## 5. Simplification options

Each option assumes a one-time data-and-schema migration (not stakeholder content work). All operate on `academicConcepts` only — `thematicCategories`, `academicIntegration`, etc. are out of scope.

### Option A — Status quo. Run the Stage 1 worksheet against the current subject-keyed object.

- **Mechanism.** No shape change. Worksheet canonicalizes vocabulary in place: collapse `plant identification` / `identifying plants` / `plant ID` etc. while preserving subject-grouping per concept.
- **Cost to implement.** Zero schema/code. Worksheet methodology already designed for this shape.
- **Gains.** No risk of irreversible data loss. The 4/8 lens-distinction signal stays available for future use. Sequencing matches the existing project plan (D5 already deferred subject-grouping as a content question for the worksheet).
- **Loses.** Locks the subject-keyed shape into worksheet outputs. If a later decision flattens, the worksheet's per-subject decisions need re-mapping. Doesn't address the 200-of-208 per-row redundancy (single-subject concepts carrying their subject everywhere).
- **Sequencing.** Worksheet can open immediately.

### Option B — Flat array on lesson rows; subject(s) move to a canonical concept registry.

- **Mechanism.** Lesson row becomes `academicConcepts: ["plant parts", "biodiversity"]` (`text[]`). A new `concept_registry` table stores each canonical concept once with its subject set: `("biodiversity", ARRAY["Science", "Social Studies"])`. With 208 distinct concepts (200 single-subject, 8 cross-subject), the registry is ~216 rows.
- **Cost to implement.** One migration to transform metadata across 663 rows; one new table + RLS + indexes; update `_flatten_academic_concepts` (now joins through registry to emit subject tokens) OR drop subject tokens from FTS entirely; update Zod schema (1 line + Deno mirror); embedding regen for 663 rows (~$0.05 OpenAI cost, ~10min wall); update `search_lessons` RPC overlay (returns `text[]` or joins through registry); update relevant tests. Mechanical — maybe 8-10 files. No stakeholder input needed for the shape change itself, but the worksheet methodology needs adjustment so its outputs land in the right place (lesson-row writes use the flat array; subject-set decisions populate the registry).
- **Gains.** Eliminates 200-of-208 per-row redundancy. The 4/8 real-lens-distinction signal is preserved in the registry rather than per-row, which is actually the correct shape for it: "observation has both Arts and Science contexts" is a property of the concept, not of every lesson that uses it. Future hierarchical filter, subject-grouped display, or subject-aware reviewer editor all work naturally. Single point of truth for vocab → curriculum-team edits to canonicalization happen in one place.
- **Loses.** Per-lesson "which Science concepts does lesson X teach" requires a join — currently it's a single jsonb path lookup. (But the data shows no live consumer asks that question; only the FTS trigger touches it, and the trigger can join.) Reviewer UI (when built) becomes slightly more complex — choosing a concept may need to surface its registered subject(s) for context.
- **Sequencing.** BEFORE the worksheet. Doing it after means worksheet outputs structure the wrong shape, requiring re-work.

### Option C — Flat array on lesson rows; subject grouping dropped entirely.

- **Mechanism.** Lesson row becomes `academicConcepts: ["plant parts", "biodiversity"]`. Subject information is discarded.
- **Cost to implement.** One migration (simpler than B — no registry table); update `_flatten_academic_concepts` to drop subject-key tokens from FTS (or simplify to a plain `jsonb_array_elements_text`); update Zod schema; embedding regen; update RPC overlay; update tests. Maybe 5-7 files. Smaller change than B.
- **Gains.** Maximum simplicity. The 7 of 8 cross-subject concepts that are "MIXED/UNCLEAR" collapse cleanly into single concepts. Worksheet methodology becomes simpler — curriculum team canonicalizes ~200 strings, no per-concept subject decisions. FTS becomes cleaner (no subject keys at the same weight as concept values).
- **Loses.** The 4/8 real-lens-distinction signal is irreversibly lost. "Observation" can no longer mean two different cognitive practices. "Historical figures" can no longer distinguish story-subject from historical-actor. Recovering this would require re-tagging from lesson body text. **This is the asymmetric-irreversibility risk** under the data-safety constraint.
- **Sequencing.** BEFORE the worksheet — otherwise the worksheet's subject decisions are wasted effort.

### Option D — Status quo + cheap mechanical vocab pre-pass, no shape change.

- **Mechanism.** Before the worksheet opens, apply trivially-mechanical near-duplicate string merges within each subject (e.g., `plant identification` / `identifying plants` / `plant ID` → `plant identification`; `adaptation` / `adaptations` → `adaptations`; `seasonality` / `seasonal changes` / `seasonal change` / `seasonal cycles` → `seasonal changes`). String-similarity merge with a high confidence threshold (95%+ Jaro-Winkler or similar).
- **Cost to implement.** A ~50-line script that does the matching + a single UPDATE migration; manual review of the merge list before applying. No schema change, no Zod change, no FTS or embedding regen needed (vocab values just collapse). 2-4 files of work.
- **Gains.** Reduces worksheet load (208 → maybe 170-180 distinct concepts). Eliminates the most obvious singleton-as-typo cases (42% of Science concepts are singletons, many likely near-duplicates). Worksheet decisions get applied to a cleaner starting state.
- **Loses.** Nothing structural. This is vocab cleanup the worksheet was going to do anyway — moving it left in the pipeline doesn't change what gets decided, only when.
- **Sequencing.** Optional — can run before the worksheet, but doesn't block it.

(Note: folding concepts into `thematicCategories` is explicitly ruled out — themes operate at 13-value granularity while concepts have 208; different granularities, not interchangeable.)

---

## 6. Recommendation

If I were the maintainer, I would **NOT make a shape change before the worksheet opens. I would run Option A as planned (status quo), with Option D as an optional pre-pass.** Here is the reasoning, plain-language:

The data evidence says two slightly opposing things. First, subject grouping is doing *zero work* today — no live UI reads it, no filter uses it, no reviewer touches it, the server pipeline flattens it. That makes it look like dead weight in the schema. Second, the subject grouping *does* carry real signal for 4 of 8 cross-subject concepts — "observation" really does mean different things in Arts and Science contexts. That signal is irreversibly lost if you flatten without preserving it elsewhere.

Those two facts taken together would normally point toward Option B (extract subject to a registry — keep the signal, drop the per-row redundancy). And B is genuinely defensible: it's the cleaner long-term schema, the migration is mechanical, no stakeholder input is needed for the shape change itself, and the field is so UI-orphaned that there's nothing to retrain.

But three things push me back toward A:

1. **D5 already deferred the subject-grouping question to the Stage 1 worksheet.** The maintainer agreed, in the existing project plan, that this is a worksheet question. The worksheet's job is to settle subject membership per concept *as content*. Doing a shape change now pre-empts a content decision that's about to happen. The worksheet might tell you "actually, 6 of 8 cross-subject concepts should be merged into single-subject canonicals" — at which point you'd want a different registry than the one Option B builds today.

2. **Stage 2 plans to re-tag concepts from scratch.** D5 explicitly says "Stage 2 re-tag in both framework AND everyday vocabularies." If Stage 2 regenerates the field via a new LLM pass against the canonicalized vocabulary, the current 663 rows get overwritten anyway. Shape work now might be wasted; doing it after Stage 2 lets the regeneration write directly into the chosen shape.

3. **The data-safety constraint says the right move is rehearse-on-test, snapshot, idempotent, smallest-first.** Option A is the smallest possible step. Option B is a multi-table migration with embedding regen — defensible, but not the smallest step that unblocks the worksheet. The worksheet opens just fine against the current shape.

So the proposed sequence:

- **Now (before worksheet opens):** Optionally run Option D's mechanical near-duplicate pre-pass. This shrinks the worksheet by ~15-20% without any structural commitment. It's pure vocab cleanup the curriculum team was going to do anyway. Skip it if even that feels like premature optimization — the worksheet handles vocab fine.
- **Now (worksheet methodology adjustment, if you want optionality):** Add one column to the worksheet output schema — `canonical_subject(s)` per canonical concept. The curriculum team is already making subject judgments (deciding which subjects each canonical concept belongs to). Capturing that decision as a *flat list of (concept, subject-set)* rather than only as in-place subject-keyed cells gives you the input data for Option B as a *future* migration, after Stage 1 + Stage 2 settle the content. No code change required — just a worksheet-format tweak.
- **After Stage 1 + Stage 2:** Reassess. By then you'll know: (a) how many cross-subject concepts survive canonicalization; (b) whether the curriculum team's verdicts make subject-grouping more or less load-bearing semantically; (c) whether Phase 2's reviewer concepts UI needs subject-aware affordances. At that point, Option B (extract to registry) becomes a much-better-informed migration. Option C only makes sense if Stage 1 + Stage 2 reveal that the cross-subject distinctions were artifacts the curriculum team merges away — but the data-lens read suggests they won't.

**What I would explicitly NOT do:** Option C (drop subject grouping now). The asymmetric irreversibility — losing the 4/8 lens-distinction signal you can't easily re-extract — outweighs the simplicity gain when the worksheet is about to make this question much more legible.

**Two operational notes** independent of the option choice:

- Update the hand-written `LessonMetadata` interface in `src/types/index.ts` to declare `academicConcepts`. The discrepancy between Zod (declares it) and TS (doesn't) is a footgun for any future code that tries to read the field — and a Phase 2 reviewer concepts UI will hit this immediately. This is a 2-line fix orthogonal to the shape question.
- If Option A is chosen, the worksheet methodology should make explicit whether it's canonicalizing *per-subject* (so `companion planting` decisions are made independently in Science context and Social Studies context) or *across-subject* (one canonical decision, registry-style). The current methodology assumes the former; making this assumption explicit avoids confusion during the curriculum-team sessions.
