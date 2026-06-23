# C02 — Cooking Skills & Main Ingredients Re-tag — Execution Status

**Last updated:** 2026-06-23 by Session 1 (design lock — §4 locked, tasks authored, GATE 1B folded)

## Current State

**Active PR:** none. The design-lock doc changes sit on branch `chore/c02-scaffold`, **committed locally** (this session), **not pushed** — no PR open.

**Current task:** **Session 1 (DESIGN LOCK) COMPLETE.** Next session starts **P1 implementation** on a fresh `feat/c02-harness` branch (scripts-only, no DB), task **P1.1** — build `scripts/stage2-retag/data/c02-vocab.json` + `c02-alias-map.json` from the reconciled `q1-vocab-census.md` (TDD).

**Branch:** `chore/c02-scaffold` (scaffold + design-lock commits live here; Session 0's status said "main / not yet branched" — corrected by trusting git).

**What Session 1 produced:** design `Status: LOCKED` (all 11 §4 questions resolved via a 6-agent discovery fan-out + 4 user verdicts, every anchor re-verified); impl plan concrete P1.1–P4b.1 tasks authored; `docs/plans/c02-session1-discovery/q1-vocab-census.md` (provisional manifest, reconciled to the locks); GATE 1B (Codex + Claude) run + all findings folded.

**The locks (carry forward):** Q2 flat `string[]` + parent-map superRefine · Q3 alias-floor + parent-reconcile R-rules in `normalize.ts` · Q4 3-layer strata + size **70** · Q5 4 gates over the **existing** `evalMetrics` precision/fp (NOT new metric math) · Q6 independent hard-case 2nd-pass gold key · Q7 harness R-rule + Zod superRefine, **no DB trigger** · Q8 Title-Case `value===label` · Q9 P3→P4a→P4b expand/contract (never bundle) · Q10 P-branch map · Q11 Opus-4.8-vs-Sonnet-4.6 bake-off (Sonnet wins ties). **Q1 vocab:** 23 cooking_skills + **67 provisional main_ingredients** (24 groups + 43 specifics incl. 4 pre-added Apples/Coconut/Oranges/Lime); **B-lite pantry** (Sugar→Sweeteners; drop Salt/Oil/Soy sauce); **freeze at end of P3**.

**Live census correction:** PROD 2026-06-23 = **121 distinct cooking_skills / 202 main_ingredients** (design §1's 122/230 was stale).

**Pre-next-PR verification (if any):** none (no DB until P3). P1 is scripts-only, git-revert reversible.

**Gate provenance:** GATE 1A folded into the design 2026-06-22 (Codex + Claude). **GATE 1B folded 2026-06-23** — Codex (codex-rescue) + Claude reviewer in parallel on the authored impl plan; both converged on a HIGH (manifest said 63 values vs the locked 67) + a Codex HIGH (P4b rollback under-specified). All findings folded: manifest reconciled to 67/43 + the 4 pre-added foods given parents; P3.2 reframed to GENERATE via the `prepare-apply` generator (its `sqlTextArrayLiteral` escaping kills the apostrophe/ampersand hazard) rather than hand-author; P1.2 names both hand-listed `schema.ts` sites; P1.3 adds R9 idempotency + null-parent tests; P4b conditional snapshot-restore; §7 "apply migration"→"P4b CHECK migration"; comment double-cite split; rules-baseline-has-no-loader note; P2-table cleanup. Both reviewers confirmed every code anchor accurate.

## Recent decisions worth carrying forward

- **Method = hybrid-floor full LLM re-read** (decided in the 2026-06-22 scoping discussion + a Codex cross-exam): LLM reads every lesson; deterministic alias-map floor anchors the ~94% clean core; LLM does the judgment work. NOT rules-only (can't add specifics), NOT blind full-LLM (regresses the core).
- **Prior $121 fable run produced ZERO output for these two fields** (verified) — no reusable work; fable-5 is suspended, so the pilot re-runs an Opus-vs-Sonnet bake-off.
- **Vocab amendments (user, 2026-06-22):** +Seaweed (nori), +Cocoa & chocolate (group-less specifics), +Sunflower butter/Tahini/Peanut butter (under Nuts & seeds); Hummus→Chickpeas remap; Frying→Sautéing & stir-frying. Solo sign-off (no curriculum-team round).
- **Pilot gold key = AI-drafts-user-adjudicates** + an independent hard-case protocol; greenlit on 4 separate gates, not a macro score.
- **Enforcement = expand/contract** (P3 data → P4a frontend deploy → P4b CHECK), mirroring `garden_skills`.

## Done

- **Session 0 (2026-06-22):** four-file scaffold + GATE 1A.
- **Session 1 (2026-06-23):** §4 design lock (all 11 Q's), impl-plan tasks P1.1–P4b.1 authored, GATE 1B run + folded, Q1 manifest reconciled. Design `Status: LOCKED`.

## In flight

(none)

## Blocked

(none — user-approval gates for the pilot greenlight and PROD migrations are EXPECTED, not blockers)

## Decisions made during execution

**Session 1 (2026-06-23) — §4 locks.** User verdicts (AskUserQuestion, all came back on the recommended option): pantry **B-lite**; pilot size **70**; invariant mechanism **B** (R-rule + superRefine, no DB trigger); freeze-candidates **pre-add the 4 high-count** (Apples/Coconut/Oranges/Lime). Evidence-locked: Q2 flat string[]; Q3 normalize R-rules; Q5 gates ③④ are plumbing over existing `evalMetrics` (supervisor-verified — corrects the design's "new metric families" framing); Q8 Title-Case value===label; Q11 bake-off mechanism. Ratified recommendations (presented, no pushback): Q1 freeze-after-P3 + 67-value roster; Q5 thresholds (①strict ②+0.05 both-fields ③0.7/5% ④0.8, re-tunable at pilot); Q6 independent 2nd-pass; Q9 Option-A choreography; Q10 P-branch/artifact map. Full rationale in design §4.

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
- **Provisional canonical manifest (Session 1):** `docs/plans/c02-session1-discovery/q1-vocab-census.md` (census + 67-value set + parent map — the byte-source for P1.1's `c02-vocab.json`)
- Harness: `scripts/stage2-retag/`
- Archive: `2026-06-22-c02-cooking-ingredients-retag-execution-status-archive.md` (created when needed)

## Recent session log

### Session 0 — 2026-06-22 — scoping discussion + four-file scaffold

Major events:
- Scoped C02 in a discussion session: grounded the state (read-only fan-out + PROD census + a Codex method cross-exam), reached all the decisions (method, vocab amendments, pilot gates, enforcement, data-safety), then scaffolded via `/kickoff-feature` in **design-lock mode**.
- Authored the four files; **GATE 1A folded** into the design doc (Codex + Claude). Next: `/clear` → paste the kickoff → Session 1 = design lock.

### Session 1 — 2026-06-23 — design lock + task authoring + GATE 1B

Major events:
- Ran a 6-agent read-only discovery **Workflow** grounding all 11 §4 questions against current code (re-verified every anchor; one agent ran a live PROD census + wrote `q1-vocab-census.md`). Supervisor-verified the load-bearing Q5 correction myself (`evalMetrics.ts` already exposes per-value precision/fp).
- Brought the 4 highest-value user-verdicts (pantry, pilot size, invariant mechanism, freeze-candidates) via AskUserQuestion — all returned on the recommended option; ratify-list accepted without pushback.
- Locked all 11 §4 questions inline + flipped design Status → **LOCKED**; fixed §1 census (122/230→121/202) + §5/§6/§7 consistency.
- Authored concrete impl-plan tasks **P1.1–P4b.1** (anchors, tests, verify cmds, commit msgs).
- GATE 1B: Codex + Claude in parallel; both converged on the manifest 63-vs-67 HIGH + Codex's P4b-rollback HIGH; **all findings folded**; both confirmed every code anchor accurate.

Learnings (candidates to promote):
- `prepare-apply.ts` already dual-writes column+JSONB generically from `FLAT_FIELDS` **and escapes SQL literals** — GENERATE the P3 migration draft, don't hand-author (kills the apostrophe/ampersand quoting hazard for Title-Case values).
- `scripts/lib/evalMetrics.ts` already carries the false-positive primitives — the design's "new metric families" framing was wrong; gates ③④ are pure wiring.
- Discovery flagged real census drift (main_ingredients 230→202) — always re-census live before authoring vocab tasks.

Next: Session 2 = P1 implementation (branch `feat/c02-harness`, P1.1 first, TDD).
