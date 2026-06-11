---
description: Resume the Concepts Wizard finish-and-handoff work — re-primes a fresh session from the slim plan, runs the next session's work
disable-model-invocation: true
argument-hint: (optional) "status only"
allowed-tools: Read, Bash(git log:*), Bash(git status:*), Bash(grep:*), Bash(python3 scripts/build-concepts-tool.py:*)
---

# Concepts Wizard — finish & handoff resume

You are resuming a multi-session build in a fresh context. The authoritative plan is
**`docs/plans/2026-06-10-concepts-wizard-finish-plan.md`** (slim, adopted 2026-06-10 — it replaced
the Batch-1/2/3 milestone machinery; the old status doc is frozen history). Optional input:
**$ARGUMENTS** — if `status only`, just report state + next unchecked item and stop.

## Live state (auto-loaded)

**Recent commits:**
!`git log --oneline -6`

**Working tree:**
!`git status --short`

**Parser check (must be unchanged outside the Session-2 sidecar merge):**
!`python3 scripts/build-concepts-tool.py --verify-only 2>&1`

## What to do

1. **Sanity-check:** branch must be `tools/concepts-worksheet-form`; the parser must print
   `Parsed 208 entries (§11=32, §12=39, §13=137).` + `merge-target extraction: 53 of 78 … (68%)`.
   If off, STOP and report drift. (The `bd`/dolt pre-commit warning is the known-broken Beads CLI — ignore.)
2. **Read the plan** (`docs/plans/2026-06-10-concepts-wizard-finish-plan.md`) — goal, locked
   decisions, safety floor, and the first unchecked session checklist item. That's the whole brief;
   only dip into the old design/plan docs if a specific behavior needs its spec (e.g. the design
   §15 smoke-gate definitions for Session 3).
3. **Execute the next session's checklist inline** (no per-milestone workflow ceremony). Workflows
   only for the two places they pay: the Session-2 208-note rewrite fan-out and the Session-3 dry run.
   Build = `python3 scripts/build-concepts-tool.py --verify-only` then `--build-html`; artifact at
   `file:///Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`
   (drive it with the chrome-devtools MCP).
4. **Gate:** show the user any new reviewer-facing wording (and the Session-2 rewrite sample) before
   committing. Everything else auto-proceeds.
5. After the session's work: verify the safety floor (SHA + console-clean + parser counts), commit
   source files only, tick the checklist + add a one-line session note in the plan.

## Safety floor (never relaxed — full text in the plan)

- Empty-export SHA `0c49a7a720d6e703d995bab9969e0a98d8f582aad7655dab1d3513bf4d06cd03` byte-identical on clean state, every commit.
- Never stage the generated HTML (gitignored); never hand-edit it — rebuild via `--build-html`.
- Stay on `tools/concepts-worksheet-form`; no push/PR without explicit direction.
- Plain language on screen (no §/CON-xx/tier/verdict/cluster/canonical/`<to_fill>`).
- Build-script edits only for the Session-2 sidecar merge, with counts + SHA unchanged.
- Beads CLI is broken — don't run `bd`.
