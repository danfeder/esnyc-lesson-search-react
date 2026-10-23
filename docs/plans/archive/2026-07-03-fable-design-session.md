# Fable design session — decisions record (2026-07-03, afternoon)

Owner + Fable, following `2026-07-03-fable-design-kickoff.md`. This is the authoritative
record of the four deferred design questions from the FP2 walkthrough (see
`2026-07-03-fp2-handoff.md`) plus one fresh call. Every decision below was made by the
owner from explicitly presented options with previews; numbers were re-verified live
against PROD during the session.

## Decisions

### D-A. Facet-counts convention (unblocks #593)

**Standard faceted-search meaning, plus a one-line explainer.** The number next to each
option answers *"how many lessons carry this tag, within my other filter picks"* — a
category's own selections never restrict its own numbers. Rationale the owner bought:
it's the convention teachers meet everywhere else; the numbers stay put as you click; the
alternative "predictive" numbers (badge = what the total becomes if clicked) reshuffle on
every click, have no meaning on checked boxes, and would predict wrongly whenever a
search is typed (making them search-aware = big server job).

- **Explainer copy (approved):** a small gray sidebar line — *"Numbers show how many
  lessons carry each tag."*
- **Zero display (approved):** a genuine zero renders as `0` **and the row dims**
  (stays clickable; a checked row never dims). Blank badge only while counts are
  loading or errored — as #593 already builds.
