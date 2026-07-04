# Owner UI/UX candidates — 2026-07-04 Q&A session

Ideas raised by the owner in the 2026-07-04 product Q&A session (Fable). Each entry:
idea, owner's words, assessment, size, verdict. Survivors become FP5 briefs
(Fable designs, Opus builds, owner merges) when enough accumulate or the owner says go.

---

## 1. Require (or warn on) empty summary at review approval

**Owner's words:** "yes capture that as a candidate — that's a good idea." (In response
to the gap Fable flagged: nothing forces a non-empty summary at approve time.)

**Context/evidence (Fable-verified 2026-07-04):**
- Review form prefills summary from the doc (`parseExtractedContent`,
  `src/pages/reviewDetailHelpers.ts:68` — Summary:/Overview:/Description: line, else
  first paragraph ≤500 chars); reviewer can edit (`ReviewMetadataForm.tsx:122`).
- `complete_review_atomic` (latest `20260702000000`) saves it on approve_new via
  `COALESCE(v_meta->>'summary','')` — an emptied box lands as `''` silently.
- FP4-B5 just backfilled 65 historical blanks; this closes the forward door.

**Assessment:** small front-end guard in the review form — block approve (or warn) when
summary is empty/whitespace. Optionally mirror with a cheap server-side check in the
edge function or RPC for defense-in-depth. No conflict with FP4 briefs 1–4/6 (none touch
ReviewMetadataForm approval path). Summary is FTS weight-B, so blanks also hurt search —
the guard protects real search quality, not just cosmetics.

**Size:** S

**Verdict:** ✅ riding FP5 `brief-2-template-prefill-and-ai-off.md` §3 (pre-wave chain)

---

## 2. Sidebar: only Grade Level expanded by default

**Owner's words:** "keep grade level open and the rest collapsed."

