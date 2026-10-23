# Rung 8b — Filter UI audit (IntSidebar + filter internals)

Scope: `src/components/Internal/IntSidebar.tsx`, `IntCulturalHeritageSection.tsx`, `IntFilterSection.tsx`, `IntMobileFilterDrawer/Button.tsx`, `src/utils/filterDefinitions.ts` (+ store/urlParams cross-checks).
Excluded per brief: facet-count math (rung8-facet-parity covers it, incl. location Indoor/Outdoor→both expansion parity), tracker backlog, PRs #582–#595, rung8-* round-1 files.
Status: COMPLETE. 6 findings (1 medium, 3 low, 2 info).

## Findings

### F1 (MEDIUM, clear-all semantics) — "Clear all" in the Filters panel also wipes the search query and sort
- `src/components/Internal/IntSidebar.tsx:52` — the Clear all button calls store `clearFilters`.
- `src/stores/searchStore.ts:96-105` — `clearFilters` resets to `initialFilters`, which includes `query: ''` (searchStore.ts:61), and resets `sortBy` back to `'relevance'` (only `view`/`density` are preserved, per the comment at :99).
- Inconsistency: the button's own visibility gate deliberately EXCLUDES `query` from the active count (`IntSidebar.tsx:41` `.filter((k) => k !== 'query')`) — so the UI's definition of "active filters" right next to the button excludes the query, but clicking the button clears it anyway.
- Failure scenario: user types "compost" in the search box, checks Season→Fall, clicks "Clear all" under the **Filters** header expecting to keep their search → the query text vanishes from the search box (filters.query drives the input) and results reset to the unfiltered, unsearched, relevance-sorted list. Same behavior through the mobile drawer (drawer re-renders the same IntSidebar, `IntMobileFilterDrawer.tsx:51`).
- Fix shape: clear only non-query filter keys (spread `initialFilters` minus `query`, keep current `sortBy`), or rename/relocate the control if wiping everything is intended.

### F2 (LOW, dead prop / doc drift) — `FilterConfig.type` is dead at runtime; Location declared `'single'` but rendered multi-select
- `src/utils/filterDefinitions.ts:43` declares `location: { type: 'single' }` and project CLAUDE.md says "only Location is single-select" with filterDefinitions "authoritative".
- Reality: nothing in `src/` reads `cfg.type` (grep over components/pages/hooks: zero consumers). `IntSidebar.tsx:15` puts `location` in `CHECKBOX_KEYS` and renders plain multi checkboxes; the store models it as `string[]` (`searchStore.ts:67`) and `toggleFilter` (searchStore.ts:153) happily accumulates values.
- Failure scenario: user checks Indoor AND Outdoor AND Both simultaneously — allowed, no radio semantics. Functionally tolerable today (`_match_location` DB overlap + both-expansion, see 20260505000000 migration :286-287), but any future dev trusting `type: 'single'` (radio control, scalar URL param, scalar RPC arg) will mismatch the array store shape. Either enforce single-select in IntSidebar or change the declaration to `'multiple'` + fix CLAUDE.md (stakeholder-sensitive file — flag, don't just edit).

### F3 (LOW, dead config) — unused exports & never-consumed grade `groups` block in filterDefinitions
- `src/utils/filterDefinitions.ts:67-72` — `gradeLevels.groups` (early-childhood / lower-elementary / upper-elementary / middle) has zero consumers anywhere in `src/`; the grade-group quick-select was never built in the internal UI.
- `filterDefinitions.ts:289` `FILTER_KEYS`, `:292` `TOTAL_FILTER_CATEGORIES`, `:295` `METADATA_KEYS` — no imports anywhere outside the defining file (urlParams builds its own `ARRAY_FILTER_KEYS` at `src/utils/urlParams.ts:50`).
- Not mentioned in the fp15 dead-code-sweep evidence file — appears novel, but re-verify against open PRs before deleting.
- Failure scenario: none at runtime; cost is misleading surface area in a stakeholder-sensitive file (a reader assumes grade groups are a live feature).

### F4 (LOW, dead code) — unreachable string branch in IntSidebar.activeCountFor
- `src/components/Internal/IntSidebar.tsx:36` — `if (typeof v === 'string') return v && key !== 'query' ? 1 : 0;` is unreachable for meaningful keys: every non-query `SearchFilters` field is `string[]` (`src/types/index.ts:45-57`), and the only string field (`query`) is filtered out by the caller at :41 anyway, making the inner `key !== 'query'` doubly redundant. Harmless; trim during next touch.

### F5 (INFO, option render) — grade pills render option `value`, never `label`
- `src/components/Internal/IntSidebar.tsx:45` maps options to values only (`gradeOptions = gradeCfg.options.map((o) => o.value)`); `:70` renders `{grade}`. So the pill row shows `PK` / `K` / `1` … instead of `Pre-K` / `Kindergarten` / `1st Grade`.
- Likely intentional (compact pills), but it makes `label` a dead prop for gradeLevels in the public UI and there's no `title`/aria fallback carrying the long label. If vocab labels ever change (label-only edit in filterDefinitions), the pills silently won't reflect it.

### F6 (INFO, heritage tree, design-accepted) — parent/child checkbox states are visually independent of effective filtering
- `src/components/Internal/IntCulturalHeritageSection.tsx:43` — each node's checkbox reflects only its own slug in `filters.culturalHeritage`; per the component comment (:22-24) parent selection expands recursively server-side.
- Two visual-truth gaps: (a) selecting a parent ("Asian") leaves all children unchecked even though every child is effectively included in results; (b) selecting a child after its parent is redundant but the UI gives no cue (no indeterminate state, no disable). ~15-person internal tool + documented design decision → note only, no action urged.

## Checked and clean
- Stranded-slug hazards: URL hydration validates heritage slugs against the visible tree recursively (`src/utils/urlParams.ts:98`), and the store persist `partialize` excludes filters entirely (`searchStore.ts:191-198` — layout prefs only), so no un-uncheckable ghost selections can arrive via URL or localStorage.
- `IntFilterSection` a11y wiring is sound: body always rendered so `aria-controls` resolves, `hidden` toggles visibility (`IntFilterSection.tsx:45-49`).
- Mobile drawer wiring (`IntMobileFilterDrawer.tsx`) clean: headlessui Transition unmounts when closed; close button labeled; second IntSidebar instance only has independent open-section state (cosmetic).
- `IntMobileFilterButton` props all live (`IntToolbar.tsx:73-76`); aria-label includes count.
- `counts[key][opt.value] ?? 0` lookups type-safe via `FacetCounts` — count MATH out of scope here.
- Heritage indent-by-depth inline style and recursive render handle arbitrary depth; keys stable (`node.value`).
