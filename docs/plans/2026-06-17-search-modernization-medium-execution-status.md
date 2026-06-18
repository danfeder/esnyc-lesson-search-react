# Search Modernization (Medium Package) Execution Status

**Last updated:** 2026-06-18 by Session 6 (S0 + S1 both MERGED to `main`; S1 PR-cycle archival done; **S2 cycle starting** — G3 SEL field indexing) on `main` (S2 branch not yet cut)

## Current State

**S0 + S1 are BOTH MERGED to `main`.** PR #511 (S0 eval harness) → squash `69c68e4`; PR #512 (S1 G2 frontend) → squash `05581d8` (merged 2026-06-18 21:08Z, current `main` HEAD). Two-thirds of the track's substantive work is shipped. We are on `main`, in sync with `origin/main`, **clean baseline** (type-check ✅ + lint ✅, verified Session 6 start). S1's full session detail (Sessions 4–5) + S1 recent-decisions are in the **archive doc**. Remote branch `feat/search-g2-frontend` was not auto-deleted on merge (harmless; prune any time).

**NOW: S2 — G3 typed-field indexing.** This is **the first migration PR of the track** — discipline ramps up (migration file + CI gate + PROD approval). Branch: **`feat/search-g3-index`** (cut fresh from `main`; NOT yet cut as of this checkpoint). Sub-skill: **`database-migrations` — invoke BEFORE creating the migration file.**

**S2.1 (the migration) — what ships:** ONE migration `supabase/migrations/<date>_search_vector_add_sel.sql` that:
1. `CREATE OR REPLACE update_lesson_search_vector()` adding `array_to_string(NEW.social_emotional_learning, ' ')` into the **existing C-weight `to_tsvector(...)` block** (peer of thematic/heritage/concepts) — clone the structure of `supabase/migrations/20260521000000_search_vector_with_concepts.sql` (function body ~lines 77-121).
2. Recreate the trigger adding `social_emotional_learning` to its `UPDATE OF` list (currently `…content_text, metadata` — SEL absent, so re-tag writes never re-fire the trigger for SEL).
3. **Backfill ALL rows** via `UPDATE public.lessons SET metadata = metadata` — MANDATORY: `max(updated_at)` is 2026-04-27, *before* the June re-tag, so a delta backfill misses everything.
4. Rollback block in comments (recreate the prior function + trigger + re-backfill).
Verify date-prefix sorts AFTER the latest (`ls supabase/migrations | sort | tail -3` → currently `20260617000000_pr6c2_retag_apply.sql` is newest; use a date-prefix that sorts after it, watch the digits-<-underscore gotcha).

**S2.1 local verify:** `supabase db reset` + `npm run test:rls` clean; idempotent re-apply (CREATE OR REPLACE + idempotent trigger recreate).

**S2.2 gate + TEST verify:** **GATE-2 Codex** adversarial review of the SQL (idempotency / trigger recreate / backfill scope / grants / rollback) BEFORE push → triage + fix-up → per-PR ritual (pre-push Claude reviewer ∥ GATE-3 Codex) → push + PR → CI applies to TEST → `mcp__supabase-test__execute_sql` VERBATIM verify (a known SEL-only lesson now matches its SEL value in `search_vector`; row-count sanity) → **re-run `eval:search` on TEST** (must show lift on *discriminating* SEL queries; no regression).

**S2.3 (conditional):** core_competencies / academic_integration added ONLY if the S2.2 scorecard shows lift. **Default = EXCLUDE both** (CC is 788/788 = effectively a ranking stopword; AI subjects "Science"=515/"Literacy"=433 already saturate bodies). Document the decision from the scorecard.

**G3 is scored by rank MOVEMENT, not top-10 presence** (design §4, LOCKED). Measurement set = lessons carrying the SEL tag but with ZERO lexical mention of the phrase in title/summary/body (the only lessons that move solely because the typed array got indexed): **isolation sets (TEST, retired-excluded): RDM=29, Self-management=42, Social Justice=25.** Metrics: `isolationHits@50`, first-isolation rank/MRR, median/best rank movement baseline→after. G3 eval queries MUST use *discriminating* SEL values (e.g. "responsible decision-making", NOT "science", or the scorecard falsely flat-lines). These tags are human-audited before being treated as relevance truth.

