# Deferred-Work Campaign — Master Status

> The single cross-wave tracker the roadmap calls for (`2026-06-20-deferred-work-roadmap.md` §Scaffolding weight: "One master campaign status doc tracks all themes"). One row per wave/theme. Per-initiative execution docs only for scaffolded themes; this file points down at them.
>
> **Roadmap (source of truth for scope):** `docs/plans/2026-06-20-deferred-work-roadmap.md` — 169 canonical items across 7 waves, stable `C##` ids.

**Last updated:** 2026-06-22 (**Wave 2 COMPLETE**; **Wave 3 core (C60+C39) COMPLETE** — PR A #532 `5b5226a` · PR B #533 `7367f20` · PR C #534 `063bd4b`, all merged. **Re-homed tail:** C169+C31 Dependabot batch DONE (Phase 1 + Phase 2 merged; deferred majors #460 eslint-10 / #451 TS-6.0 left open); **`Security Audit` CI check FIXED** (#535 `4ee9cea` — now a meaningful prod-vuln gate); **C33 (edge-deploy post-deploy verify + serialize matrix) ✅ MERGED `a8efac9` (#537)**; **C40 (memory archive-split) — out-of-repo, no PR, done**. **Wave 3 = ✅ DONE → Wave 4 SCAFFOLDED 2026-06-22** (design-lock mode; `2026-06-22-wave4-data-corpus-cleanup-*`; Session 1 = design-lock next).).

## Wave status

| Wave | Theme | State | Branch / PRs | Next action | Initiative doc |
|------|-------|-------|--------------|-------------|----------------|
| **1** | Public "broken windows" UX (Theme B) | ✅ **SHIPPED 2026-06-21** | #522 `19d99b7` · #523 `530b253` · #524 `3c592b1` · #525 `5197069` · #526 `9eb1b6e` | — (closed) | `2026-06-20-theme-b-public-ux-*` (CLOSED) |
| **2** | Email + Security P1 | ✅ **SHIPPED 2026-06-21** | PR1 C137 #527 `b4a5fc3` · PR2 C133 #528 `05d86ce` · PR3 C20 #530 `c52a00e` · PR4 C138 #531 `2d25e23` (all PROD-verified) | — (closed; deferred follow-ups → memory) | `2026-06-21-wave2-email-security-execution.md` (CLOSED) |
| **3** | Repo/docs hygiene | ✅ **DONE 2026-06-22** | PR A `5b5226a` (#532) · PR B `7367f20` (#533) · PR C `063bd4b` (#534) · C33 `a8efac9` (#537) — all MERGED | — (closed); C169 Dependabot ✅ + Security Audit fix ✅ (#535) + C33 edge-deploy verify ✅ (#537) + C40 memory split ✅ (out-of-repo) | `2026-06-22-wave3-repo-docs-hygiene-execution.md` |
| **4** | Data / corpus cleanup (DB-careful) | 🟢 **SCAFFOLDED 2026-06-22** (design-lock; Session 1 = design-lock next) | scaffold on `chore/wave4-scaffold` | Core 5 (`C11`/`C12`/`C08`/`C02`) + `C83`/`C49`/`C88`; defer `C01`/`C09`+`C07`/`C03`. 4 PRs reversible-first; C11 = hard-delete; per-PR FK checklist + snapshot + TEST/PROD MCP verify | `2026-06-22-wave4-data-corpus-cleanup-{design,implementation,kickoff,execution-status}.md` |
| **5** | Reviewer/admin features | ⚪ queued | — | **ReviewDetail decomposition first (test-first)** then `C107`/`C111`/`C112`/`C113`… | TBD (full scaffold) |
| **6** | Search depth + larger features | ⚪ queued | — | `C42`/`C41`/`C162`/`C121`/`C122` (L tier) | TBD |
| **7** | Tech-debt / simplification | ⚪ queued | — | opportunistic filler between gates; `C61`/`C100`/`C153`… | (no scaffold) |
| **F4/F5** | Process tooling | ⚪ queued | — | slot after W1, before W5; `C37` then `C38` | `reference_working_efficiency_deferred.md` |

## Standing gates (every wave that touches DB / edge functions)

- **Migration PR** → TEST-DB MCP verify (`mcp__supabase-test__`) before merge; PROD MCP verify after apply (CI's own verify step flakes — MCP is source of truth).
- **Edge-function PR** → 3-signal post-deploy verify (version + `ezbr_sha256` vs TEST + source grep). The `complete-review` matrix-push silent-no-op recurred 2×; never trust the CLI "Deployed" line. See `reference_ci_flakes.md`.
- **PROD migration approval** is a manual GitHub Environment gate (`migrate-production.yml`).
- **Additive RPC param the frontend sends** → SPLIT the PR (migration-only first, then frontend) to avoid the PGRST202 outage window. See `reference_ci_flakes.md`.
- **No refactor without page-level tests first** (esp. ReviewDetail, Wave 5).
- **Per-PR ritual:** GATE 1A/1B plan review · pre-push code-reviewer + Codex GATE 3 · four-surface bot triage + GATE 4 (Codex 2nd opinion) · per-round TEST-DB re-verify. Canonical detail in the auto-loaded `feedback_*` memories.

## Pointers

- Roadmap: `docs/plans/2026-06-20-deferred-work-roadmap.md`
- CI/deploy flake playbook: `reference_ci_flakes.md` (read before any PROD migration / edge deploy)
- 3-pipeline mental model: `reference_database_pipeline.md`
- Data-mutation hazards: `reference_data_mutation_gotchas.md` (read before any `DELETE FROM lessons` / facetCounts / concepts work)
