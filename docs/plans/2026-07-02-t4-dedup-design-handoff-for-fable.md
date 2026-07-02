You are **Fable**, running the go-live sprint's **T4 corpus-dedup DESIGN session** — the 2nd
(and last) of the 2 planned Fable sessions. This is a design + decision session with the user,
not an execution session. Repo: `/Users/danfeder/cCode/esynyc-lessonsearch-v2`. Read the
tracker `docs/plans/2026-07-01-go-live-tracker.md` and your durable memory first
(`project_golive_sprint`, `project_dedup_third_state`, `project_embedding_pipeline_mismatch`,
`reference_data_mutation_gotchas`, `feedback_thin_driver_orchestration`,
`feedback_data_safety_top_priority`, `feedback_plain_language`).

## Where the sprint stands
T1–T3b are ALL shipped + PROD-verified (T3b closed 2026-07-02: #575 → squash `03ebe4b`,
process-submission v37, 3-signal-verified; revision loop now closes in-system). The site is
INVITE-ONLY and live. T4 is the last substantive track before **T5 = final smoke + launch**.
Local state: on `main`, one modified file — the tracker's T3b-DONE edit rides YOUR first
docs-carrying push (don't push it standalone). This handoff file is untracked/transient —
delete it or let it ride once the session's real docs exist.

## T4 scope (from tracker + punch-list sequencing, user-ratified 2026-07-01)
1. **Corpus dedup sweep** of the live `lessons` table (row count drifts — query it, don't
   trust ~745/~785 from docs). Known dup evidence: Black Bean Dip ×2, Hummus ×2, School and
   Garden Communities ×2 in a single top-10.
2. **Reviewer decision-screen / dup-panel reshape** rides T4: the panel was logged in T2 as
   *conceptually overloaded* — **binding design requirement: one plain question, evidence
   beneath.** Includes the dup-selection↔decision silent disconnect (selected dup ignored
   under Approve&publish) and the rejection dead-end (punch-list row 8, deferred here from
   T3b decision 10).

## Pre-made design directives (already decided — design WITHIN these)
- **Candidates via simple text similarity (pg_trgm), NOT embeddings. Retire the embedding
  machinery, don't repair it** — the two pipelines embed into mismatched vector spaces
  (cosine ≈ random projection), and the T2 walkthrough caught an "EXACT" label awarded on
  embedding-sim alone while the content hash disagreed (canned TEST fingerprints matched an
  unrelated lesson at 0.999997). If T4 retires embedding dedup, the deferred C2.4
  embeddings-regen dies with it (already on the tracker's NOT-doing list).
- **Third state required:** companion/sequenced lessons (Part 1/Part 2, the Fattoush case)
  are "related, NOT duplicate" — identical metadata, designed companions. Duplicate/related/
  unrelated, not a binary.
- **Model split (working model):** Fable designs + adjudicates the shortlist; **Sonnet** does
  the bulk candidate generation; **the USER adjudicates every deletion/merge**; Opus ships
  the final execution brief. Thin-driver rule is binding: candidate generation must land
  results in a table/files with script-side collection — Fable never babysits agent output.
- **T4 is the ONE track with the slim scaffold exception** (it mutates data): produce a
  design-decisions doc + a status doc in `docs/plans/`.
- **Data safety is the top constraint:** rehearse on TEST, snapshot before bulk mutation,
  smallest batch first, pre-delete FK checklist (`reference_data_mutation_gotchas` — note the
  `lessons.original_submission_id` OUT-ref gotcha). Decide soft-vs-hard delete explicitly.
  Possibly related work sitting in memory: 23 identified non-ESYNYC wholesale imports
  (`project_imported_non_esynyc_drops`) — decide whether that deletion track folds in or
  stays separate.

## 🔴 Binding rules
- PROD applies/merges = USER-only. You design, brief, and adjudicate.
- User adjudicates ALL data deletions/merges — your job is to make the adjudication cheap
  (shortlist + evidence, plain language, one question at a time).
- Plain language with the user always; treat design discussion as a learning walkthrough
  (`feedback_user_relearning`); workflows are not sacred — reshape beats patch if it reduces
  moving parts (`feedback_workflows_not_sacred`, `user_nontechnical_owner`).

## Suggested session shape (adapt as needed)
1. Probe the live corpus read-only (PROD MCP, SELECTs only): row count, a quick pg_trgm
   availability check, a sample near-dup scan to size the problem.
2. Design the pipeline: candidate generation (what query/threshold, where results land) →
   evidence packet per pair → user adjudication format → execution mechanics (soft-retire?
   merge? redirects? search effects) → dup-panel/rejection UI reshape.
3. Walk the key decisions with the user in plain words; lock them in the design-decisions doc.
4. Write the Sonnet candidate-generation brief + status doc; name the next step (Sonnet run,
   then user adjudication, then Opus execution brief).
Session-end protocol per the tracker's Working model (status line + "Last updated" + name the
next track/model).
