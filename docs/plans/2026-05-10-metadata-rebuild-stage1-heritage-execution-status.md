# Stage 1 Heritage Worksheet — Execution Status

**Last updated:** 2026-05-11 — Session 68 European cluster per-value entries populated; PR #487 (open). Branched from `main` at `f45278a` (the PR #485 closeout backfill commit on main, downstream of squash `b9f2cef`). Next cluster-content session = Session 69 Middle Eastern after PR #487 review + merge.

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
| European §14 | PR #487 OPEN | #487 | TBD until merge | 14 entries (1 root + 2 sub-regions + 5 country-specifics with corpus + 2 v3-corpus-absent + 1 NEW + 3 drift); §9.2 Spanish multi-parent resolved to Mediterranean primary (European cluster) with Latin American flagged; 3 Opus corpus-read `<details>` blocks integrated (European, Mediterranean, Italian) |
| Middle Eastern §15 | Next session | TBD | TBD | ~8 entries planned (1 root + 1 sub-region + 4 country-specifics + 2 drift) |
| Cross-cluster §9 | TBD | TBD | TBD | Per-value entries for diaspora / indigenous identities + remaining §9.2 multi-parent rows (Persian, Israeli, Spanish) |
| End summary §16 | TBD | TBD | TBD | Populates mechanically from filled per-value entries |

Audit signal register (Stage 2 corpus cleanup / reviewer-validation intake): `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md`. Carries the audit signals surfaced during Stage 1 per-value fills (~18 open as of 2026-05-11) — covers re-tag actions, body-content review, and reviewer-led judgment calls. Append new signals there; do not duplicate into per-cluster status-doc narrative.

## Next session contract

Fixed-shape orientation for the next session. Update at PR closeout (see PR closeout checklist below).

