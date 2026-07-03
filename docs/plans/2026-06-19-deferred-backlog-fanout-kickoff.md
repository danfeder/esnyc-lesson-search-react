# Deferred-Work Backlog — Fan-Out Inventory & Roadmap — Session Kickoff

> Paste this at the start of the session that runs the deferred-work stock-take.
> It is self-contained: assume no prior conversation. This is an **inventory +
> planning** task — it produces ONE ranked roadmap doc and writes NO code, closes
> NO issues, and changes NO state. Ultracode is on → drive it with the **Workflow**
> tool (deterministic fan-out), with the supervisor verifying between phases.

## GOAL

Take stock of EVERY deferred / follow-up / "out-of-scope" / "later" item across the
whole project, **verify each one against current `main` to prove it's still real**,
then synthesize a single prioritized roadmap. The user's #1 concern: **some deferred
items were documented months ago and may already be obsolete** (resolved by work
shipped since — e.g. the search-modernization track and the just-closed
metadata-rebuild initiative shipped many things that older memories still list as
"deferred"). So obsolescence-detection is the SPINE, not a side-check: an item earns
a place on the roadmap only by surviving verification; anything already-done is
marked **OBSOLETE** with the resolving commit/PR cited, not silently dropped.

## LOCKED SCOPE (user decisions, 2026-06-19)

1. **Breadth = project-wide**, everything — all initiatives + infra/CI hygiene +
   public UX bugs + code TODOs + GitHub issues/PRs + beads. "Be very thorough;
   some items may be obsolete from work done since they were documented."
2. **Assess depth = DEEP** — every surviving item is verified against the current
   codebase (does the named file/function/flag still exist? does the problem still
   reproduce? did a later PR/migration resolve it?), then scored.
3. **Output = ONE ranked roadmap doc** (no auto-scaffolding of kickoffs, no beads
   reseed this pass — those are follow-on decisions after the user reads the roadmap).

## SOURCE MANIFEST (verified 2026-06-19 — re-`ls` to confirm counts at run time)

| Source class | Where | Count |
|---|---|---|
| Memory files | `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/*.md` | 49 (+ `MEMORY.md` "Open hygiene follow-ups") |
| Plan / status docs | `docs/plans/*.md` (esp. `*execution-status*.md` "out-of-scope"/"follow-up"/"deferred"/"NEXT" sections) | 65 (11 are status docs) |
| Overnight-review artifacts | `~/cCode/pr6-overnight-2026-06-12/overnight-review/` | 6 (`FINDINGS_SUMMARY`, `frontend-ux-review` ← 4 public P1s, `docs-cleanup-audit`, `ARCHIVE_PROPOSAL`, `simplification-groundwork`, `working-efficiency`) |
| GitHub issues | `gh issue list --state open` | 38 |
| GitHub PRs (some stale/abandoned — assess) | `gh pr list --state open` | 15 |
| Beads backlog (CLI broken — read the jsonl directly) | `.beads/issues.jsonl` | 51 |
| Code markers | `grep -rIE "TODO|FIXME|HACK|XXX" src/ supabase/functions/ scripts/` | 2 |
| CLAUDE.md files | root + per-dir `CLAUDE.md` ("follow-up"/"known issue" notes) | several |

Known high-priority candidates to expect (the workflow must still verify these are
real): the **4 broken public UX P1s** (mobile filters, a11y, sort no-op, false
"no matches") from `frontend-ux-review.md`; **Resend email delivery broken** for ~7
email types (lesson-submission Tier-1); the **edge-deploy silent-no-op root-fix**
(per-function post-deploy verify + serialize PROD deploys); **C2.4 embeddings regen**;
**PR F** (cooking_skills/main_ingredients); the **`google-docs-parser` dedup
Title-case fix**; the **23-lesson imported-curriculum cleanup**.

## WORKFLOW DESIGN (multi-modal sweep → normalize → verify → prioritize → synthesize)

Author a Workflow script with these phases. Default to `pipeline`/`parallel` per the
tool's rules; the one true barrier is **Normalize** (needs all discovered items
before dedup) and the final **Synthesize** (needs all verdicts).

- **Phase 1 — Discover (parallel, fan out by SOURCE-CLASS).** One agent per row of
  the manifest. Each extracts items into the schema below. Sonnet floor (bulk
  extraction); the GitHub-issues agent may run Opus (more judgment on stale PRs).
  Each agent returns `{items: [...]}`; tell them their final message IS the data.
