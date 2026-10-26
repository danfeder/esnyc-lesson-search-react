# Scripts Directory

Every script in this directory is either live tooling or a frozen reference input. One-off scripts were deleted in the 2026-10 sweep; git history holds them (see `## Archive` below). This file is the **keep-ledger**: a cleanup sweep must not delete anything listed here.

## Live tooling (keep-ledger)

| Script | Run via | What it does | Wired from |
|---|---|---|---|
| `import-data.js` | `npm run import-data` | Local/TEST seed import (`requireNonProd`-guarded) | `package.json` |
| `export-dev-seed.mjs` | `npm run export-dev-seed` | Regenerate the local seed from PROD; anon key, read-only | `package.json` |
| `test-rls-policies.mjs` | `npm run test:rls` (`-- --local` against a local stack) | RLS policy checks (rewritten in PR #627) | `package.json`, CI (`e2e.yml`) |
| `test-edge-functions.mjs` | `npm run test:edge-functions` | Edge-function smoke | `.github/workflows/edge-function-smoke.yml` |
| `heritage/test-heritage-expansion.mjs` + `heritage/generate-heritage-hierarchy.ts` (+ `heritage/artifacts/`) | `npm run test:heritage` | Cultural-heritage hierarchy from `data/vocab/cultural-heritage.vocab.json` | `package.json` |
| `search-eval/run-search-eval.ts` (+ `metrics.ts`, `predicate.ts`, `readonly-guard.ts`, `queries.json`, `baseline.json`, `scorecards/`) | `npm run eval:search` | Search relevance scorecards | `package.json` |
| `drive-provenance/backfill-drive-provenance.mjs`, `build-actor-map.mjs`, `lib/*`, `*.sql` assertions | `node scripts/drive-provenance/…` | Drive provenance backfill + actor sweep (Gate 2 done 2026-07-18; runbook `docs/plans/2026-07-17-backfill-session-runbook.md`) | manual, owner-supervised |
| `mirror-drift/mirror-sync-db-assertions.sql`, `mirror-drift/mirror-census.sql`, `mirror-drift/census-2026-10-22.prod.json` | `psql … -f scripts/mirror-drift/mirror-sync-db-assertions.sql` (LOCAL only, after `supabase db reset`); the census query is read-only and runs on TEST/PROD via the Supabase MCP tools | SQL tests + census for the lessons column ⇄ metadata-mirror sync (migrations `20261026004447` / `20261026004805`); the JSON is the frozen 2026-10-22 PROD census those migrations were written against | manual, owner-supervised |
| `pr-surfaces.sh` | `bash scripts/pr-surfaces.sh <PR>` | Dumps all four PR-feedback surfaces | `.claude/commands/pr-triage.md` |
| `deploy-edge-functions.sh`, `backup-database.sh`, `backup-remote-data.mjs` | manual | Deploy / backup helpers (sections below) | — |
| `build-concepts-tool.py` + `concepts-worksheet-tool.template.html` | `python3 scripts/build-concepts-tool.py --verify-only \| --build-html` | Concepts worksheet wizard (`/concepts-batch2` reopen path) | `.claude/commands/concepts-batch2.md` |
| `install_pkgs.sh`, `cloud-setup.sh` | SessionStart hook / environment setup script | npm install + Docker start in Claude Code cloud sessions only | `.claude/settings.json`; the cloud environment's Setup script field |
| `lib/require-env.mjs`, `lib/grade-levels.mjs`, `lib/evalMetrics.ts` | imported | Shared helpers (`evalMetrics` is read by `search-eval/metrics.ts`) | the scripts above |

## Data Management Scripts

### `import-data.js`
Imports lesson data from JSON files into the Supabase database.

**Usage:**
```bash
npm run import-data
```

**Required Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**What it does:**
- Reads `data/consolidated_lessons.json`
- Processes and validates lesson data
- Inserts lessons into the `lessons` table
- Updates metadata and activity types

> **Note:** `data/consolidated_lessons.json` is **gitignored** (`data/*.json`) — it is a
> local-only dev artifact, not a committed file. Generate it first with
> `npm run export-dev-seed` (below), then run `npm run import-data`.

### `export-dev-seed.mjs`
Regenerates the local dev seed (`data/consolidated_lessons.json`) from the **PRODUCTION-live**
lesson corpus, in the legacy camelCase envelope `import-data.js` consumes. Use this to refresh a
stale local seed (e.g. after a metadata change in PROD).

**Read-only by construction:** it `SELECT`s `lessons` from PROD with the **publishable (anon) key
only** — `lessons` is publicly readable under RLS. It holds no service-role credential, performs no
writes/DDL/migration, and its only output is the local seed file. It uses its own dedicated env vars
(not `VITE_SUPABASE_*`) and refuses to run against any non-PROD source (the inverse of the
`requireNonProd` guard).

**Usage (two-step local seed refresh):**
```bash
# 1. Regenerate the local seed from PROD (anon key is public — Supabase dashboard / deployed frontend)
EXPORT_SOURCE_ANON_KEY='<prod publishable anon key>' npm run export-dev-seed

# 2. Import the regenerated seed into your LOCAL/TEST DB (requireNonProd-guarded)
npm run import-data
```

**Required Environment Variables:**
- `EXPORT_SOURCE_ANON_KEY` (required) — PROD publishable/anon key
- `EXPORT_SOURCE_URL` (optional) — defaults to the known PROD project URL

## Testing Scripts

### `test-rls-policies.mjs`
Tests Row Level Security policies.

**Usage:**
```bash
npm run test:rls
```

**Required Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**What it does:**
- Tests RLS policies with different user roles
- Validates data access permissions
- Ensures security policies work correctly

## Database Scripts

### `backup-database.sh`
Creates a backup of the Supabase database.

**Usage:**
```bash
./scripts/backup-database.sh
```

**What it does:**
- Exports database schema and data
- Creates timestamped backup files
- Stores in `database-backups/` directory

### `deploy-edge-functions.sh`
Deploys edge functions to Supabase.

**Usage:**
```bash
./scripts/deploy-edge-functions.sh
```

**What it does:**
- Deploys all edge functions
- Updates function configurations
- Shows deployment status

## Reference data kept on purpose

Frozen inputs that live tests and generators still read. Do not delete or move them in a cleanup sweep; git history holds the tooling that produced them. `scripts/stage2-retag/` now holds only its `data/` files — the pipeline itself was retired in 2026-10.

| File | Why it stays | Read by |
|------|--------------|---------|
| `scripts/stage2-retag/data/c02-vocab.json` | Frozen C02 cooking-skills / main-ingredients manifest — byte-source of the Zod enums and the DB CHECK | `src/types/cookingIngredientsVocab.zod.test.ts` |
| `scripts/stage2-retag/data/smaller-fields.vocab.json` | Locked six small-field vocab — canonical targets for legacy review-row canonicalization | `src/utils/canonicalizeReviewMetadata.test.ts` |
| `data/vocab/cultural-heritage.vocab.json` | Single source of truth for the cultural-heritage hierarchy | `scripts/heritage/generate-heritage-hierarchy.ts` |
| `data/vocab/academic-concepts.vocab.json` | Frozen emitted artifact behind migrations `20260612000000_pr5b_concepts_canonicalization.sql` and `20260613000000_fold_urban_revitalization_concept.sql`; no live code reads it any more | provenance only (archived generators in `scripts/archive/` still name it) — keep |

## Archive

The `scripts/archive/` directory holds deprecated scripts kept for reference only (stale relative paths, old schema assumptions); see `scripts/archive/README.md` for the per-script ledger.

The 2026-10 scripts sweep deleted roughly 60 one-off scripts outright (duplicate-detection toolchain, embeddings pipeline, Google-Docs import one-offs, 2025-08 hash repair, superseded smoke scripts, one-off SQL, a spent codemod, the eval-data track) instead of archiving them. Git history is the durable record: recover any of them with `git show ba34cac0:scripts/<file> > scripts/<file>` (the commit the sweep branched from). The full list of deleted paths is in `scripts/archive/README.md`.

## Development Notes

### Adding New Scripts

1. Create script in appropriate category
2. Add clear documentation at the top of the file
3. Update this README with usage information
4. Add npm script to package.json if frequently used
5. Use `.mjs` extension for ES modules

### Environment Variables

Most scripts require environment variables. Always:
1. Check for required variables at script start
2. Provide clear error messages if missing
3. Never hardcode sensitive values
4. Use `.env.example` as reference

### Error Handling

All scripts should:
1. Use try-catch blocks for async operations
2. Provide meaningful error messages
3. Exit with appropriate status codes
4. Log progress for long-running operations
