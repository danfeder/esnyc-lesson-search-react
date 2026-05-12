# Stage 1 Concepts Worksheet — Execution Status

**Last updated:** 2026-05-12 — Session 78 scaffold creation (pre-PR; branch `docs/stage1-concepts-scaffold` off `main` at `db89798`). Worksheet scaffold landed at `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (525 lines: header sections §1–§10 + empty tier section skeletons §11/§12/§13 + Appendix A v3 baseline grouped by subject + A.7 cross-subject + A.8 theme-overlap cross-reference blocks). TEST DB probe (4 SQL probes via `mcp__supabase-test__execute_sql`) confirmed Session 77 numbers and added the per-concept frequency distribution needed for D-C14 calibration: at locked ≥10 / 3-9 / 1-2 cutoffs the tier counts are **32 / 39 / 137 = 208 ✓**. Long-tail at 137 is larger than the ~50-entry PR-review sweet spot — Session 79 weighs whether to split (singletons-only vs 1-and-2 → ~89/~48) or accept the larger PR since most long-tail verdicts are noise-drop. Mid-tier at 39 is on the smaller side; combining with high-impact rejected by D-C4 (per-tier decision character differs). Per-subject totals match Session 77 exactly: Science 92 / Social Studies 37 / Literacy/ELA 46 / Math 18 / Arts 20 / Health 3 = 216 (subject, concept) pairs across 208 distinct strings with 8 cross-subject overlaps. No per-value entries; no upfront Opus batch yet (Session 79 prep). Foundation-phase code track still has no unblocked next PR — PR 3b / 5 / 6 all gate on Stage 1 (now concepts) / Stage 2 outputs.

> **About this file.** Project-internal progress tracker for the Stage 1 concepts worksheet initiative. Peer to (not folded into) the heritage execution status doc at `2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md` and the foundation-phase status doc at `2026-05-03-metadata-rebuild-foundation-execution-status.md`. The foundation-phase status doc carries a one-line pointer here.
>
> **What lives here:** current state of the worksheet fill, locked design decisions and rationale (this session's `D-C1` through `D-C15`), session log, next-session pointer.
>
> **What does NOT live here:** the worksheet content itself (will live in `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md`, created Session 78); curriculum-team-facing methodology and conventions (will live in the worksheet header); the schema-simplification investigation reports that informed the structural decisions (live at `2026-05-12-academic-concepts-shape-investigation.md` and `2026-05-12-academic-concepts-shape-simplification-report.md`).

## Current state dashboard

| Area | Status | PR | Merge commit | Notes / next action |
|------|--------|-----|---------------|---------------------|
| Methodology design | ✅ Shipped | *Session 77 (this doc; no PR — methodology lands as the status doc itself)* | n/a | 15 locked decisions; TEST DB probes verified live state; schema-simplification investigation integrated; concept-first worksheet shape locked |
| Worksheet scaffold | 🔄 PR pending | TBD | TBD | Session 78 ✅ — `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` (525 lines) created with §1–§10 header sections + empty §11/§12/§13 tier skeletons + Appendix A v3 baseline. PR pending; moves to ✅ Shipped on closeout backfill. |
| High-impact tier (PR-Concepts-1) | ⏳ Pending | — | — | Session 79 — Claude pre-fill all high-impact entries (frequency ≥10 appearances; **probe-confirmed 32 entries** at Session 78 calibration). Upfront Opus batch runs before per-entry fill (per D-C13). |
| Mid-tier (PR-Concepts-2) | ⏳ Pending | — | — | Session 80 — Claude pre-fill mid-tier entries (frequency 3-9 appearances; **probe-confirmed 39 entries** at Session 78 calibration; smaller than D-C4 estimated 60-80 but kept separate per D-C4 decision-character rationale). |
| Long-tail (PR-Concepts-3) | ⏳ Pending | — | — | Session 81 — Claude pre-fill long-tail entries (frequency 1-2 appearances; **probe-confirmed 137 entries** at Session 78 calibration; larger than D-C4 estimated 100-120). Session 79 weighs splitting across two PRs (singletons-only ~89 vs 1-and-2 ~48) vs accepting the larger noise-drop-heavy PR. Most verdicts will be `drop` (noise singletons) or `merge`. |
| Curriculum-team fill integration | ⏳ Pending | — | — | Session 82 — single curriculum-team pass over full 208-entry worksheet; review depth varies by tier per D-C15. |
| Closeout / reconciliation | ⏳ Pending | — | — | Session 83+ — if curriculum-team fill needs reconciliation edits or any structural §16-equivalent post-pass. May not need its own PR if integration is clean. |

Audit signal register (Stage 2 corpus cleanup / reviewer-validation intake): peer file `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` to be created when the first concept-derived audit signal surfaces (probably Session 79+). Uses `CON-NN` prefix to distinguish from heritage's register prefixes (ASI / AME / AFR / EUR / ME / X).

## Next session contract

Fixed-shape orientation for the next session. Update at PR closeout (see PR closeout checklist below).

**Worksheet scaffold is in PR review (Session 78). Session 79 = upfront Opus batch (per D-C13) + high-impact tier per-value fills (PR-Concepts-1).**

The locked methodology decisions (D-C1 through D-C15 below) plus the Session 78 calibration data (32 high / 39 mid / 137 long-tail at the locked ≥10 / 3-9 / 1-2 cutoffs) drive Session 79's shape. Session 79 has two phases: (1) upfront Opus batch on ~60-90 highest-leverage concepts (all 8 cross-subject concepts, ~30-40 ambiguous near-duplicate clusters, ~10-15 sample singletons with vague names); (2) per-value entry fills for the 32 high-impact (≥10) entries in §11.

- **Session:** Stage 1 Session 79 — Upfront Opus batch + PR-Concepts-1 (high-impact tier per-value fills).
- **Branch base:** `main` at the Session 78 PR closeout commit (TBD on Session 78 PR merge; this will be the closeout-backfill commit downstream of the Session 78 PR squash).
- **Primary objective:** Run the upfront Opus batch FIRST (per D-C13 it runs *before* per-entry fill begins), then pre-fill all 32 high-impact tier entries in §11 of the worksheet. Each per-value entry uses the 10-field labeled-line shape locked in D-C7. Curriculum-team verdict fields (`verdict`, `curriculum_notes`) stay as `<to_fill>` per the worksheet's pre-handoff convention.
- **Opus batch composition (per D-C13):**
  - All 8 cross-subject concepts (biodiversity, companion planting, historical figures, nutrition education, observation, poetry, preservation, storytelling) — read sample lessons from each subject context to assess whether the cross-subject split is genuine-lens or tagging-artifact.
  - ~30-40 ambiguous near-duplicate clusters surfaced from the Session 78 probe data:
    - Plural/singular pairs: `adaptation`/`adaptations`/`plant adaptation`/`plant adaptations`; `seasonal change`/`seasonal changes`/`seasonal cycles`/`seasons`/`seasonality`; `harvest`/`harvesting`; `seeds`/`seed starting`/`seed dispersal`; `roots`/`root vegetables`
    - Name variants: `plant identification`/`identifying plants`/`plant ID`; `nutrition`/`nutrition education` (cross-subject); `social justice`/`social justice issues`; `food preservation`/`preservation` (cross-subject); `community`/`community systems`/`community building`/`community activism`
    - Subject-edge cases: `historical figures` vs `historical context` (Social Studies); `recipe reading`/`recipe writing`/`recipe selection`/`recipe scaling`; `writing`/`writing claims`/`narrative writing`/`descriptive writing`/`opinion writing`/`persuasive writing`/`argumentative writing`/`how-to writing`/`informational writing`/`comparative writing`/`creative writing`
  - ~10-15 sample singletons with vague names: `garden topics`, `general exploration`, `plant science`, `plant-based proteins`, `food processing`, `holidays`, `national and religious holidays`, `voting`, `song`, `coloring`, `craft activity`, `imaginary play`
  - Budget: target ~60-90 reads total at ~$0.50-$1.50 per read = ~$30-$135 total Opus cost. Trim list if budget pressure surfaces (cross-subject 8 + top-5 near-duplicate clusters are the load-bearing reads).
- **Per-value fill order (after batch lands):** highest-frequency first within §11, descending by frequency per D-C3. The 32 high-impact entries top-of-list: `plant parts` (239), `cultural traditions` (206), `nutrition education` (100/7 cross-subject), `visual arts` (76), `storytelling` (75/1 cross-subject), `ecosystems` (73, theme-overlap), `recipe reading` (69), `historical figures` (68/1 cross-subject), `measurement` (66), `vocabulary development` (59), `geography` (56), `decomposition` (47), `soil science` (44), `life cycles` (43), `plant needs` (41), `immigration stories` (34), `healthy choices` (30), `pollinators` (28), `counting` (20), `data collection` (19), `water cycles` (17), `trade routes` (16), `estimation` (15), `community systems` (15), `seeds` (13), `thermal energy` (12), `colonialism's impact` (12), `food webs` (11), `seasonality` (11), `sensory exploration` (11), `companion planting` (10/3 cross-subject), `seasonal changes` (10).
- **Tier-cutoff calibration call (per D-C14):** Session 78 confirmed 32 / 39 / 137 at the locked ≥10 / 3-9 / 1-2 cutoffs. Mid-tier 39 stays as-is (combining with high-impact rejected by D-C4). Long-tail 137 deserves a Session 79 weigh-in: split into singletons-only (~89) vs 1-and-2 (~48) for two PRs, OR accept the larger single noise-drop-heavy PR. Decide before opening PR-Concepts-3 (Session 81); doesn't block Session 79's high-impact fill.
- **Stop point:** All 32 high-impact entries pre-filled (verdict + curriculum_notes stay `<to_fill>`; everything else is Claude pre-population). Upfront Opus batch complete with `<details>` blocks integrated for the ~30-40 batch-targeted concepts that land in the high-impact tier. PR-Concepts-1 opened.
- **Expected files to touch:**
  - `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` — fill §11 with 32 per-value entries; integrate Opus `<details>` blocks where the batched read applies; possibly update §5 if Session 79 makes the long-tail-split call.
  - This file — dashboard row update for high-impact tier; Next session contract for Session 80; session log entry for Session 79.
  - Audit signal register (create when first signal surfaces — likely during Opus batch findings or per-entry fills): `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` with `CON-NN` prefix.
  - Foundation status doc — Last updated banner refresh + scaffold roll-up.
