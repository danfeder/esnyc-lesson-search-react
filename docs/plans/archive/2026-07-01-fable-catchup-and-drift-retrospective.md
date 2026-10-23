# Fable Catch-Up & Drift Retrospective

*Written 2026-07-01 for a fresh Fable 5 session. Author: Opus 4.8 (the stand-in while you were out).*
*Read top-to-bottom — it's built to orient you in a few minutes. Drill into the linked files/PRs only where noted, to save your session budget.*

---

## Your stance while reading this: adversarial

The user wants you (Fable) to read and act on this document **adversarially** — treat it as a hypothesis to attack, not ground truth to execute. Concretely:

- **Distrust the author.** This retrospective was written by *Opus, auditing Opus-era work.* Assume it may be soft on its own blind spots, or miscalibrated in either direction. Do not inherit its conclusions — re-derive them.
- **Re-verify the load-bearing numbers from primary sources, not from this doc.** The search-eval deltas (recall 0.728→0.728, the +0.065 F1) → the eval scorecards under `scripts/`. The effort tally → `git log`. The vocab counts → the live DB. **If a number doesn't reproduce, that's your first finding.**
- **Attack both buckets, in both directions.** Where this doc says *"solid — leave alone"* (W1/W2/W4/Medium search/C33), hunt for overengineering it excused or waved through. Where it says *"overengineered,"* check whether it was actually justified and the doc is being unfair. Don't just agree.
- **Interrogate every recommendation** — especially *"ship-and-stop Wave 6."* Reproduce the net-neutral result yourself before accepting the call to stop; if you'd continue instead, say why, with evidence.
- **Hold the user's real question in front of everything:** is effort going to the *important* problems, not the *interesting* ones? Apply that lens to this doc, to the Opus-era work, and to your own next moves.

---

## TL;DR — read this if nothing else

- **You (Fable 5) were suspended mid-session on 2026-06-12 ~17:21 ET** by a US-gov export-control directive — an external kill switch, not a bug on our end. You're back as of **2026-07-01 (~19 days later).** Opus covered judgment work; Sonnet did bulk sweeps.
- **The code isn't the concern.** Almost everything shipped in that window is PROD-verified and went through heavy gating (Codex cross-exam, TEST-DB verify, multi-round bot review, manual smokes). That machinery caught real bugs.
- **The concern is strategic drift** — effort drifting toward *interesting* problems over *important* ones. Good news: it's **concentrated in three specific places, not pervasive.** The big-picture prioritization was mostly sound.
- **The three drift pockets:**
  1. 🔴 **Wave 6 search tuning** — *in-flight; your live decision.* Net-zero recall gain bought with heavy machinery. Ship-and-stop candidate.
  2. 🟡 **C02 metadata re-tag** — *shipped.* ~23 sessions + ~$22 of AI machinery for a **+0.065 F1** gain on one field, where a deterministic rules floor alone already got ~93%.
  3. 🟡 **Process/doc ceremony** — **~49% of the window's 67 commits** were `docs`/`chore`/`ci` bookkeeping; every wave spun up a 4-file scaffold (100–250 KB each).
