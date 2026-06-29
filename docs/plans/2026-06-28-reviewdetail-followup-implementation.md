# ReviewDetail Follow-up — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use @superpowers:executing-plans to implement this plan
> task-by-task. TDD tasks use @superpowers:test-driven-development.

**Goal:** Fix the HIGH data-integrity bug where a wholesale duplicate-details load failure silently
hides all duplicate cards (reviewer may approve a true duplicate as new), and fold in the deferred
cleanup cluster (F2 / R2-NEW-1 / F1 / N4 / N5 / N6).

**Architecture:** Frontend-only. The fix adds a `duplicatesError` signal to `useReviewSubmission`
(set when the `lessons_with_metadata` Wave-B fetch errors AND there were similarities) and renders a
non-blocking warning banner + Retry in `ReviewDecisionPanel`. The cluster items are small, mostly
single-file changes. No DB / migration / RPC.

**Tech Stack:** React 19 + TypeScript, Vitest + React Testing Library, Supabase JS client.

---

## Pre-flight (read once)

- **Branch:** `fix/reviewdetail-followup` (already cut from `main` @ `1cd2693`; carries 2 wave-5
  docs commits + the design doc). Commit on it; do NOT push/PR until the supervisor says so.
- **Re-anchor by SYMBOL.** Line numbers below are current as of 2026-06-28 but drift as commits land.
- **Files in play:**
  - `src/pages/useReviewSubmission.ts` (the load hook — Tasks 1 & 2)
  - `src/components/Review/ReviewDecisionPanel.tsx` (banner + N5 — Tasks 1 & 6)
  - `src/pages/ReviewDetail.tsx` (plumbing + F2 not-found render — Tasks 1 & 2)
  - `src/App.tsx` (key={id} wrapper — Task 3)
  - `src/components/Review/ReviewDocPanel.tsx` (F1 — Task 4)
  - `src/pages/buildCandidateCards.ts` (N4 — Task 5)
  - `src/components/Review/ReviewMetadataForm.tsx` (N6 — Task 7)
  - Tests: `src/__tests__/integration/review-detail-page.test.tsx`, `src/pages/buildCandidateCards.test.ts`
- **Page-test mock seam (load-bearing for Tasks 1 & 2):** `makeReviewSupabaseMock` keys on **table
  name** and ignores query args. `lessons_with_metadata` is fetched both as `.in()` (duplicates) and
  `.eq().single()` (off-list target) — the mock can't serve both shapes at once. For the Task-1
  banner test use a fixture with `similarities > 0` and **no off-list target** so only the `.in()`
  path fires; have the mock return `{ data: null, error: <err> }` for `lessons_with_metadata`.
- **Verify after every task:** `npm run check` (type-check + lint) and the page suite
  `npm run test:run -- review-detail-page`. The full suite (`npm run test:run`) before the PR.
- **Commit granularity:** one labeled commit per task (Tasks 4–7 are tiny — they may be executed in a
  single dispatch but stay separate commits).

---

## Task 1: `lessonsError` → non-blocking duplicates banner + Retry (the data-integrity fix)

**Files:**
- Modify: `src/pages/useReviewSubmission.ts` (add `duplicatesError` state/signal/return + type)
- Modify: `src/components/Review/ReviewDecisionPanel.tsx` (banner render + 2 props)
- Modify: `src/pages/ReviewDetail.tsx` (destructure + plumb 2 props)
- Test: `src/__tests__/integration/review-detail-page.test.tsx` (new test, follows "test 12" shape)

### Step 1 — Write the failing page tests (TWO failure paths — GATE 1B scope completion)

Follow the structure of test 12 (`"reviews-error: … blocks with a load-error screen"`). Add **two**
tests — the banner must fire on EITHER fetch failing:

**Test A — details fetch fails (`lessons_with_metadata`), count shown:**
- Fixture: a submission with `submission_similarities` returning ≥1 row (say 3), `submission_reviews`
  empty, **no** `original_lesson_id` (so no off-list `.single()` fetch), and the mock returns
  `{ data: null, error: { message: 'boom' } }` for the `lessons_with_metadata` table.
- Assert (banner + non-blocking):
  - The warning text renders (stable substring, e.g. `/couldn't load .* possible duplicate/i`) and
    shows the count (`/3/`).
  - A **Retry** button is present — use `getByRole('button', { name: /retry/i })` (it throws on >1
    match, so it also guards against a future second Retry leaking into the non-blocked render).
  - The **form still renders** (decision radios present — e.g. the "Approve & publish" radio),
    proving non-blocking (contrast with test 12, which asserts NO radios).
  - No `IntDuplicateCard`s rendered.

