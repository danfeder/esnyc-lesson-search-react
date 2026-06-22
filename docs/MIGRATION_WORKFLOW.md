# Database Migration Workflow

> **Moved.** This document was consolidated on **2026-06-22 (Wave 3 / C39)** to eliminate four
> overlapping copies of the migration workflow. Its content now lives in the canonical guide.

## Where it went

- **Canonical detailed guide** → [`supabase/migrations/CLAUDE.md`](../supabase/migrations/CLAUDE.md)
  (auto-loaded by Claude Code agents) — the full pipeline, step-by-step workflow, local-dev setup,
  iteration/baselining guidance, troubleshooting, GitHub workflows + secrets, and the migration template.
- **Mandatory decision tree** ("has this migration been pushed yet?") → the `database-migrations`
  skill: [`.claude/skills/database-migrations/SKILL.md`](../.claude/skills/database-migrations/SKILL.md).
- **Quick reference** → the **"Database: 3-Part Pipeline"** section of the root
  [`CLAUDE.md`](../CLAUDE.md).
- **Create a new migration** → the `/new-migration` command
  ([`.claude/commands/new-migration.md`](../.claude/commands/new-migration.md)).
