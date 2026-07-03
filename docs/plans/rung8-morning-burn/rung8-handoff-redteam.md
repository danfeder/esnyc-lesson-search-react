# Rung 8 — Handoff red-team (adversarial misstatement hunt)

Scope: "Morning handoff (overnight run)" section of docs/plans/2026-07-03-frontend-polish-tracker.md + bodies of open PRs #582 #583 #584 #585 #586 #590 #591 #593 #594 #595.
Hunting: wrong shas/numbers/ordering claims, promises code doesn't keep, gate instructions that would fail if followed.

## Findings (incremental)

### F1 — MAJOR: handoff gate #3 merge-order instruction ("#590 first, then rebase #584, then merge") will fail CI/PROD apply as written
- Handoff (tracker §"YOUR GATES" item 3) + #590 body ("Migration slot 20260703030000 verified collision-free against the sibling E4 draft (20260703020000, #584) **in either merge order**").
- #590's migration slot is `20260703030000`; #584's is `20260703020000`. If #590 applies first (the recommended order), TEST/PROD `schema_migrations` head = `20260703030000`. #584's later CI/PROD run does plain `supabase db push` — `.github/workflows/e2e.yml:126` and `.github/workflows/migrate-production.yml:316`, and the dry-run guards at `e2e.yml:60` / `migrate-production.yml:186` — with **no `--include-all`**. The Supabase CLI refuses local migrations versioned before the remote head ("Found local migration files to be inserted before the last migration... Rerun with --include-all"), so #584's e2e dry-run goes red and, if force-merged, the PROD apply fails too. Rebase onto main does NOT rename the migration file.
- Concrete failure: user follows the handoff exactly → merges #590, rebases #584, #584 CI migration step fails; PROD workflow would fail the same way. Fix required first: rename #584's migration to a slot > `20260703030000` (e.g. `20260703040000`) during the rebase. The "either merge order" claim in #590's body is a misstatement for the order the handoff itself recommends. (Fails loudly, not silently — but it is a gate instruction that fails if followed.)

### F1 — LIVE CONFIRMATION (read-only TEST probe, 2026-07-03)
- TEST `schema_migrations` head is **already** `20260703030000` (#590's CI applied it); `20260703020000` is NOT recorded (rolled back cleanly, row removed). So #584 is already in the failing position: its current branch lacks the 030000 file (→ dry-run fails "remote migration not found locally"), and after the handoff's prescribed rebase it carries 020000 *pending before the remote head* (→ plain `supabase db push` refuses, `--include-all` not passed anywhere in CI). Either way #584 cannot go green without renaming its migration slot — a step the handoff omits.

### F2 — #584's "TEST verification (post-CI)" body section is now false as a statement of current TEST state
- #584 body asserts `find_duplicate_pairs` **absent** on TEST (pg_proc=0) + head `20260703020000`. Live probe: `find_duplicate_pairs` EXISTS on TEST (pg_proc=1), head `20260703030000`, version row for 020000 gone. The rollback is disclosed in the handoff and (per handoff) "details on both PRs", but the PR **body's** verification section was never amended — a reader gating from the body alone would believe TEST currently reflects the drop and skip re-verification. Concrete failure: user merges #584 post-rebase, sees the body's "verified absent on TEST" and doesn't re-probe; if anything in the re-apply path misfires, the stale claim masks it.

### TEST live-state probe results (read-only, for the record)
`fdp_exists=1, mig_584_recorded=0, mig_590_recorded=1, head=20260703030000, total=763, active=685, subs=130, kebab_col=0, fp02 snapshot_rows=86, distinct_active_themes=7`
- Handoff baseline claim (763/685/130 + sanctioned #590 mutation, 86-row snapshot) — **verified exact**.
- #590 pre-registered expectations spot-checked: kebab 0 ✓, snapshot 86 ✓, distinct active themes 14→**7** ✓.

### Verified-accurate claims (no finding)
- Handoff merged-PR table squash shas all match `git log`: #581 `b75c985`, #587 `6efb0b5`, #588 `853234a`, #589 `f8d16fb`, #592 `27e254c`.
- #587 "58 files, −2,405 lines" — exact (`58 files changed, 42 insertions(+), 2405 deletions(-)`).
- #592 "−952 lines" — exact (`2 files changed, 952 deletions(-)`).
- #582 "deploy workflow discovers functions dynamically... deploy-edge-functions.yml:85" — confirmed, `find supabase/functions -mindepth 1 -maxdepth 1 -type d` at that line.
- #584 "AcceptInvitation.tsx:46 ... reads row.accepted_at at :52" — both line numbers exact on main.
- #585 "all 5 call sites" of AuthModal — exactly 5 non-test consumers (Header, SubmissionPage, UserProfile, NewSubmissionForm, RevisingSubmissionForm).
- #583 "last code reference to OPENAI_API_KEY in deployed edge code outside the two retired embedding functions" — grep confirms; only residual is a prose comment in `complete-review/index.ts:141` (not code).
- #586 "One product file (src/pages/UserProfile.tsx, +15/−9)" — exact per PR file stats.
- #595 "this PR's edit is the single state-init line" — confirmed: sole ReviewDashboard.tsx product change is `useState<FilterKey>('all')` → `'submitted'` at ~:71.
- Handoff `gh run list --workflow=deploy-edge-functions.yml --status=waiting` — `waiting` is a valid gh status filter; instruction executable as written.

## Not checked (budget)
- #591's four-review-rounds narrative, per-branch test-count totals (1933/1937/1949/1957/1959 — differing branch points off the sweep merges make cross-checks ambiguous, none obviously wrong), #594's live dev-server drive claims, #581's "7/7 twice vs PROD" smoke runs, PROD-side kebab census (~74 claim).

## Bottom line
Handoff is factually solid (shas, stats, line refs, TEST baseline all exact) **except** gate item 3: the #590→#584 merge-order instruction fails as written because #584's migration slot (`20260703020000`) sorts before #590's already-applied `20260703030000` and CI/PROD use plain `supabase db push` (no `--include-all`). #584 needs its migration renamed to a post-030000 slot during the rebase, and its PR-body TEST-verification section re-done afterward.
