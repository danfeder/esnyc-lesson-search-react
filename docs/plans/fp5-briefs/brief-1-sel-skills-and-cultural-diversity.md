# FP5 Brief 1 — Template-era vocab: SEL skills expansion + "Cultural Diversity" rename (M)

Read `docs/plans/fp5-briefs/README.md` + the standing rules in
`docs/plans/fp4-briefs/README.md` first (STOP rule verbatim: "STOP = write the hand-back
and END YOUR TURN; design forks route to Fable; the owner only answers explicit approvals
(data fix / merge / gates).")

## Why (owner decisions, 2026-07-04 Q&A session — full record in
`docs/plans/2026-07-04-owner-uiux-candidates.md` §4)

The 2026 lesson template (Google Doc `1C0tCnRJXgdNxUJtv25aq2ZDnKHjTcjA0H6LIY248xQk`) is
**locked** — the app adapts to it, not vice versa. All next-wave submissions (a few dozen
spreadsheet-collected lessons, submitted by reviewers through the normal `/submit` flow,
then self-reviewed — verified supported, no code needed) use this template. Owner decided:

1. **SEL expansion + rename.** Category label "Social-Emotional Learning" →
   **"Social-Emotional Skills"**; ADD six options — **Bravery, Kindness, Respect,
   Collaboration, Pride, Joy** — alongside the existing five (Relationship skills,
   Self-awareness, Responsible decision-making, Self-management, Social awareness).
   Final list = 11. Mixed-era list accepted by owner (old 5 only match pre-2026 lessons).
   Key `socialEmotionalLearning` / column `social_emotional_learning` do NOT change.
2. **"Culturally Responsive Education" → "Cultural Diversity" everywhere, including
   existing lessons.** Owner's rationale on record: the two names denote the SAME concept;
   this is a rename, not a re-tagging. Applies to review interface, filters, and stored
   tags.
3. **"Social-Emotional Intelligence" stays** as a Core Competency value (old lessons carry
   it; the template dropped it deliberately — SEL is now expected in every new lesson,
   which is what the skills category is for). New lessons just won't pick it.

This is the explicit owner sign-off for the `filterDefinitions.ts` changes below.

## ⛔ HARD ORDERING CONSTRAINT

**FP4 brief 6 (`brief-6-validate-constraints.md`, migration `20260707000000`) must be
applied to PROD before this brief's migration runs.** Fable-verified 2026-07-04 on PROD:
**6 of the 7 broken retired rows carry 'Culturally Responsive Education'** — any UPDATE
on them re-checks the NOT-VALID `valid_cooking_skills`/`valid_main_ingredients` CHECKs
against the whole row and ERRORS. Brief 6 heals those rows and VALIDATEs both constraints.
This brief's migration must PRE-ASSERT (DO-block RAISE) that **0 rows violate either
constraint** before touching data. If the pre-assert fires, STOP.

Also: owner wants this live on PROD **before the spreadsheet-wave reviews begin**.

## Fable-verified census (2026-07-04, live PROD `jxlxtzkmicfhchkhiojz` — re-probe before
apply, numbers drift; TEST numbers WILL differ, keep every assert data-driven)

- `lessons`: **320 rows** carry the old value in `core_competencies` (276 active + 44
  retired); **exactly the same 320** carry it in the `metadata->'coreCompetencies'` JSONB
  mirror (all 785 rows have that key). Both representations must be renamed in the same
  per-row write (B5 lesson: drawer/UI reads the JSONB mirror for some fields; keep
  drift = 0).
- CHECKs on `lessons`: `valid_core_competencies` and `valid_social_emotional_learning`
  are both **validated** (not NOT VALID). `valid_cooking_skills` + `valid_main_ingredients`
  are the NOT-VALID pair (brief 6 fixes). A `wave4_c11_ghost_rollback` table carries
  copies of the constraints — it is an inert Wave-4 backup; DO NOT touch it.
- `submission_reviews.tagged_metadata` stores KEBAB slugs (`'culturally-responsive'`
  present in live rows). Historical review rows stay kebab on disk BY DESIGN (forensic
  record; see `canonicalizeReviewMetadata.ts` header) — the read-path map is what changes.
- `lesson_versions` has NO `core_competencies` column — nothing to do there.
- `lesson_submissions.ai_draft_metadata`: **0 rows** carry either the old canonical string
  or the kebab slug — no draft cleanup needed.
- `search_vector` (20260521000000 def) does NOT index core_competencies or SEL — no FTS
  refresh needed. Re-verify against the live definition before relying on this.
- process-submission does NOT reference coreCompetencies/socialEmotionalLearning at all
  (the AI draft covers other fields) — expect NO edge-function draft changes; verify and
  note in the hand-back rather than inventing work.

## Scope

### 1. Migration `20260708000000_sel_skills_and_cultural_diversity.sql` (ONE txn, ONE gate)

Invoke the `database-migrations` skill first. Single `BEGIN;`/`COMMIT;` with
`LOCK TABLE lessons IN SHARE ROW EXCLUSIVE MODE;` (db push is autocommit-per-statement —
the wrap is mandatory). Order inside the txn:

1. **Pre-asserts** (DO-block RAISE EXCEPTION on failure, all data-driven):
   - 0 rows violate `valid_cooking_skills` / `valid_main_ingredients` (brief-6 done);
   - column-carrier count == JSONB-carrier count for the old value (capture the count);
   - total / active row counts captured for the unchanged-post-assert.
2. **SEL widen:** drop + recreate `valid_social_emotional_learning` with the 11-value
   array (existing 5 verbatim from the current constraint def + the 6 new Title-case
   values). Plain ADD (validates; additive superset passes trivially).
