# Drive provenance — staged rollout plan (2026-07-17, rev 2 after Codex review)

The Drive-provenance feature branch (`feat/drive-provenance`) ships all code,
schema, tooling, and tests, but nothing is operationally enabled. Codex's
review (2026-07-17) established that a single-PR rollout is not
production-safe: the frontend deploys automatically on merge while the
production migration waits on manual approval, and the Drive-based sort is
meaningless before the backfill populates the columns. The rollout is
therefore **two PRs with the supervised backfill between them**.

## Why two PRs (the failure modes a single PR creates)

1. Frontend deploys on merge (`ci.yml`); the prod migration needs manual
   approval (`migrate-production.yml`). In that window a deployed
   `useLessonById` selecting `drive_*` columns errors on every deep link.
2. A deployed reviewer creator form + old backend would accept creator credit
   whose publication silently no-ops (the choice survives only in
   `tagged_metadata`).
3. Switching "Sort: Updated" to `drive_modified_at` before the backfill sorts
   an all-NULL column — effectively title order under an "Updated" label.

## PR-A — backend, additive only (safe with the OLD frontend)

Contains everything EXCEPT public/reviewer UI surfaces and the sort switch:

- Migration `20260717144705_drive_provenance_columns_and_rpcs.sql`: columns,
  CHECKs, indexes, provenance-aware `complete_review_atomic`, `search_lessons`
  with the six new result columns but the **`modified` sort still on
  `updated_at`** (deliberate — see header comment).
- Edge: `extract-google-doc` (fail-soft `driveMetadata`; native id/MIME kept
  even when the dates fetch blips), `process-submission` (+
  `driveMetadataUpdate.ts`), `_shared/driveProvenance.ts`,
  `_shared/google-drive-metadata.ts`, `_shared/metadataSchemas.ts` (schema
  accepts creator keys nobody sends yet), `sync-drive-metadata/*`.
- Tooling/config: `scripts/drive-provenance/*`,
  `.github/workflows/sync-drive-metadata.yml` (dispatch-only),
  `src/utils/driveProvenance.ts` + its tests (shared helpers; no UI consumer
  changes), this doc.
- Generated types: `src/types/database.types.ts` — ships in PR-A so the
  repository's types match migration A before PR-B consumes them. The file is
  identical whether or not migration B is applied (B changes only an ORDER BY
  inside the function body, never a signature or return type), so the
  A+B-generated copy on this branch is byte-correct for PR-A.

Old frontend + PR-A backend is fully compatible: `search_lessons` keeps its
signature and sort semantics; extra result columns are ignored by the old
mapper; the RPC accepts creator keys that no deployed client sends.

**PR-A gate sequence:** CI applies the migration to TEST → verify on TEST with
`mcp__supabase-test__execute_sql` (columns exist; `search_lessons` returns 15
columns; `order_by => 'modified'` still equals the pre-provenance order) →
E2E green → merge → **approve the production migration** → deploy the edge
functions (`extract-google-doc`, `process-submission`, `complete-review`,
`sync-drive-metadata`). No new scopes; do NOT add `drive.activity.readonly`
to any deployed secret/scope.

Optionally after PR-A: dispatch the `Sync Drive Metadata` workflow (once its
secrets exist — see Gate 3) or wait for the backfill to populate dates.

## Gate 2 — one-time supervised historical backfill (owner present)

**Status: ✅ COMPLETED 2026-07-18** (owner-supervised; digest `5c482c7b…`
authorized and matched at write time). Outcome, PROD-verified read-only:
722 active rows → 710 written with dates/metadata, **439 creator-attributed**
(90 created / 349 adapted), 12 untouched (Drive 404s); 34 mapped actors,
8 unresolved former-staff groups omitted; 21 same-millisecond copy/edit tie
files conservatively omitted (owner-ruled — census had over-counted these).
`updated_at` unperturbed, so the interim public sort was unaffected. Private
backup + reports retained mode-600 outside the repo. The Activity-scoped
impersonation is OVER; this gate is a historical record and must not be rerun.
Full session detail: `2026-07-17-backfill-session-runbook.md`.