**Test B — similarities list fetch fails (`submission_similarities`), count-less message:**
- Fixture: mock returns `{ data: null, error: { message: 'boom' } }` for the
  `submission_similarities` table; `submission_reviews` empty; valid `lesson_submissions` row.
- Assert: the count-less warning renders (`/couldn't load possible duplicates/i`, NO number), a Retry
  button is present, and the form still renders (non-blocking).

Leave test 12 (reviews-error blocking) untouched — it must stay green.

### Step 2 — Run it; verify it FAILS

`npm run test:run -- review-detail-page`
Expected: both new tests FAIL (no banner today; cards silently empty).

### Step 3 — Implement the hook signal (`useReviewSubmission.ts`)

1. Add an exported type near `UseReviewSubmissionResult`:
   ```ts
   /**
    * A duplicate-cards load failure that leaves the reviewer with zero candidate
    * cards and no signal. Two failure modes (GATE 1B): the `submission_similarities`
    * list fetch failed (count unknown → `null`), or the `lessons_with_metadata`
    * details fetch failed for known similarity ids (`count` = how many, capped at the
    * 5 the UI would render).
    */
   export interface DuplicatesLoadError {
     count: number | null;
   }
   ```
2. Add to `UseReviewSubmissionResult`:
   ```ts
   /**
    * Set when the candidate-cards would silently vanish due to a transient fetch
    * failure (similarities list OR details). The page renders a retry banner so the
    * reviewer doesn't mistake a load failure for "no duplicates" and approve a true
    * duplicate as new. null when similarities loaded fine (incl. genuinely zero) and
    * the details fetch succeeded — the partial/missing-id case still degrades to
    * "Unknown" cards in place.
    */
   duplicatesError: DuplicatesLoadError | null;
   ```
3. Add state next to the others:
   ```ts
   const [duplicatesError, setDuplicatesError] = useState<DuplicatesLoadError | null>(null);
   ```
4. Reset it at the top of `loadSubmission`, next to `setLoadError(null)`:
   ```ts
   setLoadError(null);
   setDuplicatesError(null);
   ```
5. **Failure mode 1 — similarities LIST fetch failed.** In the existing `if (similaritiesError)`
   block (the one that currently only `logger.warn`s, before the reviews-error block), also set the
   count-less signal. When the list fetch fails, `similarities` is null → the Wave-B block is skipped,
   so this is the only place the failure is observable:
   ```ts
   if (similaritiesError) {
     logger.warn('Error fetching submission similarities:', similaritiesError);
     // The similarities list itself failed → `similarities` is null, the Wave-B
     // block below is skipped, and the reviewer would see zero cards with no signal.
     // Count is unknown here (we never got the list), so null.
     setDuplicatesError({ count: null });
   }
   ```
6. **Failure mode 2 — details fetch failed for known ids.** In the Wave-B similarities block, set the
   counted signal inside the `if (lessonsError)` branch — but gate on `!lessons` (defensive: only when
   the cards genuinely vanish; never a false banner if data + error ever co-occur). Cap the count at 5
   to match the UI (`topDuplicates = similarities.slice(0, 5)`):
   ```ts
   if (lessonsError) {
     logger.warn('Error fetching similar lessons:', lessonsError);
     // Whole-query failure → `lessons` is null, so the map below can't run and the
     // duplicate cards silently vanish. Signal it (with the count we know, capped at
     // the 5 the UI renders) so the panel shows a retry banner, not zero cards.
     if (!lessons) {
       setDuplicatesError({ count: Math.min(similarities.length, 5) });
     }
   }
   ```
   Leave the `if (lessons) { similaritiesWithLessons = similarities.map(...) }` block unchanged (the
   partial/missing-id "Unknown" fallback stays correct). The two failure modes are mutually exclusive
   (mode 1 ⟹ `similarities` null ⟹ mode-2 block never runs).
7. Add to the return:
   ```ts
   return { submission, loading, loadError, initialFormState, reload, duplicatesError };
   ```

### Step 4 — Implement the banner (`ReviewDecisionPanel.tsx`)

1. Import the type (it already imports from the hook):
   ```ts
   import type { SubmissionDetail, ReviewDecision, DuplicatesLoadError } from '@/pages/useReviewSubmission';
   ```
