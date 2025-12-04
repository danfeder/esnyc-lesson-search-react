---
description: Consolidate migrations into a fresh baseline snapshot after major features stabilize
---

Consolidate all migrations into a fresh baseline snapshot from production.

## Before Starting

Confirm these prerequisites are met:
- [ ] Major feature stable in production (1-2 weeks)
- [ ] No pending PRs with migration files
- [ ] No known bugs requiring schema changes
- [ ] Migration count warrants consolidation (>15 files or major release)

## Process

Guide me through the baselining workflow:

1. **Prepare**: Ensure main branch is up to date and local DB passes tests
2. **Generate baseline**: Dump schema from production using `supabase db dump --schema-only`
3. **Archive old migrations**: Move existing migrations to `archive/` folder
4. **Verify locally**: Reset DB, run RLS tests, smoke test the app
5. **Commit and push**: With descriptive commit message noting what was consolidated
6. **Reset TEST DB**: Trigger the `reset-test-db.yml` workflow
7. **Verify TEST**: Confirm TEST environment works with MCP tools

## Reference

Full documentation: `docs/plans/2024-12-04-periodic-baselining-design.md`
