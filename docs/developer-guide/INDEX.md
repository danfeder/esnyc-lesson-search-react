# Developer Guide & Context Index

This project uses a distributed documentation system to provide context-aware guidance for both human developers and AI agents.

## AI Context Files (`CLAUDE.md`)
These files contain specific instructions and patterns for their respective directories.

- **Root**: [`CLAUDE.md`](../../CLAUDE.md) - Global rules, commands, and architecture overview.
- **Scripts**: [`scripts/CLAUDE.md`](../../scripts/CLAUDE.md) - Data management and utility scripts.
- **Components**: [`src/components/CLAUDE.md`](../../src/components/CLAUDE.md) - UI component patterns and rules.
- **Hooks**: [`src/hooks/CLAUDE.md`](../../src/hooks/CLAUDE.md) - Custom hook guidelines.
- **Lib**: [`src/lib/CLAUDE.md`](../../src/lib/CLAUDE.md) - External service configurations (Supabase, Sentry).
- **Pages**: [`src/pages/CLAUDE.md`](../../src/pages/CLAUDE.md) - Page-level component structure.
- **Stores**: [`src/stores/CLAUDE.md`](../../src/stores/CLAUDE.md) - Zustand state management patterns.
- **Types**: [`src/types/CLAUDE.md`](../../src/types/CLAUDE.md) - TypeScript type definitions and conventions.
- **Utils**: [`src/utils/CLAUDE.md`](../../src/utils/CLAUDE.md) - Helper functions and constants.
- **Edge Functions**: [`supabase/functions/CLAUDE.md`](../../supabase/functions/CLAUDE.md) - Deno Edge Function patterns.
- **Migrations**: [`supabase/migrations/CLAUDE.md`](../../supabase/migrations/CLAUDE.md) - Database schema and migration rules.

## Human Documentation
Detailed guides for specific systems.

- **Architecture**: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- **Testing**: [`docs/TESTING_GUIDE.md`](../TESTING_GUIDE.md)
- **Deployment**: [`docs/DEPLOYMENT_CHECKLIST.md`](../DEPLOYMENT_CHECKLIST.md)
- **Security**: [`docs/RLS_SECURITY.md`](../RLS_SECURITY.md)