2. Add two props to `ReviewDecisionPanelProps`:
   ```ts
   /** Non-null when the wholesale duplicate-details fetch failed (see hook). */
   duplicatesError: DuplicatesLoadError | null;
   /** Retry handler for the duplicates banner (the hook's `reload`). */
   // eslint-disable-next-line no-unused-vars
   onRetryDuplicates: () => void;
   ```
   …and destructure them in the component signature.
3. Render the banner between `<SubmitterIntentBanner … />` and the `{candidateCards.length > 0 && …}`
   block, so it sits in the duplicates area and shows independent of card count. Handle the count-less
   case (mode 1). Match the existing error-banner conventions (`role="alert"`, `adm-hint--error`) +
   `IntButton` (already imported):
   ```tsx
   {duplicatesError && (
     <div className="adm-card">
       <div role="alert" className="adm-hint adm-hint--error adm-alert--error">
         {duplicatesError.count != null
           ? `Couldn't load ${duplicatesError.count} possible duplicate${
               duplicatesError.count === 1 ? '' : 's'
             } for this submission.`
           : "Couldn't load possible duplicates for this submission."}{' '}
         Retry before deciding — approving as new could miss a real duplicate.
       </div>
       <div style={{ marginTop: 12 }}>
         <IntButton variant="primary" onClick={onRetryDuplicates}>
           Retry
         </IntButton>
       </div>
     </div>
   )}
   ```

### Step 5 — Plumb it through (`ReviewDetail.tsx`)

1. Destructure from the hook:
   ```ts
   const { submission, loading, loadError, initialFormState, reload, duplicatesError } =
     useReviewSubmission(id);
   ```
2. Pass to the panel (in the `<ReviewDecisionPanel … />` JSX):
   ```tsx
   duplicatesError={duplicatesError}
   onRetryDuplicates={reload}
   ```

> **Known tradeoffs (documented, accepted — locked full-`reload()` decision):**
> - `reload()` re-runs the whole load → new `initialFormState` → the `useLayoutEffect([initialFormState])`
>   seeding effect re-applies it, so any in-progress form edits are reset. The banner appears at initial
>   load (before edits), so practical risk is low.
> - `reload()` sets `loading = true`, and ReviewDetail's first early-return is `if (loading)`, so
>   clicking Retry briefly replaces the WHOLE screen with the "Loading submission…" spinner (not just
>   the duplicates area). The banner is non-blocking; the retry action itself is momentarily blocking.
>   Expected; note it in deploy-preview smoke.

### Step 6 — Run tests; verify PASS

`npm run test:run -- review-detail-page` → the new test PASSES; test 12 + the other 15 stay green.
`npm run check` → clean.

### Step 7 — Commit

```bash
git add src/pages/useReviewSubmission.ts src/components/Review/ReviewDecisionPanel.tsx \
        src/pages/ReviewDetail.tsx src/__tests__/integration/review-detail-page.test.tsx
git commit -m "fix(review): surface a retry banner when duplicate details fail to load

Wholesale lessons_with_metadata errors left the reviewer with zero duplicate
cards and no signal (risk: approving a true duplicate as new). Add a
duplicatesError signal + non-blocking banner with Retry. Partial/missing-id
degradation (Unknown cards) is unchanged."
```

---

## Task 2: F2 — primary-fetch error gets a Retry (distinguish from genuine not-found)

