# C02 — Cooking Skills & Main Ingredients Re-tag — Execution Status

**Last updated:** 2026-06-23 by Session 6 (**P1 MERGED → P2 start**; formalized the Opus-only supersede across all 4 scaffold docs; about to dispatch P2.1)

## Current State

**Phase:** **P1 COMPLETE & MERGED** — PR #542 squashed to `a5ff8a9` on `main` (rounds 1–5 bot triage + a user-requested Codex merge-review all folded; round-4 caught + fixed a real 🔴 gold-key data-loss bug). The full P1 PR cycle (per-task as-built + Sessions 0–5 log) is in the **archive** (`…execution-status-archive.md`) — read on demand via `grep -n`, not at session start. Baseline now: harness suite **631/631**, full suite ~**75 files / 1583**, `npm run check` clean.

**NOW: P2 (Pilot) on a new `feat/c02-pilot` branch.** P1's `feat/c02-harness` is merged, so P2 branches fresh. **Model = Opus 4.8 ONLY** — the §4 Q11 Opus-vs-Sonnet bake-off was **SUPERSEDED 2026-06-23** by user decision (`project_c02_p2_opus_only`): one Opus run, scored alone against the same 4 gates, `claude-opus-4-7` fallback only if it fails. Session 6 formalized this supersede across the design / impl / kickoff / status docs (the explicit P2-start bookkeeping item from that memory).

**Next task = P2.1** — regenerate `scripts/stage2-retag/artifacts/corpus.jsonl` (the on-disk one is the stale **765-line Jun-12** export and **lacks** `cooking_skills`/`main_ingredients`; confirmed 2026-06-23 — those keys are absent), then run the 3-layer sampler to produce the 70-lesson pilot key; commit the id-list + sample manifest. Scripts-only, no DB writes, no money (read-only export + deterministic sample). Then P2.2 (gold key, USER-GATED) → P2.3 (single Opus-4.8 run, needs Console credits) → P2.4 (4-gate greenlight, USER-GATED).

