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

**Last session:** 2026-05-03 (session 9) · commit pending (D8 phase-2 dropped after empirical investigation; Stage 2 reviewer-validation UX walk added as deferred follow-up to land during foundation-phase implementation planning).
**Progress:** **13 calls captured + 1 cleanup track flagged — walkthrough FULLY WRAPPED** — D0 ✅, D4 ✅, D8 substance ✅, D8 phase-2 ✅ (dropped, replaced by Stage 2 reviewer-validation UX deferred walk), Cross-cutting Scope 3 ✅, D1 meta layer ⚪ partial (content layer = worksheet round), Cross-cutting Stage 1 worksheet methodology ✅, D3 ✅, D2 ✅, D5 ✅, D6 ✅, D7 ✅, D9 ✅, N1 ✅, Cross-cutting import drops ✅. **Remaining work:** D1 content layer (Stage 1 heritage worksheet round, after foundation-phase implementation begins); Stage 2 reviewer-validation UX (deferred walk during foundation-phase implementation planning).
**Next in queue:** **`/kickoff-feature` foundation-phase implementation plan scaffolding** per the multi-session execution preference. Stage 2 reviewer-validation UX walk lands during that planning when the LLM-draft-validation flow is the active design surface.
**Walkthrough order remaining:** None — main walkthrough complete. Foundation-phase implementation + Stage 2 reviewer-validation UX walk + Stage 1 worksheet rounds (heritage first, concepts second-largest) sequence in alongside implementation.
**Open questions waiting on user:** None pending.
**Blockers / pending confirmations:** None.
**Mode reminders:** User is decision-driver (no separate stakeholder pass). Pushback expected — push back as much as needed. Capture lands in this file. Working preferences: explain why not just what; workflows are not sacred; data safety top priority; investigate before agreeing; **plain language preferred for explanatory text**. **Path 3 shape (meta-now / content-later)** applies to D1/D5; **D9 didn't need it** — the established Brown CR framework (master list at `~/Downloads/Cultural Responsiveness Guidelines.md`) provided the canonical vocabulary directly; no fresh stakeholder exercise required. **Empirical-decomposition route** (used in D7) — pattern available when a card's framing doesn't survive empirical contact. **The "valid variations" principle (D7.4)** — default for any future "lessons share content but aren't duplicates" finding is don't model; rely on dedup-pipeline memory for cross-version flagging. **LLM-as-extractor-not-author pattern (D9)** — when LLM is operating against teacher-zero/reviewer-authority, scope LLM to extracting-only-what-is-in-body, with closed-enum mapping as the heaviest judgment it makes; reviewer overlay is lenient (framework-grounded inference allowed without body-span citation). **Audit-attribution check pattern (D8 phase-2 / session 9)** — when an audit cites errors as "reviewer judgment problems," verify provenance before designing reviewer tooling. The 2026-05-03 investigation found 87% of corpus tags came from the v3 GPT-4.1 batch, never reviewer-validated. Audit-cited errors should be classified by source (vocab inadequacy / inconsistent batch tagging / never-reviewed-inheritance / actual reviewer judgment) before mechanisms are designed.

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

**Status:** DECIDED 2026-05-03 (session 7)

**Decision:** **Decompose D7 into 5 per-sub-pattern decisions; net outcome is "no new modeling" across all 5** (with one tiny exception for bilingual handouts via the existing tags column).

| Sub-pattern | Call | Mechanism |
|---|---|---|
| **Plan A/B contingencies** | Don't model | N=1 cross-row case (PS 109 Garden Jobs ↔ Leaf Rubbing Cards); 12 within-row "rain plan" paragraphs stay in body prose |
| **Bilingual variants** | Tag with `["bilingual_handouts"]` | Reuses tags column; D2 closed enum grows from `["orientation"]` to `["orientation", "bilingual_handouts"]`. Surface label "Has Spanish handouts" (not "Bilingual lesson") — the lessons are English with Spanish handouts, not parallel Spanish lesson plans |
| **Same-dish-sibling (Fattoush-class)** | Defer to dedup pipeline | Third-state memory mechanism in dedup pipeline; not metadata. See `project_dedup_third_state.md` |
| **Site-specific authorship** | Don't model | "Valid variations of base lessons" reframing — site identity is incidental and stays in title; no `school_id` column, no `schools` table |
| **Mobile Ed externalized adaptations** | Don't model | Title convention (per D3) + dedup-pipeline third-state for cross-version dedup. Inline single/multi-site Mobile Ed is body-text prose, also no metadata |

**Net D7 outcome:** corpus stays flat. Zero new cross-row relationship modeling. The only schema move from D7 is the bilingual_handouts tag addition. Combined with D6 (`series_id` + `part_number`), foundation-phase structural relationship modeling is **two small additions to lesson rows** — no new tables, no FK relationships between lessons except the loose `series_id` grouping.

**Reasoning:**

- **Empirical decomposition was load-bearing.** The original 4-options-as-written framing in the decisions doc (model fully / partially / hand-curate / drop) didn't survive contact with the data. The session-6 4-Opus-agent empirical sweep showed that the 5 named D7 patterns have heterogeneous structural shapes — each needs its own call, not one architectural choice across all 5. Walkthrough opened by confirming the decomposition as a meta call before walking sub-patterns; user accepted, easy-then-hard order chosen.

