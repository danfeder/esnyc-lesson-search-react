# FP4 wave — briefs index

Owner-approved scope (2026-07-03 Fable ranking session, all decisions via explicit options):
six briefs. One brief per fresh Opus executor session, thin hand-backs. Owner merges every
PR and presses every PROD gate.

Evidence backing all briefs: `docs/plans/fp4-discovery/discovery-evidence.md` (53 findings,
Fable independently re-probed 12 of them 2026-07-03 — all held; see the verification note at
the end of that file). Cite finding IDs, don't re-derive.

| # | Brief | Size | DB? | Depends on |
|---|-------|------|-----|-----------|
| 1 | `brief-1-admin-error-honesty.md` | M | no | — |
| 2 | `brief-2-synonym-seed-safety-net.md` | M | migration (insert-only, idempotent) | — |
| 3 | `brief-3-close-lesson-filter-fix.md` | M | no | — |
| 4 | `brief-4-small-stuff-cleanup.md` | S–M | no | soft: rebase-order vs brief 3 |
| 5 | `brief-5-summary-backfill.md` | M–L | owner-gated data fix | — |
| 6 | `brief-6-validate-constraints.md` | L | migration (heals 7 retired rows + VALIDATE) | — |

Run order: any; 1–4 are independent. 3 and 4 both touch searchStore/useUrlSync test surfaces
lightly — whichever lands second rebases onto main and re-runs gates before the owner merges.
Briefs 2 and 6 each add a migration: 2 uses date `20260706000000`, 6 uses `20260707000000`
(same-day migration names sort BEFORE underscore-date names — never reuse a date already in
`supabase/migrations/`; if taken, bump to the next free day).

## Standing rules (apply to every brief; repeated here once)

- **Process rule (verbatim, binding):** "STOP = write the hand-back and END YOUR TURN;
  design forks route to Fable; the owner only answers explicit approvals (data fix / merge /
  gates)."
- Branch `fix/…` or `feat/…` off fresh `main`. Pre-PR: `npm run check` + `npm run test:run`
  (never bare `npm run test` — watch mode). `npm run test:rls` has 2 known pre-existing
  failures on main (archive_duplicate_lesson) — not yours.
- Any migration work: invoke the `database-migrations` skill first; migrations go through
  the PR/CI pipeline, never `mcp__supabase-remote__apply_migration`. Guarded migrations wrap
  `BEGIN;`/`COMMIT;` (supabase db push is autocommit-per-statement) and, when mutating
  `lessons`, `LOCK TABLE lessons IN SHARE ROW EXCLUSIVE MODE`.
- PROD `jxlxtzkmicfhchkhiojz` / TEST `rxgajgmphciuaqzvwmox`. SELECT probes on PROD are fine;
  never write to PROD. TEST-verify with real data before asking the owner to merge any DB
  change, and re-verify each review round.
- Bot triage: all 4 PR comment surfaces; investigate every finding before fixing; rebut with
  evidence when wrong.
- Copy identifiers verbatim from source/DB into probes, never from memory.
- Hand-back = one-line status + file path(s). No verbose reports.