3. **Rename:** drop `valid_core_competencies`; then one per-row UPDATE scoped
   `WHERE 'Culturally Responsive Education' = ANY(core_competencies)`:
   `core_competencies = array_replace(..., old, new)` AND the `metadata` JSONB
   `coreCompetencies` array element old→new in the SAME statement. Do NOT bump
   `updated_at` (rename ≠ content edit; matches the retire precedent). Then recreate
   `valid_core_competencies` with 'Cultural Diversity' in place of the old string
   (all other values verbatim, 'Social-Emotional Intelligence' KEPT).
4. **Post-asserts** (DO-block): 0 old-value rows in column AND in JSONB; new-value count
   == captured count; total/active counts unchanged; both constraints present + validated
   (`pg_constraint.convalidated`).

Rehearse on local reset (`supabase db reset` + `npm run test:rls` — 2 known pre-existing
failures are not yours), then CI applies to TEST; verify on TEST with real data
(mcp__supabase-test__): probe TEST's own carrier counts FIRST (TEST is a stale snapshot —
685 active / different carrier counts), confirm asserts pass there, spot-check 2 renamed
rows in both representations. PROD apply = owner-approved gate after merge, standard
pipeline. Never `mcp__supabase-remote__apply_migration`.

### 2. `src/utils/filterDefinitions.ts` (owner sign-off = this brief)

- `socialEmotionalLearning`: label → `'Social-Emotional Skills'`; append 6 options
  (value === label, Title-case): Bravery, Kindness, Respect, Collaboration, Pride, Joy.
- `coreCompetencies`: option value+label `'Culturally Responsive Education'` →
  `'Cultural Diversity'` (position unchanged).

### 3. Zod mirrors (order-sensitive equivalence tests exist — update in sync)

- `supabase/functions/_shared/metadataSchemas.ts`: `CORE_COMPETENCIES_VALUES` (line ~67)
  swap the string; `SocialEmotionalLearningEnum` values +6.
- Client mirror `src/types/reviewFormPayload.zod.ts` (+ wherever the enums it imports are
  defined, e.g. `src/types/lessonMetadata.zod.ts`) — same two edits.
- `src/types/generated/enums.json` contains the old string — find its generator (it is
  GENERATED; regenerate, don't hand-edit; if the generator reads a vocab source file,
  update the source).
- Redeploying the edge functions that consume `metadataSchemas.ts` (complete-review /
  process-submission) is part of the change — same deploy gate pattern as FP3 B4.

### 4. Legacy read-path fold — `src/utils/canonicalizeReviewMetadata.ts`

- `CORE_COMPETENCIES_MAP`: `'culturally-responsive'` now maps → `'Cultural Diversity'`.
- ADD a fold entry `'Culturally Responsive Education'` → `'Cultural Diversity'` so ANY
  legacy jsonb source (old tagged_metadata shapes, stray drafts) canonicalizes to the new
  name on load/save. Update the map's tests.

### 5. Sweep the remaining old-string sites (Fable grep, re-run it yourself)

`grep -rn "Culturally Responsive Education" src/ supabase/functions/` after steps 2–4
should return ZERO live-code hits. Known test files carrying the string:
`facetCounts.test.ts`, `reviewToLessonMapper.test.ts` (NOTE: FP4 brief 4 DELETES that
file — whichever PR lands second rebases), `canonicalizeReviewMetadata.test.ts`.
`scripts/stage2-retag/**` artifacts are FROZEN campaign evidence — do NOT touch them.
`scripts/stage2-retag/vocab.test.ts` + `data/smaller-fields.vocab.json`: if that drift
test locks competency values against `filterDefinitions`, update the vocab source +
test intent (locked-vocab file gets a dated comment noting the owner rename); if it
doesn't cover competencies, leave alone and say so.
Same sweep for the label string `"Social-Emotional Learning"`: `ReviewMetadataForm.tsx`,
`reviewDetailHelpers.ts`, `reviewValidation.ts`(+test) carry it (label/validation copy) —
rename to "Social-Emotional Skills".

### 6. URL back-compat (tiny)

Old saved links carrying the old value in the coreCompetencies URL param must not 404 or
silently mis-filter: fold the legacy value → 'Cultural Diversity' at parse time in
`urlParams.ts` (one map entry, mirroring the canonicalize fold; FP-18 precedent dropped
stale values, but folding is one line here and keeps saved links working). Round-trip test.

### 7. Docs

- `CLAUDE.md` / `src/utils/CLAUDE.md`: no inlined vocab lists should need edits
  (filterDefinitions is authoritative) — verify, don't assume.
- Add one line to the review-flow guidance (wherever reviewers look — `src/pages/` or
  `src/components/review/` CLAUDE.md): template docs may say "cultural diversity" /
  SEL words — they map 1:1 onto the app's options now; "Social-Emotional Intelligence"
  is not picked for new lessons.

## Out of scope

- Re-tagging old lessons with the new SEL words (owner explicitly deferred; mixed-era
  list accepted).
- Any other Core Competencies change; any other template-alignment work (mechanical
  prefill = candidates doc §5, parked).
- The empty-summary approve guard (candidates doc §1, separate).
- `wave4_c11_ghost_rollback`, `scripts/stage2-retag/artifacts/**`, historical
  `submission_reviews` rows on disk.

## Verify

`npm run check` + `npm run test:run` (never bare `npm run test`); `npm run test:rls`
(2 known pre-existing failures on main are not yours). Post-merge TEST verification each
review round. Live drive: reviewer form shows "Social-Emotional Skills" with 11 options
and "Cultural Diversity" in Core Competencies; search sidebar shows the renamed facet
with a non-zero count (TEST carrier count, probed); a legacy kebab review row reopens
with "Cultural Diversity" selected.

## Hand-back

One-line status + file paths. Surprises → hand-back, not improvisation. Design forks →
Fable.
