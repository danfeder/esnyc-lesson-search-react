# Brief — Row & card labels: seasons · what · heritage (Fable ruling 2026-10-21)

**Status:** locked design, executed in PR "feat(internal): row and card labels show seasons, what and heritage" (2026-10-22). Executor built exactly this; no redesign. The source proposal ("Row labels — proposal from the teacher's scanning task") and its facts file (coverage, five PROD sample lessons, code anchors) were planning-session scratch documents and are not in the repo; the five sample lessons live on as the fixtures in `src/components/Internal/IntListRow.test.tsx`.

## The rule (shipped)
After the activity badge a row shows, in this order, omitting empty segments and their dots:
1. **Seasons** — every tagged season in vocab order (Fall, Winter, Spring, Summer); all four → the single word **"Year-round"**.
2. **What** — first non-empty of: `mainIngredients` (leaf-collapsed via `INGREDIENT_PARENT_MAP`, i.e. drop a group when one of its specifics is also tagged) → `gardenSkills` → `academicIntegration`. First three, stored order, comma-joined.
3. **Heritage** — exactly today's FP-16 leaf collapse + label map, first three, comma-joined.
`ROW_LABEL_MAX = 3` for every list segment. **Theme is dropped from rows and cards** (stays in drawer + filter). Nothing else is added (no Location, cooking methods, observances, competencies, SEL).

Cards use the SAME `intMetaSegments(lesson)` — one rule, two renderers. Card footer gains heritage and loses theme.

## Grafts (Fable-approved, in scope)
- **Dots on card footers:** card segments are separated by the same `·` dot span the row uses (one small CSS rule in `internal.css` for `.int-card-meta .dot` in the ink-30 token). Spaced words were fine when each segment was one word; comma lists need a boundary.
- **Collapse-before-cap heritage test:** `['Asian','East Asian','Chinese','Mexican']` → heritage segment is exactly `"Chinese, Mexican"`; `Asian`/`East Asian` never appear (cap counts leaves, row agrees with the drawer).
- **Skeleton:** `.int-skeleton-meta` width 40% → 60% in `src/styles/internal.css` (non-optional; lines are longer now).
- **Theme add-back is a documented one-line switch, OFF:** a comment in `intMetaSegments` shows the exact add-back (`segments.push(themes[0])` as a 4th segment capped at 1) so the owner can flip it in one PR. No flag or prop is wired.
- **Fixtures from the five sample lessons** drive the `intMetaSegments` unit tests, so the tests double as the mocked rows in the proposal (they assert the exact AFTER strings).
- **Dot-count render test:** the number of `.dot` spans equals the number of segments (a missing segment never leaves a dangling dot).
- **Module-scope mappers only:** any value→label mapper is built once at module scope, never inside render (`fieldValueLabeler` walks the option tree per call).

## Rejected (do NOT build)
- No `+K` / `+N` overflow marker anywhere.
- No density-coupled caps (no `density` prop plumbed into rows); Ultra may wrap long Cook rows — accepted.
- No cooking-method fallback for Cook rows without ingredients (subject fallback only).
- No CSS emphasis on the What segment; no new CSS classes beyond the card dot rule.
- No RPC/migration/store/vocabulary change. (Later hygiene, NOT this PR: add `mainIngredients`+`gardenSkills` to the `search_lessons` rebuild list.)

## Files
- `src/components/Internal/IntListRow.tsx` — `SEASON_ORDER`, `intSeasonLabel()`, `ROW_LABEL_MAX`, `intMetaSegments()`; the three slot consts + three conditional blocks replaced with one map. The doc-comment on `intMetaSegments` is the durable statement of the rule.
- `src/utils/filterUtils.ts` — `collapseIngredientsToLeaves(values)` beside `collapseHeritageToLeaves`; imports `INGREDIENT_PARENT_MAP` from `@/types/lessonMetadata.zod`.
- `src/components/Internal/IntCard.tsx` — footer = segments map with dots; rendered only when `segments.length > 0`.
- `src/styles/internal.css` — card dot rule; skeleton width.
- Tests: `IntListRow.test.tsx` (intSeasonLabel; intMetaSegments incl. the five samples + FP-16×cap + order + empty; render test: no theme text on row, dot count), `filterUtils.test.ts` (collapseIngredientsToLeaves ×4 cases), NEW `IntCard.test.tsx` (footer segments; no footer when empty; no theme text; dots).
- `docs/plans/fp1-audit/shelf-frontend-ux.md` — the one sentence stating the one-value rule rewritten.
- `academicIntegration` may be `string[] | {selected: string[]}` — guarded with `Array.isArray`.
- Index keys on segment spans.

## Verification
`npm run check` · `npm run test:run` (≈ +15–20 tests; before/after counts recorded in the PR) · `npm run build`. Unit-level proof: render IntListRow with Sample 2 → meta text contains "Year-round" and "Seed starting" and NOT "Plant Growth"; Sample 3 → three ingredients and "Black culinary history, Southern United States". The existing FP-16 test passes unchanged. Browser check happens on the Netlify deploy preview.

## STOP conditions
- Any vocabulary string needs changing → STOP.
- A test outside the listed files asserts theme text on a row/card → STOP and report (the proposal says none exists).
- `INGREDIENT_PARENT_MAP` shape differs from "specific → parent | null" → STOP.

## Risks (from the proposal §9)
- **R1 — Theme leaves the row.** The seven themes are ESYNYC's own curriculum strands; a stakeholder may expect to see "Seed to Table" on every row. Mitigation: it is a one-line add-back as a fourth segment (documented in `intMetaSegments`). The proposal's position is that a word shared by a third of all rows is not a scan fact.
- **R2 — "Year-round" is a word the filter does not know.** A teacher who sees it and looks for a "Year-round" filter will not find one (the vocab is Fall/Winter/Spring/Summer). Mitigation: the drawer still lists the four seasons; "All seasons" or listing all four are one-line swaps.
- **R3 — Longer lines, taller rows.** More wrapping in Split view and Ultra density. Mitigation: the skeleton width tweak; otherwise accept — desktop-only, and the row grid already tolerates wrap.
- **R4 — Silent truncation at three.** About half of ingredient lists are cut; a teacher may read the three as the whole list. Mitigation: the drawer is one click away; a "+N" suffix is a possible later add, deliberately left out.
- **R5 — Data-presence, not badge, picks the What.** Grow lessons that carry ingredients show ingredients instead of garden skills; Cook lessons with no ingredients show subjects. Both are true to the data; documented in the code comment.
- **R7 — One group name contains a comma.** "Squash, cucumbers & melons" reads as three items inside a comma-joined list. It only appears when none of its specifics is tagged. Accepted.
- **R8 — Heritage appears on cards for the first time.** Slightly busier cards; capped at three. A `segments.slice(0, 2)` knob exists if cards must stay quieter.
