# Rung 8 — Lesson-detail rendering path findings

(incremental; READ-ONLY audit of IntLessonDetail / IntLessonDrawer / IntSplitDetail / cards on main)

## F1. Drawer close animation empties the panel mid-slide (cosmetic, all lesson closes)
- `src/components/Internal/IntLessonDrawer.tsx:39` — panel content is `{lesson && (...)}` but close is driven by the parent setting `lesson` to null (`SearchPage.tsx:254 onClose={() => setSelectedLesson(null)}`). The `Transition show={lesson !== null}` starts a 150ms slide-out, but the title/CTA/meta unmount instantly on the same render, so the user sees the drawer contents vanish and a blank white panel animate away.
- Failure scenario: open any lesson in list/grid view, press Escape or the X — content blinks out before the drawer finishes sliding.
- Fix shape: cache the last non-null lesson locally (e.g. `useRef`/state) and render from the cache while the transition is leaving. Not covered by FP-16 (display labels) or any open PR.

## F2. `intGradesLabel` renders a first–last "range" that assumes the stored array is sorted and contiguous
- `src/components/Internal/IntListRow.tsx:22-26` — `>2` grades renders `${grades[0]}–${grades[grades.length-1]}`. Used in all three surfaces: IntListRow:65, IntCard.tsx:34, IntLessonDetail.tsx:44.
- Two failure modes: (a) if `lessons.grade_levels` is stored unsorted (reviewer tag order / import order), a lesson tagged `["3","K","1"]` renders "Grades 3–1"; (b) non-contiguous sets like `["K","4","8"]` render "K–8" implying all nine grades. DB check below confirms/refutes (a).

## F3. Missing `fileLink` = silently no way to open the lesson (null-field gap)
- `src/components/Internal/IntLessonDetail.tsx:48` — CTA only renders when `lesson.fileLink` is truthy; there is no fallback copy. `useLessonSearch.ts:86` passes `row.file_link` through untouched, so a NULL/empty column value gives a detail pane with metadata but no document link and no explanation.
- Failure scenario: any lesson row with `file_link` NULL or `''` — the whole point of the tool (open the doc) dead-ends silently. DB check below for prevalence.

## DB evidence (TEST DB `rxgajgmphciuaqzvwmox`, 2026-07-03, 763 lessons)
- F2 CONFIRMED LIVE: 2 lessons store grade arrays out of canonical order; `Sunprints` (lesson_id `11R_zwuo7bGo8vriRV85kE7JOBXG4VslPwrEz7sme6ck`, retired_at NULL — live in search) has `grade_levels = {1,2,3,K}` → all three surfaces render **"Grades 1–K"** (backwards range). (`Leaves We Eat` `{1,2,3,4,5,K}` is retired.) Broader misleading-range bucket (unsorted OR first–last not spanning exactly the array): 8 rows.
  - Fix shape: sort via canonical grade order (the `['3K','PK','K','1'..'8']` order already in `filterDefinitions.ts` gradeLevels options) inside `intGradesLabel` before rendering — cheap, fixes list+card+detail at once; optionally render non-contiguous sets as a list instead of a dash range.
- F3 DOWNGRADED: `empty_filelink = 0` of 763 — no live failure today; keep as a defensive nit (a future row with empty `file_link` dead-ends silently).
- Checked-and-clean (no finding): duplicate values inside `culturalHeritage` arrays = 0 (no React key collision in MetaRow); `grade_levels` empty = 0 (the "Grades —" eyebrow copy never fires on real data); `summary` empty = 78 but that is FP-09 (backlog, skipped).

## Known/skipped (already tracked — not counted)
- Raw kebab `cookingMethods` ("basic-prep", 417 lessons) + parent+child heritage stacking in the drawer = FP-16 (tracker row 16). Raw kebab themes in IntCard/IntListRow = FP-02 data fix (#590 open). Summary backfill = FP-09. Permalink/selection work = #594.

## Summary
1. (cosmetic, all closes) Drawer contents unmount instantly on close; empty panel animates out — IntLessonDrawer.tsx:39 + SearchPage.tsx:254.
2. (CONFIRMED, live data) `intGradesLabel` first–last range assumes sorted+contiguous array — IntListRow.tsx:22-26, surfaces IntListRow.tsx:65 / IntCard.tsx:34 / IntLessonDetail.tsx:44; "Sunprints" shows "Grades 1–K" today.
3. (defensive only) No fallback when `fileLink` is falsy — IntLessonDetail.tsx:48; 0 affected rows currently.
