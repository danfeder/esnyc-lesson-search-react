# Brief t4c — Dedup retire migration (Opus executor)

**Read first:** `2026-07-02-t4-dedup-design-decisions.md` (esp. D5, D6),
`2026-07-02-t4-status.md`, and `docs/plans/t4-dedup/decisions.json` (the walkthrough
artifact — every verdict in it was user-confirmed live on 2026-07-02; **it is the single
source of truth for who gets retired**). You write one migration + its PR. You make NO
judgment calls about which lessons to retire: the list is closed. If anything makes the list
look wrong, STOP and report — do not adjust it.

## The numbers (pre-registered from the walkthrough session, PROD-probed 2026-07-02)

- **61 lessons to retire**, from **57 groups**: 39 `retire_duplicate` groups (1 retired each)
  + 18 `keep_family` groups that had an exact-copy pair embedded — **22 retired rows** from
  those 18 (4 of them retire 2 apiece). (39 + 22 = 61.) Earlier drafts of this line said
  "39 + 22 groups"; the accurate breakdown is 57 groups / 61 rows, matching decisions.json
  and the migration header.
- All 61 verified against PROD on 2026-07-02: all exist in `lessons`, all currently live
  (`retired_at IS NULL`), none already retired. Live corpus at probe time: **764**.
- Post-migration PROD expectation: live corpus **703** (764 − 61). 250 survivors named in
  decisions.json all stay live.

## Deliverables (branch `feat/t4c-dedup-retire`, one PR)

1. One migration file `supabase/migrations/<version>_t4_dedup_retire.sql` + matching
   `.sql.rollback` file (repo convention — see existing `*.sql.rollback` examples).
2. A tiny generator script `scripts/dedup-sweep/generate-retire-migration.mjs` that reads
   decisions.json and emits the migration's VALUES list — committed so the loser list is
   reproducible from the artifact. **Never hand-type a lesson_id anywhere.**
3. The PR rides on whatever walkthrough-session docs are already committed on local `main`
   (decisions.json, this brief, tracker/status updates, `record-decisions.mjs`). Do NOT
   sweep unrelated untracked docs into it.

**Migration naming:** use a full timestamp version (e.g. `2026070XHHMMSS_`) that sorts AFTER
`20260702150000_lock_down_invitation_token_access.sql`. Never a bare-date `YYYYMMDD_` name
(ASCII sort gotcha). Use the `database-migrations` skill / `/new-migration` before creating
the file.

## Migration content (D5 — imports-cleanup pattern, never DELETE)

Model it on the imports-cleanup precedent (`supabase/migrations/202605200*`): same
snapshot-table + soft-retire shape.

1. **Rollback snapshot table** `t4_dedup_retire_rollback` created in the same migration:
   `lesson_id`, `prior_retired_at`, `prior_retired_reason`, `group_id`, `snapshotted_at`.
   Insert the 61 target rows' current state BEFORE the update. Leave the table in place
   after (dropping it is post-launch hygiene, out of scope).
2. **Soft-retire update:** for each of the 61, `SET retired_at = now(),
   retired_reason = 'dedup:<group_id>'` where `<group_id>` is that lesson's group in
   decisions.json (e.g. `dedup:fattoush-8c6942`). Generate the (group_id, lesson_id) pairs
   with the generator script; the authoritative extraction is:
   `jq -r '.groups[] | .group_id as $g | .retired[] | [$g, .lesson_id] | @tsv' docs/plans/t4-dedup/decisions.json`
3. **In-migration guards** (DO block, hard failures):
   - Target list must contain exactly 61 distinct IDs (compile-time property of the file).
   - Refuse to run if ANY target row is already retired (`retired_at IS NOT NULL`) — that
     signals double-apply or drift; abort, never overwrite an existing retired_reason.
   - After the UPDATE, assert affected rows == number of target rows found in this
     database (see TEST note below), and assert zero survivors were touched (the update's
     WHERE is the ID list, but assert anyway by checking none of the 250 survivor IDs has
     `retired_reason LIKE 'dedup:%'`). Survivor IDs also come from decisions.json
     (`.groups[].survivors[].lesson_id`) via the generator — don't hand-type.
4. **`.rollback` file:** restore `retired_at`/`retired_reason` from
   `t4_dedup_retire_rollback` for exactly those 61 IDs, then (optionally) drop nothing.

**Why not exact-61 as an in-migration assert everywhere:** TEST's `lessons` table may not
contain all 61 rows. The migration must assert "all targets present in THIS db were live and
are now retired, and nothing else changed" — the exact-61 check is an environment-level
verification step (below), hard-asserted only where the pre-registered count applies (PROD).

## Sequence + verification (3-tier, data-safety rules)

1. **Local:** `supabase db reset` clean, `npm run test:rls` green, `npm run check` +
   `npm run test:run` green.
2. **TEST rehearsal (before merge):** BEFORE relying on CI, probe TEST read-only: how many
   of the 61 IDs exist and are live there? Pre-register that number in the PR description.
   After CI applies the migration to TEST, verify with `mcp__supabase-test__execute_sql`:
   retired count matches the pre-registered number, rollback table populated to match, zero
   survivors retired, `search_lessons` on TEST returns no `dedup:%`-retired rows. Re-run
   this verification after ANY later fix-up commit that touches the migration.
3. **PROD gate: USER-ONLY.** Never approve the GitHub Actions production gate yourself.
   After the user approves and it applies, verify on PROD (`mcp__supabase-remote__execute_sql`,
   read-only):
   - `SELECT count(*) FROM lessons WHERE retired_at IS NULL` → exactly **703**
   - all 61 have `retired_reason LIKE 'dedup:%'`; rollback table has 61 rows
   - zero survivor IDs retired
   - spot search: `search_lessons` for 'fattoush' returns the 2 kept Fattoush lessons and
     neither 1,008-char stub; a retired lesson is still reachable via `lessons_with_metadata`
     by direct id (D5: retired rows stay linkable)
   - report the verification queries + raw results in the PR (census-provenance rule).

## STOP conditions

- Any of the 61 already retired on PROD at apply time, or PROD live count ≠ 764 right
  before merge (re-probe; the corpus may have drifted since 2026-07-02 — report, ask user).
- decisions.json integrity check fails: retired list ≠ 61 unique IDs, or any ID appears in
  both a `retired` and a `survivors` array (`jq` check — it passed 2026-07-02).
- TEST rehearsal count ≠ the pre-registered TEST expectation, or any survivor retired
  anywhere.
- Anything requiring a schema change beyond this one migration — out of scope, report.

Out of scope for t4c: family labels (recorded in decisions.json for the post-sprint
families project — no DB writes for them), detect-duplicates changes (t4b), dropping
rollback/history tables (post-launch).