- **Session:** Stage 1 Session 69 — Middle Eastern cluster per-value fill (assuming PR #487 closes cleanly with at most a review-cycle session between)
- **Branch base:** `main` at PR #487 squash-merge commit (TBD until merge). Branch as `docs/stage1-heritage-middle-eastern-cluster`.
- **Primary objective:** Populate worksheet §15 with all Middle Eastern cluster per-value entries (~8 entries: 1 cluster root Middle Eastern 23 + 1 sub-region [Levantine 14] + 4 country-specifics [Yemeni 3 NEW, Persian 1 NEW + multi-parent, Palestinian 1, Israeli 1 + multi-parent] + 2 kebab-case drift [`middle-eastern` 1, `levantine` 2]); add the §9.2 multi-parent entries for Persian + Israeli in the cross-cluster section. Plus v3-canonical-corpus-absent country-specifics under Levantine (Lebanese, Syrian, Jordanian) per §12.18 Dominican precedent.
- **Stop point:** End of Middle Eastern cluster (one cluster per session, per Sessions 62 / 64 / 66 / 68 stop-point heuristic). After Middle Eastern, only cross-cluster §9 + end-summary §16 remain.
- **Expected files to touch:**
  - `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` — §15 per-value entries, §9.2 Persian + Israeli rows in cross-cluster section
  - `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-execution-status.md` — Session 69 log entry; dashboard + contract refresh at PR closeout
  - `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md` — append any new Middle-Eastern-cluster audit signals as `ME-NN`
  - `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md` — Current State header + PRs-SHIPPED list + Branches block on PR merge
- **First task:** Per the foundation-status carrying pattern, no hash backfill needed if Session 68's PR closeout backfills cleanly into main (matches Session 67 / PR #485 closeout pattern). Start with TEST DB corpus-distribution verification queries against `lessons.metadata.culturalHeritage` for the 8 Middle Eastern values plus the §9.2 Persian + Israeli cross-cluster checks plus the v3-corpus-absent Levantine country-specifics (Lebanese, Syrian, Jordanian).
- **Must verify:**
  - `git diff --check` clean
  - No code / migration / package / Supabase / test file changes (`git diff --name-only origin/main...HEAD | grep -Ev '^docs/'` returns nothing)
  - §15 framing decisions resolved (Levantine country-specific v3-corpus-absent disposition for Lebanese/Syrian/Jordanian; Yemeni NEW canonical; Persian multi-parent vs Central Asian; Israeli multi-parent vs Mediterranean)
  - Pre-push code-reviewer agent dispatched on the docs PR (Sessions 60-68 pattern; ninth consecutive Stage 1 catch — Session 68 broke the streak at 0 findings; resume the catch-count from there)
- **Do not do:**
  - Touch source code, migrations, package files, Supabase files, or tests
  - Pre-decide curriculum-team-facing verdicts (`<to_fill>` stays per §4 spec)
  - Modify worksheet content outside §15 + the §9.2 Persian + Israeli cross-cluster rows
  - Start cross-cluster §9 per-value entries (separate session)

## PR closeout checklist

Reusable per-PR ritual for Stage 1 docs PRs. Tick each box as part of the merge cycle so the dashboard, contract, and pointer surfaces stay in sync with `main`.

- [ ] Record PR number and squash commit in the dashboard row for the shipped cluster
- [ ] Update Current state dashboard row (status `✅ Shipped`, PR number, merge commit, notes summary)
- [ ] Update `Last updated` line in this doc
- [ ] Update foundation status doc pointer (Current State header + PRs-SHIPPED list)
- [ ] Update Branches block in foundation status doc (move branch from "Active" to traceability list)
- [ ] Update Next session contract for the next cluster (session number, branch base, primary objective, expected files, first task, must verify, do not do)
- [ ] For status-tracking / hygiene PRs, update the Next session contract branch base to this PR's squash commit after merge
- [ ] Append new audit signals to `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-audit-signal-register.md`
- [ ] Search for stale strings and replace:
  - `squash-merge pending`
  - `PR #NNN OPEN` for the just-merged PR
  - `TBD until merge` for the just-merged PR
  - the previous active branch name
- [ ] Confirm no code / migration / package / Supabase / test files changed in the closing PR

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

**European cluster ✅ Session 68 (2026-05-11). PR #487 open.** Worksheet §14 has all 14 per-value entries populated (1 cluster root European 53 + 2 sub-regions [Mediterranean 39 v3, Eastern European 3 v3] + 5 country-specifics with corpus [Italian 24 v3, Spanish 5 v3 multi-parent, Ukrainian 3 v3, Greek 2 v3, Russian 1 v3] + 2 v3-canonical-corpus-absent [French 0, Polish 0] per §12.18 Dominican precedent + 1 NEW [Irish 2] + 3 kebab-case drift `european` 1 / `mediterranean` 2 / `eastern-european` 1). 3 of those have Opus-corpus-read `<details>` blocks (European, Mediterranean, Italian); the remaining 11 entries are structural per §4 methodology with direct SQL inspection of the 15 country / sub-region / drift-literal lesson bodies. §9.2 multi-parent resolved: Spanish → Mediterranean primary (European cluster) with Latin American flagged as alternative — corpus splits 2 + 3 (2 Tortilla Española pure Spain-cuisine; 3 empanada lessons treat Spanish as Spanish-colonial-origin bridge for Latin American dishes; 4/5 carry Mediterranean overall). §14 framing decisions: (1) `Russian/Ukrainian` v3 combined → recommended `split` into separate `Russian` + `Ukrainian` canonicals (audit signal EUR-12 for combined-canonical retirement); (2) Mediterranean → `top` tier proposed (just below ≥40 threshold but functionally Italian-umbrella); (3) Polish + French v3-corpus-absent → per-value entries with `<to_fill>` verdict per §12.18 Dominican precedent (matches §12 convention, diverges from §11 Asian convention); (4) Irish → NEW canonical under European direct (depth-2 asymmetry vs depth-3 other countries); (5) Spanish multi-parent → §9.2 Mediterranean primary. Pre-push code-reviewer agent dispatched on the diff; awaiting findings. Audit signals surfaced for Stage 2 (~14 EUR-NN entries): Green Room Party single-`European` under-tag; Cellular Respiration + Microbiome science-lesson Mediterranean+European over-tags; Following a Recipe + Kitchen Cognates Cohort C over-tags; Microbiome strips `Greek` country tag from same tzatziki recipe as Tzatziki; duplicate Tortilla Española rows; September Salsa Toasts Italian over-tag (one-word etymology); Italian recipe-vehicle over-tags (Following Instructions + Alternative Proteins); Mediterranean Cohort C over-tags (Food Preservation + Tastes Around the World + Sandwich Swap); Pasta Party drift body anchors Italy/Tuscany; Varenyky drift duplicate of canonical Varenyky; Spanish multi-parent disposition with AME-06 reframe; v3 Russian/Ukrainian combined-canonical retirement; Empanadas & Corn Salad Mediterranean omission; Irish depth-2 asymmetry. **African cluster ✅ Session 66 (2026-05-10). PR #484 squash-merged 2026-05-11 02:54 UTC as `7894a47` (Session 67 round-1 fix-ups + round-2 default-reject).** Worksheet §13 has all 10 per-value entries populated (1 cluster root African 41 + 3 sub-regions [West African 15 v3, North African 2 NEW, East African 1 NEW] + 5 country-specifics [Nigerian 2 re-parented under West African; Egyptian 2 multi-parent; Kenyan 2 NEW; Ethiopian 1 re-parented under East African; Moroccan 1 multi-parent] + 1 kebab-case drift `african` 1). 2 of those have Opus-corpus-read `<details>` blocks (African + West African); the remaining 8 entries are structural per §4 methodology with direct SQL inspection of the 11 country / sub-region lesson bodies. §9.2 multi-parent resolved: Egyptian → North African primary (Middle Eastern flagged at Notes-level; corpus splits 1/1); Moroccan → North African primary (no Middle Eastern corpus signal). Pre-push code-reviewer agent caught 2 P2 + 1 P3 internal-consistency findings (Cohort 4 misreference in §13.1 Notes; §13.2 details-header bucket arithmetic; dangling "Audit signals for Stage 2 section" reference) — all 3 accepted + fix-up'd in commit `e49366e`. **Sixth consecutive Stage 1 pre-push agent catch.** Audit signals surfaced for Stage 2: Carver content split-tagged inconsistently across 3 sibling lessons; Wangari Maathai under-tagged on 1 of 2 lessons; 7-8 Juneteenth / BHM / post-Civil-War lessons missing `African American` tag; Seed & Date Balls over-tagged with `West African + Asian`; Egyptian tagging inconsistency across 2 ful medames lessons; Edmond Albius under-tagged for East African geography (Réunion); `5th Grade Food Cultures Unit Overview` heritage-array anomaly; East African sub-region under-tagging (0/3 Kenyan + Ethiopian lessons currently use it). **Americas cluster ✅ Session 64 shipped 2026-05-10 as PR #483 squash `fc45a96` (merged 2026-05-11 01:37 UTC; Session 65 round-1 + round-2 fix-ups applied + merged with two-voice convergence on default-reject for round-2).** Americas worksheet §12 has all 22 per-value entries populated (1 cluster root + 3 sub-regions + 10 country-specifics + 3 NEW sub-region candidates + 1 v3-canonical-corpus-absent + 4 kebab-case drift merge records). 6 of those have Opus-corpus-read `<details>` blocks integrated (Americas, North American, Latin American, Caribbean, Mexican, Puerto Rican); the remaining 16 entries are structural per §4 methodology. **Asian cluster ✅ Session 62 shipped 2026-05-10 as PR #482 squash `d58eb59` (Session 63 round-1 + round-2 fix-ups applied + merged).** PR #483 review cycle (Session 65): round-1 fix-up `ea0c443` accepted 2 Codex P2 + 1 Claude nitpick (multi-parent / Decision 1 misattribution at 2 spots; Caribbean cohort math at 3 spots; §12.20 corpus-scale hedge); round-2 default-rejected 4 Claude minor/informational findings; Codex round-2 independently verified round-1 fixes landed correctly + reached identical reject-all verdict on Claude round-2 (two-voice convergence on default-reject). Audit signals surfaced for Stage 2: inconsistent cross-cluster diaspora tagging (67% AA / 79% Indigenous / 43% Lenape lessons carry North American — settled via TEST DB query), 4/4 Puerto Rican lessons multi-parent dual-coded as Caribbean + Latin American, missing country tags on arepa lessons, over-tagged Asian-cluster lessons spuriously carrying Caribbean + Latin American + Americas, Mexican `Monarch Migration` geography-only tagging.

**What's done:**

- §11 Asian cluster: 18 per-value entries ✅
- §12 Americas cluster: 22 per-value entries ✅
- §13 African cluster: 10 per-value entries ✅
- §14 European cluster: 14 per-value entries ✅
- §9.2 multi-parent table: Egyptian + Moroccan + Spanish rows resolved from TBD to recommended primary parents ✅
- Cluster framing blocks for all 5 regional clusters + cross-cluster (Session 60 scaffold) ✅
- Header sections (purpose / methodology / hierarchy rules / verdict vocab / per-entry shape / cluster framing pattern / filter-UI tier conventions / parsing convention / Appendix A v3 baseline) ✅

**What's NOT done:**

- §15 Middle Eastern cluster: per-value entries TBD (~8 entries — 1 cluster root + 1 sub-region + 4 country-specifics + 2 kebab-case drift; per §15 framing block; plus v3-canonical-corpus-absent Lebanese/Syrian/Jordanian under Levantine per §12.18 Dominican precedent — likely 11 entries total).
- §9 cross-cluster section per-value entries (diaspora / indigenous identities, remaining §9.2 multi-parent canonicals — Persian, Israeli): TBD.
- §16 end-summary canonical-vocab table: populates mechanically from filled entries; empty until per-value entries fill.
- Cluster decision summary blocks: always TBD (curriculum team writes at handoff).

**For next session (Stage 1 Session 69 = Middle Eastern cluster, assuming PR #487 closes cleanly):**

> See `## Next session contract` near the top of this doc for the structured authoritative summary (session, branch base, primary objective, expected files, first task, must verify, do not do). The numbered list below carries the procedural detail (per-entry breakdown, framing decisions, Opus-dispatch plan).

1. Branch off `main` at PR #487 squash-merge commit (TBD until merge). NO hash backfill task in Session 69 if PR #487 follows Session 67 / PR #485 closeout pattern (direct-to-main post-merge backfill); else first task is hash backfill matching Sessions 64 / 66 pattern.
2. Populate Middle Eastern cluster's per-value entries per §15 framing block. Total: **~8 entries with corpus + 3 v3-corpus-absent = ~11 entries**:
   - Cluster root (1): Middle Eastern (23)
   - Sub-region (1): Levantine (14, v3)
   - Country-specifics with corpus (4): Yemeni (3, NEW — not in v3), Persian (1, NEW + multi-parent per §9.2), Palestinian (1, v3 under Levantine), Israeli (1, v3 + multi-parent per §9.2)
   - v3-canonical-corpus-absent (3): Lebanese, Syrian, Jordanian (all v3 under Levantine, 0 corpus rows) — per §12.18 Dominican precedent
   - Kebab-case drift (2): `middle-eastern` (1), `levantine` (2)
   - Plus §9.2 multi-parent entries for Persian + Israeli (cross-cluster section work)
3. Dispatch ~1-2 Opus corpus-read agents: Middle Eastern (23 — cluster root), Levantine (14 — sub-region). Lower-frequency country-specifics (Yemeni 3, Persian/Palestinian/Israeli 1 each) handle structurally.
4. Address §15 framing decisions: (1) Yemeni (3, not v3) → `new` candidate, parent = directly under Middle Eastern (Yemen doesn't fit Levantine cleanly); (2) Persian (1, not v3) → §9.2 — Middle Eastern home or Central Asian; (3) Israeli (1, v3) → §9.2 — Middle Eastern (v3) or Mediterranean; (4) Lebanese / Syrian / Jordanian v3-corpus-absent — keep / drop / internal per §12.18 Dominican precedent; (5) Egyptian multi-parent → §15 cluster Notes-level back-reference to §13.6 / §9.2 Session 66 resolution.
5. Stop at end of Middle Eastern cluster. Do NOT start cross-cluster §9 per-value entries.

**Stop-point heuristic confirmed Sessions 62 + 64 + 66 + 68:** one cluster per session is the right scope. Asian (18 entries, 7 Opus reads) + Americas (22 entries, 6 Opus reads) + African (10 entries, 2 Opus reads) + European (14 entries, 3 Opus reads) each fit the session boundary cleanly. Middle Eastern at ~8-11 entries (corpus + v3-corpus-absent + drift) is the smallest cluster — likely fits comfortably within a single session. May fit 1-2 clusters per session if Opus-read load is light, but `one-cluster-default-OR-natural-decision-batch` remains the reasonable working rule.

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

**For next session (Stage 1 Session 69 = Middle Eastern cluster):** see "For next session" + Next session contract blocks above. Per the foundation-status carrying pattern, no hash backfill needed if Session 68's PR closeout backfills cleanly into main (matches Session 67 / PR #485 closeout pattern). PR #487 review cycle may add a Session-68.5 entry between this and Session 69 if multiple rounds land.

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
