# Pre-wave plan — spreadsheet-lesson submission wave (2026-07-04)

**THE priority. Pre-wave work outranks everything else** (owner, 2026-07-04: "we need to
prioritize the pre-wave work above all else"). Owner decision record:
`docs/plans/2026-07-04-owner-uiux-candidates.md`.

## The wave (context)

While the library was down, teachers "submitted" lessons into a spreadsheet (a few dozen,
max). Reviewers will submit the approved ones themselves through the normal `/submit`
flow (verified supported: no role gate on submission, no self-review block, review step =
the publish step) and review each immediately. All wave docs use the LOCKED 2026 template
(`1C0tCnRJXgdNxUJtv25aq2ZDnKHjTcjA0H6LIY248xQk`). Attribution under the reviewer's
account: owner accepts. No bulk-import script: owner declined (volume too small).

## Execution model

Same as FP4: **one brief per fresh Opus executor session** (token economy — Fable
designs/verifies, Opus builds), thin hand-backs, Fable receives + re-probes, **owner
merges every PR and presses every PROD gate**. Standing rules:
`docs/plans/fp4-briefs/README.md`.

## The chain (strict order — each step's gate must be DONE on PROD before the next starts)

| # | Work | Brief | Size | Gates (owner) | Status |
|---|------|-------|------|---------------|--------|
| 1 | Heal 7 retired rows + VALIDATE both NOT-VALID constraints | `fp4-briefs/brief-6-validate-constraints.md` (migration `20260707000000`) | L | merge + PROD migration | ☑ **DONE ON PROD 2026-07-04** — PR #605 merged, owner-applied; Fable post-verified live: convalidated ×2, 7/7 byte-equal (cols + JSONB), active 702 untouched, search unaffected, CRE=320 w/ 6-of-7 unfrozen (brief-1 precondition confirmed). Detours logged in brief ADDENDUM + census §5–6 + PR #605 comments (E2E red = canceled-run marker debris on TEST, swept; hygiene follow-up noted) |
| 2 | SEL → "Social-Emotional Skills" + 6 new options; "Culturally Responsive Education" → "Cultural Diversity" everywhere incl. 320 PROD lessons | `fp5-briefs/brief-1-sel-skills-and-cultural-diversity.md` (migration `20260708000000`) | M | merge + PROD migration + edge deploy | ☑ **DONE ON PROD 2026-07-04** — PR #606 merged (`5ce0efc`); Fable post-verified live: 0 old-value rows both representations, 320× "Cultural Diversity" both reps, drift 0/785, SEL constraint = 11 values, counts unchanged; edge fns 3-signal verified (process-submission v42, complete-review v13, shas == TEST, new enums in deployed source; one esm.sh 522 flake rerun per playbook). Detours: E2E spec stale sentence-cased group name fixed (`5ce0efc`), Netlify CDP drawer disabled by owner (E2E 11min→2.1min), E2E job timeout 15→25 (PR #607) |
| 3 | Mechanical template prefill + AI auto-tag OFF switch (code kept) + empty-summary approve guard | `fp5-briefs/brief-2-template-prefill-and-ai-off.md` (no DB) | M | merge + edge deploy | ☑ **DONE ON PROD 2026-07-04** — PR #608 merged; process-submission 3-signal verified (v43, sha == TEST v26 which served a green 77/77 E2E, `ENABLE_AI_AUTO_TAG` in deployed source); frontend auto-deployed. Parser phrasings Fable-verified against the REAL locked template doc verbatim. Bot findings: guard-b all-selected ambiguity ruled works-as-designed; 2 nits queued as ride-alongs (PR #608 comments) |
| 4 | Reviewer runbook: 1-page how-to for the wave | `docs/plans/2026-07-04-wave-reviewer-runbook.md` (written by Fable) | S | none | ☑ **DONE 2026-07-04** — **THE WAVE CAN START** |

**Why this order is forced:**
- 1 → 2: six of the seven broken retired rows carry the old "Culturally Responsive
  Education" tag; until brief 6 heals them, ANY update to those rows errors on the
  NOT-VALID re-check. Brief 1's migration pre-asserts this and refuses to run otherwise.
- 2 → 3: the prefill parser targets the post-rename vocabulary (new SEL options,
  "Cultural Diversity"); building it against the old vocab would ship wrong.
- The wave starts only after step 3 is live (step 4 is same-day paperwork).

## Explicitly deprioritized until the wave prep is done

- FP4 briefs 1 (admin errors), 2 (synonym seed), 3 (close-lesson fix), 4 (cleanup incl.
  the owner's sidebar riders). All still queued, none wave-blocking.
- **⚠️ Migration renumber note:** FP4 brief 2's migration is dated `20260706000000`,
  which will sort BEFORE the already-applied `20260707000000`/`20260708000000` by the
  time it runs — when brief 2 eventually executes, renumber its migration to the next
  free date AFTER the latest applied migration (standing rule in fp4-briefs README).
- Candidates doc §5-adjacent follow-ups (month→theme mapping, heritage prefill,
  AI-draft build-out — owner intends to return to it later).

## Standing safety rails (unchanged)

Data safety top constraint; PROD applies owner-only; TEST rehearsal before every PROD
gate; per-round TEST verification; `npm run check` + `npm run test:run` before every PR.