**Context:** Today the expanded trio is Grade Level + Activity Type + Season & Timing
(`IntSidebar.tsx:70` hardcoded, `:103` special-case). The trio was inherited from the
design system and carried forward in the 2026-07-03 design session ("stay the expanded
trio"), never actively owner-picked. Owner has now actively decided: Grade open, all
else collapsed. Tradeoff (explained to owner): +1 click for Activity/Season users,
calmer first paint, all category names visible at a glance.

**Size:** XS (flag flip + test updates)

**Verdict:** ✅ added as rider to FP4 `brief-4-small-stuff-cleanup.md` item 7a

---

## 3. Move counts explainer line to top of sidebar

**Owner's words:** "the note at the bottom of the filters panel 'Numbers show how many
lessons carry each tag' would be better at the top, below the word 'Filters' so it
doesn't get pushed down by the expanded filter panels."

**Context:** The hint (`int-sidebar-hint`, FP3 brief-1 owner-approved copy) renders as
the sidebar's LAST child (`IntSidebar.tsx:143`) — every expanded section pushes it down.
Moving it under the `<h2>Filters</h2>` heading makes it visible on first paint and pairs
naturally with the counts it explains. Copy stays verbatim.

**Size:** XS

**Verdict:** ✅ added as rider to FP4 `brief-4-small-stuff-cleanup.md` item 7b

---

## 4. SEL vocab expansion + rename (PRE-WAVE — build before spreadsheet-wave reviews)

**Owner's words:** "we're going to use that template, it's locked in… for new lessons going
forward… we can first change that [Social-Emotional Learning] to Social Emotional Skills as
a category, and then add bravery, kindness, respect, collaboration, pride, joy (not
self-management because it's already there) as options." Cultural-diversity question:
owner picked **(a)** — review-time convention, no new Core Competency option.

**Context:** The 2026 lesson template (Google Doc `1C0tCnRJXgdNxUJtv25aq2ZDnKHjTcjA0H6LIY248xQk`,
LOCKED, all next-wave submissions use it) lists SEL words that mostly don't exist in the app
vocab. Owner decision: the app adapts, additively. Also: template dropped "Social-Emotional
Intelligence" from Core Competencies deliberately (SEL now expected in every new lesson —
that's what the skills category is for); the SEI value STAYS in the app for old lessons.

**Owner-approved scope (= explicit filterDefinitions.ts sign-off, stated as such):**
1. Rename category label "Social-Emotional Learning" → **"Social-Emotional Skills"**
   (display-only; key `socialEmotionalLearning` and column `social_emotional_learning` stay).
2. Add 6 options (Title-case, matching existing style): **Bravery, Kindness, Respect,
   Collaboration, Pride, Joy**. Final list = existing 5 + new 6 = 11. Old values stay
   (mixed-era list; old 5 only match pre-2026 lessons — owner informed, accepted).
3. ~~No Core Competencies vocab change; reviewer convention "cultural diversity" →
   "Culturally Responsive Education".~~ **SUPERSEDED same session** — owner upgraded to a
   system-wide RENAME: "where the language disagrees between the old language and the new
   language but we are connecting the two versions… we should just change it in the whole
   system to be Cultural Diversity (how it shows up in the review interface, filters, and
   tags) even for existing lessons. But only because we're saying those 2 are the same
   thing and we're just calling it something different now." → 320 PROD lessons renamed
   in both storage representations; "Social-Emotional Intelligence" stays for old lessons.

**Fable-verified enforcement census (2026-07-04) — every place the SEL list lives:**
- `src/utils/filterDefinitions.ts:193` `socialEmotionalLearning` (label + 5 options) —
  drives sidebar, pills, drawer, reviewer form (via ALL_FIELD_CONFIGS).
- PROD CHECK constraint `valid_social_emotional_learning` on `lessons`
  (`social_emotional_learning <@ ARRAY[5 values]`) — **needs a migration** to widen
  (drop+recreate; additive so existing rows trivially pass; check NOT-VALID status of the
  old constraint before choosing VALIDATE semantics — see NOT-VALID re-check gotcha).
- Edge Zod mirror `supabase/functions/_shared/metadataSchemas.ts:427/468`
  `SocialEmotionalLearningEnum` + client mirror (`src/types/reviewFormPayload.zod.ts`) —
  order-sensitive equivalence test exists (B4 pattern), update both in sync.
- AI-draft enums in `process-submission` (extractor vocab — re-check exact site; see
  memory `project_submission_extractor_vocab_drift`).
- JSONB metadata mirror: additive change ⇒ no data mutation; executor should still confirm
  new-lesson writes land in both column and metadata JSONB (complete_review_atomic path).

**Size:** M (1 migration + config/label + 2 Zod mirrors + AI-draft list + tests)

**Timing constraint:** must be merged + on PROD **before reviewers start the spreadsheet
wave**, so the new words are pickable at review time. This is the next-brief priority.
**Hard ordering (Fable-verified):** 6 of the 7 broken retired rows carry the old CRE
value → FP4 brief 6 must be applied to PROD first.

**Verdict:** ✅ **BRIEF WRITTEN** — `docs/plans/fp5-briefs/brief-1-sel-skills-and-cultural-diversity.md`
(same session; full enforcement census + migration spec inside)

---

## 5. Mechanical template-cell tag prefill (review form)

**Owner's words:** "just like you talked about extracting summaries… there should also be
other tags that can be extracted mechanically… all submitted lessons in this next wave will
be using this template."

**Context (Fable-verified):** Template table labels survive into stored
`extracted_content` (probed 2 real PROD submissions: `Core Competencies: | Environmental
and community stewardship, social justice` etc.), so a `parseExtractedContent`-style parser
is feasible. Best candidates: Core Competencies (near-exact vocab match), heating element
none/stove/oven → Cooking Methods 3-value map, SEL (after candidate #4 lands). Fuzzy cells
(Cultural Responsiveness free text, the one-blob "Tags" cell) stay reviewer territory.

**⚠️ VERDICT UPGRADED (same session).** Fable's initial "parked — AI already covers these
cells" reasoning was WRONG, corrected after reading the DEPLOYED process-submission
(v41, deployed 2026-07-03): the AI draft covers exactly TWO fields
(culturalResponsivenessFeatures + activityType), nothing else; all other tag fields start
EMPTY in the review form (only title/summary prefill mechanically). Moreover the AI draft
has NEVER run in production — 127 submissions all-time, 0 drafts (every submission
predates the feature) — and it silently skips unless ANTHROPIC_API_KEY is configured as a
PROD edge secret (unverifiable via MCP; check Supabase dashboard → Edge Function secrets).
Owner's recollection "we turned off the AI drafts" ≈ T4b retired OpenAI *embeddings* +
FP-11 (2026-07-03) dropped a dead OpenAI debug path from process-submission; the Anthropic
tag-draft passes remain in deployed code.

So for a template-locked, few-dozen-lesson wave, mechanical prefill = "confirm what's
prefilled" vs "hand-fill ~15 fields per lesson from scratch." Deterministic (no key, no
model): exact-match against closed vocab or leave blank for the reviewer.

**Size:** M

**Verdict:** ✅ **BRIEF WRITTEN** — `docs/plans/fp5-briefs/brief-2-template-prefill-and-ai-off.md`
(pre-wave chain step 3; owner confirmed "i think we can get the mechanical pre-fill built
before the wave")

---

## 6. AI auto-tag: OFF for the short term, code kept

**Owner's words:** "for the AI drafting, i think for the short term i do not want to use
it. i dont want to just delete it because i think i will come back to it and build it
out, but i don't want to use it for the next wave of lesson submissions."

**Context (Fable-verified):** the two Anthropic passes in deployed `process-submission`
v41 (CRF features + activity type — the ONLY AI-drafted fields) have never run in PROD
(127 submissions, 0 drafts; all predate the feature) and today turn on/off implicitly via
ANTHROPIC_API_KEY presence. Decision: explicit default-OFF flag
(`ENABLE_AI_AUTO_TAG === 'true'` to re-enable), delete nothing.

**Size:** XS (rides brief 2 §1)

**Verdict:** ✅ riding FP5 `brief-2-template-prefill-and-ai-off.md` §1; AI-draft
build-out = future owner-initiated work, post-wave

---

## Pre-wave plan

Steps 1–3 above + FP4 brief 6 sequenced in `docs/plans/2026-07-04-pre-wave-plan.md`
(THE tracker; owner: "prioritize the pre-wave work above all else"). FP4 briefs 1–4
explicitly deprioritized until the chain lands.
