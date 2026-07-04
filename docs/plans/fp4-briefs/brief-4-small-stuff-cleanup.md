# FP4 Brief 4 — Small-stuff cleanup (S–M)

Read `docs/plans/fp4-briefs/README.md` (standing rules) first. Evidence IDs below are in
`docs/plans/fp4-discovery/discovery-evidence.md`. One PR, zero teacher-visible behavior
change. Frontend + docs only.

## Scope

1. **Logger label redaction (UT/F1 — the headline item).** `src/utils/logger.ts:46-49`
   whole-string-redacts any string arg containing a SENSITIVE_KEYS substring, so 7 live
   call sites' human-written labels arrive as `[REDACTED]` in dev console and PROD Sentry
   (sites listed in the evidence: supabase.ts:11, ReviewDashboard.tsx:127,
   UserProfile.tsx:277, AdminInvitations.tsx:215+220, AdminInviteUser.tsx:208+213 — re-grep,
   lines drift). **Fable ruling:** apply SENSITIVE_KEYS substring redaction only to args
   AFTER the first; keep the JWT / API-key regex redaction (logger.ts:38-44) on ALL string
   args including the first. Rationale: arg[0] is the label position by convention
   everywhere in this repo; value-shaped secrets in a label still get caught by the regexes.
   Note the residual (an interpolated real secret mid-label would now survive) as a comment.
   Tests: the 7 real label shapes survive; later-arg keyword redaction still fires; JWT/API
   key strings still redact in any position.
2. **Dead code deletions** (pure removals): `reviewToLessonMapper.ts` + its test (F2 — the
   only other importer is `seasonTiming.backfill.test.ts:4`; keep that file's
   season→seasonTiming invariant covered without the dead module — inline what the test
   needs or rework its assertions; if the test turns out to guard nothing real, say so in
   the PR rather than silently dropping it); `sanitizeHtml` + its 12 tests (F4);
   `FeatureFlagKey` type (F6a).
3. **errorHandling dedup (F6b).** `parseDbError` re-implements the 23505+email predicate
   byte-identically to `isEmailDuplicateError` (`errorHandling.ts:16-25` vs :65-75).
   Delegate: branch on the boolean, return the same messages. Behavior identical, tests
   unchanged.
4. **Dead store field (FP4-STORE-03).** Remove `viewState.currentPage`: the type field
   (types/index.ts:66), all 7 write sites (searchStore.ts:84/101/122/135/148/164/183 +
   SearchPage.tsx:289), the `src/stores/CLAUDE.md` reset-rule lines (:31,:43 — replace with
   a note that pagination is React Query `pageParam`), and the test assertions on it.
   Rider from the same shelf doc: add `includes()` no-op guard to `removeFilter`
   (searchStore.ts:155-169) mirroring `addFilter`'s.
5. **Stale docs (OV/FP4-STALE-*).** `docs/ARCHITECTURE.md`: remove the ghost Pages entries
   (AdminAnalytics/AdminDuplicates/AdminDuplicateDetail — files don't exist) and all
   `lessonFormat` mentions (field removed 2026-05). Fix the stale e2e heritage-filter
   comment describing `display:none` (actual CSS is the sr-only clip pattern).
6. **Spurious announcer (OV/FP24-announcer, live-confirmed).** `ScreenReaderAnnouncer` (a)
   subscribes to the whole store (banned pattern — use a selector) and (b) announces "All
   filters cleared. Showing all 703 lessons." on every fresh page load with zero
   interaction. Suppress the announcement until the first real user-initiated change after
   mount; pick the simplest mechanism that tests cleanly.

Out of scope: any FILTER_CONFIGS/filterDefinitions change (stakeholder territory), the
fieldValueLabeler typing (Option C stands, #603 ruling), FP-21 mechanism trims, scripts/.

## Verify

`npm run check` + `npm run test:run`. For item 1, also confirm in a quick dev-console drive
that a label like `'Error checking auth state:'` now prints intact while
`logger.error('x', 'my password is hunter2')` still redacts arg 2.

## Merge-order note

Brief 3 also touches searchStore/useUrlSync test surfaces. Whichever PR lands second rebases
onto main and re-runs gates before the owner merges.

## STOP conditions

Anything that turns out not to be dead (a consumer the evidence missed — re-grep before
deleting); any behavior change beyond items 1/6's stated ones. "STOP = write the hand-back
and END YOUR TURN; design forks route to Fable; the owner only answers explicit approvals
(data fix / merge / gates)."
