# Search Modernization (Medium Package) Execution Status

**Last updated:** 2026-06-19 by Session 8 (**TRACK COMPLETE — PR-E shipped: merged #515 → `d4469fd` + PROD-applied + PROD-verified + edge-fn undeployed on TEST+PROD**) on `main`. ⚠ This close-out is committed LOCALLY as `bb180b1` (local `main` is 1 ahead of `origin/main`); per user (2026-06-19) it stays local to fold into a future PR. **Cut the next branch from LOCAL `main`, not a fetched `origin/main`, or `bb180b1` is lost.**

## Current State

**🏁 THE TRACK IS COMPLETE.** All five planned units are merged + (where applicable) PROD-applied + PROD-verified:

| Unit | What | PR / commit | State |
|---|---|---|---|
| **S0** | Read-only eval harness + two-tier gold + TEST baseline (the gate) | #511 → `69c68e4` | ✅ merged |
| **S1** | G2 frontend query preprocessing (filler strip + grade routing) | #512 → `05581d8` | ✅ merged, Netlify-live |
| **S2** | G3 SEL field indexing into the FTS vector | #513 → `51df5c6` | ✅ merged + PROD-verified |
| **S3** | `decay→decomposition` synonym bridge (one eval-justified `oneway` row) | #514 → `18bd28b` | ✅ merged + PROD-verified |
| **PR-E** | Dead-code retirement (DROP dead helper + undeploy `search-lessons` edge fn) | #515 → `d4469fd` | ✅ merged + PROD-verified + undeployed |

**PR-E final state (Session 8, 2026-06-19):** the orphaned `public.generate_lesson_search_vector(10-arg)` helper is **dropped on PROD** (migration `20260618130000`, run `27796946010` Apply-to-Production success, no SASL flake) and the unused `search-lessons` edge fn is **undeployed on both TEST (was v7) and PROD (was v22)** via `supabase functions delete … --yes`. **PROD MCP verification (authoritative):** twin_count=0, migration recorded, live `update_lesson_search_vector()` intact, **788/788 rows still vectorized**, `search_lessons('decay')`=61 (S3 bridge intact — zero public-search impact). **TEST + PROD `list_edge_functions`: `search-lessons` slug absent on both.** `eval:search` (TEST) re-ran **byte-identical** to the committed baseline — the DROP is a confirmed no-op for search quality.

**Public search end state:** the engine is the `search_lessons` RPC; it now (S1) strips filler / routes grade cues frontend-side, (S2) indexes `social_emotional_learning` so tag-only SEL lessons are reachable, (S3) bridges `decay→decomposition`, and (PR-E) no longer carries the dead twin function or the unused edge fn. Concepts + heritage + SEL all index via the live `update_lesson_search_vector` trigger. Every change shipped through the S0 eval gate with no quality regression.

**Nothing left in this track.** Deferred work (deeper G2 OR→AND, the "Heavy" semantic tier, the rejected-but-correct synonym pairs) is captured under Out-of-scope below and in memory `project_search_modernization.md`.

## Recent decisions worth carrying forward

- **PR-E hosted on a standalone branch** (`feat/search-deadcode-retirement`), not the parent's `feat/pr6e-stage2-cleanup` — that branch never existed anywhere (the parent metadata-rebuild track never cut its E1/E2/E3 cleanup PR). User chose standalone (Session 8) so the track could close without waiting on the parent.
- **`supabase functions delete <slug> --project-ref <ref> --yes`** is the non-interactive undeploy. The dir delete + deploy workflow never undeploys (deploy-only), so the manual delete is mandatory to actually retire a deployed edge fn. Verify removal via `list_edge_functions` (slug absent).
- **Dead-twin DROP rollback is self-contained only in reverse-chronological order** — the migration's rollback note spells out the runbook (recreate the helper before running `20260521000000`'s rollback). The already-applied `20260521000000` was intentionally NOT edited (migration discipline). Codex GATE-3 finding, folded in.
- **Eval gate is the authority on scope, not the design's guesses** (carried from S3: "~12-18 rows" → 1). Applies to any future synonym/field additions.
- **Cross-family GATE-3 Codex earned its keep on EVERY search PR cycle** (S0×2 + S1 + S2 + S3 + PR-E). Migration PRs also got GATE-2 Codex. Promoted to [[feedback_pr_bot_review_workflow]].
- **`gh pr checks --watch` exits early** before slow checks (E2E, claude-* reviews) settle — poll specific checks via `gh pr view --json statusCheckRollup` until non-pending. (Session 8 operational learning.)
- **Supabase Management API 502 flake** — both the CLI `functions delete` and the supabase MCP hit transient Cloudflare 502s (`retryable:true, retry_after:60`); clears on a single retry. Parallel to the SASL / esm.sh-522 flakes.

## Out-of-scope follow-ups captured here

