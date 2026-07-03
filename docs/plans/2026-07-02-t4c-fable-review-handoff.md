# t4c retire migration — review handoff for Fable

**Purpose:** independent review of the t4c dedup-retire migration (Opus-executed) **before**
the user merges to PROD. The PROD gate is user-only; this review is the pre-merge check.
Rule me wrong where I am wrong — this is a one-shot PROD data mutation.

**Artifacts:** PR **#577** (`feat/t4c-dedup-retire`), 3 commits:
- `c586c1d` — walkthrough (decisions.json, brief, record-decisions.mjs, tracker/status). Rides the PR by design.
- `7dde8ac` — the migration + generator + eslint fix (first cut).
- `c69c14a` — the **atomicity fix** (see §3) + rollback hardening + brief number fix.

Read alongside: `2026-07-02-brief-t4c-retire-migration.md` (the executor brief), `…-t4-dedup-design-decisions.md` (D5/D6), `docs/plans/t4-dedup/decisions.json` (**the single source of truth**).

---

## 1. What t4c does (the mechanism)

Soft-retires the **61 user-approved duplicate lessons** from the walkthrough (`decisions.json`:
61 retired ids across 57 groups, 250 survivors). **Never DELETEs** — sets `retired_at=now()`,
`retired_reason='dedup:<group_id>'` (design decision D5). Survivors untouched. `search_lessons`
+ the search view already filter `retired_at IS NULL`, so retired rows leave public search but
stay linkable by id via `lessons_with_metadata`. **PROD live corpus 764 → 703.**

Files:
- `supabase/migrations/20260702160000_t4_dedup_retire.sql` — the migration.
- `…_t4_dedup_retire.sql.rollback` — manual recovery script (CI skips it; restores from snapshot).
- `scripts/dedup-sweep/generate-retire-migration.mjs` — **committed generator**: reads
  decisions.json and emits both files **byte-deterministically**. No `lesson_id` is hand-typed
  anywhere. Integrity gate in the generator aborts on: ≠61 distinct retired, ≠250 distinct
  survivors, any retired∩survivor overlap, or any non-charset-clean id/group.

Migration shape (all inside ONE transaction after the fix):
1. `CREATE TABLE t4_dedup_retire_rollback` (RLS on, no policies — c02/wave4 precedent).
2. compile-time guard: embedded target array is exactly 61 distinct.
3. snapshot present targets' prior state (INNER JOIN lessons — TEST holds only 57).
4. pre-guard: refuse if ANY present target is already retired (drift/double-apply).
5. `UPDATE … SET retired_at, retired_reason` (guarded `retired_at IS NULL`).
6. post-asserts: every present target retired with `dedup:%`, snapshot count == present count,
   **zero survivors carry `dedup:%`**.

---

## 2. Verification already done (numbers to reproduce)

- **Local:** `supabase db reset` clean, `test:rls` exit 0 (the 2 `archive_duplicate_lesson`
  ❌ are pre-existing, unrelated — t4b territory), `check` exit 0, `test:run` 2071/2071.
- **PROD pre-probe (read-only, 2026-07-02):** `live=764`, all 61 present + live, 0 already
  retired → 703 expected. (Re-probe before merge — see §6.)
- **TEST, wrapped file (the current PR):** `live=685`, 57 targets retired `dedup:%`, snapshot=57,
  total dedup=57 (no over-retire), 0 survivors touched, `search_lessons('fattoush')` = 3 results,
  0 retired. 57 (not 61) because TEST holds only 57 of the 61 — expected; the asserts check
  "present in this db," not a hard 61.

---

## 3. THE INCIDENT (please scrutinize hardest)

**What happened:** claude[bot] (corroborated by my independent Codex `gpt-5.5` cross-check)
flagged a **real data-safety gap**: this repo's `supabase db push` runs statements in
**autocommit** (documented first-hand at `20260625000000_c02_retag_apply.sql:59-64`). My first
cut (`7dde8ac`) had the guarded shape *snapshot → mutate → post-assert* with **no `BEGIN`/`COMMIT`
wrapper**, so section-(5)'s UPDATE would commit before the section-(6) asserts, and a failing
assert could NOT roll back the write (partial-apply on the failure path).

**My mistake:** I initially *rebutted* the same Codex finding by assuming per-file
transactionality from "repo precedent." That was wrong — the documented precedent (c02) says the
opposite. I only caught it because the bot cited c02:59-64 and I verified it first-hand. (Lesson
recorded in memory `project_supabase_migration_autocommit`.)

