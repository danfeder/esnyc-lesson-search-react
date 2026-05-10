# Stage 1 Heritage Worksheet — Execution Status

**Last updated:** 2026-05-10 — Session 61 (PR #481 ship cycle complete: round-1 + round-2 + Notes fix-up; squash-merge in progress; Asian cluster per-value fill opens next session).

> **About this file.** Project-internal progress tracker for the Stage 1 heritage worksheet initiative. Peer to (not folded into) the foundation-phase status doc at `2026-05-03-metadata-rebuild-foundation-execution-status.md`. The foundation-phase status doc carries a one-line pointer here.
>
> **What lives here:** current state of the worksheet fill, locked design decisions and rationale, session log, next-session pointer.
>
> **What does NOT live here:** the worksheet content itself (lives in `2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md`); methodology and conventions intended for curriculum-team handoff (live in the worksheet header).

## Current state

**Scaffold SHIPPED (Sessions 60-61, 2026-05-10).** PR #481 (round-1 + round-2 + Notes fix-up) squash-merge in progress. Two files shipped:

1. `docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md` — the worksheet itself. Header sections (purpose / methodology / hierarchy rules / verdict vocab / per-entry shape / cluster framing pattern / filter-UI tier conventions / parsing convention) complete and load-bearing. Per-cluster framing blocks pre-populated with corpus distribution data from Session 59 query. Per-value entry blocks TBD subsequent sessions before curriculum-team handoff.
2. This file (`...-execution-status.md`).

**What's NOT done:**

- Per-value entry blocks within each cluster (Asian / Americas / African / European / Middle Eastern) — TBD.
- Cross-cluster section (§9 of the worksheet) per-value entries — TBD.
- Opus-corpus-read evidence (collapsible `<details>` excerpts) — TBD.
- End summary canonical-vocab table (§16) populates mechanically from filled entries; empty until per-value entries fill.

**For next session:**

1. **Pick a starting cluster.** Recommendation: **Asian** — has the cleanest hierarchical structure (5 sub-regions + ~9 country-specifics + 3 kebab-case drift values; total ~17 per-value entries). Tests the per-value entry format on a complete cluster before scaling. Alternatives: Americas (most corpus-heavy, but biggest scope, ~22 entries); Middle Eastern (smallest scope, ~6 entries, but mostly-new sub-regions which are less typical work).
2. **For each per-value entry in the chosen cluster:**
   - Populate `canonical_key` (kebab-case slug from surface label)
   - Populate `surface_label` proposal (from v3 baseline OR best-fit Title Case)
   - Populate `frequency_count` (already in cluster framing block; copy down)
   - Populate `parent` proposal (from v3 baseline OR first-principles cluster fit)
   - Populate `filter_ui_tier` proposal (frequency-based default per §6 guideline)
   - Populate `aliases` candidate list (kebab-case drift variants from cluster framing block)
   - For frequency ≥5 OR ambiguous: launch Opus-corpus-read agent to read sample lesson bodies tagged with the value; capture 2-3 excerpts in collapsible `<details>` block.
   - For mechanical canonical-vs-kebab drift (`asian` → `Asian`): no Opus read needed; the call is structural.
   - Leave `verdict` and `notes` for curriculum-team fill at handoff.
3. **Repeat for remaining clusters** in subsequent sessions. Order: Asian → Americas → African → European → Middle Eastern → cross-cluster section.
4. **Cross-cluster section (§9 of the worksheet)** populates last, after regional clusters are filled — multi-parent decisions are easier to land once each cluster's home options are visible.

**Stop-point heuristic:** populate ONE cluster per session (or one cluster's complex per-value entries + simple ones, if the cluster is small). Don't bundle multiple clusters in one session — corpus-read is the time-consuming part and one cluster's worth is a natural session boundary.

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

### Session 61 — 2026-05-10 — PR #481 ship cycle complete (round-1 + round-2 + Notes fix-up; squash-merge in progress)

PR #481 (Stage 1 heritage worksheet scaffold) shipped through the standard review cycle:

- **Round-1:** 5 accepted bot findings (F1 v3 path → Appendix A; F2 `####` heading depth standardized; F3 `null` root parent encoding; F4 Dominican added to Americas; F5 alias_map clarified), 1 rejected (F6 TOC §1-§8 note — defensible design). Includes the v3 baseline embedded as Appendix A — worksheet now self-contained for curriculum-team handoff. (`0c2e138`)
- **Pre-push agent post-round-1** caught one F2-sweep miss in §5.2 prose (`### <cluster>...` left as 3-hash); separate fix-up commit. (`a5b584b`)
- **Round-2:** 1 accepted (R2.2 Notes-field parsing convention clarified in §7), 3 rejected per round-cap + default-reject hardening (R2.1 diaspora placeholder; R2.3 data snapshot anchor; R2.4 ToC §1-§8 read-linearly note). (`b5c0020`)
- **PR #481 squash-merge in progress** (commit hash TBD — backfill at start of Session 62).

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
- **Foundation-phase status doc:** `docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md` (peer status doc; carries one-line pointer here)
- **Foundation-phase design doc:** `docs/plans/2026-05-03-metadata-rebuild-foundation-design.md` (§5 has the LLM-tagging methodology that informs per-field Opus-corpus-read approach)
- **v3 baseline:** Worksheet Appendix A (verbatim §3 Cultural Heritage from `esynyc-taxonomy-schema-v2.md`) — canonical hypothesis going in
- **activity-type-v2 worksheet (format inheritance reference):** `scripts/eval-data/activity-type-relabel-worksheet-v2.md` (different content domain — multi-label-per-lesson — but the labeled-line shape + collapsible details + inline review comments are reusable techniques)
- **Decision journal (Session 59 full record):** `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` — search for "Session 59" or the 4 design decision summaries

## Out-of-scope follow-ups

(Empty this session. Future sessions may surface follow-ups as per-value entries populate — e.g., specific corpus-cleanup candidates, ambiguous diaspora handling, filter-UI tier exceptions worth flagging.)
