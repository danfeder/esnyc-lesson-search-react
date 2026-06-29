# Wave 6 — Search Depth (C41 AND-of-ORs + C42 scope-spike) — Design Document

**Date:** 2026-06-29
**Status:** Locked — ready for implementation planning
**Related:** `docs/plans/2026-06-20-deferred-work-roadmap.md` (§Wave 6, C41/C42/C43/C162), `docs/plans/2026-06-20-theme-b-public-ux-design.md` (§9 — names C41 "AND-of-OR semantics" as out-of-scope-then), `docs/plans/2026-06-21-deferred-campaign-status.md` (W6 row). Auto-memory: `project_search_modernization`, `feedback_data_safety_top_priority`, `reference_ci_flakes`, `reference_database_pipeline`.

---

## 1. Why this exists

The public lesson search is too loose for multi-word queries. When a user types several words — the canonical example is **"food waste decay"** — the search treats it as "match **any** of these words **or any of their synonyms**." The `expand_search_with_synonyms` SQL function literally flattens every token and every synonym into one flat OR string (`food | foods | waste | decay | decomposition | …`) and feeds it to `to_tsquery`. So a lesson about *food* with nothing about waste or decay still matches, and because broad tokens like "food" appear in a large fraction of the corpus, those loose matches **flood out** the lessons that actually cover all the ideas the user typed.

This is not hypothetical. The frozen search-eval scorecard records `food waste` returning **568 results with only 2 of the top 10 being correct** (`scripts/search-eval/scorecards/test.md:67`). The precision collapse on multi-meaningful-term queries is the exact failure this initiative closes.

This is **C41** — "deeper G2 server-side OR→AND term combination." It is explicitly the deferred *server* half of an already-shipped change: the frontend half (S1, `src/utils/parseSearchQuery.ts`) already cleans the query string and routes grade cues out of free-text, but it never touched term combination. The project's own search design already names the fix: `docs/plans/2026-06-20-theme-b-public-ux-design.md:216` ("search AND-of-OR semantics (§4.6 / C41)") and the decay-seed migration header (`supabase/migrations/20260618120000_seed_search_synonym_decay_decomposition.sql:25-26`, "the multi-word 'food' flood is the deferred **server-side OR→AND** work, not a synonym fix"). We are completing a planned change, not inventing a scheme.

The initiative also **scopes** (does not build) **C42**, the "heavy" semantic/embedding search tier, because everyday-vocabulary queries that don't match FTS tokens still return nothing today — but C42 has real, unmet prerequisites (below) that make it a separate, larger decision. We produce a go/no-go spike instead of committing to it blind.

## 2. Goals & constraints

