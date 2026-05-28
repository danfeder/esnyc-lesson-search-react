---
description: Resume the Concepts Worksheet Wizard Batch 2 build — re-primes a fresh session, loads state, runs the next milestone
disable-model-invocation: true
argument-hint: (optional) a specific milestone e.g. "M2.4", or "status only"
allowed-tools: Read, Bash(git log:*), Bash(git status:*), Bash(grep:*), Bash(python3 scripts/build-concepts-tool.py:*)
---

# Concepts Worksheet Wizard — Batch 2 resume

You are resuming a multi-session build in a fresh context (the user just `/clear`-ed). Live state is auto-injected below; the authoritative docs follow. Optional input: **$ARGUMENTS** — if it names a milestone (e.g. `M2.4`) run that one; if it's `status only`, just report state + next milestone and stop; if empty, run the status doc's "next milestone."

## Live state (auto-loaded)

**Next milestone (from status doc):**
!`grep -n "Last milestone completed\|Next milestone" docs/plans/2026-05-15-concepts-worksheet-wizard-status.md`

**Recent commits:**
!`git log --oneline -6`

**Working tree:**
!`git status --short`

**Parser check (must be unchanged):**
!`python3 scripts/build-concepts-tool.py --verify-only 2>&1`

## What to do

1. **Sanity-check the live state above.** The branch must be `tools/concepts-worksheet-form`; the parser must print `Parsed 208 entries (§11=32, §12=39, §13=137).` + `merge-target extraction: 53 of 78 … (68%)`. If either is off, **STOP and report drift** (the `bd`/dolt pre-commit warning is the known-broken Beads CLI — ignore it).
2. **Read, in order:**
   - `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md` — "Current state" → the next milestone (single source of truth).
   - `docs/plans/2026-05-15-concepts-worksheet-wizard-batch2-execution-kickoff.md` — full operating rules (READ IN ORDER, HOW TO EXECUTE, HARD RULES) + the 2026-05-28 review-cadence note.
   - `docs/plans/2026-05-15-concepts-worksheet-wizard-plan.md` — **ONLY** the next milestone's `### Milestone 2.X` section + the two preamble notes (line-drift caveat + plain-language convention). Do **not** read end-to-end (~5k lines).
   - `docs/plans/2026-05-15-concepts-worksheet-wizard-design.md` — the §section that milestone references.
3. **Execute — by DEFAULT orchestrate the milestone as a sequential dynamic Workflow, NOT inline** (see "Execution via workflow" below; standing user directive). The workflow does the spec-reading + edits + build + chrome-devtools browser-smoke and returns compact evidence; the **main loop independently reviews the diff + re-confirms the empty-export SHA + browser-checks the risky bits, then commits.** (`grep -n` each anchor before editing — all cited line numbers drift; build = `python3 scripts/build-concepts-tool.py --verify-only` then `--build-html`; artifact at `file:///Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`.)

## Review cadence (set 2026-05-28 — overrides the kickoff's original per-milestone gate)

- **Mechanical milestones — M2.1, M2.1b, M2.2, M2.3, M2.5 — auto-proceed.** Execute → verify (empty-export SHA byte-identical + browser smoke + zero console errors) → commit (source files only) → update the status doc → **continue to the next milestone in the same run**. Show a brief per-milestone result; do **not** wait for approval.
- **Prose milestones — M2.4 (intro) + M2.7 (README) — and the smoke gate — M2.6 — get full review.** Present the actual prose / the 8-check results + `git diff --stat` + the proposed commit message, and **WAIT for explicit approval** before committing. The user wants to read prose in their team's voice.
- When context grows heavy after a chain of milestones, finish the current commit, then suggest the user `/clear` + re-run `/concepts-batch2` (this command re-primes automatically).
- Run order: **M2.1 → M2.1b → M2.2 → M2.3 → M2.5 → M2.6 → M2.7**; **M2.4** floats (order-independent — do it anytime, with review).

## Execution via workflow (DEFAULT for milestone execution — set 2026-05-28, reaffirmed Sessions 19–21)

