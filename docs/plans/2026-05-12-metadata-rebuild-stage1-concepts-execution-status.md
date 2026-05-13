# Stage 1 Concepts Worksheet — Execution Status

**Last updated:** 2026-05-12 — Session 81 PR #496 closeout. Squash-merged 2026-05-12 as `6b2fac2` (direct-to-main closeout backfill per Sessions 67 + 68/PR #485 + 69 + 71 + 73 + 74 + 75 + 76 + 78 + 79/PR #494 + 80/PR #495 precedent — **12th occurrence**; user-authorized). 137 long-tail per-value entries filled in §13 (29 freq-2 + 108 freq-1, alphabetical within frequency-descending order per D-C3). Single-PR option chosen per D-C14 split decision (alternatives considered: 108-vs-29 split, even-thirds, alphabetical halves — single PR wins because merge clusters span freq tiers: `plant_identification` aliases include both freq-2 + freq-1 members; `adaptations` cluster is 3 freq-1 entries; `cultural_traditions` / `community_systems` / `visual_arts` alias members are mixed freq). Worksheet top banner advanced SCAFFOLD (Session 78) → PRE-HANDOFF FILLED (Session 81). 9 new audit signals appended (CON-16 through CON-24); register now has **24 open `CON-NN` signals** (was 15 after Session 80). CON-16 Indigenous-cluster cross-field overlap is the **first cross-field cross-reference between concepts + heritage worksheets** — flags concepts-side 3-singleton fragmentation (`indigenous_knowledge` / `indigenous_stories` / `native_american_history`) against heritage-side §9.1 `Indigenous and Diaspora` cluster (heritage D1). Other new signals cover form-drift pairs (CON-18 cardiovascular/circulatory; CON-19 phases/states; CON-21 harvest/harvesting), sub-topic boundaries (CON-17 holidays; CON-20 climate/climate_change), and cluster boundaries (CON-22 reading 6-entry; CON-23 measurement 5-entry; CON-24 figurative-language 4-entry). TEST DB calibration probe (Session 81) confirmed long-tail = **137 ✓** (108 freq-1 + 29 freq-2) at `retired_at IS NULL` filter, matching Session 80 preliminary count exactly. Pre-push code-reviewer agent (Opus, `feature-dev:code-reviewer`) on initial commit `2e65abc` caught 1 P2 finding (P1/P3 = 0): `plant_based_proteins` was alphabetically misplaced in §13; fixed in `87af425` (12-line entry block moved from after `plant_science` to between `plant_and_animal_similarities` and `plant_id`; no content change). Re-run on `87af425`: 0 findings, "Approve. Safe to push." 2 bot-review rounds + 1 fix-up cycle in one session — **Round 1** 2-voice (claude-review auto-bot + user-dispatched Hermes) → 1 substantive accept in fix-up `187b1ad`: F1 [2-voice convergence: Hermes BLOCKING + claude P3 parallel] audit register banner used "2 prior signals closed at Session 81 fill: CON-11 historical_context..." but the register's own `Status vocabulary` rule defines `Resolved` as Stage 2 closure with corpus-cleanup/re-tag/reviewer-validation action recorded; CON-11 remains in Open table. Same conflation appeared in 3 PR description table cells + section header. Fix: audit register banner rewritten to "Forward-reference scaffold landed at Session 81 fill" with explicit callout that Stage-1 alias-side landings do NOT close signals; CON-11 + CON-05 + CON-09 all clarified as Open with proposal-landed state. PR description section header changed to "Forward-reference scaffold landings"; table cells changed to "CON-XX forward-ref landed (signal stays Open)"; terminology note added. 2 default-rejects: M1 (claude P2 single-voice; Hermes "optional polish") `frequency: 1 appearances` plural-grammar for 108 freq-1 entries — §4 spec specifies `<count> appearances` as uniform parser-friendly suffix; format-consistency with §11/§12 wins, Hermes treated as optional. M2 (claude P3 single-voice; Hermes did not flag) `merge_aliases: <none>` semantic ambiguity for merge-into candidates — §4 + §7 already document the canonical-absorbing-side vs alias-side asymmetry. **Round 2** 2-voice (claude-review + Hermes) → 0 accepts; both bots flagged ship-ready (claude "Approved — safe to merge"; Hermes "Approved from my side. No remaining blocking issues."); 4 + 1 forward-looking observations default-rejected with rebuttals per round-cap rule (full rebuttal pass posted as PR #496 comment [#4436801432](https://github.com/danfeder/esnyc-lesson-search-react/pull/496#issuecomment-4436801432)) — R2-1/R2-5 `pending PR` banner backfill = closed by this closeout commit; R2-2 CON-16 cross-worksheet coordination flag = already in CON-16's Stage 2 action column; R2-3 CON-22 reading-cluster mini-brief = already in register row (3 explicit resolution options); R2-4 CON-23 measurement-cluster binary choice = already in register row (preferred + alternative). **Stage 1 concepts content track is now substantively complete pre-curriculum-team-handoff — all 208 per-value entries across 3 tiers (32 high-impact + 39 mid-tier + 137 long-tail) are pre-filled with `verdict` + `curriculum_notes` as `<to_fill>` per D-C7 pre-handoff convention. Session 82 = curriculum-team fill integration (single pass over full 208-entry worksheet per D-C15, mirroring heritage's Session 75/PR #491 cadence).** Prior Session 80 closeout (PR #495 squash `e7632e3`): 39 mid-tier per-value entries filled in §12 (frequency-descending, alphabetical tie-break: drawing/fractions/plant_growth at freq 9 → seed_dispersal at freq 3); 3 entries integrate Session 79 Phase 1 Opus batch evidence as `<details>` blocks per F2 hardening (biodiversity + observation cross-subject splits; preservation cross-subject + canonical-absorbing with `food preservation` 1 merge_alias closing CON-09 forward-reference); 2 entries propose merge into §11 `seasonality` (entry 30, freq 11) — `seasonal_cycles` 6 + `seasonal_eating` 7. `advocacy` 3 entry closes CON-05 forward-reference by absorbing `community activism` 1 as merge_alias. 4 new audit signals appended to register (CON-12 through CON-15); register had 15 open CON-NN signals. Direct-to-main closeout backfill (11th occurrence). Earlier Session 79 closeout (PR #494 squash `1ab5e82`): 32 high-impact tier per-value entries filled in §11 (`plant_parts` 239 → `seasonal_changes` 10, strict frequency-descending after round-1 sort-order fix-up); Phase 1 upfront Opus batch (18 corpus reads via `/tmp/session-79-opus-*.md`) generated `<details>` blocks for 10 of 32 entries; audit signal register created with 11 open CON-NN signals (CON-01 through CON-11). Direct-to-main closeout backfill (10th occurrence). 39 mid-tier per-value entries filled in §12 (frequency-descending, alphabetical tie-break: drawing/fractions/plant_growth at freq 9 → seed_dispersal at freq 3); 3 entries integrate Session 79 Phase 1 Opus batch evidence as `<details>` blocks per F2 hardening (biodiversity + observation cross-subject splits; preservation cross-subject + canonical-absorbing with `food preservation` 1 merge_alias closing CON-09 forward-reference); 2 entries propose merge into §11 `seasonality` (entry 30, freq 11) — `seasonal_cycles` 6 + `seasonal_eating` 7 per §11 entry 30's existing merge_aliases proposal. `advocacy` 3 entry closes CON-05 forward-reference by absorbing `community activism` 1 as merge_alias. 4 new audit signals appended to register (CON-12 writing-cluster canonical-shape question; CON-13 observation `drawing`-attached procedural artifact; CON-14 garden_exploration drop-or-keep boundary; CON-15 nutrition vs nutrition_education boundary); register now has 15 open CON-NN signals. TEST DB calibration probe confirmed mid-tier count = **39 ✓** at `retired_at IS NULL` filter (count without filter is 42 — 3 distinct concept strings live only on retired lessons, correctly drop out of live-corpus mid-tier). Tier-cutoff calibration call (D-C14): long-tail split decision **punted to Session 81** (preliminary count: ~108 singletons + ~29 two-appearance = 137 long-tail total). 2 bot-review rounds + 1 fix-up cycle in one session — **Round 1** 2-voice (claude-review + user-dispatched Hermes; Codex not posted this round) → 2 substantive accepts in fix-up `c4c0aa5` (F1 [P3 2-voice] added `(see CON-12)` pointers to 3 §12 writing sub-type entries that previously discussed the writing cluster implicitly — narrative_writing / opinion_writing / descriptive_writing; CON-12 register row Evidence column updated to reflect symmetric coverage; F2 [P3 2-voice] normalized `preservation` `recommended_secondary_subjects` field value to `Social Studies (conditional)` per §4 spec, with rationale preserved verbatim in claude_notes). 3 default-rejects (claude M1 advocacy frequency-label observation = bot-self-flagged "Correct and consistent — just noting"; claude M2 CON-09-stays-Open observation = bot-self-flagged "This is correct"; Security Audit pre-existing fail = `@lhci/cli` dependency-chain debt per repo hygiene-follow-up, Hermes verified same fail on recent main). **Round 2** 2-voice (claude-review + Hermes; Codex not posted) → 0 accepts; both bots flagged ship-ready (claude "Approve", Hermes "Approved ✅"); 4 + 1 forward-looking polish observations default-rejected with rebuttals per round-cap rule + PR #494 round-2 precedent (full rebuttal pass posted as PR #495 comment [#4436491865](https://github.com/danfeder/esnyc-lesson-search-react/pull/495#issuecomment-4436491865)). R2-1 (drawing↔CON-13 bidirectional cross-reference) saw bot-voice divergence — claude suggested adding, Hermes explicitly "I do not consider it necessary for this PR" — deferred to Session 81 if pattern-consistency matters. Pre-push code-reviewer agent (Opus, `feature-dev:code-reviewer`) on initial commit `a5721d4` returned 3 P3 cosmetics all applied in pre-push fix-up `4920b5f` (entry-29-to-30 numbering correction in 3 sites; CON-12 evidence-column tightening to honest count of explicit citers; creative_writing Arts-vs-Lit/ELA clarifier); on round-1 fix-up `c4c0aa5` returned 0 findings. **Stage 1 concepts content track moves to Session 81 (PR-Concepts-3, long-tail per-value fills, 137 entries in §13 at frequency 1-2; first task is the long-tail-split-decision D-C14 call).** Prior Session 79 closeout (PR #494 squash `1ab5e82`): 32 high-impact tier per-value entries filled in §11 (`plant_parts` 239 → `seasonal_changes` 10, strict frequency-descending after round-1 sort-order fix-up); Phase 1 upfront Opus batch (18 corpus reads via `/tmp/session-79-opus-*.md`) generated `<details>` blocks for 10 of 32 entries; audit signal register created with 11 open CON-NN signals (CON-01 through CON-11). 2 bot-review rounds + 1 fix-up cycle (round-1 3-voice convergence on F1 sort-order fix + F2 evidence-hardening; round-2 ship-ready). Direct-to-main closeout backfill (10th occurrence). Earlier Session 78 closeout (PR #493 squash `afe35bf`): worksheet scaffold (542 lines: §1–§10 header sections + empty tier section skeletons §11/§12/§13 + Appendix A v3 baseline grouped by subject + A.7 cross-subject + A.8 case-normalized concept↔theme overlaps). **Round 2** 2-voice (claude-review + Hermes) → 0 accepts; both bots flagged ship-ready (claude "Ready to merge", Hermes "Approved ✅"); 4 + 1 forward-looking polish observations default-rejected with rebuttals (full rebuttal pass posted as PR #494 comment [#4436074760](https://github.com/danfeder/esnyc-lesson-search-react/pull/494#issuecomment-4436074760)). Pre-push code-reviewer agent (Opus, `feature-dev:code-reviewer`) on round-1 fix-up: 0 P1/P2/P3 findings, "Approve. Safe to push." Security Audit pre-existing fail (`@lhci/cli` chain) default-rejected as out-of-scope per repo hygiene-follow-up. **Stage 1 concepts content track moves to Session 80 (PR-Concepts-2, mid-tier per-value fills, 39 entries in §12 at frequency 3-9).** Worksheet scaffold lives at `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (525 base + 17 fix-up lines = 542 final: header sections §1–§10 + empty tier section skeletons §11/§12/§13 + Appendix A v3 baseline grouped by subject + A.7 cross-subject + A.8 case-normalized concept↔theme cross-references). TEST DB probe confirmed tier distribution **32 / 39 / 137 = 208 ✓** at locked ≥10 / 3-9 / 1-2 cutoffs; Session 79 weighs long-tail split (singletons-only ~89 vs 1-and-2 ~48) vs accept-larger. Per-subject totals match Session 77 exactly: Science 92 / Social Studies 37 / Literacy/ELA 46 / Math 18 / Arts 20 / Health 3 = 216 (subject, concept) pairs across 208 distinct strings with 8 cross-subject overlaps + 3 concept↔theme case-normalized overlaps (`ecosystems` exact-string identical; `food systems` + `plant growth` collide only under case normalization, themes side is Title Case per `src/utils/filterDefinitions.ts`). 2 bot-review rounds + 1 fix-up cycle in one session — **Round 1** 2-voice (claude-review + user-dispatched Codex) → 3 substantive accepts in `46279c2` (F1 [P2 Codex] foundation status doc pointer staleness `to be created Session 78` → updated to cite PR #493 scaffold landed + Sessions 79/80/81 deferral; F2 [P3 both bots] `kebab-case` terminology contradiction with `snake_case` examples → both sites tightened to "lowercase underscore-separated" / `snake_case` preserving the "final convention TBD at parser-write time" caveat; F3 [P3 Codex] `string-identical` theme-overlap overstatement → 5 worksheet sites + 3 status doc sites updated to "case-normalized" with `ecosystems` carved out as the only exact-string case + themes-side Title Case explicitly noted with `filterDefinitions.ts` reference). 2 default-rejects (Claude M2 §9 placeholder callout = cosmetic redirect to §5; Claude M3 `food systems` low-signal curriculum_notes nudge = premature for scaffold + curriculum-team field per D-C7 — Codex also rejected both). **Round 2** single-voice claude-review → 0 accepts per kickoff round-cap rule (bot itself flagged all 3 findings as "low priority" / "doesn't block merge" / "no action needed"; full rebuttal pass posted as PR #493 comment at `4433284745`). Pre-push code-reviewer agent on round-1 fix-up: 0 P1/P2/P3 findings, "Approve. Safe to push." Security Audit pre-existing fail (`@lhci/cli` chain) default-rejected as out-of-scope per repo hygiene-follow-up. **Stage 1 concepts content track is now at the per-value-fill phase** — header sections + tier skeletons + Appendix A complete; per-value entries land Sessions 79 (PR-Concepts-1 high-impact) / 80 (PR-Concepts-2 mid-tier) / 81 (PR-Concepts-3 long-tail) per D-C14. Foundation-phase code track still has no unblocked next PR — PR 3b / 5 / 6 all gate on Stage 1 (concepts) / Stage 2 outputs.

