# ESYNYC Lesson Search v2

## Quick Commands

```bash
# Development
npm run dev               # Start dev server (localhost:5173)
npm run type-check        # Required before commits
npm run lint:fix          # Auto-fix ESLint issues
npm run test:run          # Run all tests once (plain `npm run test` is vitest WATCH mode — it never exits; do not use in agents/CI)
npm run check             # type-check + lint in one shot (the mandated pre-PR pair)
npm run build             # Production build

# Database
npm run test:rls          # Test RLS policies (run after migrations)
npm run import-data       # Import lesson data to Supabase
supabase db push          # Apply migrations
supabase db reset         # Reset database

# E2E Tests
npm run test:e2e          # Run E2E tests (Playwright auto-starts the dev server; see playwright.config.ts webServer)
npm run test:e2e:headed   # Run with visible browser
npm run test:e2e:ui       # Run with Playwright UI
```

## Database: 3-Part Pipeline

**IMPORTANT: Read `supabase/migrations/CLAUDE.md` (the canonical guide) before making ANY database changes, and use the `database-migrations` skill before editing any migration file.**

| Environment | Project | Purpose |
|-------------|---------|---------|
| **Local** | Docker | Development & testing |
| **Test** | `rxgajgmphciuaqzvwmox` | CI validation (automatic) |
| **Production** | `jxlxtzkmicfhchkhiojz` | Live site (requires approval) |

### Two Types of Database Changes

| Type | How to Make Changes |
|------|---------------------|
| **Schema** (tables, columns, RLS, indexes) | Create migration file → PR → CI tests → Merge → Approve |
| **Data** (rows, content fixes) | Use MCP tools directly (careful with production!) |

### Schema Change Workflow

```
1. Create migration:   touch supabase/migrations/$(date +%Y%m%d)_description.sql
2. Test locally:       supabase db reset && npm run test:rls
3. Create PR:          Migrations auto-apply to TEST DB, E2E tests run
4. **TEST ON TEST DB:** Use mcp__supabase-test__ tools to verify changes with real data
5. Merge to main:      Production workflow triggers
6. Approve:            Manual approval in GitHub Actions
7. Applied:            Migrations run on production
```

### MCP Tools

```
LOCAL:      mcp__supabase__execute_sql        (use freely)
TEST:       mcp__supabase-test__execute_sql   (verify PR changes with real data)
PRODUCTION: mcp__supabase-remote__execute_sql (be careful!)
```

**MANDATORY: Before merging any PR with database changes:**
1. Wait for deploy preview to be live (CI applies migrations to TEST DB)
2. Use `mcp__supabase-test__execute_sql` to verify changes work with real data
3. Test any new functions, RLS policies, or schema changes directly

**NEVER use `mcp__supabase-remote__apply_migration` for schema changes!**
Schema changes must go through migration files and the CI pipeline.

### Key Commands

```bash
supabase start          # Start local DB
supabase db reset       # Reset local DB with all migrations
npm run test:rls        # Test RLS policies
supabase migration list # Show migration status
```

### See Also

- `supabase/migrations/CLAUDE.md` - Canonical detailed guide (full workflow, iteration/baselining, troubleshooting, templates)
- `.claude/skills/database-migrations/SKILL.md` - **Mandatory** decision tree before editing any migration ("has it been pushed?")

## E2E Testing

E2E tests run in CI on every PR using Playwright against Netlify deploy previews.

**CI Pipeline**: PR → Migrations applied to test DB → Netlify builds preview → E2E tests run → Must pass to merge

## Claude Code Cloud Sessions

Cloud sessions clone `main` fresh into an Anthropic-hosted VM. The `esynyc-lessonsearch` cloud environment sets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to the **TEST** project (never production, never a service-role key). Its setup script is kept in `scripts/cloud-setup.sh`; paste that file into the environment's Setup script field whenever it changes. At session start the SessionStart hook (`.claude/settings.json` → `scripts/install_pkgs.sh`) runs `npm ci` if `node_modules` is missing and starts the Docker daemon.

- **Local Supabase stack works in the cloud, minus edge functions:** `supabase start -x edge-runtime`. The edge-runtime container cannot trust the sandbox's outbound TLS proxy, so edge functions can only be run on a developer machine.
- **RLS tests against that stack:** `npm run test:rls -- --local` reads the local URL and keys from `supabase status`. Without `--local` the script reads `.env` / environment variables, which in the cloud point at TEST and lack the service-role key, so it refuses to run.
- **Not available in the cloud:** `.env` files, the developer's global CLAUDE.md, memory, and plugins. The repo's CLAUDE.md, `.claude/commands`, `.claude/skills`, and `.mcp.json` do load.