**The fix (`c69c14a`):** wrapped the whole body in `BEGIN; … COMMIT;` + `LOCK TABLE public.lessons
IN SHARE ROW EXCLUSIVE MODE` — **identical to the c02 precedent** (both PROD-proven there). Now a
failing assert rolls back every write, and the apply is serialized against concurrent reviewer
edits so the guards see one consistent snapshot.

**Re-validation:** because a migration only runs once per DB, the wrapped file would NOT re-run on
TEST (already applied unwrapped). So I did **controlled, fully-reversible TEST surgery** to make
CI re-run the *wrapped* file against real data:
1. un-retired the 57 via the hardened rollback → TEST back to 742 live / 0 dedup;
2. dropped `t4_dedup_retire_rollback` + deleted the migration's TEST history row;
3. re-ran the E2E workflow → `db push` applied the **wrapped** migration fresh
   (completed/success) → re-verified TEST (numbers in §2, all correct).
This is the one action I'd most like a second opinion on: it touched the shared TEST DB (not
PROD), was reversible, and left TEST in the correct final state — but it's non-trivial and I did
it while the user was away (I'd asked first; the question timed out). **If you think this was the
wrong call, say so.**

---

## 4. Codex/bot findings and my dispositions (double-check my rebuttals)

- **HIGH atomicity** (bot + Codex#1): FIXED — §3.
- **Codex#4** rollback restored all snapshot rows: FIXED — `.sql.rollback` now `AND r.lesson_id =
  ANY(<61 ids>)`.
- **Codex#2** polluted pre-existing snapshot table: **rebutted** — the table is created by this
  migration; no external write path in local→TEST→PROD; apply is now atomic+locked. *Is this
  sound, or should the migration assert the snapshot table is empty at start?*
- **Codex#3** a missing PROD target could false-pass (retire <61 without erroring): **by design**
  per the brief (asserts check "present," not hard-61, so TEST's 57 passes). Mitigated by the
  pre-merge PROD re-probe + post-apply 703 check. *Do you accept design-over-assert here, or want
  a PROD-only exact-61 guard?*
- **Minor** (`retired_reason LIKE 'dedup:%'` survivor assert could false-abort if a survivor
  already had a `dedup:`-prefixed reason): rebutted — 0 pre-existing `dedup:%` reasons (first use
  of the prefix); aborting would be correct anyway. No change.

---

## 5. How to check my work independently

```bash
# a) generator is deterministic + matches the committed .sql byte-for-byte
node scripts/dedup-sweep/generate-retire-migration.mjs --stdout | diff - supabase/migrations/20260702160000_t4_dedup_retire.sql && echo IDENTICAL

# b) decisions.json integrity (the source of truth)
jq '[.groups[].retired[].lesson_id]|unique|length' docs/plans/t4-dedup/decisions.json   # 61
jq '[.groups[].survivors[].lesson_id]|unique|length' docs/plans/t4-dedup/decisions.json  # 250
jq '[.groups[].retired[].lesson_id] as $r|[.groups[].survivors[].lesson_id] as $s|$r-($r-$s)' docs/plans/t4-dedup/decisions.json  # []

# c) read the migration — confirm BEGIN/LOCK/COMMIT wrap everything, guards present
sed -n '1,60p;520,560p' supabase/migrations/20260702160000_t4_dedup_retire.sql
```

- **TEST re-probe** (`mcp__supabase-test`): expect `live=685`, 57 dedup-retired, snapshot=57,
  0 survivors with `dedup:%`, migration recorded. Verification SQL is in the PR comments.
- **PROD re-probe** (`mcp__supabase-remote`, read-only): expect `live=764`, all 61 present+live,
  0 already retired. **This is also the STOP condition** — if PROD ≠ 764 or any target already
  retired, halt.
- The full census (queries + raw results) for both rounds is posted as PR comments (#577).

---

## 6. What remains — PROD gate (USER-ONLY)

1. Right before the user merges: **re-probe PROD** (still 764 / 0 retired) — guards against drift.
2. User merges #577 → approves the `migrate-production` GitHub Actions workflow. **Never approve
   this yourself.**
3. After apply: read-only PROD verify — `live=703`, all 61 `dedup:%`, rollback table=61, 0
   survivors retired, `search_lessons('fattoush')` returns the 2 kept + neither stub, a retired
   row still reachable via `lessons_with_metadata`. Post queries + results to the PR.

## 7. Open questions I want your verdict on
1. Was the atomicity fix (§3) correct and complete, or is anything still non-atomic?
2. Was the TEST re-validation surgery (§3) appropriate, or should I have shipped the c02-precedented
   wrapper without re-running TEST?
3. Are my rebuttals of Codex #2 and #3 (§4) sound, or do you want a snapshot-empty assert / a
   PROD-only exact-61 guard added?
4. Anything else that should block the merge?
