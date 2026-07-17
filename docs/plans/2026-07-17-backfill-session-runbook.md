# Supervised backfill session runbook (Drive provenance, Gate 2)

One-sitting, owner-supervised session that backfills Drive provenance
(dates for all readable lessons + historical creator attribution for eligible
native Docs) into PRODUCTION, then unblocks PR-B. Written 2026-07-17 by the
implementation session for a FRESH session to execute with Dan present.

## Preconditions (all true as of 2026-07-17)

- PR-A #617 merged; migration `20260717144705` + all edge functions live on
  prod (verified). Provenance columns exist and are NULL on the historical
  corpus; new submissions self-populate.
- **The tooling lives ONLY on the `feat/drive-provenance-ui` branch** in the
  worktree `/Users/danfeder/.codex/worktrees/312d/esynyc-lessonsearch-v2`
  (commits `437a913` + `101c9e5`). Run everything from that worktree on that
  branch. (`npm ci` there if node_modules is missing.)
- Private inputs in `~/Documents/` (all mode 600): service-account key
  `dbproject1-431601-6fff3c1ffc0e.json`; worksheets
  `drive-attribution-name-worksheet-final-2026-07-16.csv` +
  `drive-attribution-recovery-name-worksheet-2026-07-17.csv`.
- NO actor-map file exists — Step 1 regenerates it (the census JSONs are
  aggregate-only by design).
- The scripts read `.env` at the worktree root. The dry-run and write MUST
  target the prod DB (`--lessons-json` is forbidden in write mode), so the
  worktree `.env` needs `VITE_SUPABASE_URL` = the prod URL and
  `SUPABASE_SERVICE_ROLE_KEY` = the prod service key for the session —
  Dan supplies these directly (e.g. edits `.env` himself or runs the commands
  via `!`); restore the local-target `.env` afterwards.

## Identities (Dan supplies at runtime — never hard-coded)

- Metadata subject: the ordinary delegated reader (`docs-reader@…`).
- Primary Activity subject: the long-tenured supervised account (le@…).
- Sweep subjects: every account_email in the two worksheets.

## Step 1 — regenerate the private actor map (read-only)

```
node scripts/drive-provenance/build-actor-map.mjs \
  --service-account ~/Documents/dbproject1-431601-6fff3c1ffc0e.json \
  --metadata-subject <reader@…> \
  --activity-subject <supervised@…> \
  --sweep-subject <acct1@…> [--sweep-subject <acct2@…> …] \
  --out ~/Documents/drive-actor-map-<date>.json
```

Sanity vs census: expect ~11 resolvable actor ids; unresolved leftovers
(former staff) are EXPECTED and omit downstream. Nonzero exit on Activity
failures → rerun, don't proceed.

## Step 2 — creator dry-run (read-only, prod corpus)

```
node scripts/drive-provenance/backfill-drive-provenance.mjs \
  --service-account … --metadata-subject … --activity-subject … \
  --worksheet ~/Documents/drive-attribution-name-worksheet-final-2026-07-16.csv \
  --worksheet ~/Documents/drive-attribution-recovery-name-worksheet-2026-07-17.csv \
  --actor-map ~/Documents/drive-actor-map-<date>.json \
  --report ~/Documents/drive-backfill-dryrun-<date>.json
```

**Dan reviews the aggregate report** against the 2026-07-16 census before
anything else happens. Expected (2026-07-17 corpus; explain drift, never
force): 722 active rows / 715 unique files / 7 shared / 703 readable /
12 not-found / MIME 513-186-4 / dates 703/703. Creator side: ~453 accepted
files (~460 rows) split created/adapted per census (~13 new / ~48 copy among
multi-create; worksheet omits ~3; unmapped ~37). `writes: 0`. Note the
printed **plan_digest**.

## Step 3 — production write (Dan authorizes)

```
… same command as Step 2 plus:
  --write --i-mean-prod --confirm-token <plan_digest from Step 2>
```

The script re-derives everything, aborts on ANY divergence from the reviewed
plan, writes a private backup of all target rows first, never overwrites a
reviewer-confirmed credit, batches ≤50, exits nonzero on any error. Keep the
backup + write-result files (mode 600, in ~/Documents).

## Step 4 — verify + unblock PR-B

1. Read-only prod probes: counts of rows with dates / creator tuples match
   the write report; spot-check `search_lessons` still healthy; constraint
   count unchanged.
2. Restore the worktree `.env` to the LOCAL target.
3. Rebase `feat/drive-provenance-ui` onto `origin/main` (PR-A was
   squash-merged, so drop the duplicate `5b0a119` base — expect clean since
   PR-A landed verbatim), re-run `npm run check && npm run test:run`, push,
   open PR-B per the rollout doc (base main; body notes the backfill is done
   and "Sort: Updated" now becomes Drive-true).
4. Optional before PR-B merge: run the dates-only backfill against TEST so
   the TEST preview's Updated sort exercises real values (TEST never gets the
   prod backfill).
5. After PR-B ships: Gate 3 (DRIVE_SYNC_TOKEN + repo secrets, dispatch once,
   then uncomment the schedule).

## Hard rules carried over

Supervised local-only Activity; no scope changes; no deployed runtime use of
the supervised account; aggregate-only output (never print names/emails/file
ids); every private file mode 600 outside the repo; Dan approves every prod
gate.