- **Rejected-but-correct S3 synonym pairs (deferred to the semantic tier / a future gold expansion):** `chlorophyll→photosynthesis`, `pollination→pollinators`, `camouflage→adaptations`, `fungi|yeast→microorganisms`, `composting|decomposers→decomposition`. Correct single-token bridges with NO discriminating query in the frozen gold, so they can't pass "ship only on measured lift." (NOT `compost→decomposition` — measured-harmful.) Real home = the deferred "Heavy" semantic tier.
- **Deeper G2 — server-side OR→AND term combination** for multiple *meaningful* terms (`compost worms soil` still OR'd inside the RPC). DEFERRED + documented (design §9). The explicit "come back later" item.
- Full semantic/hybrid ("Heavy") search + embedding regen; embedding-pipeline bugs (`{content}`/`{text}` mismatch; stale recipe fields) — fix before any regen.
- **Expose `detectedGrades`/`autoGrades` from `useLessonSearch`** (S1 round-1 bot suggestion, deliberately NOT done) — revisit only if grade-routing grows stateful/asymmetric.
- **`reset-test-db.yml` no-truncate gap** (from the parent track) — TEST can drift from PROD; root cause of an S2-era E2E flake. Parent-track hygiene.
- ✅ DONE (was here): dead-code retirement (PR-E) and pruning the merged `feat/search-g2-frontend` branch is moot (PR-E branch auto-deleted on merge).

## Pointers to durable context

- Kickoff prompt: `2026-06-17-search-modernization-medium-kickoff.md`
- Design doc: `2026-06-17-search-modernization-medium-design.md` (LOCKED decisions)
- Implementation plan: `2026-06-17-search-modernization-medium-implementation.md`
- **Archive (ALL cycles, Sessions 0–8):** `2026-06-17-search-modernization-medium-execution-status-archive.md`
- Background memory: `project_search_modernization.md` (architecture truth + the corrected facts + final shipping record).
- Parent track: `2026-06-11-metadata-rebuild-pr6-stage2-retag-execution-status.md` (PR D retired here; dead-code rider lived here, not in the parent's PR E).

## Recent session log

### Session 8 — 2026-06-19 — PR-E (dead-code retirement) authored → merged → PROD-applied → edge-fn undeployed → TRACK CLOSE

Branch: `feat/search-deadcode-retirement` (cut from `main`; merged as #515, squash `d4469fd`, branch deleted). Commits: `89b2f67` (build), `5d2eb21` (pre-push review fixes).

Major events:
- **Orientation:** git matched the status file (S0–S3 all merged/PROD-live); clean type-check/lint baseline. User chose the **standalone branch** for PR-E (parent `feat/pr6e-stage2-cleanup` doesn't exist).
- **Read-only no-caller proof (supervisor-owned, TEST+PROD):** `generate_lesson_search_vector(10-arg)` has 0 sql-body callers, 0 hard pg_depend dependents; live `update_lesson_search_vector()` doesn't reference it; repo grep clean; `getSearchRpcName()` hardcodes `search_lessons`. Edge fn ACTIVE TEST v7 / PROD v22. Captured the verbatim PROD `pg_get_functiondef` + grants for the rollback block.
- **Built:** idempotent DROP migration + commented rollback (verbatim body + grant restore + reverse-order runbook); deleted `supabase/functions/search-lessons/`; removed `search-lessons` from the smoke cron (`test-edge-functions.mjs` 11→10/4→3 + the workflow job label) + the stale `database.types.ts` entry; fixed the `_shared/search-helpers.ts` + `src/lib/CLAUDE.md` stale refs.
- **Local gate green:** `db reset` clean, idempotent re-DROP no-op, twin dropped, live trigger intact, all rows vectorized; `test:rls` structural-green (2 pre-existing `archive_duplicate_lesson` failures unrelated); type-check + lint clean.
- **Pre-push reviews:** Claude `feature-dev:code-reviewer` PASS (found 3 staleness items I'd missed — smoke job label, `src/lib/CLAUDE.md` stale dir pointer, all fixed). Cross-family Codex (`review-mqk53hh3-v6e200`) = 1 [medium] rollback-ordering → folded into the migration's reverse-order runbook (the only actionable; can't edit the already-applied `20260521000000`).
- **PR #515 cycle:** CI green except pre-existing Security Audit (zero dep changes). E2E applied the migration to TEST; **TEST verify** (twin=0, 766/766 vectorized) + **eval:search byte-identical**. Four-surface triage: both claude[bot] = APPROVED, zero line comments, **zero actionable findings → no fix-ups.** Deploy-to-TEST matrix correctly excluded `search-lessons`.
- **Merge + PROD (user: "merge and pre-authorize"):** squash-merged #515; approved the `migrate-production.yml` gate (verified PROD pre-apply state read-only first); PROD apply success. **PROD verify all-green.** Undeployed the edge fn on TEST then PROD (`--yes`; PROD needed one retry past a transient Management-API 502); verified slug absent on both via `list_edge_functions`. Cancelled the pointless post-merge `deploy-edge-functions` gate (PR-E changed no edge-fn code; avoids version churn + esm.sh flake). Ordering hazard clear.

**STATUS: TRACK COMPLETE.** S0 + S1 + S2 + S3 + PR-E all shipped + PROD-verified. The public search is modernized for the new canonical metadata, eval-gated end-to-end, with the dead code retired. Memory (`project_search_modernization.md` + MEMORY.md index) and the parent track doc are updated. The only thing not yet on `origin/main` is this close-out commit `bb180b1` — left local by user decision to fold into a future PR.

> Sessions 0–7 (S0 + S1 + S2 + S3 build cycles) are archived in `…-execution-status-archive.md`.
