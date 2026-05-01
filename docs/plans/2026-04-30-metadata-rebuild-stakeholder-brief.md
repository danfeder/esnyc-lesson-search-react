# Lesson Search System: Where We Are and What We Need to Decide

**Date:** 2026-04-30
**Audience:** Program leadership and curriculum stakeholders
**Companion to:** Metadata System Foundational Report (technical version, same date)

---

## What this document is

ESYNYC has built up a substantial digital library of lessons — 772 in our test environment, around 831 in production — searchable, filterable, and submittable by teachers. Over the past year, we've hardened the system through several rounds of cleanup. It now mostly works as designed.

This report summarizes a deep audit of how lessons are described in our database, where that system has accumulated quirks and inconsistencies, what our lessons actually contain that we *aren't* capturing, and the design decisions we'll need to make as we plan the next round of improvements. It's organized around three questions: How does it work today? Where is it falling short? What do we need to decide?

## The headline

Our system is structurally sound — every lesson has the basic information it needs to be found and displayed. The problems are in the details, and they limit how good the system can get rather than preventing it from working.

The most important framing: our database isn't one library, it's three libraries that have been merged. About 88% of lessons came in through an early bulk import and use one set of conventions. About 10% came in through our teacher submission system and use a different set of conventions. A handful of lessons (under 1%) came in one way and got partially overwritten the other way, with some information lost in the process. These three populations have different vocabulary, different field names, and different internal shapes. Most users never notice, but it makes our search and filtering quietly inconsistent.

Sitting on top of that, our vocabulary isn't standardized. "Knife skills," "Cutting," and "Cutting Skills" all refer to the same thing but live as separate tags. There are 123 distinct tags in our cooking skills field representing perhaps 30 actual concepts. Roughly 36% of our corpus has at least one inconsistent vocabulary entry, with about 4,920 instances of drift across the whole database.

One field has a structural problem: what we call "lesson format" is trying to do three jobs at once. It's the only field where the issue is design rather than cleanup. And underneath all this, our lesson documents — the actual Google Docs teachers and curriculum staff have written over the years — contain dramatically more information than our metadata captures. Standards codes, vocabulary lists, time breakdowns, book references, weather contingencies, school-specific variants, bilingual versions, sequence relationships — none of which are searchable or filterable today.

The final piece worth flagging up front: teachers contribute zero classification information when submitting lessons. They paste a Google Doc URL and pick "new" or "update." Reviewers tag everything. This puts the entire classification quality story on the reviewer experience.

## The three eras, in detail

Think of it like a library that received donations from three different decades, each with different cataloging conventions still in use.

The legacy import era is the bulk of our corpus — about 684 lessons, or 88%. This is what got bulk-imported when the system was first built. These lessons use Title Case throughout ("Indoor," "Garden Basics," "Stovetop," "Asian"), use a singular grade-level field, and have a richer nested structure for academic concepts that lets us track which subjects connect to which specific ideas.

The submission era covers about 78 lessons, or 10%. These came in through the teacher submission flow we built more recently. They use lowercase-with-hyphens ("indoor," "garden-basics," "environmental-stewardship"), use a plural grade-level field, and have a flatter, simpler structure for academic concepts. They also have empty confidence scores because the submission pipeline doesn't run the AI validation step that the original import did.

The post-update era is small — just 7 lessons, under 1%. These were existing lessons that got updated through the submission system. The original rich form got archived to a versions table, but the live version of the lesson was overwritten in the submission-era format, sometimes losing detail along the way.

The implication: these three populations don't differ only in vocabulary. They differ in field names, in shape, in what data they carry. Cleaning up vocabulary alone won't merge them. Any unification effort needs to deliberately harmonize all three populations, which is significant scope.

## The vocabulary problem

About 36% of our corpus has at least one inconsistent vocabulary entry, and across the whole database there are roughly 4,920 instances of values that should be canonicalized into a smaller set of standard terms.

