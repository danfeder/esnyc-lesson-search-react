# Theme B — Public "Broken-Windows" UX Execution Status

**Last updated:** 2026-06-20 by Session 5 (PR3/W1b cycle OPEN: §4 Q1–Q5 LOCKED, Task 3.1/3.2 authored + GATE-1B-hardened; no code on the branch yet — **next session dispatches the migration executor**)

## Current State

**W1a SHIPPED** — PR1 #522 → `19d99b7`, PR2 #523 → `530b2536` (squash). Full PR1/PR2 detail lives in `…-execution-status-archive.md` (grep, don't read whole).

**Active = PR3 / W1b — the one `search_lessons` migration.** Branch `feat/theme-b-w1b-search-rpc` (off `main` @ `530b2536`; docs commits only so far — `735337d` + this session). The single hottest public RPC → **DATA SAFETY is the top constraint**: local-first iterate → GATE 2 (Codex on SQL) → TEST-DB-MCP verify before merge → PROD 3-signal verify after.

**§4 Q1–Q5 LOCKED 2026-06-20** (rationale written inline in design doc §4; W1b flipped to Locked):
- **Q1 C58 sort** [user verdict] = **"Sort minus grade"**: real server-side `order_by` for relevance/title/modified; REMOVE the no-op `grade` option from IntToolbar. `order_by text DEFAULT 'relevance'` → 16-arg → DROP+CREATE. (Sort is a confirmed true no-op today.)
- **Q2 C136** [evidence] = sanitize inside `expand_search_with_synonyms` (per-word regex-strip of tsquery operators `[&|!():*<>]`; trigram fallback preserves recall).
- **Q3 C11** [evidence — TEST+PROD] = exclude 3 exact ghost IDs (`1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd`, `1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU`, `1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8`; all title="Unknown", all [Indoor]; identical TEST/PROD) in BOTH count+result WHERE + `lesson_id ASC` tiebreaker.
- **Q4 location-Both** [evidence — TEST] = new IMMUTABLE `_match_location` mirroring `_match_cooking_methods`; data is `text[]`, Indoor 456 / Both 203 / Outdoor 107 = 766/766 title-case; expand Indoor→{Indoor,Both}, Outdoor→{Outdoor,Both}, Both→{Both}; replace bare `&&` in both WHEREs.
- **Q5 C84 tags** [user verdict] = **DEFERRED** out of W1b → its own data-quality audit session (tags predate the metadata rebuild). PR1 badge suppression stays; filter still works. Tracked: `project_tags_field_audit_pending` memory + design §9.

**Evidence probes (TEST/PROD, 2026-06-20):** corpus 766; ghosts identical TEST+PROD; location 3 single-element title-case values; tags 74/766; `updated_at` exists (timestamptz); current `search_lessons` = the 15-arg signature (DROP target); EXECUTE grantees = PUBLIC, anon, authenticated, postgres, service_role; `_match_location` confirmed not-yet-existing.

