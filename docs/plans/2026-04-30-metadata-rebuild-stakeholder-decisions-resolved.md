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

**Last session:** 2026-05-02 (session 6) · commits: pending (D6 capture + N1 capture + import-drop list capture + D7 pre-walkthrough context + Walkthrough state header refresh + Session 6 log entry + new memory file `project_imported_non_esynyc_drops.md`).
**Progress:** **10 calls captured + 1 cleanup track flagged** — D0 ✅, D4 ✅, D8 substance ⚪ partial, Cross-cutting Scope 3 ✅, D1 meta layer ⚪ partial, Cross-cutting Stage 1 worksheet methodology ✅, D3 ✅, D2 ✅, D5 ✅, **D6 ✅ (option 1 minimal — `series_id` + `part_number`, foundation-phase metadata only, UI deferred to Phase 2)**, **N1 ✅ (multi-lesson-per-doc packing — Food System Advocates retitle, Winter After School Session 2 leave as-is, no schema column, imports out of N1 scope)**, **Cross-cutting import drops ✅ identified (23 wholesale third-party imports flagged for cleanup-track removal; full list in `project_imported_non_esynyc_drops.md`)**. **2 walkthrough cards remain** (D7 + D9 + D1 content layer in worksheet round + D8 phase-2 sub-questions).
**Next in queue:** **Decision 7 — lesson variants and adaptations.** Substantial pre-walkthrough context captured this session (see D7 card below). Headline: D7 doesn't collapse into one schema move — it decomposes into per-sub-pattern decisions, several of which fold to "drop the framing" or "no schema needed" given empirical reality. The walkthrough should open by confirming the decomposition shape, then walk site-specific (probably `school_id` candidate) + Mobile Education (3 sub-patterns, real call needed) as the two sub-decisions that need real walkthrough; Plan A/B + bilingual + sibling-Fattoush can land quickly given pre-walkthrough framing.
**Walkthrough order remaining:** 7 → 8 (deferred sub-questions only) → 9.
**Open questions waiting on user:** None pending.
**Blockers / pending confirmations:** None.
**Mode reminders:** User is decision-driver (no separate stakeholder pass). Pushback expected — push back as much as needed. Capture lands in this file. Working preferences: explain why not just what; workflows are not sacred; data safety top priority; investigate before agreeing; **plain language preferred for explanatory text**. **Path 3 shape established** — meta layer in walkthrough, content layer in worksheet round; applies to vocabulary-bearing decisions (D9 still pending). Path 3 doesn't auto-apply to every card. Session-6 specific: D6 was a fully-decided modeling call (no Path-3 split); N1 + import-drop captures emerged from D6 prep research and got handled inline as cross-cutting decisions rather than separate walkthrough turns.

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

**Status:** DECIDED 2026-05-01 (session 4)

**Decision: Expand activity_type vocabulary to 5 values (keep stored, no Replace) + use existing `tags` column for the orientation cluster.**

- **Activity_type schema:** keep `lessons.activity_type` stored as `text[]`; field stays reviewer-curated, not derived. Expand vocabulary to 5 values: `cooking / garden / both / academic / craft`. Schema-data mismatch (`academic-cooking` filter slug ↔ `both` data) gets cleaned up as part of Stage 1 vocabulary worksheet for activity_type.
- **Multi-select rejected.** Field stays single-element. The Dr. Carver Lotion-Making edge case (genuinely both food + craft) accepted as one mis-classification rather than redesigning storage shape for one lesson.
- **Replace-with-derived rejected.** Was attractive at 98.8% derivation cleanliness, but **craft can't be derived from skills** — the cosmetics lessons have `cooking_skills` tagged (Measuring, Mixing) because they physically use those techniques even though the lesson is craft, not cooking. Keeping the field stored is the honest accommodation.
- **Orientation cluster:** use the existing `lessons.tags` array column (currently unused, almost every row null/empty). ~15-30 program-orientation lessons get `tags = ["orientation"]`. Filter UI exposes a "Lesson Type" sidebar checkbox functionally identical to a boolean from the user's perspective. Tags allowed values defined as a closed enum in code, **starting with just `["orientation"]`**; add new values only when Stage 1 novelty pass surfaces evidence (e.g., `unit_intro`).
- **Special-pop cluster:** descriptive-only / FTS. N=1 (Atole, not in TEST DB; from PROD audit). Not worth a tag yet.
- **STEM/engineering cluster:** no first-class status. Current buckets fit cleanly — garden-systems experiments → `garden`; domain-agnostic physical science → `academic`; one engineering-design outlier (Seed Dispersal mis-tagged `both`) is an individual classification fix, not a category problem. Pedagogical method (experiment / recipe / observation / design-build) ruled out as a likely teacher search axis.

**Reasoning:**

