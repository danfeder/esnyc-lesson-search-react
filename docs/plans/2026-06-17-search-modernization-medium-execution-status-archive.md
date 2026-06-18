# Search Modernization (Medium Package) — Execution Status ARCHIVE

Reference-only. Active status lives in `2026-06-17-search-modernization-medium-execution-status.md`.
Session logs + superseded recent-decisions are moved here at the start of each new PR cycle to keep the active doc lean. Grep this for "why did we…" provenance.

---

## PR S0 cycle (eval harness) — MERGED 2026-06-18 as PR #511 (squash `69c68e4`)

S0 shipped the read-only eval harness (the measurement gate): `scripts/search-eval/` (metrics.ts cluster-aware ranking module + run-search-eval.ts read-only tsx harness + predicate.ts + readonly-guard.ts + 35-entry two-tier gold queries.json + committed TEST baseline.json + scorecards/test.md), `npm run eval:search`, `SEARCH_EVAL_TARGET=local|test|prod` (default test). No DB/`src/` engine change. Pre-push reviewed (Claude code-reviewer + Codex GATE-3); PR #511 external review = `claude-review` Approve (5 non-blocking nits, all rebuttal-passed/default-rejected as below-bar for an internal read-only tool) + `performance-review` pass; Security Audit failure was the PRE-EXISTING npm-audit pattern (zero new deps — `package-lock.json` unchanged vs main), non-blocking.

### S0 recent-decisions (historical — the gold + scoring model are now frozen on main)

- **S0.2 gold FROZEN (2026-06-18) — verified 3 ways before freezing.** Deep 8-agent live re-derivation + critic + supervisor spot-check (all PASS) AND an independent Codex cross-check (raw-row snapshot). q12 = 5 activity-based primaries (user/product-owner pick); q27 ghost row kept (user); q34 acceptable emptied (Codex catch — spec line 179). **Do not edit `queries.json` gold values without re-running the verification + re-confirming with the product owner.**
- **Scoring-model upgrade (2026-06-18, user-approved).** Dual adversarial review (Claude 4-lens + Codex) found the simple hit@10-vs-flat-id design would lie in ≥4 ways. Adopted: (1) two-tier cluster gold (twins=one cluster, primary=counted / acceptable=not-penalized); (2) per-query scoring families (frozen-recall / frozen-precision / predicate / g3-isolation / sentinel / control-maxcount); (3) G2 scored on the normalized `parseSearchQuery` call, not raw; (4) G3 scored by rank-movement of tag-but-no-lexical-mention isolation sets (RDM=29/SM=42/SJ=25), `isolationHits@50` — NOT top-10 recall; (5) q22 `compost worms soil` = stability sentinel excluded from quality; (6) dup-flood guard. Coverage adds: `mexican food`, `apple`, `food waste`, `making good choices` + a robustness pack (grade-wording variants, 1 typo, `kimchi`).
- **PR D RETIRED → this track.** Bulk 5,163-pair synonym load is wrong-mechanism (whitespace CHECK + token matcher). Repurposed: small curated single-word bridge (S3) now; bulk map → deferred semantic tier.
- **GATE 1 fold (3 Codex findings, all repo-verified):** (1) eval harness must be a `.ts` run via `npx tsx` + add `scripts/search-eval/**` to `tsconfig.scripts.json`; `parseSearchQuery` must be pure/alias-free so both frontend + harness import it. (2) PR-E rider must run `supabase functions delete search-lessons` for TEST+PROD (deployed ACTIVE v22; deploy workflow never undeploys on dir-delete). (3) S3 synonym rollback = exact-tuple `DELETE` (no tag column on `search_synonyms`).

### Session log — S0 cycle

#### Session 3 — 2026-06-18 — S0.3 harness + S0.4 baseline built+verified+committed; S0 pre-push-reviewed; PR #511 opened + MERGED

