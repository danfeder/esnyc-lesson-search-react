# Concepts Worksheet Wizard — Per-Milestone Execution Kickoff

> **Use this prompt at the start of each fresh session.** Copy-paste as the first
> message after `/clear`. It tells you exactly which milestone to execute next,
> where the spec lives, and the verification pattern.
>
> Companion docs:
> - `2026-05-15-concepts-worksheet-wizard-design.md` — locked design (W1–W21)
> - `2026-05-15-concepts-worksheet-wizard-plan.md` — bite-sized milestone spec
> - `2026-05-15-concepts-worksheet-wizard-status.md` — single source of truth for progress
> - `2026-05-15-concepts-tool-simplification-kickoff.md` — original brainstorm kickoff (design phase only; do NOT re-execute)

# WHAT THIS SESSION IS

Execute ONE milestone of the Batch 1 plan for the concepts-worksheet wizard redesign. After commit, suggest `/clear` + re-paste this kickoff so context stays fresh across the 17-milestone arc.

Group rule: trivial parser-only TDD changes (M1.1, M1.2, M1.3) can batch in one session because each is ~30–60 lines and ~2 minutes of verification. The big JS+CSS milestones (M1.4, M1.6–M1.16) are full sessions each — don't try to bundle them.

# STATE CHECK (run first)

```
git status --short --branch
git log --oneline -10
python3 scripts/build-concepts-tool.py --verify-only
```

Expected: on branch `tools/concepts-worksheet-form`, parser reports `Parsed 208 entries (§11=32, §12=39, §13=137).` (M1.3 onward will also print a `merge-target extraction: N of M …` line.) If anything is off, STOP and report drift to the user.

The Beads pre-commit warning `branch not found: bed61a4…` is the broken Beads dolt log, not a real failure. Ignore it — commits land fine. (Memory note: Beads CLI is broken on this machine.)

# READ IN ORDER

These files are the spec.

1. **`docs/plans/2026-05-15-concepts-worksheet-wizard-status.md`** — read the "Current state" section to identify which milestone is next. This is the single source of truth for progress.

2. **`docs/plans/2026-05-15-concepts-worksheet-wizard-plan.md`** — read ONLY the next milestone's section (`### Milestone M1.X: …`). The plan is ~1830 lines; do not read it end-to-end. Other milestones' sections are not yours to execute this session.

3. **`docs/plans/2026-05-15-concepts-worksheet-wizard-design.md`** — read only if the milestone you're executing references a §section you haven't internalized (e.g., §6.1 Confirm layout for M1.7; §7 merge picker for M1.11; §9 cluster Resolve for M1.10). Don't try to re-derive decisions — W1–W21 are locked.

Skip:
- The original brainstorm kickoff (`2026-05-15-concepts-tool-simplification-kickoff.md`) — that was for the design phase.
- Other milestones' sections in the plan.

# HOW TO EXECUTE THE MILESTONE

The plan's milestone sections are written as bite-sized steps (2–5 min each). Follow them in order:

1. **Apply each step's edits** to the named files. Source paths:
   - Parser: `scripts/build-concepts-tool.py`
   - Template: `scripts/concepts-worksheet-tool.template.html`
   - Status doc: `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md`

2. **Run the step's verification command:**
   - Parser milestones (M1.1–M1.3): `python3 scripts/build-concepts-tool.py --verify-only` + a `--pretty --output /tmp/payload.json` probe.
   - JS/CSS milestones (M1.4+): `python3 scripts/build-concepts-tool.py --build-html` + browser smoke via chrome-devtools-mcp at `file:///Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`.

3. **Pause for user review before committing.** Per their preference, every commit gets explicit ack. Show:
   - The smoke check result (parser stderr, browser screenshot, or console probe output)
   - The proposed commit message (verbatim from the plan)
   - A one-line `git diff --stat` summary of what landed

4. **After user says commit**, run the `git add` + `git commit` exactly as the plan shows. **Do NOT stage `docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`** — that's the 1 MB built artifact; the plan's `git add` commands stage source files only.

