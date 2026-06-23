# C02 — Cooking Skills & Main Ingredients Re-tag — Execution Status

**Last updated:** 2026-06-22 by Session 0 (scaffold)

## Current State

**Active PR:** none — not yet branched.

**Current task:** **Session 1 = DESIGN LOCK (no code).** The design doc is `Status: Draft`. Session 1 works design §4 "Open design questions" **Q1–Q11** against the real harness/code, locks the answers (respecting the `[evidence-lockable]` / `[user-verdict]` tags), flips the design Status to **Locked**, authors the impl plan's concrete P1–P4 tasks, and runs **GATE 1B** (Codex + Claude) on them. No implementation code until §4 is locked.

**Branch:** `main` (not yet branched).

**Last commit on branch:** (none — scaffold commit pending).

**Last commit on main:** `826ff46` docs(wave4): close Wave 4 — all 3 PRs shipped (#541).

**Pre-next-PR verification (if any):** none yet.

**Scaffold state:** four-file scaffold authored 2026-06-22 (design / implementation-SKELETON / kickoff / this status). **GATE 1A (design doc) is DONE** — Codex cross-family + a Claude anchor-verify agent reviewed the design 2026-06-22; all findings folded (2 HIGH: close the vocab into a byte-identical manifest+parent map [§4 Q1]; PROD expand/contract deploy choreography [§4 Q9]; + ~11 MED/LOW incl. edge-mirror 4-line fix, anchor corrections, the 4-gate precision-metric gap, the gold-key circularity caveat). The `[user-verdict]` §4 questions to bring to the user in Session 1: Q1 (vocab manifest + freeze + pantry disposition), Q4 (final pilot size), Q5 (gate thresholds + gate-② definition), Q6→ (it's evidence-lockable), Q7 (invariant mechanism), Q9 (deploy choreography), Q10 (PR/artifact placement).

## Recent decisions worth carrying forward

- **Method = hybrid-floor full LLM re-read** (decided in the 2026-06-22 scoping discussion + a Codex cross-exam): LLM reads every lesson; deterministic alias-map floor anchors the ~94% clean core; LLM does the judgment work. NOT rules-only (can't add specifics), NOT blind full-LLM (regresses the core).
- **Prior $121 fable run produced ZERO output for these two fields** (verified) — no reusable work; fable-5 is suspended, so the pilot re-runs an Opus-vs-Sonnet bake-off.
- **Vocab amendments (user, 2026-06-22):** +Seaweed (nori), +Cocoa & chocolate (group-less specifics), +Sunflower butter/Tahini/Peanut butter (under Nuts & seeds); Hummus→Chickpeas remap; Frying→Sautéing & stir-frying. Solo sign-off (no curriculum-team round).
- **Pilot gold key = AI-drafts-user-adjudicates** + an independent hard-case protocol; greenlit on 4 separate gates, not a macro score.
- **Enforcement = expand/contract** (P3 data → P4a frontend deploy → P4b CHECK), mirroring `garden_skills`.

## Done

(none yet — scaffold only)

## In flight

(none)

## Blocked

(none — user-approval gates for the pilot greenlight and PROD migrations are EXPECTED, not blockers)

## Decisions made during execution

(none yet — Session 1 will record the §4 locks here as it makes them)

## Out-of-scope follow-ups captured here

(for the project memory after the initiative ships — seed list from design §10)
- Embeddings regeneration (rebuild's C2.4) — own session; relates to `project_embedding_pipeline_mismatch`.
- Filter-UI surfacing of the two ingredient tiers (group vs. specific in the public menu).
- A hard "1–3 specifics" cap (deliberately left as guidance).
- A DB trigger for the specific→group invariant (leaning app-layer only).
- Drop the retained C02 snapshot table(s) in a future cleanup once PROD-stable.

## Pointers to durable context

- Kickoff prompt: `2026-06-22-c02-cooking-ingredients-retag-kickoff.md`
- Design doc: `2026-06-22-c02-cooking-ingredients-retag-design.md` (LOCKED decisions + §4 open questions)
- Implementation plan: `2026-06-22-c02-cooking-ingredients-retag-implementation.md` (SKELETON until Session 1)
- Worksheet (decided vocab): `2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`
- Harness: `scripts/stage2-retag/`
- Archive: `2026-06-22-c02-cooking-ingredients-retag-execution-status-archive.md` (created when needed)

## Recent session log

### Session 0 — 2026-06-22 — scoping discussion + four-file scaffold

Major events:
- Scoped C02 in a discussion session: grounded the state (read-only fan-out + PROD census + a Codex method cross-exam), reached all the decisions (method, vocab amendments, pilot gates, enforcement, data-safety), then scaffolded via `/kickoff-feature` in **design-lock mode**.
- Authored the four files; **GATE 1A folded** into the design doc (Codex + Claude). Next: `/clear` → paste the kickoff → Session 1 = design lock.