- **Search-box caveat (accepted):** badges reflect filter picks, not the typed query.
  Query-aware badges remain a possible future server-side upgrade (sketched in #593).
- **Location math (re-confirmed):** Indoor badge counts indoor+both = **607** on PROD
  today (417 literal-Indoor + 190 Both); already built in #593's `expandLocationSelection`.

Worked example used (verified live): Garden checked → 284 results; Cooking badge reads
**394** (the tag count); checking it yields **623**, not 284+394, because **55** lessons
are both garden and cooking.

### D-B. Grade-pill counts layout

**Inline, inside the pill** — count sits next to the grade label, smaller and lighter
(10px, 65% opacity, tabular numerals), flipping to white on active pills. Exactly what
#593 already renders; no rework. Rejected: two-line pills (section ~2× taller), hover
tooltip (hides information; inconsistent with always-visible checkbox counts). Verified
grade counts at decision time: 3K 148 · PK 220 · K 284 · 1 278 · 2 274 · 3 301 · 4 307 ·
5 301 · 6 235 · 7 217 · 8 208.

### D-C. Filter roster (stakeholder territory — owner decided as stakeholder)

1. **Cooking Methods: KEEP its category.** 396/703 active lessons tagged (Basic prep 388,
   Stovetop 147, Oven 94). It encodes a real equipment constraint ("no oven — what can we
   cook?"); it lives collapsed at the bottom where it costs nothing. (Noted: Basic prep is
   near-tautological — 388 of 394 cooking lessons — the information is in Stovetop/Oven.)
2. **Main Ingredients: PROMOTE to a teacher-facing search filter.** Owner chose
   "promote now" over "ask the team first" (option explicitly offered and declined —
   owner is the stakeholder; an FYI to the curriculum team can ride the next sync).
   397/703 lessons tagged; 70 canonical values as 24 groups + 46 specifics; the data
   already guarantees a specific's parent group rides along, so the UI renders as a
   group→specific tree like Cultural Heritage and group-level filtering is a direct
   match. Top values: Grains & starches 202, Alliums 199, Root vegetables 139.
3. **Sidebar order: minimal change.** Ingredients slots in at #3, right after Activity
   Type; everything else keeps its place; Grade/Activity/Season stay the expanded trio;
   Ingredients starts collapsed. Full teacher-first reordering (which would demote Core
   Competencies) explicitly NOT taken — that's a curriculum-identity call for another day.

**Doc correction captured:** the sidebar's real order ends …SEL → Cooking Methods →
**Cultural Heritage last** (bespoke section), and Location does NOT start expanded
(Grade/Activity/Season do). Earlier notes had Heritage mid-list and Location expanded.

### D-D. Submit flow (FP-03) — CLOSED, no build

**Keep gate-first.** The sign-in modal fires on the chooser click, as today; #585's
auto-submit machinery stays as the safety net for signed-out arrivals landing directly
on `/submit/new` (bookmark/deep-link/refresh). Deciding fact: the site is invite-only
and the AuthModal deliberately has **no sign-up** — fill-first flows protect people from
sign-UP walls, and there isn't one; a no-account visitor is better served learning
immediately than after pasting a link. FP-03 is closed for good; the
`fp03-submission-gate-investigation.md` file is its record.

### D-E. "Clear all" semantics (fresh, from rung8b-filter-ui F1)

**Filters only.** The Filters panel's "Clear all" clears checkboxes/pills but keeps the
typed search text and the sort choice. Fix rides in Brief 3.

## Execution packaging (approved)

Per the token-economy working model: Fable wrote the briefs; **separate fresh Opus
sessions execute them**, one brief per session, thin hand-backs. Briefs live in
`docs/plans/fp3-briefs/`.

| # | Brief file | Contents | Size | Gate |
|---|---|---|---|---|
| 1 | `brief-1-593-finalization.md` | Rebase+resolve #593, hint line, zero-dim, verify vs live numbers | S | owner merges |
| 2 | `brief-2-display-truth.md` | FP-16 labels + heritage collapse, FP-17 badge, FP-18 location checkboxes, grades-sort fix | M | owner merges |
| 3 | `brief-3-search-polish.md` | FP-19 hint+noise, FP-12/13 404+Retry, FP-08 tokens, chooser line, Clear-all fix, suggestions-hook + permalink follow-ups | M | owner merges |
| 4 | `brief-4-heritage-close.md` | Reviewer Cultural Heritage → closed pick-list | S–M | owner merges |
| 5 | `brief-5-main-ingredients.md` | Ingredients filter: migration + sidebar tree + counts + 4-lesson stray cleanup | L | **PROD migration gate = owner** |

Order: Brief 1 first (unblocks the held PR); 2/3/4 independent; **Brief 5 last** (builds
on merged #593's facetCounts and carries the only database gate).

"Index, not host" needs no brief — the principle paragraph ships in this docs PR as
`docs/PRODUCT_PRINCIPLES.md`.

## Findings surfaced this session (new)

- **3 stray off-vocab Main Ingredients values on PROD** (4 active lessons, 5 tag
  instances): `Avocados` (Honduras and Baleadas), `Basil` (Italy / Pesto),
  `Various spices` (Eid / Italy Pesto / Nigeria Red Bean Stew). Canonical vocab is 70;
  PROD shows 72 distinct (+3 strays, −1 unused `Melons`). Cleanup mapping (owner-visible
  in Brief 5): Avocados→Avocado, Basil→Fresh herbs, Various spices→Spices.
- The tracker/script misstatements about sidebar order + expanded-by-default (corrected
  above).

## Parked (no overlap with the approved briefs — next discovery/fix session's input)

From `docs/plans/rung8-morning-burn/` (fresh 2026-07-03, still unranked):

- 7 remaining fail-open fetch sites, worst on admin surfaces (AdminUsers "No users
  found.", AdminUserDetail "User not found." on fetch errors) — `rung8-error-gaps.md`
- Logger keyword-redaction nukes whole log messages at 6 product call sites —
  `rung8b-utils.md` F1 (top pick for the next tech-debt slot)
- searchStore: dead `currentPage` field, unversioned persist, removeFilter churn —
  `rung8-stores.md` F1/F2/F4
- Submission-form robustness cluster (error-message discard, getUser race, debug-level
  logging, URL host anchoring) — `rung8b-submission-forms.md`
- E2E health: `networkidle` flake pattern, empty pagination test, no-404-coverage —
  `rung8b-e2e-health.md`
- Dead modules/exports missed by FP-15 (`reviewToLessonMapper`, `sanitizeHtml`) —
  `rung8b-utils.md` F2/F4
