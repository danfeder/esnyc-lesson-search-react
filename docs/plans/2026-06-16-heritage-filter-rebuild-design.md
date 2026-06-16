# Heritage Filter Rebuild — Design

**Status:** Locked 2026-06-16 (brainstorming walkthrough with the user; all sections approved)
**Track:** Metadata rebuild → PR 6 Stage 2 corpus re-tag → **heritage Option-B pivot** (filter-first)
**Owns:** PR C1 (this doc's primary deliverable). Informs PR C2 (data apply) heritage handling.
**Supersedes/amends:** PR-6 design doc §7 (filter UI partially IN-scope now), OQ7 (heritage storage = specific-only + recursive filter), OQ13 (PR map gains a filter-rebuild PR before apply).

---

## 1. Why this exists (the pivot, in one paragraph)

The Stage 2 re-tag ($121, banked in `full-run.fable.jsonl`) emits **specific-only / leaf-heavy** cultural heritage (e.g. Fattoush → `["Middle Eastern","Levantine","Lebanese"]`, not the redundant ancestor chain). A pre-build investigation (Session 12) PROD-verified that **applying that as-is would silently narrow the hierarchical Cultural Heritage filter**: the live `search_lessons` RPC expands a selected parent only **one tier** against a flat 6-row table, so today the filter only works because every lesson *also* stores its full ancestor chain (`["East Asian","Asian","Chinese"]`). Strip the chains under the unchanged RPC and parent selections collapse (measured: selecting **Asian drops 65 → 36 lessons, −45%**).

The user chose **Option B**: store specific-only heritage **and rebuild the live filter** to do **complete recursive expansion from one source of truth** — not Option A (keep storing full chains, never touch the filter). Build order is **filter-first**: ship + verify the recursive filter against *current* PROD data (it's backward-compatible — can only return more), *then* apply the specific-only data. The site is in an open-ended maintenance window (users told not to use it), so transient inconsistency is harmless and we go straight for the clean end-state.

## 2. Evidence base (current-state map + keystone verify, 2026-06-16)

Gathered by a read-only Understand workflow (4 parallel readers + adversarial keystone verify), supervisor-grounded against `cultural-heritage.vocab.json` and `IntCulturalHeritageSection.tsx`.

**Three live hierarchy sources disagree; a fourth is the proposed successor:**
- **S1 `src/utils/filterDefinitions.ts`** — what the UI renders/sends. 5 regions + 13 children (18 picks), kebab `value` + Title `label`, 2 visual tiers. **Omits African American, Indigenous, Indigenous-and-Diaspora entirely** (corpus freq 24/24/57). Mis-parents Ethiopian/Nigerian directly under "African".
- **S2 `src/utils/filterConstants.ts` `CULTURAL_HIERARCHY`** — **ORPHANED** (no live component imports it; verified). Title-Case, 3-tier. To be deleted.
- **S4 PROD `cultural_heritage_hierarchy` table** — the **only** hierarchy the running RPC consults. 6 rows, Title-Case, flat 1-tier. No `Americas`/`North American`/`Caribbean`/`Indigenous-and-Diaspora` parents; has phantom `German`/`Turkish` found nowhere else.
- **S3 `data/vocab/cultural-heritage.vocab.json`** — proposed **single source of truth**. 71 canonical nodes, **6 roots** (asian, americas, african, european, middle-eastern, **indigenous-and-diaspora**), 3–4 tiers, each node carries `key` (slug) + `label` (Title-Case) + `parent` (slug) + `filter_ui_tier` (`top`/`sub`/`internal`) + `frequency`, plus an `alias_map` mapping **both** Title-Case labels and slugs → canonical slug.

**vocab.json is the most complete/correct of the four.** Keystone LEFT-JOIN of all 61 live-used heritage labels against vocab.json canonical labels = **zero orphans** (every value currently stored on lessons exists in the SoT). Known gaps (flag, not blockers): `cuban`/`guyanese` carry a single parent (the Caribbean↔Latin-American dual-membership is deferred to a later filter-UI track per the Session-4 `guyanese:Both` ruling); phantom `German`/`Turkish` are absent (retag decides keep/drop). The "orthogonal" tradition labels are NOT actually orphan — vocab.json already gives them tree homes: `soul-food`/`black-culinary-history` under `african-american`, `three-sisters-traditions` under `indigenous`, `cajun-creole` under `indigenous-and-diaspora`.

**Live mechanism:** `search_lessons` matches heritage with the array-overlap operator `l.cultural_heritage && expanded_cultures`, where `expanded_cultures := expand_cultural_heritage(_alias_cultural_heritage(filter_cultures))`. `_alias_cultural_heritage` maps an incoming slug → `[slug, Title-Case label]`; `expand_cultural_heritage` is a **single non-recursive FOR loop** over the 6-row table (one tier, no grandchildren). The UI (`useLessonSearch.ts:110`) sends **kebab slugs as `string[]`, verbatim, with NO client-side expansion**; parent and child checkboxes are independent (selecting a parent does not auto-check children). All expansion is server-side.

**Storage:** mirrored in two places — `lessons.cultural_heritage` (`text[]`, canonical Title-Case labels) **and** `lessons.metadata->'culturalHeritage'` (JSONB); ~7/345 differ in array order only.

**Keystone verdict (both confirmed):**
- **Regression CONFIRMED** — specific-only storage under the current flat RPC breaks parent filters (Asian 65 → 36).
- **Backward-compat CONFIRMED** — a recursive-expansion rebuild sourced from vocab.json is a strict superset on current full-chain data (Asian 65 → 74; never fewer), so building the filter FIRST is safe and even heals today's under-matching.
- **Single most important caveat — SLUG vs LABEL form.** Storage is Title-Case **labels**; the UI sends **slugs**. A recursive rebuild that overlaps **slugs against label-stored data matches NOTHING**. The fix MUST resolve expansion to **labels** before the `&&` overlap (as today's alias step does). This is the biggest implementation footgun.

## 3. Locked design decisions

### 3.1 Single source of truth
`data/vocab/cultural-heritage.vocab.json` is authoritative. Both the DB hierarchy table and the UI options are **generated** from it as **committed, reviewable artifacts** (not build-time magic). The orphaned `CULTURAL_HIERARCHY` in `filterConstants.ts` is **deleted** (verify zero importers in CI first).

### 3.2 Expansion mechanism (DB-side, live recursive)
- Rebuild `cultural_heritage_hierarchy` as the **full vocab.json tree**: rows of `(key text PK, label text, parent_key text NULL REFERENCES self)` (~71 rows). Optionally carry `filter_ui_tier` for diagnostics; the UI does not depend on the table.
- Rewrite `expand_cultural_heritage` as a **`WITH RECURSIVE`** walk: given selected node keys, return the node **plus all transitive descendants**.
- **Resolve to labels for matching.** Expansion runs in slug-space (keys), then maps result keys → `label` via the table, and the existing `&&` overlap compares **labels** against the label-stored `cultural_heritage` column. Keep `_alias_cultural_heritage` (or fold its job in) so an incoming slug normalizes correctly.
- **Storage form is unchanged: Title-Case labels.** No bulk rewrite of stored values. The vocab.json `alias_map` is the slug↔label bridge.
- Backward-safe by the keystone proof; this PR (C1) ships and is verified against **current** (full-chain) PROD data before any data apply.

### 3.3 UI regeneration (~31 options, nested display)
- Generate the `culturalHeritage.options` for `filterDefinitions.ts` from vocab.json's `top` + `sub` tiers (~31 nodes); `internal` nodes are hidden but still match via expansion.
- This **adds the missing groups** (Indigenous and Diaspora, African American, Indigenous) and **fixes mis-parented nodes** (Ethiopian/Nigerian nest under East/West African).
- **Display = nested / indented tree** faithful to vocab.json depth (Americas › Latin American › Mexican). `IntCulturalHeritageSection.tsx` (currently 53 lines, hardcoded 2-level, non-recursive) is rewritten to **recurse over nested children** with depth-based indent styling. Facet counts + `toggleFilter` behavior preserved per node.
- Options carry the nested children shape; the `FilterConfig` type may need a recursive `children?: Option[]` (today children are leaf-only).

### 3.4 Sequencing & PR breakdown (filter-first; OQ13 amended)
- **PR C1 — heritage filter rebuild (this doc):** generator script + hierarchy-table migration + recursive `expand_cultural_heritage` + UI option regen + nested-component rewrite + delete orphaned `CULTURAL_HIERARCHY` + unit/E2E. **No lesson-data writes.** Verified on current PROD data (TEST then PROD read-only MCP).
- **PR C2 — data apply:** the full 12-field re-tag apply incl. **specific-only** heritage, the U-5/U-8/U-12 targeted fixes + heritage corrections, Who's-Who `content_text` repair, dual-write (`text[]` + JSONB), `pr6_retag_rollback` snapshot, embeddings regen.
- **PR D — 3b synonyms:** `search_synonyms` population (unchanged from OQ10/PR 3b plan).
- **PR E — cleanup:** drop `pr5a_heritage_rollback` + `pr5b_concepts_rollback` after the apply is PROD-verified.

### 3.5 Apply-time heritage handling (specified here, executed in C2)
- Heritage column stores **specific-only leaves** from the re-tag.
- Apply is **gated on a heritage correction/spot-check pass**: the 3 decided targeted fixes (U-5 Fattoush `1Dz-Jv4…` drop Israeli+Jordanian; U-8 Alternative Proteins drop Italian/European; U-12 Intro to Salad Project `1V2Xt4c…` drop Middle Eastern) **plus** correction of map-surfaced tagging errors — **candidates to VERIFY against `full-run.fable.jsonl` before acting:** Arroz con Gandules `055b000b…` spurious `South Asian`; two Salsa Toasts rows that would clear to `[]`.
- **Post-apply integrity assertion:** no African American / Indigenous lesson stores `North American` (U-1 identity anchor; satisfied structurally because vocab.json roots both under `indigenous-and-diaspora`, but assert anyway).

### 3.6 Testing
- **Unit:** recursive expansion (parent → all transitive descendants, incl. tradition leaves like Soul Food under African American); slug↔label bridge (selecting slug matches label-stored data); generator output == vocab.json (no drift).
- **E2E (TDD, added BEFORE the RPC swap):** select a top region → returns lessons tagged with only a deep descendant; select a newly-added group (African American) → returns its lessons; nested checkboxes render + toggle.
- RLS unchanged (read path only). Run `npm run test:rls` after the migration regardless.

## 4. Design notes for the implementation plan (not yet code)

- **Generator:** one script (e.g. `scripts/heritage/generate-heritage-hierarchy.ts`) reads `data/vocab/cultural-heritage.vocab.json` and emits (a) a committed TS artifact (e.g. `src/utils/heritageHierarchy.generated.ts`) with the nested options tree consumed by `filterDefinitions.ts`, and (b) the SQL seed rows for the migration. A unit test re-runs the generator and asserts the committed artifact is byte-identical (drift guard).
- **Migration** (`database-migrations` skill MANDATORY; date prefix must sort after the latest — currently floor `20260613000000_…`): recreate `cultural_heritage_hierarchy` with the new `(key,label,parent_key)` shape + reseed; rewrite `expand_cultural_heritage` recursive in the same migration (its only consumer). Confirm no other DB object references the old table columns (grep migrations + `pg_get_functiondef` scan) before recreating. Idempotent (`CREATE OR REPLACE`, `DROP … IF EXISTS`).
- **search_lessons** itself likely needs no change if `expand_cultural_heritage`'s signature is preserved (still takes/returns the label set used by the `&&` overlap). Confirm the alias step still feeds it correctly.
- **Verification (C1):** before/after counts for a spread of parent selections against current PROD data must be **same-or-greater** for every parent (never fewer) — that's the backward-compat contract. Capture the count table as the apply-gate evidence.

## 5. Out of scope (unchanged from PR-6 §7 unless noted)

- Caribbean↔Latin-American **dual-parent** membership for `cuban`/`guyanese` (deferred to a later filter-UI track; single-parent stands).
- Any heritage **vocab content** change (the §16 table is locked; this track only mechanizes it).
- Resend email, dedup track (Seed Bursts), Phase-2 reviewer UX, the ~8 smaller-field Stage 1 worksheets.
- Visual redesign beyond the nested-tree rendering needed to display the chosen option set.

## 6. Cross-references

- Pivot decision + load-bearing orientation: PR-6 execution status, top "DIRECTION PIVOT" block + Session-12 log.
- PR-6 design doc (amended §7/OQ7/OQ13): `2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md`.
- Vocab SoT: `data/vocab/cultural-heritage.vocab.json` (provenance: §16 heritage worksheet `2026-05-10-…`).
- Re-tag sole-source run: `scripts/stage2-retag/artifacts/full-run.fable.jsonl`.
- Register adjudication + the 13 user verdicts (U-1..U-13): `scripts/stage2-retag/artifacts/register-adjudication.md`.
