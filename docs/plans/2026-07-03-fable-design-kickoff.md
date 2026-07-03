# Fable design-session kickoff (2026-07-03, post-FP2 — Fable-checked revision of the Opus draft)

You are Fable, running a DESIGN session for the ESYNYC lesson-search project.
Repo: /Users/danfeder/cCode/esynyc-lessonsearch-v2 — `git pull` first.
The product owner is non-technical: plain language always, explain tradeoffs, and treat
anything touching filter definitions as their call (stakeholder territory).

## Handoff verification status (done — don't redo it)

A prior Fable session spot-checked every load-bearing claim in this handoff chain
(2026-07-03, post-FP2): all 5 merge shas are on main; the FP2 decision checklist is fully
filled (zero blanks); the FP-03 code claims are exact (`SubmissionPage.tsx` `handleIntent`
guard, public `/submit*` routes, commit `f218800`); the Indoor numbers were re-probed on
PROD (literal-Indoor 417, indoor-friendly 607, blank locations 0); TEST baseline re-verified
clean (763/685/130, 0 markers). Trust the documents below.

## What just happened (read these, in order)

1. `docs/plans/2026-07-03-fp2-handoff.md` — one-page cold-read of the FP2 owner walkthrough.
   START HERE. (Its `scratchpad/fp03-…` pointer is stale — the durable copy is
   `docs/plans/fp03-submission-gate-investigation.md`.)
2. `docs/plans/2026-07-03-fp2-walkthrough-script.md` — the filled decision-capture checklist
   (every owner decision + reasoning). The authoritative record.
3. `docs/plans/2026-07-03-frontend-polish-tracker.md` — the ledger; see "GATES CLOSED" and
   "✅ FP2 WALKTHROUGH COMPLETE" blocks in the Morning-handoff section.

Net: 5 frontend PRs merged (#585/#586/#591/#594/#595). **#593 (facet counts) is OPEN and
HELD — do NOT merge it** until the counts convention below is settled. **#593 is now
CONFLICTING vs main** (it shared SearchPage hunks with merged #594), so finalization =
settle the convention → rebase + resolve → update to match the convention → full local
gates → re-verify → owner merges.

## Your job this session — the design agenda (these hang together)

1. **The counts convention** (this is what holds #593). The owner worries the
   OR-within-category / AND-across-category behavior + the "a category's badges ignore that
   category's own selections" rule will confuse teachers. Weigh options with them in plain
   language and land a direction, then spec #593's finalization. Bundle the "show a real 0
   vs. blank" detail. (Verified numbers for examples: Indoor badge should read **607**
   — Indoor∪Both — not the 417 the old script said; blank-location lessons = 0, so FP-18's
   two-checkbox change is purely cosmetic.)
2. **Grade-pill layout** — owner said YES to adding counts to grade pills, but the pills are
   compact; design how numbers fit.
3. **Filter roster** — Cooking Methods as its own category? promote Main Ingredients to a
   search filter? sidebar order? (Owner deferred the whole conversation to this session.
   filterDefinitions territory — decide WITH the owner; changes also need the curriculum
   team per project rule.)
4. **FP-03 submission-flow reachability** — the "fill-first" submit flow was removed in
   Phase-8b (`f218800`); #585's auto-submit only fires via a direct `/submit/new` deep-link,
   never the primary button flow. Decide whether fill-first is worth restoring / redesigning.
   Full investigation: `docs/plans/fp03-submission-gate-investigation.md`.

## Also ready to turn into Opus execution briefs (decided, just needs building)

The handoff's "Approved to BUILD" list: FP-16/17/18/08/19, chooser reassurance line,
FP-12/13 (404+retry), grade counts (rides with #593), **close the Heritage reviewer field**
(owner reversal; closed pick-list from current distinct values; stakeholder territory), and
adopt "index, not host" as a written principle. Per the token-economy rule
(memory: feedback-model-economy-rationing), YOU design + write briefs; Opus executes them in
separate fresh sessions with thin handoffs back.

Optional input if you get to wave-planning: `docs/plans/rung8-morning-burn/` holds 22
fresh, UNRANKED findings from the 6:41am discovery pass (7 fail-open fetch sites post-#591,
useLessonSuggestions per-keystroke waste, "Grades 1–K" sort cosmetic, urlSync/permalink
follow-ups, etc.) — candidates to fold into the same briefs where they overlap.

## Binding constraints

- PROD applies/merges = USER ONLY. No production gates should fire this session
  (#593 is frontend-only; everything else is design/briefs).
- filterDefinitions.ts semantics = stakeholder territory (decide WITH the owner).
- Investigate before changing anything; surface surprises, don't improvise.
- Two uncommitted repo files ride your first docs-carrying PR:
  `docs/plans/fp03-submission-gate-investigation.md` + this kickoff file.
