# Brief: FP1 — Frontend discovery audit

**Decided:** 2026-07-03 (user, at go-live close-out). First track of the frontend-polish
phase. **Executor: Fable, fresh session.** Tracker:
`docs/plans/2026-07-03-frontend-polish-tracker.md` (read it first — working model, feeds,
and the user-reported leads live there).

**Status: audit executed 2026-07-03 (9/9 agents); backlog in the tracker; walkthrough items → FP2.**

## Paste-ready kickoff prompt (user: copy this into the fresh session)

> You are Fable, running FP1 — the frontend discovery audit, first track of the
> frontend-polish phase. Repo: /Users/danfeder/cCode/esynyc-lessonsearch-v2. All main-session
> work runs on Fable per my standing directive.
>
> Read first: docs/plans/2026-07-03-brief-fp1-discovery.md (binding — scope, pre-made
> decisions, STOP conditions) and docs/plans/2026-07-03-frontend-polish-tracker.md (the
> phase tracker with the discovery feeds and my reported leads, including the wrong filter
> counts).
>
> This is a DISCOVERY session: find and rank, don't fix (trivial one-liners excepted).
> Output = the ranked backlog + plain-language assumptions review, committed to the tracker
> via a docs PR. Multi-agent fan-out is fine for the code sweep. Session end: update the
> tracker and tell me what FP2 (our live walkthrough) should focus on.

## Goal

Produce the phase backlog: verified frontend bugs, UX improvements, and simplification
candidates, ranked so the user can pick fix waves — plus a plain-language review of the
project's load-bearing design assumptions (much of the architecture was conceived with
2024-era models; the concepts themselves are up for re-examination, not just the code).

## What to do

1. **Re-verify the shelf.** `~/cCode/pr6-overnight-2026-06-12/overnight-review/` frontend/UX
   artifact + simplification plan. Every claim is 3+ weeks stale (predates T4b/T5/T5b);
   verify each against today's code/UI before it enters the backlog. Log verdicts
   (still-real / fixed-since / obsolete) so the shelf can finally be marked processed.
2. **Chase the user's leads.** Start with L1 (filter counts wrong) — the tracker records a
   strong hypothesis (`SearchPage.tsx:73-75` tallies only the loaded infinite-scroll pages)
   found at scaffold time; confirm it empirically (browser vs DB counts), check the
   second-order candidates in `facetCounts.ts` (activityType slug remap, heritage ancestry
   expansion), and scope the fix options (server-side facet RPC vs full-corpus fetch vs
   dropping the numbers) as a decision for the user — counts touch the filter UX, and
   filters are stakeholder territory.
3. **Sweep the frontend.** Fan-out audit over `src/` for bug patterns (state bugs, error and
   loading handling, mobile layout, a11y, dead interactions) and vibe-code residue
   (duplicated mechanisms, dead abstractions, overbuilt config, stale patterns the repo has
   outgrown). Browser-verify anything user-visible against the local dev server (local stack
   or TEST env — if TEST, keep the baseline byte-exact; markers/cleanup discipline applies).
4. **Assumptions review.** Short plain-language one-pagers-in-miniature: for each load-bearing
   concept (filter taxonomy + facet counts, search presentation, submission flow shape,
   admin surface inventory, state management layering, anything else that smells 2024),
   state what it assumes, whether that still holds for the real audience, and a
   recommendation. No redesigns executed — these are decision inputs for the user.
5. **Rank and commit.** One backlog table in the tracker: finding, evidence pointer,
   severity for the end user, effort, confidence, suggested wave. Docs PR carries the
   tracker update + this brief's status line. End your report with what FP2's live
   walkthrough should probe.

## Pre-made decisions (deviate only via STOP)

- Discovery ≠ fixing. Trivial one-liners at most; anything else goes on the backlog.
- Findings need evidence (repro step, screenshot, or file:line) — no vibes-based entries.
- Stale-shelf findings enter the backlog only after re-verification against current code.
- Filter-related recommendations are presented, never applied (user is the stakeholder).
- PROD is read-only. TEST mutations only with marker + cleanup discipline; baseline
  re-verified at session end if touched.

## STOP conditions

- Any candidate fix needs a migration or edge-function change → backlog it, flag it, move on.
- The audit balloons past ~2 sessions of work → checkpoint with the user instead of grinding.
- Anything discovered that looks launch-affecting (live-site breakage for real users) →
  surface to the user immediately, don't sit on it until session end.
