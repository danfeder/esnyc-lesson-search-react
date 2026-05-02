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

**Last session:** 2026-05-01 (session 4) · commits: TBD (D2 capture + Walkthrough state header refresh + Session 4 log entry).
**Progress:** **8 calls captured** — D0 ✅, D4 ✅, D8 substance ⚪ partial, Cross-cutting Scope 3 ✅, D1 meta layer ⚪ partial, Cross-cutting Stage 1 worksheet methodology ✅, D3 ✅, **D2 ✅ (fully decided — expand vocab to 5 + use `tags` for orientation)**. **4 walkthrough cards remain** (D5, D6, D7, D9 + D1 content layer in worksheet round + D8 phase-2 sub-questions).
**Next in queue:** **Decision 5 — academic concepts positioning.** No pre-walkthrough context captured this session (D5 wasn't researched). Per Path 3, D5 likely splits meta-layer-in-walkthrough vs. content-layer-in-worksheet-round (D5 is a vocabulary-bearing decision per the Path 3 framing established in session 2). The decisions doc D5 card is the starting framing.
**Walkthrough order remaining:** 5 → 6 → 7 → 8 (deferred sub-questions only) → 9.
**Open questions waiting on user:** None pending.
**Blockers / pending confirmations:** None.
**Mode reminders:** User is decision-driver (no separate stakeholder pass). Pushback expected — push back as much as needed. Capture lands in this file. Working preferences: explain why not just what; workflows are not sacred; data safety top priority; investigate before agreeing. **Path 3 shape established** — meta layer in walkthrough, content layer in worksheet round; applies to vocabulary-bearing decisions (D5, D9 still pending). Note: D3 turned out to be a fully-decided structural drop, not a Path 3 split; D2 turned out to be a single-session structural call with reviewer-curated stored field — Path 3 doesn't auto-apply to every card.

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
- TBD — `docs(metadata-rebuild): walkthrough session 4 — D2 capture (expand vocab to 5 + tags for orientation)`