**P2 — key carry-forwards:**
- (a) **P2.1 MUST regenerate `artifacts/corpus.jsonl`** — the on-disk one (765 lines, pre-2026-06-12) LACKS `cooking_skills`/`main_ingredients`; the C02 sampler + rules-baseline read current tags from corpus record fields. The `CorpusRecordForSampling` type carries the two fields.
- (b) P2.2 gold key is USER-GATED (AI-drafts → user-adjudicates + the Q6 independent judgment-row 2nd pass).
- (c) **P2.3 = a SINGLE `--model claude-opus-4-8` run** over the 70-key (run `preflight-token-mass` first; needs Console credits). **NO Sonnet bake-off** — the §4 Q11 bake-off was **SUPERSEDED 2026-06-23** by user decision (`project_c02_p2_opus_only`); one model run, not two.
- (d) P2.4 greenlight is USER-GATED (Opus 4.8 scored **alone** on the 4 gates, no model tie-break; Opus must earn it; `claude-opus-4-7` fallback only if it fails).
- (e) the C02 sampler covers all **93** values (both fields), not just the 70 ingredient values — per-value scoring needs ≥2 support on both fields.
- (f) **Gate ③ zero-specifics — RESOLVED in P1** (`96c0ab1`, Codex merge-review + user sign-off): gate ③ now FAILS when a contestant predicts zero added specifics (requires `addedSpecificPrecision !== null`), so a model emitting only group tags can't clear ③ vacuously. Also hardened in the same commit: gate ① fails on an empty clean-core; `assertCorpusHasC02Tags` aborts on a stale corpus. No longer a P2 decision.
- (g) **P2 efficiency cleanups (round-2 bot; negligible at 70 rows, do when P2 exercises the harness at scale):** add `dropKeys: Set<string>` to `C02Floor` so `buildC02SamplerContext` stops re-reading the alias-map file (#3); memoize `loadC02Manifest` in `vocab.ts` like `loadC02Floor` (#4); pass a precomputed `judgmentRow` into `bootstrapGate2Delta` instead of recomputing `partitionKey` (#5).

**The locks (carry forward):** Q2 flat `string[]` + parent-map superRefine · Q3 alias-floor + parent-reconcile R-rules in `normalize.ts` · Q4 3-layer strata + size **70** · Q5 4 gates over the **existing** `evalMetrics` precision/fp (NOT new metric math) · Q6 independent hard-case 2nd-pass gold key · Q7 harness R-rule + Zod superRefine, **no DB trigger** · Q8 Title-Case `value===label` · Q9 P3→P4a→P4b expand/contract (never bundle) · Q10 P-branch map · **Q11 SUPERSEDED 2026-06-23 → Opus-4.8 only, NO bake-off** (`project_c02_p2_opus_only`; original lock was Opus-vs-Sonnet, Sonnet wins ties — now skipped). **Q1 vocab = 93 canonical:** 23 cooking_skills + 70 main_ingredients (24 groups + 46 specifics, 4 null-parents: Celery/Fennel/Seaweed (nori)/Cocoa & chocolate; Melons parented under "Squash, cucumbers & melons"); **B-lite pantry** (Sugar→Sweeteners; drop Salt/Oil/Soy sauce); **freeze the manifest at end of P3**.

**Live census (CORRECTED Session 6, 2026-06-23):** PROD `retired_at IS NULL` = **764 live rows**; **122 distinct cooking_skills** (1,758 appearances, 435 lessons) / **230 distinct main_ingredients** (1,847 appearances, 430 lessons). ⚠️ The earlier "121/202 re-census" was a **TEST-DB query mislabeled as PROD** (forensics: `121` = TEST cooking_skills distinct exactly, the census table's named-appearance sum `1,709` = TEST exactly; PROD is reproducibly 122/230 per the 2026-06-11 `oq2` verbatim-SQL census + a fresh live query; the q1 census table even self-sums to 123/212 ≠ its 121/202 headline). 122/230 (the original draft figure) is ground truth; 121/202 retracted. Floor coverage re-measured against live PROD = **92.4% cooking / 94.3% ingredients** appearances (designed band), so the TEST-sourcing did NOT materially damage the alias map — but it left ~10–15 clean folds the TEST list missed (Beans/Squash/Parmesan cheese/Sour Cream/Peas/Lettuce/Various seeds/Beyond Sausage (pea protein)/… → their groups); P2.1 augments the alias map with these.

**Pre-next-PR verification (if any):** none (no DB until P3). P1 is scripts-only, git-revert reversible.

## Recent decisions worth carrying forward

- **Method = hybrid-floor full LLM re-read** (decided in the 2026-06-22 scoping discussion + a Codex cross-exam): LLM reads every lesson; deterministic alias-map floor anchors the ~94% clean core; LLM does the judgment work. NOT rules-only (can't add specifics), NOT blind full-LLM (regresses the core).
- **Prior $121 fable run produced ZERO output for these two fields** (verified) — no reusable work; fable-5 is suspended. The pilot was originally going to re-run an Opus-vs-Sonnet bake-off, but that was **superseded 2026-06-23 → Opus 4.8 only** (`project_c02_p2_opus_only`).
- **Vocab amendments (user, 2026-06-22):** +Seaweed (nori), +Cocoa & chocolate (group-less specifics), +Sunflower butter/Tahini/Peanut butter (under Nuts & seeds); Hummus→Chickpeas remap; Frying→Sautéing & stir-frying. Solo sign-off (no curriculum-team round).
- **Pilot gold key = AI-drafts-user-adjudicates** + an independent hard-case protocol; greenlit on 4 separate gates, not a macro score.
- **Enforcement = expand/contract** (P3 data → P4a frontend deploy → P4b CHECK), mirroring `garden_skills`.
- **Floor matching is now case-insensitive + trim** (Session 4, user-asked, supervisor-verified safe = 0 collisions): `matchKey = NFC.trim().toLowerCase()` + a canonical-case rule + a build-time collision guard + 3 machine-checked invariants. *Strengthens* the Q3 idempotency lock ("no canonical is an alias key" → "no canonical matchKey-collides with an alias key pointing elsewhere") rather than changing scope. **Lowercase+trim only, NOT diacritic/punctuation folding** — that adds collision surface for little gain, and P4a closes both fields to dropdowns so future free-form case/accent drift becomes impossible; the floor's robustness matters mainly for the historical corpus (P3) + the P1.6 rules-baseline. This was the fix for the `Mixing` (180-lesson) alias-map gap.
- **Gate ④ never-stored scan is case-folded** (Session 5): the literal scan compares on `matchKey`, so a casing/spacing variant (`salt`, ` Oil `) can't slip a never-stored literal past the greenlight gate. The ≥2× sampler coverage is a **hard CLI failure** (exit 1), not just a warning.

## Done

- **P1 (Sessions 0–5) — MERGED** as PR #542 → `a5ff8a9` on `main`. Scaffold + GATE 1A → §4 design lock (11 Q's) + impl-plan P1.1–P4b.1 + GATE 1B → P1.1–P1.6 harness build (vocab manifest + alias-floor maps · both fields wired into schema/vocab/prompt · R7/R8/R9 normalize rules · export/diff/validate plumbing · 3-layer set-cover sampler · 4-gate scoring + rules baseline) → pre-push review + 5 bot-triage rounds + Codex merge-review folded. **All supervisor-verified; harness 631/631, full suite ~75/1583 green.** Full P1 PR cycle (per-task as-built + Sessions 0–5 log) → **archive file**.

## In flight

(P2.1 — about to dispatch: regenerate `corpus.jsonl` → run the 70-lesson sampler on `feat/c02-pilot`.)

## Blocked

(none — user-approval gates for the pilot greenlight and PROD migrations are EXPECTED, not blockers)

## Decisions made during execution

**Session 1 (2026-06-23) — §4 locks.** User verdicts (AskUserQuestion, all came back on the recommended option): pantry **B-lite**; pilot size **70**; invariant mechanism **B** (R-rule + superRefine, no DB trigger); freeze-candidates **pre-add the 4 high-count** (Apples/Coconut/Oranges/Lime). Evidence-locked: Q2 flat string[]; Q3 normalize R-rules; Q5 gates ③④ are plumbing over existing `evalMetrics` (supervisor-verified — corrects the design's "new metric families" framing); Q8 Title-Case value===label; Q11 bake-off mechanism. Ratified recommendations (presented, no pushback): Q1 freeze-after-P3 + 70-value roster; Q5 thresholds (①strict ②+0.05 both-fields ③0.7/5% ④0.8, re-tunable at pilot); Q6 independent 2nd-pass; Q9 Option-A choreography; Q10 P-branch/artifact map. Full rationale in design §4.

## Out-of-scope follow-ups captured here

(for the project memory after the initiative ships — seed list from design §10)
- Embeddings regeneration (rebuild's C2.4) — own session; relates to `project_embedding_pipeline_mismatch`.
- Filter-UI surfacing of the two ingredient tiers (group vs. specific in the public menu).
- A hard "1–3 specifics" cap (deliberately left as guidance).
- A DB trigger for the specific→group invariant (leaning app-layer only).
- Drop the retained C02 snapshot table(s) in a future cleanup once PROD-stable.
- **(Optional, low-priority) Collapse the now-redundant case-twin alias keys** in `c02-alias-map.json` (e.g. `Chopping`+`chopping`, `Measuring`+`measuring`) — harmless under case-insensitive matching (the collision guard only throws on *different*-target collisions), left in place to minimize churn. Codex flagged ~20 same-target collisions (P1 GATE 3); a future tidy-up could dedupe them.

## Pointers to durable context

- Kickoff prompt: `2026-06-22-c02-cooking-ingredients-retag-kickoff.md`
- Design doc: `2026-06-22-c02-cooking-ingredients-retag-design.md` (LOCKED decisions + §4 open questions)
- Implementation plan: `2026-06-22-c02-cooking-ingredients-retag-implementation.md` (P1.1–P4b.1 tasks authored)
- Worksheet (decided vocab): `2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`
- **Provisional canonical manifest (Session 1):** `docs/plans/c02-session1-discovery/q1-vocab-census.md` (census + 70-value set + parent map — the byte-source for P1.1's `c02-vocab.json`; later lock-corrected to 46 specifics / Melons parented)
- Harness: `scripts/stage2-retag/`
- Archive: `2026-06-22-c02-cooking-ingredients-retag-execution-status-archive.md` (per-task P1 as-built detail + Sessions 0–4 log — read on demand via `grep -n`)

## Recent session log

> **PR cycle 1 (P1, Sessions 0–5) is fully ARCHIVED** — full per-session detail + learnings in `…execution-status-archive.md`. Only the current PR cycle's sessions stay here.

### Session 6 — 2026-06-23 — P1 merge reconciled + Opus-only supersede formalized + P2.1 start

Major events:
- Oriented: git showed **P1 PR #542 already MERGED** (`a5ff8a9`) while the status header still read "P1 PR being opened" → trusted git, reconciled the header to P2 start.
- User flagged the **Opus-only decision** (`project_c02_p2_opus_only`, skip the Q11 bake-off). **Formalized the supersede** across all four scaffold docs (design §4 Q11 banner + §6 + §8 table; impl Tech-Stack + P2 table + P2 header + P2.3/P2.4; kickoff phased-delivery + LOCKED + RIGHT-NOW; status carry-forwards (c)/(d) + locks line + header).
- **PR-cycle archival:** moved the Session 5 (P1 PR open→merge) entry to the archive; refreshed the Current State header to P2.
- [P2.1 dispatch + verify — in progress.]

Next: P2.1 (regenerate corpus.jsonl → 70-lesson sampler), then P2.2 gold key (USER-GATED).
