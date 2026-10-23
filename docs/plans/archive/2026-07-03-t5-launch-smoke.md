# T5 Launch Smoke (final track — go/no-go)

**Date:** 2026-07-03 · **Who:** Fable + user, live · **Precedent:** T2 walkthrough format.

**Ground rules:** everything mutating runs on TEST (local dev server pointed at TEST);
PROD is read-only (public search + one password-reset email, user-approved). PROD gates,
merges, and the launch call itself are the user's alone.

**Baselines (query provenance):**
- TEST (`mcp__supabase-test`, 2026-07-03): `lessons_total=763, lessons_live=685,
  submissions_total=130, needs_revision=0` — must match exactly after cleanup.
- PROD (`mcp__supabase-remote`, read-only, 2026-07-03): `lessons_live=703,
  lessons_retired=82` (21 imports + 61 dedup) — must be untouched.

## Stations

| # | Station | Where | What passes | Result |
|---|---------|-------|-------------|--------|
| 1 | Search spot-checks: "taste test" (~10/10 relevant top-10, T1 fix), "fattoush" (both survivors, neither retired stub, T4c), quick mobile-width pass | PROD, read-only | Results match the PROD-verified claims with human eyes | ✅ **PASS.** "taste test": 49 results, top-10 = exactly the 10 predicted tasting lessons (was 52 pre-t4c — the delta is retired dups). "fattoush": 4 results = 3 live fattoush lessons + 1 content mention; both `dedup:fattoush-8c6942` stubs invisible (DB cross-check committed). Mobile 390px: layout clean, filter drawer opens as modal, Winter filter narrowed 4→1, URL + chips update. (The a11y checkbox input is 1×1px behind a styled label — automation quirk, not a user bug.) |
| 2 | Teacher submits a lesson (extraction canned on TEST; similarity evidence planted via SQL to light all four labels) | TEST | Submission lands; reviewer screen shows the four honest labels (T4b) | ✅ **PASS.** Submission `9b996699…` landed with honest confirmation copy; T2b share-hint live on the form. All four labels rendered against real lessons: 100% Identical copy / 91% Nearly identical / 67% Very similar / 49% Some overlap. Real detection on canned content honestly returned 0 candidates. |
| 3 | New decision screen, all 5 options clicked: publish-anyway guard; "already in the library" prefilled note **+ re-bind on card switch**; reject-with-reason → teacher sees "Not published" badge + reason | TEST | Every decision behaves; the two never-clicked paths work (T4b residual) | ✅ **PASS — all 5 decisions committed via real clicks** (4 submissions). Guard fired naming top match "Fattoush", KEEP REVIEWING cancelled cleanly, nothing written. Card select enables + dynamically labels options 2/3; prefilled note re-binds on card switch AND on search-hatch repick (R1+R2 fixes confirmed); leaving the decision clears the canned note. Reject blocked without a reason ("Save failed — nothing was written…"), field relabels to REASON FOR THE TEACHER; reject at 1/8 tags passed (gate correctly scoped to approves). Already-in-library commit: server decision `reject`, note names the lesson, `canonical_lesson_id` NULL per contract. Publish-as-update: 1 `lesson_versions` snapshot, target updated in place, no new row. **Organic bonus:** subs B/C/D matched the just-published smoke lesson at 49% `low` — the exact scenario the old embedding pipeline false-flagged as EXACT ≈1.0 in T2 now labels honestly. |
| 4 | Publish → public search shows title + summary (T2b fields); teacher "My submissions" statuses all render | TEST | Published lesson searchable with edited title/summary | ✅ **PASS.** Approved count 113→114; lesson top search result with title + full summary. Teacher list rendered SUBMITTED / REVISION / APPROVED / NOT PUBLISHED (with reasons) — incl. the real 2025 rejected row that used to be a blank dot. |
| 5 | Revision loop: reviewer sends back with note → teacher sees note → clicks resubmit → status flips, stale duplicate flags cleared | TEST | The T3b button works under real clicks (T3b residual) | ✅ **PASS.** Note shown verbatim + plain instructions; button flip confirmed "Sent back for review…"; DB: `needs_revision→submitted`, reason nulled, doc genuinely re-snapshotted (new extracted title), 4 stale similarity rows → 0. Reviewer reopen showed 9/9 tags preserved (T3b restore). |
| 6 | Password reset: request on the real site for the user's real account; email arrives | PROD (email only) | Email lands (T3 SMTP proof) | ✅ **PASS.** "Password reset link sent!" → email landed in df@esynyc.org within seconds: "Reset Your Password" from **ESYNYC Lesson Library `<program@esynyc.org>`** (Workspace SMTP). Link not used. |
| 7 | Wrap-up: (a) authenticated-E2E fixture decision; (b) go/no-go on real invitations | — | Decisions recorded below | ✅ Recorded below. |

## Findings (triage: none launch-blocking)

Nothing found that blocks launch. Post-launch list (added to tracker):

1. **Review queue lands on "ALL" tab, not "PENDING"** — known T2 punch-list row 4; was never
   in any shipped bucket. Cosmetic/workflow nit.
2. **Resubmit keeps the round-1 title over a renamed doc** — the review form's restored
   (reviewer-owned) title wins over the fresh extraction after a resubmit; header shows the
   new title while the field holds the old one. Fine for the normal same-doc case; a teacher
   who renames their lesson during revisions could be published under the stale title unless
   the reviewer glances at the title field. Low severity, by-design-ish; consider a
   "title changed on resubmit" hint.
3. **Approved teacher cards still show the old revision note** under "Reviewer notes" —
   harmless history display, mildly confusing next to APPROVED.

## Cleanup

- [x] Every TEST smoke row deleted with `RETURNING` receipts: 3 submission_similarities
      (planted 4 → 4 auto-cleared by resubmit + 3 organic) + 4 submission_reviews +
      1 lesson_versions + 1 lessons + 4 lesson_submissions.
- [x] Baseline re-verified byte-exact: 763 / 685 / 130 / 0; `%T5LaunchSmoke%` residue = 0;
      smoke titles = 0.
- [x] PROD untouched: 703 live / 82 retired re-probed after the session.

## Wrap-up decisions

- **Authenticated-E2E fixture: BUILD IT (user decision 2026-07-03).** It becomes the final
  item of this phase (T5b), run in a fresh session (context hygiene). Brief:
  `2026-07-03-brief-t5b-auth-e2e.md`. After T5b the phase wraps; user has a queue of
  post-phase improvement ideas.
- **Go/no-go:** the smoke's verdict is READY — nothing launch-blocking found. Invitation
  timing (send now vs after T5b) left to the user at session end.