- **Database verification (12 SQL queries) showed derivation rule cleanliness is 98.8%** (763/772 stored=derived). For the 58 academic-bucket lessons specifically, derivation is bulletproof: zero have `cooking_skills` or `garden_skills`, 57/58 have `academic_integration` populated, and the 1 truly-empty row is a broken legacy record (titled "---"). 4 of the 9 disagreements are broken legacy rows with summary "Error processing lesson" — data-quality cleanup, not a metadata-design problem.
- **3 parallel agent reads of ~25 actual lesson Google Docs surfaced four patterns:**
  1. **The audit's "doesn't fit" framing was partially wrong.** Most cited lessons fit existing buckets fine. The real issues are reviewer-judgment errors — specifically, **tasting being conflated with cooking** (Farm Workers & Pesticides, Plant Families, Roots tagged `both` because of a closing tasting attached to garden work) and **cosmetics tagged cooking** (lotion lessons get `cooking` because measuring/mixing skills are tagged).
  2. **Craft IS a real cluster.** ~5 cosmetics lessons (Lotion & Agar Soap K, Lotion & Agar Soap MS, Calendula Salve, Dr. Carver Lotion-Making's lotion half) are pure DIY personal-care, explicitly "NOT for eating." Not derivable from skills; needs first-class vocabulary value.
  3. **Orientation IS a real cluster but orthogonal to activity_type.** ~15-30 lessons share recognizable structural features (opening ritual, norms intro, low-stakes engagement, community-building, SEL emphasis). But "garden orientation" isn't a hybrid of garden+orientation — it's a garden lesson with an orientation purpose. Doesn't fit as a 6th bucket; needs a separate filter axis.
  4. **STEM/experiment is NOT a homeless cluster.** Splits into 3 sub-types that already classify naturally: garden-systems experiments (Decomposition, Photosynthesis) → `garden` (experiment is the *method*, garden literacy is the *content*); domain-agnostic physical science (Sink-or-Float, Thermal Energy) → `academic`; engineering-design (Seed Dispersal) → individual mis-classification, not a category problem.
- **Why expand-with-craft over pure Replace:** craft is real but can't be derived (cosmetics lessons share skills with cooking). Replace would either lose craft visibility (~5 mis-derived lessons) or require complex content-detection rules. Keeping the field stored handles the ~5 outliers explicitly via reviewer authority; the architectural cost of keeping the column is small since it's already there.
- **Why tags-not-field for orientation:** "adding a whole field for ~20 lessons is clutter" was the right intuition. The `tags` column exists, is currently unused, and provides identical filter UX to a typed boolean from the user's perspective. Closed-enum governance prevents junk-drawer accumulation. Reversible if patterns multiply later.
- **Why no `lesson_function` general field:** beyond orientation, the only plausibly-useful values were `unit_intro` and `intro-to-skill`, both unverified. The other speculative candidates (assessment, review, demo, substitute-friendly, pedagogy/method values) didn't survive scrutiny — either don't appear to be ESYNYC patterns or aren't typical teacher search axes. Designing a multi-value field for one confirmed value is over-engineering.

**Deferred sub-questions:**

- **Per-bucket canonical vocabulary** (the 5 values' exact spelling, capitalization, slug form, label text) — Stage 1 vocabulary worksheet for activity_type.
- **Schema-data mismatch resolution** — Stage 1 deliverable: rename filter slug, migrate data, or both. Option will fall out of vocabulary work.
- **Reviewer guidance: tasting ≠ cooking.** Phase-2 reviewer UX needs explicit rule — tasting alone shouldn't earn `both` or `cooking`. Affects ≥3 confirmed mis-tags + likely more across the corpus. Surfaces in phase-2 reviewer UX redesign.
- **Reviewer guidance: cosmetics → craft.** The ~5 lotion/soap/salve lessons need explicit re-classification to `craft` in Stage 2 corpus re-tag (or earlier as targeted cleanup).
- **Tags closed-enum governance** — define allowed values in code (start with `["orientation"]`); reviewers can't add free-text. Add new values only when Stage 1 novelty pass surfaces evidence. Implementation detail for foundation phase.
- **Dr. Carver Lotion-Making edge case** — genuinely both cooking + craft (Hoppin' John burger half + lotion-making half). Single-element classification picks one; accept the partial mis-classification or revisit if multi-select pressure builds.
- **Same-titled-different-bucket inconsistency** (Seed Dispersal x3 across `both`/`garden`/`garden`) — flagged as reviewer-judgment inconsistency. Stage 2 corpus re-tag should produce consistent classification across same-title-different-grade variants. May also intersect with D7 (variants and adaptations).
- **Stage 1 novelty pass for `lesson_function` patterns.** When the cross-cutting Stage 1 round runs the novelty pass, include "what role does this lesson serve in instruction?" as one of the questions. Confirms or refutes the unit_intro / intro-to-skill speculation; if patterns emerge, they can join the tags closed-enum.

**Downstream implications:**

- **Stage 1 vocabulary worksheet for activity_type is small** (5 values vs. ~78 for heritage) but needs to address: schema-data mismatch fix, the cosmetics → craft re-classification list, and the tasting=cooking reviewer-guidance rule. Probably no Opus-corpus-read needed — vocab is short and shape-stable, content patterns already surfaced in this walkthrough.
- **Stage 2 corpus re-tag should flag known mis-classifications:** ~5 cosmetics lessons (cooking → craft), the 3 `both`-tagged-garden-only outliers (both → garden, due to tasting conflation), the Seed Dispersal versions (consistent classification across grade-band variants).
- **Phase-2 reviewer UX:** explicit guidance for tasting=cooking conflation, cosmetics=craft, distinguishing program-orientation from intro-to-skill / unit-intro / project-launch (Agent 2 found "intro" overloads title — only ~half the "intro" lessons are program-orientation).
- **D6 (sequences):** unrelated to D2's resolution; the unit_intro tag question is deferred to Stage 1 novelty pass — if patterns surface there, can be added to tags closed-enum.
- **D7 (variants):** the Seed Dispersal x3 case is partially a D7 problem (same lesson, three rows, different grade bands). D2 doesn't fix this; D7 walkthrough needs to reckon with it.
- **Filter UI:** sidebar gets a 5-value Activity Type checkbox group + a separate "Lesson Type" tag-based filter section, starting at orientation only.
- **Cross-cutting reviewer-judgment finding:** the tasting-conflation pattern is the kind of cross-cutting reviewer-judgment error that Stage 2 re-tag should catch broadly, not just for activity_type. Stage 2 quality-check protocol should explicitly include "verify tag accuracy at the lesson-content level," not just "verify vocabulary cleanliness."

---

## Decision 3 — Lesson format split

**Status:** DECIDED 2026-05-01

**Decision: Drop the `lessonFormat` field entirely. Option D-pure — drop, no replacement, no derivation.**

- **Schema:** drop `lessons.lesson_format` column, drop `metadata.lessonFormat` JSONB key, remove `lessonFormat` from `filterDefinitions.ts`, remove `_alias_lesson_format` runtime helper, drop the 9 JSON-path indexes referencing `lessonFormat`.
- **Time-structure axis:** dropped, no derivation. Used to matter as a search dimension; staff have moved away from it.
- **Standalone-vs-unit axis:** dropped, no replacement at lesson level. Unit-tying becomes D6's modeling problem (relationship between lessons, not attribute of one lesson). D6 is framed as "later, not soon"; no foundation-phase dependency.
- **Mobile delivery-mode:** dropped from metadata; replaced by curatorial title convention adopted this past year ("lessons specifically for mobile education must have 'Mobile' in the title"). Mobile-education filtering = title-search only.
- **Sidebar UI:** option (a) — no `Lesson Format` filter section in the redesigned sidebar. Mobile lessons findable via search box + title FTS. No replacement Mobile-Education sidebar checkbox (would duplicate a search-box function).

**Reasoning:**

- All three axes `lessonFormat` was conflating lost their case independently:
  - **Standalone-vs-unit** (213 lessons currently tagged "Standalone"): not how teachers search; the vast majority of lessons are genuinely standalone, making the tag low-signal anyway. Tag count is also probably inflated by reviewer-noise (reviewers picking "Standalone" because it was the only context-shaped value in a single-select that conflated 3 axes). D6's eventual sequence modeling handles unit-tying naturally as a relationship.
  - **Time-structure** (522 lessons tagged single/double/multi-session): used to matter but staff have moved away from it as a search dimension recently. Even derivation from richer body content (explicit minute breakdowns like "5+30+5") wouldn't add value if staff aren't filtering on duration anymore.
  - **Mobile delivery-mode** (12 lessons currently tagged): the title-must-contain-Mobile convention adopted this past year makes the title the source of truth. Search box covers the use case naturally; a sidebar checkbox filtering on `title ILIKE '%mobile%'` would just duplicate a search-box function with no added capability.
- TEST DB spot-check (2026-05-01) validated that the new title-based convention is *more accurate* than the current tag. Of 12 currently-tagged-mobile lessons:
  - **9 conform** (titled "(Mobile Education)" or `(mobile)` and tagged Mobile).
  - **3 are tag-only false positives** — Breakfast Banana Splits, Crunchy Noodle and Tofu Salad, Garden on a Cracker. Currently mobile-tagged but title doesn't contain "mobile."
  - **1 is title-only false negative** — "Mobile Education: Mexican Street Corn Salad (Esquites)" is correctly titled but mis-tagged as `standalone`.
  - True mobile count under the new convention = 10, not 12. **The migration is the cleanup**: column drop strips the 3 false positives automatically; title-search naturally picks up the false negative. No pre-migration data work needed.
- Migration is unusually clean: drop column + JSONB key + filter UI section + alias helper + indexes. ~750 rows lose a tag and gain nothing in its place. Nothing material depends on the field (card UI's activity pill is computed from skills count not from `lessonFormat` per foundational report L420; the drawer / `IntLessonDetail` doesn't render `lessonFormat` per L424; FTS already indexes title + body; `_alias_lesson_format` becomes dead code; the 9 JSON-path indexes referencing `lessonFormat` become safe to drop).
- Reviewer UX is net better under teacher-zero D8 — one less classification field to fill at review time.

**Deferred sub-questions:**

- **New-submission flow detail.** When a teacher submits a Mobile Education lesson going forward, who/what enforces the "title contains Mobile" convention? Three possibilities: (a) reviewer renames at review time if needed, (b) submission form prompt asks "is this a mobile-education lesson? if yes, ensure 'Mobile' is in the title," (c) post-acceptance auto-prompt for the reviewer. Phase-2 reviewer UX implementation detail; not foundation-phase blocking.
- **Foundation-phase implementation sweep.** Confirm during implementation that no other UI surface depends on `lessonFormat` beyond what the foundational report enumerated — `IntCard` activity pill (already skills-derived), drawer (already omits it), card-meta-strip-last-position (per Lifecycle table L137: "Card meta strip last, list" — verify this is actually rendered or whether the foundational report flagged it as cosmetic). Cosmetic finding L595 already says: `lessonFormat` not rendered in `IntLessonDetail` despite being on every card.

**Downstream implications:**

- **D2 (activity type) walkthrough scope expands slightly.** D2's pre-walkthrough research had flagged D3-then-D2 as cleaner ordering because mobile/special-pop/orientation candidates needed routing. Post-D3-drop:
  - **Mobile is fully resolved** (title convention; D2 doesn't need to absorb it).
  - **Special-pop and orientation are now homeless** if they're not D2-shaped. They become D2's problem to either absorb as new buckets, accept as descriptive-content-only, or route to a different field (e.g., `audience_population` for special-pop, no-field-at-all for orientation).
  - Net: D2 walkthrough now has one less candidate (mobile) but two newly-orphaned candidates (orientation, special-pop) to think about. See D2 pre-walkthrough context update flagging this.
- **D6 (sequences) inherits the unit-tying question** that standalone-vs-unit was a partial proxy for. Flag at D6 walkthrough: this drop creates a downstream dependency. If D6 doesn't deliver some form of "lessons that belong together" modeling, that information is genuinely lost from the metadata system (though it remains in lesson body content as sequence references). Currently framed as "later, not soon" — fine, but worth not losing track of.
- **Phase-2 reviewer UX work loses one field to redesign.** Phase-2 scope shrinks slightly.
- **Foundation-phase migration** for D3 is one of the cleaner drops in the rebuild — no data migration needed, just schema removal + UI cleanup. Use as a low-risk leading migration if migration sequencing matters.
- **The PR-2 `lessonFormat` array-shape writer bug fix** (`20260506000000_filter_drift_pr2_m1_writer_fix.sql`) becomes moot post-drop — field doesn't exist, no shape can drift.
- **Path 3 hybrid shape was framed as applying to D3** in session 2's notes, but D3 turned out to be a fully-decided structural drop, not a meta-now-content-later split. Path 3 still applies to D2 / D5 / D9 (the vocabulary-bearing decisions); D3 was structurally simpler than initially framed.

---

## Decision 5 — Academic concepts positioning

**Status:** DECIDED 2026-05-01 (session 5)

**Decision: Keep silently for search (option 2) + Stage 2 re-tag in both framework AND everyday vocabularies + populate `search_synonyms` from concept tags + LLM auto-tag at submission time for ongoing population.**

- **Schema:** `metadata.academicConcepts` stays. Object-shape preserved (`{Subject: [concept, ...]}`).
- **UI surfacing:** none in foundation phase. No sidebar filter, no card rendering, no detail-view rendering. Concepts remain invisible to end users; reviewers gain a concepts editor in Phase 2.
- **Search booster:** add `academicConcepts` to `search_vector` (so full-text search reads concept tags as content) and to the corpus-side embedding generation prompt (`scripts/generate-embeddings.mjs` currently includes themes / heritage / skills / ingredients but not concepts — adding here makes them visible to embedding-based search too).
- **Stage 2 re-tag prompt:** Opus tags lessons in framework AND everyday language for each concept. Bounded to "framework word + 2–5 common teacher synonyms per concept" to prevent vocabulary explosion.
- **Synonym table population:** the resulting concept tags get fed into `search_synonyms` so query expansion bridges teacher↔framework vocabulary automatically (a teacher search for "decompose" expands to also match "decomposition").
- **Ongoing population for new submissions:** LLM auto-tagging runs at submission time as part of the existing async submission processing pipeline (`process-submission` edge function). Concepts are pre-drafted by the time the lesson lands in the reviewer queue. Reviewer validates / edits / replaces concepts in the Phase-2 reviewer concepts editor — one more field in their existing review pass, not a new stage.

**Reasoning:**

- **The framework vocabulary has no value to ESYNYC except making lessons searchable.** Confirmed with user — not curriculum-alignment, not reviewer workflow, not pedagogical framework. Its only job is search.
- **Teachers search using a mix of framework AND everyday vocabularies.** So the answer can't optimize for one and ignore the other.
- **Concepts do real (invisible) work for lessons that teach a concept without naming it** — a Plant Part Salad lesson teaching plant anatomy without using the word "anatomy"; a soup lesson teaching cultural geography without saying "geography." User confirmed this happens a decent amount. Body-text FTS alone would miss these; dropping concepts would cost real findability.
- **211 distinct values is genuinely too many for clean sidebar UX**, even with subject-level hierarchy and typeahead-search-within-filter. Filter route effectively ruled out.
- **Re-tag-in-both-vocabularies + synonym-table-population solve the vocab-mix-search problem from both ends.** Tag-side coverage (a query for "decompose" hits the literal tag) + synonym-side coverage (a query for any everyday word expands to also match the framework word for body-text matches).
- **Submission-time auto-tagging is the lower-burden timing for option-3 validation.** Concepts pre-populated → reviewer validates inline as one more field in existing pass. Approval-time tagging would either lose validation entirely (collapses to option 2) or require a second review pass (real extra stage). Re-uses the same Opus pipeline + canonical vocabulary as Stage 2; cost ~$0.05–0.30 per submission × ~10/year is trivial; latency adds 30–60s to async processing (teacher doesn't see).

**Deferred sub-questions:**

- **Per-concept canonicalization, hierarchy structure, subject groupings** — Stage 1 worksheet for concepts. Likely the biggest worksheet of the rebuild (211 values across 6 subjects + per-concept everyday-vocab synonym mapping).
- **Smart-search vs DB synonyms drift resolution.** The system has two synonym sources today: DB-driven (`search_synonyms` → `expand_search_with_synonyms`, drives result list) and TS-hardcoded (in `smart-search/index.ts` lines 18–75, drives suggestions chip). They don't sync. Foundation-phase implementation has to either populate both layers OR rip out the TS layer and have smart-search read from the DB table. Decide at implementation time.
- **Stage 2 re-tag prompt engineering** — exact "framework word + N synonyms" cap, validation rules, spot-check protocol. Same prompt design serves the per-submission auto-tag (so this work is shared between Stage 2 and ongoing).
- **16-archive-only-concepts recovery migration.** Small one-shot copy migration: `lesson_versions.metadata.academicIntegration.concepts` → `lessons.metadata.academicConcepts` for the 7 specific archive rows. Schedule pre-Stage-2 (so re-tag operates on complete data).
- **Per-field judgment on whether concepts needs an Opus-corpus-read in Stage 1.** Likely YES (content-heavy field with structural questions, similar to heritage). Confirm when worksheet round opens.
- **Concepts-vs-themes redundancy check.** Stage 1 worksheet for concepts should examine `thematic_categories` side-by-side — some concept values likely duplicate theme values ("ecosystems" might be both a concept and a theme). Decide whether to consolidate or accept the parallel layers.
- **Foundation-phase → Phase-2 transition gap handling.** Auto-tagging runs even before the reviewer concepts editor lands in Phase 2 — same pattern as today (reviewers can't see concepts, but they exist), now extended to new lessons. Confirm this is the intended sequencing at implementation time.
- **Reviewer-side concepts editor design (Phase 2).** Clearing semantics needs deliberate design (PR #473 carry-forward issue documented in `20260510000000_approve_update_concepts_carry_forward.sql`). Validation flow for the LLM-drafted tags — accept/edit/replace UI patterns. Phase-2 reviewer UX implementation detail.
- **Teacher-vocab validation honesty.** The everyday-vocab side of re-tag (and per-submission auto-tag) is Opus's judgment, not stakeholder-validated against a pre-existing teacher vocabulary corpus. Spot-check during Stage 2 review and via reviewer validation for new submissions; accept lower vocabulary-cleanliness guarantees on the everyday side than the framework side.

**Downstream implications:**

- **Stage 1 worksheet for concepts is the biggest worksheet** (211 values vs heritage's 78). Plan accordingly when scoping foundation-phase work.
- **Stage 2 re-tag prompt design needs both-vocabularies generation + capping** — non-trivial prompt engineering vs single-vocabulary tagging. Design serves both Stage 2 and per-submission auto-tag.
- **Foundation-phase migration list adds:** `search_vector` rebuild (include concepts), `search_synonyms` population from concepts, 16-concept archive recovery migration. ~3 migrations + 1 script change for embedding regeneration.
- **`process-submission` edge function expands** to include the per-submission concept-tagging step. Permanent infrastructure (an edge-function call inside the existing async pipeline), not a one-shot batch script. Foundation-phase scope.
- **`smart-search` edge function may need rewrite** — depending on the smart-search-vs-DB-synonyms drift resolution. Either update the TS hardcoded synonyms list to mirror the DB layer, OR refactor smart-search to read from `search_synonyms`. Foundation-phase scope.
- **Phase 2 reviewer UX work expands:** in addition to the concepts editor itself, needs to wire up the LLM-draft display + accept/edit/reject validation flow.
- **D9 (CRF) gets a precedent.** Keep-silently-for-search is now a viable shape D9 could adopt. If D9 ends up "drop," we'll articulate why concepts has keep-worthy search value while CRF doesn't (likely: concepts capture ideas not in body text; CRF is rubber-stamped framework theater without search-side payoff). Decide D9 independently when its turn comes.
- **Path 3 shape (meta-now-content-later) continues to apply for vocabulary-bearing decisions** — D5 just landed the meta layer; content layer (the 211-concept canonicalization + subject groupings + teacher-synonym mapping) defers to worksheet round + Stage 2 re-tag.

---

## Decision 6 — Curriculum sequences

**Status:** DECIDED 2026-05-02 (session 6)

**Decision: Option 1 minimal — model sequenced lessons with `series_id` + `part_number` foundation-phase metadata fields. UI work (badges, "next in series" links, sequence-aware lesson-detail rendering) deferred to Phase 2.**

- **Schema:** add `lessons.series_id text` (nullable, default NULL) + `lessons.part_number int` (nullable, default NULL). Both indexed for join/filter use.
- **Backfill scope:** ~7 sequenced series, ~14 lessons. Confirmed series from session-6 sweep: Decomposition Experiment Pt 1+2 (and 2nd Grade Decomposition Pt 1+2), Photosynthesis Light Experiment Pt 1+2, Knife Cuts Part 2, Will It Decompose Part II, Indoor Sprouts trio (1/2/3), Plant Part Salad multi-part. Some series have a missing partner row — backfill assigns `series_id` to the row that exists; the dangling reference is accepted, not synthesized.
- **Dedup interaction:** dedup pipeline reads `series_id` and skips comparison within the same series. This is the primary near-term payoff — stops embedding-similarity from flagging Decomposition Pt 1+2 as duplicates because their metadata is identical (per `project_dedup_third_state.md`).
- **UI (Phase 2):** "Pt 1" / "Pt 2" badges on lesson detail, "next in series" linking, sequence-aware search-result chips. Foundation phase ships the metadata only.

**Reasoning:**

- **The data confirms ~7 series / ~14 lessons.** Empirical sweep (session 6 Opus agents): 11 title-marker hits, unpacking to ~7 distinct series. Tight, bounded, well below 2% of corpus.
- **Two distinct payoffs have different cost structures, and the schema decision can be smaller than the framing implies:**
  - *Dedup-fix* (negative signal — stop flagging) is solved by metadata alone. Tiny field, immediate value.
  - *Teacher-discovery* (positive signal — surface "Pt 1 first" hint) requires UI work. Defer to Phase 2 per D0's hybrid sequencing — UI redesign is Phase 2 territory anyway.
- **Body-text references are asymmetric and inconsistent across series** (per session-6 body-text reads). Decomposition Pt 2 hyperlinks Pt 1 in Background section (gold-standard cross-reference); Photosynthesis Pt 1 is silent on Pt 2 (only Pt 2 acknowledges itself as a sequel); Sprouts trio numbers but doesn't hyperlink. **Schema can't rely on body-text scraping for the relationship** — stored fields are the right move.
- **Hand-curate ruled out.** A spreadsheet outside the DB is invisible to the dedup pipeline — leaves the misflag intact. Hand-curate would solve teacher-discovery weakly while leaving the dedup payoff on the table.
- **Drop ruled out.** D3's drop already deferred the "lessons that belong together" question here. If D6 ships nothing, that signal is genuinely lost — the metadata system has zero notion of relationships between lessons. Cost-of-modeling is too small to skip.

**Deferred sub-questions:**

- **Phase-2 UI design** — badge style, lesson-detail "next in series" treatment, search-result chip behavior. Phase-2 reviewer/teacher UX redesign scope.
- **`series_id` value space** — slug-based (e.g., `decomposition-experiment`) vs UUID vs incrementing integer. Implementation detail at foundation phase. Slug-based has the readability advantage; UUID has the no-collision advantage.
- **Submission-time sequence detection** — when a teacher submits "Decomposition Part 3" in 2027, does anything auto-link it to the existing series? Probably manual (reviewer assigns `series_id` at review time). Phase-2 reviewer UX detail.
- **Backfill of grade-band sibling families** — Cajun Sliders 3K-2/3-5/6-8 trio and similar (12 lessons) are NOT sequences (they're parallel grade-band variants), so they don't get `series_id`. They're D7 territory; flagged here so backfill doesn't accidentally include them.

**Downstream implications:**

- **N1 (multi-lesson-per-doc packing) inherits the "missing partner row" question.** Winter After School Session 2 is intentionally one row containing 4 sub-lessons; the `series_id` for "Winter After School" series can't link to those 4 sub-lessons because they're not separate rows. Acceptable — see N1 capture below.
- **Dedup pipeline foundation-phase work expands slightly** — needs `series_id`-aware comparison logic. Implementation detail, not a separate decision.
- **D7 (variants) inherits a different relationship-modeling shape.** D7 patterns aren't sequences; per-pattern handling diverges from D6. See D7 pre-walkthrough context.

---

## Decision 7 — Lesson variants and adaptations

**Status:** OPEN — pre-walkthrough context locked 2026-05-02 (session 6)

**Pre-walkthrough context (session 6):** Empirical sweep + body-text reads (4 Opus parallel agents) surfaced that **D7 doesn't collapse into one schema move alongside D6** — it decomposes into several smaller decisions, several of which fold to "drop the framing" or "no schema needed" given the data.

*The five named D7 patterns vs reality:*

| Pattern | Empirical count | Reality vs framing |
|---|---|---|
| Plan A/B contingencies | 1 cross-row pair (PS 109 Garden Jobs ↔ Leaf Rubbing Cards) + 12 within-row "rain plan" paragraphs | Framing assumed multiple cross-row pairs; reality is 1 case. The other 12 are within-lesson contingency paragraphs that don't need schema. |
| Mobile Education adaptations | 14 lessons across **3 sub-patterns** (inline-single-site, inline-multi-site, externalized-to-separate-doc) | Heterogeneous — schema move has to handle all three or pick one. |
| Bilingual variants | 6 lessons | **None are parallel Spanish lesson plans.** All are Canva handout/recipe-card links inside English lessons. The framing assumed sibling rows; reality is in-lesson handout support. |
| Site-specific authorship | **35 lessons (4.5%, dominant pattern)**. PS 216 leads (11 lessons + 33 with "For 216:" template prompt embedded). | Title-encoded almost exclusively (body rarely names the school); not a relationship — a per-row attribute. Suggests `school_id` field territory. |
| Same-dish-different-lesson (Fattoush-class) | 5–15 true Fattoush-class pairs estimated; 33 same-title-different-body pairs total in dedup queue territory | Dedup pipeline territory — already covered by `project_dedup_third_state.md`. Distinguishing from re-export duplicates needs human review. |

*Two patterns the framing didn't name (surfaced in body-text reads):*

- **Multi-lesson-per-doc collection (N1)** — 4 corpus rows are actually multiple distinct lessons packed into one doc. Captured separately below as N1 cross-cutting decision.
- **Imported third-party curriculum** — 23 corpus rows are wholesale third-party imports in non-ESYNYC format. Captured separately below as cross-cutting drop track.

*Two strong signals about how authors actually solve the multi-version problem:*

- **Within-row grade-band variations (43 lessons / 5.6%)** — "For younger students... / For older students..." inside one lesson body. **Dominant authoring strategy** that sidesteps siblings entirely.
- **Cross-row grade-band sibling families (12 lessons)** — Cajun Sliders 3K-2/3-5/6-8 trio is the cleanest case. Far less common than within-row.

*Critical caveat about the data:* `content_text` extraction strips most hyperlinks. Only 11 of 772 rows have raw `docs.google.com/document/d/` URLs in `content_text`. The Decomposition Pt 2 → Pt 1 link IS in the live Google Doc but probably isn't in stored content_text. **Any future cross-reference detection needs to run against live docs or re-extracted markdown, not stored content_text.**

*Lesson-to-lesson textual cross-references essentially don't exist in the corpus* — 1–2 actual cross-references in entire 772 rows. ESYNYC lessons are a flat collection.

**Implication for D7 walkthrough shape:** the four-options-as-written in the decisions doc (model fully / partially / hand-curate / drop) doesn't map cleanly to the data. D7 should be restructured into per-sub-pattern decisions:

- **Site-specific** → likely separate small decision (`school_id` field, 35 lessons, mostly title-encoded already, zero metadata coverage today). Probably the easiest win.
- **Plan A/B contingencies** → don't model. 1 case (PS 109). Hand-curate the title-encoded relationship or accept the lossiness.
- **Mobile Education** → real decision needed. 14 lessons, 3 sub-patterns. Options: (a) `mobile_ed_adaptation` boolean on the lesson, (b) `parent_lesson_id` + `relationship_kind` for the externalized-doc cases only, (c) hand-curate.
- **Bilingual handouts** → not a relationship. Either small `bilingual_handouts` boolean field or nothing (6 lessons below most thresholds).
- **Same-dish-sibling (Fattoush-class)** → dedup pipeline territory, not metadata. Already covered by third-state work in `project_dedup_third_state.md`.

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

## Cross-cutting: N1 multi-lesson-per-doc packing

**Status:** DECIDED 2026-05-02 (session 6) — surfaced from D6 prep research; handled inline as cross-cutting decision.

**Decision: Bespoke per-case triage, no new schema column. 2 cases handled differently; the 2 third-party-curriculum-package N1 cases excluded from N1 scope and folded into the import-drop track.**

- **Food System Advocates (Part 1 & 2)** (`1iqGFHrQ0rWfyoLo4R4n8FO9N-S7LW1ZpalaLNF5_Tmk`) — **retitle to drop "& 2", treat as one lesson.** Pt 2 is byte-identical to Pt 1 except for one different worksheet link; no real Pt 2 content to preserve. Cleaner than splitting into two rows (which would create a junk Pt 2 row with no unique content). Foundation-phase work: ~10 minutes.
- **Winter After School Session 2** (`1iwA2l4QPsqXJqu5lP8Ix5BarlTjIhxTQ`) — **leave as-is.** 4 distinct lessons (Eat the Rainbow / Alternative Protein Sources / Sugar Busters / Healthy Fats) packed into one row. Coherent ESYNYC-authored teaching arc; "Session 2" framing implies the 4 classes are designed as a unit. Splitting would second-guess curriculum-design intent.
- **No `is_multi_lesson_pack` schema column.** 2 cases is too rare to justify a column. Foundation-phase scope keeps it out.

**Excluded from N1 (handled separately):**

- **COLONIAL AND REVOLUTIONARY PERIOD NEW YORK** (`0BzjqiKCWBLWeYVlta0lkVXJfajg`) — wholesale 4th-Grade Social Studies unit imported from NYC DOE.
- **Children's Aid Society: Food Justice Program** (`15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz`) — full CAS multi-lesson curriculum imported.

These (plus 21 other imports) are folded into the cross-cutting import-drop track below — they're not ESYNYC-format multi-lesson packs, they're third-party curriculum imports.

**Reasoning:**

- **Empirical sweep classified 4 confirmed N1 cases + 19 false-positives** (within-lesson Day/Part agenda items, marker hits in unrelated contexts, long lessons with appendices). Sioux Chef, Farm Workers & Pesticides, Mr. Anthony's Spring Trees Unit are all NOT N1 — single lessons with multi-day or multi-activity body structure.
- **The 4 N1 cases split cleanly into 3 categories** by character: 1 artifact (Food System Advocates), 1 intentional ESYNYC unit (Winter After School Session 2), 2 third-party imports. User decided imports drop out of N1 scope — they're cleanup-track removals, not packing-shape decisions.
- **Food System Advocates retitle is smaller and safer than splitting.** Re-read confirmed Pt 2 is byte-identical to Pt 1 minus one worksheet link change — same Summary, Objectives, CRF/SEL boilerplate, Agenda, Engaging Activity (same Abuela Grillo video, same FlipGrid task), Closing, Materials. Pt 2 has zero unique pedagogical content. Splitting creates a near-duplicate ghost row that fails dedup or looks like junk to teachers.
- **Winter After School Session 2 stays packed.** Topical coherence (all 4 are nutrition-themed ~45-min mini-lessons) + "Session" framing suggests intentional teaching unit. Authors deliberately packaged it; reorganizing the corpus to disagree is a curriculum-design call we're not in the room to make.

**Deferred sub-questions:**

- **N1 surveillance for new submissions** — if a teacher submits a multi-lesson packed doc in 2027, does the system detect it? Probably reviewer-side at review time (one of the things reviewer UX should flag). Phase-2 reviewer UX detail.

**Downstream implications:**

- **Foundation-phase N1 work: ~10 minutes** (Food System Advocates retitle). Trivial.
- **D6 series_id has no application here.** Winter After School Session 2's 4 sub-lessons don't get separate rows, so they can't share a `series_id`. Acceptable — they're packaged as one row by intent.
- **Re-discovery of N1 patterns is expected as the corpus grows.** Foundation phase doesn't need a permanent mechanism; reviewer UX in Phase 2 handles new cases.

---

## Cross-cutting: imported non-ESYNYC-format curriculum drops

**Status:** CAPTURED 2026-05-02 (session 6) — drop list identified during session 6 sweep; deletion scheduling is a separate cleanup track sequenced after the walkthrough wraps.

**Decision direction (user, session 6):** **Imported curricula not in ESYNYC lesson-plan format should be dropped from the corpus.** They don't belong alongside ESYNYC-authored lessons. **23 wholesale third-party curriculum imports identified** (~3.0% of 772-row corpus). Deletion timing + soft-vs-hard delete are separate cleanup-track decisions; scope is locked here so foundation-phase work (Stage 1 worksheets, Stage 2 re-tag) operates on the post-drop corpus of ~749 lessons.

**Drop list, by source cluster:**

- **Project Food, Land & People (PFLP), 2003 vintage — 5 lessons, ~178KB**: Breads Around the World, What Piece of the Pie?, Amazing Grazing, Seasons Through the Year, The Plant and Me. PFLP template (`LEVEL: Grades / SUBJECTS / SKILLS / SUPPORTING INFORMATION`); explicit `©2003 Project Food, Land & People` copyright lines.
- **FoodCorps, 2017 vintage — 11 lessons, ~70KB**: 8 with explicit `Copyright © 2017 FoodCorps` (Plant Part Mystery!, Tortilla Time!, If Our Class Were a Soup..., What the World Eats, Rainbow Grain Salad, Choose-Your-Own Flavor Popcorn, Summer Sun Risin', Teas around the World [stub, 971 chars]); 3 template-match without explicit copyright (Green Sauce Around the World, Stone Soup, Our Food Traditions). FoodCorps template (`THEME / ESSENTIAL QUESTION / LEARNING OBJECTIVES / PREPARATION / ACTION STEPS`).
- **One-off imports — 7 lessons, ~93KB**:
  - Children's Aid Society: Food Justice Program (full multi-lesson curriculum, ~50KB)
  - COLONIAL AND REVOLUTIONARY PERIOD NEW YORK (NYC DOE 4th-Grade Social Studies unit, ~17KB)
  - Botanical Artists (City Blossoms — `HARVEST / GROUNDWORK / WORD BIN / TOOL SHED` template, ~11KB)
  - What is a Watershed? (NYC Dept. of Environmental Protection, ~9KB)
  - Leaves We Eat (Oregon Dept. of Education — `OR. Dept. of Ed. Key Standards` template, ~7KB)

Full list with lesson_ids + per-row evidence: `~/.claude/projects/-Users-danfeder-cCode-esynyc-lessonsearch-v2/memory/project_imported_non_esynyc_drops.md`.

**Reasoning:**

- **The clean drop signature is structural, not attribution-based.** Combination of: (no Cultural Responsiveness / Social-Emotional boilerplate fingerprint) + (no ESYNYC template — no Aim / Question of the Day / "in the Kitchen" headers) + (recognizable external-org template structure with template-specific section names).
- **The "Adapted from" pool is NOT the import pool.** Of 19 lessons citing external sources, 18 are ESYNYC-authored adaptations (they cite Peter Burke, ESYNOLA, Life Lab, Teacher's College, etc., as content sources but use ESYNYC's own template). Only Botanical Artists (City Blossoms) is a wholesale import. Attribution-language alone is a poor drop signal.
- **Authorship metadata is unfilterable for this** — `metadata->>'author'` / `authoredBy` is NULL across all 181 lessons that don't have CR/SEL fingerprint. Can't filter by author field.
- **PFLP and FoodCorps are time-clustered import blocs** (2003 and 2017 respectively) — look like one-shot corpus seeds, not ongoing acquisitions. The 6 one-off imports look incidental.

**Deferred sub-questions:**

- **Soft-delete (archive) vs hard-delete.** PROD has FK relationships (bookmarks, dismissals, etc.); even imports may have user state attached. Likely soft-delete via status flag or archive table; confirm at cleanup-track design time.
- **Cleanup-track sequencing.** Pre-Stage-1, mid-Stage-1, or pre-Stage-2? Probably pre-Stage-2 so re-tag operates on a clean corpus, but not blocking foundation-phase schema work.
- **Search/UI hiding before deletion.** If users have bookmarked any of these 23 imports, deletion breaks user state. Pre-deletion: hide from search results, surface "this lesson is being retired" in any UI surface that finds them via direct link.
- **Whether to preserve content for archival.** The 23 lessons total ~341KB content. Drop the database rows but maybe keep the Google Docs in a Drive archive folder if the curricula have any historical reference value.
- **The Teas around the World stub** (971 chars, FoodCorps template skeleton) — drops either way; flagged here as a content stub rather than a real lesson.

**Downstream implications:**

- **Foundation-phase corpus shrinks from 772 to ~749 lessons** after drops apply. Stage 1 worksheets and Stage 2 re-tag operate on the smaller set.
- **Stage 2 re-tag scope shrinks slightly** — 23 fewer lessons to re-tag. Trivial cost reduction.
- **Memory:** see `project_imported_non_esynyc_drops.md` for the full drop list with lesson_ids and per-row evidence.
- **Cleanup-track design** is a separate decision document; this capture flags the list for future scheduling.
- **Future-import surveillance.** If ESYNYC adopts another third-party curriculum after foundation phase, the drop signature here gives reviewers a checklist for whether to import the lesson plans verbatim (likely re-drop later) vs. re-author into ESYNYC format (keep). Phase-2 reviewer UX detail.

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

**Pre-walkthrough D2 research dispatched (session 2 wrap):** two parallel opus agents — (1) TEST DB corpus audit of activityType, (2) v3/v2/v1 schema-lineage + foundational report Q5 + D2 card framing + D3 interaction analysis. Both reported back in the same session; findings synthesized into the D2 card's pre-walkthrough context block above.

**Major reframings from D2 research:**
1. **No taxonomy ancestor.** activityType is not in v1/v2/v3 schemas at all. The 4-bucket scheme exists only in `filterDefinitions.ts:23-32`. v3 treats activity classification as emergent from which skills bucket gets populated.
2. **Schema-data mismatch.** `filterDefinitions.ts` declares `academic-cooking`; DB stores `both` (zero rows use `academic-cooking`); `both` semantically means garden+cooking, NOT academic+cooking.
3. **Multi-select capability exists in storage but is never used** (text[] column, single-element on 769/769 populated rows).
4. **Card UI computes activity pill from skills count, not from activityType** — field is already not authoritative for display.
5. **D2-D3 interaction is deeper than the doc suggests.** Several Q5 expansion candidates (mobile / special-pop / orientation) belong in D3's lessonFormat deconflation, not D2. Genuine D2-shaped candidates: craft, STEM-engineering, nutrition-unit.
6. **"Replace with derived classification" option is much more attractive than initially framed** (5 reasons surfaced in D2 card; needs verification on whether `academic`-bucket lessons derive cleanly).

**Carry-forward to next session:**

- D2 walkthrough opens with the no-taxonomy-ancestor reframing as the central reframe; opener provisional read leans toward Replace-with-derived option but flags the academic-bucket derivation question as needing verification.
- D2-D3 ordering: raise at session start whether to swap to D3-first or pair them.
- Heritage worksheet round is the first concrete Stage 1 deliverable once walkthrough wraps. Scope: ~78 values × per-value sample reads + novelty pass. Real time + tokens.

**Commits:**
- `137ca31` — `docs(metadata-rebuild): walkthrough session 2 — D1 meta layer + Stage 1 methodology`
- `21b5d34` — `docs(metadata-rebuild): backfill session 2 commit hash`
- `6a90dfe` — `docs(metadata-rebuild): session 2 wrap — D2 pre-walkthrough context`

### Session 3 — 2026-05-01

**Covered:** D3 walkthrough — opened with the D2-D3 ordering question (chose D3-first because D3's structural deconflation establishes routing for mobile/special-pop/orientation candidates that D2 was carrying); walked the 4 framed options (3 fields / 2 fields / multi-select / drop-and-derive) plus a workflow-level Option D variant; user landed on Option D-pure (drop entirely, no replacement, no derivation) when each axis lost its case independently. TEST DB spot-check confirmed the new mobile title convention is more accurate than the current tag.

**Calls landed (in order):**

1. **D3 ordering swap accepted.** D3-first instead of doc-order D2-first. Reason: D3's structural deconflation establishes where mobile / special-pop / orientation candidates live, simplifying D2.
2. **D3 standalone-vs-unit axis = drop, no replacement.** Not how teachers search; majority of lessons are genuinely standalone anyway; tag count is probably inflated by reviewers picking "Standalone" because it was the only context-shaped value in a single-select that conflated 3 axes. Unit-tying becomes D6's modeling problem ("later, not soon" framing remains).
3. **D3 time-structure axis = drop, no derivation.** Used to matter; staff have moved away from it as a search dimension recently. Even body-content derivation (richer minute breakdowns) wouldn't add value if staff aren't filtering on duration.
4. **D3 delivery-mode (mobile) = drop the metadata field; rely on curatorial title convention adopted this past year.** "Mobile" in title is the source of truth. Search box covers the use case naturally.
5. **Sidebar option (a) — no Lesson Format filter section.** Sidebar checkbox would just duplicate a search-box function with no added capability. Mobile lessons findable via search box + title FTS.

**Key reframings / insights:**

- **Path 3 (meta-now-content-later) framing from session 2 doesn't auto-apply to every card.** D3 turned out to be a fully-decided structural drop, not a meta-then-content split. Path 3 still applies to D2 / D5 / D9 (the vocabulary-bearing decisions); D6 / D7 are modeling questions; D3 was structurally simpler than initially framed.
- **TEST DB spot-check of mobile-tagged lessons** (2026-05-01) validated that the new title-based convention is *more accurate* than the current tag: of 12 currently-tagged-mobile lessons, **9 conform** (titled `(Mobile Education)` or `(mobile)` and tagged Mobile), **3 are tag-only false positives** (Breakfast Banana Splits, Crunchy Noodle and Tofu Salad, Garden on a Cracker — currently mobile-tagged but title doesn't contain mobile), and **1 is a title-only false negative** ("Mobile Education: Mexican Street Corn Salad (Esquites)" is correctly titled but mis-tagged as `standalone`). True mobile count under convention = 10, not 12. **Migration is the cleanup** — column drop strips the false positives automatically; title-search picks up the false negative. No pre-migration data work needed.
- **Migration is unusually simple.** ~750 rows lose a tag and gain nothing in its place. Nothing material depends on the field: card UI uses skills count for the activity pill (foundational report L420), drawer/`IntLessonDetail` doesn't render `lessonFormat` (L424 + cosmetic L595), FTS already indexes title + body, alias helper becomes dead code, the 9 JSON-path indexes referencing `lessonFormat` become safe to drop. Reviewer UX is net better under teacher-zero D8 — one less classification field at review time.
- **D2 scope shifted post-D3.** Mobile candidate fully resolved (title convention handles it); orientation (Green Room Scavenger) and special-pop (Atole speech-services pull-out) now homeless after D3 dropped delivery-mode entirely. D2's walkthrough now thinks about 5 candidate categories instead of 3 (craft, STEM-engineering, nutrition-unit + orphans orientation, special-pop) plus the meta keep/expand/multi-select/derive question on the existing 4 buckets.
- **The PR-2 `lessonFormat` array-shape writer bug fix** (`20260506000000_filter_drift_pr2_m1_writer_fix.sql`) becomes moot post-drop — field doesn't exist, no shape can drift.

**Pre-walkthrough updates for D2 (in-place, captured before clearing):** D2's pre-walkthrough context block updated to reflect post-D3 resolution. Mobile candidate marked "fully resolved." Orientation + special-pop flagged as newly homeless with three routing options (absorb as new D2 buckets / treat as descriptive-content-only / route to a new field like `audience_population` or `lesson_function`). Genuinely D2-shaped candidates unchanged (craft, STEM-engineering, nutrition-unit).

**Carry-forward to next session:**

- D2 walkthrough opens with the no-taxonomy-ancestor reframing as central; opener provisional read still leans toward Replace-with-derived but flags the academic-bucket derivation question as needing verification (does deriving `activityType` from skills handle the 58 academic-bucket lessons cleanly? probably populates `academicIntegration` only).
- D2 walkthrough now also routes orientation + special-pop, post-D3.
- Heritage worksheet round remains the first concrete Stage 1 deliverable once walkthrough wraps. Scope unchanged: ~78 values × per-value sample reads + novelty pass.

**Commits:**
- `2828563` — `docs(metadata-rebuild): walkthrough session 3 — D3 dropped entirely + D2 scope updated`

### Session 4 — 2026-05-01

**Covered:** D2 walkthrough — opened with no-taxonomy-ancestor reframing + Replace lean from session 2 wrap. Ran 12 SQL queries against TEST DB to verify derivation cleanliness (98.8% match, academic-bucket bulletproof). Dispatched 3 parallel agents reading ~25 actual lesson Google Docs (audit-cited "doesn't fit" cases, orientation cluster cohesion, STEM/experiment cluster cohesion). Agents surfaced four major reframings; user iterated through P1/P2/P3 packages, landed on a tightened P2 with `tags`-based orientation rather than a new `lesson_function` field after weighing schema-clutter cost.

**Calls landed (in order):**

1. **Activity_type field stays stored, NOT derived.** Replace was attractive at 98.8% derivation cleanliness but partially incompatible with surfacing craft (cosmetics lessons share skills with cooking — not derivable). Honest accommodation is to keep the field reviewer-curated.
2. **Vocabulary expanded from 4 to 5 values: cooking / garden / both / academic / craft.** Craft confirmed as a real cluster (~5 cosmetics/personal-care lessons — Lotion & Agar Soap K, Lotion & Agar Soap MS, Calendula Salve, Dr. Carver Lotion-Making lotion-half) by Agent 1 reading the actual docs.
3. **Multi-select rejected.** Field stays single-element. Dr. Carver Lotion-Making edge case (Hoppin' John burger + lotion craft) accepted as one mis-classification rather than redesigning storage shape for one lesson.
4. **Orientation handled via existing `tags` array column** (not a new field, not a 5th activity_type bucket). Closed-enum starting with `["orientation"]`; ~15-30 lessons get the tag. Filter UI exposes a "Lesson Type" sidebar checkbox functionally identical to a typed boolean.
5. **No `lesson_function` general field.** Beyond orientation, only plausibly-useful values were unverified (unit_intro, intro-to-skill); the rest didn't survive scrutiny. Designing a multi-value field for one confirmed value is over-engineering.
6. **Special-pop = descriptive-only.** N=1 (Atole), not worth a tag yet.
7. **STEM/experiment = no first-class status.** Splits naturally into existing buckets; not a homeless cluster as the audit framed.

**Key reframings / insights:**

- **The audit's "doesn't fit the 4 buckets" framing was partially wrong.** Most cited lessons fit existing buckets fine; the real issues are reviewer-judgment errors. Reading actual Google Docs flipped the framing from "schema needs more buckets" to "vocabulary needs cleanup + reviewer-guidance fixes."
- **"Tasting" is being conflated with "cooking" in reviewer judgment.** The 3 `both`-tagged-garden-only outliers (Farm Workers & Pesticides, Plant Families, Roots) and Seed Dispersal v1 all get `both` because of a closing tasting attached to garden work. This is a cross-cutting reviewer-judgment finding — Stage 2 corpus re-tag should catch it broadly; Phase-2 reviewer UX needs explicit guidance.
- **Same-titled lessons taught at different grade bands inherit different activity buckets** (Seed Dispersal x3 across `both`/`garden`/`garden`). Reviewer-judgment inconsistency, not content drift. Partial D7 (variants) problem.
- **Replace's elegance was nice-to-have, not load-bearing.** Once we accept that craft can't be derived, the architectural argument for Replace evaporates — the field already works as reviewer-curated; cleaning the vocabulary doesn't require dropping the storage.
- **The `lessons.tags` array column is essentially unused** and provides identical filter UX to a typed boolean. Lighter than adding a new field for a single confirmed pattern; closed-enum governance prevents junk-drawer accumulation; reversible to a structured field if patterns multiply.

**Database verification (TEST DB, 12 queries):**

- Cross-tab of `activity_type` × skills-bucket population showed derivation rule (cooking-only → cooking; garden-only → garden; both → both; neither but academic_integration → academic) matches stored value 98.8% (763/772).
- 58 `academic`-bucket lessons: 0 have cooking_skills, 0 have garden_skills, 57 have academic_integration (1 truly empty record is a broken row titled "---"). The verification gating Replace's viability is fully clean.
- 9 disagreements: 4 broken legacy rows ("Unknown" + "---" with summary "Error processing lesson"); 3 `both`-tagged-garden-only lessons (Farm Workers, Plant Families, Roots — tasting conflation); 1 garden+cooking-skill cross ("The Seasons: Fall"); 1 garden-no-skills row.
- Atole NOT in TEST DB; audit cited it from PROD or from a prior state.

**Doc reading findings (3 parallel agents, ~25 lessons):**

- Agent 1 (audit-cited "doesn't fit" cases): craft is real and first-class-worthy; the 3 `both`-tagged outliers are tasting-conflation mis-tags; Seed Dispersal x3 are same-lesson-different-grade-bands with inconsistent classification; recommendation = Replace + add craft.
- Agent 2 (orientation cluster cohesion): orientation IS coherent (4-6 of 9 read are real welcome-to-program); but orthogonal to activity_type ("garden orientation" isn't a hybrid); recommendation = new `lesson_function` field. (User pushed back on schema clutter; landed on `tags` column instead.)
- Agent 3 (STEM/experiment cluster cohesion): STEM/experiment NOT homeless; splits into 3 sub-types (garden-systems experiments → garden; domain-agnostic physical science → academic; engineering-design = 1 outlier); recommendation = no new bucket, optionally a `pedagogy` field. (User implicitly rejected pedagogy — not a typical teacher search axis.)

**Carry-forward to next session:**

- D5 (academic concepts) is next in queue. No pre-walkthrough research dispatched this session. D5 is a vocabulary-bearing decision per the Path 3 framing, so likely splits meta-layer-in-walkthrough vs. content-layer-in-worksheet-round.
- The tasting=cooking conflation finding is a cross-cutting reviewer-judgment pattern — should be flagged when D8 phase-2 sub-questions come up, and built into Stage 2 corpus re-tag quality protocol.
- Heritage worksheet remains the first concrete Stage 1 deliverable once walkthrough wraps. D2's vocabulary worksheet is much smaller (5 values) and likely doesn't need an Opus-corpus-read — content patterns already surfaced in this session.
- Closed-enum tags governance is a foundation-phase implementation detail (define allowed values in code; reviewers can't add free-text); when the `lesson_function` novelty pass happens during Stage 1, surfaced patterns can be added.

**Commits:**
- `5bdcbfc` — `docs(metadata-rebuild): walkthrough session 4 — D2 capture (expand vocab to 5 + tags for orientation)`

### Session 5 — 2026-05-01

**Covered:** D5 walkthrough — opened with no pre-walkthrough research, pulled foundational report Q6 + §8 + §9 + §14a + §14f for grounding. User answered the two key questions (framework vocab has no real ESYNYC value beyond search; teachers search using a mix of framework + everyday vocabularies) which collapsed the option space cleanly. Synthesis emerged combining option 2 (silent search booster) with the two workflow-alternative vocab bridges (re-tag in both vocabs + synonym table population). User then surfaced the gap re: ongoing tagging for new submissions, which led to a fourth piece (LLM auto-tag at submission time + Phase-2 reviewer validation UI). User confirmed the full synthesis after reviewing the literal capture draft.

**Calls landed (in order):**

1. **Filter route ruled out** (option 1 / option 4). 211 distinct values is too many for clean sidebar UX; framework vocab has no curriculum value to anchor the UX investment.
2. **D5 = keep silently for search.** Add `academicConcepts` to `search_vector` + corpus-side embedding generation prompt. No UI surfacing in foundation phase.
3. **Stage 2 re-tag in both vocabularies.** Opus tags lessons with framework word + 2–5 common teacher synonyms per concept. Bounded to prevent vocabulary explosion.
4. **Synonym table population.** Concept tags feed `search_synonyms` so query expansion bridges teacher↔framework automatically. Bridges body-text matches in addition to tag matches.
5. **Submission-time LLM auto-tagging for ongoing population.** Re-uses the Stage-2 Opus pipeline; runs in `process-submission` async pipeline; concepts pre-drafted by the time the lesson lands in reviewer queue.
6. **Phase-2 reviewer concepts editor with validation flow.** Reviewer validates/edits/replaces LLM draft as one more field in existing review pass — not a new stage.

**Key reframings / insights:**

- **Framework-vocab-has-no-real-value-beyond-search collapsed the option space hard.** Once the framework vocabulary lost its standalone value, options 1 and 4 (sidebar filter / mix → eventual filter) lost their case. Remaining choice was option 2 (silent search) vs option 3 (drop) — load-bearing question became "do lessons exist that teach concepts without naming them," which user confirmed they do.
- **The "two synonym sources don't sync" gotcha is real.** DB-driven `search_synonyms` (drives result list) vs TS-hardcoded synonyms in `smart-search/index.ts` lines 18–75 (drives suggestions chip). D5's call commits to populating the DB layer; if smart-search TS layer isn't synced, half the search experience won't see the bridge. Foundation-phase implementation has to address.
- **Submission-time vs approval-time confusion clarified mid-session.** User initially leaned approval-time but worried about "extra stage." Walked through both timings concretely; submission-time is actually the LOWER-burden timing for option-3 validation (concepts pre-populated → reviewer validates inline as one more field). Approval-time would either lose validation entirely (collapses to option 2) or require a real second review pass.
- **Per-submission auto-tagging makes the Opus tagging pipeline permanent infrastructure**, not a one-shot Stage 2 batch. Same prompt design + canonical vocabulary; just invoked per-submission inside the existing async processing. Foundation-phase scope expands slightly.
- **D9 (CRF) precedent set.** Keep-silently-for-search is now a viable shape D9 could adopt or reject. Distinguishing question for D9: does CRF capture ideas not in body text (like concepts does), or is it purely rubber-stamped framework theater? If the latter, drop. If the former, keep silently.
- **Plain-language preference captured to memory mid-session** (`feedback_plain_language.md` + MEMORY.md update). User asked for the D5 opening to be redone in simpler terms — request shouldn't change *what* is being conveyed, only *how*. Applied for the rest of the session.

**Pre-walkthrough context for D6 (none dispatched this session):** D6 is a modeling question (sequences, parts, sibling lessons), not vocabulary-bearing. Per session 2 framing, modeling questions likely land fully in walkthrough rather than splitting Path-3-style. D6 inherits the unit-tying question that D3's drop deferred. Foundational-report grounding to pull at session open: §13 (hidden curriculum / sequences / variants), §14e (Decomposition + Photosynthesis sequenced pairs case study), and the project memory file `project_dedup_third_state.md` (Decomposition Pt 1+2 case where identical metadata + designed-companion-lesson confounds dedup).

**Carry-forward to next session:**

- D6 walkthrough is next. ~25 lessons (3.2%) have real curriculum-sequence dependencies in body text; ~5 lesson series total in the corpus (Decomposition Pt 1+2, Photosynthesis Pt 1+2, Knife Cuts Part 2, Will It Decompose Part II, Winter After School Sessions, Food System Advocates 1+2, Lunar New Year units).
- The unit-tying question D3 deferred lands here — if D6 doesn't deliver some form of "lessons that belong together" modeling, that information is genuinely lost from the metadata system.
- Heritage worksheet remains the first concrete Stage 1 deliverable once walkthrough wraps. After D5's call, **concepts worksheet is now the second-largest deliverable** (211 values across 6 subjects + per-concept everyday-vocab synonyms).

**Commits:**

- `968912f` — `docs(metadata-rebuild): walkthrough session 5 — D5 capture (keep silently for search + both-vocab re-tag + synonyms + submission-time auto-tag)`

### Session 6 — 2026-05-02

**Covered:** D6 walkthrough (option 1 minimal — `series_id` + `part_number`, foundation-only metadata, UI deferred to Phase 2). Plus two cross-cutting captures that surfaced from D6 prep research: N1 multi-lesson-per-doc packing triage (Food System Advocates retitle, Winter After School Session 2 leave-as-is, no schema column) and the imported non-ESYNYC-format curriculum drop list (23 candidates identified for cleanup-track removal). Plus D7 pre-walkthrough context locked. Mode: walkthrough → empirical research dispatched (4 Opus parallel agents across 3 sub-tasks: D7-territory pattern quantification, body-text relationship cues read, Food System Advocates re-read + N1 sweep, imported-curriculum sweep) → re-synthesis → user calls captured.

**Calls landed (in order):**

1. **D6 = option 1 minimal.** `series_id` + `part_number` foundation-phase fields, ~7 series / ~14 lessons backfill. Solves both payoffs (dedup-skip via metadata + future teacher-discovery via Phase-2 UI). Hand-curate ruled out (doesn't fix dedup); drop ruled out (loses the "lessons that belong together" signal D3's drop deferred here).
2. **N1 = bespoke triage, no schema.** Food System Advocates retitle (artifact — Pt 2 byte-identical to Pt 1 except one worksheet link). Winter After School Session 2 leave-as-is (intentional ESYNYC unit — 4 nutrition-themed sub-lessons). Plus 2 newly-discovered curriculum-package N1 cases (COLONIAL NY + CAS Food Justice) excluded from N1 scope, folded into import-drop track instead.
3. **Cross-cutting: imported non-ESYNYC-format curricula = drop track.** 23 wholesale third-party imports identified across PFLP (5, 2003 vintage), FoodCorps (11, 2017 vintage), and 7 one-off imports (CAS, NYC DOE, City Blossoms, NYC DEP, Oregon DOE, plus 1 stub). Cleanup-track removal scheduling deferred; full drop list with lesson_ids captured to memory at `project_imported_non_esynyc_drops.md`.
4. **D7 pre-walkthrough context locked.** D7's 4-options-as-written framing doesn't map to data. D7 decomposes into per-sub-pattern decisions: site-specific (separate `school_id` field call), Plan A/B (1 case, don't model), Mobile Education (3 sub-patterns, real call needed), bilingual handouts (not a relationship, small flag or nothing), same-dish-sibling (dedup territory, not metadata).

**Key reframings / insights:**

- **D7 collapses-vs-stays-separate question answered empirically.** Collapsing D6+D7 into one `parent_lesson_id` + `relationship_kind` field was attractive in walkthrough framing but doesn't hold against data — D7 patterns have heterogeneous structural shapes (relationship vs attribute vs handout vs dedup), not a unified relationship-modeling problem. D6 stays clean as-is; D7 decomposes.
- **The "Adapted from" pool is NOT the import pool.** 18 of 19 "adapted from" lessons are ESYNYC-authored adaptations citing external sources for content/inspiration — they use ESYNYC's own template. Only Botanical Artists (City Blossoms) is a wholesale import. Attribution-language alone is a poor drop signal.
- **Authorship metadata is unfilterable.** `metadata->>'author'` / `authoredBy` is NULL across all 181 lessons without CR/SEL fingerprint. The clean drop signature is structural (no CR/SEL boilerplate + no ESYNYC template + recognizable external-org template).
- **Body-text-only relationships are real and invisible to SQL.** `content_text` extraction strips most hyperlinks (only 11 of 772 rows have raw doc URLs in stored content). Decomposition Pt 2 → Pt 1 link IS in the live doc but probably isn't in stored content_text. Future cross-reference detection needs live docs or re-extracted markdown.
- **Lesson-to-lesson textual cross-references essentially don't exist** (1–2 in entire corpus). ESYNYC lessons are a flat collection. D6/D7 modeling concerns get smaller in light of this.
- **PFLP and FoodCorps are time-clustered import blocs** (2003 and 2017). Look like one-shot corpus seeds, not ongoing acquisitions. The 6 one-off imports look incidental.
- **The "intentional vs artifact" distinction was load-bearing for N1.** Food System Advocates was identified as artifact via byte-level comparison (Pt 2 = Pt 1 + one different worksheet link). Winter After School Session 2 was identified as intentional via topical coherence + "Session" framing. The split would have been wrong if either case had been mis-read.
- **A 4th Opus agent run was the right move on N1.** Original quantification estimated 3-4 N1 cases; expanded sweep found 4 (with 2 newly-discovered being third-party-curriculum-packages, which the user then routed to a different track). Without the second sweep, those 2 imports would have been mis-treated as "intentional teaching units" and stayed in the corpus.

**Pre-walkthrough context for D7 (captured directly into D7 card above):** Major sub-decisions named, per-pattern empirical numbers locked, reframing applied (4-options-as-written doesn't map to data; D7 decomposes per sub-pattern). D7 walkthrough should open by confirming the decomposition shape, then walk site-specific (probably `school_id` field) + Mobile Education (3 sub-patterns, real call) as the two sub-decisions that need real walkthrough; the others (Plan A/B, bilingual, sibling-Fattoush) can land quickly given pre-walkthrough framing.

**Carry-forward to next session:**

- D7 walkthrough is next. Recommended shape: confirm per-sub-pattern decomposition, then walk site-specific (probably `school_id` field) + Mobile Education (3 sub-patterns, real call) as the two sub-decisions that need real walkthrough; the others (Plan A/B, bilingual, sibling-Fattoush) can land quickly given pre-walkthrough framing.
- D9 (CRF) follows D7. Path 3 still applies (vocabulary-bearing decision); meta layer in walkthrough, content layer in worksheet round.
- D8 phase-2 sub-questions need a brief revisit — but mostly absorbed into Phase-2 reviewer UX scope; not a heavy walkthrough.
- Heritage worksheet remains the first concrete Stage 1 deliverable once walkthrough wraps. Concepts worksheet remains the second-largest. Cleanup-track work (23-import-drop list + Food System Advocates retitle) sequences in alongside.

**Commits:**

- `5b31cda` — `docs(metadata-rebuild): walkthrough session 6 — D6 (sequences = option 1 minimal) + N1 + import-drop list + D7 pre-context`
