# Wave 3 — Repo / Docs Hygiene — Combined Execution Doc

> **Small-initiative weight.** This ONE doc combines all four scaffold roles:
> §0 Kickoff (paste at session start) · §1 Design / locked decisions (WHY) · §2 Implementation plan (WHAT) · §3 Status (WHERE we are).
> Master cross-wave tracker: `2026-06-21-deferred-campaign-status.md`. Roadmap: `2026-06-20-deferred-work-roadmap.md`.
>
> **Grounding:** every file:line / count below came from a read-only 4-agent grounding pass against `main` @ `2d25e23` (2026-06-21). Where the roadmap's prose disagreed with the code/files, the ground truth won — noted inline. **Executors must re-verify exact line numbers + file lists before editing — anchors and counts drift.**

---

## §0 — KICKOFF (paste this section at the start of every Wave-3 session, after `/clear`)

You are continuing execution of **Wave 3 — Repo / Docs Hygiene** (deferred-work campaign). Assume no prior conversation context. Disk + git + §3 of this doc are your only source of truth.

### What you're building
A decks-clearing pass of **docs/repo hygiene** — almost entirely documentation, **no DB or edge-function changes in the core**. Three core PRs plus three re-homed side tracks:

**Core wave (C60 + C39) — pure docs, no gates:**
- **PR A (lead): "close the decks"** — fold the staged Wave-2 close-out edits + add closure banners to 2 stale status docs + fix `ARCHITECTURE.md`'s stale "1,098 lessons" count + add a superseded banner to `TECH_DEBT_AUDIT_2025-12.md` + flip the master tracker's Wave-3 row. Small, high-signal.
- **PR B: docs archival** — create the archive location + an `ARCHIVAL_MANIFEST.md` + `git mv` ~40–55 shipped-initiative docs out of the working `docs/plans/` root. Mechanical, large diff, trivial risk (only hazard = mis-archiving a still-live doc).
- **PR C: C39 migration-doc consolidation** — collapse 4 overlapping migration-workflow surfaces to 2. Docs-only **but load-bearing** (`CLAUDE.md` files are auto-loaded by agents); careful, its own PR.

**Re-homed OUT of the core PRs (do NOT bundle into A/B/C):**
- **C169 + C31 — CI/lockfile batch** (separate session): triage 16 stale Dependabot PRs; pin `supabase/setup-cli` while handling #450 (the v1→v2 bump). Touches the lockfile + workflows → real CI surface. **Merges are the USER's call.**
- **C33 — deploy-safety PR** (own careful PR): `deploy-edge-functions.yml` post-deploy verify + matrix serialization. M-effort, risk-sensitive (could affect the PROD edge-deploy gate). Not mechanical.
- **C40 — memory archive-split** (NO repo PR): split the 3 largest journal memory files in `~/.claude/.../memory/`. Out-of-repo; the supervisor's own memory maintenance.

