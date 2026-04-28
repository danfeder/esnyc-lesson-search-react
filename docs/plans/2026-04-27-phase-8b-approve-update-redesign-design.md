# Phase 8b — `approve_update` Workflow Redesign — Design Document

**Date:** 2026-04-27
**Status:** Design approved; ready for implementation planning
**Phase reference:** Tier-1 #9 in `~/.claude/plans/lesson-submission-tier1-implementation.md`
**Original investigation:** `~/.claude/plans/i-want-you-to-pure-iverson.md`

---

## 1. Why this exists

The `approve_update` workflow has been broken end-to-end since launch. Submitters were asked to declare `submission_type='update'` upfront and type a raw `lesson_<UUID>` into a freetext field; reviewers never saw that field; reviewers could only merge into lessons that surfaced in `submission_similarities` (the dup-detection results table). When dup detection didn't surface the lesson the submitter intended, reviewers fell back to `approve_new`, creating literal duplicates of lessons the library already had. This produced 30 orphan submissions in PROD, all from one teacher (Liza Engelberg) clustered Sept 5–19 2025. The orphans have been recovered (Phases 5/6/6.2/6.3, all shipped 2026-04-27).

Phase 8b is the forward fix — redesigning the workflow so this class of bug can't recur. Per the user's "workflows are not sacred" preference, this is a workflow-level redesign rather than a patch within the current shape.

## 2. Three failure modes the redesign must close

For Liza's orphans to have been prevented under the new flow, three things had to align:

1. **Dup detection had to surface the right target.** Year-tagged "X 25-26" titles may not have crossed the trigram threshold against bare "X." Any design that depends on dup-detection accuracy as the primary recovery path inherits this risk.
2. **Submitter had to be able to express update intent cleanly.** The freetext `lesson_<UUID>` field had no validation and no support — a teacher would never know what to type.
3. **Reviewer had to see and act on the submitter's intent.** The reviewer UI ignored the `original_lesson_id` field entirely.

A successful redesign removes all three failure modes simultaneously. The chosen shape (intent-first, see §3) does this by making the submitter-side intent declaration:
- explicit (binding, not a hint),
- supported by a real picker (not freetext),
- routed to the reviewer UI prominently (not hidden in a database column).

## 3. The chosen shape: Intent-first

The submitter is asked up front, *before any URL paste*, what they're submitting. Two paths:

- **"Add a new lesson to the library"** → URL paste page. One field. Done.
- **"Update a lesson that's already in the library"** → search picker (find the lesson) → URL paste → submit.