- **First task:** Branch off `main` at the Session 78 PR closeout commit. Run upfront Opus batch via Agent subagents (subagent_type Explore or general-purpose with model=opus per the Opus preference). Save batch output to a workspace file (e.g., `/tmp/concepts-opus-batch-session79.md`) for reference during per-entry fills. **Do not begin per-entry fills until batch is complete and reviewed.**
- **Must verify (this session):**
  - Each high-impact tier entry covers all 10 fields from D-C7; verdict + curriculum_notes are `<to_fill>` (not pre-filled).
  - Cross-subject concepts (8 of the 32 high-impact entries are cross-subject: nutrition education, storytelling, historical figures, companion planting are in the high-impact tier) surface `recommended_primary_subject` + `recommended_secondary_subjects` per D-C9.
  - The 1 theme-overlap concept in the high-impact tier (`ecosystems` 73, Science) flags `theme_overlap: YES` per D-C5.
  - Dual-frequency format (D-C11) applied to any merge-candidate entries in the high-impact tier (likely few since high-impact concepts are usually canonical, not near-duplicate; but check `seasonal changes` 10 vs `seasonal change` 2 + `seasonal cycles` 6 + `seasons` 2 cluster as it spans high-impact and mid-tier).
- **Do not do:**
  - Skip the upfront Opus batch (per D-C13 it's load-bearing for Session 79's verdict-readiness).
  - Touch the heritage worksheet, its status doc, or the foundation design doc beyond Last-updated-banner refresh.
  - Fill mid-tier (§12) or long-tail (§13) — those are Sessions 80 / 81.
  - Approve PROD migrations / deploys (N/A — docs-only).
  - Pre-fill `verdict` or `curriculum_notes` — those are curriculum-team fields per D-C7 + pre-handoff convention.

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

**Next:** Session 79 = upfront Opus batch (per D-C13) + PR-Concepts-1 high-impact tier per-value fills (32 entries in §11).