- **Phase 2 — Normalize (barrier).** Plain code (not an agent): merge all lists,
  dedup items that appear in 2-3 sources into one canonical entry that records ALL
  its source locations. Expect heavy overlap (memory ↔ status-doc ↔ GH issue).
- **Phase 3 — Verify + assess (parallel, fan out by ITEM).** THE LOAD-BEARING PHASE.
  Each agent takes one canonical item and, reading current `main`:
  1. **Obsolescence check (first, gating):** does the named file/function/flag/table
     still exist? Does the problem still reproduce in current code? Did a later
     PR/migration/commit resolve it? Output `status ∈ {live, obsolete, partially-done,
     unverifiable}` — and for `obsolete`/`partially-done`, CITE the resolving
     commit/PR/migration. Use `git log`/`git show`, grep, file reads, and read-only
     MCP probes (PROD/TEST) where the item is data/DB-shaped.
  2. If `live`: score `category` (public-bug / infra-hygiene / half-finished-feature /
     data-cleanup / tech-debt / docs), `user_impact` (high/med/low + one-line why),
     `effort` (S/M/L), `dependencies` (other items or external like Resend/DNS),
     `risk`, and `confidence`.
  Adversarial bias: **default to "verify it's still real" — do not trust the memory
  note's framing.** A Codex (gpt-5.5) cross-family pass on a sample of "obsolete"
  verdicts is worth it (different model family catches different misses).
- **Phase 4 — Prioritize (synthesis agent or code).** Drop obsolete items to an
  appendix (with citations). Cluster `live` items into tracks/themes; sequence by
  impact × (1/effort) × dependency-order; surface the top tier (expect the public
  UX bugs to lead).
- **Phase 5 — Synthesize → roadmap doc.** Write `docs/plans/<date>-deferred-work-roadmap.md`
  (see output spec).

## PER-ITEM SCHEMA (Phase 1 extraction → carried through)

```
{
  title, source_locations: [],      // every place it's recorded
  raw_description,                   // verbatim from source
  claimed_category, claimed_priority // as documented (NOT trusted)
}
```
Phase 3 adds: `status` (live/obsolete/partially-done/unverifiable) · `evidence`
(commit/PR/file:line that proves status) · `category` · `user_impact` · `effort` ·
`dependencies` · `risk` · `confidence`.

## OUTPUT SPEC — `docs/plans/<date>-deferred-work-roadmap.md`

1. **Executive summary** — N raw items → M deduped → K live / (M−K) obsolete; the
   top 5 things to do next + why.
2. **Ranked roadmap** — `live` items grouped into tracks, sequenced, with
   impact/effort/deps/risk per item and a recommended order. Public-facing bugs
   first unless a dependency forces otherwise.
3. **Obsolete appendix** — items verified already-done, each with the resolving
   commit/PR (so the user trusts the cull + the source memories/docs can be pruned).
4. **Unverifiable appendix** — items that couldn't be confirmed either way + what's
   needed to decide.
5. **Source-hygiene note** — which memory files / status docs / GH issues should be
   updated or closed as a result (a by-product worth capturing, not acted on here).

## GUARDRAILS

- **Read-only.** No code changes, no migrations, no closing GH issues / beads, no
  PROD/TEST writes. Read-only MCP probes are fine and expected for data-shaped items.
- **Cite evidence for every obsolescence claim** — a commit, PR#, migration, or
  file:line. "Probably done" is not a verdict; mark it `unverifiable` instead.
- **Verify against current `main`, not the memory note.** Memories are point-in-time
  and the whole reason this task exists.
- **Supervisor-verify between phases** (load-bearing): spot-check a sample of Phase-3
  verdicts firsthand before trusting the synthesis — especially any "obsolete" call,
  since a wrong one silently drops real work.
- This doc itself + the roadmap are planning artifacts; committing them is a
  follow-on choice (docs PR vs leave local), not part of the run.

## SESSION-START

1. Read this kickoff. 2. Re-`ls` the manifest sources to confirm counts. 3. Author
the Workflow script from the design above. 4. Run it; verify between phases.
5. Land the roadmap doc; report the top-5 + the obsolete-cull count to the user.