- **D7.1 Plan A/B (don't model):** N=1 cross-row case (PS 109 Garden Jobs ↔ Leaf Rubbing Cards) doesn't justify schema. The 12 within-row "rain plan" paragraphs are already body-text prose and need no metadata. Bloating the orientation-only tags closed enum for 1 case was rejected on the same schema-clutter grounds the user pushed back on at D2.

- **D7.2 Bilingual (tag, not boolean column):** 6 lessons. Important reframing — none are parallel Spanish lesson plans; all are English lessons with Canva handout/recipe-card links to bilingual versions embedded in body. So this is a per-row attribute ("has bilingual handouts") not a sibling-row relationship. Tag chosen over boolean column because (a) reuses existing tags column we already committed to in D2, (b) bilingual classroom teacher discoverability is a real user pattern, (c) extensible if pattern grows (Spanish handouts seem like the kind of thing teachers would add more of over time). Boolean column rejected for same "schema for small N is clutter" reason orientation went to tags. Surface label should be "Has Spanish handouts" (not "Bilingual lesson") — the lesson body is English; only the handouts are Spanish, and mislabeling would set wrong expectations.

- **D7.3 Same-dish-sibling (defer to dedup):** The pattern (different dish-teaching lessons sharing a central dish, e.g., two Fattoush lessons) is structurally a dedup-pipeline problem — the missing piece is a *memory* mechanism so dedup remembers a reviewer's "not duplicate" decision and doesn't re-flag the pair. Adding a `dish_canonical` field would repeat data already in title + ingredients without solving the actual problem (pipeline forgetfulness). Compare to D6's `series_id` which solves a real metadata problem (sequenced companion lessons need to be skipped from comparison entirely because they're designed-as-pair) — Fattoush-class is the opposite (random lessons that landed on the same dish by coincidence; no design relationship to encode).