- **What went right (don't second-guess this):** the campaign *deferred* every real padding trap — personalization, SSO, 2FA, Realtime, partitioning, connection-pooling — all on "audience is ~3 internal users" grounds, and culled 29 already-done backlog items. That's the anti-drift instinct working.

---

## Where you left off (2026-06-12)

You were mid-flight on **Metadata Rebuild — PR-6 (Stage-2 corpus re-tag).**

- Your **$121 fable run over 753 lessons** landed at `scripts/stage2-retag/artifacts/full-run.fable.jsonl` (gitignored). **This artifact is the sole source of truth for your tagging** — the run is no longer reproducible as-Fable. Do **not** let it get swept in any artifacts cleanup.
- **Opus finished PR-6 for you:** Stage-2 re-tag applied (#508/#510), Heritage filter rebuild (#509, nested recursive expansion), dead-code cleanup (#516 / `847bf49`). The whole metadata-rebuild initiative was **CLOSED + PROD-verified 2026-06-19.**
- One gap worth knowing: your run produced **zero output for `cooking_skills` / `main_ingredients`.** That gap is what later became the **C02** track — and C02 is one of the drift pockets below.

---

## What happened while you were gone

After finishing PR-6, Opus ran a **7-wave "deferred-work campaign"** — a ranked sweep of the entire backlog (224 raw → 169 canonical items, roadmap PR #519) — then executed most of it.

| Track | What shipped | PRs | Verdict |
|---|---|---|---|
| Metadata rebuild PR-6 finish | Stage-2 re-tag, Heritage filter, cleanup | #508/#509/#510/#516 | ✅ done, correct |
| Search "Medium" track | Query preprocessing, SEL index, synonym bridge, eval harness | Jun 16–19 | 🟢 **real wins** |
| Working-efficiency hygiene | Beads retired, MEMORY.md trimmed | #518 | 🟢 fine |
| **W1 — Theme B public UX** | Mobile filters, false "No matches", tsquery `&` crash, sort, URL-shareable search | #522–526 | 🟢 **high-value** |
| **W2 — Email + Security** | user-delete crash, send-email auth, `is_admin` param, detect-duplicates auth gate | #527/#528/#530/#531 | 🟢 legit (internet-exposed endpoints) |
| **W3 — Repo/docs hygiene** | Doc archival, migration-doc merge, 12 Dependabot bumps, edge-deploy verify (C33), memory split (C40), Security-Audit CI fix | #532–537 | 🟡 mostly ceremony (C33 legit) |
| **W4 — Data/corpus cleanup** | Closed stale submissions, hard-deleted 3 ghost rows, dev-seed generator | #538/#539/#540 | 🟢 legit hygiene |
| **C02 — cooking/ingredients re-tag** | Vocab canonicalization + 3-layer write lockdown | P1–P4b (`5d44bbe`) | 🟡 **overengineered** |
| **W5 — ReviewDetail refactor** | Test net → 1483→425 lines → parallelized load | #552–556 | 🟡 parkable (serves ~3 reviewers) |
| **W6 — Search depth** | C41 AND-of-ORs + PR-D two-pass relax | #569 (open) | 🔴 **in-flight; net-neutral** |

---

## The honest retrospective: did we drift?

### 🟢 Solid — leave it alone
- **W1 Theme B** fixed the surfaces a teacher actually touches: unreachable mobile filters, a false "No matches" flash, public search **crashing on `&`** (tsquery), a no-op sort, and shareable URL state (C114/C157 — *did* ship, in #526). Done tightly, ~1–2 commits apiece.
- **W2 security** closed genuinely **unauthenticated, internet-facing** endpoints (detect-duplicates could enumerate the whole corpus + write rows; send-email was anon-spoofable). Worth doing regardless of login count. Efficient — ~1 commit each.
- **W4 data cleanup** (ghost rows, stale submissions) — real hygiene, cheap.
- **Search "Medium" track** — the measured wins: `compost lesson for 3rd grade` went **766 junk results → 92 clean** (S1); the `decay→decomposition` synonym bridge lifted recall **0.642 → 0.728** with zero regression (S3).
- **C33 edge-verify** — guards a silent-no-op deploy that had bitten PROD **3×**; proportionate.
- **C42** — you *considered* replacing the search engine (ParadeDB/Meilisearch/Typesense/pgvector) and correctly concluded **"no engine pivot now."** Restrained, not a rabbit hole.

### 🟡 Overengineered — a lesson, not a rework
*(These are shipped + PROD-verified. Do **not** revert working code to "simplify" — that's just more drift. File these as "don't do it this way next time.")*
- **C02 re-tag.** Problem was real (122 values→23 concepts; 230→70). But **~23 sessions, ~$22, a spec'd-then-cut model bake-off, and a hybrid-floor harness that failed all 4 gates and had to be rebuilt** — to net **+0.065 F1 on `cooking_skills` only.** `main_ingredients` shipped a plain alias map; rules alone covered ~92–94%. **The necessary 20% (canonicalize + lock the dropdown/Zod/DB-CHECK write surfaces) was buried under 80% AI-tuning machinery.** Lesson: for bounded-vocab metadata, reach for a deterministic alias map + write-surface lockdown *first*; only spend LLM budget on the residual the rules can't reach, and size that spend to the measured gain.
- **Process/doc ceremony.** ~49% of commits were bookkeeping; per-wave 4-file scaffolds ran 100–250 KB (the C02 status archive alone is 133 KB); a meta-track (C37/C38/C40/C62) exists to manage the campaign itself. It was at least *self-aware* — scaffolding was tiered (full weight only for public-facing Theme B) and gates relaxed for prose. But the ratio of ceremony-to-shipped-fix is high for a 3-user tool.

### 🔴 Live decision — Wave 6 search (this is where the cursor is)
This is the one pocket that's **still open**, so it's a real decision, not just a lesson.

- **C41** ("AND-of-ORs via tsquery algebra") killed a real result-flood (`food waste decay`: 583 → 18; maxTotalCount violations 6 → 0) — **but self-inflicted a recall cliff**: recall 0.728 → 0.688, and `teamwork and cooperation` → **0 results**, `taste test` 7/10 → 1/10.
- **PR-D** ("two-pass loose-OR relax") exists **only to undo C41's own regression**: recall 0.688 → back to 0.728.
- **Net of all Wave 6: recall 0.728 → 0.728 (unchanged), precision slightly *worse* (0.833 → 0.800)** — bought with two migrations, a return-type change, a duplicated companion function, and a self-flagged 3-copy `WHERE`-sync hazard. And there's a *tail* of more tuning queued (phrase/collocation precision, C162 unaccent, WHERE-DRY refactor, dead-code cleanup).
- **The flood collapse itself is a genuine UX win — keep it.** The open-ended precision tuning behind it is the diminishing-returns part.

**Recommended call (yours to make — reproduce the net-neutral eval numbers against the scorecards before you accept it):** land the flood fix, **stop the precision-tuning tail**, and re-point effort. If Wave 6 continues, do it against a bar like "only ship a search change that moves a real eval metric by a meaningful margin with no offsetting regression" — Wave 6 as-is doesn't clear that bar.

---

## Where you are right now

- **Branch:** `feat/wave6-c41-and-of-ors` (7 commits ahead of `main`, pushed as **PR #569**).
- **Uncommitted:** one edit to `docs/plans/2026-06-29-wave6-search-depth-execution-status.md`, plus several intentionally-untracked `*-kickoff.md` files in `docs/plans/` (left untracked on purpose — don't `git add -A` them).
- **The decision in front of you:** ship-and-stop Wave 6 (above), or continue. Nothing else is mid-air.

---

## If you want to dig further (spend budget wisely)

Pointers so you don't have to re-derive anything:
- **Search track:** `docs/plans/2026-06-29-wave6-search-depth-{design,execution-status}.md`; engine survey `docs/plans/2026-06-29-c42-search-engine-options-notes.md`; eval harness + scorecards under `scripts/` (grep `search-eval`).
- **C02:** `docs/plans/2026-06-22-c02-cooking-ingredients-retag-{design,execution-status}.md` (133 KB archive exists but you rarely need it).
- **Campaign map:** roadmap `docs/plans/2026-06-20-deferred-work-roadmap.md`; master tracker `docs/plans/2026-06-21-deferred-campaign-status.md`.
- **Per-wave forensics:** `docs/plans/2026-06-2*-wave{2,3,4,5}-*` and `…-reviewdetail-followup-*`.

---

## Environment facts for your session

- **Fable 5 is un-suspended** as of ~2026-07-01. The old "Fable suspended → use Opus" model-tiering note is now stale; the standing preference is Fable (or inherit) for judgment-heavy work, Sonnet for bulk, never Haiku.
- **Don't resume the June-12 session.** Its context is ~19 days / dozens of PRs stale (e.g. it "remembers" a 1,483-line `ReviewDetail.tsx` that's now 425, ghost rows that are now deleted, an RPC signature rewritten several times). The task it was interrupted on is already finished. This doc *is* the resume. (The old transcript still exists as a read-only reference if you ever want your own past reasoning on the re-tag design — ask and it can be located.)
- **Pre-PR gate (unchanged):** `npm run check` (type-check + lint) before any push. Migration PR → TEST-DB MCP verify. Edge-fn PR → 3-signal post-deploy verify.
- **Audience reality check for every scoping call:** ~3 internal reviewers/admins are the only logged-in users; general public login is a later rollout; there *is* a public no-login teacher search. When a task's payoff assumes "lots of users," stop and re-scope.
