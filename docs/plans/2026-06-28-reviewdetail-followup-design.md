# ReviewDetail Follow-up PR — Design

**Status:** Approved (2026-06-28) · **GATE 1B amendments folded (2026-06-28)**
**Scope:** One PR, frontend-only, no DB / no migration. Separately-labeled commits.

> **GATE 1B amendments (Codex `gpt-5.5` + Claude cross-check, 2026-06-28):**
> - **Cover BOTH silent-zero-cards failures** (user-confirmed scope completion): the banner fires on a
>   `lessons_with_metadata` details error (count = `min(similarities.length, 5)`) **and** on a
>   `submission_similarities` list error (count unknown → count-less message). Same mis-review risk →
>   same treatment. `duplicatesError` shape = `{ count: number | null }`.
> - Gate the details-error banner on `lessonsError && !lessons` (defensive — no false banner if data +
>   error ever co-occur).
> - `ReviewDetailRoute` (Task 3) must be **module-scope** (not nested in `AppContent`, which would
>   remount on every render). Its `key={id}` fix is not exercised by the existing harness — accept
>   documented manual coverage or export + test the wrapper.
> - Retry = full `reload()` → briefly shows the page spinner (and re-seeds the form, see §2).
**Branch:** `fix/reviewdetail-followup` (cut from `main` @ `1cd2693`; carries 2 wave-5-closure docs commits forward).

This is the prioritized follow-up to the now-closed Wave 5 (ReviewDetail decomposition + C107
parallel load). It fixes one HIGH data-integrity issue surfaced during PR-2 bot triage and folds
in the deferred cleanup cluster (F2 / R2-NEW-1 / F1 / N4 / N5 / N6) while the same files are open.

---

## 1. Problem — `lessonsError` silently hides ALL duplicate cards (HIGH, data-integrity)

The reviewer's core decision on `/review/:id` is **"approve as new"** vs **"merge into an existing
duplicate."** Duplicate candidates come from the Wave-B fetch of `lessons_with_metadata` for the
similarity ids (`src/pages/useReviewSubmission.ts`).

Current code (post-C107):

```ts
// useReviewSubmission.ts ~L176-207
const lessonsPromise =
  similarities && similarities.length > 0
    ? supabase.from('lessons_with_metadata').select('…').in('lesson_id', ids)
    : Promise.resolve({ data: null, error: null });
const [{ data: lessons, error: lessonsError }, …] = await Promise.all([lessonsPromise, …]);

if (similarities && similarities.length > 0) {
  if (lessonsError) {
    logger.warn('Error fetching similar lessons:', lessonsError);
  }
  if (lessons) {                       // ← whole-query error → lessons === null → guard SKIPS the map
    similaritiesWithLessons = similarities.map((sim) => {
      const lesson = lessons.find((l) => l.lesson_id === sim.lesson_id);
      return { ...sim, lesson: lesson || { title: 'Unknown', … } };  // ← per-id fallback (partial case)
    });
  }
}
```

- **Whole-query failure** (transient network/DB error): supabase-js resolves `{ data: null, error }`
  (no throw) → `lessons` is `null` → the `if (lessons)` guard skips the `.map()` →
  `similaritiesWithLessons` stays `[]`. The reviewer sees **zero duplicate cards with no UI signal**
  (`ReviewDecisionPanel` only renders the cards block when `candidateCards.length > 0`, and there is
  **no empty-state copy**). Risk: a true duplicate is approved as new.
- **Partial / missing-id case** (query succeeds, some ids absent): the `.map()` runs and missing ids
  fall back to `{ title: 'Unknown' }`. **This already degrades gracefully and is correct — leave it.**

The inline comment promising "render as Unknown" only ever applied to the partial case; it never fired
for the whole-query error.

---

## 2. Decision — Option A: non-blocking warning banner + Retry

**Chosen** over (B) "render N Unknown cards" and (C) "block the whole review like R2-1".

- **B** is the smallest change but "Unknown" is ambiguous (loaded-but-untitled vs failed-to-load), the
  cards are unusable for a merge decision, and there is no retry.
- **C** is safest but disproportionate: a failed duplicate panel is far less catastrophic than a failed
  reviews-restore (which can silently overwrite prior reviewer work via `complete_review_atomic`'s
  `ON CONFLICT DO UPDATE`). Blocking metadata editing + doc reading for a degraded duplicate panel is
  too heavy, and it would be inconsistent with the partial-case graceful degradation.

**A** gives an explicit, unambiguous "duplicates exist but failed to load — N of them" signal with a
one-click Retry, stays non-blocking so the rest of the review works, and reuses the proven `reload()`.

### Design

**Hook (`useReviewSubmission.ts`):**
- Expose a new signal indicating the wholesale duplicate-details failure **and the count** — e.g.
  `duplicatesError: { count: number } | null` (exact shape decided in the impl plan; must carry the
  count so the banner can say "N").