> **About this file.** Project-internal progress tracker for the Stage 1 concepts worksheet initiative. Peer to (not folded into) the heritage execution status doc at `2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md` and the foundation-phase status doc at `2026-05-03-metadata-rebuild-foundation-execution-status.md`. The foundation-phase status doc carries a one-line pointer here.
>
> **What lives here:** current state of the worksheet fill, locked design decisions and rationale (this session's `D-C1` through `D-C15`), session log, next-session pointer.
>
> **What does NOT live here:** the worksheet content itself (will live in `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md`, created Session 78); curriculum-team-facing methodology and conventions (will live in the worksheet header); the schema-simplification investigation reports that informed the structural decisions (live at `2026-05-12-academic-concepts-shape-investigation.md` and `2026-05-12-academic-concepts-shape-simplification-report.md`).

## Current state dashboard

| Area | Status | PR | Merge commit | Notes / next action |
|------|--------|-----|---------------|---------------------|
| Methodology design | ✅ Shipped | *Session 77 (this doc; no PR — methodology lands as the status doc itself)* | n/a | 15 locked decisions; TEST DB probes verified live state; schema-simplification investigation integrated; concept-first worksheet shape locked |
| Worksheet scaffold | ✅ Shipped | [#493](https://github.com/danfeder/esnyc-lesson-search-react/pull/493) | `afe35bf` | Session 78 — `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (542 lines: 525 base + 17 fix-up) with §1–§10 header sections + empty §11/§12/§13 tier skeletons + Appendix A v3 baseline + A.7 cross-subject + A.8 case-normalized concept↔theme overlaps. 2 bot-review rounds + 1 fix-up cycle; squash-merged 2026-05-12. |
| High-impact tier (PR-Concepts-1) | ✅ Shipped | [#494](https://github.com/danfeder/esnyc-lesson-search-react/pull/494) | `1ab5e82` | Session 79 — 32 high-impact tier per-value entries filled in §11 (`plant_parts` 239 → `seasonal_changes` 10, strict frequency-descending after round-1 sort-order fix-up); Phase 1 Opus batch (18 corpus reads at `/tmp/session-79-opus-*.md`) generated `<details>` blocks for 10 of the 32 entries (4 cross-subject splits + 5 near-duplicate clusters + 1 theme-overlap); audit signal register created with 11 open CON-NN signals. 2 bot-review rounds + 1 fix-up cycle; squash-merged 2026-05-12. |
| Mid-tier (PR-Concepts-2) | ✅ Shipped | [#495](https://github.com/danfeder/esnyc-lesson-search-react/pull/495) | `e7632e3` | Session 80 — 39 mid-tier per-value entries filled in §12 (frequency-descending, alphabetical tie-break); 3 entries integrate Session 79 Phase 1 Opus batch evidence as `<details>` blocks (biodiversity + observation cross-subject splits; preservation cross-subject + canonical-absorbing per CON-09); 2 entries propose merge into §11 seasonality (entry 30, freq 11) — `seasonal_cycles` 6 + `seasonal_eating` 7; `advocacy` 3 absorbs `community activism` 1 closing CON-05 forward-reference; `preservation` 4 absorbs `food preservation` 1 closing CON-09 forward-reference; 4 new audit signals (CON-12 through CON-15) appended to register. 2 bot-review rounds + 1 fix-up cycle; squash-merged 2026-05-12. |
| Long-tail (PR-Concepts-3) | ✅ Shipped | [#496](https://github.com/danfeder/esnyc-lesson-search-react/pull/496) | `6b2fac2` | Session 81 — 137 long-tail per-value entries filled in §13 (29 freq-2 + 108 freq-1, alphabetical within frequency-descending order per D-C3). Single-PR option chosen per D-C14 split decision (alternatives considered: 108-vs-29 split, even-thirds, alphabetical halves — single PR wins because merge clusters span freq tiers: `plant_identification` aliases include both freq-2 + freq-1 members; `adaptations` cluster is 3 freq-1 entries; `cultural_traditions`/`community_systems`/`visual_arts` alias members are mixed freq). 9 new audit signals appended (CON-16 through CON-24 — including the **first cross-field cross-reference between concepts + heritage worksheets** at CON-16 Indigenous-cluster). Worksheet top banner advanced SCAFFOLD (Session 78) → PRE-HANDOFF FILLED (Session 81). Pre-push reviewer caught + fixed 1 P2 (plant_based_proteins alpha order). 2 bot-review rounds + 1 fix-up cycle (round-1 2-voice convergence on F1 audit-register banner "closed" vs "forward-ref landed" terminology fix per Hermes blocking finding; round-2 ship-ready). Squash-merged 2026-05-12. |
| Curriculum-team fill integration | ⏳ Pending | — | — | Session 82 — single curriculum-team pass over full 208-entry worksheet (32 high-impact + 39 mid-tier + 137 long-tail); review depth varies by tier per D-C15. |
| Closeout / reconciliation | ⏳ Pending | — | — | Session 83+ — if curriculum-team fill needs reconciliation edits or any structural §16-equivalent post-pass. May not need its own PR if integration is clean. |

Audit signal register (Stage 2 corpus cleanup / reviewer-validation intake): peer file `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` created Session 79 with 11 open `CON-NN` signals; Session 80 appended 4 new signals (CON-12 through CON-15); Session 81 appended 9 new signals (CON-16 through CON-24) — register now has **24 open signals**. Prefix distinguishes from heritage's register prefixes (ASI / AME / AFR / EUR / ME / X). Session 79 round-1 fix-up hardened evidence sourcing (7 rows stripped redundant ephemeral `/tmp` references; 3 sole-evidence rows CON-02 / CON-03 / CON-09 inlined Drive-ID lesson references + body excerpts). Session 80 updated CON-05 + CON-09 Stage 2 Action columns to reflect proposal-landed state (advocacy + preservation merge_aliases now in §12 worksheet entries) while preserving Open status (signals close at Stage 2 re-tag implementation, not at Stage 1 worksheet fill). Session 81 round-1 fix-up clarified the register banner's closure-state terminology (Hermes-blocking finding): Stage-1 alias-side landings do NOT close signals; CON-11 + CON-05 + CON-09 remain Open per the Resolved-status vocabulary. **CON-16 is the first cross-field cross-reference in either register** — flags the concepts-side 3-singleton fragmentation (`indigenous_knowledge` 1 + `indigenous_stories` 1 + `native_american_history` 1) against the heritage-side §9.1 `Indigenous and Diaspora` cluster.

## Next session contract

Fixed-shape orientation for the next session. Update at PR closeout (see PR closeout checklist below).

**PR-Concepts-3 (Session 81) ✅ Shipped as `6b2fac2` 2026-05-12. Session 82 = curriculum-team fill integration (single pass over full 208-entry worksheet — 32 high-impact + 39 mid-tier + 137 long-tail).**

The locked methodology decisions (D-C1 through D-C15 below), all 208 pre-filled per-value entries in §11/§12/§13, and the 24 open `CON-NN` audit signals drive Session 82's shape. Per D-C15, this is a **single curriculum-team pass over the full worksheet**, with review depth varying by tier (high attention on §11 high-impact; moderate on §12 mid-tier; rapid skim OK for §13 long-tail clear-drop singletons + targeted attention on merge-candidate clusters and the open CON-NN signals).

- **Session:** Stage 1 Session 82 — curriculum-team fill integration. Curriculum team fills the `verdict` and `curriculum_notes` fields across all 208 entries (3 tiers + 6 subjects, single pass).
- **Branch base:** `main` at the Session 81 PR #496 closeout-backfill commit (downstream of PR #496 squash `6b2fac2`; this commit is the closeout-backfill commit downstream of the merge — see Session 81 log entry below for hash).
- **Workflow:** mirrors heritage's curriculum-team fill integration pattern (PR #491 from heritage Session 75). Curriculum team works through the worksheet (likely paced across multiple sittings — D-C15 explicitly grants asymmetric attention by tier); returns the worksheet with `verdict` + `curriculum_notes` filled. Claude integrates the returned worksheet to `main` with any needed reconciliation edits.
- **Primary objective:** Curriculum-team-returned worksheet integrated to `main` with verdicts + curriculum_notes filled across all 208 entries. Reconciliation edits applied pre-merge where needed (e.g., heritage's Session 75 PR #491 had keep-vs-new verdict misclassifications surfaced in round-1 review; same review-cycle rigor expected for concepts).
- **What the curriculum team is making verdicts on:**
  - **Per-entry verdict** — one of `keep | merge | new | drop` (replacing `<to_fill>`). Some entries have strong claude_notes recommendations (clear merge candidates with proposed targets; clear drops per CON-02/CON-03); others are genuinely ambiguous (CON-11 historical_context, CON-15 nutrition vs nutrition_education, food_systems theme-overlap, etc.).
  - **Per-entry curriculum_notes** — free-form notes capturing the curriculum-team's verdict rationale, especially for ambiguous merges and the CON-NN signals' Stage 1 sub-questions.
  - **Cluster decisions** that span multiple entries — see "Cluster signals" below.
- **Cluster signals needing unified curriculum-team verdicts (cross-entry questions):**
  - **CON-12 writing-cluster shape** (option a/b/c on the writing canonical-shape question across 8+5+7 entries spanning §12 + §13)
  - **CON-16 Indigenous-cluster reframing** (3 SS singletons fragment vs heritage worksheet §9.1 cluster — cross-worksheet coordination needed before Stage 2)
  - **CON-22 reading-cluster boundary** (6 entries — reading + reading_comprehension + narrative_reading + biography_reading + informational_text + biography)
  - **CON-23 measurement-cluster boundary** (5 entries — measurement + volume + area + weight + perimeter)
  - **CON-24 figurative-language cluster** (4 entries — figurative_language + similes + descriptive_language + sensory_details)
  - **CON-11 historical_context** merge-vs-keep call (single-entry verdict but with significant lens question)
  - **CON-14 garden_exploration** drop-or-keep boundary (single-entry; context-tag-not-concept question)
  - **CON-15 nutrition vs nutrition_education** boundary (single-entry; biology-of-nutrition vs label-drift question)
- **Theme-overlap entries** (3 per §6 / D-C5 — `ecosystems` §11, `plant_growth` §12, `food_systems` §13): curriculum team may add advisory notes on adjudication direction, but full resolution defers to the themes worksheet / D4 canonicalization migration (not Session 82).
- **Stop point:** All 208 entries have curriculum-team verdicts + curriculum_notes filled (or explicit `<defer>` markers for entries the curriculum team wants to revisit). Worksheet returned to Claude for integration via PR.
- **Expected files to touch (Claude side, on integration):**
  - `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` — integrate curriculum-team-returned content; apply reconciliation edits if needed pre-copy-over (per heritage PR #491 precedent for spec compliance on multi-step verdicts).
  - This file — dashboard row update for Curriculum-team fill integration; Next session contract for Session 83 (closeout / reconciliation if needed, or post-pass §16-equivalent end-summary if introduced); session log entry for Session 82.
  - `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` — update `Status` column for any CON-NN signals where the curriculum-team verdict closes the Stage 1 sub-question (signals fully close only at Stage 2 implementation, but Stage 1 sub-questions can transition to Stage-2-ready state).
  - Foundation status doc — Last updated banner refresh + roll-up + PRs-SHIPPED list addition + Branches block update.
- **First task (when Session 82 begins):** Branch off `main` at the Session 81 PR #496 closeout-backfill commit. Verify the curriculum-team-returned worksheet against the spec (all 208 entries have verdicts; merge-verdict entries have `merge_into` populated; new-verdict entries have rationale; cluster-verdict alignment is consistent across CON-NN cluster signals).
- **Optional polish items deferred from PR #496 round 2 (do these only if Session 82 has slack):**
  - **R2-1/R2-5 backfill:** ~~`pending PR` banner in audit register~~ — closed by this closeout backfill (now reads `Session 81 PR #496 closeout (squash-merged as 6b2fac2)`).
  - **R2-2 CON-16 cross-worksheet coordination:** if Stage 2 reconciliation pass is scheduled, flag CON-16 explicitly so heritage worksheet's §9.1 verdicts + concepts side's Indigenous-cluster verdicts don't drift. Out of scope for Session 82 (single-pass curriculum-team fill).
- **Must verify (during Session 82 integration):**
  - Worksheet returned by curriculum team has all 208 entries with `verdict` and `curriculum_notes` filled (or explicit `<defer>` markers).
  - For `verdict: merge` entries, `merge_into` is populated with a canonical-key value matching an existing canonical (in §11 / §12 / §13).
  - Cluster verdicts (CON-12 / CON-22 / CON-23 / CON-24 / CON-16) are internally consistent across all cluster member entries.
  - Theme-overlap entries (`ecosystems` / `plant_growth` / `food_systems`) per §6 / D-C5 stay flagged; full resolution defers to themes worksheet.
  - Audit register CON-NN `Status` field reflects post-curriculum-fill state (likely many remain `Open` pending Stage 2 implementation, but Stage 1 verdict-pending sub-questions may transition).
- **Do not do (Session 82):**
  - Approve PROD migrations / deploys (N/A — docs-only).
  - Re-debate locked methodology decisions (D-C1 through D-C15) — those are settled.
  - Resolve theme-overlap concept-vs-theme adjudication on this worksheet (defer to themes worksheet per D-C5).
  - Open Stage 2 corpus-cleanup or re-tag work — that's Stage 2; this session is curriculum-team verdict fill only.

## PR closeout checklist

Reusable per-PR ritual for Stage 1 concepts docs PRs. Tick each box as part of the merge cycle so the dashboard, contract, and pointer surfaces stay in sync with `main`. Mirrors heritage's checklist; differences flagged where they exist.

PR closeout marks (refresh per-PR at next cycle):

- [ ] Record PR number and squash commit in the dashboard row for the shipped artifact
- [ ] Update Current state dashboard row (status `✅ Shipped`, PR number, merge commit, notes summary)
- [ ] Update `Last updated` line in this doc
- [ ] Update foundation status doc pointer (Current State header + PRs-SHIPPED list)
- [ ] Update Branches block in foundation status doc (move branch from "Active" to traceability list)
- [ ] Update Next session contract for the next session (session number, branch base, primary objective, expected files, first task, must verify, do not do)
- [ ] For status-tracking / hygiene PRs, update the Next session contract branch base to this PR's squash commit after merge
- [ ] Append new audit signals to `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` (create file if first signal)
- [ ] Search for stale strings and replace (squash-merge pending, awaiting round N, etc.)
- [ ] Commit status-doc updates with `docs(metadata-foundation):` prefix
- [ ] Push commit to `main` only if user-authorized direct-to-main closeout backfill (per heritage's 8-occurrence precedent)

## Source-of-truth rules

What lives where, so cross-references stay clean:

| File | Owns | Does NOT own |
|------|------|--------------|
| `2026-05-12-metadata-rebuild-stage1-concepts-execution-status.md` (this file) | Locked design decisions D-C1–D-C15; session log; dashboard; Next session contract; PR closeout checklist | Worksheet content; curriculum-team-facing methodology prose; audit signals |
| `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (Session 78) | Worksheet header sections (curriculum-team-facing); per-value entries; tier section structures; Appendix A v3 baseline | Project-internal session-level tracking; locked decision rationale (only cross-references back here) |
| `2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` (when created) | Stage 2 corpus cleanup / reviewer-validation intake signals derived from concept worksheet fills | Verdicts (those live in worksheet); resolution status (that's Stage 2) |
| `2026-05-12-academic-concepts-shape-investigation.md` (already exists) | First schema-simplification investigation report (subagent dispatch findings) | Locked decisions — those live here |
| `2026-05-12-academic-concepts-shape-simplification-report.md` (already exists) | Second schema-simplification investigation report (peer subagent findings) | Locked decisions — those live here |
| `2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md` | Heritage's locked decisions + session log + dashboard | Concepts-anything |
| `2026-05-03-metadata-rebuild-foundation-execution-status.md` | Foundation-phase roll-up; cross-track pointers; PRs-SHIPPED master list | Per-track session journal |
| `2026-05-03-metadata-rebuild-foundation-design.md` | Locked foundation-level design decisions (D1–D9) | Stage 1 worksheet-specific decisions |
| `2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` | Full decision journal with rationale | Stage 1 worksheet-specific decisions (those gates D5's deferred sub-questions) |

## Locked design decisions (Session 77)

These were settled across the Session 77 walkthrough with the user. Each decision has rationale + the alternative considered + the cross-reference to where the conversation happened. Do not re-debate without new evidence (per the kickoff prompt's locked-decisions rule).

### Structural decisions

**D-C1 — Concept-first worksheet structure (not subject-first).**
The worksheet treats canonical concepts as the primary entities; subjects are evidence columns on each entry (`current_subjects`, `recommended_primary_subject`, `recommended_secondary_subjects`), not section headers.

- *Alternative considered:* subject-first sections mirroring heritage's cluster pattern (six §subject sections corresponding to the 6 subject keys).
- *Why concept-first wins:* (1) The current `{Subject: [concepts]}` shape is inherited from legacy `academicIntegration.concepts`, not a deliberate design choice — the schema-simplification investigation reports both concluded the shape is "in-between" deliberate decision and inherited artifact; D5 explicitly *deferred* subject-grouping to the Stage 1 worksheet. (2) Cross-subject investigation found 2-4 of 8 cross-subject concepts are real lens distinctions; 4-6 are tagging artifacts. Subject-first sections would force per-subject verdicts on tagging-artifact concepts, hardening v3 inheritance into canonical structure. (3) Subject grouping is currently UI-orphaned (zero live consumers read subject keys); the cost of restructuring the worksheet to concept-first is low.
- *Conversation:* Session 77 user-facing walkthrough; informed by both schema-simplification investigation reports (see References below).

**D-C2 — No schema migration before the worksheet opens.**
Run the worksheet against the current `{Subject: [concepts]}` shape. A flat-array + concept registry migration is the likely *post-worksheet* end-state, informed by curriculum-team verdicts.

- *Alternatives considered:* flatten lesson row + add concept registry now (Option B/3 in the reports); drop subject grouping entirely now (Option C in report 1).
- *Why defer:* (1) D5 already deferred the subject-grouping question to Stage 1; doing a shape change now pre-empts a content decision about to happen. (2) Stage 2 plans to re-tag concepts from scratch; if shape changes post-worksheet, the regenerated rows write directly into the new shape with no waste. (3) Data-safety priority says smallest-step-first; Option A (status quo) is the smallest step that unblocks the worksheet. (4) The worksheet outputs themselves can be structured to feed a future registry migration (concept-first shape produces the registry-input data as a side effect).
- *Conversation:* Session 77; both investigation reports converged on this conclusion.

**D-C3 — Flat ordered list by frequency descending.**
Worksheet entries are ordered most-to-least frequent (within each frequency-tier section).

- *Alternatives considered:* alphabetical; by current primary subject; pre-grouped by topic clusters (botany/ecology/human body/etc.).
- *Why frequency descending:* (1) Highest-impact decisions get reviewed first; mistakes there have biggest blast radius. (2) Natural pareto stopping points emerge ("top 50 today, next 50 tomorrow"). (3) No implicit subject inheritance via section order (alphabetical and subject-grouped both re-impose subject affinity). (4) Pre-grouped topic clustering would require Claude's subjective groupings; concept-first means concept *frequency* is the only ordering dimension, which is data-objective.
- *Conversation:* Session 77.

**D-C4 — 3 frequency-tier sections (High-impact / Mid-tier / Long-tail).**
Worksheet splits into 3 sections corresponding to decision-class: High-impact (≥ 10 appearances, estimated ~30-50 entries), Mid-tier (3-9 appearances, ~60-80 entries), Long-tail (1-2 appearances, ~100-120 entries). Exact frequency cutoffs calibratable at Session 79 fill time to produce ~50-entry PR sizes.

- *Alternatives considered:* one big artifact (208 entries in one PR); arbitrary every-N cuts; 2 PRs (top+mid combined).
- *Why 3 tiers:* (1) Each PR meets the 50-80 entry PR-review bandwidth limit (claude-review + bot reviewers handle this cleanly). (2) Tier boundaries are semantically meaningful — they map to decision-class (high stakes / volume work / noise filter), not arbitrary numerical cuts. (3) 2-tier rejected because top+mid mixed in one PR distracts from high-stakes top-tier calls (different verdict character per tier).
- *Conversation:* Session 77.

**D-C5 — Theme overlap flagged at entry level; adjudication deferred.**
The 3 concept↔theme overlaps that share a vocabulary under case normalization (`ecosystems` is exact-string identical; `food systems` and `plant growth` collide once both sides are lowercased — themes-side canonical strings are Title Case `Ecosystems` / `Food Systems` / `Plant Growth`) get a `theme_overlap: YES` flag on the affected per-value entries. Adjudication (which side keeps it; whether both keep with cross-reference) is deferred to the themes worksheet / D4 canonicalization migration.

- *Alternatives considered:* Stage 1 makes per-value verdicts on the 3 overlaps now; separate concept↔theme reconciliation pass between concepts and themes worksheets.
- *Why flag-and-defer:* 3 cases too small to warrant a separate reconciliation pass; the right resolution depends on what the themes worksheet looks like, which doesn't exist yet; flag preserves the signal for whoever does the cross-field reconciliation.
- *Conversation:* Session 77.

**D-C6 — 2-file scaffold pattern (mirroring heritage).**
This file (concepts execution status doc) + Session 78's `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (curriculum-team-facing deliverable). Audit register `2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` added as a peer file when the first concept-derived Stage 2 signal surfaces (probably Session 79+).

- *Alternatives considered:* novel scaffold optimized for concepts; merge worksheet + status doc into one file; share heritage's audit register (single field-agnostic register).
- *Why mirror:* (1) Heritage's pattern shipped 12 PRs without methodology-shape problems. (2) Curriculum team will recognize the format. (3) Peer audit register avoids renaming the shipped heritage register (which would disturb cross-references in 7 merged PRs).
- *Conversation:* Session 77.

### Per-entry shape decisions

**D-C7 — Per-entry fields locked.**
Each per-value entry has 10 fields in labeled-line format (heritage parallel for parser compatibility):

```markdown
### `<canonical_key>`

- canonical_label: <Title Case label>
- verdict: <keep | merge | new | drop | <to_fill>>
- frequency: <count> appearances (or "<N> as-tagged, <M> if aliases merge")
- current_subjects: <Subject1 (count), Subject2 (count)>
- recommended_primary_subject: <single subject>
- recommended_secondary_subjects: <list or <none>>
- merge_aliases: <list of (string, count) tuples or <none>>
- theme_overlap: <none | YES — adjudication notes>
- claude_notes: <one-paragraph pre-handoff recommendation>
- curriculum_notes: <to_fill>
```

- *Heritage fields dropped:* `tier` (no 3-level hierarchy in concepts), `parent` (no nesting), `alias_map` (replaced by `merge_aliases` to be more readable). `per_lesson_override_signal` was on the draft and explicitly removed via D-C9.
- *Conversation:* Session 77; iterated through 4 sample entries (plant_parts / observation / plant_identification / ecosystems) covering the 4 typical entry patterns.

**D-C8 — Verdict vocabulary = `keep / merge / new / drop / <to_fill>`.**
Added `drop` to heritage's 4-verdict set.

- *Alternative considered:* treat noise-drop as a special case of `merge → null`.
- *Why add `drop`:* 42% of Science concepts are singletons; some are pure noise (`garden topics`, `general exploration`, `plant ID`); cleaner to distinguish noise-drop (remove entirely from canonical vocab) from canonical-merge (collapse into another canonical). The two verdicts produce different post-canonicalization data states.
- *Conversation:* Session 77.

**D-C9 — No `per_lesson_override_signal` field.**
The draft per-entry shape included a `per_lesson_override_signal` field for genuine-lens cases (e.g., `observation` Arts-side vs Science-side meaning different cognitive practices). Field dropped.

- *Why drop:* (1) Most entries (~95%) would say `<none>`; the field adds cognitive load without proportional value. (2) Registry-level subject set (`recommended_secondary_subjects`) captures the cross-subject signal at a coarser grain. (3) Per-lesson lens is a Stage 2 problem if it surfaces — Stage 2 re-tag can disambiguate at re-tag time.
- *Conversation:* Session 77.

**D-C10 — No `everyday_vocab_hints` field; separate post-worksheet brainstorm session feeds PR 3b.**
The worksheet does NOT capture everyday-vocab → canonical-concept mappings (e.g., "leaves" → `plant_parts`). Curriculum team's pedagogical-knowledge capture for `search_synonyms` (PR 3b) happens in a dedicated 60-90 minute brainstorm session after the worksheet ships.

- *Alternatives considered:* inline `everyday_vocab:` field on each entry; parallel synonyms-only worksheet after canonical list locks.
- *Why separate brainstorm session:* (1) Per-entry mode-switching between taxonomy/verdict and everyday-vocab brainstorm is taxing for the curriculum team. (2) Value is uneven across concepts (~30-40% have obvious or empty everyday vocab; ~60-70% benefit from curriculum knowledge). (3) Batching the brainstorm in a single session produces higher-quality output and respects the curriculum team's cognitive load. (4) PR 3b's writer will want to combine worksheet-derived hints with empirical query logs anyway; doing the brainstorm as PR 3b's input source (not as inline worksheet fields) keeps the data sources clean.
- *Note:* `merge_aliases` (canonical near-duplicate collapse) IS load-bearing on the worksheet. The distinction between `merge_aliases` (DB-level vocab cleanup) and `search_synonyms` (end-user query expansion) is significant; only the former lives on the worksheet.
- *Conversation:* Session 77 — user pushed back on the original "inline everyday_vocab_hints" sketch; refined to separate-brainstorm-session.

**D-C11 — Dual frequency on merge-candidate entries.**
When an entry has `merge_aliases`, the `frequency` field shows both pre-merge and post-merge counts: `5 as-tagged, 8 if aliases merge`. Entries without merge_aliases show a single number.

- *Alternative considered:* show only post-merge total (treat the merge as already-decided).
- *Why dual count:* makes the curriculum-team's decision-relevant data visible — they're choosing between "this concept has 5 lessons" and "this concept has 8 lessons after the proposed merge." If they reject the merge, the dual-count version requires no recalculation; the post-merge-only version becomes wrong.
- *Conversation:* Session 77.

**D-C12 — `current_subjects` always shows per-subject counts.**
Format `Science (239)` even when single-subject, not bare `Science`. Multi-subject case: `Science (5), Arts (1)`.

- *Alternative considered:* drop count when single-subject (count duplicates `frequency` field).
- *Why always-show:* (1) Parser-uniformity — future automation doesn't need a conditional shape rule. (2) Sanity check — if single-subject count ≠ `frequency` and there are no merge_aliases, something's wrong; always-show surfaces this. (3) Merge-candidate case has `current_subjects` count (pre-merge canonical-only) ≠ `frequency` total (post-merge), so the numbers are genuinely different and both are informative.
- *Conversation:* Session 77.

### Methodology decisions

**D-C13 — Hybrid Opus corpus-read timing.**
Upfront batch of ~60-90 Opus reads runs BEFORE per-entry fill begins (Session 79 prep). Batch targets: all 8 cross-subject concepts, ~30-40 ambiguous near-duplicate clusters, ~10-15 sample singletons selected for vague concept names. Remaining reads happen lazily during per-tier fill sessions.

- *Alternatives considered:* lazy-only (heritage parallel); upfront batch on entire 663-row v3-tagged corpus.
- *Why hybrid:* (1) Under flat-by-frequency ordering, the long tail of expensive verdicts concentrates at the bottom of the list (39 Science singletons + near-duplicate clusters + cross-subject concepts); front-loading produces even per-tier session pacing. (2) High-frequency entries (`plant_parts` at 239, `ecosystems` at 73, etc.) don't need Opus reads — the verdict is obvious from corpus distribution and string alone. (3) Small fixed cost ($5-15) buys predictable per-tier sessions vs lazy-only's variable end-of-session slowdown.
- *Risk acknowledged:* if a mid-fill verdict needs a body read that wasn't pre-fetched, do it lazily — no harm, just slight pacing variance. Upfront batch is "front-load known-needed reads," not a hard commitment.
- *Conversation:* Session 77.

**D-C14 — Session/PR boundaries by frequency tier.**
3 tier PRs (PR-Concepts-1 / 2 / 3) corresponding to D-C4's tier sections. ~50-80 entries per PR. Exact frequency cutoffs calibrated at Session 79 fill time against actual distribution to produce balanced PR sizes.

- *Alternatives considered:* one big artifact (208 entries in one PR); arbitrary every-N cuts; 2 PRs (top+mid combined); per-subject PRs.
- *Why frequency-tier:* (1) Each PR meets PR-review bandwidth limit. (2) Tier boundaries map to decision-class (high stakes / volume work / noise filter) so per-PR review character is consistent. (3) Per-subject PRs rejected because they re-introduce the subject-first cognitive frame D-C1 was designed to avoid.
- *Conversation:* Session 77.

**D-C15 — Single curriculum-team pass after all 3 tier PRs ship; review depth varies by tier.**
Curriculum team reviews the full 208-entry worksheet in one pass (Session 82), mirroring heritage's single-pass cadence. The worksheet header explicitly frames that review depth can vary by tier: high-impact tier deserves careful per-entry attention; mid-tier warrants attention but variance is acceptable; long-tail is largely noise-filter where rapid skim is fine for clear-drop singletons.

- *Alternatives considered:* per-tier handoff (3 review cycles, one per tier); front-load curriculum team for high-impact tier only.
- *Why single-pass:* (1) Locked methodology pre-fill approach means early-cycle curriculum feedback wouldn't shape later tiers' pre-fill style. (2) Team paces themselves over multiple sittings — they don't have to finish in one go. (3) Avoids multi-cycle coordination overhead.
- *Why explicit per-tier framing:* captures the stakes asymmetry without breaking rhythm — team has explicit permission to spend attention asymmetrically.
- *Conversation:* Session 77.

## References

### Schema-simplification investigation reports (Session 77 evidence trail)

- `docs/plans/2026-05-12-academic-concepts-shape-investigation.md` — first investigation report (4 parallel Opus subagents: decision journal + search/embedding pipeline + frontend/Zod/reviewer UI + TEST DB data-lens read of cross-subject concepts). Concluded: shape was inherited then preserved; subject grouping is UI-orphaned; 4/8 cross-subject concepts have real lens distinction. Recommended Option A (status quo) with optional Option D (mechanical pre-pass).
- `docs/plans/2026-05-12-academic-concepts-shape-simplification-report.md` — second investigation report (peer dispatch). Concluded similarly on the load-bearing analysis but recommended Option 2 (concept-first worksheet, no schema change yet). Found only 2/8 cross-subject concepts have real lens (stricter read than the first report).
- The two reports converged on most evidence; diverged on whether the worksheet's *structure* should change (the first lean toward status quo + optional mechanical cleanup; the second lean toward concept-first worksheet redesign). Session 77 walkthrough adopted the second report's recommendation (D-C1).

### Foundation-phase docs

- `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md` — locked foundation design, with `academicConcepts` references at lines 153 + 166 + 167 + 180.
- `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` — D5 (lines 305-329) explicitly deferred concepts' subject-grouping question to the Stage 1 worksheet; this session is the discharge of that deferral.
- `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md` — foundation roll-up; this concepts initiative gets a one-line pointer there.

### Heritage Stage 1 docs (parallel precedent)

- `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md` — heritage execution status; pattern this doc mirrors.
- `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` — heritage worksheet; per-entry shape pattern that D-C7 adapts.
- `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md` — heritage audit register; pattern this initiative's register (when created) will mirror.

## Session log

### Session 77 — 2026-05-12 — Methodology design (pre-scaffold)

**Outcome:** 15 locked design decisions covering structural shape (D-C1–D-C6), per-entry shape (D-C7–D-C12), and methodology (D-C13–D-C15). No code or worksheet artifact created — methodology lives in this doc.

**Work done:**

1. **TEST DB probes** (8 probes via `mcp__supabase-test__execute_sql`) verifying live state of `lessons.metadata.academicConcepts`:
   - Shape: JSONB object, 663 live rows populated / 88 NULL (85 pre-v3 import-era + 3 submission-era escapes).
   - 6 subject keys with skewed distribution: Science (467 rows / 92 distinct concepts) / Social Studies (253 / 37) / Literacy/ELA (205 / 46) / Health (101 / 3) / Math (95 / 18) / Arts (95 / 20).
   - 216 distinct (subject, concept) pairs; 208 distinct concept strings cross-subject; 8 cross-subject concepts (biodiversity, companion planting, historical figures, nutrition education, observation, poetry, preservation, storytelling).
   - 3 concept↔theme case-normalized overlaps: `ecosystems` (exact-string identical) / `food systems` / `plant growth` (themes side is Title Case; both sides collide under `lower()`).
   - Zero case/whitespace drift; substantial *semantic/granularity* near-duplicates within subjects (e.g., `plant identification` / `identifying plants` / `plant ID`; `adaptation` / `adaptations` / `plant adaptation` / `plant adaptations`).
   - 42% of Science concepts (39 of 92) are singletons.

2. **Schema-simplification investigation** via two parallel-dispatch subagent reports (see References). Both reports found subject grouping is UI-orphaned; both recommended NOT migrating schema before worksheet; the two diverged on whether to restructure the worksheet itself (first report: status quo + optional vocab pre-pass; second report: concept-first restructure). User adopted the second report's recommendation.

3. **Methodology walkthrough** with user, item by item:
   - Hierarchy (concept-first) → D-C1
   - Schema migration timing (no migration before worksheet) → D-C2
   - Theme overlap handling (flag and defer) → D-C5
   - Synonyms handling (separate brainstorm session) → D-C10
   - Per-entry shape (4 sample entries iterated) → D-C7
   - Verdict vocabulary (add `drop`) → D-C8
   - `per_lesson_override_signal` (drop the field) → D-C9
   - Ordering (frequency descending) → D-C3
   - Frequency presentation (dual count on merge-candidates) → D-C11
   - `current_subjects` precision (always show counts) → D-C12
   - Opus reads timing (hybrid) → D-C13
   - Session/PR boundaries (3 frequency tiers) → D-C4 + D-C14
   - Scaffold reuse (mirror heritage) → D-C6
   - Curriculum-team handoff cadence (single pass + tiered review depth) → D-C15

**Files touched:**

- Created: `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-execution-status.md` (this file).
- Pointer added: `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md` (one-line cross-reference to concepts initiative).
- Pointer added: `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md` (Last updated banner + Current State header).

**Out-of-scope items surfaced (deferred):**

- Tier cutoff numerical calibration (D-C14) — deferred to Session 78 prep (needs TEST DB probe on per-concept frequency distribution, not just per-subject counts).
- Upfront Opus batch list (D-C13) — deferred to Session 79 prep (specific concepts + lessons to read selected at that time).
- Concepts audit register file creation — deferred until first Stage 2 signal surfaces (probably Session 79+).
- Themes worksheet timing — out of scope; the 3 theme-overlap entries' resolution gates on themes worksheet existence, which is somewhere after concepts ships.

**Next:** Session 78 = worksheet scaffold creation (header sections + tier section skeletons + Appendix A v3 baseline).

### Session 78 — 2026-05-12 — Worksheet scaffold creation

**Outcome:** Worksheet scaffold landed at `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (525 lines). All 10 header sections (§1–§10) populated; 3 tier section skeletons (§11/§12/§13) in place with framing prose but no per-value entries; Appendix A v3 baseline complete (208 distinct concept strings grouped by current subject across A.1–A.6 + A.7 cross-subject cross-reference + A.8 theme-overlap cross-reference). PR pending.

**Work done:**

1. **TEST DB calibration probes** (4 probes via `mcp__supabase-test__execute_sql`) confirming D-C14 tier-cutoff numbers against current state:
   - Row sanity: 663 live with `academicConcepts` / 88 live without / 21 retired / 772 total — matches Session 77's published row count exactly.
   - Per-(subject, concept) frequency: 216 distinct pairs across 663 live rows, 1912 total concept-appearances.
   - Per-concept (summed across subjects) frequency: 208 distinct concept strings; tier distribution at locked cutoffs is **32 (≥10) / 39 (3–9) / 137 (1–2) = 208 ✓**; 8 cross-subject concepts confirmed.
   - Per-subject totals match Session 77: Science 92 distinct / 774 pair-appearances; Social Studies 37 / 453; Literacy/ELA 46 / 290; Math 18 / 150; Health 3 / 131; Arts 20 / 114.

2. **Calibration findings (vs D-C4 estimates):**
   - High-impact ≥10 at 32 entries: in D-C4's estimated 30-50 range ✓.
   - Mid-tier 3–9 at 39 entries: smaller than D-C4's estimated 60-80. Stays separate per D-C4 decision-character rationale (combining with high-impact mixes verdict-call shape).
   - Long-tail 1–2 at 137 entries: larger than D-C4's estimated 100-120 and over the ~50-entry PR-review sweet spot. Session 79 can decide to split (singletons-only ~89 vs 1-and-2-appearances ~48) or accept the larger noise-drop-heavy PR.
   - Numerical calibration captured in worksheet §5 framing; tier cutoffs in §11/§12/§13 headers reference the Session 78 probe numbers as the working defaults.

3. **Scaffold authoring** — 525 lines covering:
   - §1 Purpose & methodology, including the curriculum-team-facing 4-verdict explanation (D-C8 with `<to_fill>` as the unfilled default) and the consumer-list of who reads worksheet output (PR 5 / PR 6 / PR 3b / PR 2 deferred / Phase 2 reviewer UX).
   - §2 Structural shape — concept-first rationale (D-C1) + flat-by-frequency rationale (D-C3) + 3-frequency-tier rationale (D-C4 + D-C14).
   - §3 Verdict vocabulary — `keep / merge / new / drop / <to_fill>` with drop-vs-merge distinction (D-C8) called out explicitly.
   - §4 Per-value entry shape — 10-field labeled-line block (D-C7); field-by-field semantics; fillable-vs-pre-populated breakdown; parser compatibility.
   - §5 Frequency-tier section structure — 3 tiers locked, cutoffs probe-confirmed, calibratability framing (D-C14), per-tier review depth framing (D-C15).
   - §6 Theme overlap convention — D-C5 flag-and-defer pattern for `ecosystems` / `food systems` / `plant growth`.
   - §7 Merge_aliases convention — dual-frequency on merge-candidate entries (D-C11) + merge_aliases-vs-search_synonyms distinction (D-C10 boundary).
   - §8 Cross-subject convention — primary + secondary subjects (D-C9); 8 known cross-subject concepts listed; rationale for concept-first per-entry over subject-first two-entries pattern.
   - §9 Curriculum-team review depth — short pointer back to §5's tier-by-tier framing; placeholder for any later guidance.
   - §10 Parsing convention — adapted from heritage's §7 with adjustment for concepts' lack of case-mixing drift (no identity-shaped alias entries; per the Session 77 probe finding of zero case/whitespace drift in v3 baseline).
   - §11 / §12 / §13 — empty tier skeletons with framing prose only (no per-value entries; reserved for Sessions 79 / 80 / 81).
   - Appendix A — v3 baseline reference. A.1–A.6 grouped by subject, alphabetically ordered within subject, each concept annotated with appearance count. A.7 cross-subject overlaps cross-reference. A.8 concept↔theme case-normalized overlaps cross-reference (themes side is Title Case).

4. **Branch:** `docs/stage1-concepts-scaffold` off `main` at `db89798`. Single commit pending session-end.

**Calibration data carried into Session 79 contract:**

- Tier counts: 32 high / 39 mid / 137 long-tail at locked cutoffs.
- Long-tail split-decision: deferred to Session 79 (singletons-only ~89 vs 1-and-2 ~48 vs accept-larger).
- High-impact top-32 entries pre-ordered by frequency for Session 79's per-value fill ordering.
- 4 cross-subject concepts in high-impact tier: `nutrition education` 100/7, `storytelling` 75/1, `historical figures` 68/1, `companion planting` 10/3 — flagged for D-C9 secondary-subject treatment.
- 1 theme-overlap concept in high-impact tier: `ecosystems` 73 — flagged for D-C5 flag-and-defer treatment.
- Near-duplicate cluster spanning tiers worth Opus batch attention: `seasonal changes` 10 (high) + `seasonal cycles` 6 (mid) + `seasonal change` 2 (long) + `seasonality` 11 (high) + `seasons` 2 (long) — Session 79 batch should read to clarify canonicalization shape.

**Files touched:**

- Created: `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (525 lines).
- Updated: this file (Last updated banner; dashboard row for Worksheet scaffold; Next session contract replaced for Session 79; Session 78 log entry).
- Foundation status doc — updated at this session's session-end (Last updated banner + Current State pointer refresh).

**Out-of-scope items surfaced (deferred to Session 79+):**

- Upfront Opus batch composition — finalized list of ~60-90 concepts to read lives in the Session 79 Next session contract; specific lesson_ids to read per concept selected at batch time.
- Long-tail PR split decision — Session 79 weighs whether §13 ships as one PR (~137 entries) or two (~89 singletons + ~48 1-and-2).
- Parser script — heritage's `scripts/parse-heritage-worksheet.py` is the model; the concepts parser is Session 79+ or post-fill scope, not Session 78.
- Audit register file — created when first concept-derived audit signal surfaces (probably Session 79+).

**PR cycle:**

- **Round 1** 2-voice review (claude-review auto-bot + user-dispatched Codex) on head `ea775e5` → 3 substantive accepts in fix-up `46279c2`:
  - **F1 [P2 Codex]** — `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md:21` stale "to be created Session 78 (scaffold)" → updated to cite PR #493 scaffold landed + Sessions 79/80/81 deferral.
  - **F2 [P3 both bots]** — worksheet lines 185 + 216 contradictory `kebab-case`/`snake_case` terminology → both sites tightened to "lowercase underscore-separated" / `snake_case` with "final hyphen-vs-underscore convention locked at parser-write time" caveat preserved. Line 407 left alone (heritage parallel context, accurate as-is).
  - **F3 [P3 Codex]** — `string-identical` theme-overlap overstatement → 5 worksheet sites + 3 status doc sites updated to "case-normalized" with `ecosystems` carved out as the only exact-string case; themes-side Title Case (`Ecosystems` / `Food Systems` / `Plant Growth` per `src/utils/filterDefinitions.ts`) explicitly noted. Codex's read-only TEST DB probe drove the precision tightening.
- **Round 1 default-rejects** (2): Claude M2 §9 placeholder callout (cosmetic redirect to §5); Claude M3 `food systems` (1 appearance) low-signal `curriculum_notes` nudge (premature for scaffold; `curriculum_notes` is a curriculum-team field per D-C7). Codex also rejected both.
- **Round 2** single-voice claude-review on head `46279c2` → 0 accepts. Bot itself flagged all 3 findings as "low priority" / "doesn't block merge" / "no action needed". Full rebuttal pass posted as PR comment [#4433284745](https://github.com/danfeder/esnyc-lesson-search-react/pull/493#issuecomment-4433284745):
  - **R2-1** §7 `seasonal_cycles` `merge_aliases` example might confuse first-time readers — Rebuttal: example uses formatting distinctions (code-fence vs quoted-string) and the immediately-following clause clarifies the alias is a corpus literal; §4 + §10 establish the underscore-vs-space convention upstream; load-bearing cross-tier point preserved (the cluster spans high-impact `seasonal changes` 10 + `seasonality` 11 + mid `seasonal cycles` 6 + long `seasonal change` 2 + `seasons` 2). Swap would lose the load-bearing point.
  - **R2-2** Session 79 first-task long-tail split flag — bot explicitly "+1 on existing framing"; the Next session contract already lists the calibration call. No missing surface.
  - **R2-3** `Last updated` banner format — bot explicitly says "No action needed."
- Pre-push code-reviewer agent (Opus, `feature-dev:code-reviewer`) on both heads: 0 P1/P2/P3 findings on both `ea775e5` and `46279c2`; "Approve. Ship it." / "Approve. Safe to push."
- CI: all-green except pre-existing `Security Audit` (`@lhci/cli` chain — known repo-hygiene follow-up, out of scope per Stage 1 docs-only PR policy).
- Round-cap: round 2 of 2 per kickoff prompt; no round-3 fix-up.

**Squash-merged 2026-05-12 as `afe35bf`** with direct-to-main closeout backfill — **9th occurrence** past the 3rd-occurrence promotion threshold (precedent: Sessions 67 + 68/PR #485 + 69 + 71 + 73 + 74 + 75 + 76; user-authorized).

**Next:** Session 79 = upfront Opus batch (per D-C13) + PR-Concepts-1 high-impact tier per-value fills (32 entries in §11). Branch base = this closeout-backfill commit (downstream of `afe35bf`).

### Session 79 — 2026-05-12 — Upfront Opus batch + PR-Concepts-1 high-impact tier fills

**Outcome:** All 32 high-impact tier per-value entries filled in §11 (`plant_parts` 239 → `seasonal_changes` 10, strict frequency-descending). Phase 1 Opus batch generated `<details>` blocks for 10 of the 32 entries covering the cross-subject splits + near-duplicate clusters + 1 theme-overlap case. Audit signal register created at `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` with 11 open `CON-NN` signals (CON-01 through CON-11). PR #494 squash-merged 2026-05-12.

**Work done:**

1. **Phase 1 Opus batch (~18 corpus reads via `/tmp/session-79-opus-*.md`)** — covered cross-subject concepts (companion_planting, historical_figures, nutrition_education, storytelling), near-duplicate clusters (seasonality + seasonal_changes cluster spanning all 3 tiers; community_systems + community + community_building + community_activism cluster; preservation + food_preservation cluster), the theme-overlap case (ecosystems Science 73 vs `Ecosystems` filter-theme), and vague singletons (garden topics, general exploration, plant science, plant-based proteins, food processing, holidays, song, etc.). Reads bottomed out at ~$30-60 total Opus spend (well under the $30-135 budget ceiling).

2. **Per-entry fills across 3 commits** — `eaeffb6` (entries 1-11 + Phase 1 Opus batch), `50386f1` (entries 12-22), `c1e1ad6` (entries 23-32). Each entry uses the 10-field labeled-line shape per D-C7; `verdict` + `curriculum_notes` left as `<to_fill>` per pre-handoff convention.

3. **Audit signal register initialization** — commit `9228fde`. 11 open CON-NN signals seeded from Phase 1 batch findings + per-entry analysis:
   - CON-01 seasonality cluster — "Seasons" template-trio tagged inconsistently across `seasonal_changes` (phenomenology) vs `seasonal_eating` (food-availability) lenses
   - CON-02 + CON-03 Wave 3 garden-meta singletons — Soul Food Sunday template stub (`general exploration`) + Informational Writing - Topics/Subtopics defensive Science slot-fill (`garden topics` + `plant science`)
   - CON-04 historical_figures cross-subject — George Washington Carver gets different subject tags in different lessons
   - CON-05 + CON-06 community_systems cluster — `community activism` should merge into `advocacy` not `community_systems` (Session 80 forward-reference); `community_systems` (15) double-duties as food-systems + environmental-systems + community-structures
   - CON-07 storytelling cross-subject — `Mr. Anthony's Spring Trees Unit` is the only `storytelling:Arts` lesson; redundant Arts tag drops per recommendation
   - CON-08 companion_planting cross-subject — 13 Three-Sisters / Lenape / Squanto lessons split between Science (10) and Social Studies (3) for the SAME agronomic concept (smoking-gun reviewer-inconsistency)
   - CON-09 preservation cluster — `preservation` (Science 3) and `food preservation` (Science 1) are merge candidates; Session 80 forward-reference
   - CON-10 nutrition_education cross-subject — Science 7 / Health 100 split tracks `academicIntegration` array choice rather than actual content; broader pattern observation for Stage 2 reviewer-validation
   - CON-11 historical_context singleton — Session 81 forward-reference (long-tail merge_alias decision)

4. **Pre-push code-reviewer agent (Opus, `feature-dev:code-reviewer`)** on head `c1e1ad6` returned 0 P1/P2, 3 P3 cosmetic findings. 2 accepted, 1 rejected in fix-up `a7342ab`:
   - **P3-A accepted** — §11 banner stale ("empty skeleton" → "filled (32 of 32 entries)")
   - **P3-B accepted** — entry 25 `seeds` claude_notes "Session 80/81 long-tail" phrasing conflated tier scheduling; fixed to specific "seed_dispersal in Session 80 mid-tier; seed_starting in Session 81 long-tail" per actual tier placements
   - **P3-C rejected** — entry 32 `seasonal_changes` `<details>` consolidation into entry 29; consolidation is intentional, parser skips `<details>` per §10/§4 spec, 60-line duplication not worth marginal human-navigation gain

5. **Branch:** `docs/stage1-concepts-high-impact-tier` off `main` at the Session 78 PR #493 closeout-backfill commit `30314ae` (downstream of squash `afe35bf`).

**Files touched:**

- Updated: `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (32 per-value entries appended to §11; banner updated; entry 25 phrasing tightened).
- Created: `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` (39 lines: 11 open CON-NN signals + closed-signals placeholder + closing footnote).
- Foundation status doc — updated at this session's session-end (Last updated banner + Current State pointer refresh).

**Out-of-scope items surfaced (deferred to Session 80+):**

- CON-05 forward-reference: Session 80 mid-tier `advocacy` 3 entry should pick up `community activism` 1 as merge_alias.
- CON-09 forward-reference: Session 80 mid-tier `preservation` 3 entry should pick up `food preservation` 1 as merge_alias and integrate `/tmp/session-79-opus-preservation.md` reasoning as a durable `<details>` block per F2 hardening pattern.
- CON-11 forward-reference: Session 81 long-tail `historical_context` 1 entry — verdict between merge-into-`historical_figures` vs standalone-keep.
- Long-tail split decision (PR-Concepts-3 scope): singletons-only ~89 vs 1-and-2 ~48 vs accept-larger 137. Session 79 did not weigh in; deferred to Session 80 or 81.
- Mid-tier targeted Opus reads: Session 80 may need them for `seasonal cycles` 6, `preservation` 3, `advocacy` 3, and other ambiguous mid-tier entries flagged at fill time. Phase-1-batch scale is not required (many cross-cutters already covered by Session 79).

**PR cycle:**

- **Round 1** 3-voice review on head `a7342ab` (claude-review auto-bot + user-dispatched Codex + user-dispatched Hermes) → 2 substantive accepts in fix-up `394a3f5`:
  - **F1 [3-voice convergence: claude P1 + Codex P2 + Hermes Warning]** — `companion_planting` (frequency 13) was at §11 position 31 after three 11-count entries (`food_webs`, `seasonality`, `sensory_exploration`), breaking the PR-body-promised frequency-descending order. Moved the entry (with its `<details>` block) to alongside `seeds` 13, before `thermal_energy` 12. §11 is now strictly frequency-descending across all 32 entries. Pre-push agent had missed this — useful diagnostic for the single-voice-pre-push vs 3-voice-post-push catch boundary.
  - **F2 [2-voice convergence: Codex P2 + Hermes Warning]** — Audit register Evidence cells cited ephemeral `/tmp/session-79-opus-*.md` paths violating the kickoff repo-facing-evidence rule. Hybrid remediation:
    - **Stripped** redundant `/tmp` paths from CON-01 / CON-04 / CON-05 / CON-06 / CON-07 / CON-08 / CON-10 (these rows already had durable worksheet `<details>` / claude_notes pointers; `/tmp` was non-load-bearing clutter).
    - **Inlined** Drive-ID lesson references + body excerpts directly into CON-02 / CON-03 / CON-09 Evidence cells (sole-evidence rows with no worksheet `<details>` block — CON-02/03 are Wave 3 singletons that don't land until Session 81; CON-09 is mid-tier spillover that lands in Session 80). Each row is now self-validating from repo content alone.
    - Refreshed register `Last updated` banner.

- **Round 1 default-rejects** (3, all self-flagged by claude-review): M1 `community building` weak-merge ("no action required"); M2 `water_cycles` plural/singular ("no change needed"); M3 `seasonal_changes` forward-reference to entry 29 ("rebuttal is sound") — same as pre-push P3-C already rebutted; Codex also rejected.

- **Round 2** 2-voice review on head `394a3f5` (claude-review + user-dispatched Hermes; Codex not posted this round) → 0 accepts; both bots flagged ship-ready (claude "Ready to merge", Hermes "Approved ✅"). 5 forward-looking polish observations all default-rejected with rebuttals (full rebuttal pass posted as PR #494 comment [#4436074760](https://github.com/danfeder/esnyc-lesson-search-react/pull/494#issuecomment-4436074760)):
  - **R2-1 / H-1** (2-voice convergence on observation, not on defect) — Add CON-12 or expand CON-06 for `community building` drop-the-tag fork. Rebuttal: `community_systems` claude_notes already names the drop-the-tag alternative explicitly; CON-06 boundary-sharpening scope is broad enough to surface this at Stage 2 review time. Hermes itself: "worksheet note is already sufficient."
  - **R2-2** Surface-label `water_cycles` plural-vs-singular as audit signal. Rebuttal: D4 vocab canonicalization (PR 5+) is the dedicated mechanism; audit register is for Stage 2 corpus cleanup / reviewer-validation, not vocabulary normalization. Conflating workflows would weaken both.
  - **R2-3** HTML comment marker on entry 32 cross-reference to entry 29. Rebuttal: claude_notes already says "see entry 29's `<details>` block above" — visible in both rendered and source views. HTML comment is invisible in rendered view; pure redundancy. Repeat of round-1 M3 / pre-push P3-C.
  - **R2-4** Ordering-constraints column for CON-05 timing dependency. Rebuttal: Sequential Sessions 79/80/81 ordering is locked per D-C14 + Next-session-contract methodology. Speculative design for hypothetical non-linear workflow.

- Pre-push code-reviewer agent (Opus) on round-1 fix-up `394a3f5`: 0 P1/P2/P3 findings, "Approve. Safe to push."
- CI: all-green except pre-existing `Security Audit` (`@lhci/cli` chain — known repo-hygiene follow-up, out of scope per Stage 1 docs-only PR policy).
- Round-cap: round 2 of 2 per kickoff prompt; no round-3 fix-up triggered (would have been critical-bugs-only per round-cap rule).

**Squash-merged 2026-05-12 as `1ab5e82`** with direct-to-main closeout backfill — **10th occurrence** (precedent: Sessions 67 + 68/PR #485 + 69 + 71 + 73 + 74 + 75 + 76 + 78; user-authorized).

**Next:** Session 80 = PR-Concepts-2 mid-tier per-value fills (39 entries in §12 at frequency 3-9). Branch base = this closeout-backfill commit (downstream of `1ab5e82`). Per CON-05 + CON-09, the mid-tier `advocacy` 3 entry should pick up `community activism` 1 as merge_alias and the mid-tier `preservation` 3 entry should pick up `food preservation` 1 as merge_alias + integrate `/tmp/session-79-opus-preservation.md` reasoning as a durable `<details>` block per F2 hardening pattern.

### Session 80 — 2026-05-12 — PR-Concepts-2 mid-tier per-value fills

**Outcome:** All 39 mid-tier per-value entries filled in §12 (frequency-descending, alphabetical tie-break: drawing / fractions / plant_growth at freq 9 → seed_dispersal at freq 3). 3 entries integrate Session 79 Phase 1 Opus batch evidence as `<details>` blocks per F2 hardening (biodiversity + observation cross-subject splits; preservation cross-subject + canonical-absorbing). 4 new audit signals appended (CON-12 through CON-15); register now has 15 open CON-NN signals. PR #495 squash-merged 2026-05-12 as `e7632e3`.

**Work done:**

1. **TEST DB calibration probe (sanity check + final list).** First probe without `retired_at IS NULL` filter returned 42 mid-tier entries; second probe with the filter returned **39 ✓** matching Session 78's locked 32/39/137 = 208 distribution. The 3-entry delta = concept strings living only on retired lessons (PR 4's `retired_at` soft-delete cohort). Probe query at PR #495 description; reproducible via `mcp__supabase-test__execute_sql`.

2. **Per-entry fills across 1 commit** — `a5721d4` (39 entries inserted into §12 between the status banner and §13 long-tail header). Each entry uses the 10-field labeled-line shape per D-C7; `verdict` + `curriculum_notes` left as `<to_fill>`. Cross-references to §11 entries verified (e.g., §11 `seasonality` is entry 30 — `food_webs` is entry 29; the pre-existing §11 `seasonal_changes` off-by-one reference to "entry 29 above" left untouched per scope). 3 `<details>` blocks integrate Session 79 Phase 1 Opus material:
   - **biodiversity** (Sci 6 + SS 1) — full 7-lesson cohort from `/tmp/session-79-opus-biodiversity.md`; adds 4th data point to CON-04/CON-08/CON-10 academicConcepts-tracks-academicIntegration artifact pattern.
   - **observation** (Sci 5 + Arts 1) — full 6-lesson cohort from `/tmp/session-79-opus-observation.md`; surfaces CON-13 (v3 tagger's drawing-pairing heuristic). Smoking-gun pair: Fall Special Spot (Science observation + Arts drawing) vs Spring Special Spot (Arts drawing + observation; Science seasonal_change).
   - **preservation** (Sci 3 + SS 1) — full 5-lesson cohort + `food preservation` 1 Science comparison row from `/tmp/session-79-opus-preservation.md`; canonical-absorbs `food preservation` 1 per CON-09 forward-reference; cultural-preservation lens (Three Sisters Succotash SS) flagged via `recommended_secondary_subjects: Social Studies (conditional)` for curriculum-team decision.

3. **Forward-referenced merge_alias proposals landed:**
   - **CON-05 closed (proposal-landed):** §12 `advocacy` 3 entry absorbs `community activism` 1 as merge_alias (per §11 community_systems claude_notes redirect). Post-merge total: 4 lessons.
   - **CON-09 closed (proposal-landed):** §12 `preservation` 4 entry absorbs `food preservation` 1 as merge_alias per Session 79 Opus read recommendation. Post-merge total: 5 lessons.
   - Both audit-register rows updated with proposal-landed Stage 2 Action language while preserving Open status (signals close at Stage 2 re-tag implementation, not at Stage 1 worksheet fill).

4. **4 new audit signals appended (CON-12 through CON-15):**
   - **CON-12** writing-cluster canonical-shape question — `writing` 8 generic catch-all alongside 5 mid-tier writing sub-types + 7 long-tail variants; 3-option decision (residual catch-all vs drop generic vs flip-canonical) deferred to curriculum-team fill.
   - **CON-13** observation `drawing`-attached procedural artifact — separate signal from CON-04/08/10 pattern; corpus-wide audit recommended before Stage 2 consolidation.
   - **CON-14** garden_exploration drop-or-keep boundary — context-tag-not-concept question (the `location: garden` filter already covers the broader "garden as context" signal).
   - **CON-15** nutrition vs nutrition_education boundary — label-drift vs distinct-biology-lens decision; not decidable from probe data alone, requires targeted Opus read or curriculum-team direct judgment.

5. **Tier-cutoff calibration call (D-C14):** Session 79 deferred the long-tail split decision; Session 80 also **punts to Session 81** (preliminary: ~108 singletons + ~29 two-appearance = 137 total). Session 80's plate is full with mid-tier; pushing the decision one more session doesn't delay the per-value fills (Session 81 = PR-Concepts-3 long-tail). Session 81's first task is the split decision.

6. **Pre-push code-reviewer agent (Opus, `feature-dev:code-reviewer`)** on initial commit `a5721d4` returned 3 P3 cosmetic findings, all applied in pre-push fix-up `4920b5f`:
   - **P3-1 (F1) accepted** — "§11 entry 29" → "§11 entry 30" in 3 sites (§12 status banner + seasonal_eating claude_notes + seasonal_cycles claude_notes). `food_webs` is entry 29, `seasonality` is entry 30. The pre-existing §11 `seasonal_changes` "entry 29 above" off-by-one left untouched per scope.
   - **P3-2 (F2) accepted** — Tightened CON-12 Evidence column from claim that all 5 mid-tier writing sub-types name-check CON-12 to honest count of 3 explicit citers (writing / how_to_writing / persuasive_writing) — was overstated.
   - **P3-3 (F3) accepted** — Added one-clause clarifier in §12 `writing` entry + CON-12 row noting `creative writing` 1 is corpus-tagged Arts (not Lit/ELA per Appendix A.6) — prevents misreading of the writing-cluster framing as exclusively-Lit/ELA.
   - Re-run on `4920b5f`: 0 findings, "Approve. Safe to push."

7. **Branch:** `docs/stage1-concepts-mid-tier` off `main` at `02ab53d` (Session 79 PR #494 closeout-backfill commit, downstream of squash `1ab5e82`).

**Files touched:**

- Updated: `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (39 per-value entries appended to §12; status banner updated; 3 `<details>` blocks integrated).
- Updated: `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` (4 new rows CON-12 through CON-15; CON-05 + CON-09 Stage 2 Action columns updated; Last updated banner refreshed).
- Foundation status doc — updated at session-end closeout backfill (Last updated banner + Current State pointer refresh + PRs-SHIPPED list addition + Branches block update).

**Out-of-scope items surfaced (deferred to Session 81+):**

- **Long-tail split decision (D-C14):** Session 81's first task. Options (a) single 137-entry PR, (b) singletons-vs-2-appearance split (108 + 29), (c) even-thirds split (~46+46+45), (d) alphabetical halves (~69+69).
- **CON-11 forward-reference:** Session 81 long-tail `historical_context` 1 entry verdict — merge into §11 `historical_figures` 8 vs keep standalone.
- **CON-12 forward-reference:** curriculum-team verdict on writing-cluster canonical-shape question lands at curriculum-team-fill (Session 82+).
- **CON-13 corpus-wide audit:** count `Science::observation` + `Arts::observation` rows before Stage 2 consolidation.
- **CON-14 verdict:** `garden_exploration` keep-or-drop decision lands at curriculum-team-fill (Session 82+).
- **CON-15 Opus read or curriculum judgment:** the 4 `nutrition` Science lessons need lens inspection — narrower biology-of-nutrition vs label drift into nutrition_education.
- **R2-1 deferred polish:** add `(see CON-13)` to §12 `drawing` claude_notes for bidirectional navigability with `observation` (PR #495 round-2 bot-voice diverged; Hermes explicit "not necessary").
- **§11 entry-29-vs-30 cleanup:** pre-existing off-by-one in §11 `seasonal_changes` claude_notes (refers to seasonality as "entry 29 above"; actually entry 30). PR #495 fixed 3 §12 references but didn't drive-by fix §11. Session 81 can do as part of any §11 cross-reference pass.

**PR cycle:**

- **Round 1** 2-voice review on pre-push-fix-up head `4920b5f` (claude-review auto-bot + user-dispatched Hermes; Codex not posted this round) → 2 substantive accepts in fix-up `c4c0aa5`:
  - **F1 [P3 2-voice convergence: claude + Hermes]** — Added `(see CON-12)` parenthetical pointers to 3 §12 writing sub-type entries (narrative_writing / opinion_writing / descriptive_writing) that previously referenced the writing cluster implicitly. CON-12 register row Evidence column updated to reflect all 6 entries now explicitly cite CON-12. Made worksheet-to-register navigation uniform across the writing cluster.
  - **F2 [P3 2-voice convergence: claude + Hermes]** — Normalized §12 `preservation` `recommended_secondary_subjects` field value from verbose `Social Studies (conditional — only if curriculum team affirms a "cultural-heritage / traditional-knowledge preservation" lens distinct from food-science preservation)` to `Social Studies (conditional)` per §4 spec (field is "comma-separated list, or <none>"). Verbose conditionality rationale preserved verbatim in claude_notes — no information lost, field value now parser-friendly.

- **Round 1 default-rejects** (3, all with rebuttal):
  - **M1 (claude) advocacy frequency-label observation** — bot self-flagged "Correct and consistent — just noting"; meta-observation about PR-description summarization, not entry-level issue.
  - **M2 (claude) CON-09-stays-Open observation** — bot self-flagged "This is correct"; signal-closes-at-Stage-2 is the established register convention.
  - **Security Audit pre-existing fail** — `@lhci/cli` dependency-chain debt per repo hygiene-follow-up; Hermes verified same fail on recent main runs (NOT PR-specific).

- **Round 2** 2-voice review on round-1 fix-up head `c4c0aa5` (claude-review + Hermes; Codex not posted) → 0 accepts; both bots flagged ship-ready (claude "Approve", Hermes "Approved ✅"). 4 + 1 forward-looking polish observations all default-rejected with rebuttals (full rebuttal pass posted as PR #495 comment [#4436491865](https://github.com/danfeder/esnyc-lesson-search-react/pull/495#issuecomment-4436491865)):
  - **R2-1 (2-voice divergence)** — claude suggested adding `(see CON-13)` to §12 `drawing` claude_notes for bidirectional navigability; Hermes explicitly rebutted "I do **not** consider it necessary for this PR. The core signal is already documented from the authoritative side (`observation`) and in CON-13 itself, so I see that as optional future polish rather than a follow-up requirement." Rejected per round-cap + signal-already-discoverable; deferred to Session 81 if pattern-consistency matters.
  - **R2-2** `Social Studies (conditional)` format note — claude self-flagged "This is intentional and the right call"; informational, not actionable.
  - **R2-3** seasonal merges live in claude_notes not merge_aliases — claude self-flagged "This is intentional and the right convention... Just noting for completeness."
  - **R2-4** Audit register Last updated banner accumulation — forward-looking suggestion for Session 81+ if banner grows further.
  - **Test plan suggestion** (claude) — docs-only scope verify + Markdown table preview check; both already verified pre-push + Hermes re-check.

- Pre-push code-reviewer agent (Opus, `feature-dev:code-reviewer`) on initial commit `a5721d4`: 3 P3 cosmetics; all applied in `4920b5f`; re-run on `4920b5f` returned 0 findings.
- CI: 15/16 checks pass; pre-existing Security Audit fail rejected per repo hygiene-follow-up.
- Round-cap: round 2 of 2 per kickoff prompt; no round-3 fix-up triggered.

**Squash-merged 2026-05-12 as `e7632e3`** with direct-to-main closeout backfill — **11th occurrence** (precedent: Sessions 67 + 68/PR #485 + 69 + 71 + 73 + 74 + 75 + 76 + 78 + 79/PR #494; user-authorized).

**Next:** Session 81 = PR-Concepts-3 long-tail per-value fills (137 entries in §13 at frequency 1-2). Branch base = this closeout-backfill commit (downstream of `e7632e3`). First task: long-tail split decision (D-C14) — options (a) single 137-entry PR, (b) singletons-vs-2-appearance split, (c) even-thirds split, (d) alphabetical halves; recommend (a) or (b). Per CON-11, the long-tail `historical_context` 1 entry verdict (merge into §11 `historical_figures` vs keep standalone) lands at Session 81 fill time.

### Session 81 — 2026-05-12 — PR-Concepts-3 long-tail per-value fills

**Outcome:** All 137 long-tail per-value entries filled in §13 (29 freq-2 + 108 freq-1, alphabetical within frequency-descending order per D-C3). Single-PR option chosen per D-C14 split decision. 9 new audit signals appended (CON-16 through CON-24); register now has 24 open `CON-NN` signals. Worksheet top banner advanced SCAFFOLD → PRE-HANDOFF FILLED. PR #496 squash-merged 2026-05-12 as `6b2fac2`.

**Work done:**

1. **D-C14 long-tail split decision** — first task per Session 80's punt. User picked option (a) single 137-entry PR via `AskUserQuestion` selection. Rationale: alternatives (b/c/d) split merge clusters across PRs — `plant_identification` aliases include both `identifying_plants` 2 (freq-2) + `plant_id` 1 (freq-1); `adaptations` aliases are 3 freq-1 entries (`adaptation` + `plant_adaptation` + `plant_adaptations`); `cultural_traditions` / `community_systems` / `visual_arts` alias members are mixed freq. Single-PR keeps all forward-references closing in one cycle. Tradeoff: largest concept-tier PR yet (3.5× mid-tier size, 1.5× heritage §16's 88-row mechanical PR) — but most entries are mechanical drop/merge calls so per-entry review time is low.

2. **TEST DB calibration probe** (2 probes via `mcp__supabase-test__execute_sql`) confirming Session 80 preliminary count:
   - Distribution probe: 137 long-tail at `retired_at IS NULL` filter (108 freq-1 + 29 freq-2) — matches Session 80 exactly.
   - Full list probe: per-(concept, subject, total_appearances) breakdown for all 137 freq-1/2 strings, used to drive per-entry filling.

3. **§13 per-value entries authored** — single Edit operation spliced the 137 entries (~1786 net lines) into the worksheet replacing the empty `§13` skeleton. Each entry follows the 10-field labeled-line shape per D-C7; `verdict` + `curriculum_notes` left as `<to_fill>` per pre-handoff convention. Entry categories:
   - **3 clear drops** (`garden_topics`, `general_exploration`, `plant_science`) per CON-02/CON-03 audit signals.
   - **~30 clear merges** with proposed targets in §11/§12 canonicals (already-proposed merge_aliases per Session 79/80 forward-references): adaptation/plant_adaptation/plant_adaptations → §12 adaptations; identifying_plants/plant_id → §12 plant_identification; community/community_building → §11 community_systems; community_activism → §12 advocacy (CON-05); family_traditions/international_food_traditions → §11 cultural_traditions; coloring/craft_activity → §11 visual_arts; food_preservation → §12 preservation (CON-09); seasonal_change/seasons → §11 seasonal_changes; recipe_writing → §12 how_to_writing; social_justice → §12 social_justice_issues.
   - **~50 new merge proposals** surfacing during fills (not previously proposed in §11/§12): holidays + national_and_religious_holidays → cultural_traditions; map_reading → geography; scaling → recipe_scaling; song → music; tallying → counting/data_collection; roots → plant_parts; consumers/producers → food_webs; growing_cycles/growth_patterns → plant_growth; soil → soil_science; seed_starting → seeds; taste → sensory_exploration; volume/area/weight/perimeter → measurement (per CON-23 boundary); biography/biography_reading → reading_comprehension or storytelling (per CON-22); microbiome → microorganisms; states_of_matter → phases_of_matter (per CON-19); plus form-drift pairs handled via CON-18/CON-21.
   - **~50 standalone-keep or genuinely-ambiguous** entries (specific biology/chemistry: cellular_respiration, chemical_reactions, microbiome, homeostasis, fermentation, etc.; Math practices: patterns, ratios, unit_rates; Lit/ELA practices: discussion, debate, research, sequencing; Arts: dance, design, performance; Health: hydration; etc.) — claude_notes recommends curriculum-team verdict direction but doesn't lock.
   - **2 cross-subject entries**: `poetry` (Lit/ELA 1 + Arts 1) — recommended Lit/ELA primary + Arts secondary (genuine cross-subject, not tagging artifact); `historical_figures` Lit/ELA 1 row already cross-referenced from §11.
   - **1 theme-overlap entry**: `food_systems` 1 (SS) with `theme_overlap: YES` flag per D-C5; per CON-06 may collapse into §11 community_systems entirely when themes worksheet resolves the concept↔theme reconciliation.
   - **CON-11 closure**: `historical_context` 1 (SS) entry's claude_notes records the merge-vs-keep verdict question (era/setting backdrop lens vs people-as-history-makers lens) with rationale for both directions per D-C11; 1-lesson signal too thin to decide structurally without curriculum-team subject-matter judgment.

4. **9 new audit signals appended (CON-16 through CON-24):**
   - **CON-16** Indigenous-cluster cross-field overlap — 3 SS singletons (`indigenous_knowledge` 1, `indigenous_stories` 1, `native_american_history` 1) fragment vs heritage worksheet's §9.1 `Indigenous and Diaspora` cluster (heritage D1: single combined root with `African American` + `Indigenous` as parallel direct children). **First cross-field cross-reference in either register.** Stage 2 reconciliation may need a separate pass after both worksheets ship.
   - **CON-17** holidays cluster — `holidays` 1 + `national_and_religious_holidays` 1 → merge into §11 `cultural_traditions` 206.
   - **CON-18** `cardiovascular_system` / `circulatory_system` form-drift pair — same anatomical system, different vocabulary registers.
   - **CON-19** `phases_of_matter` (freq-2) / `states_of_matter` (freq-1) form-drift pair — same physical-chemistry concept.
   - **CON-20** `climate` (freq-2) / `climate_change` (freq-1) sub-topic boundary.
   - **CON-21** `harvest` / `harvesting` noun/gerund form-drift pair.
   - **CON-22** Reading-cluster boundary — 6-entry cluster (`reading` 2 + `reading_comprehension` 6 [§12] + `narrative_reading` 1 + `biography_reading` 1 + `informational_text` 1 + `biography` 1) needs unified verdict.
   - **CON-23** Measurement-cluster boundary — 5-entry cluster (`measurement` 66 [§11] + `volume` 2 + `area` 1 + `weight` 1 + `perimeter` 1) — merge sub-dimensions into measurement vs keep parallel canonicals.
   - **CON-24** Figurative-language cluster boundary — 4-entry cluster (`figurative_language` 1 + `similes` 1 + `descriptive_language` 1 + `sensory_details` 1) — consolidate under figurative_language, fold into §11 `vocabulary_development` 59, or keep separate.

5. **Pre-push code-reviewer agent (Opus, `feature-dev:code-reviewer`)** on initial commit `2e65abc` returned 0 P1, 1 P2, 0 P3 findings:
   - **P2 accepted** in pre-push fix-up `87af425` — `plant_based_proteins` was alphabetically misplaced in §13 (placed after `plant_science` instead of between `plant_and_animal_similarities` and `plant_id`). 12-line entry block moved; no content change. By canonical_key alphabetical sort, correct order is `plant_adaptation` → `plant_adaptations` → `plant_and_animal_similarities` → `plant_based_proteins` → `plant_id` → `plant_reproduction` → `plant_science` → `planting`.
   - Re-run on `87af425`: 0 findings, "Approve. Safe to push."

6. **Worksheet top banner advanced** from `SCAFFOLD (last update Session 78, 2026-05-12)` to `PRE-HANDOFF FILLED (last update Session 81, 2026-05-12)` — all 208 per-value entries across 3 tiers (32 §11 + 39 §12 + 137 §13) are now pre-filled; awaiting curriculum-team verdict pass at Session 82+.

**Branch:** `docs/stage1-concepts-long-tail` off `main` at `4c0856e` (Session 80 PR #495 closeout-backfill commit, downstream of squash `e7632e3`).

**Files touched:**

- Updated: `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (137 per-value entries appended to §13; status banner updated; top banner advanced to PRE-HANDOFF FILLED; pre-push P2 fix-up = plant_based_proteins reordered).
- Updated: `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` (9 new rows CON-16 through CON-24; Last updated banner refreshed; round-1 fix-up clarified the banner's closure-state terminology).
- Foundation status doc — updated at session-end closeout backfill (Last updated banner + Current State pointer refresh + PRs-SHIPPED list addition + Branches block update).

**Out-of-scope items surfaced (deferred to Session 82+):**

- **Curriculum-team verdict pass** on all 208 entries (Session 82 primary objective per D-C15).
- **CON-12 writing-cluster shape** verdict (option a/b/c) — curriculum-team call at Session 82 fill time.
- **CON-16 cross-worksheet coordination** with heritage §9.1 verdicts — flag for Stage 2 reconciliation pass (after both worksheets ship).
- **CON-22 reading-cluster + CON-23 measurement-cluster + CON-24 figurative-language cluster** unified verdicts — curriculum-team cluster decisions at Session 82.
- **Theme-overlap entries** (`ecosystems` / `plant_growth` / `food_systems` per §6) — adjudication defers to themes worksheet per D-C5.
- **CON-14 garden_exploration** + **CON-15 nutrition vs nutrition_education** verdicts — curriculum-team picks at Session 82.

**PR cycle:**

- **Pre-push code-reviewer agent (Opus)** on initial head `2e65abc`: 1 P2 (plant_based_proteins alpha order); applied in `87af425`. Re-run on `87af425`: 0 findings, "Approve. Safe to push."

- **Round 1** 2-voice review on `87af425` (claude-review auto-bot + user-dispatched Hermes) → 1 substantive accept in fix-up `187b1ad`:
  - **F1 [2-voice convergence: Hermes BLOCKING + claude P3 parallel]** — Audit register banner used "2 prior signals closed at Session 81 fill: CON-11 historical_context (forward-reference closed by `historical_context` 1 long-tail entry; verdict pending curriculum team between merge-into-historical_figures vs standalone-keep); the §11/§12 merge-alias forward-references for cultural_traditions / community_systems / visual_arts / adaptations / plant_identification all have alias-side §13 entries landed." But the register's own `Status vocabulary` rule defines `Resolved` as Stage 2 closure with a corpus-cleanup / re-tag / reviewer-validation action recorded; CON-11 itself remained in the Open table. Same conflation appeared in 3 PR description table cells ("CON-05 closure", "CON-09 closure", "CON-11 closure") + section header ("Forward-reference closures from §11/§12"). Fix: audit register banner rewritten to "Forward-reference scaffold landed at Session 81 fill" with explicit callout that Stage-1 alias-side landings do NOT close signals; CON-11 + CON-05 + CON-09 all clarified as Open with proposal-landed state. PR description section header changed to "Forward-reference scaffold landings"; table cells changed to "CON-XX forward-ref landed (signal stays Open)"; terminology note added at section top.

- **Round 1 default-rejects** (2, with rebuttals):
  - **M1 (claude P2 single-voice; Hermes "optional polish")** — `frequency: 1 appearances` plural-grammar for the 108 freq-1 entries. §4 spec specifies `<count> appearances` as a uniform parser-friendly suffix; this is format-consistency with §11/§12's uniform suffix, not natural-language grammar. Hermes explicitly treated as optional cleanup. Single-voice low-confidence + spec compliance argues default-reject. 108-entry replace would also diverge §13 from §11/§12 convention.
  - **M2 (claude P3 single-voice; Hermes did not flag)** — `merge_aliases: <none>` semantic ambiguity for merge-into candidates. §4 + §7 already document the canonical-absorbing-side (`merge_aliases`) vs alias-side (`merge_into <target>` once verdict=merge) asymmetry. Adding additional §7 prose for skim-readers is excess.

- **Round 2** 2-voice review on round-1 fix-up `187b1ad` (claude-review + Hermes) → 0 accepts; both bots flagged ship-ready (claude "Approved — safe to merge"; Hermes "Approved from my side. No remaining blocking issues."); 4 + 1 forward-looking polish observations default-rejected with rebuttals per round-cap rule + PR #494/#495 round-2 precedent (full rebuttal pass posted as PR #496 comment [#4436801432](https://github.com/danfeder/esnyc-lesson-search-react/pull/496#issuecomment-4436801432)):
  - **R2-1 (claude) / R2-5 (Hermes)** — `pending PR` banner backfill (post-merge hygiene). Two-voice convergent observation, but explicitly post-merge (Hermes: "post-merge/backfill hygiene rather than a merge blocker"; claude: "or it can be fixed in the Session 82 pass"). **Closed by this closeout commit.** Squash commit hash `6b2fac2` now in the audit register banner per the standard direct-to-main closeout backfill pattern.
  - **R2-2** CON-16 cross-worksheet coordination flag for Session 82 agenda. Already captured in CON-16's `Stage 2 action` column: "Cross-field reconciliation may need a separate pass after both worksheets ship".
  - **R2-3** CON-22 reading-cluster pre-stage mini-brief. Already done — CON-22 register row contains 3 explicit resolution options (a/b/c) with "preferred approach" path.
  - **R2-4** CON-23 measurement-cluster offer binary choice. Already done — CON-23 register row presents preferred + alternative resolutions.

- Pre-push code-reviewer agent (Opus) on initial commit + post-fix-up: 1 P2 → 0 findings respectively.
- CI: 15/16 checks pass; pre-existing Security Audit fail (`@lhci/cli` chain dependency debt) default-rejected per repo hygiene-follow-up (Hermes verified same fail matches main runs).
- Round-cap: round 2 of 2 per kickoff prompt; no round-3 fix-up triggered.

**Squash-merged 2026-05-12 as `6b2fac2`** with direct-to-main closeout backfill — **12th occurrence** (precedent: Sessions 67 + 68/PR #485 + 69 + 71 + 73 + 74 + 75 + 76 + 78 + 79/PR #494 + 80/PR #495; user-authorized).

**Next:** Session 82 = curriculum-team fill integration — single pass over full 208-entry worksheet (32 high-impact + 39 mid-tier + 137 long-tail) per D-C15 (mirroring heritage's Session 75/PR #491 cadence). Branch base = this closeout-backfill commit (downstream of `6b2fac2`). **The Stage 1 concepts content track is now substantively complete pre-curriculum-team-handoff — all 208 per-value entries across 3 tiers are pre-filled; verdict + curriculum_notes fields await the curriculum-team verdict pass.**
