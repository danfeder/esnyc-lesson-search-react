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

**Last session:** 2026-05-01 (session 2) · commits: `da1adae` (S1 wrap — D1 pre-walkthrough context), + this session's D1 meta layer + Stage 1 methodology cross-cutting.
**Progress:** **6 calls captured** — D0 ✅, D4 ✅, D8 substance ⚪ partial, Cross-cutting Scope 3 ✅, **D1 meta layer ⚪ partial (NEW)**, **Cross-cutting Stage 1 worksheet methodology ✅ (NEW)**. **5 walkthrough cards remain** (D2, D3, D5, D6, D7, D9 + D1 content layer in worksheet round + D8 phase-2 sub-questions).
**Next in queue:** **Decision 2 — activity type categories.** D2 likely has the same Path 3 partial-call shape as D1 — meta layer settles in walkthrough (does the 4-bucket scheme need restructuring? scope of activity-type changes? interaction with lesson_format conflation per D3?), content layer (specific bucket definitions / canonical values) defers to worksheet round.
**Walkthrough order remaining:** 2 → 3 → 5 → 6 → 7 → 8 (deferred sub-questions only) → 9.
**Open questions waiting on user:** None.
**Blockers / pending confirmations:** None.
**Mode reminders:** User is decision-driver (no separate stakeholder pass). Pushback expected — push back as much as needed. Capture lands in this file. Working preferences: explain why not just what; workflows are not sacred; data safety top priority; investigate before agreeing. **Path 3 shape established** — meta layer in walkthrough, content layer in worksheet round; expect to apply per-card.

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

**Status:** PARTIAL 2026-05-01 — meta layer decided; content-layer sub-questions deferred to the heritage worksheet round under the new cross-cutting Stage 1 methodology (see below).

**Decision (meta layer, 4 calls):**

1. **Schema-vs-filter-UI = decoupled.** Schema stores granular cultural identities (Mexican, Lenape, Yemeni, Honduran are first-class storage values). Filter UI is a separate design layer that picks which leaves get sidebar visibility, with parent rollup for browsing (existing PROD mechanism — selecting "Asian" auto-includes children) and keyword search for the long tail. Storage stability is the headline benefit: a lesson tagged `Lenape` survives sidebar redesigns; promote-later is UI-only, no re-tag.