**Why:** Today a transient error on the primary `lesson_submissions` fetch shows "Submission not
found" with no recovery. A genuine missing row should keep that message; a transient error should
offer Retry (reuse R2-1's `loadError` mechanism).

**`.single()` nuance:** a missing row returns `{ data: null, error: { code: 'PGRST116' } }` (an
*error*, not null data), so the branch must key on the error **code**, not on data-null.

**Files:**
- Modify: `src/pages/useReviewSubmission.ts` (primary-error handling + a new message const)
- Test: `src/__tests__/integration/review-detail-page.test.tsx`

### Step 1 — Write the failing tests (two cases)

- `"primary-fetch error (non-PGRST116) shows a load-error screen with Retry"`: mock
  `lesson_submissions` `.single()` returns `{ data: null, error: { code: '500', message: 'boom' } }`.
  Assert: the "couldn't load" screen renders **with a Retry button**; no form.
- `"primary-fetch PGRST116 shows Submission not found (no Retry)"`: mock returns
  `{ data: null, error: { code: 'PGRST116' } }`. Assert: "Submission not found" renders; **no** Retry
  button.

### Step 2 — Run; verify FAIL

`npm run test:run -- review-detail-page` → both new tests FAIL (today both paths show "not found", and
the non-PGRST116 case currently throws → also "not found", no retry).

### Step 3 — Implement (`useReviewSubmission.ts`)

1. Add a message const near `REVIEWS_LOAD_ERROR_MESSAGE`:
   ```ts
   const SUBMISSION_LOAD_ERROR_MESSAGE =
     "We couldn't load this submission. Check your connection and try again.";
   ```
2. Replace the current primary-error guards:
   ```ts
   if (submissionError) throw submissionError;
   if (!submissionData) {
     logger.error('No submission found with id:', id);
     return;
   }
   ```
   with:
   ```ts
   if (submissionError) {
     // .single() returns PGRST116 when it matches 0 rows — a genuine "no such
     // submission" (retrying won't help) → fall through to the not-found screen.
     // Any OTHER error is transient/DB → block with a load-error screen that has
     // Retry, instead of a misleading "Submission not found".
     if (submissionError.code === 'PGRST116') {
       logger.warn('No submission found with id:', id);
       return;
     }
     logger.error('Failed to load submission:', submissionError);
     setLoadError(SUBMISSION_LOAD_ERROR_MESSAGE);
     return;
   }
   if (!submissionData) {
     logger.error('No submission found with id:', id);
     return;
   }
   ```
3. Update the Wave-A comment block that says "#1 throws … → 'Submission not found' UI" to reflect the
   new split (PGRST116 → not-found; other error → load-error screen with Retry). Note the outer
   try/catch still handles true promise *rejections* (network down) as before ("Submission not
   found") — that reject path is intentionally left out of F2's scope (conflating it with runtime
   errors would mask bugs).

> **`PGRST116` is the *expected* Supabase zero-row code for `.single()`** (precedent: `useEnhancedAuth.ts`,
> `src/lib/CLAUDE.md`) — not provably the *only* possible code from the repo alone, which is exactly why
> the `if (!submissionData)` guard stays as belt-and-suspenders. After both `submissionError` branches
> `return`, that guard is effectively unreachable for `.single()`; keep it (cheap defense-in-depth) but
> comment it honestly as a fallback, not a live path.

> ReviewDetail's existing `loadError` render already provides the Retry button (it calls `reload`), so
> the non-PGRST116 case reuses it with no ReviewDetail change.

### Step 4 — Run; verify PASS, then commit

`npm run test:run -- review-detail-page` + `npm run check` clean.
```bash
git add src/pages/useReviewSubmission.ts src/__tests__/integration/review-detail-page.test.tsx
git commit -m "fix(review): primary-fetch transient error offers Retry (F2)

Distinguish a transient lesson_submissions fetch error (→ load-error screen
with Retry) from a genuine missing row (PGRST116 → 'Submission not found').
Previously both showed 'Submission not found' with no recovery."
```

---

## Task 3: R2-NEW-1 — remount ReviewDetail on `:id` change (`key={id}`)

**Why:** Navigating `/review/A` → `/review/B` reuses the ReviewDetail instance; stale `loadError` /
form state from A can flash into B's first frame. A `key={id}` forces a clean remount.

**Files:**
- Modify: `src/App.tsx` (a small route wrapper that reads `useParams().id` — the id isn't in scope in
  the `<Route>` element today)
- Test: `src/__tests__/integration/review-detail-page.test.tsx` (pragmatic — see Step 1)

### Step 1 — Decide the test (be honest — GATE 1B)

The existing harness (`renderReview`) hardcodes `<Route path="/review/:id" element={<ReviewDetail />} />`
— it renders `ReviewDetail` **directly, not the wrapper where `key={id}` lives**. So an in-harness
behavior test proves nothing about this fix unless the wrapper is **exported** and the test renders
*it* across two ids. Two acceptable paths:
- **(preferred if cheap)** `export` `ReviewDetailRoute` from `App.tsx`; add a focused test that renders
  it under a `MemoryRouter` at `/review/A` (A errors on reviews → load-error screen) then re-renders at
  `/review/B` (valid) and asserts B's form renders with no stale load-error. Needs the mock to serve
  both fixtures by id — only do this if the mock makes per-id fixtures easy.
- **(fallback)** ship the `key` fix with **no automated coverage**, document a manual deploy-preview
  check (navigate between two reviews), and say so plainly in the commit body. This is acceptable for an
  internal tool (the stale-flash was rated "theoretical only" in PR-1b triage).

Do NOT leave "write a behavior test if the harness supports it" as if it's a live option — pick one
path and state it in the commit.

### Step 2 — Implement (`src/App.tsx`)

Add the wrapper and use it in the `/review/:id` route. Read the current route block first; adapt to its
import style.

**CRITICAL (GATE 1B): define `ReviewDetailRoute` at MODULE top-level, NOT inside `AppContent`.** A
nested function component gets a new identity on every `AppContent` render (which re-renders on
`useLessonStats()` updates), which would remount `ReviewDetail` constantly — a real regression that
defeats the fix.
```tsx
import { useParams } from 'react-router-dom'; // if not already imported

// Module scope — stable identity so ReviewDetail remounts ONLY on :id change.
function ReviewDetailRoute() {
  const { id } = useParams();
  return <ReviewDetail key={id} />;
}
```
Then swap `<ReviewDetail />` for `<ReviewDetailRoute />` inside the existing
`ProtectedRoute`/`ReviewErrorBoundary` wrappers (do not change those). If you choose the export path in
Step 1, add `export` to the wrapper.

### Step 3 — Verify + commit

`npm run check` + `npm run test:run -- review-detail-page` green.
```bash
git add src/App.tsx src/__tests__/integration/review-detail-page.test.tsx
git commit -m "fix(review): remount ReviewDetail on :id change to clear stale state (R2-NEW-1)"
```

---

## Task 4: F1 — `ReviewDocPanel` embed error → `logger.warn`

**Files:** Modify `src/components/Review/ReviewDocPanel.tsx`.

The Google-Doc embed `onError` handler calls `logger.error` (→ Sentry ERROR) on a recoverable embed
failure. Change it to `logger.warn`. Locate the `onError` by symbol; change only the log level + (if
present) any "error" wording in the message to match the warn intent.

```bash
git add src/components/Review/ReviewDocPanel.tsx
git commit -m "chore(review): downgrade Google-Doc embed failure to logger.warn (F1)"
```

---

## Task 5: N4 — extract repeated `formatGrades` helper

**Files:** Modify `src/pages/buildCandidateCards.ts` (+ optional unit test in
`buildCandidateCards.test.ts`).

The grade-formatting ternary repeats 3× verbatim:
```ts
arr?.length ? `Grades ${arr.join(', ')}` : 'Grades —'
```
Extract a single helper and use it at all 3 sites. Behavior-identical (the existing null-grades unit
test already pins it). Keep it local to `buildCandidateCards.ts` unless an obvious shared home exists
in `@/utils` (don't create a new util file for one helper):
```ts
function formatGrades(grades: string[] | null | undefined): string {
  return grades?.length ? `Grades ${grades.join(', ')}` : 'Grades —';
}
```
Run `npm run test:run -- buildCandidateCards` — must stay green.
```bash
git add src/pages/buildCandidateCards.ts src/pages/buildCandidateCards.test.ts
git commit -m "refactor(review): extract formatGrades helper in buildCandidateCards (N4)"
```

---

## Task 6: N5 — label the "Note to teacher" textarea

**Files:** Modify `src/components/Review/ReviewDecisionPanel.tsx` (+ assertion in the page test).

The `<textarea className="adm-textarea">` has no programmatic label. Add `aria-label="Note to teacher"`.
Add a light assertion to the page test (`getByLabelText(/note to teacher/i)` resolves the textarea).
```bash
git add src/components/Review/ReviewDecisionPanel.tsx src/__tests__/integration/review-detail-page.test.tsx
git commit -m "a11y(review): label the Note to teacher textarea (N5)"
```

---

## Task 7: N6 — `legacyDecisionWarning` → `role="alert"`

**Files:** Modify `src/components/Review/ReviewMetadataForm.tsx`.

Change the `legacyDecisionWarning` container `role="status"` → `role="alert"` (match the sibling
validation banner; it's an important warning, not a passive status). Locate by symbol.
```bash
git add src/components/Review/ReviewMetadataForm.tsx
git commit -m "a11y(review): legacyDecisionWarning uses role=alert (N6)"
```

---

## Final verification (before PR)

1. `npm run check` — clean.
2. `npm run test:run` — full suite green (the 16+ page tests incl. the new banner/F2 tests + all units).
3. `git log --oneline origin/main..HEAD` — confirm the labeled commits (+ the carried-forward docs).
4. Supervisor: GATE 3 (code-reviewer agent + Codex on `git diff main...HEAD`), then push + PR per the
   per-PR ritual. No DB → no TEST-DB step. Optional cheap insurance: a deploy-preview smoke of the
   banner + Retry on a forced-error path.
