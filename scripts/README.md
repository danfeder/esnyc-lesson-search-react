# Scripts Directory

This directory contains utility scripts for managing the ESYNYC Lesson Search application.

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

### Search sync (legacy)
Algolia sync and configuration scripts have been removed as the project now uses PostgreSQL full‑text search. There is nothing to run and no script reads an Algolia environment variable. If search sync is needed in the future, prefer SQL functions or Edge Functions.

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

## Archive Directory

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
