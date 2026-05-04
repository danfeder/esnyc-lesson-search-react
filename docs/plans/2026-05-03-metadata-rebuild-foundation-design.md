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
- 9 JSON-path indexes referencing `lessonFormat` — D3
- `_alias_lesson_format` runtime helper (becomes dead code) — D3

**Vocabulary expansions (closed-enum changes in code; data left unchanged at this stage):**
- `activity_type` enum: 4 → 5 values (`cooking / garden / both / academic / craft`) — D2
- `tags` closed enum: from `[]` (empty allowed-values list, column unused) → `["orientation", "bilingual_handouts"]` — D2 + D7
- `cultural_responsiveness_features` enum locked to the 7 master-list features (Brown CR framework) — D9

**Filter UI changes (sidebar):**
- `lessonFormat` filter section removed — D3
- New "Lesson Type" tag-based filter section, starting with `orientation` and `bilingual_handouts` — D2 + D7
- Activity Type filter expanded to 5 values; `academic-cooking` filter slug renamed/migrated to align with `both` storage — D2

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

**Pydantic enforcement on all 17 fields** — replaces v3's 3-of-17 enforcement. Closed enums in code; submission/review/migration writes validated against them.

**Worksheet round sequence (curriculum-team track):** heritage (~78 values, first), concepts (~211 values, biggest), then ~8 smaller fields. Stage 1 estimated at low-thousands of Opus reads + reviewer/user validation hours over weeks-to-months.

## 6. Pipeline (LLM auto-tag at submission time)

**D5 + D9 + ~10 high-fit fields share one Opus tagging infrastructure** layered into `process-submission` edge function. One model + one base prompt design + N field-specific prompts; per-prompt eval gates before launch.

**Foundation-phase prompt set** (~10 high-fit reviewer-supplied fields):
- `academicConcepts` — D5 — both framework + everyday vocab; capped at "framework word + 2-5 common teacher synonyms per concept"
- `cultural_responsiveness_features` — D9 — extract from body CR section; matches body content against 35 master-list example practices to draft tags for the 7 features; older lessons (no body CR section, ~45% of corpus) skipped
- ~8 additional fields TBD at implementation planning time — high-fit = closed vocab from D4 + body signal present (per session 9; **not** marginal fields like `grade_levels` / `location` which defer to Phase 2)

**Eval gate per prompt:** before any prompt ships to PROD, run a labeled hold-out evaluation against a curriculum-team-validated sample. Drop or rewrite any prompt that doesn't clear the gate.

**Reviewer flow:** reviewer validates / edits / replaces LLM drafts at review time as one more field in their existing review pass. The picker-UI redesign for editing drafts is **Phase 2** — foundation phase ships LLM tagging that pre-populates the existing reviewer surfaces; reviewers see drafted values in current ReviewDetail.tsx and edit via current controls. Frankenstein UX between foundation and Phase 2 is acceptable per D0 (2 expert reviewers, scoped at phase-1 design time).

**Search infrastructure consequence (D5):**
- Add `academicConcepts` to `search_vector` (FTS reads concept tags as content)
- Add `academicConcepts` to corpus-side embedding generation (`scripts/generate-embeddings.mjs`; currently includes themes / heritage / skills / ingredients but not concepts)
- Populate `search_synonyms` from concept tags (everyday + framework vocab pairs from Stage 2 re-tag); resolve smart-search-vs-DB-synonyms drift (TS hardcoded list in `smart-search/index.ts:18-75` vs DB table) at implementation time

## 7. Corpus refresh (Stage 2)

**Scope 3 — full re-tag with Opus, sequenced after Stage 1 worksheet validation.** Pydantic-validated for ALL 17 fields (not just 3 of 17 like v3).

- Adapts v3's existing Batch API + validation infrastructure (`/Users/danfeder/cCode/taggingv3/gpt_tagger/`); swaps OpenAI for Anthropic + extends validators to all fields.
- Operates on post-drop corpus of ~749 lessons (after import drops apply).
- Reviewers spot-check ~50-100 sampled lessons; flagged patterns or specific lessons get full review.
- Cost ~$200-300; 1-2 sessions of pipeline engineering.
- Stage 2 timing intentionally flexible: not blocking on Stage 1 closure; can be scheduled separately.
- CRF re-tag scope = ~55% of corpus (modern-template lessons with body CR section); older 45% (legacy template, no body CR section) skipped entirely. D9.