The reviewer sees a binding intent flag — not a hint — and the merge target is pre-selected (or, if the submitter couldn't find the target, an explicit yellow "needs-search" signal).

### Why intent-first over the alternatives

Three alternatives were considered and rejected:

| Option | Why rejected |
|---|---|
| **Hybrid gate** (URL paste → backend extracts → if matches found, gate page asks submitter to pick/dismiss) | Recovery still depends on dup-detection accuracy. If detection misses the right target, the gate doesn't fire and we're back to the orphan-producing flow. Also has asymmetric UX (gate fires for some, not others) and forces submitters to interpret similarity scores. |
| **Hybrid-of-hybrid** (search bar + "skip — it's new" link) | Same backend mechanics as intent-first but with a "skip" link as a UI smell. The search-bar-as-default implies "you should search," which the new-case user must actively dismiss. Intent-first asks the right question (intent) without that cognitive load. |
| **Original Option C** (single form: URL + radio + typeahead picker, hint-not-binding) | Cheapest fix (~1.5 days) but preserves the structural smell of "submitter declares but it's just a hint." Per workflows-not-sacred, the right move is to invest in a real redesign once. |

## 4. Section 1 — Schema (1 migration)

Two things change at the database layer in scope; one was already done. None require RLS additions, status enum changes, or a cron job.

1. **FK `lesson_submissions.original_lesson_id` → `ON DELETE SET NULL`.** (NEW migration in PR 1)
   *Why:* if a reviewer deletes the lesson a submitter linked to (rare but possible), the submission row should survive with its intent neutralized rather than cascade-deleting. Defense in depth.

2. **Status guard in `complete_review_atomic` RPC.** (Already shipped in Phase 4 — `supabase/migrations/20260428000008_phase_4_status_guard.sql`)
   The shipped guard refuses re-entry on terminal statuses (`approved`, `rejected`) and *intentionally* allows `needs_revision` flip-back through the UPSERT path. The earlier draft of this design proposed `IF status NOT IN ('submitted', 'in_review') THEN RAISE EXCEPTION` which would have blocked the legitimate "reviewer flips needs_revision back to approve_new" flow. The Phase 4 predicate is the correct one. **No new migration needed for this item.**

3. **(NO new CHECK constraint.)** The earlier draft proposed `submission_type != 'update' OR original_lesson_id IS NOT NULL`. Dropped because the redesign needs to support `(submission_type='update', original_lesson_id=NULL)` as a valid state — "submitter said update but couldn't find target." Application-level validation in the `process-submission` edge function covers the case where a non-null `original_lesson_id` references a non-existent lesson.

**Schema items dropped from the prior session's draft** (because intent-first never creates a row pre-submission):
- `draft` and `abandoned` status enum values — no half-finished state to track
- `submitter_dismissed_matches` BOOLEAN — no gate page to dismiss matches on
- Teacher UPDATE policy on `lesson_submissions` — no client-side PATCH happens
- Teacher SELECT policy on `submission_similarities` — submitter never sees that table
- `SubmissionStatus` TypeScript type sync — no new statuses
- `ReviewDashboard.tsx` queue filter for draft/abandoned — no such statuses
- Nightly cron auto-cleanup — no drafts to clean

## 5. Section 2 — Submitter flow

### Routes

| Route | Purpose |
|---|---|
| `/submit` | Intent picker (new home for submission). Two large cards. Auth enforced at click via existing `AuthModal`. |
| `/submit/new` | URL paste form. One field, regex-validated. |
| `/submit/revising` | Two-step form: search picker → URL paste. Submit disabled until both complete. |

Direct-link to either branch works (no forced redirect through intent picker). Browser back from either branch returns to `/submit`. Small breadcrumb on each branch: "Adding a new lesson · ← Change" / "Updating a lesson · ← Change."

### Intent picker copy

- **"Add a new lesson to the library"** — helper: "Use this if no version of this lesson has been added yet"
- **"Update a lesson that's already in the library"** — helper: "Use this if a version of your lesson is already published"

1–2 lines of orientation copy above the cards: "Submit a Google Doc lesson plan for the ESYNYC library. A reviewer will check it and either publish it or get back to you."

### Auth gating

`pendingIntent` state on the picker (`'new' | 'revising' | null`). On card click without auth, set `pendingIntent` and show `AuthModal`. On modal `onSuccess`, `navigate('/submit/${pendingIntent}')`. This pattern replaces the existing `AuthModal.onSuccess`-calls-handleSubmit pattern, which doesn't translate to a multi-route flow.

### `LessonSearchPicker` component (new, reusable)

- Debounced ~300ms text input
- Direct `.from('lessons').select('lesson_id, title, grade_levels, season').ilike('title', '%${query}%').limit(10)` against existing `idx_lessons_title_trgm` GIN index. (Do not reuse `search_lessons` RPC — it has 14 params and uses `to_tsquery` which can throw on partial words.)
- Empty state: placeholder "Search by lesson title or topic" + example "e.g., 'Three Sisters' or 'composting'"
- Mid-debounce: keep prior results visible with subtle spinner (don't blank out)
- Zero results / "Don't see your lesson?": **"I'm updating but can't find it — let a reviewer help"** (binding intent, no target — closes the orphan regression hole)
- Selected target: chip above input with × clear; sticky on mobile

**Reusable shape:**
```
<LessonSearchPicker
  selected={lesson | null}
  onSelect={(lesson) => ...}
  onClear={() => ...}
  cantFindOption={boolean}        // true on submitter side, false on reviewer side
  onCantFind={() => ...}          // submitter-side callback
/>
```

### Submit copy on revising branch

- With target: **"Submit as a revision of [X]"** with sub-line "A reviewer will replace the published lesson with this content."
- Without target (can't-find): **"Submit for reviewer to match"** with sub-line "A reviewer will identify which lesson this updates."

### Edge function changes

`process-submission`:
- **Add server-side validation BEFORE the row INSERT** (before line 174): if `submissionType === 'update'` and `originalLessonId` is non-null, do `SELECT COUNT(*)` on `lessons` for that ID; return 400 if zero rows. The DB-level FK constraint serves as the final TOCTOU backstop. Pre-INSERT validation prevents orphan rows on the error path.
- `(update, null)` is allowed (binding intent, no target).

### Removed code in `SubmissionPage.tsx`

- `submissionType` state, `originalLessonId` state, the radio fieldset (lines 133-157), the conditional `originalLessonId` input (lines 159-174)
- The post-submit duplicates panel (lines 286-**350**, not 286-348 — corrected per code review)

### Success page

- (update, X): "We'll merge this into '[X]' once a reviewer approves."
- (update, null): "A reviewer will identify which lesson this updates and either merge or publish as new."
- (new): "We'll publish this once a reviewer approves."

### Explicit non-handlings (deferred)

- **Extraction failure recovery** — today's behavior preserved (row stays with NULL extracted_content). Highest-priority deferred item per UX critique.
- **Repeated-submission detection** (`user_id + doc_url` collision) — separate feature.
- **Wrong-doc-pasted-after-target-pick** mismatch — reviewer catches via Section 3's title mismatch helper.
- **Past-submissions-first revising flow** (UX agent alternative) — not folded into v1; defer.
- **Brand-new branch safety check** (UX agent's "we found similar lessons — is this an update?") — defer; reviewer-side dup detection is the safety net.

## 6. Section 3 — Reviewer flow

### 6.1 Banner at top of decision panel

Always visible:
- (new) → green wrapper: "Submitter says: New lesson"
- (update, X) → blue wrapper: "Submitter says: Updating **[X title]**" with link/preview
- (update, null) → yellow wrapper + ⚠ icon: "Submitter says: Updating, but couldn't find target — please search to identify"

Color reinforces the text + icon (which carry the state semantics). Color alone is never the only signal — every state has explicit text and the yellow state pairs with `AlertTriangle`. Reviewers using high-contrast modes or with color-vision differences still see the state via copy and icon.

### 6.2 Pre-selection logic

| Intent state | Pre-selected decision | Pre-selected target |
|---|---|---|
| (new) | `approve_new` | none |
| (update, X) | `approve_update` | X (auto-fetched if not in dup list) |
| (update, null) | `approve_update` | none — reviewer must pick via search |

**State preservation:** pre-selection only fires when there is no existing review row (`submission.review === undefined`). If the submission already has a review (e.g., reviewer flipped from `needs_revision` back to `submitted`, or is mid-edit and refreshed), the existing decision/target/notes are preserved exactly as stored. We never overwrite reviewer-in-progress work with submitter intent — the submitter intent banner still renders, but pre-selection is a no-op when prior reviewer state exists.

### 6.3 Fixed enable/disable logic (CRITICAL)

The current `ReviewDetail.tsx` has `<radio approve_update disabled={!selectedDuplicate}>`. This breaks under intent-first because we want to show `approve_update` as pre-selected even when target is unset (the (update, null) case).

**Fix:** all decision radios always selectable. **Submit button** disabled when `decision === 'approve_update' && target === null`, with inline guidance: *"Pick a target lesson to merge into, or change to Approve as new."*

This forces the (update, null) reviewer to either find a target or actively flip to `approve_new` — the override becomes a deliberate radio click rather than the path of least resistance, which closes the regression hole.

### 6.4 Unified "Candidate matches" list

Single list (not two side-by-side lists for "dup detection results" and "submitter selected"):

- Submitter's bound target (if any) appears at top with a **"Submitter's choice"** badge — regardless of dup-detection score, even with score 0%
- Dup detection results follow with their similarity scores
- Reviewer can pick any card; selected card gets visual ring; "Submitter's choice" badge stays anchored to the submitter's pick regardless of which card the reviewer selects

When `submission.original_lesson_id` is non-null AND not already in `submission_similarities`, `loadSubmission` does an additional `lessons_with_metadata` SELECT for that lesson and prepends it to the unified list.

### 6.5 Search escape hatch (collapsed by default)

Below the unified card list:
- Disclosure: **"Search the library for a different lesson"**
- **Auto-expanded for `(update, null)` and when zero dup matches found**
- Reuses `LessonSearchPicker` with `cantFindOption=false`
- Contextual help text per state:
  - default: "Use this when no card above is the right match"
  - `(update, null)`: "Use this to find the lesson the submitter couldn't"
  - `(update, X)` override mode: "Use this if you disagree with the submitter's pick"

### 6.6 Title mismatch helper

When the picked target's title differs significantly from the extracted submission title, show a yellow inline note: "Heads up: submitter linked to '[X]' but submission's extracted title is '[Y]' — confirm this is the right merge target."

- **Algorithm**: word-set Jaccard at ~0.3 threshold (in-browser, no DB call). Lowercase + strip punctuation, split on whitespace, intersect/union.
- **Only fires on auto-picks** (submitter binding or dup detector). Not when reviewer manually picked via search — manual pick is already deliberate confirmation.
- For v1: uses *current* lesson title (no snapshot at submit-time). Defer snapshotting if patterns emerge.

### 6.7 Three-state queue badges

In `ReviewDashboard.tsx` queue cards (via `IntQueueRow.tsx`):

| Badge | Color | Inline text shown next to badge |
|---|---|---|
| NEW | green | (none) |
| UPDATE | blue | Target lesson title (visible, truncated to ~40 chars; full title in `title` attribute for accessibility) |
| UPDATE? | yellow | "needs reviewer search" |

Target title is **visible inline next to the UPDATE badge**, not hidden in a tooltip — tooltips are unreliable on mobile/touch and slow for queue scanning. Truncation handles long titles without breaking row height. Lets reviewers triage the queue (batch the easy ones, focus on the work-required ones).

### 6.8 Override-tracking (deferred)

A future admin query to surface "submissions where reviewer overrode submitter intent" is worth building if patterns emerge. **No new schema needed**, but the derivation is a JOIN, not a column comparison: the published lesson ID isn't stored on `submission_reviews` directly (the `canonical_lesson_id` column exists on that table but is NOT populated by the current `complete_review_atomic` RPC — it's a leftover from earlier infrastructure). The right derivation is:

- For `approve_new`: `lessons.original_submission_id = submission.id` gives the published lesson_id
- For `approve_update`: `lesson_versions.archived_from_submission_id = submission.id` gives the lesson_id whose old version was archived (the merge target)
- Compare either of those to `lesson_submissions.original_lesson_id` (submitter intent) to flag overrides

Alternatively (cheaper but requires a one-line RPC change): modify `complete_review_atomic` to write `canonical_lesson_id` on `submission_reviews` when decision is `approve_new` or `approve_update`. Then the comparison becomes `original_lesson_id` (submitter) vs `submission_reviews.canonical_lesson_id` (reviewer) — much simpler, but bumps the scope past pure follow-up.

Out of 8b scope; captured as follow-up.

### 6.9 Race condition (acknowledged, deferred)

Section 4's RPC status guard catches concurrent reviewers at commit time. Pre-existing gap: no "claim" mechanism, so two reviewers can edit the same submission silently until one save fails. Not 8b's job to fix; document as known.

### Files changed in Section 3

- `src/pages/ReviewDetail.tsx` — banner, pre-select logic, fixed enable/disable, unified card list, search escape hatch, mismatch helper, `loadSubmission` modification for off-list submitter target
- `src/pages/ReviewDashboard.tsx` — pass `originalLessonId` and badge state into row props
- `src/components/IntQueueRow.tsx` — accept new prop, render three-state badge
- Reuses `LessonSearchPicker` from Section 2

## 7. Section 4 — Migration / shipping strategy

Three sequential PRs:

| # | PR | Contains | Notes |
|---|---|---|---|
| 1 | **Schema** | Section 1's 2 items: FK alter + RPC guard | Defensive only. Forward-rollback migration ready before merge. Idempotent (`DROP CONSTRAINT IF EXISTS`, `CREATE OR REPLACE FUNCTION`). |
| 2 | **Submitter flow + LessonSearchPicker + reviewer-side safety banner** | Section 2: rewrite `SubmissionPage.tsx`, add `/submit/new` and `/submit/revising` routes, new `LessonSearchPicker` + `NewSubmissionForm` + `RevisingSubmissionForm`, `process-submission` pre-INSERT validation. PLUS minimal reviewer safety banner (see "Gap risk between PR 2 and PR 3" below). | Picker created here since Section 2 is its first consumer. Safety banner closes the gap-window where new (update, X) and (update, null) submissions would reach the old reviewer UI before PR 3 ships. |
| 3 | **Reviewer flow (full)** | Section 3: `ReviewDetail.tsx` full banner (replaces PR 2's minimal version), pre-selection, fixed enable/disable, unified card list, search escape hatch, mismatch helper, `ReviewDashboard.tsx` + `IntQueueRow.tsx` 3-state badge, reuse `LessonSearchPicker` | Enriches PR 2's safety banner into the full state-aware UX. Old-shape submissions still display correctly. |

### Gap risk between PR 2 and PR 3 (and the safety banner)

Once PR 2 ships, `/submit/revising` can produce `(update, X)` and `(update, null)` rows. The pre-PR-3 reviewer UI ignores `original_lesson_id` and the `submission_type` field, so during the deploy gap a reviewer could approve such a submission as new — recreating the exact orphan-producing failure mode this redesign is meant to prevent.

**Mitigation: ship a minimal reviewer safety banner as part of PR 2.** When `submission_type === 'update'`, render a yellow banner above the decision panel that reads "Submitter says: Update of an existing lesson — verify before approving as new" with the raw `original_lesson_id` (or "could not find target" for `(update, null)`). It does NOT lookup the target title (that's PR 3's job) and does NOT change the radio/submit button behavior. ~12 lines of code.

This is **progressive enhancement, not throwaway**: PR 3's full Section 6.1 banner replaces this minimal version with target-title lookup, color-coding by intent state, and pre-selection. The PR 2 banner is the gap-window safety net — strict superset of the danger sign needed during the gap, strict subset of what Section 3 ultimately ships.

Alternatives considered and rejected:
- *Ship PR 2 and PR 3 in tight sequence with reviewer activity paused*: relies on humans not making the mistake during a rushed window
- *Feature-flag `/submit/revising` until PR 3 is deployed*: adds env-var ceremony and "we forgot to flip the flag" risk; submitter UI ships partially-functional during the gap
- *Combine PR 2 and PR 3 into a single mega-PR*: sacrifices per-PR-ritual + rollback granularity for atomicity

### TEST DB rehearsal

- PR 1: CI applies migration to TEST. Verify with `mcp__supabase-test__execute_sql`: confirm FK definition shows `ON DELETE SET NULL`; confirm RPC source contains the status guard.
- PR 2/3: no schema, no rehearsal needed beyond Netlify deploy preview + manual smoke.

### Rollback paths

- PR 1: forward-rollback migration that reverts FK to `NO ACTION` and removes the RPC status guard. Idempotent.
- PR 2/3: standard frontend git revert. No data side effects to reverse.

### Per-PR ritual

Per `feedback_pr_bot_review_workflow.md`:
1. Pre-push self-review (manual diff scan)
2. Push → dispatch own reviewer agent before bot reviews
3. Investigate every bot finding (don't auto-accept)
4. Consolidated fix-up commits
5. Round-cap after 2 rounds

### Known issues

- `migrate-production.yml` Verify-step SASL flake (cosmetic; PROD MCP verification is mandatory after every apply)
- Email pipeline broken in PROD for non-`mail@danfeder.org` recipients — Phase 8b doesn't add email triggers, so not a blocker

## 8. Section 5 — Testing strategy

### Unit

- `LessonSearchPicker.test.tsx`: debounce timing, result rendering, selection state, clear affordance, can't-find option enable/disable
- `titlesAreSimilar` helper (word-set Jaccard at 0.3): assert "Updated for 2026" + "Spring Planting" → similar; "Apple Crisp" + "Solar Eclipse" → not similar; case/punctuation normalization
- Pre-selection logic: `ReviewDetail` unit tests covering all three intent states produce correct `(decision, target)` defaults and submit-button enable state

### Integration

- `process-submission` edge function:
  - `(submission_type='new')` → row created, `status='submitted'`
  - `(update, valid_target)` → row created, `original_lesson_id` populated
  - `(update, invalid_target)` → 400 error, **no row inserted**
  - `(update, null)` → row created, `original_lesson_id=null`
- `complete-review`: existing approve_update tests must still pass; add a test for status-guard rejection (already-approved submission cannot be re-approved)

### E2E (Playwright, against Netlify deploy preview)

- Submitter — Add new
- Submitter — Update with target
- Submitter — Update without target ("can't find it")
- Reviewer — `(update, X)` happy path (banner + pre-selection + approve)
- Reviewer — `(update, null)` happy path (yellow banner + auto-expanded search + approve)

### Regression

- Existing E2E smoke test continues to pass
- Legacy submission rows (pre-Phase-8b `(update, freetext_string_id)`) still render in reviewer UI without crashing — defensive handling required

### RLS

- No RLS changes. `npm run test:rls` must pass unchanged.
- Picker reads `lessons` via existing public-readable policy.

### Manual smoke checklist (per `superpowers:verification-before-completion`, before claiming a PR done)

- Submit a new lesson via `/submit` → verify row in TEST DB
- Submit an update with target → verify `original_lesson_id` populated
- Submit an update without target → verify `original_lesson_id` null + `submission_type='update'`
- Open each submission as reviewer → verify banner color, pre-selection, badge anchoring
- Override pre-selection → verify save succeeds with overridden value

## 9. Out of scope for Phase 8b (captured for future work)

- Extraction failure recovery (detect synchronously, surface "couldn't read your Google Doc" with retry)
- Repeated-submission detection (`user_id + doc_url` collision)
- Past-submissions-first revising flow (UX agent alternative — show user's own published lessons before library-wide search)
- Brand-new branch safety check (similarity check before submit)
- Submission "claim" mechanism (status → `in_review` on reviewer open) to prevent concurrent-edit collisions
- Override-tracking admin view (JOIN through `lessons.original_submission_id` + `lesson_versions.archived_from_submission_id` to derive reviewer's chosen lesson; compare to submitter's `original_lesson_id`. Or land a one-line RPC change to write `submission_reviews.canonical_lesson_id` and use a direct column compare.)
- Snapshot of lesson title at picker-time (for v2 if title-edit-during-review patterns emerge)
- Title mismatch via DB trigram (if v1's in-browser Jaccard proves insufficient)
- Separate queue lane for UPDATE-NO-TARGET (if volume warrants focused review surface)

## 10. References

- Original investigation: `~/.claude/plans/i-want-you-to-pure-iverson.md`
- Tier-1 implementation plan: `~/.claude/plans/lesson-submission-tier1-implementation.md` (lines 47-73 = Q2 framing; lines 1042-1066 = the Phase 8b sketch this doc supersedes)
- Mid-brainstorm handoff: `~/.claude/plans/2026-04-27-phase-8b-workflow-redesign-handoff.md`
- Auto-memory: `project_lesson_submission_tier1.md`, `project_embedding_pipeline_mismatch.md`, `feedback_workflows_not_sacred.md`, `feedback_data_safety_top_priority.md`, `feedback_pr_bot_review_workflow.md`, `feedback_bot_review_investigation.md`
