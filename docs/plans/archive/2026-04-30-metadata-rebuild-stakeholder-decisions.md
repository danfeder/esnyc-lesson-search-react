# Lesson Search System: Decisions for the Next Round

**Date:** 2026-04-30
**Audience:** Program leadership and curriculum stakeholders
**Companion to:** Stakeholder brief (same date)
**Purpose:** Walk through the specific decisions ahead, with options laid out for working-session discussion or async input

---

## How to read this

Each decision below is one card with the same shape: the question, where things stand on it specifically, what's at stake, the options, and what we'd ask from you. The cards are ordered roughly from "shapes everything else" (Decision 0) to "we can decide later" (Decision 9). Some interact — those connections are flagged inline.

We don't expect written input on every option. The format supports working sessions: skim in advance, come ready to talk through the ones that matter most, leave the engineering mechanics to us.

---

## How the decisions interact

Most cards are independent enough to discuss on their own. A few have connections worth flagging up front:

- **Decision 0 (refine vs. rebuild)** bounds everything else — refinement means smaller migrations done in sequence; rebuild means more freedom to redesign workflows alongside the schema.
- **Decision 1 (cultural heritage taxonomy)** and **Decision 4 (vocabulary canonicalization)** overlap — the heritage long tail is partly a vocabulary inconsistency problem.
- **Decision 2 (activity type)** and **Decision 3 (lesson format)** both touch the underlying question of "what kinds of lessons exist," so they're worth discussing together.
- **Decision 5 (academic concepts)** and **Decision 8 (teacher contribution)** intersect — if teachers tag concepts, the answer to Decision 5 changes.

---

## Decision 0: The frame — refine or rebuild?

**The question:** Is the next round a series of focused enhancements to the existing system, or a more substantial rebuild of how lessons are described and searched?

**Where things stand:** The system has had several rounds of cleanup over the past year. It works. But the issues we've surfaced — three cataloging conventions glued together, vocabulary drift, one field doing three jobs, the gap between what lessons contain and what we capture — limit how good the system can get rather than break it.

**What's at stake:** This bounds everything else. Refinement means we make the decisions below as discrete improvements over time. Rebuild means we make them together, in one larger migration window, with room to redesign workflows alongside the schema.

**Options:**

- **Refinement.** Each decision below becomes its own change. Lower per-change risk, slower overall. Some decisions (the lesson-format split, the three-eras unification, sequence modeling) become harder to do well piecemeal.
- **Rebuild.** Reset the metadata system in one window. Larger but contained risk. Lets us re-think shape, taxonomy, and authorship together. Submission, review, and duplicate-detection workflows become open to redesign, not just patching.
- **Hybrid.** Rebuild the metadata layer in one window; iterate on submitter and reviewer UX afterward. Splits the risk across two phases.

**What we need from you:** A directional preference and your tolerance for one larger migration window vs. several smaller ones. The rest of the decisions calibrate accordingly.

---

## Decision 1: Cultural heritage — taxonomy, depth, and the long tail

**The question:** What's the canonical cultural taxonomy, how deep should the hierarchy go, and how do we want to surface long-tail values that don't fit our current filter?

**Where things stand:** We have two cultural-heritage hierarchies in the system today that don't fully reconcile. The corpus has 78 distinct heritage values, with a real long tail: Mexican appears 41 times, Italian 26, African American 25, Mediterranean 42, Indigenous 24, Lenape 7. Most of those don't appear as filter options today — they're stored on lessons but not browsable.

**What's at stake:** Which cultural heritages teachers can browse by, how we group child cultures under regional parents (Asian → Chinese, Japanese, etc.), and whether the long tail gets first-class status or stays as text-search-only.

**Options:**

- **Reconcile + keep current depth.** Pick one canonical hierarchy, harmonize the data, keep the breadth roughly where it is. Smallest scope.
- **Expand to long-tail.** Promote the 100+ unfilterable cultural values to first-class filterable tags. Bigger taxonomy; more granular browsing; more taxonomy maintenance.
- **Flatten.** Drop the parent-includes-children hierarchy in favor of a flat tag set. Simpler, but loses the "select 'Asian' to include all Asian heritages" behavior.
- **Two-tier hybrid.** Keep regional parents for browse, allow long-tail tags for fine-grained matching.