Concrete examples make the chaos easier to grasp. The lesson format field has 4 different strings representing only 2 actual concepts. The cooking methods field is entirely in lowercase-hyphenated form, while the rest of the system expects Title Case, so the filter UI silently drops everything in that field. The 5 SEL competencies from the CASEL framework appear written 10 different ways across lessons. Cooking skills has 123 distinct entries representing maybe 30 real concepts — we have "Cutting Skills" used 127 times, "Cutting" used 15 times, "Knife skills" used 4 times, and "Knife safety" used 16 times, which are very likely the same underlying skill expressed four ways.

The operational impacts are real but quiet. The filter sidebar silently drops some lessons because the canonical filter value doesn't match the stored variant. Search ranking is degraded because the same concept written two ways doesn't accumulate a single strong signal in the search index. Our duplicate detection misses real near-duplicates. The two Fattoush lessons in our corpus are the clearest case: same dish, same key ingredients, but the cooking skills are tagged in entirely different vocabulary, so the system doesn't see the overlap.

We had a planned cleanup project for this and deferred it indefinitely on the reasoning that any future content reclassification would revisit the taxonomy anyway. Whether that was the right call is one of the decisions worth revisiting.

## The one truly bad design decision

The field called "lesson format" is a single label that tries to answer three independent questions at once: how long is the lesson (single period, double period, multi-session unit), where is it delivered (in-person classroom, mobile education), and is it standalone or part of a unit. These are genuinely independent dimensions that should be separate fields.

In practice, this means picking "Mobile education format" makes the time-structure invisible — we can't see whether mobile lessons are short or long. One of our Fattoush lessons has a literal "Adaptations for Mobile Education" section in the document body, but the metadata can only hold one value, so the dual-modal capability disappears from any search or filter. This is the only deeply structural problem in the schema, and it needs programmatic input on which dimensions matter most before we can redesign it.

## Who tags what, and what it means for quality

Our submission flow is deliberately minimal: teachers paste a Google Doc URL, pick "new lesson" or "update existing," and submit. Every single classification field — themes, season, location, grade levels, cultural heritage, activity type, all 17 of them — is added by reviewers.

This means classification quality depends entirely on reviewer training and consistency. Our reviewer interface is currently the single most important piece of user experience in the entire system. The audit found real inconsistencies that flow directly from reviewer judgment calls. The Mashama Bailey lesson is tagged for all 11 grade levels (3K through 8) despite involving stovetop cooking. Lotion & Soap is tagged as "cooking" even though it explicitly tells teachers "NOT for eating" — it's a cosmetics craft. The African American Food Traditions lesson is tagged "immigration stories" even though African American foodways emerged from enslavement, not voluntary immigration. None of these are catastrophic, but together they suggest that reviewer training and the design of the reviewer form deserve significant investment.

There's also a small but interesting wrinkle: some of our middle-era lessons have a self-tagging interface inside the Google Doc body, where teachers filled in tags as part of writing the lesson. These tags currently don't roundtrip into structured metadata at all. If we ever want teachers to contribute classification, that's an existing on-ramp we're ignoring.

## What our lessons contain that the system can't see

This is the section most worth your attention. We read 25 lesson documents end-to-end across two rounds of analysis, and the gap between what lessons contain and what the system captures is large.

About 29% of our lessons have NYS standards codes embedded in their body text, and 9% have Common Core codes. A teacher searching for "NYS PS 5.1f" today gets no results, even though many lessons could match. About 15% of lessons (mostly older ones) have explicit defined-term vocabulary lists that get flattened into broad concept tags. Recurring book references like "Leaf Man," "Diary of a Worm," "And Then It's Spring," and "An Orange in January" anchor multiple lessons but aren't searchable. About 12% of lessons embed external URLs to videos, articles, or web tools — these are brittle dependencies that can rot, and we have no system to track or validate them.

Several lessons differentiate content by grade band within a single document. The Plant Part Salad 4 lesson has separate task cards for PK-K, 1-2, 3, and 4-5. Our data model captures one grade range per lesson, so this internal structure is invisible. Some lessons have explicit Plan A and Plan B contingencies for weather, like Juneteenth's instruction to harvest strawberries from the garden if they're in season. Several lessons have explicit Mobile Education adaptations that disappear into the lesson-format field. Some have bilingual English-Spanish Canva variants with no "languages available" indicator. Lessons authored at specific schools (PS 7, PS 109, PS 216) have those references in their titles and content, but we have no formal school-association field.