**Spot-check protocol** TBD at foundation-phase implementation time: random vs. stratified-by-activity-type vs. targeted-at-audit-found-lessons; re-tag DIFF view vs. fresh-tag review.

## 8. Cleanup tracks (foundation-phase scope)

**23 imported non-ESYNYC-format curriculum drops** (per `project_imported_non_esynyc_drops.md`):
- 5 PFLP (2003 vintage)
- 11 FoodCorps (2017 vintage)
- 7 one-offs (CAS, NYC DOE, City Blossoms, NYC DEP, Oregon DOE, 1 stub)

Soft-vs-hard-delete + cleanup-track sequencing TBD at implementation time. Pre-Stage-2 sequencing preferred so re-tag operates on a clean corpus. Consider hide-from-search before delete (preserve linked user state — bookmarks).

**N1 cleanup** (per `project_imported_non_esynyc_drops.md` cross-cutting):
- **Food System Advocates retitle** — drop "& 2"; Pt 2 is byte-identical to Pt 1 minus one worksheet link. ~10 minutes of foundation-phase work.
- **Winter After School Session 2** — leave as-is (intentional ESYNYC unit).

## 9. Migration / shipping strategy

PR breakdown is the **proposed** sequencing; final scoping happens at implementation-plan time when current code shape is verified. Schema-first, then pipeline, then cleanup, then vocab+corpus refresh.

| # | PR (proposed) | Contains | Notes |
|---|---|---|---|
| 1 | **Structural schema** | D2 enum + D3 column drop + D6 series_id/part_number + D7 tags enum + D9 crf_confirmed + filter UI sidebar updates | Largest blast radius; ships first because pipeline depends on column existence. Idempotent migration. Forward-rollback ready. |
| 2 | **Submission-time LLM auto-tag (D5 + D9 + ~10 high-fit prompts)** | `process-submission` edge function expansion; eval-gate harness; ~10 field prompts | Independent prompt batches per field; per-prompt eval gates before each goes live. |
| 3 | **Search infra (D5)** | `search_vector` rebuild including `academicConcepts`; `search_synonyms` population; `scripts/generate-embeddings.mjs` update; smart-search-vs-DB-synonyms drift resolution | Independent of PRs 4-N. |
| 4 | **Corpus drops + N1 retitle** | 23 imports retired (soft-delete approach TBD); FSA retitle | Pre-Stage-2 sequencing so re-tag operates on clean corpus. |
| 5+ | **D4 vocab canonicalization migration** (depends on Stage 1 worksheet outputs) | Per-field canonical translation migrations; Pydantic validators tightened in code | <!-- TBD: split per-field or all-at-once based on worksheet timing --> |
| 6+ | **Stage 2 corpus re-tag** (depends on PR 5 + Stage 1) | Opus re-tag pipeline; Pydantic on all 17 fields; corpus run; spot-check protocol | Flexible timing; doesn't have to immediately follow PR 5. |

### Gap risk between PRs

- **PR 1 → PR 2 gap.** Once column drops land but submission-time auto-tag isn't wired up, new submissions land without LLM-drafted tags (same as today; no regression). Acceptable.
- **PR 2 → PR 5+ gap.** Submission-time auto-tag generates pre-canonicalization tags between PR 2 and PR 5. Two options: (a) deploy auto-tag prompts using v3 baseline vocab and accept that pre-PR-5 submissions need re-tag at PR 5; (b) hold PR 2 deploy until at least heritage + concepts worksheets land. <!-- TBD at impl-plan time -->.
- **PR 5+ vs Stage 2 gap.** Foundation-phase corpus refresh has post-Stage-1 catch-up: lessons submitted between PR 1 and Stage 2 use v3-baseline auto-tag drafts → reviewer validates with v3 baseline knowledge → Stage 2 re-tags everything against canonical D4. Net: Stage 2 catches them up. No separate mitigation needed.

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

**Phase 2 (separate window, after foundation lands):**
- Reviewer UX redesign — guided pickers, validation rules, audit/diff views, paired-review prompts, per-field guidance text. Mechanism inventory archived as candidate inputs (per D8 phase-2 drop, session 9).
- **Stage 2 reviewer-validation UX walk** — load-bearing reviewer question for batch-validating LLM-drafted re-tags across ~700 unreviewed lessons. To be walked during foundation-phase implementation planning when LLM-draft-validation flow is the active design surface.
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
