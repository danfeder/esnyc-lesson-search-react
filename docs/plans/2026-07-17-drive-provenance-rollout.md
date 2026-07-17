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

Operator-run, local machine only, `scripts/drive-provenance/backfill-drive-provenance.mjs`:

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

1. Generate a strong random token; install as edge secret `DRIVE_SYNC_TOKEN`.
2. Install repo secrets `SYNC_DRIVE_METADATA_URL` + `DRIVE_SYNC_TOKEN`.
3. Manually dispatch `Sync Drive Metadata`; confirm totals (processed ≈ active
   corpus; transient=0; unresolvable surfaced as a warning).
4. Uncomment the `schedule:` block in the workflow (small separate PR) for
   the once-daily refresh.

## Explicitly out of scope / never

- No Drive Activity in deployed runtime; no scope expansion.
- The long-tenured employee account is never a deployed runtime identity.
- Creator columns are never written by the refresh path — reviewer
  confirmation and the one-time supervised backfill are the only writers, and
  the backfill never overwrites a reviewer confirmation.