- Set it when `similarities && similarities.length > 0 && lessonsError`. In that case
  `similaritiesWithLessons` stays `[]` (no duplicate cards) — unchanged.
- The partial/missing-id path (lessons non-null) is **untouched**.
- Add `duplicatesError` to the hook's return alongside `submission, loading, loadError,
  initialFormState, reload`.

**Render (`ReviewDecisionPanel.tsx`):**
- Accept `duplicatesError` (+ a retry handler) as props.
- When set, render a warning banner in the candidate-cards area — copy roughly:
  *"Couldn't load N possible duplicate(s) for this submission. Retry before deciding — approving as
  new could miss a real one."* — with a Retry button.
- The banner renders **independent of `candidateCards.length`** (so it shows even when there are no
  off-list / reviewer-search cards either). Off-list / reviewer-search cards (separate fetches) still
  render normally.

**Plumbing (`ReviewDetail.tsx`):** pass `duplicatesError` + the retry handler from the hook to
`ReviewDecisionPanel`.

**Retry behavior: full `reload()`.** Reuses the existing 3-wave reload (same mechanism as the R2-1
load-error screen). The banner appears at initial load — before the reviewer has typically edited the
form — so the practical clobber risk is low. **Impl-plan verification:** confirm whether `reload()`
resets in-progress form edits; if it does and we judge it risky, note it (we are not switching to a
targeted refetch unless that check changes the calculus).

---

## 3. Cleanup cluster (one labeled commit each)

These were deferred from Wave 5 PR-1a/1b/2 bot triage; folded in here because the same files are open.

| Item | Type | Change |
|------|------|--------|
| **F2** | behavior | Distinguish a primary `lesson_submissions` *fetch error* (transient → blocking load-error screen **with Retry**, reusing R2-1's `loadError` mechanism) from a genuine *not-found* (data null, no error → keep "Submission not found", **no** Retry — retrying won't help). Today both render "Submission not found" with no recovery. |
| **R2-NEW-1** | behavior | Add `key={id}` so `/review/:id` → `/review/:id2` **remounts** `ReviewDetail`, killing any stale `loadError` / form carryover. Needs a small route wrapper that reads `useParams().id` (the id isn't in scope in `App.tsx`'s `<Route>` element today). + test. |
| **F1** | cosmetic | `src/components/Review/ReviewDocPanel.tsx` embed `onError` → `logger.warn` (not `logger.error`/Sentry-ERROR). Embed failure is a recoverable degraded state, not an exception. |
| **N4** | cosmetic | Extract the 3× repeated `formatGrades` ternary in `buildCandidateCards.ts` → a helper (behavior-identical; already unit-pinned by the null-grades test). Impl plan decides home (`@/utils` vs local). |
| **N5** | a11y | Add a programmatic label to the "Note to teacher" `<textarea>` in `ReviewDecisionPanel.tsx` (`aria-label` or associated `<label>`). |
| **N6** | a11y | `ReviewMetadataForm.tsx` `legacyDecisionWarning` `role="status"` → `role="alert"` (match the sibling validation banner). |

---

## 4. Testing

- **New page test (`review-detail-page`):** wholesale duplicates failure → banner + count + Retry
  render; form **still renders** (non-blocking); no duplicate cards.
  - *Mock-seam note:* `makeReviewSupabaseMock` keys on table name and can't serve
    `lessons_with_metadata` as both `.in()` (duplicates) and `.eq().single()` (off-list) in one
    render. Use a fixture with `similarities > 0` and **no off-list target** so only the `.in()`
    path fires; have the mock return `{ data: null, error }` for that fetch.
- **F2 test:** primary fetch *error* → blocking load-error screen **with Retry**; true *404* (data
  null, no error) → "Submission not found", **no** Retry.
- **R2-NEW-1 test:** id change remounts (`key`) — assert clean state across `/review/:id` → `:id2`.
- **Regression:** all 16 page tests stay green (incl. test 12 reviews-error, **unchanged**) +
  `buildCandidateCards` units (N4 extraction is behavior-identical).

---

## 5. Out of scope

- No DB / migration / RPC changes.
- No targeted duplicates-only refetch (full `reload()` chosen).
- No broader a11y sweep beyond N5/N6 (the design-system a11y backlog stays deferred).
- Personalization (Bookmarks / Saved Searches / Collections) and the admin tail remain deferred to a
  future wave.

---

## 6. Risks & mitigations

- **Mock can't catch fetch-ordering / dual-shape** — the page mock ignores query args and keys on
  table name. The banner test must use a single-shape fixture (above). No new manual smoke is
  strictly required (frontend-only, deterministic), but a quick deploy-preview check of the banner +
  Retry on a forced-error path is cheap insurance.
- **`key={id}` remount cost** — remounting `ReviewDetail` on id change re-runs the load; acceptable
  (that's the intended clean-state behavior, and navigation between reviews is infrequent).
- **`reload()` clobbering edits** — see §2 impl-plan verification.
