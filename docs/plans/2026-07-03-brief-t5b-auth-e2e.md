# Brief: T5b — Authenticated E2E fixture (Playwright)

**Decided:** 2026-07-03 (user, at T5 smoke wrap-up). This is the FINAL item of the go-live
phase. Run in a fresh session. **Executor: Fable** (user directive 2026-07-03: all
main-session work runs on Fable — no Opus handoffs until the user re-opens them). STOP
conditions below still apply: they mark decisions that are the user's, not the model's.

## Goal

Give CI a logged-in browser test suite so the reviewer/teacher surfaces the T5 smoke covered
by hand stay covered automatically. Un-skip or rewrite `e2e/review-flow.spec.ts` (currently
fully `.skip`ped on exactly this gap — the repo has ZERO authenticated E2E today).

## What to cover (mirror the T5 smoke, doc: `2026-07-03-t5-launch-smoke.md`)

1. Teacher submits via `/submit/new` → lands `submitted`.
2. Reviewer decision screen: all 5 decisions reachable; card-bound options disabled until a
   candidate selected; prefilled already-in-library note re-binds on card switch; reject
   without a reason is blocked; publish-anyway guard fires on an exact/high candidate and
   cancels cleanly (plant a similarity row via seed/API if needed — T5 precedent).
3. Revisions → teacher sees note → resubmit button → status flips back, stale
   `submission_similarities` cleared, reviewer tags preserved on reopen.
4. Teacher "My submissions" badges: SUBMITTED / REVISION / APPROVED / NOT PUBLISHED + reason.
5. Published lesson appears in public search with title + summary.

## Facts on the ground (don't re-derive)

- CI E2E runs Playwright against Netlify deploy previews pointed at the SHARED TEST DB
  (`rxgajgmphciuaqzvwmox`); locally Playwright auto-starts the dev server (see
  `playwright.config.ts` webServer). Local dev against TEST: shell-env recipe in
  `2026-07-01-t2-walkthrough.md` §Setup.
- TEST accounts: `teacher@test.com` / `reviewer@test.com` / `admin@test.com`, `password123`.
- Extraction is CANNED on TEST (no Google credential) — never assert on doc content;
  canned titles vary per doc-id. Detection (pg_trgm) is REAL.
- TEST baseline is load-bearing: 763 lessons / 685 live / 130 submissions. Other sessions
  verify against it. Tests MUST clean up their rows.

## Design decisions (pre-made — deviate only via STOP)

- **Auth:** programmatic login via `@supabase/supabase-js` in a Playwright setup project →
  save `storageState` per role (teacher/reviewer). No UI-login in every spec (flake).
- **Isolation:** every created row carries a run-unique marker in the Google-Doc URL
  (e.g. `…/d/1E2EAUTH<runId>…`); authenticated specs run in ONE worker, serially.
- **Cleanup:** the open question. CI has NO service-role key and must not gain one without
  explicit user sign-off (STOP if you think it's needed). Acceptable shapes to evaluate,
  in order: (a) app-path cleanup where possible + a documented residue budget with a
  marker-scoped sweep script the user/agent runs via MCP; (b) a TEST-only cleanup RPC
  gated to reviewer role, shipped by migration (needs the full migration workflow);
  (c) something better you find. Present the tradeoff at session start, in plain language.

## Gates

`npm run check` + `npm run test:run` green; new E2E green in CI on the PR (deploy-preview
run, not just local); TEST baseline re-verified via `mcp__supabase-test__execute_sql` after
the CI run (763/685/130 + zero rows matching the run marker).

## STOP conditions

- Cleanup design requires new secrets/keys in CI → STOP, present options.
- Any spec flakes twice in a row after a targeted fix → STOP, report.
- Anything needs a schema change beyond option (b) above → STOP.