**Tasks authored** (impl plan PR 3): **Task 3.1** = the one migration (C136 sanitizer + `_match_location` helper + DROP/CREATE `search_lessons` w/ `order_by` + C11 exclusion + location swap in both queries; RETURNS unchanged; regenerate types; rollback block; **ORDER BY gotcha**: can't reference the `rank` alias inside a CASE — wrap the result SELECT in a subquery `sub`). **Task 3.2** = client wiring (useLessonSearch `order_by` + queryKey; SearchPage reset page on sort; IntToolbar drop the grade option) + tests.

**Next actions (in order):**
1. ✅ **GATE 1B DONE** (Codex, 2026-06-20, returned inline) — 1 BLOCKER (`_match_location` GRANT) + 1 HIGH (`service_role` in `search_lessons` GRANT) + 2 MEDIUM (explicit-NULL `order_by` → `sort_key` normalization; explicit quote-strip in the C136 sanitizer) accepted + folded into Task 3.1; atomicity (MEDIUM) documented; 9 LOW confirm-at-impl.
2. **Dispatch Task 3.1** (executor, fresh context, `database-migrations` + `/new-migration` skills) — local-first build; supervisor-verify (re-run the local smoke via `mcp__supabase__` + read the full SQL + `git show`). **← NEXT SESSION STARTS HERE.**
3. **GATE 2** — Codex on the actual migration SQL, pre-TEST.
4. **Dispatch Task 3.2** (executor) — client wiring + tests.
5. Pre-push gate (code-reviewer + Codex GATE 3) → push → PR → **TEST-DB-MCP verify** → bot rounds (GATE 4) → user-gated merge → PROD approval + **3-signal verify** (`reference_ci_flakes.md` first).

**Docs handling:** the §4-lock + task-authoring + archival doc edits were **committed locally at Session 5 end** (one `docs(theme-b)` commit, **unpushed** — no PR open, so no CI cost; committing avoids leaving uncommitted state across the `/clear`). The migration/frontend code commits land on top next session; the whole branch pushes together when the PR opens. Executors must `git add` ONLY their code files (migration, regenerated types, frontend) — never re-touch `docs/plans/*`.

## Recent decisions worth carrying forward

- **GATE 4** (2026-06-20, user-requested): every bot-surfaced *real suggested change* gets a Codex 2nd opinion before finalizing accept/reject. Codex dispatches MUST say "return findings INLINE, do not background" (async-handoff flake; worked first-try ×2 in PR2).
- **W1b §4 locks** (2026-06-20): see Current State; full rationale in design §4.
- **Tags deferred** (2026-06-20 user verdict): C84 path-a needs a data-quality audit session first — do NOT expose tags in W1b.

## Out-of-scope follow-ups captured here

- **`tags` public badge (C84 path-a)** — deferred to its own audit session (`project_tags_field_audit_pending` memory). The `LessonMetadata.tags` type gap (`database.types.ts:256` has `tags`; `src/types/index.ts` `LessonMetadata` does not) is part of THAT future work, not W1b.
- **`filter_lesson_format` dead RPC param** — kept in the W1b signature (harmless); dropping it = the separate deferred Task 1.3a (also needs the frontend to stop sending it). Bundle into a future RPC change, NOT W1b.
- **C14 IntPillGroup ARIA-forwarding** (from PR2) — pill-group controls only get wrapper-level `id`/`aria-label`; flagged follow-up.
- **LessonSearchPicker stale state after select→clear (R2-4, from PR2)** — REAL but pre-existing; fix later with a reset on `selected→null` + a test.
- **ArrowUp APG return-to-input (R2-2, from PR2)** — current clamp-at-0 is LOCKED design §5; only change with user sign-off (a design change, not a bug).

## Pointers to durable context

- Kickoff prompt: `2026-06-20-theme-b-public-ux-kickoff.md`
- Design doc: `2026-06-20-theme-b-public-ux-design.md` (W1a + W1b LOCKED; W1c §4 Q6–Q8 still open)
- Implementation plan: `2026-06-20-theme-b-public-ux-implementation.md` (PR1/PR2/PR3 concrete; PR4 skeleton)
- Campaign roadmap: `2026-06-20-deferred-work-roadmap.md` (Theme B = Wave 1)
- Archive (PR1+PR2 cycles): `2026-06-20-theme-b-public-ux-execution-status-archive.md` — grep, don't read whole.

## Session log

### Session 5 — 2026-06-20 — PR3/W1b cycle opened: §4 locked, Task 3.1/3.2 authored + GATE-1B-hardened

Supervisor session. No code on the branch yet — this session was the full W1b design-lock + task-authoring + plan-review phase. Clean handoff at the end.

- Oriented; git matched the status file; baseline `npm run check` clean. Worktree had pre-existing untracked `docs/plans/*` (unrelated — left alone).
- **User decisions:** Q1 = "Sort minus grade" (real `order_by` for relevance/title/modified, drop the grade option); Q5 = **defer tags** to its own audit session (tags predate the metadata rebuild — needs vocab reconciliation before public exposure).
- Captured the **tags-audit-pending** concern as a durable project memory (`project_tags_field_audit_pending`) + MEMORY.md index line (user: "don't lose track").
- **§4 evidence gathering:** background Explore agent code digest (current RPC body @ `20260520020000`, sort wiring, C136 sanitizer site, `_match_cooking_methods` helper, tags chain, migration ordering) + TEST/PROD MCP probes (ghosts identical TEST/PROD all title="Unknown"/[Indoor]; location 766/766 single-element title-case; tags 74/766; `updated_at` exists; current 15-arg sig; grantees incl. service_role).
- **Locked §4 Q1–Q5** inline in design doc + updated status line / §6 / §7 table / §9; flipped W1b → Locked.
- **Authored Task 3.1 (migration) + Task 3.2 (client wiring)** in the impl plan (skeleton → concrete).
- **PR-cycle archival:** moved PR2 (Sessions 3/4 + round outcomes + Done detail + decisions) into the archive; slimmed this file to the PR3 cycle.
- **GATE 1B** (Codex, returned **inline** — no async flake): **1 BLOCKER** (missing `_match_location` GRANT — invoker-rights RPC), **1 HIGH** (`service_role` missing from the `search_lessons` GRANT vs the `20260514` precedent), **3 MEDIUM** (explicit-`NULL order_by` wouldn't fall back to relevance → add a normalized `sort_key`; sanitizer apostrophe/quote handling left ambiguous → make quote-strip explicit; DROP+CREATE atomicity), **9 LOW**. Rebuttal-passed all → accepted + folded BLOCKER/HIGH/2-MEDIUM into Task 3.1; documented atomicity (precedent + Supabase per-file transaction wrapping → no missing-function window; CREATE-OR-REPLACE impossible since sig changes); confirmed the 9 LOW are already in the plan or impl-time checks.
- **Handoff:** stopped at this clean boundary rather than start the migration build on a heavy context — DATA SAFETY on the hottest public RPC warrants a fresh budget for executor + supervisor-verify + GATE 2.

Learnings:
- **GATE 1B (reviewing the authored PLAN before any code) is load-bearing for migrations** — it caught a runtime BLOCKER (helper GRANT) + a HIGH grant gap that would otherwise surface only at TEST/PROD apply, plus a real NULL-fallback hole. Run a plan-review gate before dispatching migration executors, not just a post-code gate.
- **Codex "return findings INLINE, do not background" worked first-try a 3rd consecutive time** (PR2 ×2 + this) — promote to a feedback memory (the async-handoff flake is reliably avoided by the explicit instruction).
