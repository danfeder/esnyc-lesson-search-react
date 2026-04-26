# Orphan recovery scripts

Recovery work for the 30 approved-but-unpublished lesson submissions surfaced by the 2026-04-26 audit. See `~/.claude/plans/lesson-submission-tier1-implementation.md` for the full plan.

## Structure

```
scripts/orphan-recovery/
├── README.md                       # this file
├── .gitignore                      # snapshots/ and dryrun-artifacts/ contents excluded
├── snapshots/                      # full-row pre-state snapshots (LOCAL ONLY)
│   └── .gitkeep
├── dryrun-artifacts/               # script dry-run outputs (LOCAL ONLY)
│   └── .gitkeep
└── (scripts added per phase)
```

## Conventions

- **Recovery scripts are plan-only.** They read PROD via Supabase JS (service-role + `--i-mean-prod`) and emit three artifacts in `dryrun-artifacts/`: a JSON manifest with an `artifact_hash`, a rehearsal `.sql` file that wraps the operation in `BEGIN; … ROLLBACK;`, and a commit `.sql` file that wraps the same operation in `BEGIN; … COMMIT;`. The two SQL files differ in exactly one line — the final `ROLLBACK;` vs `COMMIT;` terminator — because both are emitted by the same `buildSql()` call on the same inputs. Single source of truth; no composition gap between rehearsal and commit. The actual prod write is executed by running these SQL files via `mcp__supabase-remote__execute_sql`.
- **Snapshots are full-row** (`select *` from the affected table) so undo doesn't drift if columns get added later.
- **Snapshots and dry-run artifacts are never committed** — they contain teacher-submitted content. Storage is local-only; back up manually to a private location after each batch if you want off-machine durability.
- **Smallest blast radius first.** Category A (audit-only FK updates) → Category B-new (INSERTs) → Category B-update (UPDATEs on live lessons, one row at a time).

## Phase coverage

| Phase | Script | Status |
|-------|--------|--------|
| 2 — Category A FK backfill | `phase-2-category-a-backfill.ts` | Plan-mode ready |
| 5 — Category B-new publish | `phase-5-b-new-publish.ts` | TBD |
| 6 — Category B-update merge | `phase-6-b-update-merge.ts` | TBD |

## Phase 2 sizing (verified against PROD on the day this script was added)

The 30 approved orphans split as:

- **17 auto-batch candidates** — submission's google_doc_id maps to exactly one lessons row, and that lessons row's metadata is intact. Phase 2 backfills `lessons.original_submission_id` for these.
- **2 held-out** — see below; need a human decision.
- **11 unmatched** — no lessons row references the submission's doc-id. These are Phase 5/6 work (B-new publish or B-update merge), not Phase 2.

(The original 2026-04-26 audit estimated 16 / 7 / 7. The split shifted because the audit categorized B-update vs B-new by title similarity, while the actual data has 3 more orphans that share the existing lesson's doc-id outright — they belong in Category A.)

## Held-out items requiring manual review

These two orphans have a doc-id match to the library but fail the auto-batch safety checks; they need a human decision before any FK link.

- **"Applesauce lesson plan"** (submission `ea271d13-78db-437c-aa9f-594ce567f90c`): the submission's google_doc_id (`1hwLrvv9CUTx2rw2UMTDhqmLXQTd0hEsxan3HvNpPwa8`) appears in **two** lessons rows in the library — `1hwLrvv9...` (titled "Applesauce", 2025-07-10) and `lesson_79f89defede54a1e87632373e74486a5` (titled "Applesauce", 2025-09-01, file_link points at the same Google Doc). A third lessons row, `1NR0Ov_Rc7yIHDngUv2UrHzIiqDkMt298x8Nfcw6hl4c` titled "Applesauce Lesson Plan" (2025-07-10), is an exact-title match via a different doc. Three plausible link targets; the two doc-id-sharing rows are also a separate library duplicate-data issue. Eyeball all three Google Docs and decide.
- **"Green 'Acai' Bowls (Mobile Education)"** (submission `16603243-0eed-4cc8-886f-f9c37d25276f`): doc-id matches a single lessons row (`11oY-EaKF7FTeNxSE_xbsCmSytnBmjc9WPlyBF11Chz0`), but that row is **broken** — `title='Unknown'`, `summary='Error processing lesson'`, and `content_text` describes "Rainbow Smoothies" (high school, indoor) rather than the submission's apparent topic. The lesson row's metadata extraction failed; backfilling the FK to a broken row would establish an audit link to data that needs separate cleanup. Hold until the lesson row is reprocessed.

Also flagged for Phase 6 (B-update merge) eyeball, not Phase 2:

- **"Lunar New Year Lesson 25-26" → "Lunar New Year and Dumplings"** (title similarity 0.359): mapping confidence is low. Mark as eyeball-required in the Phase 6 mapping file before any merge.
