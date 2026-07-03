# C169 + C31 — Dependabot/CI batch — PHASE 2 kickoff

> **Post-`/clear` handoff.** Paste this (or "read this file and continue C169 Phase 2") to start the next session cold. Re-homed track of the Wave-3 deferred-work campaign — **NOT a docs PR; merges are the USER's call.** Disk + git + the campaign memory `project_deferred_work_campaign.md` (auto-recalled) are the source of truth.

## Where we are (verify with git first)
- **`main` @ `ea04d17`** (or later). Wave-3 CORE (C60+C39) is DONE — PRs A/B/C merged. **C169 Phase 1 ✅** (this session, 2026-06-22).
- **Phase 1 merged 9 low-risk Dependabot PRs** (rebased onto fresh `main` → fresh CI → green-except-noise → merged): #459 react-dom · #457 recharts · #456 @tailwindcss/postcss · #455 tailwindcss · #454 react-virtual · #453 react-query · #452 prettier · #486 dependency-review-action 4→5 · #434 github-script 7→9. **Cumulative `main` build-verified locally** (`npm ci` + `npm run check` + `npm run build` all green).
- **E2E-on-`main` verdict: GREEN** (PR C, a zero-code docs PR, passed E2E). So fresh reruns are trustworthy; any NEW failure on a rebased bump is real.

## Phase 2 — the 6 still-open Dependabot PRs
Re-confirm the live set first: `gh pr list --author "app/dependabot" --state open`.

| PR | Bump | Plan |
|----|------|------|
| **#450** | `supabase/setup-cli` 1→2 | **C31 lives here. CAREFUL** — used in **5 deploy workflows** (`deploy-edge-functions`, `migrate-production`, `reset-test-db`, `backup-production`, `e2e`) incl. the PROD pipeline. Read the setup-cli **action v2** changelog for breaking changes; `@dependabot rebase`; confirm the `e2e.yml` rerun (which uses it) stays green before recommending merge. **Nothing to "pin"** — PR #529's `github-token` already fixed the rate-limit; merging #450 *is* the v1→v2 bump. |
| **#502** | `nwtgck/actions-netlify` 3→4 | In `ci.yml` deploy path. Showed E2E fail on **2026-06-08** (same day as #501 → smells like a shared/flake cause, not the bump). Rebase → see if real. |
| **#501** | `codecov/codecov-action` 5→7 | In `ci.yml` coverage. Same 06-08 fail. Rebase → see if real. |
| **#458** | `glob` 11→13 (dev-dep major) | CONFLICTING/DIRTY. Low value → **rebase-or-close** (check if glob is a direct dep first: `grep '"glob"' package.json`). |
| **#460** | `eslint` 9→10 (major) | **DEFERRED (user call).** Broke Test&Build — real flat-config breaking-change work → own session. Leave open, untouched. |
| **#451** | `typescript` 5.9→6.0 (major) | **DEFERRED (user call).** Broke Test&Build — new type errors → own session. Leave open, untouched. |

## Protocol / rules (load-bearing)
- **Stale Dependabot CI is UNTRUSTWORTHY** (these PRs last ran weeks ago vs an old `main`). Always `@dependabot rebase` first → wait for FRESH CI → judge on that. Never merge on stale green.
- **NEVER merge a Dependabot PR without the user's EXPLICIT go.** Present a fresh-green slate + recommendation; user decides.
- **`Security Audit` FAILURE = pre-existing `npm audit` noise** (lhci/babel/etc.; non-required check; failed identically on the docs-only PR C). Reject it; it never blocks merge.
- **package-lock cascade:** after the first lockfile-touching PR merges, later ones can flip to CONFLICTING — just `@dependabot rebase` the conflicting one, re-confirm green, re-merge.
- **After landing a batch, build-verify the cumulative `main`** (`npm ci && npm run check && npm run build`) — no single PR's CI tested all bumps combined.
- **zsh gotcha:** `for n in $var` does NOT word-split in zsh (unlike bash) → use a **literal list** (`for n in 450 502 501`) or `${=var}`. (A poll loop silently no-op'd 11 iters from this.)
- **Polling Dependabot/CI:** background `gh` poll on a ~90s cadence works but lags reality by up to one tick — a direct one-shot `gh pr view <n> --json commits,statusCheckRollup,mergeStateStatus` is the truth. Read the bg output file; don't over-trust the poll's "not done yet."
- **Pre-flight reading:** `reference_ci_flakes.md` (auto-loaded pointer) — setup-cli rate-limit fix #529, the matrix silent-no-op, dep-bump split rules.

## Session-start steps
1. `git status --short && git rev-parse --abbrev-ref HEAD && git log --oneline -3` — confirm clean `main` (only the 6 intentionally-untracked `*-kickoff.md` + `heritage-worksheet-form/` should be untracked — **leave them alone**, including THIS file).
2. `gh pr list --author "app/dependabot" --state open` — re-confirm the 6 (or fewer) open.
3. Recall campaign memory `project_deferred_work_campaign.md` (the C169 entry has full detail).
4. Tell the user where you are; recommend starting with the safe pair (#502/#501 rebase-and-see) and the careful #450 (changelog + rebase) — bring a fresh-green slate back for the merge go. Defer #460/#451.

## After C169 — the Wave-3 TAIL (don't lose track)
Finishing Phase 2 does **not** end Wave 3. Still owed (also recorded at the top of campaign memory `project_deferred_work_campaign.md` + the MEMORY.md index, so it survives this doc):
1. ⬜ **C33 — deploy-edge-functions post-deploy 3-signal verify + serialize the `max-parallel:4` matrix.** Own careful PR; real teeth (the `complete-review` silent-no-op recurred 2×). Best timed to the next edge deploy.
2. ⬜ **C40 — out-of-repo memory archive-split** of the 3 biggest journals. No PR; trivial/zero-risk; anytime.
3. ⬜ **Decide the 2 deferred majors** — #460 eslint 9→10 + #451 TS 5.9→6.0 (own session each, or close).
4. ⬜ **Bookkeeping fold** — Wave-3 exec doc §3 + master tracker (`docs/plans/2026-06-21-deferred-campaign-status.md`) still say "PR C in flight" → fold "PR C merged + Wave-3-core-complete" into the next supervisor-authored PR (likely C33's branch; trust-git-then-fix-§3).

**Then Wave 3 = DONE → next is roadmap Wave 4 (data/corpus cleanup, DB-careful).**