## Pre-PR Checklist (MANDATORY)

**Before pushing any branch or creating a PR, ALWAYS run:**

```bash
npm run check     # = type-check + lint
```

If lint errors exist, fix with `npm run lint:fix` then re-run the check.

This catches issues that CI will fail on (like `sessionStorage` → `window.sessionStorage`).

The full local validation loop — `npm run type-check`, `npm run lint`, `npm run test:run` — is fast (all three finish in well under a minute on the full suite), so there's no reason for an agent to skip any of them or hedge. Run all three.

## Core Constraints

| Rule | Details |
|------|---------|
| **Filters** | Filter categories defined in `filterDefinitions.ts` - consult stakeholders before changes |
| **Logging** | Use `logger.debug()` from `@/utils/logger`, not `console.log` |
| **Env Vars** | Frontend vars require `VITE_` prefix |
| **Imports** | Use `@/` path aliases, not relative paths |
| **Pre-commit** | `npm run type-check` and `npm run lint` must pass |
| **RLS Testing** | Run `npm run test:rls` after any database migration |

## Filter Categories

Defined in `src/utils/filterDefinitions.ts`. Consult stakeholders before adding or removing filters.

Each filter declares its own type in `src/utils/filterDefinitions.ts` (`single` | `multiple` | `hierarchical` | `creatable`) — **treat that file as authoritative; do not trust an inlined list here.** As of 2026-07, only **Cultural Heritage** is hierarchical (parent selection includes all children); every facet filter — including **Location** — is multi-select in the public search UI. (FP-18: Location's search sidebar renders two friendly checkboxes, "Indoor-friendly / Outdoor-friendly", from `SEARCH_LOCATION_OPTIONS` and folds the stored `Both` value into both server-side; the **reviewer** metadata form still renders Location as a single-select over the literal `Indoor`/`Outdoor`/`Both` options kept in `FILTER_CONFIGS.location`.) (Note: there is no `lessonFormat` filter — that field was removed from the schema entirely in the 2026-05 metadata rebuild, column and metadata key both.)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **State**: Zustand
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Search**: PostgreSQL full-text search with synonym/typo expansion
- **Testing**: Vitest + React Testing Library

## Project Structure

```
src/
  components/     # UI components (each has CLAUDE.md)
  hooks/          # Custom React hooks
  lib/            # Supabase/Sentry configs
  pages/          # Route components
  stores/         # Zustand stores
  types/          # TypeScript definitions
  utils/          # Helpers, constants, filterDefinitions

supabase/
  functions/      # Edge functions (detect-duplicates, process-submission, etc.)
  migrations/     # Database schema

scripts/          # Data import, testing scripts
```

## Key Patterns

### ESLint Unused Parameters
```typescript
interface Props {
  // eslint-disable-next-line no-unused-vars
  onChange: (value: string) => void;
}
```

### Cultural Heritage Hierarchy
Parent selection includes all children. Selecting "Asian" automatically includes Chinese, Japanese, Korean, etc.

### Component Props
Name interfaces with `Props` suffix: `ComponentNameProps`

### Store Actions
Reset `currentPage` to 1 whenever filters change.

## Database

### Key Tables
- `lessons` - lesson plans with FTS (row count drifts — query the table, don't trust a number in docs)
- `user_profiles` - Users with roles
- `lesson_submissions` - Teacher submissions
- `duplicate_resolutions` / `canonical_lessons` - duplicate detection & resolution state (also `duplicate_group_dismissals`)

### Role Hierarchy
`super_admin > admin > reviewer > teacher`

### RLS Debugging
```sql
SELECT * FROM user_profiles WHERE id = auth.uid();
SELECT is_admin(auth.uid());
```

## Common Errors

| Error | Fix |
|-------|-----|
| RLS policy violation | Check role with `is_admin(auth.uid())` |
| Module not found | Use `@/` imports |
| VITE_* undefined | Add `VITE_` prefix |

## Documentation

Directory-specific guidance in each folder's `CLAUDE.md`:
- `src/components/` - Component patterns
- `src/stores/` - Zustand patterns
- `src/hooks/` - Hook patterns
- `src/types/` - TypeScript conventions
- `src/utils/` - Constants and utilities
- `supabase/functions/` - Edge function patterns
- `supabase/migrations/` - Migration guidelines
- `scripts/` - Data management