### Where things live
- **This doc** (`2026-06-22-wave3-repo-docs-hygiene-execution.md`): §1 = locked decisions (WHY), §2 = per-PR tasks (WHAT), §3 = status (WHERE).
- Master campaign tracker: `docs/plans/2026-06-21-deferred-campaign-status.md`.
- Roadmap: `docs/plans/2026-06-20-deferred-work-roadmap.md` (item `C##` scope; the "Source-hygiene byproduct" section feeds C60).
- CI/deploy flake playbook: `reference_ci_flakes.md` (auto-loaded pointer in MEMORY.md) — **read before the C169 batch or the C33 PR** (it documents the setup-cli rate-limit fix #529, the matrix silent-no-op C33 targets, and dep-bump split rules).

### SESSION-START RITUAL (do FIRST, every session)
1. Read this §0 + §1 + the §2 task you're about to start.
2. Read §3 Current State — it's the load-bearing orientation piece.
3. `git status --short --branch && git branch --show-current && git log --oneline -10` — confirm git matches §3. If they diverge, trust git, then fix §3.
4. If the worktree is dirty with changes that aren't yours, don't touch them. **There are intentionally-left-alone untracked files** (5 `docs/plans/*-kickoff.md` + `docs/plans/heritage-worksheet-form/`) — leave them (locked decision #6). Do NOT archive, commit, or delete them.
5. `npm run check` (= type-check + lint) — confirm clean baseline. (Docs-only PRs won't break it, but a clean baseline rules out unrelated drift before you start.)
6. Tell the user where you are and what's next. Don't dispatch the first executor until they confirm orientation.

### EXECUTION MODE — supervisor + fresh-context subagents
This session runs as a **light supervisor**: you own orientation, decisions, verification, user checkpoints, and all edits to this doc. Mechanical bulk work (e.g., PR B's ~50-file classify-and-`git mv`) is well-suited to a dispatched subagent; judgment work (which docs are truly archivable, the C39 consolidation target, the C169 bucket calls) stays with the supervisor or goes to a subagent with explicit `[user-verdict]` guardrails.
- One §2 task per executor dispatch; never bundle two.
- **Verify in the main loop before accepting any executor result** — LOAD-BEARING (`feedback_workflow_orchestration.md`: supervisor-verify has caught real agent misses). For docs work the cheap re-verify is: `git status`/`git diff --stat`, spot-read 3–5 moved/edited files, confirm `npm run check` still green, and confirm NO live doc was archived by mistake.
- Checkpoint §3's Current State header after EACH verified task (one-line edit), not just at session end.
- Each executor prompt must carry: the doc path + task id (tell it to READ §1+§2 from disk), the relevant locked decisions + the "leave untracked files alone" rule, the classification criteria (for PR B) or the consolidation target (for PR C), the boundaries (commit on the feature branch OK; NEVER push / open PR / merge / touch PROD / edit this doc / touch the untracked files), "if blocked or disk contradicts the locked design, STOP and report," and the required report format (what was done · commits · `git diff --stat` + the live-doc-safety spot-check result).
- **Ultracode is on for this campaign** → the Workflow tool is available for fan-out (e.g., parallel doc-classification), but most of Wave 3 is small enough that direct supervisor work or a single executor is the right tool. Don't over-orchestrate mechanical docs work.

### LOCKED DECISIONS (full set in §1; at-risk ones pinned here)
- **Small-initiative weight** — this one combined doc + the EXISTING master tracker. No new tracker, no 4-file scaffold.
- **Core = C60 + C39 only**, as 3 PRs: **A (close-decks) → B (archival) → C (migration-doc 4→2).** Sequence is fixed; A first (folds the Wave-2 close-out edits).
- **Re-homed:** C169 + C31 = a separate CI/lockfile batch (NOT a docs PR; merges = user's call). C33 = its own deploy-safety PR. C40 = out-of-repo memory maintenance (NO PR).
- **Algolia "ghost/count fix" sub-item DROPPED** — grounding proved it moot (all 6 `ARCHITECTURE.md` Algolia refs already correctly document the Sept-2025 removal; no wrong counts exist).
- **Untracked files left alone** (the 5 `*-kickoff.md` + `heritage-worksheet-form/`) — user decision.
- Two execution-time `[evidence-lockable]` questions remain (see §1): the **archive mechanism** (subdir vs sister-file convention) for PR B, and the exact **2-surface consolidation target** for PR C (with the fate of `docs/MIGRATION_WORKFLOW.md` a `[user-verdict]` if it means deleting rather than redirect-stubbing a doc).

### HARD RULES
**DOCS-ONLY CORE (PR A/B/C):** No schema, no edge functions, no migrations, no lockfile changes. So **no TEST-DB MCP verify, no 3-signal edge verify, no PROD-approval gate** for the core PRs. The verification that matters is: `npm run check` stays green, and **no still-live doc gets archived or gutted** (the one real hazard). For PR C specifically: `CLAUDE.md` and `supabase/migrations/CLAUDE.md` are auto-loaded by agents — do not drop load-bearing content (esp. the migration-pushed-already decision tree); a consolidation that loses a critical rule is worse than the duplication it removes.

**RE-HOMED ITEMS CARRY REAL GATES (when you get to them):**
- **C169 + C31** touch `package-lock.json` + `.github/workflows/*.yml`. Before merging any Dependabot PR: confirm `npm run check` + E2E pass *with the bump applied* (the known "Security Audit" failure is pre-existing `npm audit` noise, NOT caused by the bump — but the **E2E failures on a subset ARE the real blocker**; first determine whether E2E is broken on `main` independent of any bump). **NEVER merge a Dependabot PR without the user's explicit go.**
- **C33** edits the PROD edge-deploy workflow. Test the changed workflow in a PR; do not let a verification/serialization change silently break the manual-approval gate. Re-read `reference_ci_flakes.md` first.

**PER-PR RITUAL (compact; lighter than Wave 2 — no DB/edge surfaces in the core):** (1) pre-push: dispatch a code-reviewer agent on `git diff main...HEAD`; for docs PRs this is mostly "did we archive a live doc / break a cross-link / lose load-bearing content." Codex GATE 3 is optional for pure-docs PRs (use it for PR C's load-bearing consolidation and for the C169/C33 code-touching work). (2) `npm run check`, push, `gh pr create`. (3) wait for bots. (4) **four-surface triage** (`/pr-triage <PR>`) — even docs PRs get bot comments; check all four surfaces before claiming "0 findings." (5) rebuttal-pass every finding. (6) consolidated fix-up commits (never amend pushed). (7) round-cap after 2 rounds.

**NEVER without explicit user instruction:** push to main · merge ANY PR (incl. Dependabot) · approve a PROD deploy · `git push --force` · delete a doc that another track might still reference (redirect-stub instead, or get a `[user-verdict]`) · touch the intentionally-left-alone untracked files · rewrite this doc's locked decisions mid-execution.

**OK without asking:** `git checkout -b chore/wave3-*` · `git mv`/commit on the feature branch · `git push -u origin chore/wave3-*` for the current feature branch · `gh pr create` · read/grep/baseline · dispatch review/classification agents.

### RIGHT NOW
Read §0 → §1 → §3 Current State → §2 current task → `npm run check` → tell the user where you are. Don't start editing until they confirm. **Respect `[evidence-lockable]` vs `[user-verdict]` tags:** evidence-lockable you may lock from discovery with a one-line rationale; user-verdict (e.g., deleting vs stubbing a doc) gets evidence + a recommendation to the user, who decides.

---

## §1 — DESIGN / LOCKED DECISIONS (WHY)

**Status: Locked** (combined GATE-1 review done at scaffold — small-initiative calibration; see §3 Session 1). Two `[evidence-lockable]` questions remain inside execution (archive mechanism for PR B; consolidation target for PR C).

### Why this wave
Waves 1 (public UX) and 2 (email + security P1) shipped the high-impact, high-risk work. Wave 3 clears the decks: the repo has accumulated ~71 tracked top-level plan docs (77 in the working tree; many for shipped initiatives still sitting in the working `docs/plans/` root), two status docs that still claim work is "OPEN" when it shipped, an `ARCHITECTURE.md` quoting an Oct-2025 lesson count at 8 sites, a spent `TECH_DEBT_AUDIT` doc that should not be mined for fresh work, and four overlapping copies of the migration workflow. None of it is user-facing; all of it is cognitive drag on every future session that has to navigate stale docs. This is mechanical, low-risk, and best done in one focused sweep.

### What the grounding changed vs. the roadmap (read before trusting the roadmap's Wave-3 line)
A 4-agent read-only pass against `main` @ `2d25e23` re-scoped the roadmap's six-item "mechanical docs" lump into three distinct natures:
- **C60 is the real docs core, but the "Algolia-ghost/count fix" sub-item is MOOT.** All 6 `ARCHITECTURE.md` Algolia references already correctly document the Sept-2025 removal; no wrong counts exist. Dropped. What IS real: ~71 tracked top-level docs in `docs/plans/` (~40–55 genuinely archivable), **4 `*-archive.md` files already exist but their sister docs were never moved**, 2 stale status docs, and `ARCHITECTURE.md` carries the stale "1,098 lessons" Oct-2025 baseline at 8 sites (lines 4, 16, 107, 135, 535, 1142, 1527, 2187). **Sharper hazard surfaced by GATE-1:** some plan docs are hardcoded code/data inputs (e.g. the Stage-1 concepts worksheet → `scripts/build-concepts-tool.py` + `data/vocab/academic-concepts.vocab.json`), so archival must grep for references first — never blind-`git mv` (see PR B).
- **C39 is real and load-bearing.** 4 surfaces genuinely overlap (root `CLAUDE.md` §, `supabase/migrations/CLAUDE.md`, `docs/MIGRATION_WORKFLOW.md`, `.claude/commands/new-migration.md`) plus the `database-migrations` skill. Consolidation must preserve the skill's mandatory "has this migration been pushed?" decision tree.
- **C40 is NOT a repo PR.** The 3 target files live in `~/.claude/projects/.../memory/` — out-of-repo. It's the supervisor's own memory hygiene, not a campaign deliverable. Re-homed off the PR track entirely.
- **C31 is now cosmetic, not a flake-fix.** Wave-2's PR #529 (`5910a8f`) added `github-token` to all 8 `setup-cli` steps and fixed the *actual* flake (release-resolution rate-limiting). The version is still `latest` everywhere, but pinning is now an **optional reproducibility lever**, not a CI-failure fix. Fold it into the C169 batch (when #450 bumps `setup-cli` v1→v2, pin to the resolved v2).
- **C169 is bigger than "lhci noise."** 16 open Dependabot PRs (roadmap said 15). The Security-Audit failure is pre-existing `npm audit` noise on *every* PR — but the **real blocker is E2E failures on a subset**. Buckets are known (see §2). Determine first whether E2E is red on `main` independent of any bump.
- **C33 has real teeth and is NOT mechanical docs.** `deploy-edge-functions.yml` runs `max-parallel: 4` with zero post-deploy verification; the `complete-review` silent-no-op that bit us twice (PR #465, PR E #516) is still completely undetected. M-effort deploy-safety engineering. Re-homed to its own careful PR.

### Locked decisions
1. **Scaffold weight = small-initiative** (user, 2026-06-21): this one combined doc + the existing master tracker. Not the 4-file Theme-B weight; not zero-scaffold.
2. **Core wave = C60 + C39**, executed as **3 PRs: A (close-decks) → B (archival) → C (migration-doc 4→2).** Sequence fixed.
3. **PR A leads and folds the staged Wave-2 close-out edits** (the two already-modified working-tree docs) into its opening commit, per the campaign's "bundle docs commits with the next PR" rule (main is PR-protected — no direct push).
4. **Re-home (user-confirmed, 2026-06-21):**
   - **C169 + C31** → a separate CI/lockfile batch, its own session. Merges are the **user's call**. C31 pins `setup-cli` alongside the #450 v2 bump.
   - **C33** → its own deploy-safety PR (post-deploy 3-signal verify + serialize the matrix). After the docs PRs, or whenever the next edge deploy is imminent.
   - **C40** → out-of-repo memory archive-split. NO repo PR. Supervisor does it as memory maintenance (`feedback_repo_doc_rules_vs_memory_writes` — memory hygiene is independent of repo-doc rules).
5. **Algolia sub-item DROPPED** (moot per grounding).
6. **Untracked files left alone** (user): the 5 `docs/plans/*-kickoff.md` (including this wave's own `...-kickoff.md`) + `docs/plans/heritage-worksheet-form/` (an HTML tool + README). Do not archive, commit, or delete them in Wave 3.
7. **`[evidence-lockable]` — PR B archive mechanism:** two different "archive" patterns coexist. (a) The status-doc-lifecycle `*-archive.md` sister-file convention (4 already exist in `docs/plans/` root). (b) A wholesale `docs/plans/archive/` subdir for shipped initiatives. For relocating ~50 shipped docs, a subdir is the clean move; the sister-files are a separate live-doc-splitting mechanism. The executor reads the existing pattern and locks the mechanism from evidence (one-line rationale in §3). `git mv` preserves history either way.
8. **`[evidence-lockable]` — PR C consolidation target:** default target = keep (1) root `CLAUDE.md` §"Database: 3-Part Pipeline" as the quick-ref and (2) `supabase/migrations/CLAUDE.md` as the canonical detailed guide (absorbing `docs/MIGRATION_WORKFLOW.md`'s unique content); the `database-migrations` skill stays the mandatory decision-tree source; `new-migration.md` stays a thin command shell or merges into the skill. **`[user-verdict]`:** if consolidation means *deleting* `docs/MIGRATION_WORKFLOW.md` (vs. leaving a one-line redirect stub), present evidence + a recommendation to the user — don't unilaterally delete a doc other things may link to.

### Out of scope / deferred (do NOT scope-creep)
- **The Wave-2 deferred security/DB follow-ups are NOT Wave 3** (kickoff rule): the **SECURITY DEFINER `search_path` hardening sweep** and the **`password-reset` audit-CHECK gap** are security/DB hygiene needing migrations — they belong to a later wave (W4/W7), not docs hygiene. Do not fold them in without the user's OK.
- **C04** (Resend DNS — user's), **C128** (orphaned invitation-management — arch decision), **C130** (admin session timeout — later frontend slice), **C05** (rejection UI — gated on C04) — all carried in the campaign memory, none in Wave 3.
- **F4/F5 process tooling** (C37/C38) — a separate track ("after W1, before W5"), not Wave 3, even though it's adjacent to C39/C40.
- **The wider tech-debt tail** (C61 simplification, C100 RLS test coverage, etc.) — Wave 7.

---

## §2 — IMPLEMENTATION PLAN (WHAT)

> Each PR = its own `chore/wave3-*` branch off latest `main`. The scaffold commit (this doc + the tracker update + the folded Wave-2 close-out edits) lives on PR A's branch. Re-verify all anchors, file lists, and counts before editing — they drift.

### PR A — "close the decks"  ·  branch `chore/wave3-close-decks`  ·  pipeline: docs-only

**Goal:** fold the pending Wave-2 close-out edits and clear the highest-signal stale claims in one small PR.

**Tasks:**
- **A.0 (fold)** — The two already-modified working-tree docs are the Wave-2 close-out edits and ride this PR's first commit (already staged by the scaffold session): `docs/plans/2026-06-21-deferred-campaign-status.md` (Wave-2 → ✅ SHIPPED) and `docs/plans/2026-06-21-wave2-email-security-execution.md` (§3 → CLOSED). Plus this scaffold doc + the tracker's Wave-3-row update. (No action if the scaffold commit already captured them — verify with `git log -1 --stat`.)
- **A.1 (state RESOLVED via GATE-1 git verification — use the verified banner below)** — Closure banner on `docs/plans/2026-04-27-phase-8b-execution-status.md` (says "PR #470 OPEN" line ~4 + "In flight" line ~41/43). **Verified state (Codex GATE-1, local git):** PR #470's branch `origin/feat/phase-8b-reviewer-flow` was **NOT merged as a merge commit**, BUT its reviewer-flow feature code **IS on `main` via rebased/patch-equivalent commits** (`e72cf55` "Phase 8b full binding-intent banner" et al.; the banner lives at `src/pages/ReviewDetail.tsx:1203`). So Phase 8b shipped — just not through a #470 merge. **Write exactly this (do NOT say "shipped via #470 merge" — that's false; do NOT say "never shipped" — also false):** *"CLOSED — Phase 8b shipped: PR #470's original branch was not merged as a merge commit, but its reviewer-flow changes landed on `main` via rebased/patch-equivalent commits; this doc's 'PR #470 OPEN' status is stale."* (Cross-ref memory `[[project_lesson_submission_tier1]]`: "Phases 1–8b all shipped + PROD-applied".)
- **A.2** — Closure banner on `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-execution-status.md` (604 lines): header already notes PR #496 squash-merged `6b2fac2`, but the body still frames Session-82 curriculum work as pending. It's complete (memory `[[project_concepts_worksheet_wizard]]`: team review returned 208/208; roadmap C95 = Resolved). Add a top CLOSED banner; do NOT rewrite the 604-line body (orient from its header, don't full-read — its single header paragraph is itself enormous).
- **A.3** — `docs/ARCHITECTURE.md`: **8 occurrences** of the stale "1,098 lessons" Oct-2025 baseline (lines 4, 16, 107, 135, 535, 1142, 1527, 2187 — `grep -n "1,098\|1098"`). Replace/annotate with a stale-count note that points to live state — **do NOT invent a current number** (CLAUDE.md notes the row count drifts; query the DB or just say "see live DB / CLAUDE.md"). A single top-of-file editor's note that the page's production metrics are stale as of Oct 2025 + neutralizing the inline counts is sufficient (don't fabricate a fresh number at each of the 8 sites).
- **A.4** — `docs/TECH_DEBT_AUDIT_2025-12.md`: add a SUPERSEDED banner at the top — its items C145–C156 were closed by PRs #356–#389 (Dec 2025) or declined; do NOT mine it for fresh work; point to `2026-06-20-deferred-work-roadmap.md`. (Per roadmap "Source-hygiene byproduct".)
- **A.5** — Confirm the master tracker `docs/plans/2026-06-21-deferred-campaign-status.md` Wave-3 row reflects "active / scaffolded" with a pointer to this doc (the scaffold session sets this; verify it's correct).
- **A.6** — Pre-push: code-reviewer agent on the diff (docs-accuracy focus: are the banners factually right, cross-links intact). `npm run check`. Push → `gh pr create` → four-surface bot triage. **No DB/edge gates.**

### PR B — docs archival  ·  branch `chore/wave3-archival`  ·  pipeline: docs-only

**Goal:** relocate shipped-initiative plan docs out of the working `docs/plans/` root so it shows live/in-flight work only.

**Tasks:**
- **B.1 `[evidence-lockable]`** — Lock the archive mechanism (decision #7): read how the existing 4 `*-archive.md` sister files are used, then decide subdir (`docs/plans/archive/`) vs sister-file convention for relocating *shipped initiatives*. Default recommendation = a `docs/plans/archive/` subdir (the sister-file pattern is for splitting live status docs, a different job). One-line rationale in §3.
- **B.2** — Classify every `docs/plans/*.md` as **LIVE** (keep: active tracker `2026-06-21-deferred-campaign-status.md`, roadmap `2026-06-20-deferred-work-roadmap.md`, this Wave-3 doc, the Wave-2 doc, anything an open track references) vs **ARCHIVABLE** (shipped/closed: Phase 7c pair, metadata-rebuild family + their existing `-archive.md` sisters, search-modernization set, Theme-B set, early 2024–2025 design docs, the `oQ` research artifacts). Grounding estimate: ~40–55 archivable of ~71 tracked top-level docs.
  - **⚠️ GATE-1 (HIGH) — code-referenced docs are NOT freely movable.** Some plan docs are hardcoded INPUTS to scripts/data, not just historical prose. **Confirmed landmine:** `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` is referenced by `scripts/build-concepts-tool.py:11,61` and `data/vocab/academic-concepts.vocab.json:3` — a blind `git mv` would break the concepts-tool build. **Before moving ANY doc, grep the whole repo for its filename** (`git grep -n "<doc-filename>" -- ':!docs/plans/'` plus a scan of `scripts/ data/ src/ *.json *.py .claude/`). If a doc is code/data-referenced: KEEP it in place, OR move it AND update every reference in the SAME PR (then `npm run check` + a smoke of the affected script). Never move a parser input silently.
  - **Two hazards, both supervisor-verified:** (a) mis-archiving a still-LIVE doc — spot-check each candidate's internal status markers; (b) breaking a code/data reference — the grep scan above. This classify-then-`git mv` pass is a good single-executor dispatch given the explicit criteria + the reference-scan requirement; supervisor re-verifies the LIVE set was untouched AND `git grep` finds no dangling path to a moved file.
- **B.3** — Create `docs/plans/ARCHIVAL_MANIFEST.md`: one row per archived doc (file · initiative · shipped date/closing PR or session · one-line rationale). This is the navigation aid so archived ≠ lost.
- **B.4** — `git mv` the archivable set into the locked location (history preserved). **Leave the intentionally-untracked files alone** (the 5 `*-kickoff.md` + `heritage-worksheet-form/` — decision #6). Update any in-repo cross-links that break (grep for references to moved paths).
- **B.5** — Pre-push: code-reviewer (focus: no live doc archived, no dangling cross-links). `npm run check`. Push → PR → four-surface triage.

### PR C — C39 migration-doc 4→2 consolidation  ·  branch `chore/wave3-migration-docs`  ·  pipeline: docs-only (LOAD-BEARING)

**Goal:** collapse 4 overlapping migration-workflow surfaces to 2 canonical ones without losing any load-bearing rule.

**The 4 surfaces (re-verify):**
- `CLAUDE.md` (root) §"Database: 3-Part Pipeline" (~lines 26–83) — quick reference.
- `supabase/migrations/CLAUDE.md` (374 lines) — the detailed guide.
- `docs/MIGRATION_WORKFLOW.md` (249 lines) — full workflow doc (largely redundant with the above).
- `.claude/commands/new-migration.md` (40 lines) — thin command reference.
- Plus `.claude/skills/database-migrations/SKILL.md` — the **mandatory** decision tree ("has this migration been pushed?"). This is the authoritative gate and must survive prominently.

**Tasks:**
- **C.1 `[evidence-lockable]` / `[user-verdict]`** — Read all 4 surfaces + the skill. Lock the 2-surface target (default in decision #8: root `CLAUDE.md` quick-ref + `supabase/migrations/CLAUDE.md` canonical, absorbing `MIGRATION_WORKFLOW.md`'s unique content; skill stays the decision-tree source). **If the plan is to DELETE `docs/MIGRATION_WORKFLOW.md` rather than leave a redirect stub, that's a `[user-verdict]`** — present evidence (who links to it) + a recommendation; don't delete unilaterally.
- **C.2** — Execute the consolidation: move unique content into the canonical guide, replace the retired surface(s) with a one-line redirect (or delete per the verdict), de-duplicate the root `CLAUDE.md` § down to a true quick-ref that points at the canonical guide + the skill. **Preserve every load-bearing rule** — especially: the **migration-already-pushed decision tree** (the actual tree lives at `.claude/skills/database-migrations/SKILL.md:25-37` — it is **NON-RETIRABLE**; consolidation must NOT delete or gut that skill, only point at it), the same-day-date-prefix ASCII sort gotcha, and the TEST-DB-verify-before-merge mandate.
- **C.3** — Verify: `npm run check` (CLAUDE.md changes don't affect it but rules out accidental code edits); grep that no skill/command references a path you removed; read the final 2 surfaces end-to-end to confirm no rule was lost.
- **C.4** — Pre-push: code-reviewer + (recommended here, given load-bearing) Codex GATE 3 on the consolidation — "what rule got dropped?" Push → PR → four-surface triage.

### Re-homed — C169 + C31 (CI / lockfile batch)  ·  branch(es) per Dependabot  ·  pipeline: CI/lockfile  ·  **separate session, merges = USER's call**

**Pre-flight:** read `reference_ci_flakes.md`. **First determine whether E2E is red on `main` independent of any bump** — that decides whether Buckets 1+3 are safe to merge as-is. The "Security Audit" failure is pre-existing `npm audit` noise on every PR (not bump-caused).

**Buckets (grounded; re-confirm current state with `gh pr list --author "app/dependabot" --state open` + `gh pr checks <n>`):**
- **Bucket 1 — merge-ready** (pass E2E; only Security-Audit noise fails): **#450** (`supabase/setup-cli` v1→v2, major — **this is where C31 lands**: pin to the resolved v2 across all 8 steps), **#434** (`actions/github-script` 7→9), **#486** (`actions/dependency-review-action` 4→5).
- **Bucket 2 — investigate** (fail E2E too): **#502** (`nwtgck/actions-netlify` 3→4), **#501** (`codecov/codecov-action` 5→7), **#460** (`eslint` 9→10 major), **#451** (`typescript` 5.9→6.0 major). The TS/eslint majors are the most likely to need code fixes.
- **Bucket 3 — routine minors/patches** (mergeable, only Security-Audit noise): **#459** (react-dom), **#457** (recharts), **#456** (`@tailwindcss/postcss`), **#455** (tailwindcss), **#454** (`@tanstack/react-virtual`), **#453** (`@tanstack/react-query`), **#452** (prettier).
- **Bucket 4 — conflict** (needs rebase): **#458** (`glob` 11→13, conflicting state).

**Tasks:** (1) settle the E2E-on-main question. (2) **C31:** on #450, pin `setup-cli` `version:` to the v2 release across the 8 steps (5 workflows) — keep the `github-token` from #529. (3) Present the buckets to the user; **merge only what they approve.** Batch Bucket 1+3 if E2E is clean. Investigate Bucket 2 per-PR (does the major bump break `npm run check`/E2E?). Rebase or close #458. (4) Standard per-PR ritual; **NEVER merge without the user's go.**

### Re-homed — C33 (deploy-safety)  ·  branch `chore/wave3-edge-deploy-verify`  ·  pipeline: CI / deploy-safety  ·  own careful PR

**Gap:** `deploy-edge-functions.yml` runs the deploy matrix at `max-parallel: 4` (deploy-test ~lines 182–270, deploy-prod, report ~286–329) with **no post-deploy verification** — no version check, no `ezbr_sha256`, no source grep. The report job only reads the job result code, so a silent no-op (which recurred on `complete-review` twice) reports green. **Tasks:** add a per-function post-deploy 3-signal verify step (version bumped + sha + content grep, mirroring the manual MCP procedure in `reference_ci_flakes.md`) and serialize the matrix (`max-parallel: 1`) so failures are attributable. **Test the changed workflow in the PR; do not break the manual-approval gate.** Read `reference_ci_flakes.md` first. M-effort. Do after the docs PRs or when the next edge deploy is imminent.

### Re-homed — C40 (memory archive-split)  ·  NO repo PR  ·  supervisor memory maintenance

Out-of-repo. Apply the status-doc lifecycle (Current-State header first + recent entries in the live file; older sessions split into a `*-archive.md` sibling) to the 3 largest journal memory files in `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/` (machine-specific path — verify it on the executing machine; the slug encodes this repo's local checkout path):
- `project_metadata_rebuild_initiative.md` (~110 KB / 799 lines — COMPLETE)
- `project_internal_design_system.md` (~80 KB / 585 lines — COMPLETE)
- `project_lesson_submission_tier1.md` (~66 KB / 279 lines — COMPLETE)

All three are closed initiatives → safe to compress the live file to a Current-State + pointer and move the journal detail to an archive sibling. Update the `MEMORY.md` index line if the pointer changes. **Not a PR, not a campaign deliverable** — do it whenever; it just lightens future-session context.

---

## §3 — STATUS (WHERE we are)

**Last updated:** 2026-06-21 by Session 2 — **PR A open as #532**; round-1 triage + Codex cross-family pass both clean (claude-review APPROVE · Codex AGREE-SHIP); round-1 fix-up pushed. **Awaiting the user's merge call.**

### Current State
**Active PR:** **PR A — "close the decks" = #532** (https://github.com/danfeder/esnyc-lesson-search-react/pull/532), OPEN. A.1–A.6 complete; three independent gates agree (claude-review APPROVE · pre-push reviewer APPROVE · Codex AGREE-SHIP). Awaiting the user's merge call (docs-only; no DB/edge gates).
**Current task:** **NONE pending on PR A** — round-1 fix-up pushed. Next is the user's merge call, then **PR B (archival)**.
**Branch:** `chore/wave3-close-decks` (PR A's branch), pushed. Commits: scaffold `be570ab` + A.1–A.5 `49a5c91` + round-1 fix-up.
**Last commit on main:** `2d25e23` (#531 C138, Wave 2 close).
**Baseline:** `npm run check` green.

### Recent decisions worth carrying forward
- Scaffold committed on PR A's branch (not a standalone docs PR), bundling the Wave-2 close-out edits — same pattern as Wave 2 (`feedback_no_docs_push_during_pr`). Main is PR-protected → no direct push.
- Small-initiative weight + the C60+C39 core / C169+C31+C33+C40 re-home split were user-confirmed via 3 AskUserQuestion answers (2026-06-21): small-initiative · accept re-scope · leave untracked files alone.
- Grounding deltas folded into §1 (Algolia dropped, C40 not-a-PR, C31 cosmetic post-#529, C169 E2E is the real blocker, C33 has teeth).

### Out-of-scope follow-ups captured here
- Wave-2 deferred security/DB items (SECURITY DEFINER `search_path` sweep, `password-reset` audit-CHECK gap) — **explicitly NOT Wave 3** (W4/W7).
- C04 / C128 / C130 / C05 — carried in campaign memory `[[project_deferred_work_campaign]]`.
- F4/F5 process tooling (C37/C38) — separate track.

### Done
- ✅ **Scaffold (Session 1, 2026-06-21)** — orientation (read campaign memory + master tracker + roadmap Wave-3 + grounded each item via a 4-agent read-only Workflow against `main` @ `2d25e23`) → user-confirmed scope/weight (3 questions) → authored this combined doc + updated the master tracker's Wave-3 row → **combined GATE-1 review (Codex `gpt-5.5`, cross-family; verdict fold-4-fixes — all folded)** → committed on `chore/wave3-close-decks` with the folded Wave-2 close-out edits. No execution yet.

### In flight
- **PR A — "close the decks" (#532)** — OPEN, all gates clean. Round-1 four-surface triage: claude-review **APPROVE**; all CI green except the pre-existing Security-Audit `npm audit` noise (rejected, `.md`-only diff). Codex cross-family rebuttal pass: **AGREE-SHIP** (corroborated A.1 via `git cherry` patch-equivalence, A.2 banner-only, A.3 no fabricated count; all 4 triage verdicts upheld). Round-1 fix-up pushed. **Awaiting the user's merge call**, then PR B.

### Blocked
(none)

### Session log
#### Session 1 — 2026-06-21 — Wave 3 kickoff + scaffold
- Read campaign memory `[[project_deferred_work_campaign]]` + master tracker + roadmap Wave-3 section + "Source-hygiene byproduct".
- `git`/`npm run check` baseline clean (HEAD `2d25e23`; the only working-tree changes were the staged Wave-2 close-out edits + intentionally-left-alone untracked files).
- Ran a 4-agent read-only grounding Workflow against `main`; surfaced the re-scope deltas (Algolia moot; C40 out-of-repo; C31 cosmetic post-#529; C169 = 16 PRs with E2E as the real blocker, buckets mapped; C33 a real deploy-safety gap, not docs).
- User confirmed (3 AskUserQuestion answers): **small-initiative weight · accept the re-scope (core = C60+C39; C33/C40/C169+C31 re-homed) · leave untracked files alone.**
- Authored this combined doc + updated the master tracker Wave-3 row.
- **GATE-1 review (combined, small-initiative calibration) = Codex `gpt-5.5` cross-family, run via direct `codex exec` (read-only sandbox).** The `codex:codex-rescue` agent + a Claude `feature-dev:code-reviewer` agent BOTH died on transient `API Error: 529 Overloaded` (0 tool-calls / 0 tokens ×3, ~193s each) — Anthropic-side subagent-spawn overload, NOT a Codex problem (Codex CLI v0.140.0 healthy: `auth.json` present, `codex app-server` running, smoke returned `CODEX_OK`). Bypassed the broken Claude wrapper and drove Codex directly. **Verdict: fold-4-fixes — all folded:** (1) BLOCKER-wording → A.1 phase-8b banner pinned to the git-verified truth (reviewer-flow feature IS in `main` via rebased/patch-equivalent commits, NOT a #470 merge commit; banner at `ReviewDetail.tsx:1203`); (2) HIGH → PR B code-referenced-doc grep scan (the Stage-1 concepts worksheet is a hardcoded input to `scripts/build-concepts-tool.py:11,61` + `data/vocab/academic-concepts.vocab.json:3` — a blind `git mv` would break the build); (3) MEDIUM → C.2 marks `.claude/skills/database-migrations/SKILL.md:25-37` decision tree non-retirable; (4) LOW×3 → count fixes (concepts doc 604 lines / ARCHITECTURE 8 occurrences / docs/plans ~71 tracked top-level). No internal-consistency issues found.
- Committed scaffold + folds on `chore/wave3-close-decks` (NOT pushed).
- **Next:** `/clear` → paste §0 → execute PR A (close-decks) in a fresh session.

#### Session 2 — 2026-06-21 — PR A "close the decks" execution
- Session-start ritual: git matched §3 (on `chore/wave3-close-decks`, scaffold `be570ab` in place, 6 intentionally-untracked items present + left alone); `npm run check` green baseline; A.0 verified already folded into `be570ab` (Wave-2 close-out edits). User confirmed orientation.
- Re-verified all anchors before editing (counts/line numbers drift): A.3's 8 `1,098` sites matched §1 exactly (lines 4, 16, 107, 135, 535, 1142, 1527, 2187).
- **A.1** — CLOSED banner on `2026-04-27-phase-8b-execution-status.md` using the exact git-verified wording (shipped via rebased/patch-equivalent commits, NOT a #470 merge commit). No private-memory citation in the repo doc (per `feedback_repo_doc_rules_vs_memory_writes`).
- **A.2** — top CLOSED banner on `2026-05-12-...concepts-execution-status.md` (worksheet shipped PR #496 `6b2fac2`; team review 208/208 complete + integrated). Body untouched.
- **A.3** — `ARCHITECTURE.md`: added top editor's note + reframed the 4 assertive present-tense counts (lines 4, 107, 135, 2187) to "Oct 2025 baseline". Left line 18 (already under an explicit "(October 2025)" header) and the 3 illustrative/sizing values (537 sample response, 1144/1529 size estimates) under the umbrella note. **No fabricated current number** (per A.3 rule).
- **A.4** — SUPERSEDED banner on `TECH_DEBT_AUDIT_2025-12.md` (do-not-mine; points to `2026-06-20-deferred-work-roadmap.md`).
- **A.5** — bumped master tracker (`2026-06-21-deferred-campaign-status.md`) Wave-3 row + header from SCAFFOLDED → PR A IN FLIGHT.
- Verified: `npm run check` green after all edits; `git diff --stat` = 5 docs files (+§3 of this doc), 0 code touched.
- **A.6** — pre-push `feature-dev:code-reviewer` = APPROVE (one LOW: present-tense count under an Oct-2025 header → folded by dropping the "Current" label). Committed `49a5c91`, pushed, opened **PR #532**.
- **A.6 four-surface triage** — claude-review **APPROVE** with 3 findings (Minor §3-staleness; Informational 3 un-annotated ARCHITECTURE counts; Informational C40 machine-specific path). CI all green except **Security Audit FAILURE = pre-existing `npm audit` noise** (the `@lhci/cli` chain + babel/react-router/dompurify advisories; `.md`-only diff can't introduce it → rejected). Round-1 fix-up folds findings 1+3 + annotates 2 of the 3 counts (left the ASCII-box `total_count: 1098` as illustrative).
- **Codex cross-family pass (user-requested)** — first two attempts **died silently ~5 min in** = the **foreground-orphan** failure (a long Codex task run foreground gets reaped when the launching subagent returns early). Root cause + the `--background`-and-poll fix saved to memory `[[feedback_prefer_codex_commands]]`. Re-ran via the companion's `task --background` (job `task-mqomfw8v-spu1j9`): completed clean in 5m45s → **AGREE-SHIP**. Independently corroborated A.1 (`git cherry -v` patch-equivalence; no #470 merge commit; banner at `ReviewDetail.tsx:1203`), A.2 banner-only, A.3 no fabricated count; upheld all 4 triage verdicts; found no broken links / lost content.
- **Three independent gates agree → PR A ready.** Round-1 fix-up pushed. **Next:** user's merge call, then PR B (archival).
