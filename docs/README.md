# ESYNYC Lesson Search — documentation index

Start with `ARCHITECTURE.md` (system architecture, updated 2026-07). Agent-facing rules live in the root [CLAUDE.md](../CLAUDE.md) and the per-directory `*/CLAUDE.md` files; `developer-guide/INDEX.md` lists them.

## Reference (top level)

| Document | What it is |
|---|---|
| `ARCHITECTURE.md` | System architecture — frontend, search pipeline, database, edge functions, deployment |
| `architecture-decisions.md` | Architecture decision records |
| `PRODUCT_PRINCIPLES.md` | Product principles the owner locked in 2026-07 |
| `api-reference.md` | Edge-function / RPC reference |
| `edge-functions-setup.md` | Edge-function setup and secrets |
| `GOOGLE_DOCS_API_SETUP.md` | Google Docs API credentials and domain delegation |
| `LESSON_SUBMISSION_SPECS.md` | Lesson submission pipeline specification |
| `DUPLICATE_DETECTION.md` / `DUPLICATE_DETECTION_CONFIG.md` / `duplicate-resolution-implementation.md` | Duplicate detection and resolution |
| `RLS_SECURITY.md` | Row-level-security policy patterns |
| `DATABASE_SAFETY_CHECKLIST.md` / `MIGRATION_WORKFLOW.md` | Pre-migration checklist and the Local → TEST → PROD migration workflow (canonical guide: [`supabase/migrations/CLAUDE.md`](../supabase/migrations/CLAUDE.md)) |
| `DEPLOYMENT_CHECKLIST.md` | Release checklist |
| `TESTING_GUIDE.md` | Unit/integration testing guide (Vitest + React Testing Library) |
| `component-guide.md` | Component conventions |
| `ARCHIVE_POLICY.md` | What gets archived vs deleted, and where |

## Subdirectories

- `plans/` — live and in-flight planning docs; shipped work is under `plans/archive/` (see `plans/ARCHIVAL_MANIFEST.md` for where every archived doc went and why some stayed)
- `developer-guide/` — index of the per-directory `*/CLAUDE.md` files and the main guides
- `deployment/` — deployment guide
- `guides/` — Google Docs integration; OpenAI embeddings setup (2025, embeddings pipeline since retired)
- `performance/` — benchmarks and optimization notes (2025)
- `security/` — authentication flow and data-protection notes (2025)
- `specifications/` — user roles and permissions spec
- `reports/` — dated audits and reports (point-in-time); currently `reports/2026-08-17-arab-american-heritage-month-candidate-audit.md`
- `archive/` — superseded documents, with a README explaining each

## Quick links

- [Main README](../README.md) — project overview and setup
- [CLAUDE.md](../CLAUDE.md) — agent context and project rules
