# Stage 1 Heritage Worksheet — Execution Status

**Last updated:** 2026-05-11 — Session 72 §9.1 cross-cluster diaspora & indigenous identities per-value entries populated. Branch `docs/stage1-heritage-cross-cluster-and-end-summary` off `main` at `4b34aa0` (Session 71 PR #488 closeout-backfill). Worksheet §9.1 has all 13 per-value entries: 1 cluster root NEW + 4 substantive canonical values with corpus (African American 24, African American diaspora 2, Indigenous 24, Native American 5) + 2 v3-canonical single-row variants (Indigenous/Native American 1, Indigenous Peoples 1) + 2 specific tribal-nation canonicals (Lenape 7 keep, Haudenosaunee 3 NEW) + 4 v3-baseline-corpus-absent placeholders (Soul Food 0, Three Sisters traditions 0, Black culinary history 0, Cajun/Creole 0). 2 substantive Opus corpus-read `<details>` blocks integrated (§9.1.2 African American 26-lesson cohort + §9.1.4 Indigenous 31-distinct-lesson cohort spanning 6 canonical-value surface labels). 9 new cross-cluster `X-NN` audit signals appended (X-01 through X-09) — first cross-cluster signals in the register; total open audit signals now 50 (4 ASI + 6 AME + 8 AFR + 14 EUR + 9 ME + 9 X). §9.2 multi-parent table unchanged (5/5 complete from Session 70). §9.3 + §9.4 cross-cluster housekeeping unchanged (no exceptions surfaced). §16 end-summary canonical-vocab table deferred to Session 74 per kickoff-prompt allowance ("Acceptable to ship §9.1 + §16 as 2 separate PRs if needed"). Session 73 = PR review cycle next.

> **About this file.** Project-internal progress tracker for the Stage 1 heritage worksheet initiative. Peer to (not folded into) the foundation-phase status doc at `2026-05-03-metadata-rebuild-foundation-execution-status.md`. The foundation-phase status doc carries a one-line pointer here.
>
> **What lives here:** current state of the worksheet fill, locked design decisions and rationale, session log, next-session pointer.
>
> **What does NOT live here:** the worksheet content itself (lives in `2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md`); methodology and conventions intended for curriculum-team handoff (live in the worksheet header).

## Current state dashboard

| Area | Status | PR | Merge commit | Notes / next action |
|------|--------|-----|---------------|---------------------|
| Scaffold / §1-§10 | ✅ Shipped | #481 | `e05556a` | Header sections + cluster framing blocks + cross-cluster stubs + cluster template + end-summary table; v3 baseline as Appendix A |
| Asian §11 | ✅ Shipped | #482 | `d58eb59` | 18 entries (1 root + 4 sub-regions + 10 country-specifics + 3 kebab-case drift); 7 Opus corpus-read `<details>` blocks integrated |
| Americas §12 | ✅ Shipped | #483 | `fc45a96` | 22 entries (1 root + 3 sub-regions + 10 country-specifics + 3 NEW sub-region candidates + 1 v3-corpus-absent + 4 drift); 6 Opus corpus-read `<details>` blocks integrated |
| African §13 | ✅ Shipped | #484 | `7894a47` | 10 entries (1 root + 3 sub-regions + 5 country-specifics + 1 drift); §9.2 Egyptian + Moroccan multi-parent resolved to North African primary; 2 Opus corpus-read `<details>` blocks integrated |
| European §14 | ✅ Shipped | #487 | `f429fb0` | 14 entries (1 root + 2 sub-regions + 5 country-specifics with corpus + 2 v3-corpus-absent + 1 NEW + 3 drift); §9.2 Spanish multi-parent resolved to Mediterranean primary (European cluster) with Latin American flagged; 3 Opus corpus-read `<details>` blocks integrated (European, Mediterranean, Italian); 14 EUR-NN audit signals appended |
| Middle Eastern §15 | ✅ Shipped | #488 | `76d5369` | 11 entries (1 root Middle Eastern 23 + 1 sub-region Levantine 14 + 4 country-specifics with corpus [Yemeni 3 NEW, Persian 1 NEW + multi-parent, Palestinian 1, Israeli 1 + multi-parent] + 3 v3-corpus-absent under Levantine [Lebanese, Syrian, Jordanian] + 2 kebab-case drift); §9.2 Persian + Israeli multi-parent resolved (Middle Eastern primary; Central Asian + Mediterranean flagged); 2 Opus corpus-read `<details>` blocks integrated (Middle Eastern + Levantine — Levantine 100% Middle Eastern pairing is cleanest sub-region in worksheet); 9 ME-NN audit signals appended; ME-01 ↔ AFR-05 bidirectional cross-cluster cross-reference (round-2 fix-up) + ME-09 Jordanian evidentiary asymmetry callout |
| Cross-cluster §9 (§9.1) | 🚧 PR review | #489 | TBD | 13 per-value entries: 1 cluster root NEW + African American 24 + African American diaspora 2 + Indigenous 24 + Native American 5 + Indigenous/Native American 1 + Indigenous Peoples 1 + Lenape 7 + Haudenosaunee 3 NEW + 4 v3-corpus-absent (Soul Food, Three Sisters traditions, Black culinary history, Cajun/Creole); 2 Opus corpus-read `<details>` blocks (African American + Indigenous); 9 new cross-cluster X-NN audit signals (X-01 through X-09); §9.2 multi-parent table unchanged (5/5 complete from Session 70); §9.3 + §9.4 housekeeping unchanged |
| End summary §16 | TBD | TBD (Session 74) | TBD | Populates mechanically from filled per-value entries (88 total rows across §11-§15 + §9.1); deferred to Session 74 per kickoff-prompt allowance for splitting §9.1 + §16 into 2 PRs |

Audit signal register (Stage 2 corpus cleanup / reviewer-validation intake): `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md`. Carries the audit signals surfaced during Stage 1 per-value fills (~50 open as of 2026-05-11 post-Session-72: 4 ASI + 6 AME + 8 AFR + 14 EUR + 9 ME + 9 X) — covers re-tag actions, body-content review, and reviewer-led judgment calls. Append new signals there; do not duplicate into per-cluster status-doc narrative.

## Next session contract

Fixed-shape orientation for the next session. Update at PR closeout (see PR closeout checklist below).

- **Session:** Stage 1 Session 73 — PR review cycle for the Session 72 §9.1 PR (mirrors Sessions 63 / 65 / 67 / 69 / 71 PR-review-cycle precedents)
- **Branch base:** `docs/stage1-heritage-cross-cluster-and-end-summary` (continued from Session 72; not yet squash-merged at session start). PR #489 OPEN.
- **Primary objective:** Triage bot review findings on the Session 72 PR (Claude auto-bot + Codex manual + optionally Hermes manual). Apply round-1 + round-2 fix-ups as needed. Reach squash-merge. After Session 73 merges, Session 74 picks up §16 end-summary canonical-vocab table.
- **Stop point:** PR squash-merged OR session boundary if round-3 still pending. If user authorizes direct-to-main closeout backfill per Sessions 67 + 68/PR #485 + 69 + 71 precedent (now-durable pattern past 4-occurrence promotion threshold), Session 73 closeout backfill lands directly on main.
- **Expected files to touch:**
  - Worksheet + status doc + audit register only if round-1 / round-2 fix-ups land
  - `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md` — at PR closeout: dashboard row (Cross-cluster §9 → ✅ Shipped + PR# + merge commit); Next session contract for Session 74 (§16 end-summary canonical-vocab table); Session 73 log entry; PR closeout checklist marks
  - `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md` — Current State pointer + PRs-SHIPPED list addition + Branches block; Session 73 log entry
- **First task:** Read `gh pr view <PR>` for review state; collect findings from all 4 PR surfaces (issue comments, formal reviews, inline comments, checks); triage with evidence. **Note:** all four PR comment surfaces must be queried per `feedback_pr_comment_surfaces.md` precedent.
- **Must verify:**
  - Pre-push code-reviewer agent dispatched on the substantive worksheet diff at session 72 end (13th Stage 1 catch-streak watch — Sessions 60-66 + 68 + 69 ×2 + 70 + 71 ×2 = 12 consecutive substantive catches; round-1 + round-2 of Session 71 both default-rejected reviewer findings with rebuttal, but the streak's measure is dispatch + finding-surfacing not accept/reject ratio)
  - Findings triaged with evidence; accept/reject recommendations surfaced before applying non-trivial changes
  - Round-cap rule applies: after 2 bot-review rounds, only critical fixes go in round 3; default-reject the rest
  - Docs-only constraint maintained throughout (no source / migrations / package / Supabase / test file edits)
  - All accepted findings applied as consolidated fix-up commits (do NOT amend pushed commits)
  - For PR closeout backfill: confirm dashboard / Branches / Next-session-contract updates land in main if user authorizes direct-to-main (now-durable pattern; 5th occurrence)
- **Do not do:**
  - Touch source code, migrations, package files, Supabase files, or tests
  - Pre-emptively decide curriculum-team handoff scope or process — that's a separate session conversation after Stage 1 worksheet substantively completes (after Session 74 §16 lands)
  - Approve PROD migrations / deploys (N/A — docs-only PR, but explicit reminder)
  - Apply round-2 fix-ups without round-2 bot review unless user explicitly authorizes
  - Draft §16 end-summary in the Session 73 PR — that's Session 74 scope

## PR closeout checklist

Reusable per-PR ritual for Stage 1 docs PRs. Tick each box as part of the merge cycle so the dashboard, contract, and pointer surfaces stay in sync with `main`.

- [ ] Record PR number and squash commit in the dashboard row for the shipped cluster *(Session 72 PR #489 — opened 2026-05-11 22:05 UTC; awaits squash commit at merge)*
- [ ] Update Current state dashboard row (status `✅ Shipped`, PR number, merge commit, notes summary)
- [ ] Update `Last updated` line in this doc
- [ ] Update foundation status doc pointer (Current State header + PRs-SHIPPED list)
- [ ] Update Branches block in foundation status doc (move branch from "Active" to traceability list)
- [ ] Update Next session contract for the next cluster (session number, branch base, primary objective, expected files, first task, must verify, do not do) *(Session 74 §16 end-summary canonical-vocab table)*
- [ ] For status-tracking / hygiene PRs, update the Next session contract branch base to this PR's squash commit after merge *(N/A — content PR, not hygiene)*
- [x] Append new audit signals to `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md` *(9 X-NN entries appended in Session 72: X-01 through X-09 — first cross-cluster signals in the register)*
- [ ] Search for stale strings and replace:
  - `squash-merge pending`
  - `PR #NNN OPEN` for the just-merged PR
  - `TBD until merge` for the just-merged PR
  - the previous active branch name
- [x] Confirm no code / migration / package / Supabase / test files changed in the closing PR *(docs-only diff confirmed at Session 72 end via `git diff --name-only origin/main...HEAD | grep -Ev '^docs/'`)*

## Source-of-truth rules

The Stage 1 work is split across multiple files; this block names which surface owns which fact.

- **Worksheet** (`2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md`): curriculum-facing metadata decisions — verdicts, parent recommendations, canonical keys, aliases, corpus evidence, audit signals visible to handoff. The deliverable for curriculum-team review.
- **Stage 1 execution status doc** (this file): current progress (dashboard), next-session contract, locked project-internal design decisions (Session 59), session log, audit-register pointer.
- **Foundation status doc** (`2026-05-03-metadata-rebuild-foundation-execution-status.md`): summarizes Stage 1 + carries one-line pointer here. Does NOT carry Stage 1 narrative or per-cluster detail beyond what fits in the Current State header + PRs-SHIPPED list.
- **Audit signal register** (`2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md`): open audit signals queued for Stage 2 corpus cleanup / reviewer validation (re-tag, body-content review, reviewer-led judgment calls). Append-only during Stage 1; signals resolve in Stage 2.
- **TEST DB facts** (corpus counts, value distributions, tag pairing rates): verify via an approved read-only TEST DB access path before making new claims. Use the configured Supabase TEST read-only MCP where available, or the project-approved read-only SQL wrapper where configured. Do not cite agent recall or stale prior queries for new claims.
- **Agent / private memory:** may guide workflow but must not be cited as repo-facing evidence in worksheet content. Cite a TEST DB query, corpus excerpt, or prior shipped PR's content instead. (See Session 67 round-1 fix-up precedent — bots converged on this finding.)
- **PR comments**: review evidence, not durable source of truth unless copied into worksheet or status doc.

## Current state

**Cross-cluster §9.1 Diaspora & Indigenous Identities ✅ Session 72 (2026-05-11). Branch `docs/stage1-heritage-cross-cluster-and-end-summary` off `main` at `4b34aa0` (Session 71 PR #488 closeout-backfill commit; pre-push agent caught 2 P2 + 1 P3 + fix-up `84201aa`; PR #489 OPEN).** Worksheet §9.1 has all 13 per-value entries populated: **9.1.1** Diaspora & Indigenous (cluster root — NEW canonical, 57 distinct aggregate child-value lessons) + **9.1.2** African American (24, with `<details>` corpus-evidence block) + **9.1.3** African American diaspora (2, both problem rows — AFR-06 + X-05) + **9.1.4** Indigenous (24, with `<details>` corpus-evidence block) + **9.1.5** Native American (5, merge candidate per Decision 3) + **9.1.6** Indigenous/Native American (1, v3 canonical ghost row per X-08) + **9.1.7** Indigenous Peoples (1, merge into Indigenous) + **9.1.8** Lenape (7, keep + parent question Decision 4) + **9.1.9** Haudenosaunee (3, NEW canonical + parent question Decision 4) + **9.1.10** Soul Food (0, v3-corpus-absent per §12.18 Dominican precedent) + **9.1.11** Three Sisters traditions (0, v3-corpus-absent + X-09 cross-canonical-theme reframe) + **9.1.12** Black culinary history (0, v3-corpus-absent + likely-redundant-with-AA observation) + **9.1.13** Cajun/Creole (0, v3-corpus-absent + cross-ref §12.17 Southern United States NEW candidate). 2 substantive Opus corpus-read `<details>` blocks integrated (§9.1.2 African American 26-lesson cohort + §9.1.4 Indigenous 31-distinct-lesson cohort spanning 6 canonical-value surface labels — `Indigenous` 24 + `Native American` 5 + `Indigenous/Native American` 1 + `Indigenous Peoples` 1 + `Lenape` 7 + `Haudenosaunee` 3); the remaining 11 entries are structural per §4 methodology with direct SQL inspection of representative bodies. §9.2 multi-parent table unchanged (5/5 complete from Session 70). §9.3 + §9.4 cross-cluster housekeeping unchanged (no exceptions surfaced; §9.1 per-value entries follow §6 conventions with documented rationales). **9 cross-cluster `X-NN` audit signals appended to register (X-01 through X-09 — first cross-cluster signals in the register):** X-01 berbere `East African` omission on BHM lesson; X-02 4 Cajun BEP Slider rows uniformly omit `North American`; X-03 AA-cohort continental-`African` parent split (15 carry, 9 omit — convention question); X-04 `African American diaspora` v3-canonical functionally vacant; X-05 Soul Food Sunday template-stub published row; X-06 The Lenape Farmers and Skits missing `Lenape` tag; X-07 cross-cluster Indigenous-without-North-American routing (5 lessons via Latin American); X-08 `Indigenous/Native American` v3-canonical propagated to only 1 row; X-09 Three Sisters as cross-canonical-value theme rather than v3-baseline single-parent child. Cluster total open audit signals now 50 (4 ASI + 6 AME + 8 AFR + 14 EUR + 9 ME + 9 X). **§9.1 framing decisions surface but defer to curriculum-team verdicts (5 questions):** Decision 1 (cluster naming — single root `Diaspora & Indigenous` recommended pre-handoff vs split `Diaspora` + `Indigenous`); Decision 2 (`African American` vs `African American diaspora` surface label — empirically settled toward `African American` per X-04 + X-05); Decision 3 (`Indigenous` vs `Native American` vs `Indigenous/Native American` surface label — corpus-prevalence settles toward `Indigenous`); Decision 4 (Lenape + Haudenosaunee tier + parent — `Eastern Woodlands` NEW sub-region intermediate candidate); Decision 5 (v3-corpus-absent placeholder verdicts for Soul Food, Three Sisters traditions, Black culinary history, Cajun/Creole — Three Sisters is the X-09 reshape candidate). Pre-push code-reviewer agent caught 2 P2 + 1 P3 internal-consistency findings; all 3 accepted + fix-up'd in commit `84201aa` (thirteenth consecutive Stage 1 catch). **All 5 regional clusters (§11-§15) + cross-cluster §9.1 now ✅ have per-value entries populated.** §16 end-summary canonical-vocab table deferred to Session 74 per kickoff-prompt allowance ("Acceptable to ship §9.1 + §16 as 2 separate PRs if needed"). See Stage 1 dashboard above for per-cluster PR + merge commit traceability; see PRs-SHIPPED list in foundation status doc for full per-cluster decisions roll-up.

**What's done:**

- §11 Asian cluster: 18 per-value entries ✅
- §12 Americas cluster: 22 per-value entries ✅
- §13 African cluster: 10 per-value entries ✅
- §14 European cluster: 14 per-value entries ✅
- §15 Middle Eastern cluster: 11 per-value entries ✅
- §9.1 cross-cluster Diaspora & Indigenous Identities: 13 per-value entries ✅ (Session 72)
- §9.2 multi-parent table: Egyptian + Moroccan + Spanish + Persian + Israeli rows resolved from TBD to recommended primary parents ✅ (5/5 multi-parent canonicals complete)
- §9.3 + §9.4 cross-cluster housekeeping ✅ (no exceptions surfaced; per-value entries follow §6 conventions)
- Cluster framing blocks for all 5 regional clusters + cross-cluster (Session 60 scaffold) ✅
- Header sections (purpose / methodology / hierarchy rules / verdict vocab / per-entry shape / cluster framing pattern / filter-UI tier conventions / parsing convention / Appendix A v3 baseline) ✅

**What's NOT done:**

- §16 end-summary canonical-vocab table: populates mechanically from filled entries; ~88 rows across §11-§15 + §9.1. Deferred to Session 74 per kickoff-prompt allowance.
- Cluster decision summary blocks: always TBD (curriculum team writes at handoff).

**For next session (Stage 1 Session 73 = PR review cycle for Session 72 §9.1 PR):**

See `## Next session contract` block at top of doc for the authoritative summary. Branch `docs/stage1-heritage-cross-cluster-and-end-summary` (continued from Session 72; not yet squash-merged at session start). Primary objective = triage bot review findings on the Session 72 PR (Claude auto-bot + Codex manual + optionally Hermes manual), apply round-1 + round-2 fix-ups as needed, reach squash-merge. After Session 73 merges, Session 74 picks up §16 end-summary canonical-vocab table; after Session 74 ships, the next major Stage 1 milestone is curriculum-team handoff (worksheet substantively complete, awaits external review).

**Stop-point heuristic confirmed Sessions 62 + 64 + 66 + 68 + 70 + 72:** one cluster (or cross-cluster) per session is the right scope. Asian (18 entries, 7 Opus reads) + Americas (22 entries, 6 Opus reads) + African (10 entries, 2 Opus reads) + European (14 entries, 3 Opus reads) + Middle Eastern (11 entries, 2 Opus reads — smallest regional cluster root by lesson count) + Cross-cluster §9.1 (13 entries, 2 Opus reads — 57 distinct aggregate lessons split across AA cohort 26 + Indigenous cohort 31) each fit the session boundary cleanly. §9.1 is the third-smallest fill by entry count (vs Middle Eastern 11 / African 10) but second-largest by aggregate lesson coverage (vs Asian 63 / Americas 170 / European 53 / African 41 / Middle Eastern 23) — the cross-cluster nature spans canopy across all 5 regional clusters' geographic territories without owning any single one.

## Locked design decisions

These are the 4 decisions resolved through Session 59's corpus-evidence-driven walk-through, plus the meta-decision about scaffold pattern. Curriculum-team-facing rationale lives in the worksheet header (§2 hierarchy rules, §3 verdict vocab, §5 cluster framing pattern); project-internal rationale and tradeoffs live here.

### Decision 1: Hierarchy depth = 2-level-flexible parent chains

**The call.** Each cluster can land at depth 1, 2, or 3 per its corpus shape. Parent fields reference any other canonical key.

**Why (project-internal).** Session 59 corpus query (`mcp__supabase-test__execute_sql` against `lessons.metadata.culturalHeritage`) returned 76 distinct values. Full canonical v3 coverage plus 13 kebab-case slug drift variants plus ~30 country-specifics with substantial usage NOT in canonical, plus ~6 diaspora/indigenous identities that don't fit region→sub-region→country shape, plus ~4 new mid-level sub-region candidates. Pre-locking 1-level forced "merge upward" by omission and lost corpus signal (e.g., Mexican 38 deserves a canonical home, not just `Latin American`). Pre-locking 3-level forced sub-regions where the cluster shape didn't call for them (e.g., Middle Eastern has only Levantine as a meaningful sub-region; forcing 3-level structure across the cluster doesn't add information).

**Tradeoff.** Non-uniform depth across the worksheet makes the canonical store slightly more complex to validate (CHECK constraint or trigger needs to allow any-depth parent chains rather than a fixed depth). The cost is one-time-implementation; the benefit is corpus-shape-fit canonical vocabulary that doesn't fight the data.

**Worksheet implication.** Each cluster's framing block surfaces the depth call as a `Cluster decisions to surface` item. Curriculum team can override the depth per cluster.

### Decision 2: Hierarchy artifact UI = full tree

**The call.** The companion artifact UI (a future bespoke tool, built when the worksheet has populated per-value entries) renders the hierarchy as a full tree — cluster-as-root nodes, expand/collapse, status badges per node (verdict + corpus frequency), drag-drop or field-edit reparenting.

**Why (project-internal).** Session 59 initial recommendation was cluster-grouped flat for build-cost reasons. User pushed back: "only reason against full tree is tech complexity?" Honest reckoning: 4-5 of the 7 stated reasons were the same tech-cost critique restated; only 2 were genuinely non-cost (and both weak). For a ~78-entry hierarchy work where cluster-shape decisions are the harder part of the curriculum team's job, tree affordances earn the build cost. Curriculum team's mental model is hierarchical; UI should match.

**Tradeoff.** Tree UI is more build-cost than a cluster-grouped flat artifact. The cost is in the artifact-build step (separate from the worksheet itself); not load-bearing for the worksheet's correctness. Worth tracking when the artifact gets built whether the tree affordances actually paid off.

**Worksheet implication.** Worksheet shape is unchanged by this decision — it's the artifact UI that consumes the worksheet, not the other way around. But the live-canonical-preview decision (Decision 4 below) builds on this: the tree-filter mode toggle is a natural extension of full tree rendering.

### Decision 3: Cluster-level decisions pattern = C — narrative framing + per-value SoT + cluster prose blocks + cross-cluster section

**The call.** Cluster intro framing = corpus distribution + decisions to surface (reference data). Per-value entries = source of truth for vocabulary changes (mechanical, parsed). Cluster decision summary block = freeform prose for the WHY (rationale record). Top-level cross-cluster section = diaspora handling, multi-parent values, filter-UI tier conventions.

**Why (project-internal).** WHAT and WHY want different homes. Vocabulary changes are structured data downstream consumers (D4 migration, Stage 2 LLM prompts) read mechanically — they live in parser-friendly labeled-line per-value entries. Cluster-level reasoning is narrative humans read when revisiting decisions or onboarding to the corpus — it lives in prose blocks that don't get parsed.

**Tradeoff.** Two writing modes per cluster (structured labeled-line + freeform prose) ask more of the curriculum team than a uniform shape. The mitigation: per-value entry shape is mechanical / quick once the verdict is decided; the prose blocks are where the thinking happens, and the worksheet should make space for thinking.

**Worksheet implication.** Each cluster section has three parts (framing, per-value, decision summary). Cross-cluster section is its own top-level §9.

### Decision 4: Live canonical-preview = B2 tree-filter mode toggle

**The call.** The companion artifact UI offers a toggle: `Show all entries` ↔ `Show locked vocabulary only`. The latter filters the tree to only entries with `verdict: keep` or `verdict: new`. Orphan-detection (a `merge` entry whose `merge_into` target hasn't been confirmed) and empty-subtree warnings derive mechanically from the filtered tree.

**Why (project-internal).** Heritage worksheet IS defining the vocabulary (unlike activity-type-v2 worksheet where vocab was already locked). Cumulative output is itself the deliverable — curriculum team needs feedback on cumulative shape during filling, not just end-of-doc. A side panel showing the locked vocab would be redundant; reusing the tree rendering with a filter is cheaper.

**Tradeoff.** Toggle complexity in the artifact UI. The cost is in the artifact-build step. Worth it because curriculum-team workflow benefits from seeing the canonical-vocab-so-far emerge while making per-value calls.

**Worksheet implication.** Same as Decision 2 — affects the artifact, not the worksheet structure. But worth recording here as a load-bearing user-experience commitment for when the artifact gets built.

### Meta-decision: 2-file scaffold pattern (not 4-file `/kickoff-feature`)

**The call.** Stage 1 heritage uses a 2-file pattern (worksheet + execution status doc), not the 4-file `/kickoff-feature` scaffold (design + implementation plan + kickoff prompt + status doc) the foundation-phase code track uses.

**Why (project-internal).** The 4-file pattern earns its keep for **code-shaping** multi-session work: design doc + implementation plan are distinct because design is "what we're doing and why" while implementation plan is "files and code snippets and commit sequences." Kickoff prompt is a session-paste enforcing the per-PR ritual.

Stage 1 is **content-shaping**: there's no implementation plan with file paths and code snippets (the worksheet IS the deliverable); there's no per-PR ritual (the worksheet doesn't get pushed in stages); there's no test-driven loop. Compressing to 2 files (worksheet doubles as design doc via its header; status doc as me-and-user-only progress tracker) cuts redundancy. The header of the worksheet is curriculum-team-facing design doc; this file is project-internal progress + rationale.

**When to revisit.** If a future content-shaping initiative (concepts worksheet round, ~8 smaller-field worksheets) follows this 2-file pattern successfully, it's worth promoting to a `feedback_*.md` rule. Until then, single-occurrence call.

## Session log

### Session 72 — 2026-05-11 — §9.1 cross-cluster Diaspora & Indigenous Identities per-value entries populated

**Branch:** `docs/stage1-heritage-cross-cluster-and-end-summary` (off `main` at `4b34aa0` — the Session 71 PR #488 closeout-backfill commit, downstream of PR #488 squash `76d5369`; matches contract's literal branch base since Session 71 closeout-backfill was direct-to-main per the now-durable pattern).

**Done:**

- Verified §9.1 corpus distribution against TEST DB via `mcp__supabase-test__execute_sql`. Comprehensive distinct-`culturalHeritage`-values query returned all 8 §9.1 corpus-present values with exact counts matching the Session 60 scaffold's §9.1 framing-block listings: `African American` 24, `African American diaspora` 2, `Indigenous` 24, `Native American` 5, `Indigenous/Native American` 1 (v3-canonical), `Indigenous Peoples` 1, `Lenape` 7, `Haudenosaunee` 3. Confirmed v3-baseline-corpus-absent values (`Soul Food`, `Three Sisters traditions`, `Black culinary history`, `Cajun/Creole`) are all genuinely 0 in active corpus. Confirmed AME-01 pairing rates exactly: AA 16/24 = 67% NA-paired, Indigenous 19/24 = 79%, Lenape 3/7 = 43%, Native American 3/5 = 60%; Haudenosaunee 3/3 = 100% (new datapoint complementing AME-01's original framing). Adjacent-diaspora scan returned EMPTY — no `Asian American` / `Mexican American` / `X American` diaspora values in active corpus beyond the 8 listed.
- Populated worksheet §9.1 with all 13 per-value entry blocks: 1 cluster root NEW (Diaspora & Indigenous, 57 distinct aggregate child-value lessons) + 4 substantive canonical values with corpus (African American 24, AA diaspora 2, Indigenous 24, Native American 5) + 2 v3-canonical single-row variants (Indigenous/Native American 1 — the X-08 "ghost canonical", Indigenous Peoples 1 — merge-into-Indigenous) + 2 specific tribal-nation canonicals (Lenape 7 keep, Haudenosaunee 3 NEW) + 4 v3-baseline-corpus-absent placeholders (Soul Food 0, Three Sisters traditions 0 — X-09 reshape candidate, Black culinary history 0, Cajun/Creole 0 — cross-ref §12.17 Southern United States NEW candidate). 13 per-value entries lands as the third-smallest cluster fill (vs Middle Eastern 11, African 10) but the cross-cluster nature spans 57 distinct aggregate lessons across AA cohort 26 + Indigenous cohort 31.
- Dispatched 2 parallel Opus corpus-read agents — **Agent A: African American (24 + 2 AA-diaspora = 26 distinct lessons)** + **Agent B: Indigenous-cohort (31 distinct lessons spanning 6 canonical-value surface labels — Indigenous 24 + Native American 5 + Indigenous/Native American 1 + Indigenous Peoples 1 + Lenape 7 + Haudenosaunee 3)**. Both returned worksheet-ready `<details>` corpus-evidence blocks with 8-10 representative lesson excerpts + Tagging-pattern paragraphs + Notes paragraphs. Pre-fetched lesson IDs + titles + heritage chains from TEST DB and passed to agents for per-lesson body fetches via MCP (same working pattern as Sessions 68 + 70). Agents adhered to X-NN cross-cluster audit signal numbering as instructed (Agent A: X-01 through X-05; Agent B: X-06 through X-09 starting from X-06 to avoid collision); reconciled both at integration with no renumbering needed.
- **Agent A integration note:** Manual verification corrected one numerical detail — Agent A's "Tagging pattern" paragraph initially said "14 of 24 AA lessons carry `African` parent"; recounting against the SQL data confirmed the accurate count is **15 of 24** (Hoppin' John Burgers is 2 lessons not 1; the 2 BHM-themed Burgers lessons both carry `African`, bringing the African-carrying count from 14 to 15). Adjusted in worksheet §9.1.2 integration. Other agent outputs verified against SQL data and integrated verbatim.
- Resolved 5 §9.1 framing-block decisions to pre-handoff recommendations (preserving `<to_fill>` verdicts for curriculum-team review): **Decision 1** (cluster naming) → single root `Diaspora & Indigenous` with `African American` and `Indigenous` as parallel direct depth-2 children (reasoning: corpus shows zero overlap between AA and Indigenous canonical-value tags — they're parallel identity-tag canopies); **Decision 2** (AA vs AA-diaspora surface label) → empirically settled toward `African American` per X-04 (v3-canonical functionally vacant) + X-05 (Soul Food Sunday template stub) findings; **Decision 3** (Indigenous vs Native American vs Indigenous/Native American surface label) → corpus-prevalence settles toward `Indigenous` (24-row prevalence vs 5-row Native American vs 1-row v3-canonical); **Decision 4** (Lenape + Haudenosaunee tier + parent) → `Eastern Woodlands` NEW sub-region intermediate candidate (parent for both Lenape + Haudenosaunee, then `Indigenous` cluster-root) per the corpus-evidenced "adjacent but distinguishable" body framing in `Elementary Haudenosaunee Address Lesson` ("Distinguish bt Haudenosaunee/Iroquois and Lenape — show map"); **Decision 5** (v3-corpus-absent verdicts) → `internal`-tier placeholders pending Decisions 1/2/3 resolution, with `Three Sisters traditions` flagged for retire-or-restructure per X-09 (cross-canonical-value theme not single-parent child).
- Appended 9 cross-cluster `X-NN` audit signal register entries (X-01 through X-09) — **first cross-cluster signals in the register**; total open signals now 50 (was 41 after Session 71). X-01 berbere `East African` omission on `Black Eyed Peas, the South and BHM`; X-02 4 Cajun BEP Slider rows uniformly omit `North American` (concentrated AME-01 evidence); X-03 AA-cohort continental-`African` parent split 15/24 carry vs 9/24 omit (convention question — no parallel in other clusters' diaspora cohorts); X-04 `African American diaspora` v3-canonical functionally vacant (2 problem rows, decisive AA-as-canonical evidence); X-05 Soul Food Sunday active-corpus row is a blank ESYNYC template stub; X-06 `The Lenape Farmers and Skits` missing `Lenape` tag despite body-clearly-Lenape anchoring (internal-consistency under-tag drift); X-07 cross-cluster Indigenous-without-North-American routing — 5 lessons route via Latin American (`Three Sister Arepas`, `Three Sisters Empanadas`, `3 Sisters Tacos`, `All About Corn`, `Plants and Music`); X-08 `Indigenous/Native American` v3-canonical surface label propagated to only 1 row + thin body content; X-09 Three Sisters as cross-canonical-value theme rather than v3-baseline single-parent child (17-18 lessons spanning 6 cohort canonicals).
- Worksheet header status banner (line 3) + footer status banner (line 2108 → 2108-ish post-edit) updated to Session 72.
- §9.2 multi-parent table unchanged from Session 70 (5/5 complete). §9.3 + §9.4 unchanged (no cross-cluster exceptions surfaced; §9.1 per-value entries follow §6 conventions with documented rationales).
- §16 end-summary canonical-vocab table NOT populated this session — deferred to Session 74 per kickoff-prompt allowance ("Acceptable to ship §9.1 + §16 as 2 separate PRs if needed"). §9.1 alone landed as 13 entries + 2 Opus reads + 9 audit signals, which is medium-sized cluster fill scope; bundling §16's ~88-row mechanical transcription would push the session past stop-point heuristic.

**Decisions made this session:**

- **Pre-handoff recommendation: single cluster root `Diaspora & Indigenous` over split into two roots.** Reasoning per worksheet §9.1.1 Notes: corpus shows zero overlap between `African American` and `Indigenous` canonical-value tags — they're parallel identity-tag canopies with no lessons tagging both. Splitting into two cluster roots would create two visually-disjoint filter chips that don't share entries; a unified cluster root with both as direct depth-2 children better expresses the structural reality. Curriculum team may override at handoff. Captured at §9.1.1 + Decision 1 framing.
- **Pre-handoff recommendation: canonical surface label = `African American` not `African American diaspora`.** Reasoning per worksheet §9.1.2 + §9.1.3 Notes: 24-row corpus prevalence + the 2 `African American diaspora` rows both being problem rows (AFR-06 misallocation + X-05 template stub) make this empirically decisive. Captured at §9.1.2 + Decision 2 framing.
- **Pre-handoff recommendation: canonical surface label = `Indigenous` not `Native American` not `Indigenous/Native American`.** Reasoning per worksheet §9.1.4 + §9.1.6 + §9.1.7 Notes: 24-row corpus prevalence > 5-row Native American > 1-row v3-canonical; the v3 attempted merge surface label `Indigenous/Native American` was never propagated through the rest of the cohort (X-08 ghost canonical). Curriculum team may consider re-deploying v3-canonical surface label across the cohort if Stage 2 reviewers want the v3 alignment. Captured at §9.1.4 + Decision 3 framing.
- **Pre-handoff recommendation: `Eastern Woodlands` NEW sub-region candidate (parent for Lenape + Haudenosaunee).** Reasoning per worksheet §9.1.8 + §9.1.9 Notes: both are Eastern Woodlands tribal nations, the corpus treats them as adjacent-but-distinguishable specific-tribal-nation tags, body content in `Elementary Haudenosaunee Address Lesson` explicitly maps them as geographically distinct (NYC area for Lenape, "other parts of New York State" for Haudenosaunee). Structurally parallel to §15.2 Levantine under Middle Eastern. Alternative: both parent under `Indigenous` directly. Captured at §9.1.8 + §9.1.9 + Decision 4 framing.
- **Pre-handoff recommendation: `Three Sisters traditions` flagged for retire-or-restructure (X-09).** Reasoning per worksheet §9.1.11 Notes: v3-baseline single-parent placement under `Indigenous/Native American` doesn't match corpus reality where Three Sisters is a cross-canonical-value theme appearing across 17-18 lessons spanning 6 cohort canonicals. Options: (a) backfill `Three Sisters traditions` tag (multi-parent or duplicate-as-needed), (b) retire-as-canonical and treat as thematic `tags` value, (c) restructure as multi-parent canonical requiring schema support. Captured at §9.1.11 + X-09 audit signal.

**Process notes / observations:**

- **2 parallel Opus agents pattern continues to land cleanly.** Both agents (~3-4 min each, ~85-87K tokens) returned worksheet-ready `<details>` blocks + Notes paragraphs in a single dispatch round. Pre-derived cohort math (lesson IDs + titles + heritage chains + topical sub-cohort buckets + pre-existing audit signal cross-references) substantially reduced agent's recomputation overhead — agents used the pre-fetched data as confirmed-starting-point and verified bodies via MCP fetches. Same working pattern as Sessions 68 + 70. Agent A's "Tagging pattern" undercounted `African`-carrying lessons by 1 (claimed 14/24 instead of accurate 15/24 — Hoppin' John Burgers is 2 lessons not 1); caught at integration via SQL data recount. Worth flagging for future agent dispatches: spot-check arithmetic claims in agent Tagging-pattern paragraphs against the pre-derived cohort data.
- **Audit signal cross-cluster `X` prefix introduced cleanly.** Existing register had cluster-prefixes ASI / AME / AFR / EUR / ME but no `X-NN` signals; the §9.1 work surfaces signals that genuinely span clusters (e.g., X-01 East-African-from-AA, X-07 Indigenous-via-Latin-American). The `X` prefix per the register's "Adding a new signal" instruction (which already lists `X` for cross-cluster) accommodated cleanly. First cross-cluster signal cohort lands as 9 entries (X-01 through X-09) — comparable in size to the regional clusters' single-session signal cohorts.
- **§9.1 cluster differs structurally from §11-§15 regional clusters.** Per Session 59 design: §9.1 is a relocation of v3-baseline North American children to their own cluster, not a content-derived cluster. This means: (a) the cluster root is a NEW canonical with 0 direct corpus tags (vs. regional cluster roots which all have substantive corpus presence — Middle Eastern 23, African 41, European 53, Asian 63, Americas 170); (b) the "cluster decisions to surface" framing block is more decision-heavy (5 questions all requiring curriculum-team verdicts) than regional clusters (typically 3-4 questions, some with empirical defaults); (c) the per-value entries' `parent` field is all `<to_fill>` because Decision 1 cluster-root naming is unresolved. Pattern worth noting: cross-cluster sections in future similar work (concepts worksheet, ~8 smaller-field worksheets) may have similar shape if they also involve structural relocation of v3-baseline placements.
- **§16 deferral was the right call.** §9.1 fill came out as a medium-sized cluster scope (13 entries + 2 Opus reads + 9 audit signals + 5 framing decisions). Bundling §16's ~88-row mechanical transcription would push the session past stop-point heuristic (one cluster per session). Session 74 picks up §16 with clean scope: read each §11-§15 + §9.1 per-value entry's structural metadata (canonical_key, surface_label, parent, filter_ui_tier, frequency, aliases) and transcribe into the §16 table. Mechanical transcription benefits from clean session scope to ensure 88-row accuracy.
- **Pre-push code-reviewer agent dispatch:** caught 2 P2 + 1 P3 internal-consistency findings on the substantive worksheet + status-doc diff. All 3 accepted as real internal-consistency findings + applied as fix-up commit `84201aa`. **Thirteenth consecutive Stage 1 pre-push agent catch** (Sessions 60-66 + 68 + 69 ×2 + 70 + 71 ×2 + 72 = 13 substantive catches). Findings detail: **P2-1** §9.1.2 AA North American pairing rate arithmetic — 17/26 = 65.4% not 66.7%; the 66.7% figure is the AA-only baseline (16/24), the combined AA + AA-diaspora 17/26 union is 65.4%; fixed in 3 worksheet §9.1.2 spots (`<details>` summary line, Tagging pattern point 3, Notes paragraph) with clarifying both-baseline phrasing, plus one Stewed BEP excerpt's "9 of 24 AA-cohort" claim corrected to "8 of 24 AA-only-cohort (9 of 26 if AA-diaspora row Edmond Albius is included)". **P2-2** Stage 1 status doc audit-register-count dashboard line stale at "~41 open" — corrected to "~50 open as of 2026-05-11 post-Session-72: 4 ASI + 6 AME + 8 AFR + 14 EUR + 9 ME + 9 X" matching post-Session-72 register state (audit register header + Current state paragraph already correctly said 50). **P3-1** §9.1.1 cluster-root aggregate arithmetic "24 + 2 + 24 + 5 + 1 + 1 + 7 + 3 = 57" reads jarringly since the literal sum is 67 — split into "Sum 67 tag-appearances; deduplication removes ~10 multi-tagged overlaps to arrive at 57 distinct lessons", noting AA + AA-diaspora cohort (26) and Indigenous-cohort (31) have zero overlap as structural support for Decision 1 single-root recommendation.

**Audit signals surfaced for Stage 2 re-tag (9 total — X-01 through X-09):**

See `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md` for full table rows. Summary:

- **X-01** Berbere `East African` omission on `Black Eyed Peas, the South and BHM`
- **X-02** 4 Cajun BEP Slider rows uniformly omit `North American` (concentrated AME-01 evidence)
- **X-03** AA-cohort continental-`African` parent split (15 carry / 9 omit — convention question with no parallel in other clusters)
- **X-04** `African American diaspora` v3-canonical functionally vacant (2 problem rows)
- **X-05** Soul Food Sunday active-corpus row is a blank ESYNYC template stub
- **X-06** `The Lenape Farmers and Skits` missing `Lenape` tag despite body-clearly-Lenape anchoring
- **X-07** Cross-cluster Indigenous-without-North-American routing (5 lessons via Latin American)
- **X-08** `Indigenous/Native American` v3-canonical surface label propagated to only 1 row
- **X-09** Three Sisters as cross-canonical-value theme rather than v3-baseline single-parent child

**For next session (Stage 1 Session 73 = PR review cycle, mirroring Sessions 63 / 65 / 67 / 69 / 71 precedent):** Triage bot review findings on the Session 72 PR, apply round-1 + round-2 fix-ups as needed, reach squash-merge. Session 74 = §16 end-summary canonical-vocab table (~88 rows mechanical transcription from §11-§15 + §9.1 per-value entries) after Session 73 merges. After Session 74 ships, the next major Stage 1 milestone is curriculum-team handoff (worksheet substantively complete, awaits external review).

---

### Session 71 — 2026-05-11 — PR #488 review cycle (round-1 + round-2 fix-ups + round-3 ship-ready default-reject + squash-merge + direct-to-main backfill)

**Branch:** `docs/stage1-heritage-middle-eastern-cluster` (continued from Session 70; squash-merged 2026-05-11 21:10:28 UTC as `76d5369`).

**Done:**

- Triaged 2 round-1 bot reviewers (Claude auto-bot + Codex manual) — findings collected from all 4 PR surfaces (issue comments, formal reviews, inline comments, checks). Claude round-1 was an Overview + observations pass with 0 blocking findings (1 informational closeout reminder); Codex round-1 returned 2 P2 + 1 P3 substantive findings.
- **Round-1 acceptance (3 substantive findings, all from Codex):**
  - **Codex P2 #1 (orientation-surface staleness):** Foundation status doc had 3 stale lines treating Middle Eastern as future work — line 11 (Per-value fill schedule), line 14 (worksheet pointer), line 44 (Active branch). All 3 updated to mark Middle Eastern §15 ✅ + PR #488 OPEN.
  - **Codex P2 #2 (pre-push outcome recording):** 2 session-log entries claimed pre-push agent dispatch was "TBD" / "deferred" even though commit `340a7fc` showed the pre-push agent ran + caught real issues. Foundation status doc:154 + Stage 1 status doc:198 + Stage 1 status doc:41 catch-streak parenthetical math (off by 1, missing Session 70) all corrected.
  - **Codex P3 (axis confusion in "smallest cluster fill" wording):** Wording was numerically false (Middle Eastern 11 entries vs African 10) — accurate only for cluster-root lesson count not entry count. 4 spots fixed: foundation status doc:149 + Stage 1 status doc:109 + Stage 1 status doc:184 + PR description body via `gh pr edit`.
- **Round-1 default-rejects (single-voice low-priority):** Claude's "closeout reminder" (already covered in Session 71 contract; Codex independently confirmed); Claude's worksheet "smallest root" rewording (worksheet text was already accurate with inline comparator citing actual cluster-root lesson counts; Codex independently confirmed reject); Claude's Session 68 archive footer concern (archival journal entry, not orientation surface).
- Round-1 fix-up commit `aca32a7` (5 doc edits foundation status doc + 4 doc edits Stage 1 status doc + PR description update via `gh pr edit`).
- **Round-1 pre-push code-reviewer agent caught 1 P2 + 1 P3 — both default-rejected** with rationale: P2 worksheet "smallest" rewording false-positive (worksheet text already cites comparator counts inline; reviewer's suggested fix would have been temporally inaccurate); P3 Session 68 footer reviewer themselves agreed not orientation surface. **Eleventh Stage 1 catch-streak watch.**
- **Round-2 reviewers** (auto-Claude + manual Codex): converged 2-voice on all 3 findings (AFR-05 ↔ ME-01 bidirectional cross-ref P2; ME-09 Jordanian asymmetry callout P3; dashboard "Branch + PR review next" wording P3). 2-voice convergence revised round-1 single-voice reject calls on the 2 P3 items.
- Round-2 fix-up commit `b2c3c47` (3 audit register / status doc edits): AFR-05 cross-reference (Description + Source + Action cells); ME-09 evidentiary asymmetry sentence + Action qualifier; dashboard `🚧 Branch + PR review next` → `🚧 In review (PR #488)`.
- **Round-2 pre-push code-reviewer agent caught 1 P1 — default-rejected** with rationale (AFR-05 / ME-01 directional asymmetry is temporally accurate and matches AME-06 / EUR-11 precedent — earlier-entry references later in past-tense, later-entry references earlier in active voice). Reviewer's own verdict was "P1/P2 boundary, default-reject candidate, flag and let user decide." **Twelfth Stage 1 catch-streak watch.**
- **Round-3 auto-Claude verdict: ship-ready** with 0 substantive findings; 1 P3 (audit register Sessions 62-70 + Session 70 redundant header phrasing) + 2 informational notes — all default-rejected per round-cap rule. Codex round-3 not dispatched (user-authorized auto-Claude-only path per Session 69 precedent).
- CI on `b2c3c47`: all green except known baseline `Security Audit` `@lhci/cli` flake.
- **PR #488 squash-merged 2026-05-11 21:10:28 UTC as `76d5369`** via `gh pr merge --squash --delete-branch`. Origin branch auto-deleted; local branch auto-switched to main + fast-forwarded.
- Session 71 closeout backfill direct-to-main per Sessions 67 + 68/PR #485 + 69 precedent (4th occurrence — past 3rd-occurrence promotion threshold; user-authorized).

**Decisions made this session:**

- **2-voice convergence revises round-1 single-voice reject calls.** The 2 P3 items I default-rejected in round-1 (Jordanian asymmetry, dashboard wording) became accept-worthy when Codex round-2 converged with auto-Claude on both. Per `feedback_pr_bot_review_workflow.md` "bot voice convergence as P1 signal" — when 2 bots independently agree, treat as worth fixing regardless of original P-label. Pattern worth noting: round-1 single-voice low-priority findings deserve a "watch in round-2 for convergence" status rather than hard reject.
- **Direct-to-main for Session 71 closeout (4th occurrence — past promotion threshold).** Sessions 67 + 68/PR #485 + 69 used direct-to-main; Session 71 makes it 4-in-a-row. Pattern is now durable per the memory note's promotion criterion — flag for next memory-update cycle to promote from candidate to durable rule.
- **AFR-05 directional asymmetry vindicated against pre-push reviewer pushback.** Round-2 pre-push agent suggested mirroring ME-01's "duplicate of AFR-05" in AFR-05 ("Duplicate of ME-01" instead of "Re-surfaced as ME-01"). Default-rejected because the asymmetric pattern matches the AME-06 / EUR-11 precedent (earlier entry uses past-tense "REFRAMED by Session 68"; later entry uses active-voice "Partly reframes AME-06"); reviewer's symmetric language would have been temporally inaccurate (AFR-05 was discovered first; ME-01 is the later derivative).

**Process notes / observations:**

- **Round-2 single-fix-up commit avoided round-2 polish-creep.** Both round-2 bots stayed within scope (Codex explicitly said "I would not let them expand the round beyond [3 small docs polish items]"; auto-Claude found the same 3 issues + nothing more). Round-cap discipline + 2-voice convergence aligned cleanly here.
- **Session 71 = first session where pre-push agent's catches were both default-rejected with rebuttal.** Sessions 60-66 + 68 + 69 ×2 + 70 all had at least 1 reviewer finding accepted as fix-up. Session 71 round-1 + round-2 reviewer dispatches both surfaced findings the user agreed should be rejected with rationale. The "Nth catch-streak" wording is therefore worth re-examining: it counts dispatches where the reviewer agent surfaced findings (whether accepted or rejected with rationale), NOT only catches that became fix-ups. Worth making explicit in the next session contract.
- **Auto-Claude round-3 explicitly validated round-2 fix-ups.** Auto-Claude's round-3 review confirmed AFR-05's reciprocal ME-01 reference matches the AME-06 / EUR-11 bidirectional pattern, and called out that ME-01 ↔ AFR-05, ME-05 ↔ EUR-14, ME-04 ↔ EUR-02 cross-references "will save Stage 2 reviewers real time." Stronger signal than pure ship-ready: actively endorses the round-2 work.
- **Session 71 tight session boundary** — 100% review-cycle + closeout. Sessions 63 / 65 / 67 / 69 were also review-cycle sessions but had varying cluster-prep scope mixed in. Session 71 demonstrates that PR review-cycle alone is a clean session-boundary scope.

**For next session (Stage 1 Session 72 = §9.1 cross-cluster diaspora & indigenous identities + §16 end-summary canonical-vocab table):**

See `## Next session contract` block at top of doc for the authoritative summary. Branch off `main` at the Session 71 closeout-backfill commit. Primary objective = populate §9.1 cross-cluster section per-value entries (diaspora identities like African American, Asian American, Latin American + indigenous identities like Lenape, Indigenous; cross-cluster filter-UI tier conventions §9.3; footnotes §9.4) + populate §16 end-summary canonical-vocab table mechanically from filled per-value entries. After Session 72 ships, the next major Stage 1 milestone is curriculum-team handoff (worksheet substantively complete, awaits external review).

---

### Session 70 — 2026-05-11 — Middle Eastern cluster per-value entries populated

**Branch:** `docs/stage1-heritage-middle-eastern-cluster` (off `main` at `cdfdc19` — the PR #487 closeout-backfill commit, downstream of the PR #487 squash `f429fb0`; chose current HEAD over the contract's literal `f429fb0` to preserve the closeout-backfill content, matching Session 68's branch-base choice precedent).

**Done:**

- Verified Middle Eastern cluster corpus distribution against TEST DB. Counts match the §15 framing block exactly: Middle Eastern 23 cluster root, Levantine 14 sub-region, Yemeni 3 NEW, Egyptian 2 (cross-ref §13.6 + §9.2), `levantine` drift 2, Israeli 1 NEW + multi-parent, `middle-eastern` drift 1, Palestinian 1, Persian 1 NEW + multi-parent, Lebanese / Syrian / Jordanian = 0 each (v3-corpus-absent confirmed). Adjacent-country scan (Iraqi / Iranian / Turkish / Kurdish / Saudi / Gulf / Arab / Bedouin / Bahraini / Omani / Qatari / Emirati) returned EMPTY — no hidden Middle Eastern values in the corpus beyond the framing block.
- Populated worksheet §15 with all 11 per-value entry blocks: 1 cluster root (Middle Eastern 23) + 1 sub-region (Levantine 14) + 4 country-specifics with corpus (Yemeni 3 NEW, Persian 1 NEW + multi-parent, Palestinian 1, Israeli 1 + multi-parent) + 3 v3-baseline-corpus-absent (Lebanese, Syrian, Jordanian — per §12.18 Dominican precedent) + 2 kebab-case drift entries (`middle-eastern`, `levantine`). The 11-entry count matches the contract estimate exactly.
- Dispatched 2 parallel Opus corpus-read agents — Middle Eastern (23 cluster root) + Levantine (14 sub-region). Each returned a worksheet-ready `<details>` corpus-evidence block; both integrated into §15.1 + §15.2. Pre-fetched lesson_id + title + heritage arrays from TEST DB + cohort math derivation from main session; passed to agents for per-lesson body fetches via MCP (same working pattern as Session 68).
- Resolved §9.2 multi-parent decisions for Persian (row previously TBD) and Israeli (row previously TBD). Pre-handoff recommendations: Persian → `middle-eastern` primary (Central Asian flagged); Israeli → `middle-eastern` primary (Mediterranean flagged). Corpus signal supports both single-parent decisions: Persian 1/1 carries Middle Eastern with no Central Asian co-presence; Israeli 1/1 carries Middle Eastern with no Mediterranean co-presence. With these resolutions, **§9.2 multi-parent table is fully populated** — all 5 multi-parent canonicals (Egyptian, Persian, Moroccan, Israeli, Spanish) now have pre-handoff recommendations.
- Lower-frequency entries (Yemeni 3 NEW, Persian 1 NEW, Palestinian 1, Israeli 1, Lebanese 0, Syrian 0, Jordanian 0, plus 2 drift literals) populated structurally per §4 methodology using direct SQL body inspection of 9 unique lessons. Yemeni gets a deeper Notes treatment matching §14.8 Irish NEW-canonical precedent.
- Appended 9 ME-NN audit signal register entries (ME-01 through ME-09) covering Stage 2 corpus cleanup / reviewer-validation items surfaced during the Middle Eastern fill. **ME-01 duplicate-of-AFR-05** (Egyptian Ful Medames routing inconsistency surfaced from Middle Eastern perspective) — second cross-cluster audit-signal coordination after EUR-11's reframe of AME-06.
- Worksheet footer status banner updated to Session 70.

**Decisions made this session:**

- **Branch base = `cdfdc19` (current main HEAD) rather than the contract's literal `f429fb0` (PR #487 squash).** Session 69's closeout-backfill commit (`cdfdc19`) was applied directly on main per the user-authorized direct-to-main precedent. Branching off `cdfdc19` preserves the closeout content; branching off `f429fb0` would have stripped it. Same precedent as Session 68's branch-base choice over PR #485 squash; no fresh decision needed.
- **11 per-value entries (matching contract estimate exactly).** The contract specified "~11 entries planned" and the actual fill came to exactly 11 — second-smallest per-value fill (vs Asian 18, Americas 22, African 10, European 14), but smallest regional cluster root by lesson count (Middle Eastern 23 vs African 41, European 53). Middle Eastern has the cleanest per-value scope of any cluster, partly because the 3 v3-canonical-corpus-absent country-specifics all cluster under Levantine and partly because the cluster has only 1 meaningful sub-region (no other v3-baseline-or-NEW sub-region candidate surfaced).
- **Yemeni → `new` canonical with parent = `middle-eastern` direct (depth-2 asymmetry).** All 3 corpus Yemeni rows tag depth-2 (no Levantine intermediate; Yemen is Arabian Peninsula geography, not Levantine). Per §2 depth-flexibility, depth-2 is structurally valid (parallel to §14.8 Irish EUR-14 + AFR §13.3 North African / §13.4 East African NEW patterns). Curriculum team may introduce an `Arabian Peninsula` sub-region NEW candidate at handoff if anticipated Saudi Arabian / Emirati / Omani candidates warrant it (Hummus and Pita body names Saudi Arabia). Captured at ME-05.
- **§9.2 Persian multi-parent → `middle-eastern` primary, Central Asian flagged.** Single corpus lesson (Kuku Sabzi) body explicitly anchors Iran. NO Central Asian co-presence. Mirrors Session 66 Egyptian / Moroccan + Session 68 Spanish resolution pattern (single-parent home + multi-parent alternative noted at cluster Notes). Captured at §9.2 + §15.4 Notes.
- **§9.2 Israeli multi-parent → `middle-eastern` primary, Mediterranean flagged.** Single corpus lesson (Breakfast around the World / Israeli Salad) body explicitly anchors "Israel is a small country in the Middle East." NO Mediterranean co-presence in corpus. v3 baseline (Appendix A) places Israeli direct-under-Middle-Eastern (NOT under Levantine, despite Israel being Levantine geographically) — the corpus follows v3's asymmetric routing exactly. Israeli depth-2 vs Palestinian depth-3 captured at §15.6 Notes as v3-by-design, not an audit signal. Captured at §9.2 + §15.6 Notes.
- **Lebanese / Syrian / Jordanian (0) → per-value entries with `<to_fill>` verdict** per §12.18 Dominican precedent (matching §14.10 French / §14.11 Polish + the §15 framing block decision #1 recommendation "keep at sub-tier"). Curriculum team decides keep / drop / internal at handoff. Captured at §15.7-§15.9 + ME-09.
- **Cluster decision summary block — left TBD per curriculum-team-fill convention.** Same pattern as §11 / §12 / §13 / §14.

**Process notes / observations:**

- **2 parallel Opus agents landed cleanly with pre-derived cohort math.** Levantine (~2 minutes, ~74K tokens) + Middle Eastern cluster root (~4 minutes, ~82K tokens). Both returned worksheet-ready `<details>` blocks with 5-7 representative excerpts each + closing tagging-pattern paragraphs. Cohort math was pre-derived in the main session (Q1-Q4 corpus distribution queries + cluster-root + sub-region cohort tables) and passed to agents as confirmed-from-corpus starting points; agents verified and elaborated rather than recomputing. Faster integration than Session 68's 3-agent dispatch (which did its own cohort recomputation per-agent).
- **Both agents independently used ME-01..ME-04/05 numbering** for the audit signals they surfaced. Reconciled into a single unified ME-01..ME-09 ordering at integration time (cluster root agent's signals → ME-01..ME-05; Levantine agent's signals → ME-06..ME-09). Pattern worth flagging: when 2+ Opus agents work in parallel on a cluster, they don't coordinate audit-signal numbering. The lead session needs to do the renumbering at integration. Not a problem (numbering is purely sequential within the cluster prefix), but worth being aware of for future multi-agent dispatches.
- **§9.2 multi-parent table fully populated after Session 70.** 5 of 5 multi-parent canonicals (Egyptian Session 66, Moroccan Session 66, Spanish Session 68, Persian Session 70, Israeli Session 70) now have pre-handoff recommendations with corpus-signal justification. Session 70 closes out the §9.2 work that began Session 64 — the remaining §9 work (§9.1 diaspora & indigenous identities per-value entries; §9.3 + §9.4 housekeeping) is independent.
- **Levantine 100% Middle Eastern pairing — the cleanest hierarchical sub-region in the worksheet.** Earlier clusters' sub-regions (Mediterranean 95%, North American mixed, East Asian mixed, West African mixed) all had cross-cluster carry-ins or omitted-parent rows. Levantine 14/14 carries Middle Eastern with no exceptions. Worth flagging to the foundation-phase decision journal as a positive signal: the §15 cluster's depth-2-via-Levantine structure is empirically well-supported.
- **Adjacent-country scan returned empty.** Iraqi / Iranian / Turkish / Kurdish / Saudi / Gulf / Arab / Bedouin / Bahraini / Omani / Qatari / Emirati — none of these appear in corpus tagging. Notable absences: Saudi Arabia is named in Hummus and Pita body but not tagged anywhere; same for Iran, Iraq, Egypt (outside the 2 Egyptian Ful Medames rows). Stage 2 reviewer-validation could surface backfill candidates if curriculum team values broader Middle Eastern country coverage — but the §15 framing block did not flag any of these as NEW candidates, so the scope stays at the framing block's recommendations.
- **Pre-push code-reviewer agent dispatch:** caught 1 P1 + 1 P2 (multi-part) + 1 P3 internal-consistency findings on the substantive worksheet + status-doc diff. All 3 accepted as real internal-consistency findings + applied as fix-up commit `340a7fc`. **Tenth consecutive Stage 1 pre-push agent catch** (Sessions 60-66 + 68 + 69 ×2 + 70 = 10; Session 67's 0-finding round was on a status-doc-only diff with no substantive content to review). Findings detail: P1 worksheet header status banner (line 3) stale at "Session 68" / 4-of-5-clusters → updated to Session 70 / 5-of-5 / §9.2 fully resolved; P2 multi-part Current-state content stale post-Session-70 ("What's done" §9.2 row missing Persian + Israeli; "What's NOT done" still listed §15 Middle Eastern + Persian + Israeli §9.2 work as TBD; "For next session" pointer named Session 70 instead of 71; stop-point heuristic line missing Session 70 datapoint); P3 §15.1 tagging-pattern citations "§14.1 EUR-14" / "§14.1 EUR-02" reformatted to drop misleading section prefix (matches §15.3 Yemeni Notes style).

**Audit signals surfaced for Stage 2 re-tag (9 total — ME-01 through ME-09):**

See `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md` for full table rows. Summary:

- **ME-01** Egyptian Ful Medames routing inconsistency (duplicate of AFR-05, surfaced from Middle Eastern perspective)
- **ME-02** Street Vendors duplicate-row cross-cluster + casing disagreement (parallel to EUR-05 / EUR-10 dedup-pair pattern)
- **ME-03** Introduction to Salad Project Cohort A under-tag question
- **ME-04** Plant Based Eating Cohort A recipe-vehicle over-tag (parallel to EUR-02 Cellular Respiration / Microbiome)
- **ME-05** Yemeni / Persian / Israeli depth-2 sub-region asymmetry (parallel to EUR-14 Irish)
- **ME-06** Drift-literal Chilled Cucumber Soup dedup pair (parallel to EUR-10 Varenyky)
- **ME-07** Chilled Cucumber Soup Palestinian under-tag (coordinates with ME-06)
- **ME-08** Eid-specific Levantine over-narrowing (pan-Muslim curricular framing tagged sub-regionally)
- **ME-09** Lebanese / Syrian / Jordanian country-tag backfill candidates (13-row country-less Levantine cohort)

**For next session (Stage 1 Session 71 = PR review cycle, mirroring Sessions 63 / 65 / 67 / 69):** Triage bot review findings on the Session 70 PR, apply round-1 + round-2 fix-ups as needed, reach squash-merge. After Session 71 merges, the remaining Stage 1 work is §9 cross-cluster section per-value entries (§9.1 diaspora & indigenous identities — §9.2 now fully complete after Session 70) + §16 end-summary canonical-vocab table.

**Out-of-scope follow-ups (this session):** the parallel-Opus-agent audit-signal-numbering renumber pattern is the second occurrence (Session 68 also surfaced single-agent numbering issues at integration); promotion to a feedback note or methodology rule is a candidate for the next housekeeping cycle if a third occurrence emerges. Adjacent-country corpus-absence is a curriculum-team-value question (whether broader Middle Eastern country coverage like Iranian / Iraqi / Saudi Arabian / Kurdish should be a Stage 1 expansion or stays Stage 2 / future-corpus-growth).

---

### Session 69 — 2026-05-11 — PR #487 review cycle (round-1 + round-2 fix-ups + round-3 default-reject + squash-merge + direct-to-main backfill)

**Branch:** `docs/stage1-heritage-european-cluster` (continued from Session 68; squash-merged 2026-05-11 18:37 UTC as `f429fb0`).

**Done:**

- Triaged 3 round-1 bot reviewers (Claude × 2 auto-runs, Codex manual, Hermes manual) — findings collected from all 4 PR surfaces.
- **Round-1 acceptance (5 substantive findings):**
  - **3-voice non-blocker (Claude × 2 + Codex + Hermes):** §14.5 Spanish Notes reword — keep `internal` tier, replace "below the ≥5-lesson sub-tier bar by 0" framing with "at the threshold; conservative multi-parent bridge pending curriculum-team review" (Latin American alternative flagged).
  - **1-voice Hermes verified factual:** §14.1 European details "Africa where pan-continent lessons survive as a third of the cluster root" was factually wrong (African Cohort A = 3/41 ~7%, not 33%). Rewrite contrasts European's distinctive Cohort B/C distribution (Italian-skewed hierarchical 66% + cross-cluster Americas 21%) against African Cohort C diaspora dominance at 61%.
  - **2-voice (Codex + Hermes) orientation-staleness batch:** foundation status doc Branches block + Session 68 peer-status-doc pointer (both "Session 69 Middle Eastern" → "Session 69 PR #487 review cycle, then Session 70 Middle Eastern after merge"); Stage 1 status doc dashboard Cross-cluster row (dropped Spanish from remaining §9.2 — Spanish resolved by PR #487); audit-register pointer ("~18 open" → "~32 open with 4 ASI + 6 AME + 8 AFR + 14 EUR breakdown"); Next session contract commits count ("2" → "3"); Current state "awaiting findings" → describes Session 68 pre-push catch in `f2bdabe`.
  - PR description test plan item: "Session 69 Middle Eastern" → "Session 69 PR review cycle / Session 70 Middle Eastern" (via `gh pr edit`).
- **Round-1 pre-push code-reviewer agent caught 1 P2** — AME-06 register Signal cell still carried "single body sentence about Spanish origins" framing that EUR-11 explicitly reframes via Session 68 body-content analysis. Accepted + AME-06 Signal + Source + Action cells updated to cross-reference EUR-11's reframe ("close jointly with EUR-11"). **Eighth consecutive Stage 1 pre-push agent catch.**
- Round-1 fix-up commit `4452cce` (9 doc edits across 4 files: foundation status / Stage 1 status / worksheet / audit register).
- **Round-1 default-rejects:** auto-Claude × 6 informational/minor observation no-action items; CI Security Audit failure (verified `@lhci/cli` baseline noise unchanged by this docs-only PR by both Codex + Hermes).
- **Round-2 reviewers** (user opted to skip Hermes round 2 — small-diff Session 67 precedent): auto-Claude + manual Codex.
  - **Codex P2 #1:** Next session contract still said "3 commits" but `4452cce` made head 4 commits. Updated to "4 commits as of `4452cce`" with round-1 fix-ups commit listed + "Round-2 fix-up commits may follow" hedge.
  - **Codex P2 #2:** Foundation status doc 2 stale European-pending spots — (a) African paragraph schedule "European (next, ~12 entries) → Middle Eastern (~8)" → "European (✅, PR #487) → Middle Eastern (~8, next)"; (b) Stage 1 worksheet pointer paragraph moved European §14 from TBD list to complete list.
- **Round-2 default-reject:** auto-Claude round-2's 4 "Minor observations" — all explicitly self-flagged as no-action / non-blocking (AME-06 status Open correct per Claude itself; EUR-13 Mediterranean omission Stage 2 prioritization; EUR-14 depth-2 well-framed; dashboard `TBD until merge` correct placeholder).
- **Round-2 pre-push code-reviewer agent caught 1 P2** — foundation status doc Session 66 "For next session" block (line 204) still future-tense "European cluster per-value fill (~12 entries)"; line 186 (Session 67's same block) was already in past-tense "(handled by Session 68; see Stage 1 status doc)" form. Precedent-aligned: applied the same past-tense pattern to Session 66 block. **Ninth consecutive Stage 1 pre-push agent catch.**
- Round-2 fix-up commit `8344ba7` (4 doc edits across 2 files).
- **Round-3 auto-Claude verdict: ship-ready** with 0 substantive findings; 5 self-flagged minor observations (entry count 14 vs ~12 / §14.2 cohort math confirmation / EUR-14 qualifier confirmation / Spanish internal-tier observation / footer line cosmetic note) — all default-rejected per round-cap rule.
- CI on `8344ba7`: all green except known baseline Security Audit `@lhci/cli` noise. `claude-review` passed in 1m55s.
- **PR #487 squash-merged 2026-05-11 18:37:28 UTC as `f429fb0`** via `gh pr merge --squash --delete-branch`. Origin branch auto-deleted; local branch auto-switched to main on merge.
- Session 69 closeout backfill directly to main per Sessions 67 + 68/PR #485 precedent (third occurrence; user-authorized).

**Decisions made this session:**

- **Wait-for-auto-Claude-only on round 3.** User opted to merge after round-3 auto-Claude reached ship-ready without dispatching Codex round 3 — minimal value given auto-Claude convergence + round-cap rule. Pattern parallel to Session 65 / 67 round-2 convergence-on-default-reject.
- **Direct-to-main for Session 69 closeout (third occurrence — threshold for memory-note pattern promotion).** Sessions 67 + 68/PR #485 used direct-to-main; Session 69 makes it three-in-a-row. Per the memory note's promotion criterion ("if 2-3 future review-cycle sessions take the direct-to-main path"), this session's closeout is the threshold occurrence. Flag for next memory-update cycle to promote the pattern from candidate to durable.

**Process notes / observations:**

- **Three-voice convergence on the PR description test plan line.** Auto-Claude run 2 P1 + Codex round 1 P2 + Hermes round 1 P2 all flagged the same "Session 69 Middle Eastern" stale line independently. Strong P1 signal even on docs-only PR; updateable via `gh pr edit` without a commit.
- **Two-voice convergence on internal-only docs paid off again.** Codex + Hermes round 1 converged on the orientation-staleness batch (2-voice P2/P3). Codex round 2 alone independently re-flagged the same class of issue (commits-count + foundation pointers) that the round-1 sweep missed — single-voice but verifiable factual staleness, accepted per "empirical evidence" exception in default-reject hardening.
- **Pre-push code-reviewer agent earned its dispatch twice this session.** Round 1 caught AME-06 cross-reference (real internal inconsistency between EUR-11 Session 68 reframe and stale AME-06 Signal cell); Round 2 caught Session 66 "For next session" precedent alignment (line 204 future-tense outlier vs line 186 past-tense pattern). Both substantive. **Ninth consecutive Stage 1 catch streak** (Sessions 60-66 + 68 + 69 ×2).
- **Round 3 default-reject pattern held.** Auto-Claude round 3 produced zero findings + 5 self-flagged minor observations. All default-rejected per round-cap rule. Parallels Session 65 round 2 and Session 67 round 2 (both reached convergence-on-default-reject at round 2; here round 3 reached zero-substantive). Healthy bot-saturation signal.
- **Codex round 1 + round 2 cumulative coverage was substantial.** Round 1: 2 P2 (orientation + audit-register count). Round 2: 2 P2 (commits count + foundation paragraph schedule). 4 P2 across 2 rounds — Codex was the highest-yield single-voice reviewer this PR cycle.

**For next session (Stage 1 Session 70 = Middle Eastern cluster per-value fill):** see Next session contract block at top of doc (Session 70 preview promoted to active contract). Branch off `main` at `f429fb0` (PR #487 squash) — no hash backfill task needed since Session 69 closeout backfilled directly to main per the user-authorized precedent.

**Out-of-scope follow-ups (this session):** the direct-to-main pattern is now at threshold for memory-note promotion (3 occurrences: Sessions 67 + 68/PR #485 + 69); promotion to durable pattern is a memory-update task for the next housekeeping cycle.

---

### Session 68 — 2026-05-11 — European cluster per-value entries populated

**Branch:** `docs/stage1-heritage-european-cluster` (off `main` at `f45278a` — the PR #485 closeout-backfill commit, downstream of the PR #485 squash `b9f2cef`; chose current HEAD over the contract's literal `b9f2cef` to preserve the closeout-backfill content which is itself SoT for prior session housekeeping).

**Done:**

- Verified European cluster corpus distribution against TEST DB. Counts match the §14 framing block exactly (European 53, Mediterranean 39, Italian 24, Spanish 5, Eastern European 3, Ukrainian 3, Greek 2, Irish 2, Russian 1, `mediterranean` drift 2, `european` drift 1, `eastern-european` drift 1). Confirmed `Russian/Ukrainian` combined v3 canonical key has 0 corpus rows; corpus operates with separate values. Confirmed Polish + French v3-corpus-absent. Spanish multi-parent cross-pairing query showed 5/5 carry European, 4/5 carry Mediterranean, 3/5 carry Americas + Latin American, 1/5 carries Mexican.
- Populated worksheet §14 with all 14 per-value entry blocks: 1 cluster root (European) + 2 sub-regions (Mediterranean, Eastern European) + 5 country-specifics with corpus (Italian, Spanish, Ukrainian, Greek, Russian) + 2 v3-canonical-corpus-absent (French, Polish — per §12.18 Dominican precedent) + 1 NEW (Irish) + 3 kebab-case drift entries (`european`, `mediterranean`, `eastern-european`). The 14-entry count exceeds the contract's "~12 entries" estimate by 2 due to applying the §12.18 v3-corpus-absent precedent to French + Polish; flagged in this entry's "Decisions made this session" block.
- Dispatched 3 parallel Opus corpus-read agents — European (53), Mediterranean (39), Italian (24). Each returned a worksheet-ready `<details>` corpus-evidence block; all 3 integrated into §14.1 + §14.2 + §14.4. Pre-fetched lesson_id + title + heritage arrays from TEST DB and passed to agents (the full-body single-query approach exceeded the 141K MCP response cap, so the smaller metadata-only listing + agent-side body fetches via MCP was the working pattern).
- Resolved §9.2 multi-parent decision for Spanish (row previously TBD). Pre-handoff recommendation = `mediterranean` primary (European cluster) with Latin American flagged as alternative. Corpus splits 2 + 3: 2 Tortilla Española pure Spain-cuisine; 3 empanada lessons treat Spanish as colonial-origin bridge for Latin American dishes (explicit body framing: "Empanadas are a popular food in Latin America but have origins in Spain"). 4/5 Spanish lessons carry Mediterranean; all 5 carry European. Reframes AME-06's Session 64 over-tag characterization into intentional colonial-origin bridge (captured at EUR-11).
- Lower-frequency entries (Eastern European 3, Spanish 5, Ukrainian 3, Greek 2, Russian 1, Irish 2 NEW, French 0, Polish 0, plus 3 drift literals) populated structurally per §4 methodology using direct SQL body inspection of 15 unique lessons (with 1 lesson shared with Italian agent — Tzatziki + Where Does Pizza Come From's Greek content); no Opus reads needed for the 11 structural entries.
- Appended 14 EUR-NN audit signal register entries (EUR-01 through EUR-14) covering Stage 2 corpus cleanup / reviewer-validation items surfaced during the European fill. EUR-11 explicitly coordinates with AME-06's Session 64 over-tag finding and reframes the disposition.
- Worksheet header (line 3) + footer (line 1522 → new last-line) status banners updated to Session 68.

**Decisions made this session:**

- **14 per-value entries (not the contract's ~12) — applying §12.18 Dominican precedent to French + Polish.** The contract specified "~12 entries" (1 root + 2 sub-regions + 6 country-specifics + 3 drift) and did NOT list Polish + French. Both ARE in v3 baseline (Appendix A) but have 0 corpus rows; §14 framing block decision #3 asks the verdict at per-value level. §12.18 Dominican (0) set the precedent of giving v3-corpus-absent values per-value entries (a divergence from §11 Asian's convention for Filipino/Thai/Bengali). Aligning §14 with §12 precedent meant 2 additional entries (French, Polish) for a total of 14. Curriculum-team consistency benefit; minor scope expansion is precedent-aligned, not a deviation from the cluster fill methodology.
- **Branch base = `f45278a` (current main HEAD) rather than the contract's literal `b9f2cef` (PR #485 squash).** The PR #485 closeout backfill applied directly on main between the contract's authoring and Session 68 start. Branching off `f45278a` preserves the closeout content; branching off `b9f2cef` would have stripped it. Cosmetic mismatch flagged at session orientation; user confirmed proceed.
- **Russian/Ukrainian v3 combined canonical → recommend `split`.** Corpus shows 3 Ukrainian + 1 Russian as separate values, with the dual-tagged Borscht as the only overlap. v3's combined canonical key has 0 corpus rows. Pre-handoff recommendation: split per §14 framing block decision #1. Captured at EUR-12.
- **Mediterranean → `top` tier proposed despite 39 lessons (just below ≥40 threshold).** §14 framing block decision #2 surfaces the question; Italian-anchored content (23) makes Mediterranean functionally the corpus's Italian-cuisine umbrella, and `top` tier aligns with curricular prominence.
- **Polish + French → per-value entries with `<to_fill>` verdict** per §12.18 Dominican precedent (matches §12 convention, diverges from §11 Asian convention). Curriculum team decides keep / drop / internal at handoff.
- **Irish → `new` canonical with parent = `european` direct (depth-2 asymmetry).** Both Irish lessons chain Irish → European without an intermediate sub-region; no v3 `Northern European` / `Western European` exists. Per §2 depth-flexibility rules, depth-2 is structurally valid. Curriculum team may introduce a sub-region at handoff if anticipated UK / Nordic candidates warrant it. Captured at EUR-14.
- **§9.2 Spanish multi-parent → `mediterranean` primary, Latin American flagged.** Mirrors Session 66 Egyptian / Moroccan resolution pattern (single-parent canonical home with multi-parent alternative noted in cluster Notes). Corpus signal (4/5 Mediterranean, 5/5 European, 3/5 Latin American) supports Mediterranean primary; Latin American flag preserves the colonial-origin bridge framing for curriculum-team review.
- **Cluster decision summary block — left TBD per curriculum-team-fill convention.** Same pattern as §11 / §12 / §13.

**Process notes / observations:**

- **3 parallel Opus agents landed cleanly with pre-fetched data.** ~78s + ~194s + ~216s per agent for Italian (24) + Mediterranean (39) + European (53). All 3 returned worksheet-ready `<details>` blocks with 5 representative excerpts each + closing tagging-pattern paragraphs. The Italian agent's output is the most compact (matching §12.5 Mexican shape); the European agent's is the longest (matching §13.1 African density). Single integration pass; no math-reconciliation corrections at integration time (those came post-integration via the pre-push reviewer, below). Pre-push code-reviewer agent caught 1 P1 + 3 P2 findings: (P1) §14.1 Notes line cited "EUR-01 through EUR-15" but the register only has 14 entries — one-character fix; (P2) §14.2 cohort math acknowledged ONE double-count (Where Does Pizza in both Italian + Greek) but not the SECOND (Sandwich Swap in both B-pan-Med and cross-cluster anomalies) — fixed with explicit parenthetical noting both overlaps reconcile 41 → 39; (P2) EUR-14 register entry's "other country-specifics use depth 3" framing missed the "no other CORPUS country-specifics" qualifier carefully used in §14.8 Notes — French is also depth-2 under v3 baseline, just corpus-absent; (P2) §14.6 Ukrainian Notes characterized the v3 combined canonical as a "v3 documentation artifact" — overclaims relative to the more neutral framing in EUR-12 and §14 framing block decision #1. All 4 accepted + fix-up'd in commit (TBD when pushed). **Seventh substantive Stage 1 pre-push agent catch** (counting Sessions 60-66 + 68; Session 67's 0-finding round was on a status-doc-only diff with no substantive content to review). Pattern continues to earn dispatch every time.
- **141K MCP response cap is the working ceiling for body-fetch queries.** First attempt to fetch ~58 lesson bodies with 2000-char excerpts in one query returned 141K characters and was rejected; fell back to metadata-only listing (~10K) + targeted per-cluster body fetches via subagents. Worth noting as a working pattern for future cluster fills — when the cluster's union-of-lessons exceeds ~50 with body content, split into ≤2 queries OR rely on subagent-side fetches.
- **§14 fill produced more Stage 2 audit signals than any prior cluster (14 EUR-NN entries vs 8 AFR, 6 AME, 4 ASI).** Three reasons: (a) European cluster has the heaviest cross-cluster Cohort C signal in absolute terms (11 lessons paired with Americas/Latin American/Mexican/North American — Italian-American + Spanish-Latin-American colonial-origin + European-immigrant); (b) the duplicate Tortilla Española + duplicate Varenyky-drift rows surface dedup-pipeline-adjacent signals not seen in prior clusters; (c) the Italian recipe-vehicle question (September Salsa Toasts; Following Instructions; Alternative Proteins) is a distinct over-tag class — single-word vocabulary / inherited recipe-vehicle tags rather than primary cuisine framing. Worth flagging to curriculum team that Stage 2 reviewer-validation effort on the European cluster is heavier per-row than other clusters.
- **EUR-11 explicitly reframes AME-06 (cross-cluster audit-signal coordination).** Session 64 flagged the empanada Spanish + Mediterranean + European tag as "over-tagged based on a single body sentence" (AME-06). Session 68's direct body read of all 3 empanada lessons shows the framing is more than one sentence — bodies explicitly invoke "popular in Latin America but have origins in Spain" pedagogical structure. EUR-11 captures the reframe and §9.2's Mediterranean-primary resolution. First explicit cross-cluster audit-signal coordination in the register.

**Audit signals surfaced for Stage 2 re-tag (14 total — EUR-01 through EUR-14):**

See `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md` for full table rows. Summary:

- **EUR-01** Green Room Party single-`European` under-tag
- **EUR-02** Cellular Respiration + Microbiome science-lesson Mediterranean+European over-tag (parallel to AFR-07 legacy-auto-tagging pattern)
- **EUR-03** Following a Recipe + Kitchen Cognates Cohort C over-tag (no European-origin in either body)
- **EUR-04** Microbiome strips `Greek` country tag from the same tzatziki recipe as Tzatziki
- **EUR-05** Duplicate Tortilla Española rows
- **EUR-06** September Salsa Toasts Italian over-tag (one-word "Crostini" etymology on a Mexican-salsa lesson)
- **EUR-07** Italian recipe-vehicle over-tags (Following Instructions + Alternative Proteins as inherited rather than primary)
- **EUR-08** Cohort C Mediterranean carry-along over-tags (Food Preservation + Tastes Around the World + Sandwich Swap, parallel to AFR-04 Seed & Date Balls)
- **EUR-09** Pasta Party drift body anchors Italy/Tuscany — should pick up canonical chain
- **EUR-10** Varenyky drift duplicate of canonical Varenyky row
- **EUR-11** Spanish multi-parent §9.2 disposition + AME-06 reframe coordination
- **EUR-12** v3 Russian/Ukrainian combined-canonical retirement
- **EUR-13** Empanadas & Corn Salad Mediterranean omission + Mexican co-tag reviewer-validation
- **EUR-14** Irish depth-2-vs-depth-3 asymmetry — sub-region canonicalization decision

**For next session (Stage 1 Session 69 = PR #487 review cycle, mirroring Sessions 63 / 65 / 67):** see Next session contract block at top of doc. Triage bot review findings on PR #487, apply round-1 + round-2 fix-ups as needed, reach squash-merge. Session 70 Middle Eastern fill follows after PR #487 merges.

**Out-of-scope follow-ups (this session):** the 141K MCP response cap is a working ceiling worth noting for future cluster-fill queries; the EUR-11 cross-cluster audit-signal coordination is the first explicit register-level reframe and may warrant a register-section convention if it recurs across cluster fills (single-occurrence so far, not yet promoted).

---

### Session 67 — 2026-05-11 — PR #484 review cycle (round-1 fix-ups + round-2 default-reject + squash-merge + direct-to-main backfill)

**Branch:** `docs/stage1-heritage-african-cluster` (continued from Session 66; squash-merged 2026-05-11 02:54 UTC as `7894a47`; origin auto-deleted via `--delete-branch`; local auto-switched to main on merge).

**Done:**

- Triaged 3 round-1 bot reviewers: Claude auto-bot (02:23 UTC), Codex manual (02:36 UTC), Hermes manual (02:42 UTC). Codex + Hermes converged on the same P3 finding: worksheet §13.1 Notes citing private `MEMORY.md` is not portable to curriculum-team handoff. Hermes added 3 single-voice doc-staleness nits: (1) Stage 1 status doc Current state had duplicate Asian-cluster shipped sentence; (2) foundation status doc archival paragraph said "Sessions 52-65" but Session 66 had landed; (3) foundation status doc worksheet pointer said "per-value entries TBD subsequent sessions" but Asian/Americas/African clusters were complete. Claude auto-bot's 3 P3 observations were stylistic single-voice (§13.4 Sri Lankan reference being insider-y, `<to_fill>` confirmation, "additionally country-tag" phrasing).
- Accepted all 4 Codex/Hermes findings (2-voice MEMORY.md + 3 Hermes doc-staleness). Rejected all 3 Claude auto-bot stylistic findings per the internal-only-docs hardening pattern (`feedback_pr_bot_review_workflow.md`).
- 1 round-1 fix-up commit `923790b` covering all 4 accepted findings: worksheet §13.1 Notes + Stage 1 status doc audit-signal bullet (`MEMORY.md` citation → "plausible legacy auto-tagging artifact; flag for Stage 2 reviewer validation"); Stage 1 status doc Current state duplicate Asian sentence removed (fuller Session-63-noting version retained); foundation status doc archival paragraph "Sessions 52-65" → "52-66" + parenthetical extended with `Session-66 PR #484 African-cluster`; foundation status doc worksheet pointer updated to reflect Asian (§11) / Americas (§12) / African (§13) complete with remaining clusters TBD.
- Round-2 auto-Claude landed with verdict "Approve. Ready for squash-merge." Claude flagged 3 forward-looking single-voice low-priority hardening suggestions: (1) §13.10 parser-invariant restatement if pattern recurs in §14-15; (2) §13.4 East African cross-entry dependency note for §13.7/§13.8 parent reassignments; (3) §9.2 Egyptian Stage-2-convergence emphasis for ful medames re-tagging. All self-rated "low priority" / "minor" / "derivable from context". All 3 rejected per round-cap default-reject hardening for internal-only docs.
- PR #484 squash-merged 2026-05-11 02:54 UTC as `7894a47`.
- Pre-push code-reviewer agent on the round-1 fix-up diff reported 0 findings (clean status-doc text fixes). Sessions 60-66's "6 consecutive catches" streak doesn't extend (no bugs to catch this round), but the dispatch-every-time discipline held.
- Session 67 status doc updates + PR #484 hash backfill committed directly to main (user explicitly authorized; precedent break from Sessions 64/66's pattern of "first commit on next session's new branch").

**Decisions made this session:**

- **Wait-for-auto-Claude-only on round-2 (user choice).** User selected "Wait for auto-Claude only" over "Dispatch Codex + Hermes too" for round-2 — smallest diff in the round set (5 lines docs-text); auto-Claude was sufficient signal. Skipping the manual reviewers shaved ~5-10 min off the round-cap and worked cleanly: auto-Claude's 3 P3 suggestions were all rejectable, no real bug needed catching.

- **Direct-to-main push for Session 67 cleanup (precedent break, user-authorized).** Sessions 64 + 66 backfilled the previous PR's squash hash as the first commit on the next cluster's new branch. Session 67 framed the cleanup as "push to main directly" + user confirmed. Rationale: this session's work was a review cycle for PR #484 with no new substantive content beyond status doc updates; gap between Session 67 end and Session 68 (European cluster) start could leave the status doc stale (Current State header would still say "PR #484 OPEN" if backfill deferred). Direct-to-main commit closes that gap. Future Session 68 starts cleanly on main at `7894a47` with no Session 67 backfill task to do first.

**Process notes / observations:**

- **Two-voice convergence held as P1 signal even on docs-only round-1.** Codex + Hermes both flagged the `MEMORY.md` citation independently. The match-up was on substance, not coordination — strong real-bug signal even on a tiny docs PR. Consistent with the convergence-as-P1 pattern from `feedback_pr_bot_review_workflow.md`.
- **Default-reject hardening saved cycles on stylistic auto-bot findings.** Auto-Claude's 3 round-1 observations and 3 round-2 suggestions were all default-reject candidates. None warranted a fix-up cycle. Total findings landed: 4 substantive (2-voice MEMORY.md + 3 Hermes doc-staleness) out of 9 raw bot suggestions across 2 rounds (~44% accept rate, consistent with prior cluster PR rounds).
- **Direct-to-main precedent break — single occurrence, watch for recurrence.** If a future review-cycle session bundles cleanup into the next-cluster-branch's first commit (the original Sessions 64/66 pattern), the precedent is restored. If 2-3 future review-cycle sessions take the direct-to-main path, worth promoting the new pattern. Not promoting to durable feedback memory yet (single occurrence).
- **Pre-push reviewer agent value on 0-finding rounds.** Worth noting that even when no bugs are caught, dispatching the agent on small diffs costs little and confirms the diff is clean. The discipline holds.

**For next session (Stage 1 Session 68 = European cluster):** see the worksheet §14 framing block + the "For next session" block in Current state above. Branch off main at `7894a47`.

### Session 66 — 2026-05-10 — African cluster per-value entries populated

**Branch:** `docs/stage1-heritage-african-cluster` (off `main` at `fc45a96`, the PR #483 squash-merge).

**Done:**

- Backfilled PR #483 squash-merge hash (`fc45a96`, merged 2026-05-11 01:37 UTC) in this status doc's Session 65 entry + Current state header + Last-updated line + foundation-phase status doc's Current State header + Branches block. (Commit `4a89ce9`.)
- Verified African cluster's 10 corpus values against TEST DB. Counts match the §13 framing block exactly (African 41, West African 15, North African 2, East African 1, Egyptian 2, Kenyan 2, Nigerian 2, Ethiopian 1, Moroccan 1, `african` 1) — plus the cross-cluster `African American` 24 / `African American diaspora` 2 / kebab-case `african-american` 0 baseline for diaspora-pairing-rate computation.
- Populated worksheet §13 with all 10 per-value entry blocks: 1 cluster root (African) + 3 sub-regions (West African v3, North African NEW, East African NEW) + 5 country-specifics (Nigerian re-parented under West African, Egyptian multi-parent, Kenyan NEW, Ethiopian re-parented under East African, Moroccan multi-parent) + 1 kebab-case drift merge entry (`african`). (Commit `635ed10`.)
- Dispatched 2 parallel Opus corpus-read agents — African (41) + West African (15). Each returned a worksheet-ready `<details>` corpus-evidence block; both integrated into §13.1 + §13.2. One numerical correction applied at integration time: §13.2 NA-without-AA count corrected 8 → 7 after direct TEST DB verification revealed 1 NA-with-AA overlap (the BHM black-eyed peas five-tag-stack lesson is both AA AND NA, so distinct NA-without-AA is 7 not 8 of 15).
- Resolved §9.2 multi-parent decisions for Egyptian + Moroccan (both rows previously TBD). Egyptian: corpus splits 1/1 between North African + Middle Eastern (both ful medames lessons, inconsistent tagging convention) — pre-handoff recommendation = North African primary with Middle Eastern multi-parent flag in §13.6 Notes. Moroccan: sole corpus lesson tags `[Moroccan, North African, African]` with body explicitly anchoring "Northern Africa" via map activity — no Middle Eastern corpus signal — pre-handoff recommendation = North African primary, alternative noted only for curricular parity.
- Lower-frequency entries (North African 2, East African 1, Nigerian 2, Egyptian 2, Kenyan 2, Ethiopian 1, Moroccan 1) populated structurally per §4 methodology using direct SQL query on the 11 lesson bodies; no Opus reads needed for these 8 entries.
- Worksheet header + footer status banners updated to Session 66.
- Pre-push code-reviewer agent caught 2 P2 + 1 P3 internal-consistency findings on agent-produced content (P2 §13.1 Notes "Cohort 4 / Cohort D residual" referenced a nonexistent cohort; P2 §13.2 details-summary header bucket arithmetic overlap not reconciled when the 8 → 7 NA-without-AA correction landed in the tagging-pattern paragraph; P3 §13.1 Notes dangling "Audit signals for Stage 2 section" reference to a non-existent section). All 3 accepted + fix-up'd in commit `e49366e`.

**Decisions made this session:**

- **Re-parent Nigerian under West African (corpus-supported).** v3 baseline lists `Nigerian` directly under `African` without a `West African` intermediate. Both corpus Nigerian rows actually tag `[Nigerian, West African, African]` — empirical 2/2 support for re-parent. Pre-handoff structural recommendation: parent = `west-african`. Captured in §13.5 Notes.

- **Re-parent Ethiopian under East African (structural, not corpus-supported).** v3 baseline lists `Ethiopian` directly under `African` without an `East African` intermediate. The sole corpus Ethiopian row tags `[Ethiopian, African]` — does NOT carry `East African`. Pre-handoff recommendation re-parents under the proposed NEW `east-african` sub-region for structural parity, accepting that 0/1 corpus rows currently match. Stage 2 backfill would add `East African`.

- **Parent Kenyan under East African (structural, not corpus-supported).** Kenyan is a NEW canonical (not in v3); both corpus Kenyan rows tag `[Kenyan, African]` and `[Kenyan, African, Brazilian, ...]` — neither carries `East African`. Same structural pre-handoff recommendation as Ethiopian.

- **§9.2 multi-parent — Egyptian primary = North African (with Middle Eastern flag).** Corpus splits evenly 1/1 between the two cluster placements (both ful medames lessons disagree). Apply §9.2 decision rule (cultural/culinary heritage tradition the lesson body invokes): both lessons treat the dish as Egyptian, no Middle Eastern-specific framing in either body. Pre-handoff = North African primary with Middle Eastern noted as multi-parent alternative — curriculum team validates whether to switch or maintain. Mirrors Session 64 Puerto Rican precedent (single-parent pre-handoff + Notes-level multi-parent flag).

- **§9.2 multi-parent — Moroccan primary = North African (no Middle Eastern signal).** Sole corpus lesson tags `[Moroccan, North African, African]` with body explicitly anchoring "Northern Africa" via map activity. No Middle Eastern corpus signal whatsoever. Pre-handoff = North African (clear).

- **Filter-UI tier — `sub` for North African (2) + East African (1) despite low frequency.** Structural rationale: both fill canonical-home gaps for country-specifics (North African for Egyptian + Moroccan; East African for Kenyan + Ethiopian). The §6 default threshold (`sub` at ≥5) is overridden on cluster-structural grounds, mirroring §11 Central Asian (4 lessons → sub) precedent. Curriculum team may downgrade to `internal` if the new-sub-region status doesn't earn the chip.

- **Cluster decision summary block — left TBD per curriculum-team-fill convention.** Same pattern as §11 + §12.

**Process notes / observations:**

- **2 parallel Opus agents landed cleanly.** ~117s + ~141s per agent for African (41) + West African (15). Both produced worksheet-ready `<details>` blocks with 4 + 6 representative excerpts and 5-8 sentence tagging-pattern paragraphs + 5-6 audit-signal bullets each. Integration was mechanical Edit work + one numerical correction (the §13.2 NA-without-AA 8 → 7 fix at integration time).

- **Cohort C diaspora-heavy pattern is the African cluster's defining characteristic.** 25 of 41 African-tagged lessons (61%) tag `African` alongside `African American` and/or `West African` and/or `Americas/North American` — Black History Month, Juneteenth, post-Civil War foodways, Callaloo. This is the most diaspora-heavy cluster root in the corpus to date (vs Asian's 4/63 Cohort A pan-region or Americas's primarily-hierarchical-parent 142/170 ancestry). West African (sub-region) inherits the pattern even more sharply — 14/15 (93%) carry at least one cross-cluster tag, with 12/15 carrying a specific diaspora-cluster tag (3 AA + 2 Caribbean + 7 NA-without-AA) and only Nigeria/Red Bean Stew (1/15) pure West African + African.

- **Egyptian's 1/1 corpus split exposes the multi-parent question empirically.** Two ful medames lessons disagree on cluster placement: `[Egyptian, North African, African]` vs `[Egyptian, Middle Eastern, African]`. Same dish, different framings — the multi-parent question is real in the corpus, not just theoretical. The §13 framing block decision #2 was right to flag it; §9.2 pre-handoff recommendation defers the final call to curriculum team while picking North African as the primary anchor. The two ful medames lessons should converge on a single tagging convention post-curriculum-team handoff (Stage 2 follow-on).

- **Pre-push code-reviewer agent SIXTH consecutive Stage 1 PR commit catch.** Sessions 60-66 each had pre-push agent catch real bugs missed by self-review. The two Session 66 P2 findings (Cohort 4 misreference; §13.2 header arithmetic overlap) are the same class as Session 62 + 63 + 65's math/count consistency catches. Pattern: dispatch the agent every time on docs PRs too — fresh-eyes review is exactly the value-add for long-text content with internal cross-references and bucket arithmetic.

- **Process lesson candidate — when integration corrects an agent's numerical claim, sweep ALL related claims in the same entry.** The Session 66 8 → 7 NA-without-AA correction landed cleanly in the tagging-pattern paragraph during integration but the parallel claim in the details-summary header was not re-reconciled. Pre-push agent caught the second instance. Similar pattern to PR #483 Session 65 fix-up's 3-spot Caribbean math reconciliation. Worth flagging as a candidate `feedback_*.md` rule if it recurs in PR #485-486 sessions — for now noted as single-occurrence reinforcement of the existing multi-spot math-reconciliation pattern in `feedback_pr_bot_review_workflow.md`.

- **Stop-point heuristic continues to hold.** African at ~10 entries completed comfortably within the session — smaller than Asian (18) and Americas (22), with more cycles spent on §9.2 multi-parent investigation than on per-value drafting (2 ful medames lessons + 1 Moroccan lesson needed direct SQL body inspection to decide). Future smaller-cluster sessions (Middle Eastern at ~8 entries) likely complete with similar comfort.

**Audit signals surfaced for Stage 2 re-tag (8 total):**

- **Inconsistent Carver content tagging** — `In the Garden with Dr. Carver` tags `[African, African American, Americas]` correctly; sibling `Lotion & Agar Soap` K + MS tag `[African, North American]` (missing `African American` despite identical author/subject — Dr. George Washington Carver). Backfill `African American + Americas`.
- **Under-tagged Wangari Maathai content** — `October Seed Saving` tags `[Kenyan, African]` correctly; sibling `Wangari Maathai 4th/5th` tags only `[African]` despite same source body. Backfill `Kenyan + East African` (post-PR-484 if East African canonicalizes).
- **Under-tagged African American cohort (7-8 lessons)** — Juneteenth × 4, BHM cornbread, Newly Freed Americans, BEP Stew, BEP Hummus tag `West African + North American` but omit explicit `African American` despite content alignment. Cross-references §12.2 North American Cohort A finding.
- **Over-tagged Seed & Date Balls** — `[West African, African, Americas, Asian]` based on single body sentences about Carolina rice cultivation + Asian arid-region seed-ball use. Drop both `West African` and `Asian` (the lesson is springtime gardening + a date-ball snack).
- **Egyptian tagging inconsistency** — 2 ful medames lessons use different cluster placements (North African vs Middle Eastern). Whichever curriculum team picks, the other lesson should be re-tagged.
- **Edmond Albius under-tagged** — `[African, African American diaspora]` but body identifies Réunion (East African / Indian Ocean French colony). Missing East African sub-region + plausibly mis-labeled `African American diaspora` (Albius was Réunionnais, not African American).
- **`5th Grade Food Cultures Unit Overview` heritage-array anomaly** — tags `[Latin American, Asian, African, European]` but body keywords list "Ukraine, Uzbekistan, Pakistan, China, Mexico, Caribbean Islands, New York" — no African country. Plausible legacy auto-tagging artifact; flag for Stage 2 reviewer validation. Drop `African` unless the unit's 6 daughter lessons surface African content.
- **East African sub-region under-tagging** — 0/2 Kenyan + 0/1 Ethiopian lessons currently carry `East African`. If §13.4 East African canonicalizes as `new`, Stage 2 should backfill on all 3 rows.

**PR #484 squash-merged 2026-05-11 02:54 UTC as `7894a47`.** Hash backfill done directly on main in Session 67 (see Session 67 entry below).

**For next session (Stage 1 Session 68 = European cluster per-value fill):** see "For next session" block above. NO hash backfill task — Session 67 did the PR #484 hash backfill directly on main (precedent break, user-authorized; see Session 67 entry below).

**Out-of-scope follow-ups (this session):** the multi-spot math-reconciliation pattern surfaced at integration time is now a clear reinforcement of the same pattern caught at Sessions 62 + 63 + 65 — promote to `feedback_pr_bot_review_workflow.md` as a confirmed pattern if it recurs in PR #485 or later. Single-occurrence on top of the existing rule for now.

---

### Session 65 — 2026-05-10 — PR #483 review cycle (round-1 fix-up + round-2 default-reject + two-voice convergence)

**Branch:** `docs/stage1-heritage-americas-cluster` (continued from Session 64).

**Done (1 fix-up commit + 1 status-doc session-end commit):**

- **Round-1 cycle.** Collected from all 4 PR surfaces. Claude verdict "Ready to merge" with 4 lower-priority observations + 2 nitpicks; Codex (manual dispatch) flagged 2 P2 doc-consistency findings. Accepted 2 P2 + 1 Claude nitpick → `ea0c443` (Session 65 round-1 fix-up):
  - **Codex P2.1 — multi-parent / Decision 1 misattribution.** Status doc:121 + worksheet §12.4 Notes:917 both wrongly attributed multi-parent flexibility to Session 59 design decision #1 (which governs hierarchy DEPTH, not multiple simultaneous parents). Reframed both spots: Decision 1 governs depth, not multi-parent membership; multi-parent ambiguity (Puerto Rican today, future Egyptian / Moroccan per §13) captured at Notes-level; adding `parents:` plural would be a future schema/worksheet decision. Critical because Session 64's status doc Puerto Rican bullet is the named precedent for the African-cluster Egyptian/Moroccan multi-parent plan — propagating the misattribution there would have continued the error.
  - **Codex P2.2 — Caribbean cohort math.** §12.4 summary line 907 ("11 with a Caribbean country tag" — wrong; cross-cluster carry-ins aren't country-tagged), tagging-pattern paragraph line 913 ("11 distinct lessons; 12 tag-appearances" — "12" doesn't match any clean interpretation; legacy framing from cb7a316), and Notes line 917 ("= 8 distinct country-tagged lessons" — wrong; 8 is tag-appearances, 7 is distinct) reconciled across all 3 spots: 7 country-tagged distinct lessons (8 country tag-appearances since Rice & Beans dual-tagged Cuban+Jamaican) + 4 cross-cluster carry-ins = 11 Cohort 1 distinct lessons. Total: 11 + 4 + 2 = 17 ✓.
  - **Claude nitpick — §12.20 corpus-scale hedge.** "(and one of the largest in the whole corpus)" parenthetical dropped; Americas-cluster-scope claim retained (verifiable from §12.19-22 directly: 13 > 4 > 1 > 1).
  - **Default-rejected (round 1).** 4 Claude observations (§12.4 Caribbean tier in decision summary; §12.14 Guyanese cluster decision callout; §12.12 Brazilian conditional callout; Puerto Rican multi-parent → locked-design-decision candidate) + 1 Claude meta-nitpick (PR-cycle archival range observation). Reasoning: internal-docs default-reject hardening; 4 Claude observations were polish for things already in Notes; Puerto Rican multi-parent question more cleanly addressed by Codex P2.1 misattribution fix.
- **Pre-push code-reviewer agent (Opus, feature-dev:code-reviewer) on the fix-up diff returned CLEAN.** Verified math consistent across all 3 §12.4 spots (11 in Cohort 1 = 7 country-tagged + 4 carry-ins; 8 country tag-appearances ÷ 7 distinct lessons), §12.20 cross-reference to §11.16 still valid, status doc + worksheet §12.4 wording on multi-parent / `parents:` plural mutually consistent. **First clean agent return after 7 consecutive pre-push catches on the Stage 1 track** (Sessions 60 da09777, 61 a5b584b, 62 df39f07, 63 18ff1ef + b5e4ebe, 64 ea64812 + cb7a316). Not a streak "break" — the agent did useful work confirming math-reconciliation was correctly applied across the 3 §12.4 spots, which is exactly the class of multi-spot edit where independent verification matters most.
- **Round-2 cycle.** claude-review round-2 returned 4 minor/informational findings (F1 drift `parent` semantically misleading; F2 Guyanese parent placeholder anchoring; F3 Dominican parity convention; F4 `americas` drift `parent: null` claimed inconsistency). All 4 default-rejected per internal-docs hardening:
  - F1: §7 parser invariant already covers the operational concern (filter on verdict before keying canonical_key); matches §11 precedent; not worth diverging mid-Stage-1.
  - F2: same as Claude's round-1 observation; Notes cover it; Claude himself wrote "no action needed before curriculum-team review."
  - F3: handoff question already captured in status doc framing ("Worksheet structure can converge on a single convention at curriculum-team handoff time"); curriculum team will see all §11 + §12 entries together and decide convention then.
  - F4: based on misread — verified §12.19-22 directly that ALL drift entries inherit from their merge_into target's parent. `americas` drift inherits `null` because canonical Americas has null parent (cluster root); §12.20-22 inherit `americas` because their canonicals have parent `americas`. Pattern is uniform; Claude was reading surface variation without inferring the inheritance.
- **Codex round-2 (manual dispatch).** Independently verified all 3 round-1 fix-ups landed correctly + reached identical reject-all verdict on Claude's 4 round-2 findings with matching rationale. Verdict: "ready to merge from my side."

**Process notes / observations:**

- **Two-voice convergence on REJECT is the inverse signal of convergence on FINDING.** Existing memory `feedback_pr_bot_review_workflow.md` captures Claude+Codex convergence on a finding as a P1 signal. PR #483 round-2 surfaced the inverse: when both voices independently triage the same finding-set to "reject all," that's high-confidence default-reject confirmation. Same signal mechanism in both directions. Worth flagging for promotion to the memory file if it recurs in PR #484+ (PR #482 round-2 had a similar reject-pattern but only 1 voice; PR #483 is the first 2-voice reject convergence).
- **Claude F4 misread pattern.** An LLM reviewer can flag "inconsistency within X group" when the pattern is actually "each X inherits from Y" but X's Y values happen to vary (some null, some non-null). Surface variation reads as inconsistency without the inheritance inference. If this recurs in African / European / Middle Eastern drift sweeps (which will have the same inherit-from-merge_into-target pattern), worth a §7 sentence stating the inheritance convention explicitly. For now, single occurrence; §7 parser invariant + Notes are operationally sufficient.

**PR #483 squash-merged 2026-05-11 01:37 UTC as `fc45a96`** (verified via `gh pr view 483 --json state,mergedAt,mergeCommit`; backfilled this Session 66 housekeeping commit).

**For next session (Stage 1 Session 66 = African cluster per-value fill):** see "For next session" block above; first task = backfill PR #483 squash-merge hash in this entry + Current state header + foundation-phase status doc's PRs-SHIPPED list + Branches block.

---

### Session 64 — 2026-05-10 — Americas cluster per-value entries populated

**Branch:** `docs/stage1-heritage-americas-cluster` (off `main` at `d58eb59`, the PR #482 squash-merge).

**Done:**

- Backfilled PR #482 squash-merge hash (`d58eb59`) in this doc's Session 62 entry + Current state header + in foundation-phase status doc's PRs-SHIPPED list + Branches block.
- Verified Americas cluster's 22 corpus values against TEST DB. Counts match the Session 59 framing block exactly (Americas 170, North American 83, Latin American 77, Caribbean 17, Mexican 38, Puerto Rican 4, Salvadoran 2, Honduran 2, Cuban 2, Jamaican 2, Peruvian 2, Brazilian 1, Ecuadorian 1, Guyanese 1, Central American 1, South American 1, Southern United States 1, Dominican 0, plus 4 kebab-case drift literals).
- Populated worksheet §12 with all 22 per-value entry blocks: 1 cluster root (Americas) + 3 sub-regions (North American, Latin American, Caribbean) + 10 country-specifics (Mexican, Puerto Rican, Salvadoran, Honduran, Cuban, Jamaican, Peruvian, Brazilian, Ecuadorian, Guyanese) + 3 NEW sub-region candidates (Central American, South American, Southern United States) + 1 v3-canonical-corpus-absent (Dominican) + 4 kebab-case drift entries (`americas`, `north-american`, `latin-american`, `caribbean`).
- Dispatched 6 parallel Opus corpus-read agents — Americas (170), North American (83), Latin American (77), Caribbean (17), Mexican (38), Puerto Rican (4). Each returned a worksheet-ready collapsible `<details>` block. All 6 integrated into the corresponding §12 entries.
- Lower-frequency entries (Salvadoran 2, Honduran 2, Cuban 2, Jamaican 2, Peruvian 2, Brazilian 1, Ecuadorian 1, Guyanese 1, plus 3 NEW sub-region candidates + Dominican 0) populated structurally per §4 methodology with Notes-block proposals; no Opus read needed.
- Ran 2 supplementary TEST DB queries to resolve a cross-agent disagreement on diaspora-to-North-American pairing rates: African American 16/24 (67%); Indigenous 19/24 (79%); Lenape 3/7 (43%); Native American 3/5 (60%). Used to ground the §12.1 + §12.2 Notes.

**Decisions made this session:**

- **Dominican included as a per-value entry despite 0 corpus appearances**, diverging from §11 Asian cluster's precedent for Filipino / Thai / Bengali (handled at cluster-decision-summary level only). Rationale: §12 framing decision #5 explicitly asks the verdict at per-value level (per Session 63 round-1 F1 fix-up). Worksheet structure can converge on a single convention at curriculum-team handoff time.

- **Cajun/Creole left in cross-cluster §9.1 per §12 framing decision #5 default.** Not added as §12 per-value entry. §12 cluster decision summary will surface the §9.1-vs-§12 question explicitly when curriculum team fills.

- **Puerto Rican parent set to `latin-american` (v3 baseline) despite empirical multi-parent signal.** Notes flag the corpus signal (4/4 PR lessons stamped with both Caribbean AND Latin American) and surface the multi-parent decision as a curriculum-team call. Session 59 design decision #1 (2-level-flexible parent chains) governs hierarchy depth, not multi-parent membership; the worksheet's per-entry shape is single-parent. Multi-parent ambiguity (Puerto Rican today, future Egyptian / Moroccan per §13) is captured at Notes-level today; adding a `parents:` plural field convention would be a future schema/worksheet decision, not something already accommodated by Decision 1.

- **Filter-UI tier proposals — frequency default with v3-canonical override.** Same pattern as Asian cluster. North American (83) + Latin American (77) → `top` (well above ≥40); Caribbean (17) → `sub` (between sub and top thresholds, curriculum team may promote given v3 status); Mexican (38) → `sub` (just under top threshold but biggest country); Puerto Rican (4) → `sub` despite frequency below ≥5 bar (v3 canonical + cluster-decision relevance + multi-parent question support sub-tier); 2-lesson countries → `internal` (below sub bar) with note flagging v3-canonical (Salvadoran, Jamaican) for possible promotion; all 1-lesson + NEW + 0-frequency entries → `internal` proposals.

**Process notes / observations:**

- **6 parallel Opus agents landed cleanly.** Same pattern as Session 62 (7 agents); ~45-105s per agent depending on corpus size + total token usage. Each returned a worksheet-ready `<details>` block; integration was mechanical Edit work. Pattern generalizable — next session's African cluster expects ~2-3 Opus reads (African 41, West African 15, plus optionally North African 2 / East African 1 NEW candidates).

- **Cross-agent disagreement caught + resolved via direct TEST DB query.** Americas agent (Agent 1) claimed AA/Indigenous lessons don't route through `North American`; North American agent (Agent 2) claimed every AA-tagged lesson DOES carry `North American`. Two TEST DB COUNT queries settled it: partial pairing (67% AA, 79% Ind, 43% Lenape, 60% Native American), neither agent fully right. Both agent claims rephrased in the integrated §12.1 + §12.2 Notes to reflect empirical reality. **Process lesson:** when parallel agents disagree on a load-bearing claim, run a precise resolving query before integrating into the worksheet. Worth promoting to a `feedback_*.md` rule if it recurs.

- **Multi-parent question surfaced empirically by Puerto Rican.** 4/4 PR lessons in the corpus carry both `Caribbean` AND `Latin American`. The per-value shape (single `parent:` line) doesn't directly encode multi-parent; Notes flag is the right interim solution. Worth surfacing at end-of-Stage-1 curriculum-team review whether the worksheet shape needs a `parents:` (plural) field convention or whether Notes-level handling is permanent.

- **Corpus-read evidence surfaced audit signal beyond verdict-input data.** Specifically:
  - **`Bats & Banana Pancakes` over-tagged with `Caribbean + Latin American + Americas`** (lesson body is about Southeast Asian banana origins + bat-pollinator biology; only one body sentence mentions LA/Caribbean banana export economies).
  - **`Flies & Fruit` over-tagged similarly** (mixes South Asian + Caribbean + Latin American + Americas).
  - **`Descriptive Language` and `Our Garden and Kitchen Community` over-tagged with `Caribbean + Latin American + Americas`** (no body content surfacing a clear regional framing).
  - **`Three Sister Arepas` and `Three Sisters Empanadas` missing country tags** (lessons cover Colombian/Venezuelan dishes but tagged only `Latin American + Americas`).
  - **`Empanadas` lesson over-tagged with `Spanish + Mediterranean + European`** based on a single body sentence about Spanish origins.
  - **`Monarch Migration` uses `Mexican` for geographic-place tagging** rather than cuisine/culture — borderline use of `culturalHeritage`.

  All flagged for Stage 2 re-tag. Body-content fact-check (e.g., the geographic accuracy of lesson explanations) is outside Stage 1's scope.

- **Diaspora-NA pairing inconsistency is the load-bearing finding for Stage 2 prep.** 8 African American lessons + 5 Indigenous + 4 Lenape skip `North American` in the corpus. Stage 2 should decide: backfill NA for all diaspora lessons (geographic-parent convention) OR leave as-is (identity-tag-anchors-placement convention). Worth a curriculum-team-level discussion at Stage 2 prep time.

- **Session boundary held at one cluster.** Stop-point heuristic from "For next session" felt right — 22 entries took the bulk of the session (corpus queries + 6 parallel agent dispatches + entry drafting + integration + 2 supplementary resolution queries). African at ~10 entries is naturally smaller scope; may complete with cycles to spare.

**For next session (Stage 1 Session 65 = African cluster).**

- Branch off `main` at this session's PR squash-merge (TBD until PR opens + merges).
- Populate African cluster per §13 framing block — ~10 entries (cluster root + 3 sub-regions + 5 country-specifics + 1 kebab-case drift; plus §9.2 multi-parent decisions for Egyptian + Moroccan).
- Dispatch ~2-3 Opus corpus-read agents: African (41 — cluster root), West African (15 — major sub-region). Optionally one of the NEW candidates (North African 2, East African 1) if curriculum team wants verification.
- Address §9.2 multi-parent for Egyptian (2) + Moroccan (1) — geographically North African, culturally Middle Eastern.
- Stop at end of African cluster.

**Out-of-scope follow-ups (this session):** none new. The "process lesson" about resolving cross-agent disagreement via direct TEST DB query is a candidate `feedback_*.md` rule promotion if it recurs (single-occurrence so far).

---

### Session 63 — 2026-05-10 — PR #482 review cycle (round-1 + round-2 + 2 pre-push agent fix-ups)

**Branch:** `docs/stage1-heritage-asian-cluster` (continued from Session 62).

**Done (4 fix-up commits):**

- **Commit 1 (`2b3158f`):** PR #482 round-1 fix-ups for 2 accepted findings from claude-review + Codex:
  - **F1 (convergent claude + Codex P2 — Americas next-session count math):** Stage 1 status doc Americas plan had wrong category counts (Puerto Rican 4 miscategorized into "2 lessons" bucket; NEW sub-region candidates conflated with 1-lesson country-specifics; Dominican v3-corpus-absent omitted). Regenerated bullet from §12 with separate buckets per category; Cajun/Creole flagged as Session-64 decision per §12 #5 (default cross-cluster §9.1).
  - **F2 (Codex P2 — stale scaffold banner):** worksheet header said `Status: SCAFFOLD` and "Per-value entries are not yet populated"; footer said "End of worksheet scaffold." Both contradicted §11 being fully populated. Updated header SCAFFOLD → PRE-HANDOFF (per worksheet's own staging diagram); footer + staging diagram tightened to timing-agnostic.
  - Tangential cleanup: foundation-phase status doc Session 62 "For next session" line had imprecise breakdown; collapsed to topline + pointer at §12 / Stage 1 status doc as single source of truth.

- **Commit 2 (`18ff1ef`):** pre-push code-reviewer agent caught 2 more findings on top of round-1:
  - **P2:** `≥3 lessons (1): Mexican (38)` self-contradictory (≥3 includes Puerto Rican 4 but PR is in next bucket). Rephrased to `≥10 lessons` to capture Mexican alone.
  - **P3:** Cajun/Creole bracket framing required cross-reading §12.5 and §9.1; rephrased to "current home §9.1; §12 decision #5 may move to Americas" — explicit about §9.1 being live home.

- **Commit 3 (`fa56c9a`):** PR #482 round-2 fix-ups for 3 accepted findings (3 rejected per round-2 default-reject hardening for internal-only docs):
  - **Convergent (Claude P2 + Codex P3) — §7 parser invariant:** identity-shaped drift entries (§11.16-18 each carry `canonical_key` matching their `merge_into` target) would silently collide with their canonical sources if a downstream parser keys raw entries by `canonical_key` before filtering on verdict. Added explicit MUST: filter on `verdict in ('keep', 'new')` BEFORE keying canonical vocabulary. Inserted as new caveat parallel to "Skipped entries" in §7.
  - **Codex P2 — session-number collision:** line 31 "For next session" said "Stage 1 Session 63 = Americas cluster" after lines 3 + 13 redefined Session 63 as the round-1 fix-up cycle. Bumped to Session 64. Historical Session 62 entry's pointer (line 150 at the time) left as-is per Sessions 60→61 precedent (planned-at-the-time numbering can drift; only active pointers update).
  - **Codex P3 — stale line 23 Americas summary:** "What's NOT done" line still had imprecise breakdown; tightened to topline + pointer at corrected "For next session" block.
  - 3 rejected per round-2 default-reject hardening: Claude P3 filter-UI tier exception central reconciliation (defer to PR 5+/handoff); Claude P3 Sri Lankan body geography (outside Stage 1 scope by Claude's own framing); Claude minor §11.16 phrasing polish.

- **Commit 4 (`b5e4ebe`):** pre-push code-reviewer agent on round-2 caught 1 more:
  - **P3 §7 wording ambiguity:** "Drift entries contribute only to the `alias_map` output" parses two ways (drift-exclusively-alias-map vs alias-map-only-from-drift). Added "(not to the `canonical` array)" to anchor the intended reading without changing semantics. The other P3 (banner timestamp Session 62 → Session 63) correctly declined per PR #481 R2.2 precedent — banner tracks substantive content events (per-value entries populated), not fix-up rounds that clarify existing parser conventions.

**Process notes:**

- **Pre-push code-reviewer agent FIFTH consecutive Stage 1 PR commit catch.** Sessions 60-63 each had pre-push agent catch real bugs self-review missed: Session 60 `da09777` (anchor errors + status doc contradiction); Session 61 `a5b584b` (§5.2 heading-depth sweep miss); Session 62 `df39f07` (§11.4 / §11.7 internal-consistency findings); Session 63 `18ff1ef` (≥3 threshold contradiction + Cajun/Creole bracket framing) + `b5e4ebe` (§7 wording ambiguity). Pattern continues earning dispatch every time.
- **Round-cap + default-reject hardening worked cleanly.** 5 accepted findings total across rounds 1 + 2 (F1, F2, §7 parser invariant, session collision, stale line 23 breakdown); 3 rejected from round-2 per kickoff's internal-docs default-reject. Codex's triage of Claude's findings aligned with mine on all 3 rejected (independent verification).
- **Banner-as-content-only convention reaffirmed.** Both round-2 pre-push P3 declines applied the convention from PR #481 R2.2: status doc banner tracks substantive content events (per-value entries populated), not fix-up rounds that clarify existing parser conventions or comment on already-existing entries.

**PR #482 squash-merged 2026-05-10 22:58 UTC as `d58eb59`** (verified via `gh pr view 482 --json state,mergedAt,mergeCommit`).

**For next session (Stage 1 Session 64 = Americas cluster per-value fill):** see "For next session" block above; first task carry-over was backfill of PR #482 squash-merge hash (`d58eb59`) in both status docs.

---

### Session 62 — 2026-05-10 — Asian cluster per-value entries populated

**Branch:** `docs/stage1-heritage-asian-cluster` (off `main` at `e05556a`, the PR #481 squash-merge).

**Done:**

- Backfilled PR #481 squash-merge hash (`e05556a`) in this doc's Session 61 entry + in foundation-phase status doc's PRs-SHIPPED list and Branches block.
- Verified Asian cluster's 18 corpus values against TEST DB. Counts match the Session 59 framing block exactly (Asian 63, East Asian 35, Chinese 15, South Asian 15, Japanese 9, Indian 7, Southeast Asian 5, Central Asian 4, Pakistani 4, Uzbek 4, Korean 3, south-asian 3, east-asian 2, Vietnamese 2, asian 1, Malaysian 1, Sri Lankan 1, Taiwanese 1).
- Populated worksheet §11 with all 18 per-value entry blocks: 1 cluster root (Asian) + 4 sub-regions (East Asian, South Asian, Southeast Asian, Central Asian) + 10 country-specifics (Chinese, Japanese, Indian, Pakistani, Uzbek, Korean, Vietnamese, Sri Lankan, Malaysian, Taiwanese) + 3 kebab-case drift merge entries (`asian`, `east-asian`, `south-asian`).
- Dispatched 7 parallel Opus corpus-read agents — Asian (63), East Asian (35), South Asian (15), Southeast Asian (5), Chinese (15), Japanese (9), Indian (7). Each returned a worksheet-ready collapsible `<details>` block with 2-3 representative excerpts + a tagging-pattern observation. All 7 integrated into the corresponding §11 entries.
- Lower-frequency entries (Pakistani 4, Uzbek 4, Korean 3, Vietnamese 2, Sri Lankan 1, Malaysian 1, Taiwanese 1) populated structurally per §4 methodology with Notes-block proposals; no Opus read needed.

**Decisions made this session:**

- **Filter-UI tier proposals — frequency default with v3-canonical override.** §6 defaults: `top` if ≥40 OR cluster root; `sub` if ≥5 with clear parent `top`; `internal` if <5. I proposed `sub` for the 4 sub-regions despite East Asian (35) sitting under the `top` threshold and Southeast Asian (5) at the `sub` threshold, and for Central Asian (4) + Pakistani (4) + Uzbek (4) below the threshold — rationale: v3 canonical status + clear hierarchical role + sole-parent-for-child-country status. For country-specifics ≤2 lessons (Vietnamese, Sri Lankan, Malaysian, Taiwanese), proposed `internal` per §11 cluster-decision-#2's pre-handoff bar (`sub` at ≥3 lessons). Notes per entry flag deviations and rationale for curriculum-team override.

- **Kebab-case drift entries as separate `merge` records (Convention B).** Per Session 61's planning, drift variants `asian` / `east-asian` / `south-asian` get their own per-value entries with `verdict: merge` rather than being captured as `aliases` on the canonical entries (Convention A). Canonical entries' `aliases: []` accordingly. Tradeoff: Convention B makes the drift visible as first-class corpus content (parser shows drift counts directly); Convention A would have been more compact (one fewer entry per drift). The `alias_map` output is identical under both conventions. Followed Session 61's named count of 18.

- **Verdict left as `<to_fill>` for all canonical entries.** Per §4 spec, verdict is curriculum-team-fill territory. Pre-populating verdict (e.g., `keep` for v3 canonicals, `new` for Sri Lankan) would short-circuit the team's judgment process. Notes per entry flag the strongest candidate verdicts where corpus evidence supports a specific call (e.g., Sri Lankan as `new` candidate based on substantive single-lesson body content).

**Process notes / observations:**

- **Parallel Opus agent dispatch landed cleanly.** 7 agents finished within a single round-trip (~20-45 sec each, ~40-50K total tokens per agent including DB queries). Each returned a worksheet-ready `<details>` block; integration was mechanical Edit work. Pattern is generalizable — Americas (~22 entries, ~6 Opus reads), African (~9 entries, ~3 reads), European (~9 entries, ~3 reads), Middle Eastern (~6 entries, ~2 reads).

- **Corpus-read evidence surfaced real audit signal beyond verdict-input data.** Specifically:
  - **Bánh Mì lesson mis-tagged as `Vietnamese + East Asian + Asian`.** Correct parent chain is Southeast Asian. Flagged in §11.2 East Asian + §11.12 Vietnamese notes.
  - **4 of 15 `South Asian` lessons missing country tags** (Aloo Gobi names Indian + Pakistani; Black Bean Burgers anchors on India). Flagged in §11.3 + §11.9 Pakistani notes.
  - **2 of 5 `Southeast Asian` lessons missing country tags** (Khao Soi → Thai/Lao; Lumpia → Filipino). Flagged in §11.4.
  - **Sri Lankan Curry lesson body geographically mis-locates Sri Lanka as "Southeast Asia"** (it's South Asia). Lesson tagging is correct; body content has factual error. Flagged in §11.3 + §11.13 notes.

  Stage 2 re-tag should pick up the missing country tags. Body-content errors are outside Stage 1's scope but worth surfacing for curriculum-team review.

- **`Asian` cluster root is meaningful — not under-tagging.** 4 of 63 lessons are genuinely pan-Asian (multi-country comparison, world-foods units). 59 are hierarchically-tagged with `Asian` as redundant parent. Cluster framing decision #4 ("Asian-as-default fallback") asked whether 63 includes under-tagging — Opus read confirms no. Worth recording as a confirmed corpus characteristic.

- **Session boundary held at one cluster.** Stop-point heuristic from "For next session" felt right — 18 entries took the bulk of the session (corpus queries + 7 agent dispatches + entry drafting + Notes synthesis + integration). Americas at ~22 entries is naturally next-session scope; smaller clusters may fit 1-2 per session.

- **Pre-push code-reviewer agent caught 2 P2 internal-consistency findings on Opus-agent-produced content.** §11.4 Southeast Asian details-block summary header read "3 with country tag, 2 without" while the tagging-pattern paragraph below it enumerated "only 2 of the 4 cuisine lessons carry a country tag" plus 1 non-cuisine near-miss (Bats & Banana Pancakes) — header reframed to "2 of 4 cuisine + 1 non-cuisine near-miss." §11.7 Japanese tagging-pattern arithmetic was internally inconsistent ("6 of the 7 sampled lessons" + "Two looser tags exist" = 8, not 7) — rephrased to drop the precise-sample-count framing. Both fix-up'd in commit before push. Reinforces the kickoff pattern: dispatch reviewer on docs-only PRs too — count/math/cross-reference consistency is exactly the class of bug a fresh-eyes agent catches and a self-reviewer misses. THIRD time on the Stage 1 track that the pre-push agent caught real bugs missed by self-review (Sessions 60 `da09777`, 61 `a5b584b`, 62 fix-up commit).

**For next session (Stage 1 Session 63 = Americas cluster).**

- Branch off `main` at this session's PR squash-merge (TBD until PR opens + merges).
- Populate Americas cluster per §12 framing block — ~22 entries (cluster root + 3 sub-regions + 14 country-specifics including 3 v3-absent `new` candidates + 4 kebab-case drift variants).
- Dispatch ~5-6 Opus corpus-read agents for high-frequency / ambiguous values: Americas (170 — cluster root; ambiguity question #1 about under-tagging), North American (83), Latin American (77), Caribbean (17), Mexican (38). Optionally one of the `new` candidates (Central American 1, South American 1, Southern United States 1) if curriculum team wants verification before canonicalizing.
- Stop at end of Americas cluster.

### Session 61 — 2026-05-10 — PR #481 ship cycle complete (round-1 + round-2 + Notes fix-up; squash-merge in progress)

PR #481 (Stage 1 heritage worksheet scaffold) shipped through the standard review cycle:

- **Round-1:** 5 accepted bot findings (F1 v3 path → Appendix A; F2 `####` heading depth standardized; F3 `null` root parent encoding; F4 Dominican added to Americas; F5 alias_map clarified), 1 rejected (F6 TOC §1-§8 note — defensible design). Includes the v3 baseline embedded as Appendix A — worksheet now self-contained for curriculum-team handoff. (`0c2e138`)
- **Pre-push agent post-round-1** caught one F2-sweep miss in §5.2 prose (`### <cluster>...` left as 3-hash); separate fix-up commit. (`a5b584b`)
- **Round-2:** 1 accepted (R2.2 Notes-field parsing convention clarified in §7), 3 rejected per round-cap + default-reject hardening (R2.1 diaspora placeholder; R2.3 data snapshot anchor; R2.4 ToC §1-§8 read-linearly note). (`b5c0020`)
- **PR #481 squash-merged 2026-05-10 as `e05556a`** (backfilled Session 62).

**Worksheet state at ship.** Header sections complete (§1 purpose, §2 hierarchy rules, §3 verdict vocab, §4 per-entry shape, §5 cluster framing pattern, §6 filter-UI tier conventions, §7 parsing convention). Cluster framing blocks pre-populated with Session 59 corpus distribution. Cross-cluster section §9.1-§9.4 stubbed. Cluster template §10. Cluster sections §11-§15 framing complete; per-value entries deliberately TBD. End-summary canonical-vocab table §16 templated empty. Appendix A v3 baseline reference embedded. **Per-value entries are the next track of work.**

**Updated for parser-future.** §7 now excludes `notes` from parseable fields (Notes blocks are human-only prose). If a future parser implementation wants to surface Notes alongside structured fields, that's a parser-side design choice to revisit then; the worksheet's spec is now consistent.

**For next session (Stage 1 Session 62 = Asian cluster per-value fill).**

- Branch off main at the PR #481 squash-merge commit (backfill the hash in both this doc and the foundation-phase doc as Session 62's first task).
- Populate the Asian cluster's per-value entries: 18 entries (5 sub-region canonicals — Asian cluster root + East Asian, South Asian, Southeast Asian, Central Asian sub-regions + 10 country-specifics — Chinese, Japanese, Korean, Indian, Pakistani, Uzbek, Vietnamese, Sri Lankan, Malaysian, Taiwanese + 3 kebab-case drift variants — `asian`, `east-asian`, `south-asian`). Note: this corrects the "~17 / ~9 country-specifics" wording in the Session 60 entry; recount produced 18 / 10. Session 60 entry left as-is (historical).
- Launch Opus-corpus-read agent for high-frequency / ambiguous values: Asian (63), East Asian (35), South Asian (15), Chinese (15), Japanese (9), Indian (7) — others can populate from structural call.
- Stop at end of Asian cluster (the planned session boundary per cluster).

### Session 60 — 2026-05-10 — Stage 1 heritage scaffold created (2-file pattern)

**Branch:** `docs/stage1-heritage-scaffold` (off `main` at `ab9f857`).

**Done:**

- **Commit 1 (`92b088b`):** popped Session 59 stash; recovered foundation-phase status doc Session 59 entry that locked the 4 design decisions + the 2-file scaffold meta-decision. Body content copied verbatim from stash — no editorial changes.
- **Commit 2 (this commit):** bundled scaffold creation + foundation-phase status doc update:
  - Created `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` (full header sections + cluster framing blocks for all 5 regional clusters + cross-cluster section §9 stubs + cluster template §10 + end-summary table §16).
  - Created this file (`docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md`).
  - Updated `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md` — Current State header rewritten to point at the Stage 1 scaffold files; Branches section adds active branch; Session 60 log entry added.
- **Commit 3 (this fix-up commit):** pre-push code-reviewer agent caught 2 P1 anchor errors in the worksheet (`(see §6)` pointing to wrong section in §2; end-summary table cited as §11 instead of §16 in §4 and §7) plus a P2 internal contradiction in this status doc Session 60 entry (referenced a "Commit 3" that didn't exist — `92b088b` and `beb66d2` are the only substantive commits). Fix-up applied before push.

**Decisions made this session:** none new beyond the scaffold pattern (the 4 design decisions plus the 2-file meta-decision are inherited from Session 59).

**Process notes / observations:**

- **Scaffold size landed at ~700 lines for File 1.** The instinct to over-explain header sections is reasonable for a doc that hands off to a curriculum team months from now — comprehension over brevity. File 2 is ~150 lines, the right scale for project-internal tracking.
- **Pre-populating cluster framing blocks with corpus distribution data made the scaffold immediately useful** — the curriculum team could in principle start reading and understand the shape of the work without waiting for per-value entries. Subsequent sessions add the per-value detail.
- **The Session 59 corpus query (TEST DB `lessons.metadata.culturalHeritage` distribution, 76 distinct values) was re-run this session** to confirm numbers haven't drifted. They haven't (TEST DB is stable post-PR-3a apply). The numbers in the worksheet cluster framing blocks are accurate as of 2026-05-10.
- **5 regional clusters + cross-cluster diaspora section = 6 sections to fill** in subsequent sessions. At 1 cluster per session, ~6 sessions to fully pre-populate before curriculum-team handoff. Asian first; smallest scope and cleanest hierarchy structure.
- **Pre-push review caught 3 real bugs** (2 P1 anchor errors + 1 P2 internal contradiction). Confirms the kickoff's pre-push code-reviewer rule applies to docs-only PRs too — anchor / cross-reference / section-numbering errors in long docs are exactly the class of bug a fresh-eyes agent catches and a self-reviewer misses.

**For next session (Stage 1 Session 61 = Asian cluster per-value fill):**

- Read this file's "For next session" section (above)
- Branch off `main` at the merge commit for Session 60's PR (TBD until PR opens + lands)
- Populate the Asian cluster's per-value entries: ~17 entries (5 sub-region canonicals + ~9 country-specifics + 3 kebab-case drift variants)
- Launch Opus-corpus-read agent for high-frequency / ambiguous values (Asian 63, East Asian 35, South Asian 15, Chinese 15, Japanese 9, Indian 7) — others can populate from structural call
- Stop at end of Asian cluster

## Pointers to durable context

- **Worksheet:** `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` (the deliverable)
- **Audit signal register:** `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md` (Stage 2 corpus cleanup / reviewer-validation intake — open audit signals surfaced during per-value fills)
- **Foundation-phase status doc:** `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md` (peer status doc; carries one-line pointer here)
- **Foundation-phase design doc:** `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md` (§5 has the LLM-tagging methodology that informs per-field Opus-corpus-read approach)
- **v3 baseline:** Worksheet Appendix A (verbatim §3 Cultural Heritage from `esynyc-taxonomy-schema-v2.md`) — canonical hypothesis going in
- **activity-type-v2 worksheet (format inheritance reference):** `scripts/eval-data/activity-type-relabel-worksheet-v2.md` (different content domain — multi-label-per-lesson — but the labeled-line shape + collapsible details + inline review comments are reusable techniques)
- **Decision journal (Session 59 full record):** `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` — search for "Session 59" or the 4 design decision summaries

## Out-of-scope follow-ups

(Empty this session. Future sessions may surface follow-ups as per-value entries populate — e.g., specific corpus-cleanup candidates, ambiguous diaspora handling, filter-UI tier exceptions worth flagging.)
