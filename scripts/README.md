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

### Search sync (legacy)
Algolia sync and configuration scripts have been removed as the project now uses PostgreSQL full‑text search. If search sync is needed in the future, prefer SQL functions or Edge Functions.

**Usage:**
```bash
node scripts/remove-algolia.js
```

**Required Environment Variables:**
- `VITE_ALGOLIA_APP_ID`
- `ALGOLIA_ADMIN_API_KEY`

## User Management Scripts

### `create-reviewer-profile.js`
Creates reviewer profiles for admin users.

**Usage:**
```bash
node scripts/create-reviewer-profile.js
```

**Required Environment Variables:**
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**What it does:**
- Creates user profiles with reviewer role
- Sets up necessary permissions
- Useful for onboarding new reviewers

### `create-test-profiles.js`
Creates test user profiles for development.

**Usage:**
```bash
node scripts/create-test-profiles.js
```

**Required Environment Variables:**
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**What it does:**
- Creates test users with different roles
- Useful for testing authentication and permissions

### `fix-rls-policies.js`
Fixes Row Level Security policies in the database.

**Usage:**
```bash
node scripts/fix-rls-policies.js
```

**Required Environment Variables:**
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**What it does:**
- Updates RLS policies on all tables
- Ensures proper security configuration
- Run after database schema changes

## Testing Scripts

### `test-edge-function.js`
Tests Supabase Edge Functions locally.

**Usage:**
```bash
node scripts/test-edge-function.js [function-name]
```

**Required Environment Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**What it does:**
- Invokes edge functions with test data
- Validates response format
- Useful for debugging edge functions

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

## Analysis Scripts

### `analyze-content-quality.mjs`
Analyzes the quality of lesson content.

**Usage:**
```bash
node scripts/analyze-content-quality.mjs
```

**What it does:**
- Checks for missing metadata
- Identifies incomplete lessons
- Generates quality report

### `analyze-duplicates.mjs`
Analyzes potential duplicate lessons.

**Usage:**
```bash
node scripts/analyze-duplicates.mjs
```

**What it does:**
- Identifies similar lessons
- Generates duplicate analysis report
- Helps with content curation

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

The `scripts/archive/` directory contains deprecated scripts kept for reference:
- `debug-edge-function.mjs` - Old edge function debugger
- `debug-user-email.sql` - SQL queries for debugging user emails

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
