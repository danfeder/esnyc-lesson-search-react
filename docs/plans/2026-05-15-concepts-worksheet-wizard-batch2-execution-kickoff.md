# Concepts Worksheet Wizard — Batch 2 Per-Milestone Execution Kickoff

> **Use this prompt at the start of each fresh session** (or as the brief for a
> dynamic workflow — see "Execution model" below). It tells you which milestone
> to execute next, where the spec lives, and the verification pattern.
>
> Companion docs:
> - `2026-05-15-concepts-worksheet-wizard-design.md` — locked design (W1–W22; §4.1 = plain-language voice)
> - `2026-05-15-concepts-worksheet-wizard-plan.md` — bite-sized milestone spec (Batch 2 = `### Milestone 2.X`)
> - `2026-05-15-concepts-worksheet-wizard-status.md` — single source of truth for progress
> - `2026-05-15-concepts-worksheet-wizard-execution-kickoff.md` — Batch 1 kickoff (closed on M1.17; reference only)

# WHAT THIS SESSION IS

Execute ONE milestone of **Batch 2** ("hand-holdy polish") of the concepts-worksheet wizard. Batch 1 (the working MVP) SHIPPED at M1.17. Batch 2 adds: a plain-language pass, cluster auto-prefill, mismatch detection, the review-summary screen, the intro rewrite, counter polish, the full 8/8 smoke gate, and the README handoff.

After commit, suggest `/clear` + re-paste this kickoff so context stays fresh.

# EXECUTION MODEL (read before choosing how to run)

> **⚠ REVIEW CADENCE UPDATED 2026-05-28 (user directive).** The original per-milestone review gate below is **relaxed to "prose + smoke only"**: auto-proceed (execute → verify → commit → continue) through the **mechanical** milestones **M2.1, M2.1b, M2.2, M2.3, M2.5**; pause for full user review only on the **prose** milestones (**M2.4** intro, **M2.7** README) and the **smoke gate** (**M2.6**). The always-on safety floor (empty-export SHA invariant, never commit the generated HTML, never push/PR, parser untouched, plain-language locked) is **never** relaxed. The reusable entry point is the project command **`/concepts-batch2`**, which re-primes a fresh session (loads state + next milestone) — preferred over re-pasting this file. M2.0 ran under the old per-milestone gate.

These milestones are **sequential, not a parallel fan-out** — most build on the prior one's code (the plan's "Suggested sequence & dependencies" section is the binding order). Two are order-independent: **M2.4** (intro) and **M2.7** (README, after the UI is stable). Run order: **M2.0 → M2.1 → M2.1b → M2.2 → M2.3 → M2.5 → M2.6 → M2.7** (M2.4 anytime).

> **⚠ WORKFLOW-BY-DEFAULT (standing user directive, reaffirmed Sessions 19–21).** Under ultracode, **orchestrate each milestone's execution as a sequential dynamic Workflow by default — do NOT run milestones inline.** The user course-corrected mid-Batch-2 when M2.1b was run inline. Inline is the exception (trivially small change + healthy context only). The `/concepts-batch2` command's "Execution via workflow" section is the authoritative how-to; the proven shape is executor → adversarial-verifier, workflow does NOT commit, main loop reviews diff + re-confirms SHA + browser-checks + commits, and the main-loop verify is load-bearing (M2.2/M2.3 agents missed real things).

Two execution paths:

1. **Dynamic workflow (DEFAULT under ultracode):** a strictly-sequential workflow orchestrates the milestone (executor → adversarial-verifier). It MUST respect three things that are easy to lose in autonomous orchestration:
   - **Sequential pipeline, not parallel.** Each milestone edits the same template and depends on the prior milestone's code. Do not fan milestones out concurrently. (M2.4 / M2.7 are the only ones that may float.)
   - **Review gate (per the 2026-05-28 cadence note above).** Auto-proceed through the mechanical milestones (M2.1/M2.1b/M2.2/M2.3/M2.5); pause for full review only on prose (M2.4/M2.7) + the smoke gate (M2.6). Never auto-commit prose or the smoke gate unprompted. (Before the 2026-05-28 update this was a per-milestone gate on every milestone.)
   - **Browser smoke is real verification.** Each UI milestone is verified in a real browser via chrome-devtools-mcp (screenshots / `evaluate_script` probes), not by unit tests. If the workflow agent has no browser/MCP access, it cannot self-verify — surface that and fall back to attended verification rather than claiming a pass.
2. **Inline (main-loop) — the EXCEPTION, not the default.** Allowed only for a trivially small change (a few lines) when main-loop context is healthy; prefer a workflow if unsure. The main loop must still confirm the empty-export SHA + browser-check before committing. (Batch 1 ran fully inline; Batch 2 under ultracode is workflow-first.)

# STATE CHECK (run first)

```
git status --short --branch
git log --oneline -10
python3 scripts/build-concepts-tool.py --verify-only
```

Expected: on branch `tools/concepts-worksheet-form`; parser prints `Parsed 208 entries (§11=32, §12=39, §13=137).` + `merge-target extraction: 53 of 78 merge recommendations (68%) — 25 fall through to picker`. The parser is **untouched in Batch 2** — if that output changes, STOP and report drift. (The Beads pre-commit warning about a missing dolt branch is the known-broken Beads CLI; ignore it.)

# READ IN ORDER