The hidden curriculum sequencing matters more than its small count suggests. About 25 lessons (3.2%) have real curriculum-sequence dependencies in their body text — the Decomposition Part 1 and Part 2 lessons, for example, are designed to be taught months apart in fall and spring as a single observational arc. They have identical metadata. Our automated duplicate detection will flag them as near-duplicates when they're actually designed pairs. As we lean more on automation, that becomes a real problem.

## A few specific findings worth knowing

The "7 Cultural Responsiveness Features" stamp is performing as theater. Five lessons share the exact same 7-element CRF list verbatim, and reading the actual lessons, several of those features (like "Reshapes curriculum") have no concrete textual anchor in the document. The metadata is claiming granularity it doesn't really have.

Three small populations of broken or stranded records exist. There are 3 lessons stuck as "Unknown" from failed imports years ago. There are 17 submissions older than 60 days that never got processed and are stuck in the pipeline. And there are 7 lessons whose richer original metadata only survives in the version archive — we'd lose information if we ever discarded that archive carelessly.

Several features we've built haven't gotten used. The bookmarks, lesson collections, and saved searches functionality all have database support but no user interface. We should decide whether to build the UI or remove the underlying infrastructure, since carrying it indefinitely costs us cognitive overhead with no benefit.

## The decisions ahead

The next round of improvements needs explicit answers to several questions, and they fall into three buckets based on who needs to weigh in.

The decisions that need programmatic and curriculum input from leadership are the most consequential. **Cultural heritage taxonomy** is the first: we have two competing hierarchies in the system today, and a long tail of values that aren't currently filterable — Mexican appears 41 times, Italian 26 times, African American 25 times, Mediterranean 42 times, Indigenous 24 times, Lenape 7 times. We need to decide what the canonical taxonomy is, how deep the hierarchy goes, and how we want to surface the long tail. **Activity type expansion** is the second: our current four buckets (cooking, garden, both, academic) miss real categories the audit surfaced — cosmetics craft, classroom orientation, STEM engineering, after-school nutrition units, special-population pull-outs, mobile education. We can expand the categories, allow multiple selections per lesson, or accept the lossiness. **The lesson format decomposition** is the third: as discussed, we need to decide which of the three dimensions (time structure, delivery mode, standalone-versus-unit) matter most for filtering and search. **Sequence and variant modeling** is the fourth: do we formally model curriculum sequences, Plan A/B contingencies, mobile adaptations, school-specific versions, and bilingual variants in the schema, or hand-curate them since the counts are small?

The decisions that need operations input are about the human side of the system. **Teacher intake scope** is the main one: should teachers contribute any classification information at submission, or stay completely hands-off? Options range from light tagging (just grades, activity, and season) to full classification with reviewer verification. Submission volume is low — roughly 10 per year — so reviewer load isn't critical, but classification quality might improve with teacher input. **Cultural responsiveness features** is the second: the current 7-feature checkbox approach is performing as theater. We could drop it, require evidence pointers tied to lesson text, replace it with free-text plus auto-extraction, or keep it as-is.

The remaining decisions are technical or structural and don't directly affect how the system feels to users. They're about vocabulary canonicalization (one-time cleanup versus runtime workarounds) and storage architecture (technical cleanup choices). I can make recommendations on those once the curriculum decisions are made.

## Recommended next steps

I'd suggest we work through the programmatic decisions first — cultural heritage taxonomy, activity type, lesson format decomposition, and sequence modeling — since those will shape what the engineering work targets. The operational decisions can run in parallel. The technical decisions become much easier once we know what we're aiming at.

For each of the four programmatic questions, I can put together a more focused brief with the specific options laid out, the affected lesson counts for each, and the trade-offs of each path. Let me know which ones you'd want to dig into first, or whether you'd prefer to walk through them together in a working session.