Commits on `feat/search-eval-s0`: `6f6fb7c` (harness + TEST baseline, S0.3+S0.4) + `00e0e7d` (pre-push review fix-up) + `10587db` (status checkpoint). Merged to main 2026-06-18 18:10Z as squash `69c68e4` (PR #511).

Major events:
- **S0.3 harness built via `Workflow` `wf_e9c31225-5be`** (executor → adversarial-verifier). Executor wrote `run-search-eval.ts` + pure `predicate.ts` + `readonly-guard.ts` (+tests) per an on-disk build brief (`.tmp/s03-executor-brief.md`); verifier verdict = pass, 0 findings. Supervisor independently re-verified: re-ran 114 tests + eval (0 errored/35), hand-checked `decomposition` recall@10 = 6/7 = 0.857 against live TEST top-10, audited the read-only guarantee, confirmed the dup-flood/gold cluster decoupling (the November twin has DISTINCT content_hash → dupFlood=0 correct).
- **Substrate prereqs confirmed live (TEST):** `search_lessons` 15-arg signature; array cols anon-readable; anon REST works over HTTPS from a node/tsx process (RPC + SELECT) — the harness uses a real anon client, NOT MCP.
- **S0.4 baseline captured on TEST** (`--write-baseline`), byte-reproducible across re-runs; committed (stable per-target filename for git-diffable deltas).
- **Pre-push review (per-PR ritual step 1):** Claude `feature-dev:code-reviewer` + Codex GATE-3 in parallel. 4 findings, rebuttal-passed; 3 fixed (Codex-HIGH G3 absent→ranked movement via tested `rankMovement()`; Codex-MED deterministic `--write-baseline`; Claude corpus-size single-source), 1 documented-not-fixed (predicate `''` escape — inert + fails-loud).
- **PR #511 opened + external review:** `claude-review` Approve + `performance-review` pass; 5 non-blocking nits default-rejected; Security Audit = pre-existing npm-audit (not S0). Merged (user-gated) Session 4.

#### Session 2 — 2026-06-18 — S0.2 gold FROZEN + triple-verified; S0.3 unblocked

Commit on `feat/search-eval-s0`: `97ed020` (freeze + deep-verify S0.2 gold).

Major events:
- **Deep verification of `queries.json`**: `Workflow` `wf_5521dc30-78d` = 8 fresh-context agents re-deriving every oracle live on TEST + adversarial completeness critic; then supervisor 4-query MCP spot-check. All PASS.
- **q12 supervisor pick** (collaborative): user/product-owner-confirmed 5 activity-based PRIMARY clusters; q27 ghost row kept.
- **Independent Codex pass:** raw-row-snapshot approach (`.tmp/codex-goldset-review/`); Codex caught 1 real finding (q34 acceptable tier — fixed) + 1 false alarm (q23 guard-ceiling — rejected).
- **S0.3 credential prereq resolved:** `.env` TEST keys were stale (ref `epedjebjemztzdyhqace`); fetched live TEST anon key via MCP, refreshed `.env` (gitignored), smoke-tested anon→`search_lessons` (compost=178). Updated memory [[project_test_key_stale]].

#### Session 1 — 2026-06-17/18 — S0.1 + S0.1-extend shipped; S0.2 gold built (dual-reviewed)

Commits: `93bcaa0`+`9afbe5e` (S0.1 metric base), `634b754` (S0.1-extend cluster-aware metrics), `ce148cf` (scoring-model upgrade docs), `f203c96` (gold provenance spec + checkpoint), `8316f96` (queries.json).

Major events:
- **S0.1** ranking-metric module (TDD) + **S0.1-extend** to the upgraded scoring model — both executor→adversarial-verifier workflows, supervisor-re-verified (69 vitest green).
- **S0.2 dual adversarial review:** Claude 4-lens fan-out (`wf_8a2690f3-c67`) + independent Codex read-only (`bjwa14g6e`). Reviews converged: simple metric design gives false readings in ≥4 ways → user-approved scoring-model upgrade.
- **queries.json built** (35 entries) by a fresh-context executor live against TEST (`wf_b779e095-7bd`), LIGHT-verified PASS.

#### Session 0 — 2026-06-17 — scaffolding

- Investigation (5-lens workflow + adversarial verify + independent Codex) established the corrected search architecture + gaps; user chose "Medium"; PR D retired.
- Design judge-panel (5 plans + critique + synthesis) + independent Codex plan produced the locked sequence/decisions.
- Scaffolded the four-file plan (design Locked + status + impl + kickoff). GATE 1 Codex review of the design → folded.

---

## PR S1 cycle (G2 frontend query preprocessing) — MERGED 2026-06-18 as PR #512 (squash `05581d8`)

S1 shipped the frontend G2 fix: a pure, alias-free `src/utils/parseSearchQuery.ts` that strips filler + routes explicit grade cues into `filter_grade_levels`, wired into `useLessonSearch.ts` (search_query←cleanedQuery, filter_grade_levels←effectiveGradeLevels with explicit-user-grade-WINS) and surfaced as a removable `· auto` grade chip in `IntActivePills.tsx`. The eval harness `resolveCall` was flipped to apply `parseSearchQuery` so the gate measures real end-to-end behavior. No DB change → shipped via Netlify (one-deploy revert). Merged 2026-06-18 21:08Z.

**S1 EVAL GATE PASSED decisively (TEST):** G2 cases collapsed from raw explosion to focused sets — q01/q32 `compost lesson for 3rd grade(rs)` 744/742→**87** (recall .667→1.000, top1 F→T, MRR .200→1.000); q02 garden 744→257; q03 worm-composting 270→91 (predicate 8/10→10/10); q04 seeds-first-grade 745→251 and q33 seeds-K-2 685→300 both flipped predicate FAIL→10/10 PASS. Aggregate: recall@10 .575→.642, predicate 9/16→11/16, MRR .723→.846, precision@10 flat .833; maxTotalCount violations 0, sentinel jaccard 1.000, every non-G2/control query byte-identical = NO regression. `baseline.json` deliberately NOT re-captured (frozen S0 raw + G3 rank-movement reference).

### S1 recent-decisions (historical — now shipped on main)

- **G2 fix = frontend** (`parseSearchQuery.ts`), filler/grade only; deeper server-side OR→AND DEFERRED + documented (design §9) (user 2026-06-17). Module MUST be pure/alias-free so frontend hook + tsx eval harness import the same code.
- **Grade chip = visible + removable** (LOCKED design §5; confirmed by user at S1 start). **S1.3 sub-decisions confirmed by user 2026-06-18:** dismiss **rewrites the box to the cleaned term** (`setFilters({ query: cleanedQuery })`, stateless — no suppression flag); chip lives **in the existing `IntActivePills` row** labeled `· auto` (one combined chip for ranges). Supervisor revised the build to fold into `IntActivePills` (no `useLessonSearch` return-shape change) — simpler + keeps the hook pure (Header's existing `localQuery`←`filters.query` `useEffect` makes the box rewrite "for free").
- **Explicit user grade filter WINS** over detected grades (S1.2 wiring); the chip mirrors the hook's explicit-wins guard so it never claims a grade the hook didn't apply.
- **Out-of-scope follow-up (rejected for S1):** expose `detectedGrades`/`autoGrades` from the `useLessonSearch` return shape so `IntActivePills` consumes the hook's computed values instead of independently re-calling `parseSearchQuery`. Rejected — the duplication is two calls to the SAME pure function guarded identically (cannot diverge); cross-ref comment makes the coupling explicit. Revisit only if grade-routing grows stateful/asymmetric.
- **Cross-family GATE-3 Codex earned its keep AGAIN on S1** (2 medium, both real + accepted) — promoted to [[feedback_pr_bot_review_workflow]] as the 3rd confirmed search-PR cycle.

### Session log — S1 cycle

#### Session 5 — 2026-06-18 — S1.3 chip + S1.4 eval-gate + full per-PR ritual + PR #512 MERGED

Commits on `feat/search-g2-frontend`: `60f1a40` (S1.3 chip + 7 vitest), `52f7677` (S1.4 harness flip + 2 grade-chip E2E + scorecard delta), `644dd97` (GATE-3 fix-up — punctuation/range robustness + `callsEqual` harness assertion, TDD workflow `wf_81fc868a-b41`), `268855c` (round-1 bot fix-up, workflow `wf_2f67c26f-f58`), `1b74ec3` (docs), + final cosmetic-sweep commit. Squash-merged to main as `05581d8` (PR #512).

Major events:
- **S1.3 grade chip** folded into `IntActivePills.tsx` via executor→adversarial-verifier workflow `wf_97c13781-39b`; supervisor-verified (guard mirrors `useLessonSearch.ts:95-99` exactly; re-ran type-check/lint/vitest 7/7 + 124 Internal green). Label `Grade 3 · auto` / `Grades K, 1, 2 · auto`. Dismiss = `setFilters({ query: cleanedQuery })`.
- **S1.4 harness flip** (supervisor-direct, gate-critical): `resolveCall` applies `parseSearchQuery` via relative import. Ran `eval:search` on TEST → decisive G2 lift, zero control regression (numbers above). 2 grade-chip E2E pass locally vs TEST data (Opus executor wrote, supervisor committed atomically). `baseline.json` untouched.
- **Pre-push ritual:** Claude `feature-dev:code-reviewer` clean (7 invariants hold, 2 non-defects rebutted). **GATE-3 Codex = 2 medium, BOTH real + accepted** → fix-up `644dd97` (punctuation-tolerant grade-cue matching + cue-gated 3-token spaced/word range branch; `callsEqual` normalized-call assertion + alarm). Supervisor-verified: 42/42 parser tests, eval mismatches 0, G2 frozen totals unchanged (87/257/91/251/300), scorecard byte-identical, module purity intact.
- **PR #512 round-1 triage** (all 4 surfaces): `claude-review` pass+comment, formal CHANGES_REQUESTED, 6 line comments → consolidated fix-up `268855c` (memoize chip derivation w/ hooks BEFORE early return, honest `parseSearchQuery(raw: string|null|undefined)` signature, module-scope `WORD_SEPARATORS`, E2E `data-testid="auto-grade-chip"`, grade-only dismiss test, explicit-wins cross-ref comment). Behavior-preserving — eval byte-identical (md5 `00de6cd…`), 50 unit + 2 E2E green. Rejected: the "call out-of-scope" non-bug, the hook return-shape refactor (deliberate design), the "Kindergarten" relabel (consistency w/ existing "Grade K" pills).
- **Round-2 = APPROVED** (claude[bot] upgraded CHANGES_REQUESTED→APPROVED 2026-06-18 20:44Z). Round-2 findings cosmetic-only (dead `zero:'0'` map entry; duplicate `@testing-library/react` import) → user opted to sweep both before merge (behavior-preserving, eval byte-identical). Round-capped.
- **Merged** (user-gated) 21:08Z. CI all green except the pre-existing Security Audit (zero deps added; fails identically on main).

#### Session 4 — 2026-06-18 — S0 MERGED (PR #511); S1 cycle started; S1.1 + S1.2 shipped

Commits on `feat/search-g2-frontend`: `7f29eba` (S1.1 pure `parseSearchQuery` + 34 tests), `d14fec9` (S1.2 wire into `useLessonSearch.ts` + `useLessonSearch.wiring.test.tsx` 5 cases) + bookkeeping.

Major events:
- **Session-start divergence caught:** prior header said "push + open S0 PR" but PR #511 was already OPEN. Trusted git. Four-surface triage: `claude-review` Approve (5 nits) + `performance-review` pass; Security Audit = pre-existing npm-audit (proved zero new deps). All 5 nits default-rejected.
- **Merged PR #511** (user-gated) — squash `69c68e4`. PR-cycle archival of S0 (created the archive; promoted 2 learnings: cross-family GATE-3 + on-disk executor brief).
- **S1.1** pure `parseSearchQuery` via executor→adversarial-verifier `wf_4fa5ea7b-e96`; supervisor-verified (34 vitest + tsx probe = 6/6 frozen gold + 5/5 false-positive guards).
- **S1.2** wired into `useLessonSearch.ts` via `wf_77263ad6-8d3` (executor→verifier). Minimal non-breaking edit (import + 4 derived lines + 2 param swaps; queryKey + return shape untouched). Supervisor-verified: no raw `filters.query` leak; 16/16 targeted tests + full suite 1272 green.