1. **Cut the multi-term flood without cratering recall.** Require a lesson to match *each distinct user term* (synonyms still OR'd within a term's group), while keeping enough recall that strong-but-incomplete matches still surface. The bar is **measurable**: on the eval harness, the new multi-term precision probes improve markedly *and* the frozen recall/precision/dup-flood/sentinel families show **zero regression**.
2. **Single-term behavior is untouched.** Controls like `compost`, `garden`, `apple`, `tomato` must return identical results (a single term has one group → just `(term | synonyms)`, same as today).
3. **Smallest safe blast radius — but scoped honestly.** The change is isolated to the **search SQL layer** (the `expand_search_with_synonyms` helper + `search_lessons`'s internal FTS references). The public `search_lessons` RPC's **external signature** (args + return table) does not change → **no frontend change, no PGRST202 stale-client split-deploy window**. It is *not*, however, a one-line body edit: the default mechanism changes the helper's **return type** (`text` → `tsquery`), which requires `DROP FUNCTION … ; CREATE FUNCTION …` (not `CREATE OR REPLACE`), re-`GRANT`s on both functions, `NOTIFY pgrst, 'reload schema'`, and a `supabase gen types` regen of `src/types/database.types.ts`. Full migration discipline applies — it is a return-type change + RPC redefinition on the live public search path.
4. **Evidence before shipping.** The eval harness (`npm run eval:search`) is the gate: commit a before/after scorecard diff; do not merge C41 on a hunch.
5. **C42 gets a decision, not a build.** A written go/no-go that honestly costs the semantic tier (C07 mismatch, C01 regen, query-time embedding, fusion ranking, index upgrade).

## 3. The chosen shape: **Strict AND-of-ORs, built with tsquery algebra, eval-gated**

Rewrite `expand_search_with_synonyms` so that, instead of one flat OR, it produces a query that is an **AND across distinct user terms, OR within each term's synonym group**:

```
"food waste decay"  →  (food | foods) & (waste) & (decay | decomposition)
```

Crucially — per the Codex design review — **do not build this by string-concatenation** (`string_agg(..., ' & ')`). Build it with PostgreSQL's tsquery *operators*:

- build each lexeme with **`plainto_tsquery('english', token)`** — **not** `to_tsquery` (GATE-A F1). `plainto_tsquery` treats its input as plain text and *ignores* tsquery operators, so a synonym value containing `& | ! : * ( )` cannot inject or mis-parse. Each piece here is a single token (user terms are operator-stripped and split; synonyms are single-token by the no-whitespace constraint), so `plainto_tsquery` yields a single lexeme (or an empty tsquery for a stop-word token);
- for each distinct source term, build a group `tsquery` = `plainto_tsquery(token) || plainto_tsquery(syn₁) || …` (the `||` operator OR-combines tsqueries);
- use **`numnode()`** to detect and drop any group whose lexemes all normalized away (e.g. a term that is entirely English stop words → `numnode = 0`);
- AND the surviving group tsqueries together with the `&&` operator;
- if **no** group survives (empty / all-stop-word input after sanitization), return `NULL`/empty so the RPC's FTS predicate is short-circuited (see §4) — never emit an empty `()` that errors `to_tsquery`.

Building via the tsquery algebra (`plainto_tsquery` + `||` + `&&` + `numnode`), not string concatenation, is strictly safer: it makes stop-word-only groups detectable (`numnode`), **eliminates the tsquery-injection / syntax risk** from synonym values (the no-whitespace constraint does *not* forbid `& | ! ( ) : * < >` — `supabase/migrations/20260522000000_seed_search_synonyms_from_smart_search.sql:93-98` — but `plainto_tsquery` neutralizes them), and gets operator precedence right by construction (`&` binds tighter than `|`, so grouping must be explicit; the operator build is parenthesized by definition).

**Recall cushion + escalation path.** The search RPC keeps its existing pg_trgm fuzzy fallback (`l.title % q OR l.summary % q`), which surfaces strong-but-incomplete matches on the whole phrase and is itself strict enough not to re-create the flood. If — *and only if* — the eval scorecard shows an unacceptable recall cliff from strict AND, we escalate to a **two-pass relax** (try AND; if `< K` results, re-run as the old loose OR) as a *targeted, evidence-backed* follow-up PR. We do **not** build the two-pass relax speculatively.

### Why this shape over the alternatives

| Option | Why rejected |
|---|---|
| **Quorum / ranking** (keep loose OR; rank docs higher the more distinct terms they hit) | Only *reorders* the broad OR result set. The flood and the inflated `total_count` (computed from the same broad WHERE, `…search_rpc.sql:211-219`) both remain — `food waste` would still report 568 results, just shuffled. Also needs per-term match-counting woven into the RPC scoring SQL: more invasive, harder to tune. Both model families rejected it. |
| **Two-pass relax, built upfront** (strict AND; auto re-run as OR if `< K` results) | Adds threshold semantics, double-query cost, and pagination/`total_count` ambiguity from day one — before any evidence says recall actually craters. Correct as an *eval-triggered fallback*, wrong as the default. Held in reserve, not built. |
| **String-concatenated AND** (`string_agg(…, ' & ')` instead of tsquery algebra) | Same strategy, unsafe mechanism: raw synonym values can carry tsquery metacharacters (syntax errors / injection), stop-word-only groups collapse to broken empty `()`, and operator precedence bugs are easy. The algebra build dodges all three. |
| **Frontend / app-layer term combination** | The term combination must happen where the tsquery is built and matched (the DB). The S1 frontend (`parseSearchQuery.ts`) already did the app-layer half (filler-strip, grade routing); C41 is definitionally the untouched server half. |

Both Claude and Codex (gpt-5.5) independently recommended this shape (strict AND, eval-gated, two-pass as a measured fallback); Codex contributed the tsquery-algebra + `numnode()` implementation refinement, folded above. A subsequent **GATE-A** Codex review of this design doc folded five accuracy/safety findings (F1 `plainto_tsquery` not `to_tsquery` for injection safety; F2 the empty-tsquery RPC guard; F3 honest two-function DROP+CREATE scope; F4 types-regen; F5 C42 provenance framed as a risk-to-verify) — all reflected in §§2–7.

## 4. Section 1 — The C41 term-combination change (SQL)

**Target function (live definition):** `expand_search_with_synonyms` at `supabase/migrations/20260620000000_search_lessons_w1b.sql:59-120`. The flat-OR join is line ~116: `SELECT string_agg(DISTINCT unnest, ' | ') INTO final_query FROM unnest(expanded_words);`. User input has its tsquery operators stripped at :75-85; synonym values are appended raw at :100-110.

**Consumer (live definition):** `search_lessons` at `supabase/migrations/20260622010000_wave4_pr2_delete_ghosts_search_rpc.sql` (CREATE near :159). It calls the expander once (`expanded_query := expand_search_with_synonyms(search_query)`, ~:199) and uses the result in three places: the count WHERE (`to_tsquery('english', expanded_query)`, ~:216), the results WHERE (~:303), and the rank expression `GREATEST(ts_rank(search_vector, to_tsquery('english', expanded_query)), similarity(title,q), similarity(summary,q)*0.8)` (~:289-297). The pg_trgm fuzzy fallback is OR'd into both WHEREs (`… OR l.title % search_query OR l.summary % search_query`, :215-219 / :302-306).

**Return-type decision (LOCKED, with a named fallback resolved by a pre-flight grep):**
- **Default (preferred): the function returns a real `tsquery`.** `search_lessons` is updated to consume it directly — the three `to_tsquery('english', expanded_query)` sites become the passed `expanded_tsquery` value. This avoids re-parsing/re-stemming a stringified tsquery, and since both functions are redefined in the same migration and the RPC's *external* signature is unchanged, there is still no frontend change. Changing a function's return type requires `DROP FUNCTION` + `CREATE` (not `CREATE OR REPLACE`).
- **Fallback (only if a hidden caller exists): keep the `text` return.** Build the tsquery via algebra internally and return `query::text`; `search_lessons` is left untouched (its `to_tsquery('english', expanded_query)` re-parses the valid tsquery text). Chosen only if the impl-plan pre-flight grep finds a caller of `expand_search_with_synonyms` other than `search_lessons` that would break on a return-type change.
- The impl plan settles which path via a mandatory `grep -rn 'expand_search_with_synonyms'` over `supabase/` (and any edge functions) before authoring the migration.

**Edge cases the migration must handle (all from the Codex review):**
- **Stop-word-only group** (e.g. a term that is entirely English stop words): detect with `numnode(group) = 0`, skip the group. If *all* groups vanish, the expander returns `NULL`/empty (do not emit `()`).
- **Empty-tsquery RPC guard (GATE-A F2).** `search_lessons`'s only browse short-circuit today is the **raw-text** check `search_query IS NULL OR search_query = ''` (at ~:215 and ~:302) — it will **not** catch a *non-empty* `search_query` (e.g. `"the of and"`) that resolves to an empty/NULL tsquery. So the FTS predicate must be guarded: `(expanded_tsquery IS NOT NULL AND numnode(expanded_tsquery) > 0 AND l.search_vector @@ expanded_tsquery)`. This preserves today's behavior exactly (a stop-word-only query already matches nothing via FTS and lets the trigram fallback carry) while avoiding an error on the empty tsquery. This guard is *why* `search_lessons` is redefined under the default path (not just the expander).
- **Single-term / browse:** single-term input stays effectively `(term | synonyms)` — identical to today. Raw `NULL`/`''` continues to browse via the existing raw-text guard.
- **Multi-word / phrase synonyms:** not a concern. The synonym table forbids whitespace in values (`20260522000000_…:13-23,93-98`), so every synonym is single-token; `decay → decomposition` is safe (`20260618120000_…:42-53`). If phrase synonyms are ever wanted, they need explicit phrase semantics (`<->` / `phraseto_tsquery`) — out of scope here.
- **Trigram fallback interaction:** the OR'd `title % q / summary % q` path admits rows independent of the AND'd tsquery. Keep it as the recall cushion for the first eval-gated pass. If the scorecard shows fuzzy-only rows out-ranking real AND matches, address it as a *ranking* tweak (sort strict-FTS hits ahead of fuzzy-only) — not by removing the cushion. Decide from the data, not upfront.

**Migration mechanics:** new migration in `supabase/migrations/`, date prefix verified to sort after the latest active migration (`ls supabase/migrations | sort | tail -3` at build time — the latest touching `search_lessons` is `20260622010000_*`; later `20260625…`/`20260626…` migrations don't touch it; a `20260629…` prefix sorts after all). Under the **default (tsquery) path** the migration must, in order: `DROP FUNCTION expand_search_with_synonyms(text)` then `CREATE FUNCTION … RETURNS tsquery` (return-type change forbids `CREATE OR REPLACE`); redefine `search_lessons` (the three `to_tsquery('english', expanded_query)` sites → the passed `expanded_tsquery`, plus the F2 empty-tsquery guard); **re-`GRANT EXECUTE`** on both functions to the same roles as before; `NOTIFY pgrst, 'reload schema'`; and regenerate `src/types/database.types.ts` (GATE-A F4 — the generated `expand_search_with_synonyms.Returns` at ~:1606-1609 will otherwise drift from `string`). Under the **fallback (text) path**, `CREATE OR REPLACE FUNCTION` the expander only and leave `search_lessons` untouched. The impl plan settles which path via the caller-grep above.

## 5. Section 2 — Eval measurement & gold-set additions

The instrument already exists and is solid: `scripts/search-eval/` (run `npm run eval:search`), gold set `scripts/search-eval/queries.json` (frozen, product-owner-confirmed; provenance in `gold-provenance.md`), metrics `scripts/search-eval/metrics.ts` (recall@10, precision@10, MRR, cluster-aware dup-flood, maxTotalCount guards, sentinel Jaccard stability, G3 rank-movement vs `baseline.json`), entry `scripts/search-eval/run-search-eval.ts`, scorecards `scripts/search-eval/scorecards/<target>.md`, read-only enforced (`readonly-guard.ts`, anon key only). It imports the app's real `src/utils/parseSearchQuery.ts`, so it scores the true normalized call. The decay→decomposition change was proven with it (recall@10 0.642→0.728, MRR 0.846→0.923, zero regression).

**Gold-set additions for C41 (per Codex; exact predicates to be confirmed with the product owner in the impl plan, then added with documented provenance):**
- **3-term AND precision probes** — `food waste decay`, `food scraps decomposition`, `worm compost food waste` — with **maxTotalCount guards** (the actual failure shape; today's gold has `food waste` but not enough synonym-plus-conjunction coverage).
- **Synonym + AND typo probes** — `decay food waste`, `decompasition food waste` — to confirm the proven decay lift survives while broad tokens stop flooding.
- **Stop-word / connector probes** — one "meaningful terms with a stop-word in the middle" case and one no-crash stop-word-heavy case such as `lesson about the garden` (must not collapse to an empty tsquery).
- **Keep single-term controls unchanged** — `compost`, `garden`, `tomato`, `apple` are already represented and must not move.

These additions land in **PR A** so the *before* baseline (showing the flood) is captured prior to the C41 change; PR B's scorecard shows the *after*. Because `npm run eval:search` is a manual/TEST-DB tool (not a blocking CI gate — it needs a live DB + anon key), the new probes reading "red" in PR A's baseline is the *intended* documentation of the problem, not a CI failure.

## 6. Section 3 — C42 scope-spike (go/no-go deliverable)

Ships as a written design/decision doc (`docs/plans/2026-06-29-c42-semantic-tier-spike.md` or a clearly-named successor), **no code**. It must honestly cost the heavy tier and recommend go/no-go (and if go, the prerequisite ordering). Findings to anchor it (from the code survey):

- **No embedding integration on the public path today.** `content_embedding vector(1536)` exists on `lessons`/`lesson_submissions`/`lesson_archive` (`supabase/migrations/20251001_production_baseline_snapshot.sql:1648/1732/1787`), pgvector is installed (:48), and `find_similar_lessons_by_embedding` (:236-260) exists — but it is wired **only** to the dedup/submission-review pipeline, never to public `search_lessons`. Indexes are ivfflat (`:2550`, `:2694`), not HNSW.
- **C07 vector-space mismatch (real prerequisite — verify in the spike, GATE-A F5).** The embedding pipeline *may* be mixed-provenance: an OpenAI `text-embedding-3-small` writer is live (`scripts/generate-embeddings.mjs`, `process-submission/index.ts`), and a Gemini `gemini-embedding-001` path exists but is **archived** (`scripts/archive/`). If `lessons` vs `lesson_submissions` embeddings sit in different spaces, cross-table cosine is meaningless even at equal dimension. This is a **code-path observation, not a verified live-DB fact** — the spike must query the live DB (provenance / norms / sample cosine sanity) to confirm before costing a fix. Roadmap C07 (`…roadmap.md:202`, effort L) routes the fix through the dedup rework (C09).
- **C01 full-corpus regen (real prerequisite).** Never started, gated on "fix embedding-pipeline bugs first" (`…roadmap.md:161`). Current lesson embeddings predate the June metadata re-tag and mix provenance.
- **What C42 needs that doesn't exist:** (a) one consistent embedding space for the searchable `lessons` corpus; (b) a query-time embedding call in the search path; (c) a hybrid fusion ranker (RRF or weighted blend of FTS rank + cosine) — the RPC has no vector term today; (d) likely ivfflat→HNSW for query-time quality; (e) the "everyday-vocabulary" seed material (roadmap C43, `:145`, preserved the rejected single-token synonym pairs precisely as C42 seed data).

The spike's job is to turn this into an effort estimate + a recommended prerequisite sequence (C07 → C01 → query-time-embed + fusion + index) and a clear go/no-go for a future wave.

## 7. Section 4 — Migration / shipping strategy

| PR | Title | Contains | Notes |
|---|---|---|---|
| A | **Search-eval probes for multi-term precision** | Add the C41 gold probes + maxTotalCount guards to `queries.json` (+ provenance); capture the *before* baseline scorecard | Additive, no behavior change. Establishes the measurable "before". |
| B | **C41 — AND-of-ORs term combination** | New migration redefining `expand_search_with_synonyms` (tsquery algebra) (+ `search_lessons` under the default return-tsquery path); commit before/after eval scorecard diff | The one behavior change. Full migration discipline + GATE 2. Gated on no-regression. |
| C | **C42 semantic-tier scope-spike** | The go/no-go doc only | No code. |
| (D) | *(contingent)* two-pass relax | Only if PR B's scorecard shows an unacceptable recall cliff | Not pre-built; evidence-triggered. |

### Gap risk between PRs
None dangerous. PR A only adds measurement (the new probes read "red" against current behavior by design — that's the captured baseline, and the eval is not a blocking CI gate). PR B is the isolated behavior change. PR C is docs. No partially-shipped state is unsafe; PRs A→B→C are independently revertable.

### TEST DB rehearsal
- **PR A:** no schema change. Run `npm run eval:search` (target=test) to capture the before-scorecard; commit it.
- **PR B:** schema change (function redefinition). Local `supabase db reset` + `npm run test:rls` (must stay clean — no RLS change). After CI applies the migration to TEST, run `npm run eval:search` against TEST and commit the after-scorecard; confirm no-regression on the frozen families + the multi-term precision gain. Then verify the live function on TEST via `mcp__supabase-test__execute_sql` (call `search_lessons` with `food waste decay`, assert `total_count` collapsed and the expander output is the grouped form). After PROD apply, re-verify via `mcp__supabase-remote__execute_sql` (read-only).
- **PR C:** docs only — no rehearsal.

### Rollback paths
- **PR A:** revert the `queries.json` additions (git).
- **PR B:** forward-rollback migration ready before merge; idempotent. Under the default (tsquery) path it must mirror the forward mechanics in reverse: `DROP FUNCTION expand_search_with_synonyms(tsquery-returning)` then `CREATE` the prior `text`-returning body, restore the prior `search_lessons`, re-`GRANT` both, `NOTIFY pgrst, 'reload schema'`, and regen types. The prior definitions are preserved verbatim in `20260620000000_…` / `20260622010000_…` for the restore.
- **PR C:** git revert; no data side effects.

### Per-PR ritual
Per the kickoff's PER-PR RITUAL + the cited feedback memories: pre-push reviewer-agent dispatch **+ GATE 3 Codex** on the diff → baseline checks → push + `gh pr create` → wait for external bots → four-surface triage → rebuttal-pass every finding (**GATE 4 Codex** on any real suggested change) → consolidated fix-ups → per-round TEST-DB re-verify (PR B only) → round-cap after 2. **GATE 2 Codex** on the PR B migration SQL before TEST apply.

### Known issues / pre-existing flakes
Per `reference_ci_flakes`: the PROD migrate workflow has a SASL apply/verify flake → MCP PROD verification is the source of truth, not CI's own verify step. The C41 migration is a *function-body* change with an unchanged RPC signature, so the additive-RPC split-deploy hazard does **not** apply (no PGRST202 window).

## 8. Section 5 — Testing strategy

### Search-eval (primary behavioral gate)
- `npm run eval:search` before/after PR B; commit the scorecard diff. Require: multi-term precision probes improve, `food waste`-class `total_count` collapses under its maxTotalCount guard, and **zero regression** on frozen-recall / precision / dup-flood / sentinel-stability / G3 rank-movement families.

### Unit / SQL-level
- There is no pgTAP test of `search_lessons` today (search is validated via the eval harness + mocked-rpc integration tests). The impl plan decides whether to add a small SQL-level assertion of `expand_search_with_synonyms` output for representative inputs (grouped form for multi-term; single-term unchanged; stop-word-only group dropped) — likely as a lightweight test script or an eval assertion, not new pgTAP infra.
- `src/utils/parseSearchQuery.test.ts` (the S1 frontend half) must stay green unchanged — C41 does not touch it.

### Integration
- `src/hooks/useLessonSearch.wiring.test.tsx` (asserts RPC params via `rpcMock`) and `src/__tests__/integration/lesson-search.*.test.tsx` must stay green unchanged — the RPC signature and the frontend call are unchanged.

### E2E
- `e2e/search.spec.ts` must stay green unchanged. (Optionally add one Playwright assertion that a multi-term query returns a tighter result set, if cheap.)

### RLS
- No RLS changes. `npm run test:rls` must pass unchanged.

### Manual smoke checklist (per `superpowers:verification-before-completion`)
- On the PR B deploy preview (TEST DB): search `food waste decay` → results are tightly on-topic and far fewer than before; search `compost` (single term) → unchanged; search `lesson about the garden` → no crash, sensible results; confirm an everyday multi-term query the user cares about behaves.
- TEST-DB MCP: `select expand_search_with_synonyms('food waste decay')` → grouped AND-of-ORs output; `search_lessons('food waste decay', …)` → collapsed `total_count`.

## 9. Out of scope (captured for future work)

- **C42 build** (the heavy semantic/hybrid tier) — this initiative only *scopes* it (PR C).
- **C07 / C01 / C09** — the embedding vector-space-mismatch fix, full-corpus regen, and dedup rework that C42 depends on. Named in the spike; not built here.
- **C162 (unaccent)** — accent-insensitive search. Independent and cheap-ish but is a full `search_vector` rebuild on both index and query sides; bundle with a future trigger-rebuild migration. Not in this initiative.
- **C43** — the rejected single-token synonym pairs preserved as C42 seed data; belongs to the C42 build.
- **C121 / C122** (Google SSO / admin 2FA) — the *other* Wave-6 cluster; separate initiative.
- **Two-pass relax (PR D)** — contingent on PR B's eval showing a recall cliff; not pre-built.
- **pgTAP search test infrastructure** — only a lightweight assertion is in scope, not a new SQL test framework.

## 10. References

- Roadmap: `docs/plans/2026-06-20-deferred-work-roadmap.md` (§Wave 6; C41 L125, C42 L130, C43 L145, C162 L141, C01 L161, C07 L202).
- Theme-B search design: `docs/plans/2026-06-20-theme-b-public-ux-design.md:216` (names "AND-of-OR semantics (§4.6 / C41)").
- Search modernization predecessor: auto-memory `project_search_modernization` (S0 eval gate + S1 frontend + S2 SEL + S3 decay shipped; deeper G2 + Heavy semantic tier deferred — this initiative).
- Live SQL: `supabase/migrations/20260620000000_search_lessons_w1b.sql` (`expand_search_with_synonyms`), `supabase/migrations/20260622010000_wave4_pr2_delete_ghosts_search_rpc.sql` (`search_lessons`).
- Eval harness: `scripts/search-eval/` (`run-search-eval.ts`, `queries.json`, `metrics.ts`, `gold-provenance.md`, `scorecards/`).
- Data safety + pipeline: `feedback_data_safety_top_priority`, `reference_ci_flakes`, `reference_database_pipeline`.
