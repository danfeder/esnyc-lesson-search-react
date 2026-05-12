# Stage 1 Concepts Worksheet — Execution Status

**Last updated:** 2026-05-12 — Session 77 methodology-design (pre-scaffold; user-locked Session 76 closeout). No code/worksheet artifact created this session; 15 design decisions locked as `D-C1` through `D-C15` covering structural shape, per-entry shape, and methodology. TEST DB probes verified design-doc claims (~211 / 6 subjects → actual 208 distinct strings, 216 (subject, concept) pairs, 6 subjects with skewed distribution Science 92 / ELA 46 / SS 37 / Arts 20 / Math 18 / Health 3). Schema-simplification investigation via parallel-subagent research found subject grouping is UI-orphaned (no live consumer reads subject keys); decision was made NOT to migrate schema before worksheet (D-C2) but to restructure the worksheet itself as concept-first rather than subject-first (D-C1) to avoid hardening v3 subject artifacts into canonical structure. Stage 1 concepts is the inherent next worksheet per foundation design doc sequence (heritage → concepts → ~8 smaller fields) and gates PR 5 (D4 canonicalization migration) + PR 6 (Stage 2 re-tag prompt closed-vocab constraint).

> **About this file.** Project-internal progress tracker for the Stage 1 concepts worksheet initiative. Peer to (not folded into) the heritage execution status doc at `2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md` and the foundation-phase status doc at `2026-05-03-metadata-rebuild-foundation-execution-status.md`. The foundation-phase status doc carries a one-line pointer here.
>
> **What lives here:** current state of the worksheet fill, locked design decisions and rationale (this session's `D-C1` through `D-C15`), session log, next-session pointer.
>
> **What does NOT live here:** the worksheet content itself (will live in `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md`, created Session 78); curriculum-team-facing methodology and conventions (will live in the worksheet header); the schema-simplification investigation reports that informed the structural decisions (live at `2026-05-12-academic-concepts-shape-investigation.md` and `2026-05-12-academic-concepts-shape-simplification-report.md`).

## Current state dashboard

| Area | Status | PR | Merge commit | Notes / next action |
|------|--------|-----|---------------|---------------------|
| Methodology design | ✅ Shipped | *Session 77 (this doc; no PR — methodology lands as the status doc itself)* | n/a | 15 locked decisions; TEST DB probes verified live state; schema-simplification investigation integrated; concept-first worksheet shape locked |
| Worksheet scaffold | ⏳ Pending | — | — | Session 78 — create `2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` with header sections (purpose, methodology, hierarchy rules, verdict vocab, per-entry shape, frequency-tier section structure, parsing convention). No per-value entries yet. |
| High-impact tier (PR-Concepts-1) | ⏳ Pending | — | — | Session 79 — Claude pre-fill all high-impact entries (frequency ≥ 10 appearances; estimated ~30-50 entries). Upfront Opus batch runs before this session. |
| Mid-tier (PR-Concepts-2) | ⏳ Pending | — | — | Session 80 — Claude pre-fill mid-tier entries (frequency 3-9 appearances; estimated ~60-80 entries). |
| Long-tail (PR-Concepts-3) | ⏳ Pending | — | — | Session 81 — Claude pre-fill long-tail entries (frequency 1-2 appearances; estimated ~100-120 entries). Most verdicts will be `drop` (noise singletons) or `merge`. |
| Curriculum-team fill integration | ⏳ Pending | — | — | Session 82 — single curriculum-team pass over full 208-entry worksheet; review depth varies by tier per D-C15. |
| Closeout / reconciliation | ⏳ Pending | — | — | Session 83+ — if curriculum-team fill needs reconciliation edits or any structural §16-equivalent post-pass. May not need its own PR if integration is clean. |

Audit signal register (Stage 2 corpus cleanup / reviewer-validation intake): peer file `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md` to be created when the first concept-derived audit signal surfaces (probably Session 79+). Uses `CON-NN` prefix to distinguish from heritage's register prefixes (ASI / AME / AFR / EUR / ME / X).

## Next session contract

Fixed-shape orientation for the next session. Update at PR closeout (see PR closeout checklist below).

**Stage 1 concepts methodology is locked. Session 78 = worksheet scaffold creation.**

The locked methodology decisions (D-C1 through D-C15 below) drive the scaffold shape. Session 78 creates the worksheet file with header sections + the 3 frequency-tier section skeletons; no per-value entries yet.

- **Session:** Stage 1 Session 78 — Concepts worksheet scaffold creation.
- **Branch base:** `main` at the Session 77 closeout commit (this session's docs commit; downstream of PR #492 squash `e5f4257`).
- **Primary objective:** Create the worksheet scaffold per locked methodology. Write only header sections (no per-value entries). Header sections to cover:
  - §1 Purpose — what this worksheet is for; curriculum-team-facing.
  - §2 Methodology — concept-first shape; flat list ordered by frequency descending; subjects as evidence columns; 3 frequency-tier sections.
  - §3 Verdict vocabulary — `keep / merge / new / drop / <to_fill>` with definitions and examples (per D-C8).
  - §4 Per-entry shape — the 10-field labeled-line shape (per D-C7); parsing convention.
  - §5 Frequency-tier section structure — explain the 3 tiers; exact cutoff numbers TBD at PR-1 fill time (per D-C14).
  - §6 Theme overlap convention — flag at entry level per D-C5; 3 known cases (`ecosystems`, `food systems`, `plant growth`).
  - §7 Merge_aliases convention — pre-merge per-subject distribution in `current_subjects`; post-merge total in `frequency` (per D-C11).
  - §8 Cross-subject convention — `recommended_primary_subject` (single) + `recommended_secondary_subjects` (multi); the 8 known cross-subject concepts noted as candidates.
  - §9 Curriculum-team review depth — explicit framing per D-C15 that review depth can vary by tier.
  - §10 Parsing convention — labeled-line shape, identity invariant, alias_map semantics (carry forward heritage's §7 convention adapted).
  - Section skeletons for the 3 frequency tiers (`§11 High-impact tier`, `§12 Mid-tier`, `§13 Long-tail`) with empty entry slots.
  - Appendix A — v3 baseline vocabulary embedded as reference (the 208-string canonical list grouped by current subject).
- **Stop point:** Header sections complete + appendix A populated + empty tier section skeletons in place. No per-value entries. No upfront Opus batch yet (that's Session 79 prep).
- **Expected files to touch:**
  - New: `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md`.
  - This file — update dashboard row for Worksheet scaffold → ✅ Shipped; update Next session contract for Session 79.
  - Heritage exec status doc — no changes needed (one-line cross-reference already in place from this session).
  - Foundation status doc — Last updated banner refresh.
- **First task:** Run a TEST DB probe to enumerate the actual frequency distribution across all 208 distinct concept strings (this confirms the tier cutoff numbers for D-C14 calibration). Output: a `(concept, subject, appearances)` list sortable by appearances. Then start writing header sections per the outline above.
- **Must verify (this session):**
  - Tier cutoff numbers produce roughly 50-entry PR sizes (calibrating D-C14's 10+ / 3-9 / 1-2 against actual distribution).
  - Worksheet header sections cover all 10 locked design decisions visible to the curriculum team (D-C1, D-C3, D-C4, D-C5, D-C7, D-C8, D-C11, D-C12, D-C14, D-C15 are curriculum-facing; the others are project-internal).
  - Appendix A's v3 baseline is grouped by current subject (matching the existing data shape) for traceability, even though the worksheet structure is concept-first.
- **Do not do:**
  - Open per-value entries (premature; that's Session 79+ after upfront Opus batch).
  - Skip the TEST DB probe — the tier cutoff numbers need to be verified against current state, not assumed from Session 77's probes (which counted strings but didn't compute per-string frequency distribution for calibration).
  - Touch the heritage worksheet or its status doc beyond verification that the cross-reference pointer is intact.
  - Approve PROD migrations / deploys (N/A — docs-only).
  - Begin the upfront Opus batch (that's Session 79 prep; the batch runs *before* Session 79's per-entry fill begins).

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
The 3 string-identical concept↔theme overlaps (`ecosystems`, `food systems`, `plant growth`) get a `theme_overlap: YES` flag on the affected per-value entries. Adjudication (which side keeps it; whether both keep with cross-reference) is deferred to the themes worksheet / D4 canonicalization migration.

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
   - 3 concept↔theme string-identical overlaps: `ecosystems`, `food systems`, `plant growth`.
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