**What we need from you:** What the canonical taxonomy should be (we can surface options for you to react to if you'd rather not draft from scratch), how deep the hierarchy should go, and whether the long tail gets promoted to filters.

*(Interaction: heritage values include both kebab-case and Title-Case variants of the same concept — touches Decision 4.)*

---

## Decision 2: Activity type — do our four buckets capture what teachers actually do?

**The question:** Should we expand or restructure the four activity-type categories (cooking, garden, both, academic)?

**Where things stand:** The audit found lessons that don't fit cleanly into the four buckets:

- **Lotion & Soap** — cosmetics craft, explicitly tells teachers "NOT for eating," currently tagged as cooking.
- **Seed Dispersal** — engineering challenge with seed-flight design, currently tagged as garden.
- **Winter After School** — multi-session nutrition unit, doesn't have a "nutrition" home.
- **Atole** — pull-out lesson for small speech-services groups, the special-population context disappears.
- **Winter Fruit Salad (mobile)** — explicitly a Mobile Education adaptation, no place for that.
- **Green Room Scavenger** — classroom-orientation lesson; not really an activity in any of the four senses.

A meaningful slice of the corpus is getting crammed into the existing four in ways that don't match what teachers are actually doing.

**Options:**

- **Expand to 6-8 categories.** Add craft, orientation, STEM, nutrition unit, special-population, mobile. More precision; more taxonomy maintenance.
- **Make multi-select.** A lesson can be both cooking and craft. Less expansion, more flexibility per lesson.
- **Replace with derived classification.** Drop the field; classify each lesson programmatically from its skills and content. Fewer reviewer choices, less reviewer authoring control.
- **Keep as-is.** Accept the lossiness; new lessons keep getting crammed into the four buckets.

**What we need from you:** Whether the four buckets are still right, and if not, which of the categories the audit surfaced (craft, orientation, STEM, nutrition unit, special-population, mobile) need first-class status.

---

## Decision 3: Lesson format — should one field do three jobs?

**The question:** Our "lesson format" field tries to answer three independent questions at once: how long is the lesson, where is it delivered, and is it standalone or part of a unit. Should we split it?

**Where things stand:** Reviewers pick one value from a list that mixes time structure ("Single period," "Double period," "Multi-session unit"), context ("Standalone"), and delivery mode ("Mobile education format"). Picking "Mobile education format" makes the time-structure invisible. One of our Fattoush lessons has explicit Mobile Education adaptations in the document body, but the metadata can only carry one value, so its dual-modal capability disappears from search and filter entirely.

**What's at stake:** Whether teachers can combine "single-period mobile-education lesson" filters, or whether they have to pick one axis at a time. This is the only place in the schema where the design itself is the issue (the rest are cleanup).

**Options:**

- **Three separate fields.** Time structure × delivery mode × context. Most expressive; adds three sidebar filters.
- **Two fields.** Time structure + delivery mode. Drop the standalone-vs-unit axis if it's the least useful for filtering.
- **Multi-select on one field.** Keep one field but allow several tags simultaneously ("Single period + Standalone + Mobile"). Simpler migration; less rigorous structure.

**What we need from you:** Which of the three dimensions matter most for filtering. If you only care about one or two, the design simplifies.

---

## Decision 4: Vocabulary canonicalization — when there are 4 ways to say "Knife skills," which wins?

**The question:** A meaningful slice of our metadata has the same concept written multiple ways. Cleaning this up is partly an engineering task, but the canonical-term selection is yours.

**Where things stand:** About 36% of the corpus has at least one inconsistent vocabulary entry. Some examples:

- Cooking skills has **123 distinct entries** representing perhaps 30 real concepts. "Cutting Skills" appears 127 times, "Cutting" 15 times, "Knife skills" 4 times, "Knife safety" 16 times. Probably the same skill expressed four ways.
- The 5 SEL competencies from the CASEL framework appear written 10 different ways.
- Cooking methods is entirely lowercase-hyphenated ("basic-prep", "stovetop", "oven") while every other field is Title Case — the filter UI silently drops these because the canonical filter values don't match.

**What's at stake:** Filter quality, search ranking, and our ability to detect duplicates. The two Fattoush lessons in our corpus are the clearest case — same dish, but the cooking skills are tagged in different vocabulary, so our duplicate detection misses the overlap.

**Options:**

- **One-shot cleanup.** Pick canonical terms for each concept, rewrite the database in one migration. ~10 fields touched. Removes the workarounds we have today. The engineering is straightforward; the vocabulary decisions are the hard part.
- **Defer indefinitely.** Live with the workarounds. Future content reclassification revisits the taxonomy anyway.
- **Targeted cleanup.** Tackle the worst offenders (cooking skills, cooking methods, SEL); leave the rest.

**What we need from you:** Whether you want to decide canonical terms now ("Cutting Skills" wins; "Knife skills" loses) or punt to a future content audit. We can prepare per-field worksheets if helpful.

*(Interaction: cleaning vocabulary touches almost every other decision — heritage values, activity types, lesson format values. If we go one-shot, the canonical terms for those decisions need to be set first.)*

---

## Decision 5: Academic concepts — a hidden trove. Surface, derive, or drop?

**The question:** Our database has a rich layer of academic-concept tagging — 211 distinct concepts across 88% of lessons, organized by subject — but it's invisible to users today. What should it become?

**Where things stand:** When a lesson is approved, an automated step tags it with academic concepts like "ecosystems," "decomposition," "photosynthesis," "immigration stories," "cultural traditions." 88% of lessons carry these tags — higher coverage than most of our visible filters. But this layer never appears in the search UI: not as a filter, not on lesson cards, not in detail views.

There's a vocabulary gap worth knowing. Teachers writing lessons use words like "natural resources," "conservation," "Hoppin' John." The metadata uses "ecosystems," "community systems," "cultural traditions." These are parallel vocabularies serving different needs — neither is wrong.

**What's at stake:** A teacher searching for "decomposition" or "immigration stories" today gets keyword-match-only. There's already metadata that could help, but we don't use it.

**Options:**

- **Promote to filter.** Build a hierarchical filter (subject → concept) in the search sidebar. 211 concepts probably needs hierarchy or search-within-filter to stay usable.
- **Treat as derived index.** Don't expose as a UI filter; use it to boost search ranking so a query for "decomposition" matches lessons tagged with that concept even when the word isn't in the title. Less UI work; real search benefit.
- **Drop it.** Stop maintaining the layer. Frees engineering complexity; loses 1,977 existing concept tags (not catastrophic — teachers have other paths to lessons).
- **Hybrid.** Derive index now, promote to filter later if teachers ask.

**What we need from you:** Whether teachers searching by academic concept (photosynthesis, decomposition, natural resources, immigration stories) is a use case worth supporting visibly, or whether keyword search plus thematic filters is enough.

---

## Decision 6: Curriculum sequences — model "Pt 1, Pt 2," or hand-curate?

**The question:** Some of our lessons are designed to be taught in sequence. Should the system model that explicitly, or do we treat sequencing as out-of-scope metadata?

**Where things stand:** About 25 lessons (3.2%) have real curriculum-sequence dependencies in their body text. The Decomposition Part 1 and Part 2 lessons are designed to be taught months apart — fall predict, spring observe — as a single observational arc. They have identical metadata. Photosynthesis Part 1 and Part 2 are similar. Knife Cuts Part 2, Will It Decompose Part II, Winter After School Sessions, Food System Advocates 1 & 2, Lunar New Year units. About 5 lesson series total in the corpus.

**What's at stake:** Two things. First, our duplicate-detection automation flags identical-metadata pairs as near-duplicates — these designed pairs trip the alarm. Second, a teacher who finds Pt 2 has no signal that Pt 1 should be taught first.

**Options:**

- **Model as a series.** Add `series_id` and `part_number` fields. Lessons in a series can be linked, ordered, and recognized by the dedup system as intentionally paired.
- **Hand-curate.** Track the relationships in a content-team-only spreadsheet; don't model in the database. Sustainable for ~25 lessons; unsustainable if the pattern grows.
- **Drop the framing.** Treat each part as a standalone lesson; accept that dedup occasionally flags pairs.

**What we need from you:** Whether sequenced lessons are common enough in the curriculum to model formally, or whether the count is small enough that hand-curation is fine.

---

## Decision 7: Lesson variants and adaptations

**The question:** Some lessons exist in multiple shapes — a Plan A and Plan B for weather, a base lesson and a mobile-education adaptation, an English version and a Spanish version, a school-specific version. Should we model these relationships, or accept the lossiness?

**Where things stand:** Four patterns, each from real lessons in the corpus:

- **Plan A / Plan B contingencies.** PS 109 Garden Jobs has Plan A (outdoor garden work) and Plan B (indoor leaf rubbing) for weather. Currently two unrelated rows in the database.
- **Mobile-education adaptations.** Fattoush has explicit Mobile Education adaptations in the doc body. The lesson_format field accepts only one value, so the multi-modal capability is invisible.
- **Bilingual variants.** Decomposition has English/Spanish Canva worksheets. No "languages available" indicator.
- **Site-specific authorship.** PS 7, PS 109, PS 216 references in titles and content. No formal school-association field; can't browse "lessons authored at PS 109."

**What's at stake:** Whether teachers can find "the Spanish version" or "PS 109's version" or "the indoor backup," and whether the system understands these as related lessons rather than as unrelated rows that happen to share a topic.

**Options:**

- **Model fully.** Add `parent_lesson_id` for variant relationships, `languages_available` for bilingual, `site_id` for school-specific authorship. Most expressive; biggest schema scope.
- **Model partially.** Pick the highest-value relationship (probably Plan A/B + mobile, since those are the most frequent and have the clearest user need) and model just that.
- **Hand-curate.** Counts are small; track the relationships outside the database.
- **Drop the framing.** Treat variants as separate lessons; accept that search and dedup don't see them as related.

**What we need from you:** Which of these variant types matter most for teachers searching the library — knowing about a Plan B, finding a Spanish version, browsing a school's lessons — and whether any of them need formal modeling vs. hand-curation.

---

## Decision 8: Teacher contribution at submission

**The question:** Should teachers contribute any classification information when submitting a lesson, or stay completely hands-off?

**Where things stand:** Today's submission flow is deliberately minimal — teachers paste a Google Doc URL and pick "new" or "update." Reviewers tag everything else: themes, season, location, grade levels, cultural heritage, all 17 fields. Volume is roughly 10 submissions per year, so reviewer load isn't the constraint.

Quality is. The audit found classification inconsistencies that flow directly from reviewer judgment calls — a stovetop-cooking lesson tagged for grades 3K-8, a cosmetics-craft lesson tagged "cooking," a lesson about African American foodways tagged "immigration stories." These are reviewer calls, not data bugs.

There's also an existing on-ramp we currently ignore: some middle-era lessons have a "Tags–Pick a tag from each category" block in the Google Doc body where teachers fill in tags as they write. None of these tags roundtrip into structured metadata.

**Options:**

- **Stay teacher-zero.** Accept the reviewer load; invest in reviewer training and reviewer UX.
- **Light teacher tagging.** Ask teachers for a few high-value fields at submission (grade levels, activity type, season). Reviewer can override.
- **Full teacher tagging.** Mirror the reviewer form for teachers. Reviewer's job becomes verification + standards-alignment + quality control rather than authoring.
- **In-doc tag extraction.** Parse the existing "Tags–Pick" block in middle-era docs as authoritative for those lessons. Teachers don't see new UI; tags get extracted at submission time.

**What we need from you:** Whether teacher-side tagging quality is consistent enough to be useful. Submission volume is low enough that this is mostly about classification quality, not throughput.

---

## Decision 9: Cultural Responsiveness Features — keep, evidence-anchor, or replace?

**The question:** The 7-feature CRF tagging is performing as theater. Should we keep, anchor, or replace it?

**Where things stand:** 88% of lessons have CRF tags applied — higher coverage than almost any other field. But five lessons share the exact same 7-element list verbatim, and reading the actual lessons, several of those features (e.g., "Reshapes curriculum") have no concrete textual anchor in the document. The tags are being applied uniformly rather than diagnostically. CRF is also the highest-coverage field that's never displayed publicly — neither teachers nor reviewers see it in the search UI.

**What's at stake:** Whether we keep an aspirational classification framework that's not currently doing diagnostic work, or invest in making it real.

**Options:**

- **Drop it.** Stop tagging CRFs. Frees reviewer time. Loses an aspirational framework.
- **Require evidence pointers.** Each CRF tag must point to a specific paragraph or activity in the lesson that justifies it. Reviewer effort goes up; tagging quality goes way up.
- **Replace with free-text + auto-extraction.** Reviewer writes a short narrative about a lesson's cultural-responsiveness story; an automated process extracts structured tags from it for search.
- **Keep as-is, surface in UI.** Accept the current granularity; at minimum stop hiding the work.

**What we need from you:** Whether the CRF framework is something to invest in (evidence-anchor), retire (drop), or rethink (free-text + extraction).

---

## How we'd like to engage you

Three patterns, in increasing order of structure:

- **Async review.** You read the cards, send back written input on the ones that matter most. Engineering proceeds with what you've given us; we flag anything we couldn't decide for you.
- **Working session.** We walk through cards together — probably 90 minutes for the high-stakes ones (Decision 0, Decisions 1-3, Decision 8), with the others handled async.
- **Per-decision deep dives.** For any decision where you'd want specific options laid out with affected lesson counts and tradeoffs (e.g., the cultural-heritage taxonomy with all 78 distinct values), we can prepare a more focused brief.

Mix-and-match welcome. Tell us where to invest the most attention, and we'll calibrate.

---

*Companion documents: stakeholder brief (same date), foundational technical report (`docs/plans/2026-04-30-metadata-rebuild-foundational-report.md`).*