5. **Update the status doc** after the commit lands:
   - Bump "Last milestone completed" and "Next milestone"
   - Append a one-line session log entry
   - Fill any relevant row in the smoke check matrix (#1–5, #8 may be relevant for M1.4 / M1.11 / M1.17)
   Ask the user whether to bundle the status doc edit into the next milestone's commit or land it as a tiny standalone commit. Default to bundling for routine progress.

6. **Suggest `/clear` + re-paste this kickoff** to start the next milestone in a fresh session. Phrase it as a recommendation, not a directive — the user may want to keep going.

# HARD RULES

- **Don't push to `main`.** Stay on `tools/concepts-worksheet-form`. No `git push`.
- **Don't open a PR** without explicit user direction.
- **Don't `git add docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`.** That's the 1 MB built artifact; it's never committed. `git add` only the source files.
- **Don't hand-edit the built HTML.** Rebuild via `python3 scripts/build-concepts-tool.py --build-html`.
- **Don't reopen W1–W21.** If a decision feels wrong during implementation, surface it to the user as a concern — don't silently revise the design.
- **Don't change the 4-verdict vocab** (`keep / merge / new / drop`) or the 3-tier distribution (32/39/137). Locked.
- **Don't change cluster signal option text.** Audit register is source of truth.
- **Beads CLI is broken** on this machine. Don't run `bd` commands.
- **TodoWrite / TaskCreate are off** per project rule. Track via the plan + status doc only.
- **Run `python3 scripts/build-concepts-tool.py --verify-only` after every parser edit** before committing.

# USER PREFERENCES

- Plain language in user-facing copy. Surface tradeoffs; don't pre-decide.
- Active reviewer — user will challenge anything that doesn't fit. Same rigor expected on every milestone.
- Data safety > everything else. Tool must build + export at every commit (this is why M1.4 keeps a visible Save & Export menu item).
- No backwards-compat shims; branch is pre-handoff so cuts and reshapes are fine.
- The notes-drawer maps to `curriculum_notes`; `reviewer_note` channel is fully removed (W5).
- Reviewer-facing labels: "Keep as concept" / "Fold into another" / "Add new concept" / "Remove". Export vocab unchanged.
- `new` verdict is rare; behind "Less common: add new concept" link (W9). Don't lift to peer status.
- Tier strip copy per W10: §11 "review carefully" / §12 "confirm or adjust" / §13 "quick pass; pause when unsure." No "variance is okay" / "most are quick keeps."

# RIGHT NOW

1. Run state-check commands above. Stop if anything is unexpected.
2. Read the status doc; identify the next milestone.
3. Read that milestone's section in the plan.
4. Execute the milestone's steps.
5. Pause for user review before committing.
6. After commit, update status doc + suggest `/clear`.

# WHERE THINGS LIVE

| Path | Tracked? | Purpose |
|---|---|---|
| `scripts/build-concepts-tool.py` | yes | Parser (~870 lines after M1.1; grows ~50 more lines through M1.3) |
| `scripts/concepts-worksheet-tool.template.html` | yes | UI template (2198 lines pre-M1.4; ~1500 after wizard rewrite) |
| `docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html` | **no, generated — NEVER `git add`** | Built artifact (~1 MB) |
| `docs/plans/concepts-worksheet-form/README.md` | no | Curriculum-team docs (Batch 2 update) |
| `docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md` | yes | Source worksheet (parser input) |
| `docs/plans/2026-05-15-concepts-worksheet-wizard-design.md` | yes | Locked design (read-only reference) |
| `docs/plans/2026-05-15-concepts-worksheet-wizard-plan.md` | yes | Implementation plan (per-milestone spec) |
| `docs/plans/2026-05-15-concepts-worksheet-wizard-status.md` | yes | Execution status (single source of truth for progress) |
| `docs/plans/2026-05-15-concepts-worksheet-wizard-execution-kickoff.md` | yes | **THIS file** — re-paste at the start of each fresh session |

# MILESTONE INDEX (quick reference)

Detail in the plan; status doc shows current progress.

| Milestone | Scope | Session size |
|---|---|---|
| M1.0 | Branch verification + status doc scaffold | tiny |
| M1.1 | Parser `claude_notes_summary` field | tiny |
| M1.2 | Parser `suggested_merge_target` field | tiny |
| M1.3 | Parser `--verify-only` reports extraction rate | tiny |
| M1.4 | Template rewrite: rip out long-scroll, install wizard shell | **large** |
| M1.5 | Top-bar decision-debt counters | small |
| M1.6 | Step machine (sequence + index storage) | medium |
| M1.7 | Confirm step renderer (§6.1) | **large** |
| M1.8 | Decide step renderer (§6.2, §6.4) | medium |
| M1.9 | Mode-routing distribution verification (no commit unless bug found) | tiny |
| M1.10 | Cluster Resolve step renderer (§9) | medium |
| M1.11 | Merge destination picker (§7) | medium |
| M1.12 | Notes drawer + auto-surface (§8) | small |
| M1.13 | Linear nav + keyboard shortcuts | medium |
| M1.14 | Jump-to-entry + Advanced menu wired | small |
| M1.15 | Simple end screen with Save & Export | small |
| M1.16 | CSS polish pass | medium (screenshots) |
| M1.17 | Batch 1 smoke check gate (§15 #1–5, #8) | small |

Batch 2 (later): M2.1–M2.7 (cluster auto-prefill matrix · mismatch detection · review summary · intro rewrite · counter polish · 8/8 smoke pass · README update).

Recommendation: keep M1.1–M1.3 in one session (tiny parser TDD chain); make each "large" milestone its own session; small/medium milestones can pair with the milestone before or after if context budget allows.