**Orchestrate every milestone's execution as a dynamic Workflow by default — do NOT run milestones inline in the main loop.** This is a standing user directive: the user explicitly course-corrected mid-Batch-2 when M2.1b was run inline ("what was SUPPOSED to happen … is that you would utilize dynamic workflows … why didn't that happen?"). Under ultracode, workflow-first keeps the main-loop context light so the build chains many milestones in one session without `/clear`. The M2.1 calibration + the M2.1b/M2.2/M2.3 runs proved a background subagent can drive chrome-devtools-mcp (ToolSearch-load `new_page`/`evaluate_script`/etc.) and that a two-agent **executor → adversarial-verifier** pipeline returns verifiable evidence the main loop checks before committing.

**The proven pattern — use it for each milestone:**
- A **strictly sequential** Workflow (NEVER parallel — single shared browser + dependent edits): phase 1 executor edits the template + builds + browser-smokes + returns a **compact, schema-constrained** evidence object; phase 2 adversarial verifier independently re-checks in a **real browser** (not a Node logic-harness). Put long prompts in the script as template literals or pass via `args` — avoid backticks / `${}` inside prompt text so the script parses.
- **The workflow MUST NOT commit.** It edits source + returns evidence. The **main loop independently reviews the `git diff`, re-confirms the empty-export SHA against `0c49a7a7…`, browser-checks the risky bits, and commits** (source files only).
- **Pre-read the milestone's spec yourself** enough to know the expected probe values AND to brief the executor on every stale-plan trap: wrong function signatures (e.g. `onCommit(key)` not `onCommit(entry)`), W22 jargon in the plan's own draft copy (the plan literally suggests "verdict"/"cluster shape"/`CON-xx`), non-existent `window.__test_*` helpers, stale selectors/tiers (`entry.tier` is `"11"` not `"§11"`), id collisions. Tell agents to use real globals + report ACTUAL observed values.
- **The main-loop verify is load-bearing, not ceremony.** Lesson from M2.2/M2.3: agents DO miss things — a "verdict" W22 slip in a callout headline and a skipped edit both slipped past the executor AND the verifier (whose own jargon-scan even quoted the bad string and passed it). ALWAYS re-read the diff + re-check in the browser before committing.
- **Stop before any prose/smoke-gate milestone (M2.4/M2.6/M2.7)** — those are review-gated (see cadence). For prose, draft the copy and present it for approval before implementing.
- Inline (main-loop) execution is the **exception**, allowed only for a trivially small change (a few lines) when main-loop context is healthy — and even then, prefer a workflow if unsure. **When in doubt, workflow.**

## Always-on safety (NEVER relaxed, even on auto-proceed milestones)

- **Empty-export SHA invariant every milestone:** `buildExportMarkdown()` on a clean state stays byte-identical to source — SHA-256 `0c49a7a720d6e703d995bab9969e0a98d8f582aad7655dab1d3513bf4d06cd03`. If it moves on a display-only milestone, a string leaked into the export path — revert and find it before committing.
- **Never `git add docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`** (≈1 MB generated artifact). Never hand-edit it — rebuild via `--build-html`. Stage **source files only** (`scripts/concepts-worksheet-tool.template.html`, the docs, and for M2.7 the README).
- **Stay on `tools/concepts-worksheet-form`. Do NOT push or open a PR** without explicit direction.
- **Parser (`scripts/build-concepts-tool.py`) is untouched in Batch 2.** If `--verify-only` output changes, STOP.
- **Plain-language is locked (W22 / design §4.1):** every reviewer-visible string is curriculum-team voice (no §-codes, `CON-xx`, "tier," "verdict," "metadata," "cluster," internal mode names, or `<to_fill>` on screen). The export/markdown format (`<to_fill>` + keep/merge/new/drop vocab) is exempt and unchanged.
- **Don't reopen W1–W22, the 4-verdict export vocab, the 32/39/137 tier split, or cluster signal option text** (audit register is source of truth). Surface concerns to the user; don't silently revise.
- **Beads CLI is broken — don't run `bd`. TodoWrite / TaskCreate are off** — track progress via the plan + status doc only.

After each milestone commit, update the status doc (Last/Next milestone + a session-log line; for M2.6 also smoke-matrix rows #6/#7). Record the commit hash with the `<commit-pending>` follow-up pattern when bundling the status edit into the milestone's own commit.
