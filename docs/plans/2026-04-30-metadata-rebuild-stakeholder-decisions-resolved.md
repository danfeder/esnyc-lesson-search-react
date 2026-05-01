# Metadata rebuild — decisions resolved

**Date opened:** 2026-04-30
**Companion to:** `2026-04-30-metadata-rebuild-stakeholder-decisions.md` (the pristine 10-card doc)
**Mode:** Walkthrough order is interaction-aware (0 → 4 → rest in doc order). User is the decision-driver; this doc is a journal of calls + reasoning, not a contract — entries can be reopened.

**This file's role across the four-file scaffold:** acts as both *decision journal* (per-card Status/Decision/Reasoning blocks) AND *status tracker* (Walkthrough state header + Session log). When picking up post-`/clear`, read the Walkthrough state header first.

| Scaffold role | File |
|---|---|
| Design (what + why) | `2026-04-30-metadata-rebuild-foundational-report.md` (+ stakeholder brief + decisions doc) |
| Kickoff prompt | `2026-04-30-metadata-rebuild-stakeholder-decisions-kickoff.md` |
| Status doc + decision journal | **this file** |
| Implementation plan | TBD — to be scaffolded via `/kickoff-feature` once walkthrough completes |

---

## Walkthrough state — pickup checkpoint

**Last session:** 2026-04-30 (session 1) · commits: `0233d11` (D0+D4+D8+Scope 3), `3ef170c` (status-tracking infra), + a third commit landing pre-walkthrough context for D1.
**Progress:** **4 calls captured** — D0 ✅, D4 ✅, D8 substance ⚪ partial, Cross-cutting Scope 3 ✅ committed. **6 cards remain** (D1, D2, D3, D5, D6, D7, D9 + D8 phase-2 sub-questions).
**Next in queue:** **Decision 1 — cultural heritage taxonomy.** Pre-walkthrough context is captured in the D1 card below — read it as your starting point. The first thing to dig into is whether **Indigenous** is a peer to Asian/Americas/etc. or a sub-grouping under Americas (v3 was ambiguous; needs curriculum take).
**Walkthrough order remaining:** 1 → 2 → 3 → 5 → 6 → 7 → 8 (revisit deferred sub-questions only) → 9.
**Open questions waiting on user:** None (D1 walkthrough hasn't started in earnest — pre-walkthrough context is opener material, not a question).
**Blockers / pending confirmations:** None.
**Mode reminders:** User is decision-driver (no separate stakeholder pass). Pushback expected — push back as much as needed. Capture lands in this file. Working preferences: explain why not just what; workflows are not sacred; data safety top priority; investigate before agreeing.

---

## Decision 0 — Refine vs. rebuild vs. hybrid

**Status:** DECIDED 2026-04-30

**Decision:** **Hybrid.** Foundation phase: schema + vocabulary + three-regimes unification + new fields, designed as one coherent layer. Phase 2 (later): reviewer UX redesign + any submitter-side changes (constrained by the partial D8 call below).

**Reasoning:**
- Refine was ruled out first — the user assessed it as not in the running. Pain is interlocking (three regimes + cross-field vocabulary drift + lessonFormat conflation), not local; refining piecemeal would migrate the corpus multiple times as later decisions land.
- Rebuild vs. hybrid hinged on whether D8 (teacher contribution) needed to be co-designed with the schema. With D8 partial-decided as teacher-zero (see below), the schema doesn't need to encode submitter-authorship distinctions. That removes the schema-coupling that would otherwise force a single window.
- 2-reviewer expert pool makes phase 2 reviewer UX redesign cheap to iterate (actual users in the room) — strengthens the case for splitting risk across two phases of different shapes.

**Deferred sub-questions:**
- Phase 1 ships a Frankensteined ReviewDetail.tsx (old 1361-line layout + new field pickers tacked on) as the steady state between phases. Acceptable for the 2 reviewers but worth scoping at phase 1 design time (e.g., how long is the gap; is there a phase-1.5 cleanup that adds basic guidance text to the new pickers).
- Decision 9 (CRF) UI/surfacing may land in phase 1 or phase 2 depending on the D9 call.
- D5 (academic concepts) UI promotion — if the call is "promote to filter," that UI work lands in phase 1; if "derived index" or "drop," foundation only.

**Downstream implications:**
- All foundation-phase work (Decisions 1-7 + structural parts of 9) gets designed as one coherent schema + vocabulary, not as a sequence of independent migrations.
- Phase 2 reviewer UX redesign is **load-bearing for the data-quality payoff** under teacher-zero — see D8.
- D8 needs only a partial walkthrough when its turn comes (substance is settled; phase-2 sub-questions remain).

---

## Decision 4 — Vocabulary canonicalization

**Status:** DECIDED 2026-04-30

**Decision:**
- **Scope:** all ~10 vocabulary-bearing fields are in scope for canonicalization in foundation phase. No targeted/partial cleanup.
- **Case convention:** Title Case normalized across all fields (replaces today's Title Case + kebab-lowercase mix).
- **Methodology:** Claude-synthesized + curriculum-team-validated. Claude drafts per-field canonical worksheets using `/Users/danfeder/cCode/taggingv3/esynyc-taxonomy-schema-v2.md` as baseline + a corpus audit (Counter-style) showing PROD-actual values vs canonicals. The 2 expert reviewers + user validate / amend / reject the worksheets.
- **Reviewer attention sequencing:** lists upfront get the deeper attention (auditable, leverage point, taxonomy-decisions are short and complete). Per-lesson re-tag QA gets spot-check attention later.
- **Per-field reduction philosophy:** case-by-case. Some fields tolerate aggressive collapse (cooking_methods has 8-10 real concepts max); others preserve distinctions where they're pedagogically meaningful (heritage values like Lenape vs. Indigenous — preservation candidate per the discussion).

**Reasoning:**
- Three prior tagging projects (`/Users/danfeder/cCode/tagging`, `tagging_fresh_start`, `taggingv3`) revealed that the drift in current PROD was *born* in v3's July 2025 GPT-4.1 tagging run, not accumulated post-hoc. v3's `esynyc-taxonomy-schema-v2.md` is therefore the most-iterated stakeholder-derived taxonomy in the project's lineage and the right starting point — not from-scratch drafting, not corpus-frequency-only.
- v3 enforced enums on only 3 of 17 fields (Pydantic). The other 14 were `List[str]` with prompt-only constraints — explaining the drift. Foundation-phase rebuild needs strict per-field validation regardless of Title Case decisions.
- Reviewer attention is highest-leverage on the lists (~10 worksheets, abstract/structural) rather than individual lessons (~700+ tagging decisions). 2 expert reviewers mean taxonomy-validation is feasible; lesson-level review at scale isn't.

**Deferred sub-questions:**
- Per-field reduction calls (Lenape stays distinct vs. folds into Indigenous; `Mixing` vs. `Stirring` vs. `Mixing/stirring` canonical winner; etc.) — these land during the per-field worksheet drafting + reviewer validation, not as part of Decision 4 closure.
- The cookingSkills schema layout fix (group-headings-as-values bug from v3) — needs structural re-organization in the foundation-phase schema so headings can't be confused for emittable values. Implementation detail for foundation phase.
- mainIngredients was a v3-designed field (grouped categories with search-time expansion) that didn't survive into PROD — decide whether to revive in foundation-phase scope.
- Closed-vs-open enforcement policy per field (which fields stay closed enums vs. allow free-text additions, and what mechanism gates additions).

**Downstream implications:**
- Decisions 1, 2, 3, 5, 7 all consume the canonical vocabulary outputs — their own card walkthroughs will reference D4's per-field worksheets when relevant.
- The cross-cutting "foundation-phase corpus refresh" decision (Scope 1 / 2 / 3 — see below) determines how the canonical vocabulary gets applied to the corpus (mechanical translation vs. full re-tag).

---

## Decision 1 — Cultural heritage taxonomy

**Status:** OPEN — pre-walkthrough context captured 2026-04-30 (session 1 wrap); walkthrough proper begins next session with user response to opener positions below.

**Pre-walkthrough context** (opener positions, NOT settled calls — push back is expected next session):

*v3 schema reference:* `/Users/danfeder/cCode/taggingv3/esynyc-taxonomy-schema-v2.md:73-131` defines a 4-level hierarchy (Asian → regional groupings → countries). This tree was preserved verbatim into current PROD's `src/utils/filterDefinitions.ts` — so unlike most fields, the cultural-heritage *structure* is intact. The brokenness is around the structure, not in it.

*Empirical findings from v3 corpus audit (subagent extraction in session 1):*
- **78 distinct heritage values in PROD** vs. ~50 leaves enumerated in v3 schema → ~28 values emerged in tagging that aren't in the schema.
- **Drift variants:** "Indigenous" (28×) vs. "Indigenous/Native American" (schema canonical) vs. "Native American" (6×) — three forms across ~34 lessons. "African American" (35×) vs. "African American diaspora" (3×, schema canonical).
- **Empirical additions worth considering for first-class status:** Honduran, Brazilian, Peruvian, Cuban, Yemeni, Sri Lankan, Egyptian (each 2-3×), Aztec (2×), Lenape (7×).
- **Filter UI gap:** Mexican 41×, Italian 26×, African American 25-35×, Mediterranean 42×, Indigenous 24-28×, Lenape 7× — most NOT browsable filters today; live in metadata only.
- **Validation gap:** v3 enforced `culturalHeritage` as `List[str]` (no enum), one of 14 fields without per-field Pydantic validation — explains the drift.

*Three sub-questions to interrogate:*

**A. Canonical taxonomy SOURCE.** Two candidates:
- v3's hierarchy as-is (already in PROD's `filterDefinitions.ts`).
- **Empirical-augmented v3** — start with v3 baseline, evaluate empirically-emerged long-tail values per-value for inclusion. Threshold question: ≥2 lessons? ≥3? ≥5?

**B. Hierarchy depth.** v3 has 4 levels. Open calls:
- Lenape: 5th level under Indigenous → North American → Lenape, OR a peer at level 3?
- Mediterranean (42 lessons): peer of European, or sub-grouping (it cuts across continents in real geography)?
- City/regional-within-country values (e.g., Sicilian vs. Italian) — likely too granular, but worth confirming as an explicit "no."

**C. Long-tail filterability — promote vs. tier vs. hide.** The doc's central question:
- **Promote.** Every leaf with ≥N lessons becomes a filter option. ~50-60 filter options total. Sidebar gets crowded; reviewer burden up.
- **Tier the filter UI.** Sidebar shows top-level regional parents; click-to-expand reveals child picker. Cleaner UI; preserves long-tail accessibility.
- **Don't promote.** Long-tail stays in metadata; search-by-keyword finds them; sidebar stays focused on parents only.

*Opener provisional read (push back if wrong):*
- Source = empirical-augmented v3; per-value validation by user/reviewers.
- Depth = current 4 levels (no 5th level for Lenape; treat as peer at level 3 if promoted).
- Long-tail = tier the filter UI (sidebar shows parents, click-expand for child picker).
- **Most uncertain on:** whether **Indigenous** belongs as a peer to Asian/Americas/African/European/Middle Eastern, OR as a sub-grouping under Americas. v3 had it ambiguous. Curriculum take needed — this is the first thing to dig into.

---

**Decision:** _(pending)_

**Reasoning:** _(pending)_

**Deferred sub-questions:**

**Downstream implications:**

---

## Decision 2 — Activity type categories

**Status:** OPEN

**Decision:** _(pending)_

**Reasoning:** _(pending)_

**Deferred sub-questions:**

**Downstream implications:**

---

## Decision 3 — Lesson format split

**Status:** OPEN

**Decision:** _(pending)_

**Reasoning:** _(pending)_

**Deferred sub-questions:**

**Downstream implications:**

---

## Decision 5 — Academic concepts positioning

**Status:** OPEN

**Decision:** _(pending)_

**Reasoning:** _(pending)_

**Deferred sub-questions:**

**Downstream implications:**

---

## Decision 6 — Curriculum sequences

**Status:** OPEN

**Decision:** _(pending)_

**Reasoning:** _(pending)_

**Deferred sub-questions:**

**Downstream implications:**

---

## Decision 7 — Lesson variants and adaptations

**Status:** OPEN

**Decision:** _(pending)_

**Reasoning:** _(pending)_

**Deferred sub-questions:**

**Downstream implications:**

---

## Decision 8 — Teacher contribution at submission

**Status:** PARTIAL 2026-04-30 — substance decided in service of D0; phase-2 sub-questions still open.

**Decision (substance):** **Stay teacher-zero.** Reviewers remain sole authority for all metadata classification.

**Reasoning:**
- 2 expert reviewers on staff for curriculum; user wants consistency to live with that pairing.
- Teacher-side tagging would risk introducing inconsistency (the audit's own classification problems are reviewer-judgment calls — adding teacher input would compound them, not fix them).

**Deferred sub-questions (load-bearing for phase 2):**
- The audit's classification-inconsistency findings (cosmetics-craft tagged "cooking", grades 3K-8 on a stovetop lesson, immigration-stories on an African American foodways lesson) are reviewer judgment calls. Under teacher-zero, the only mechanism to fix them is reviewer tooling. Phase 2 reviewer UX redesign needs to address this — specific mechanisms TBD: guided pickers, per-field guidance text, paired-review prompts for novel cases, validation rules, audit/diff views before commit, etc.

**Downstream implications:**
- Schema design in foundation phase is reviewer-canonical only — no submitter-suggestions sidecar fields needed.
- D5, D6, D7 decisions unaffected by D8 — none of them require teacher input.
- D8's full walkthrough turn can confirm the substance call and focus on phase-2 reviewer-tooling sub-questions.

---

## Decision 9 — CRF redesign

**Status:** OPEN

**Decision:** _(pending)_

**Reasoning:** _(pending)_

**Deferred sub-questions:**

**Downstream implications:**

---

## Cross-cutting: foundation-phase corpus refresh strategy

**Status:** COMMITTED 2026-04-30

**Decision:** **Scope 3 — full re-tag with Opus, sequenced after taxonomy validation.** Two stages, with flex on the gap between them:
1. **Stage 1 — Taxonomy build-out.** Per-field canonical worksheets drafted by Claude using v3 schema as baseline; reviewers + user validate. Schema structural decisions (Decisions 1-7 + parts of 9) settle in parallel. **This is the urgent stage.**
2. **Stage 2 — Corpus re-tag.** At some point after Stage 1 lands — *maybe not immediately, but yes* — re-tag all ~772 lessons with Opus reading raw lesson text against the validated canonical schema. Pydantic-validated for ALL fields this time (not just 3 of 17 like v3). Reviewers spot-check ~50-100 sampled lessons; flagged patterns or specific lessons get full review.

The gap between stages is intentional. Stage 1 is high-leverage and time-sensitive (everything downstream depends on it). Stage 2 is the comprehensive corpus refresh that captures the highest payoff from the taxonomy work, but doesn't have to ship immediately after Stage 1 — could be a separate sub-phase, could slip if other priorities take precedence.

**Reasoning:**
- The audit-found judgment errors in PROD (cosmetics-craft tagged "cooking", grades 3K-8 on stovetop, immigration-stories on African American foodways, CRF rubber-stamping with verbatim-identical 7-element lists across 5 lessons) are GPT-4.1's judgment errors, not vocabulary drift. Mechanical drift→canonical translation (Scope 1) doesn't fix them.
- Opus's calibration + judgment + edge-case handling materially exceed GPT-4.1's. The model upgrade is the highest-leverage fix for judgment errors.
- Cost is small (~$200-300 for 772 lessons + 1-2 sessions of pipeline engineering). v3's existing Batch API + validation infrastructure adapts.
- Sequencing taxonomy-first is correct: Opus needs validated canonical vocabulary to tag against. Trying to re-tag while vocabulary is still being decided would produce another v3-style drift run.

**Deferred sub-questions:**
- Spot-check sample size + selection method (random? stratified by activity type? targeted at the audit-found problem lessons?). Decide at foundation-phase implementation time.
- Re-tagging pipeline: adapt v3's Python infrastructure (`/Users/danfeder/cCode/taggingv3/gpt_tagger/`) or build fresh via Claude Agent SDK / batch API? v3 had Pydantic + Batch API + reference-batch-as-prompt-example — those patterns are reusable; the pipeline rebuild is mostly swapping OpenAI for Anthropic + extending validators to all fields.
- What happens to PROD's existing tags during re-tag — staged migration with versioning? Direct replacement? Diff-and-review?
- Whether to spot-check via re-tag DIFF (what changed) or fresh-tag review (was the new tag right). Different reviewer experiences.

**Downstream implications:**
- D2 (activity type), D3 (lesson format), D5 (academic concepts), D9 (CRF) all benefit from the re-tag as well — judgment errors in those fields also get a fresh look.
- Foundation-phase scope expands to include the re-tag pipeline + spot-check protocol, not just schema migrations.
- Phase 2 (reviewer UX redesign) inherits a cleanly re-tagged corpus, which makes the reviewer's job more about validating new submissions vs. the existing corpus — relevant for Decision 8's deferred phase-2 sub-questions.

---

## Session log

Each entry is one walkthrough session. Captures: what was covered, what landed, key insights or reframings, the commit if one was made.

### Session 1 — 2026-04-30

**Covered:** D0, then D4 (with D8 substance + Cross-cutting Scope 3 emerging mid-walkthrough). After the decision-capture commit, also built status-tracking infra into the scaffold and captured pre-walkthrough context for Decision 1 to set up the next session.

**Calls landed (in order):**
1. D0 = **hybrid**. Refine ruled out first; rebuild-vs-hybrid unlocked by D8 partial call.
2. D8 (substance, partial) = **stay teacher-zero**. Decided in service of D0 because hybrid required knowing whether the schema needed to encode submitter-authorship distinctions. Phase-2 reviewer-tooling sub-questions deferred.
3. D4 = **full canonicalization in foundation phase**, all fields, Title Case, Claude-drafts-and-reviewers-validate methodology with v3 taxonomy as baseline. Reviewer attention sequenced lists-first.
4. Cross-cutting **Scope 3 commit** (confirmed): full corpus re-tag with Opus will happen at some point after taxonomy validates — maybe not immediately after Stage 1, but yes. Stage gap is intentional, with flex on Stage 2 timing.

**Key reframing:** 3 parallel opus subagents explored the prior tagging projects (`/Users/danfeder/cCode/tagging`, `tagging_fresh_start`, `taggingv3`). Surfaced that the vocabulary drift in current PROD was **born in v3's July 2025 GPT-4.1 single-session tagging run**, not accumulated post-hoc from submitter UIs or reviewer error. v3's `esynyc-taxonomy-schema-v2.md` is therefore the most-iterated stakeholder-derived taxonomy in the project's lineage and the right baseline for canonicalization (rather than from-scratch drafting or corpus-frequency-only).

**Scaffold infra added (post-D4):** Walkthrough state header + Session log structure on resolved doc; pickup-check step + at-session-end checklist on kickoff prompt. Also normalized the "capture pre-walkthrough context before clearing if research surfaced" pattern (kickoff step 3 in the at-session-end checklist).

**Pre-walkthrough context captured for D1:** v3 schema reference + corpus audit findings (78 distinct values, drift variants, candidate empirical additions) + three sub-questions to interrogate (source / depth / long-tail filterability) + opener provisional read. Marked as opener positions, not settled calls.

**Commits:**
- `0233d11` — `docs(metadata-rebuild): walkthrough session 1 — D0+D4+D8 + Scope 3 captured`
- `3ef170c` — `docs(metadata-rebuild): walkthrough scaffold — status-tracking infra`
- (third commit landing this session-end capture)

**Carry-forward to next session:** Pre-walkthrough context for D1 is in the D1 card; opener position will likely get pushback on the "Indigenous as peer vs. sub-grouping under Americas" question. User will clear before next session.