1. **`...-status.md`** — "Current state" tells you the next milestone. Single source of truth.
2. **`...-plan.md`** — read ONLY the next milestone's `### Milestone 2.X` section (the plan is ~5k lines; do not read end-to-end). Also read the two preamble notes once: the **line-drift caveat** and the **plain-language convention** (both just above `### Files touched in Batch 2`).
3. **`...-design.md`** — read the §section a milestone references (e.g. §11 review summary for M2.3, §17 matrix for M2.1, §4.1 + W22 for any user-facing copy). W1–W22 are locked; don't re-derive.

# HOW TO EXECUTE THE MILESTONE

1. **Apply each step's edits.** `grep -n` the named anchor first — **all cited template line numbers drift** as earlier Batch 2 milestones add code (per the plan's line-drift caveat). Source files: parser `scripts/build-concepts-tool.py` (untouched in Batch 2), template `scripts/concepts-worksheet-tool.template.html`, README `docs/plans/concepts-worksheet-form/README.md` (M2.7 only).
2. **Build:** `python3 scripts/build-concepts-tool.py --verify-only && python3 scripts/build-concepts-tool.py --build-html`.
3. **Browser smoke** via chrome-devtools-mcp at `file:///Users/danfeder/cCode/esynyc-lessonsearch-v2/docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html` — run the milestone's probes.
4. **Data-safety floor (every milestone):** the **empty-export SHA invariant** must hold — `buildExportMarkdown()` on a clean state is byte-identical to the source worksheet (`0c49a7a720d6e703d995bab9969e0a98d8f582aad7655dab1d3513bf4d06cd03`). M2.0 in particular is display-only and MUST NOT change this hash; if it moves, a string edit leaked into the export path.
5. **Pause for user review before committing** — show the smoke result (screenshot / probe output), the proposed commit message (verbatim from the plan), and a `git diff --stat`.
6. **After user says commit**, run the plan's `git add` + `git commit`. **Never `git add` the built `concepts-worksheet-tool.html`** (1 MB generated artifact) — stage source files only.
7. **Update the status doc** (Last milestone / Next milestone / session-log line / smoke matrix rows #6, #7 for M2.6). Default to bundling the status edit into the milestone commit.
8. **Suggest `/clear` + re-paste this kickoff** (recommendation, not directive).

# HARD RULES

- **Don't push to `main`; don't open a PR** without explicit direction. Stay on `tools/concepts-worksheet-form`.
- **Never `git add docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html`** (generated). Never hand-edit it — rebuild via `--build-html`.
- **Plain-language is locked now (W22 / design §4.1).** Every reviewer-visible string is curriculum-team voice: no `§`-codes, `CON-xx` ids, "tier," "verdict," "metadata," "cluster," internal mode names, or `<to_fill>` on screen. The mode chips are **Quick check / Your call / Group decision**. The export/markdown format is exempt and unchanged.
- **Export contract is locked.** `<to_fill>` + the `keep/merge/new/drop` vocab stay in the exported file (the empty-export SHA depends on it). De-jargon is display-only.
- **Don't reopen W1–W22.** If a decision feels wrong, surface it to the user — don't silently revise.
- **Don't change** the 4-verdict export vocab, the 3-tier distribution (32/39/137), or cluster signal option text (audit register is source of truth).
- **Beads CLI is broken** — don't run `bd`. **TodoWrite / TaskCreate are off** — track via plan + status doc only.

# USER PREFERENCES

- Plain language everywhere, especially user-facing copy and decision questions. Surface tradeoffs; don't pre-decide.
- Active reviewer — expects rigor on every milestone; will challenge anything that doesn't fit.
- Data safety > everything: the tool must build + export + reload at every commit boundary.
- M2.4 intro + M2.7 README copy: the user will want to **read the actual prose** (it's their team's voice) — present it for review, don't just ship it.

# RIGHT NOW

1. Run the state-check commands. Stop if anything is unexpected.
2. Read the status doc; identify the next milestone (M2.0 first).
3. Read that milestone's `### Milestone 2.X` section + the two preamble notes.
4. Execute the steps; build; browser-smoke; confirm the empty-export SHA invariant.
5. Pause for user review before committing.
6. After commit, update the status doc + suggest `/clear`.

# MILESTONE INDEX (Batch 2)

Detail in the plan; status doc shows current progress.

| Milestone | Scope | Notes |
|---|---|---|
| **M2.0** | Plain-language UI pass (curriculum voice) | display-only; empty-export SHA must not move; run FIRST |
| **M2.1** | Cluster auto-prefill matrix (§17) + carry-over P2 label fix | caption is born plain ("Based on your earlier group decision") |
| **M2.1b** | CON-24 pick-one canonical Resolve UI (inline reveal) | adds `state.cluster_parents` parallel map |
| **M2.2** | Cluster-mismatch detection + entry callout | callout/prompt are reviewer-facing → plain ("group decision," no CON-id) |
| **M2.3** | Review summary screen (§11) | summary labels reviewer-facing → de-jargon (`cluster`→`group`, drop CON-ids) |
| **M2.4** | Wizard intro rewrite (3-step modal) | order-independent; copy follows the plain-language constraint; user reviews prose |
| **M2.5** | Decision-debt counter zero-state color | only toggles `data-zero`; labels are static HTML (M2.0); don't clobber the count `<b>` |
| **M2.6** | Full smoke gate (8/8, incl. #6 cluster walk + #7 mismatch) | gates Batch 2 done |
| **M2.7** | README + curriculum-team handoff | order-independent (after UI stable); user reviews prose |