**Step 0 — regenerate the private actor map** (the investigation persisted
only aggregates; no `people/NNN → email` artifact exists on disk). Run
`scripts/drive-provenance/build-actor-map.mjs` with the primary supervised
Activity subject plus each approved worksheet account as a `--sweep-subject`:
Drive Activity marks the querying identity's own actions `isCurrentUser`, so
sweeping the approved accounts over still-unresolved files identifies each
actor id within the existing scopes (no People API). Local-only, read-only,
writes exactly the private map file (mode 600, outside the repo); actors that
resolve to no sweep account (e.g. former staff) stay unresolved and omit
downstream — correct per the acceptance rules.

Then, operator-run, local machine only, `scripts/drive-provenance/backfill-drive-provenance.mjs`:

1. Full creator dry-run — requires the COMPLETE input set (`--activity-subject`
   + both `--worksheet`s + a validated non-empty `--actor-map` of
   personName→account email); a dates-only run must say `--dates-only`
   explicitly. Corpus from the target DB (not `--lessons-json`). The dry-run
   prints a **`plan_digest`** binding target project + corpus + private-input
   hashes + every intended per-row update.
2. Owner reviews the aggregate report; counts must reconcile with the
   2026-07-16/17 census (explain drift, never force it).
3. Production write: `--write --i-mean-prod --confirm-token <plan_digest>`.
   The script recomputes the digest from its own fresh evidence and aborts on
   ANY divergence; it backs up all target rows' current `drive_*` columns
   first (mode 600), never overwrites a `reviewer_confirmed` tuple, only
   touches creator columns on an explicit creator-mode decision, writes in
   ≤50 batches, and exits nonzero on any API/validation/write error (non-404
   API failures abort before any write).
4. The Activity-scoped impersonation ends with this run. It never becomes
   deployed runtime behavior.

## PR-B — public surfaces + Drive-true sort (after the backfill)

- Migration `20260717174811_drive_modified_sort_switch.sql`: `search_lessons`
  `modified` sort → `drive_modified_at DESC NULLS LAST` (drops the
  `updated_at` exposure). Ships only now because the corpus is populated.
- Frontend: `src/types/index.ts` Lesson fields, `useLessonSearch.ts` /
  `useLessonById.ts` provenance mapping/select, `IntLessonDetail.tsx` +
  `internal.css` drawer block, `ReviewMetadataForm.tsx` creator section,
  `ReviewDetail.tsx` save normalization, `reviewDetailHelpers.ts` labels,
  `reviewFormPayload.zod.ts` (already mirrored on the edge in PR-A), plus the
  UI/hook/form tests and `factories.ts`.

The only PR-B deploy gap: until its prod migration is approved, "Sort:
Updated" briefly keeps the old `updated_at` meaning (current behavior — no
breakage); the by-ID provenance select is safe because PR-A's columns exist.

**PR-B gate sequence:** CI→TEST (verify sort order on TEST data) → merge →
approve production migration.

## Gate 3 — enable the permanent date refresh

**Status: ✅ COMPLETED 2026-07-18.** A dedicated 256-bit token was installed
as the production Edge secret and matching GitHub Actions secret; the function
URL repo secret was installed separately. Manual workflow run
[`29630901437`](https://github.com/danfeder/esnyc-lesson-search-react/actions/runs/29630901437)
processed all 722 active rows: 710 updated, 12 unreadable Drive files preserved,
0 transient failures, and 0 unresolvable rows. Read-only production verification
confirmed all 710 readable rows received a fresh sync timestamp and the 439
creator attributions were unchanged. The daily 08:30 UTC schedule is enabled
in the workflow-only PR; manual dispatch remains available.

Completed steps:

1. Generated a strong random token and installed it as edge secret `DRIVE_SYNC_TOKEN`.
2. Installed repo secrets `SYNC_DRIVE_METADATA_URL` + `DRIVE_SYNC_TOKEN`.
3. Manually dispatched `Sync Drive Metadata`; confirmed totals (processed ≈ active
   corpus; transient=0; unresolvable surfaced as a warning).
4. Enabled the `schedule:` block in the workflow for the once-daily refresh.

## Explicitly out of scope / never

- No Drive Activity in deployed runtime; no scope expansion.
- The long-tenured employee account is never a deployed runtime identity.
- Creator columns are never written by the refresh path — reviewer
  confirmation and the one-time supervised backfill are the only writers, and
  the backfill never overwrites a reviewer confirmation.