- **D7.4 Site-specific (don't model):** User reframing was significant — "valid variations on the same lesson that differentiates them, it doesn't actually matter which school the lesson is tied to." Both candidate use cases were ruled out: teacher discoverability is not a real ESYNYC need (teachers at PS 109 don't filter the library by school), and staff school-by-school reporting is not either. The schools dimension doesn't earn its keep elsewhere in the system (no user-account-to-school linkage, no submission-source analytics, no program-level dashboards). A `school_id` column would solve a problem nobody has. Site-specific lessons live in the corpus as standalone lessons; school identity stays in the title where it already is. The 33 lessons with "For 216:" inline customization prompts are body-text prose under the same logic (within-row variation, not metadata).

- **D7.5 Mobile Ed externalized (don't model):** 14 lessons across 3 sub-patterns, but only the externalized-to-separate-doc sub-pattern has a real cross-row metadata question (the inline single-site and inline multi-site sub-patterns are body-text prose, same shape as Plan A/B's within-row contingencies). For externalized siblings, three forces collapsed to don't-model: (a) D3 already settled "Mobile Ed isn't a filterable axis" — title convention is the handle, so a `mobile_ed_adaptation` boolean would have nothing in the UI consuming it; (b) D7.4 just settled "valid variations don't need relationship modeling" — Mobile-adapted siblings are structurally the same kind of valid variation as site-specific lessons; (c) bidirectional-navigation use cases are weak — Mobile Educators don't need to jump to classroom parents (they're teaching the Mobile version), classroom teachers don't need to jump to Mobile siblings (they're teaching the classroom version), and the rare cases where someone needs both versions are covered by title search.

- **Why "we could model it" doesn't equal "we should":** D6's `series_id` earned its keep because it solves a real dedup problem (sequenced companion lessons getting flagged as duplicates because they have identical metadata). None of D7's sub-patterns have a comparable "without metadata, this breaks" justification. The closest is externalized Mobile Ed siblings, but even there, the dedup-pipeline third-state mechanism (already deferred to in D7.3) handles the cross-version flagging concern. The "valid variations" framing emerged as a load-bearing principle for foundation-phase modeling — lessons that share content with site/version variation are valid standalone lessons; the variation itself doesn't need metadata encoding.

**Deferred sub-questions:**

- **Tags closed-enum governance** — closed enum is now `["orientation", "bilingual_handouts"]`. New values still gate on Stage 1 novelty pass evidence (per D2's governance rule); D7.2's bilingual_handouts addition was an exception because empirical evidence was already in hand from the session-6 sweep.
- **Phase-2 reviewer-UX: "For [school]:" inline customization** — should reviewers be encouraged or discouraged from baking school-specific adaptation prompts into otherwise-generic lessons going forward? Probably encouraged for adaptability; worth a guidance line in reviewer training.
- **Phase-2 reviewer-UX: title-encoding convention for any future contingency pairs** — if Plan A/Plan B pairs recur, a "[School]: Plan A — Title" / "[School]: Plan B — Title" naming convention would be the lightweight handle. Document as guideline; revisit if pairs accumulate.
- **Bilingual_handouts surface label confirmation** — "Has Spanish handouts" is the working label per the call. Confirm at filter UI design time; could become more nuanced if non-Spanish bilingual handouts emerge (none in current corpus).
- **Mobile Ed title convention enforcement** — D3 deferred this. When a teacher submits a Mobile Education lesson, who/what enforces the title convention? Phase-2 reviewer UX detail.

**Downstream implications:**

- **Dedup pipeline third-state has bigger surface area than originally framed.** It now needs to handle:
  - Same-dish-different-lesson (Fattoush-class) — D7.3
  - Cross-site variants (PS 216 vs PS 109 Garden Tour) — D7.4 implication
  - Cross-version siblings (Classroom vs Mobile Garden Tour) — D7.5 implication
  - Plus the existing duplicate-detection cases
  - Plus D6's `series_id`-driven skip-comparison logic (different mechanism but same coordinator)
  Worth scoping as a single coherent dedup-pipeline rework rather than incremental patches. Own work track, scheduled separately from foundation phase.

- **Foundation-phase structural modeling is now fully scoped.** D6 added `series_id` + `part_number` (per-row); D7 added `bilingual_handouts` to tags closed enum. No new tables, no FK relationships, no `parent_lesson_id` / `relationship_kind` / `school_id` / `mobile_ed_adaptation` / `dish_canonical`. The corpus stays a flat collection, structurally consistent with the empirical finding that lesson-to-lesson textual cross-references essentially don't exist (1–2 in 772 rows).

- **Filter UI gets one more "Lesson Type" tag-based checkbox** — bilingual_handouts joins orientation. Sidebar UX spec for the tag-based filter section now has 2 values planned.

- **Phase-2 reviewer-UX scope grows by accumulated guidance items** (see Deferred above). All low-cost additions to reviewer training/guidance text; none require new pickers or workflow changes.

- **The "valid variations" framing is now a load-bearing principle for foundation-phase modeling.** Same logic applies if any future audit surfaces other "lessons that share content but aren't duplicates" patterns: default is "don't model the relationship; let them live as standalone lessons; rely on dedup-pipeline memory for cross-version flagging." This is a deliberate design stance, not just an absence of decision.

---

## Decision 8 — Teacher contribution at submission

**Status:** **RESOLVED 2026-05-03 (session 9)** — substance settled at session 1 in service of D0 (stay teacher-zero); phase-2 reviewer-tooling sub-questions **dropped at session 9** after empirical investigation showed the audit-cited "reviewer errors" are v3 GPT-4.1 tagging artifacts on lessons no human reviewer has ever validated, not reviewer judgment errors. Replaced by a deferred Stage 2 reviewer-validation UX walk to land during foundation-phase implementation planning.

**Decision (substance, settled 2026-04-30):** **Stay teacher-zero.** Reviewers remain sole authority for all metadata classification.

**Reasoning (substance):**
- 2 expert reviewers on staff for curriculum; user wants consistency to live with that pairing.
- Teacher-side tagging would risk introducing inconsistency (the audit's own classification problems were initially framed as reviewer-judgment calls — adding teacher input would compound them, not fix them).

**Decision (phase-2 sub-questions, settled 2026-05-03):** **Dropped.** The audit's "reviewer judgment errors" framing didn't survive empirical investigation — the cited errors are inherited v3 GPT-4.1 tagging on never-reviewed lessons, not reviewer-authored errors. The mechanism inventory (guided pickers, validation rules, audit/diff views, paired-review prompts, per-field guidance text) was solving a problem that hasn't been verified to exist. Foundation-phase corpus refresh (Stage 2 re-tag with canonical D4 vocab + D2 enum expansion + D5/D9 LLM submission-time auto-tag) automatically fixes the audit-cited cases. Reviewer-tooling design defers until empirical evidence of actual reviewer pain surfaces under the new flow.

**Reasoning (phase-2 drop):**
- **Corpus-level provenance:** 670 of 772 lessons (87%) are imported, never went through teacher → reviewer pipeline. The 2025-07-10 v3 GPT-4.1 batch tagging run is the source of those tags.
- **Per-lesson investigation of the 6 audit-cited examples:**
  - **Lotion & Agar Soap K & MS** (cooking-tagged-craft): v3 import, never reviewed. v3's `activityType` enum had no `craft` option, so `cooking` was the closest available value. **Vocab inadequacy, not error.** D2's craft expansion (session 4) fixes on re-tag.
  - **African American Food Traditions** (immigration-stories-tagged): second-wave import 2025-08-07, never reviewed. Tag is in `academicConcepts.Social Studies`, not thematic_categories. Other African American foodways lessons in the corpus (Cornbread/Greens, Museum Tour) only have "cultural traditions" — v3 was inconsistent. D5 canonical vocab + Stage 2 re-tag fixes.
  - **Mashama Bailey** (3K-8 stovetop): v3 import, only post-import metadata edit is the Phase 6 automated metadata-correction archive (2026-04-27), not reviewer judgment.
  - **Plant Families, Seed Dispersal × 3** (tasting conflation, cross-grade-band inconsistency): all v3 imports, none reviewer-touched.
  - **Farm Workers & Pesticides** (the only reviewer-touched audit-cited case): reviewer's `tagged_metadata` set `activityType: "garden"` correctly; the lesson now shows `["both"]`, meaning the reviewer's call was right and was overwritten downstream — **NOT** a reviewer judgment error.
- **Net:** zero of the audit-cited "reviewer judgment errors" are actually reviewer-authored errors on reviewer-authored lessons.
- **Consequence:** designing reviewer-tooling mechanisms preemptively against an unverified problem risks over-engineering. Most cited errors evaporate under foundation-phase work; the remainder (e.g., Mashama's grade range) are corpus-refresh + better-prompt territory, not reviewer-tooling territory.
- **Right time to surface reviewer-tooling questions** is when foundation-phase implementation + Stage 2 re-tag is underway and we have empirical evidence of what reviewers actually find painful in the new flow.

**Pivot — Stage 2 reviewer-validation UX walk-later:**

The load-bearing reviewer question that displaces D8 phase-2 is: **how does the reviewer interface support Stage 2 batch validation of LLM-drafted re-tags across the ~700 unreviewed lessons?** That's the real reviewer load — hundreds of hours spread across months — and its UX matters far more than the ~10/year ongoing-submission flow. To be walked as a separate question once foundation-phase implementation planning starts via `/kickoff-feature`. The D8 phase-2 mechanism inventory (guided pickers, validation rules, audit/diff views, paired-review prompts, per-field guidance text) is **archived as candidate inputs** for that future walk, not discarded.

**Downstream implications:**
- Schema design in foundation phase is reviewer-canonical only — no submitter-suggestions sidecar fields needed (unchanged).
- D5, D6, D7 decisions unaffected (unchanged).
- **The "extend LLM-first-pass to more fields" workflow direction (proposed at session 9 opening) still travels forward.** Submission-time Opus tagging for ~10 high-fit reviewer-supplied fields drafts both Stage 2 re-tags AND ongoing submissions. Foundation-phase scope add: ~10 field-specific prompts riding on the D5 + D9 Opus pipeline; per-prompt eval gates before launch. **Disciplined scope** — high-fit fields only (those with closed vocab from D4 + body signal); marginal fields (`grade_levels`, `location`) and reviewer-validate UI redesign defer to Phase 2.
- **Walkthrough is fully wrapped** — D8 phase-2 was the only remaining question. Next step is `/kickoff-feature` foundation-phase implementation plan scaffolding.

---

## Decision 9 — CRF redesign

**Status:** DECIDED 2026-05-03

**Decision: Keep CRF as structured `text[]` of the 7 master-list features + LLM-extract-from-body at submission time + reviewer-validate with lenient inference scope + leave older legacy data as-is + re-tag modern-template lessons + `crf_confirmed` backend-only marker.** Reviewer remains sole authority. Storage stays at feature granularity (the 7 framework features); example practices serve as LLM/reviewer guidance, not stored data. Submission UI does NOT surface the guideline doc to teachers (deferred; teachers consult the guideline on their own).

### Components

1. **Vocabulary = the 7 master-list CRF features** (closed enum, derived from Brown University Education Alliance "Teaching Diverse Learners" framework via `~/Downloads/Cultural Responsiveness Guidelines.md`):
   - Promotes positive perspectives on parents and families
   - Communicates high expectations
   - Encourages learning within the context of culture
   - Promotes student-centered instruction
   - Incorporates different individual and cultural learning styles
   - Reshapes curriculum
   - Positions teacher as facilitator

   Each feature has ~5 example practices in the master list (35 total) that serve as **diagnostic guidance** — what counts as embodying that feature.

2. **Storage = `text[]` at feature level** (current PROD shape preserved). Example practices NOT stored. Validation against the closed enum at submission/review time.

3. **Submission flow:** at submission time, LLM reads body CR section → matches body content against the ~35 example practices → drafts tags for the corresponding features. Reviewer validates/edits at review time. Mirrors D5's submission-time auto-tag pattern; reuses the same Opus tagging infrastructure.

4. **Reviewer authority + lenient overlay scope.** Reviewer is sole authority; **lenient mode** means reviewer can add tags based on framework-grounded inference, no body-span citation required. Hypothesis 2 (normalization across uneven teacher prose) is the dominant rationale — reviewer fills gaps in body content using framework expertise.

5. **No teacher-facing submission UI for the guideline doc in foundation phase.** Teachers consult the guideline doc on their own when writing the body CR section. Could be added down the road; not foundation-phase scope.

6. **Existing rows split-treatment:**
   - **Older-template lessons** (no body CR section, ~45% of corpus): leave existing tags as-is. No re-tag effort.
   - **Modern-template lessons** (body CR section, ~55% of corpus): re-tag with new LLM-extract + reviewer-validate workflow to confirm legacy.

7. **`crf_confirmed boolean`** added as DB column. Marks rows that went through the new workflow. **No UI surfacing to end users in foundation phase.** Reviewer-facing usage (e.g., "this CRF is from pre-rebuild tagging" indicator) deferred to Phase 2 reviewer UX redesign if it earns its keep.

8. **UI surfacing of CRF tags to end users:** still open in foundation phase. The `crf_confirmed` marker enables a forward path of "surface confirmed-only rows" if the call later is to surface CRF in user-facing UI. Deferred.

### Reasoning

- **CRF is real signal, not theater.** User reframing: cultural responsiveness understanding is nuanced and requires real training. Teachers are supposed to consult the guideline when writing the body CR section. The 7-feature framework is established (Brown University Education Alliance) and the master list defines both the canonical features AND ~35 diagnostic example practices. The "stamp" framing from the foundational report was overstated — the bar for each feature is relatively low ("incorporating movement" earns Reshapes curriculum), and many ESYNYC lessons may legitimately exhibit all 7. The verbatim 7-element pattern in the data is **"unknown reliability,"** not "assumed wrong."

- **Master list as canonical vocabulary collapsed the closed-enum question.** The 7 features ARE the canonical CRF list. No fresh stakeholder-defined vocabulary needed; the framework provides it. Storage stays `text[]`. **Path 3 doesn't apply here** — unlike D1/D5/D2 where vocabulary canonicalization required a multi-step worksheet exercise, D9's vocabulary is settled by the existing master list.

- **LLM-as-extractor-not-author is the LLM-appropriateness call.** User stated the LLM should only operate where the teacher explicitly wrote CRF in the body; LLM doesn't infer CRF from a lesson without a body CR section. With the master list available, "extraction" becomes mapping body language to closed enum via the example practices — mechanical-ish but not zero-judgment (e.g., "we honored student voice" → maps to "Promotes student-centered instruction"). LLM never claims framework expertise it shouldn't have; reviewer is the authority.

- **Reviewer overlay = lenient, not strict.** Strict mode (only body-supported tags) would constrain reviewer to mechanical extraction — but the user's rationale for keeping reviewer in the loop is exactly that they bring framework-grounded expertise (hypothesis 3 + normalization in hypothesis 2). Lenient mode lets the reviewer fill gaps in uneven teacher prose using framework knowledge. Trade: more reviewer judgment, but reviewer judgment grounded in canonical framework is what the user wanted.

- **Leave-as-is for older lessons + re-tag modern lessons** is the empirical match to the data. Older-template lessons don't have body CR content; without body content, neither LLM nor reviewer can do extraction-style work. Re-tagging would require independent assessment (judgment-only, no body anchor) — exactly the pattern the user wanted to avoid. Better to accept the legacy state honestly than to fabricate confidence.

- **Storage at feature level (option A) over practice-level (B) or paired (C).** Feature level matches what filtering actually wants (broad CR axes); reviewer burden stays at picking from 7 vs 35; complexity stays low for a first-shipped version. Paired option C's "audit story" (queryable "tagged feature without supporting practice") is real but premature — adds reviewer UX complexity for an audit use case that may not earn the keep. Forward path open: example-practice-level richness can be added later as a JSONB sidecar if a use case emerges.

- **`crf_confirmed` backend-only.** End-users shouldn't see "data quality vintages" — undermines trust ("which tags should I believe?"). Reviewer-facing usage in Phase 2 is the more interesting use case but doesn't have to be designed now. Backend column = forward path without commitment.

- **No submission-time guideline UI in foundation phase.** User opted out: teachers already consult the guideline doc on their own when writing lesson plans. Could be revisited as a Phase 2 enhancement if body CR quality is a problem.

### Deferred sub-questions

- **UI surfacing of CRF tags to end users.** Whether to add CRF as a sidebar filter, lesson-detail badge, both, or neither (keep silently for search). Foundation-phase deferred; revisit when reviewer UX redesign starts. With `crf_confirmed`, can surface only the trusted subset later.
- **Reviewer-facing `crf_confirmed` indicator.** Whether reviewer dashboard should show "this CRF is from pre-rebuild tagging" prompts. Phase 2 reviewer UX detail.
- **Submission UI for guideline doc.** User opted out for foundation phase; possibly add down the road if body CR quality is found to be a problem.
- **Audit mechanism for legacy CRF tags.** If user later wants to know which legacy tags are evidence-supported vs stamp, would require a re-read pass. Not foundation-phase scope.
- **Re-tag workflow logistics.** Reviewer time required to re-tag ~55% of corpus (modern-template lessons) = real cost; needs scoping at foundation-phase planning time. Probable shape: batch-process LLM drafts in Stage 2, then reviewer revisits per-lesson in a focused review pass.
- **Example-practice-level richness as later optional layer.** If displayed metadata ever wants "this lesson Reshapes curriculum via 'incorporating movement'" precision, could add as a JSONB sidecar field.
- **Mark-and-segregate vs honest-acceptance for the two-population search behavior.** `crf_confirmed` enables mark-and-segregate; whether to actually use it for surfacing decisions is the Phase 2 / UI surfacing question above.

### Downstream implications

- **Foundation-phase schema:** stays `cultural_responsiveness_features text[]`; add `crf_confirmed boolean default false`. Closed-enum validation in code (the 7 master-list features).
- **Foundation-phase pipeline:** add LLM-extract step to submission processing edge function (mirrors D5 academicConcepts auto-tag pattern). Same Opus model + infrastructure, different prompt targeting CRF master list.
- **Stage 2 corpus re-tag scope adds:** ~55% modern-template subset gets CRF re-tag (LLM draft + reviewer validate). Older 45% skipped entirely. Significant reviewer time — needs scoping at foundation-phase planning.
- **D5 + D9 share the same submission-time LLM auto-tag infrastructure.** Both add canonical-vocabulary tags drafted by Opus from body content; both validated by reviewer at review time. Plan as one infrastructure piece, two prompts.
- **Phase 2 reviewer UX:** reviewer-facing CRF picker should expose the 7 features + ~5 example practices each inline (per-feature collapse expandable to show practices) for guided tagging. Reviewer-facing `crf_confirmed` indicator can be added at this time if it earns its keep.
- **`project_crf_stamp_theater.md` memory file should be updated** to reflect the master-list reframing: not theater, but verbatim-pattern is "unknown reliability" (not "assumed wrong"). Updated 2026-05-03 alongside D9 capture.

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

### Session 7 — 2026-05-03

**Covered:** D7 walkthrough across all 5 sub-patterns. Mode: decomposition confirmation as meta call → easy-then-hard ordering through Plan A/B → bilingual → Fattoush-sibling → site-specific → Mobile Ed.

**Calls landed (in order):**

1. **D7 decomposition accepted (meta call).** D7 splits into per-sub-pattern decisions; original 4-options-as-written framing retired. Easy-then-hard order chosen for the sub-pattern walkthrough.
2. **D7.1 Plan A/B = don't model.** N=1 cross-row case (PS 109); within-row contingencies stay in body prose. Bloating the orientation-only tags closed enum for 1 case rejected.
3. **D7.2 Bilingual = tag with `["bilingual_handouts"]`.** Reuses tags column; closed enum grows from `["orientation"]` to `["orientation", "bilingual_handouts"]`. Surface label "Has Spanish handouts" (not "Bilingual lesson"). Reframed as per-row attribute, not sibling-row relationship — the 6 lessons are English with Spanish Canva handouts, not parallel Spanish lesson plans.
4. **D7.3 Same-dish-sibling = defer to dedup pipeline.** Dedup-pipeline third-state memory mechanism handles "we already decided these aren't duplicates"; metadata not the right place. Mid-walkthrough plain-language re-explanation requested + delivered (Fattoush worked example built from scratch).
5. **D7.4 Site-specific = don't model.** User reframing: "valid variations on the same lesson that differentiates them, it doesn't actually matter which school the lesson is tied to." Both candidate use cases (teacher discoverability + staff reporting) are not real ESYNYC needs. Schools dimension doesn't earn its keep elsewhere. No `school_id` column, no `schools` table. Site-specific lessons live as standalone lessons; identity stays in title.
6. **D7.5 Mobile Ed externalized = don't model.** Only externalized-to-separate-doc sub-pattern has a real cross-row question (other 2 inline sub-patterns are body-text prose). Three forces collapsed it: D3's prior "Mobile Ed not filterable" call, D7.4's "valid variations don't need modeling" precedent, weak bidirectional-navigation use cases. Title convention + dedup-pipeline third-state covers it.

**Net D7 outcome:** corpus stays flat. Zero new cross-row relationship modeling. Only schema move from D7 is the bilingual_handouts tag addition. Combined with D6 (`series_id` + `part_number`), foundation-phase structural modeling = two small additions to lesson rows; no new tables, no FK relationships beyond the loose `series_id` grouping.

**Key reframings / insights:**

- **The "valid variations" principle emerged as load-bearing for foundation-phase modeling.** Site-specific (D7.4) was the call that crystallized it: lessons that share content with site/version variation are valid standalone lessons; the variation itself doesn't need metadata encoding. Same logic propagated to D7.5 (Mobile Ed externalized siblings = valid variations of classroom parents). Future cards or audits surfacing similar "lessons share content but aren't duplicates" patterns should default to this principle unless there's a specific workflow that breaks without modeling.
- **Dedup pipeline third-state surface area expanded.** Originally framed (`project_dedup_third_state.md`) as just Fattoush-class + sequenced pairs. Now also includes cross-site variants (D7.4) and cross-version siblings (D7.5). Worth scoping the dedup-pipeline rework as a single coherent track rather than incremental patches.
- **Decomposition of D7 as a walkthrough technique was load-bearing.** The original 4-options framing wouldn't have surfaced the per-sub-pattern heterogeneity. The session-6 empirical sweep enabled the decomposition; the session-7 walkthrough confirmed each sub-pattern decisively. Pattern: when a card's options-as-written don't survive empirical reality, decompose first then walk per sub-pattern.
- **D7.2's bilingual reframing (per-row attribute, not sibling row) was a small but meaningful empirical correction.** The decisions doc framing (variants/adaptations) suggested cross-row Spanish lesson plans. Reality is in-lesson Canva handouts. Saved a wrong walkthrough direction.
- **The plain-language preference (captured session 5) was exercised mid-session 7.** Fattoush-class explanation got asked-for-simpler; re-delivered with built-from-scratch framing (background → specific example → generalization). Worked well; the user got the concept faster on the second pass.

**Carry-forward to next session:**

- **D9 (CRF redesign) is next.** Last vocabulary-bearing card. Likely Path 3 (meta-now / content-later split). Distinguishing question per session-5 closing note: does CRF capture ideas not in body text (like concepts does → keep silently for search), or is it purely rubber-stamped framework theater (drop)?
- **D8 phase-2 sub-questions revisit** can fold into D9 session or land separately as a brief.
- **Heritage worksheet remains the first concrete Stage 1 deliverable** once walkthrough wraps. Concepts worksheet remains the second-largest. Cleanup-track work (23-import-drop list + Food System Advocates retitle + dedup-pipeline third-state design) sequences in alongside.
- **No pre-walkthrough research dispatched this session** — D7 walkthrough was self-contained on the session-6 pre-walkthrough context.

**Commits:**

- `79a3d06` — `docs(metadata-rebuild): walkthrough session 7 — D7 (no new modeling across all 5 sub-patterns)`

### Session 8 — 2026-05-03

**Covered:** D9 (CRF redesign) walkthrough — full call landed in single session. Mode: opener pushback from user (CRF is real signal, not theater) reframed the option space; user dropped a major piece of evidence mid-walkthrough (the master list at `~/Downloads/Cultural Responsiveness Guidelines.md`) which collapsed the canonical-vocabulary question and recast the verbatim-stamp finding. Three sub-decisions walked through (storage granularity / submission UI / reviewer overlay); user landed all three. D8 phase-2 sub-questions revisit deferred to a separate session at user direction.

**Calls landed (in order):**

1. **CRF reframing accepted (meta call).** CRF is real signal worth investing in, not theater. Drop (option 1) ruled out. Reviewer remains sole authority even though teachers also write CR in lesson body.
2. **D9 = keep structured `text[]` of 7 master-list features.** Closed enum derived from Brown University Education Alliance "Teaching Diverse Learners" framework via the master list document. No fresh stakeholder vocabulary exercise needed; framework provides it.
3. **Submission-time LLM auto-tag.** LLM reads body CR section → matches against ~35 example practices in master list → drafts tags for matched features. Mirrors D5's submission-time auto-tag pattern; reuses same Opus infrastructure.
4. **Reviewer overlay = lenient mode.** Reviewer can add tags based on framework-grounded inference, no body-span citation required. Hypothesis 2 (normalization across uneven teacher prose) is the dominant rationale.
5. **No teacher-facing submission UI for the guideline doc** (sub-decision 2). Teachers already consult the guideline doc on their own when writing the body CR section. Could be added down the road; not foundation-phase scope.
6. **Storage at feature level, not practice level** (sub-decision 1, option A). 7-value enum stays current PROD shape. Example practices stay as LLM/reviewer guidance, not stored data. Practice-level richness can be added later as a JSONB sidecar if a use case emerges.
7. **Existing rows split-treatment.** Older-template lessons (no body CR section, ~45% of corpus) — leave existing tags as-is. Modern-template lessons (body CR section, ~55% of corpus) — re-tag with new LLM-extract + reviewer-validate workflow.
8. **`crf_confirmed boolean` backend-only column.** Marks rows that went through the new workflow. NO end-user UI surfacing in foundation phase. Reviewer-facing usage deferred to Phase 2 if it earns its keep.

**Net D9 outcome:**

CRF design fully scoped. Foundation-phase schema = existing `cultural_responsiveness_features text[]` (preserved) + new `crf_confirmed boolean default false`. Foundation-phase pipeline = add LLM-extract step to submission processing edge function (mirrors D5 pattern; same Opus infrastructure, different prompt). Stage 2 corpus re-tag adds: ~55% modern-template subset re-tag (LLM draft + reviewer validate). Older 45% skipped entirely.

**Key reframings / insights:**

- **CRF reframing was load-bearing.** User pushed back on opener's "theater" framing immediately: cultural responsiveness understanding is nuanced and requires real training; the field's invisibility-rate doesn't mean it's stamp work. This recast the option space — drop is off the table; the question is "how do we get the structured metadata to do diagnostic work" not "keep or drop."
- **The master list collapsed the canonical-vocabulary question.** When user shared `~/Downloads/Cultural Responsiveness Guidelines.md` mid-walkthrough, the closed enum (7 features) became settled instantly; no Stage 1 worksheet needed for D9 unlike D1/D5/D2. **Path 3 doesn't apply to D9** — the 7 features are the canonical vocabulary directly. The example practices (~35 total) become diagnostic guidance for LLM/reviewer, not storage values.
- **The verbatim-stamp finding got recontextualized.** "5 lessons share the verbatim 7-element list" was framed in the foundational report as smoking-gun for theater. Under the master list, the example-practice bar for each feature is relatively low ("incorporating movement" earns Reshapes curriculum); many ESYNYC lessons may legitimately exhibit all 7. The verbatim pattern is now "**unknown reliability**," not "assumed wrong." The agents' "Reshapes curriculum has no concrete textual anchor" finding was based on a stricter standard than the framework actually applies.
- **LLM-as-extractor-not-author pattern.** User's framing: LLM should only operate where teacher explicitly wrote CRF in body; LLM doesn't infer from absent body content. With master list, "extraction" becomes mapping body language to closed enum via example-practice matching — mechanical-ish but not zero-judgment. LLM never claims framework expertise it shouldn't have. This is a useful design pattern beyond D9 — applicable wherever LLM must operate against teacher-zero/reviewer-authority constraints.
- **Reviewer overlay = lenient was the load-bearing call** for the workflow shape. Strict mode (only body-supported tags) would constrain reviewer to mechanical extraction — defeating the purpose of having reviewer in the loop. Lenient lets reviewer normalize across uneven teacher prose using framework knowledge.
- **Leave-as-is for older lessons is a deliberate "don't fabricate confidence" stance.** Without body CR content, neither LLM nor reviewer can do extraction-style work; re-tagging would require independent assessment (judgment-only, no body anchor) — exactly what user wanted to avoid. Better to accept legacy state honestly than fabricate confidence.
- **Storage at feature-level was a "ship lean now, add richness if earned" call.** Option C (paired feature + practice + evidence span JSONB) was the most diagnostically useful but premature; option A (feature-level only) matches what filtering wants and keeps reviewer burden low. Forward path open via JSONB sidecar later.
- **`crf_confirmed` backend-only is the "don't show data quality vintages to end-users" call.** End-users shouldn't have to think about which tags are reliable; either trust all displayed tags or trust none of them. Reviewer-facing usage in Phase 2 is the more interesting use case; doesn't have to be designed now.
- **Two-population search behavior is honest-acceptance by default.** Older stamped legacy + newer confirmed tags coexist in search/filter; `crf_confirmed` enables future segregation if a Phase 2 / UI surfacing decision wants it.
- **D9 is the cleanest "ship-lean shape" of the walkthrough.** Single session, one schema column added (boolean), reuses D5's submission pipeline infrastructure. The vocabulary work is essentially zero (master list is the canonical). Foundation-phase implementation cost for D9 is mostly the LLM prompt + closed-enum validation + the 55% modern-subset re-tag effort.

**Carry-forward to next session:**

- **D8 phase-2 sub-questions revisit is the only remaining walkthrough work** — separate brief at user direction. Substance settled (stay teacher-zero); open part is reviewer-tooling mechanisms (guided pickers, paired-review prompts, validation rules, audit/diff views, per-field guidance text). Lighter-weight than main walkthrough cards.
- **D1 content layer remains for the worksheet round** (Indigenous structural placement, African American diaspora cluster shape, Mediterranean placement, Lenape promote/nest, 28 empirical long-tail candidates threshold-pass, Tier-0 vs Tier-1 placements, per-leaf sidebar visibility, canonical surface labels). All defer to Stage 1 worksheet round + reviewer validation.
- **After D8 phase-2:** scaffold foundation-phase implementation plan via `/kickoff-feature` per the multi-session execution preference. Foundation-phase corpus = 772 → ~749 after import-drops apply.
- **Master-list-as-canonical-vocabulary shortcut** is the new reusable pattern: when an established framework already provides the canonical vocabulary, the closed-enum question collapses (no fresh stakeholder exercise needed). Worth flagging for future cards/audits.
- **CRF stamp-theater memory file** updated 2026-05-03 to reflect the master-list reframing.
- **No pre-walkthrough research dispatched this session** — D9 walkthrough was self-contained on the foundational report + decisions doc + CRF stamp-theater memory. The master list was the new piece of evidence that surfaced mid-walkthrough.

**Commits:**

- `c0baa85` — `docs(metadata-rebuild): walkthrough session 8 — D9 (CRF kept under master-list framing; main walkthrough complete)`

### Session 9 — 2026-05-03

**Covered:** D8 phase-2 walkthrough — opened with workflow-first framing across the three workflow options (LLM-first-pass extended / pair every review / split content-vs-classification review). User pushed back on the audit's "reviewer judgment errors" framing — hypothesizing the cited errors were inherited GPT-4.1 v3 tagging or messy/inconsistent vocabulary, not reviewer judgment. Investigation dispatched against TEST DB; hypothesis confirmed empirically. D8 phase-2 dropped + Stage 2 reviewer-validation UX walk added as deferred follow-up.

**Calls landed (in order):**

1. **Workflow-first walkthrough mode accepted (meta call).** User chose to settle workflow shape before iterating mechanism inventory. Open to pulling pieces forward into foundation phase if helpful, with the discipline of "systematically, not off track, not overengineering."
2. **D8 phase-2 sub-questions = dropped.** The audit's "reviewer judgment errors" framing didn't survive empirical investigation. Mechanism inventory archived as candidate inputs for the deferred Stage 2 reviewer-validation UX walk; not committed to foundation phase.
3. **Pivot — Stage 2 reviewer-validation UX walk-later.** The actually-large reviewer load isn't the ~10/year ongoing-submission flow; it's batch-validating LLM-drafted re-tags across ~700 unreviewed lessons during Stage 2. To be walked as a separate question once foundation-phase implementation planning starts via `/kickoff-feature`.
4. **"Extend LLM-first-pass to more fields" workflow direction kept alive.** Submission-time Opus tagging extended to ~10 high-fit reviewer-supplied fields (closed vocab from D4 + body signal). Foundation-phase scope add: ~10 field-specific prompts riding on D5 + D9 Opus pipeline; per-prompt eval gates before launch. Marginal fields (`grade_levels`, `location`) and reviewer-validate UI redesign defer to Phase 2.

**Net D8 phase-2 outcome:**

D8 fully closed. Substance: stay teacher-zero (settled session 1, unchanged). Phase-2 mechanisms: dropped — not designing them preemptively against an unverified problem. Foundation-phase reviewer-tooling work narrows to the LLM-draft-extension above; everything else defers to the Stage 2 reviewer-validation UX walk during foundation-phase implementation planning.

**Investigation findings (the load-bearing piece of the session):**

Empirical query of TEST DB against the audit-cited examples + corpus-level provenance:

- **Corpus-level:** 670 of 772 lessons (87%) imported, never went through teacher → reviewer pipeline. Import waves: 2025-07-10 (669, the v3 GPT-4.1 batch tagging run) / 2025-07-24 + 2025-08-07 (19, smaller imports) / 2025-09-01 (78, submission-era cohort, all reviewer-touched) / 2026-04-27 (6, Phase 7c).
- **Per-lesson investigation:**
  - Lotion & Agar Soap K & MS (cooking-tagged-craft): v3 import, never reviewed; v3 enum had no `craft` option, so `cooking` was the closest available value. **Vocab inadequacy, not error.** D2's craft expansion fixes on re-tag.
  - African American Food Traditions (immigration-stories-tagged): second-wave import 2025-08-07, never reviewed. Tag is in `academicConcepts.Social Studies`, not thematic_categories. Other African American foodways lessons in corpus only have "cultural traditions" — v3 inconsistency. D5 + Stage 2 re-tag fixes.
  - Mashama Bailey (3K-8 stovetop): v3 import, only post-import edit is the Phase 6 automated metadata-correction archive (2026-04-27), not reviewer judgment.
  - Plant Families, Seed Dispersal × 3 (tasting conflation, multi-grade-band inconsistency): all v3 imports, none reviewer-touched.
  - Farm Workers & Pesticides (the one reviewer-touched audit-cited case): reviewer's `tagged_metadata` set `activityType: "garden"` correctly; lesson now shows `["both"]`, meaning reviewer's call was right and was overwritten downstream — **NOT** a reviewer judgment error.
- **Net:** zero of the audit-cited "reviewer judgment errors" are reviewer-authored errors on reviewer-authored lessons. The cited errors are inherited v3 GPT-4.1 tagging on never-reviewed lessons, plus one vocab inadequacy.

**Key reframings / insights:**

- **Audit-attribution check pattern.** When an audit cites errors as "reviewer judgment problems," verify provenance before designing reviewer tooling. Today's investigation found the framing was off by ~100% — every cited "judgment error" was actually inherited v3 GPT tagging. Future audits or design conversations that lean on "reviewers are getting X wrong" should run the same provenance check first. Worth surfacing as a reusable pattern beyond this initiative.
- **The audit's signal value isn't "reviewers need tooling" — it's "v3 GPT tags need re-tagging."** Foundation-phase corpus refresh + canonical D4 vocab + D2 enum expansion + D5/D9 LLM submission-time auto-tag does the heavy lifting automatically. Reviewer tooling design isn't load-bearing for foundation phase.
- **The "ship lean" instinct (D9 precedent) extended further.** D9 shipped lean by deferring rich practice-level storage to Phase 2. D8 phase-2 ships even leaner: the mechanism inventory wasn't just deferred, it was dropped because the problem it was solving turned out to not be the actual problem. "Don't design for an unverified problem" is the principle.
- **The actually-large reviewer load is Stage 2, not ongoing submissions.** ~700 lessons × LLM-drafted re-tags + reviewer validation = hundreds of hours over months. The reviewer UX for THAT flow matters far more than the ~10/year flow. The Stage 2 reviewer-validation UX walk should land when foundation-phase implementation makes that flow concrete.
- **The "extend LLM-first-pass" workflow direction survives the reframing.** It was the right move regardless of whether reviewers had judgment errors at scale — D5 + D9 already commit the infra; extending to more fields drafts both Stage 2 batch re-tags AND ongoing submissions. Same prompt design, applied per-field, with per-field eval gates. Disciplined scope: ~10 high-fit fields foundation-phase, marginal + UI to Phase 2.
- **Plain-language preference exercised mid-session.** User asked for the workflow-options walk re-explained in simpler terms after the initial walk; re-delivered with no jargon. Same substance, less friction. Continues the pattern from session 5.

**Carry-forward to next session:**

- **`/kickoff-feature` foundation-phase implementation plan scaffolding** is next. Per multi-session execution preference, scaffolds the four-file pattern (design + implementation plan + kickoff prompt + status doc).
- **Stage 2 reviewer-validation UX walk lands during foundation-phase implementation planning** — when the LLM-draft-validation flow becomes the active design surface, walk reviewer-tooling mechanisms (the archived D8 phase-2 candidate inventory) against the concrete Stage 2 flow. Different shape than main walkthrough cards.
- **D1 content layer remains for the Stage 1 heritage worksheet round** (unchanged from session 8 carry-forward).
- **Cleanup-track work** (23-import-drop list + Food System Advocates retitle + dedup-pipeline third-state design) sequences alongside foundation-phase implementation.

**Commits:**

- `<pending>` — `docs(metadata-rebuild): walkthrough session 9 — D8 phase-2 dropped (audit-cited errors are v3-inheritance, not reviewer judgment) + Stage 2 reviewer-validation UX added as deferred walk`