2. **Inclusion threshold for empirical long-tail = ≥2 lessons + content-centered test.** Numeric floor filters out one-off tags ("probably wrong"); content-evidence test (from the worksheet round's Opus-corpus-read) handles ambiguity that frequency alone misses (a 2× value can be highly significant if both lessons center the culture; a 5× value can be noise if all 5 just mention the culture in passing).

3. **v3 baseline zero-usage values = keep.** Filipino, Malaysian, Thai, Bengali, Pakistani, Uzbek, Cajun/Creole, Russian/Ukrainian, Polish, French, Palestinian, Lebanese, Syrian, Jordanian, Israeli, etc. — preserved as valid-future-tags even if a value turns out to have zero current PROD usage. v3 represents stakeholder-curated curriculum intent; pruning loses signal about which cultures the program is set up to receive. (Empirical-evidence note: user expects most/all v3 values likely have ≥1-2 corpus instances; worksheet round verifies. If verification finds true-zeros, the call still holds.)

4. **Sidebar-visibility for high-frequency values = yes for all three.** Indigenous (24-28×), African American diaspora (25-35×), and Mediterranean (42×) — all become sidebar-visible. Mediterranean already is in PROD; Indigenous and African American diaspora are the actual additions (currently in v3 schema under Americas → North American but dropped when PROD's filter tree was trimmed to level 3). Frequency justifies for all three; without sidebar surfaces, ~13% of the corpus has no parent-checkbox match.

5. **Heritage worksheet brief = locked.** See "Heritage worksheet brief" below.

**Reasoning:**

- **Path 3 hybrid shape** (meta-now, content-later) emerged when the Position 1 call (Opus-corpus-read integrated into worksheet drafting — see Cross-cutting: Stage 1 worksheet methodology) was made. Asking the user to pre-decide content placements (Mediterranean peer-vs-sub, Indigenous peer-vs-nested) before any worksheet exists would invert the workflow. D1 splits cleanly into (a) meta layer that doesn't need lesson-content evidence — settled in walkthrough — and (b) content layer that does — deferred to worksheet round + reviewer validation. Mirrors D8's partial-call shape.
- **Decoupling rationale:** storage stability + long-tail accessibility + cheap UI iteration. A lesson tagged `Lenape` in the metadata is still discoverable via "Indigenous Peoples" sidebar checkbox (parent rollup). Promote-later for any leaf is UI-only. Stage 2 corpus re-tag produces granular data once; sidebar can iterate without re-tagging. Small ongoing maintenance cost (two surfaces to keep in sync) is mitigated by build-time errors when filter values don't match schema leaves.
- **Threshold rationale:** the curriculum is small (~772 lessons total). Legitimate-but-rare cultural identities exist genuinely at low counts. ≥2 floor prevents pure tag-noise; content-centered test prevents calcifying mentions-in-passing. Worksheet round produces the evidence verdict per candidate.
- **v3-baseline keep rationale:** v3 = stakeholder-iterated taxonomy (per session 1's reframing — most-iterated lineage). Empirical additions go through threshold; v3 baseline grandfathered.
- **Sidebar-visibility rationale:** frequency-driven, not content-evidence-driven. ~13% of corpus otherwise unreachable via parent-checkbox is a UX failure, not a curated choice.

**Deferred sub-questions (content layer, to worksheet round):**

- **Indigenous structural placement** — peer of Asian/Americas/etc., or nested under Americas (v3 default)? Needs Opus-corpus-read evidence on whether the 24-28 lessons read as exclusively-Americas-focused or pan-continental.
- **African American diaspora structural placement + cluster shape** — nested where (v3 has it under Americas → North American)? Do the 25-35 lessons cluster cohesively under one node, or split (Soul Food vs. West African diaspora connections vs. broader Black culinary history)?
- **Mediterranean structural placement** — peer of European or under-European (v3 default)? Do the 42 lessons read as one shared-Mediterranean-foodways unit or as country-specific clusters (Italian / Greek / Lebanese / Egyptian)?
- **Lenape** — nested 5th-level leaf under Indigenous (v3 default) or promoted? Do the 7 lessons read pedagogically distinct from generic Indigenous treatment, justifying separate sidebar surface in NYC context?
- **The 28 empirical long-tail candidates** — which pass ≥2 floor + content-centered test (Honduran, Brazilian, Peruvian, Cuban, Yemeni, Sri Lankan, Egyptian, Aztec, etc.).
- **Tier-0 vs Tier-1 sidebar placement** for each promoted value (always-visible parent peer vs. click-expand under existing parent). Driven by content patterns + sidebar-bloat trade-offs.
- **Per-leaf sidebar visibility under each parent** — for high-frequency child leaves (Mexican 41×, Italian 26×), do they get Tier-1 checkbox treatment or stay metadata-only with parent-rollup access?
- **Canonical surface labels** — decide preferred form (e.g., "Indigenous Peoples" vs. v3's awkward "Indigenous/Native American" vs. just "Indigenous") for each value. Storage key separates from label so this is purely a UI decision.

**Heritage worksheet brief (the Stage 1 deliverable):**

*Per-value entry shape:*
- Canonical schema key + surface label.
- Alias list — every variant form found in the corpus that maps to this canonical (doubles as Stage 2 migration map; exhaustive — no skipping).
- Schema position in the hierarchy.
- Filter-UI tier (Tier-0 always-visible / Tier-1 click-expand / metadata-only).
- Corpus frequency.
- Content-evidence verdict (centered / mentioned-in-passing / mixed) with representative excerpts.

*Questions the Opus-corpus-read must specifically answer:*
1. Apply ≥2 floor + content-centered test to the ~28 empirical long-tail candidates — which pass.
2. Indigenous: pan-continental vs. Americas-only in the corpus content?
3. African American diaspora: cohesive single cluster vs. multi-cluster split?
4. Mediterranean: shared-foodways vs. country-specific clusters?
5. Lenape: pedagogically distinct from generic Indigenous?
6. Per-leaf sidebar visibility evidence under each parent (Mexican, Italian, etc.).
7. v3 baseline spot-check: are existing tags on low-usage v3 leaves correctly applied?

*Methodology constraints:*
- Per-value sample size: read every lesson if N ≤ 10; stratified sample of N=10 (axis TBD at implementation time) if N > 10. Bounds total work.
- Variant-form capture: exhaustive (every form in the corpus → alias list).
- Plus the cross-cutting **novelty pass** — see Cross-cutting: Stage 1 worksheet methodology.

**Downstream implications:**

- **Path 3 shape applies to all worksheet-bearing fields.** D2 (activity type), D3 (lesson format), D5 (academic concepts), D9 (CRF) all split the same way: meta layer in walkthrough, content layer in worksheet round + reviewer validation. D6 (sequences) and D7 (variants) are modeling questions, not vocabulary questions — likely land fully in walkthrough.
- **Heritage worksheet is the first of ~10 such worksheets.** Stage 1 is going to take real time and tokens (heritage alone ≈ 78 values × sample reads = potentially 300-500 lesson reads + the novelty pass). Worth knowing as you scope phase 1.
- **Schema-to-filter mapping is a worksheet deliverable** — not a separate decision later. The mapping comes out of the worksheet round alongside the canonical-key list.
- **Filter UI label flexibility** — sidebar can read "Indigenous Peoples" while storage key is `indigenous`. Reduces awkwardness in label naming as a separate constraint.

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

## Cross-cutting: Stage 1 worksheet methodology

**Status:** DECIDED 2026-05-01 — surfaced during D1 walkthrough; applies to all worksheet-bearing fields.

**Decision (3 calls):**

1. **Position 1 — Opus-corpus-read integrated into worksheet drafting.** Each per-field worksheet has two inputs: (a) v3 schema as baseline, (b) Opus-derived qualitative analysis of N sample lessons in that field. Worksheets include a "what we found in lessons" evidence column per candidate value. Per-field judgment on whether Opus-corpus-reads are needed: cultural heritage / academic concepts / lesson format → yes (content-heavy); cooking_methods / grade_levels → probably no (vocabulary is short and shape-stable). Stays as one Stage 1, no separate stress-test stage.

2. **Implementation logistics deferred to worksheet round.** Whether the Opus-corpus-reads happen as a discrete batch-step (job spec → batch API → assemble worksheet from output) or integrated (Claude reads lessons directly in-session and drafts as it goes) is pure implementation logistics — both produce the same brief output and same final worksheet. Settle at the start of the worksheet round when actual scope is known.

3. **Novelty pass added to Stage 1.** Beyond per-value sampling (which is positive-only — only reads lessons already tagged with each value), a stratified sample of the *whole corpus* (regardless of current tags) — proposed scope ~50-100 lessons across submission date / activity type — gets read by Opus with the question "what cultural identity / activity type / academic concept / etc. does this lesson center, if any?" Catches **missing values** (cultural identities or other concepts present in lesson content but never tagged) and **systematic mistagging** (e.g., "lessons tagged 'African' read as more specifically West African" → suggests Tier-1 expansion under African) **before** the schema locks. Eliminates the "schema lock-in then Stage 2 surprises us" failure mode.

**Reasoning:**

- **Position 1 over Position 2 (separate Stage 1.5):** integrating Opus reads with worksheet drafting keeps evidence next to the canonical-value proposal. Position 2's separate stress-test stage adds sequencing overhead without enough payoff — the Opus reads would just be re-read in the worksheet phase anyway.
- **Position 1 over Position 3 (no Opus reads in Stage 1):** Position 3 finalizes schema from v3 + tag-frequency + reviewer judgment alone. Risk: Stage 2 re-tag reveals the schema doesn't fit content reality, forcing a re-validate / re-tag loop. Cost of avoiding this loop is small (a few hundred Opus reads) vs. cost of paying it (re-doing thousands of re-tags).
- **Per-field judgment on whether Opus reads are needed:** cooking_methods has ~8-10 real concepts; reading lessons doesn't add much beyond what the v3 schema + frequency tally already tell us. Heritage / concepts / format are content-heavy with structural questions that frequency alone can't answer.
- **Novelty pass rationale:** the "read every lesson if N ≤ 10; stratified sample if N > 10" rule is positive-only — it samples from existing tags. Doesn't catch (a) cultures present in content but never tagged, or (b) false-negatives on existing values (lessons that should be tagged X but aren't). The audit explicitly found false-negative-style errors (cosmetics-craft tagged "cooking", grades 3K-8 on stovetop). Stage 2 will catch these eventually but only after the schema is locked. Bounded cost (~50-100 reads) for a meaningful failure-mode elimination.

**Deferred sub-questions:**

- **Discrete-vs-integrated implementation logistics** — settle at start of worksheet round.
- **Stratification axis** for the per-value N>10 sampling — submission date? activity type? something else? Settle at worksheet implementation time per field.
- **Novelty pass scope** — 50? 100? more? Tradeoff between coverage and read-budget. Settle when implementing.
- **Novelty pass schedule per field** — done once across all fields (one read produces evidence for all) or once per field? Settle when implementing.
- **Per-field judgment on Opus-reads-needed** — explicit list. Surface at the start of each field's walkthrough card.

**Downstream implications:**

- D1 + D2 + D3 + D5 + D9 walkthrough cards all explicitly land "meta layer here, content layer to worksheet round" partial-call shapes.
- Stage 1 work scope is larger than initially framed — heritage alone is ~300-500 lesson reads + novelty pass; 4-5 content-heavy fields means low thousands of reads. Real time + tokens.
- Stage 2 (Scope 3 corpus re-tag) inherits a schema that has been content-validated, not just frequency-validated. Reduces re-validation risk.

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

### Session 2 — 2026-05-01

**Covered:** D1 walkthrough — opener correction (v3 actually nests Indigenous under Americas/North American with 5th-level Lenape leaf; not "ambiguous" as session 1 framed it), then a structural pivot to the Path 3 hybrid shape, then the four meta-layer calls. Cross-cutting Stage 1 methodology emerged in the middle when user surfaced the "where does Opus reading lessons fit in the process" question.

**Calls landed (in order):**

1. **Position 1** (Cross-cutting Stage 1 methodology): Opus-corpus-read integrated into worksheet drafting. Per-field judgment on whether Opus reads are needed (heritage / concepts / format yes; cooking_methods / grade_levels probably no). User accepted directly when surfaced.
2. **Path 3 hybrid for D1** (and likely D2/D3/D5/D9): meta layer in walkthrough, content layer in worksheet round + reviewer validation. Mirrors D8's partial-call shape. Emerged when user pointed out Path 1/2 were a false binary — Path 3 was the natural consequence of Position 1 + D8 precedent.
3. **D1 meta-1 = decoupled.** Schema-vs-filter-UI separated. Schema stores granular values; filter UI is a separate design layer with parent rollup + keyword search for long tail.
4. **D1 meta-2 = ≥2 floor + content-centered test.** Numeric floor + qualitative evidence test for empirical long-tail candidates. v3 baseline zero-usage values kept (preserved as valid-future-tags; user expects most have ≥1-2 corpus instances anyway).
5. **D1 meta-3 = sidebar-visible yes for Indigenous + African American diaspora + Mediterranean.** Frequency-driven (24-28×, 25-35×, 42× respectively); ~13% of corpus would otherwise have no parent-checkbox match.
6. **D1 meta-4 = heritage worksheet brief locked.** Per-value deliverable shape + 7 questions for the Opus-corpus-read + methodology constraints (sample size rule, exhaustive variant capture).
7. **Novelty pass added to Stage 1.** Stratified sample of whole corpus (regardless of current tags) catches missing-cultures and false-negatives before schema locks. Added to cross-cutting Stage 1 methodology.

**Key reframing:** Path 3 shape (meta-now-content-later) is the natural consequence of Position 1. Rather than walkthrough deciding everything, walkthrough lands the *meta scaffolding that briefs the worksheet round*. Content-layer taxonomy decisions happen in the worksheet round + reviewer validation, where the Opus-corpus-read evidence lives. This applies to D2/D3/D5/D9 as well; D6/D7 are modeling questions not vocabulary questions and likely land fully in walkthrough.

**Empirical correction to session 1 notes:** session 1's pre-walkthrough context for D1 framed v3 as having Indigenous "ambiguous" between peer and nested. v3 (`taggingv3/esynyc-taxonomy-schema-v2.md:73-131`) is actually unambiguous — Indigenous nested under Americas → North American with 5th-level leaves (Lenape, Three Sisters traditions). PROD's `filterDefinitions.ts:115-161` is a *trimmed* version stopping at level 3, which explains why Indigenous + African American diaspora + leaf countries don't appear as filters. Gap is between v3 schema and PROD filter UI, not within v3 itself.

**Carry-forward to next session:**

- D2 (activity type) is next. Likely follows the same Path 3 split — meta layer (does the 4-bucket scheme need restructuring? scope of activity-type changes? interaction with lesson_format per D3?) settles in walkthrough; content layer (specific bucket definitions, canonical values) goes to worksheet round.
- Pre-walkthrough D2 prep worth considering: corpus audit of the 4 current activity-type buckets (cooking / garden / academic / academic-cooking) — how many lessons in each, what's the cluster shape inside each bucket, are there obvious mistagging patterns. Could be a session-end research dispatch if user wants to set up the next session efficiently.
- Heritage worksheet round is the first concrete Stage 1 deliverable once walkthrough wraps. Scope: ~78 values × per-value sample reads + novelty pass. Real time + tokens.

**Commits:**
- `137ca31` — `docs(metadata-rebuild): walkthrough session 2 — D1 meta layer + Stage 1 methodology`