**Substrate facts (TEST, from the S0 baseline — RE-CONFIRM at S2 TEST verify since the June re-tag PR #510 may shift counts):** corpus = **766 total / 745 searchable** (`retired_at IS NULL`). `social_emotional_learning` is a `text[]` column on `lessons`; design §6 cites **729 rows populated**. `search_lessons(search_query text, +13 filter args DEFAULT NULL, page_size, page_offset)` returns 10 cols incl. `rank double precision, total_count bigint`. anon can call the RPC. Search is LIVE + healthy on PROD; public engine = `search_lessons` RPC; concepts ARE indexed (`update_lesson_search_vector` trigger). S1's frontend G2 fix shipped via Netlify (no DB gate). S2 is the first DB-schema change of this track.

## Recent decisions worth carrying forward

- **Eval harness gates everything** (S0 on main); baseline captured on TEST; G2 scored on the NORMALIZED `parseSearchQuery` call; G3 scored by rank-movement of isolation sets (NOT top-10 recall). `baseline.json` is the frozen S0 reference — re-run `eval:search` for deltas but do NOT `--write-baseline` unless deliberately re-freezing.
- **G3 per-field by measured value** — ship SEL (distinctive values like "Self-management"); add core_competencies / academic_integration ONLY if the S2.2 scorecard shows lift. Clone migration `20260521000000`; backfill ALL rows (`UPDATE … SET metadata = metadata`).
- **Synonyms (S3, conditional/most-deferrable):** small (~12–18) single-token `oneway` everyday→official, hard-filtered, eval-gated; bulk 5,163-pair load RETIRED (wrong mechanism). Rollback = exact-tuple `DELETE` (no tag/source column on `search_synonyms`).
- **Gold set FROZEN + product-owner-confirmed** (on main in `queries.json`) — do NOT edit gold values without re-verifying + re-confirming with the product owner. (Full freeze provenance in archive.)
- **Cross-family GATE-3 Codex earns its keep on EVERY search PR cycle** (S0×2 + S1×1 confirmed; promoted to [[feedback_pr_bot_review_workflow]]). Keep it in every search-PR pre-push ritual alongside the Claude reviewer. **Migration PRs also require GATE-2 Codex** (pre-TEST SQL review) — S2 is the first to use it.
- **G2 fix = frontend** (`parseSearchQuery.ts`, SHIPPED in S1); the deeper server-side OR→AND is DEFERRED + documented (design §9) to return to (user decision 2026-06-17).

## Out-of-scope follow-ups captured here

- Deeper G2 (server-side OR→AND term combination) — DEFERRED, documented (design §9). The explicit "come back later" item.
- **Expose `detectedGrades`/`autoGrades` from the `useLessonSearch` return shape** (S1 round-1 bot suggestion, deliberately NOT done): would let `IntActivePills` consume the hook's already-computed values instead of independently re-calling `parseSearchQuery`. Rejected for S1 (two calls to the SAME pure function, guarded identically — cannot diverge; cross-ref comment makes the coupling explicit). Revisit only if grade-routing grows stateful/asymmetric.
- Full semantic/hybrid ("Heavy") search + embedding regen; embedding-pipeline bugs (`{content}`/`{text}` mismatch; stale recipe fields) — fix before any regen.
- **Dead-code retirement rides PR-E** (NEW addition to PR-E's E1/E2/E3 scope): `DROP FUNCTION generate_lesson_search_vector(10-arg)` + revoke grants + `supabase functions delete search-lessons` (TEST+PROD; deployed ACTIVE v22). **Gated after C2 AND S2 PROD-verified** (so the trigger provably no longer references the dead twin). Follow the edge-fn deletion ordering hazard note in memory (drain queued deploy runs pre-dating the retirement merge).
- Prune remote `feat/search-g2-frontend` (merged, not auto-deleted).

## Pointers to durable context

- Kickoff prompt: `2026-06-17-search-modernization-medium-kickoff.md`
- Design doc: `2026-06-17-search-modernization-medium-design.md` (LOCKED decisions; read every session — S2 = §6 + §7)
- Implementation plan: `2026-06-17-search-modernization-medium-implementation.md` (S2 = lines 107-124)
- **Archive (S0 + S1 cycles; sessions 0–5):** `2026-06-17-search-modernization-medium-execution-status-archive.md`
- G3 migration template: `supabase/migrations/20260521000000_search_vector_with_concepts.sql`; synonym idempotency precedent: `20260522000000_seed_search_synonyms_from_smart_search.sql`
- Investigation + plan provenance: memory `project_search_modernization.md`; runs `wf_fb08aeb5-3e4` + `wf_6156054d-320`; Codex `019ed86a` + `019ed885`.

## Recent session log

### Session 6 — 2026-06-18 — S0+S1 archival/bookkeeping; S2 cycle started

Branch: `main` (S2 branch not yet cut at time of this checkpoint).

Major events:
- **Orientation divergence caught:** prior header said PR #512 "awaiting user merge," but git reality = PR #512 already **MERGED** (`05581d8`, 21:08Z). Trusted git per the kickoff. Confirmed via `gh pr view 512` (state=MERGED). Clean type-check + lint baseline on `main`.
- **PR-cycle archival of S1** (supervisor bookkeeping): moved S1 recent-decisions + Sessions 4–5 logs to the archive doc; rewrote this Current State for S2.
- **Promoted learning:** strengthened [[feedback_pr_bot_review_workflow]] cross-family GATE-3 entry — now confirmed across THREE search-PR cycles (S0×2 + S1×1, with S1's 2 medium Codex findings the Claude reviewer rated clean).

NEXT: cut `feat/search-g3-index` from `main` → invoke `database-migrations` → author the SEL migration (S2.1) → local `db reset` + `test:rls` → GATE-2 Codex → per-PR ritual → TEST verify + `eval:search` delta.

> Earlier sessions (0–5, the full S0 + S1 build cycles) are archived in `…-execution-status-archive.md`.
