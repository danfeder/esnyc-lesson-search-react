# FP5 Brief 2 — Mechanical template prefill + AI auto-tag off switch + summary guard (M)

Read `docs/plans/fp5-briefs/README.md` + the standing rules in
`docs/plans/fp4-briefs/README.md` first (STOP rule verbatim: "STOP = write the hand-back
and END YOUR TURN; design forks route to Fable; the owner only answers explicit approvals
(data fix / merge / gates).")

## Why (owner decisions, 2026-07-04 Q&A session — record in
`docs/plans/2026-07-04-owner-uiux-candidates.md` §1, §5, §6)

Next wave = a few dozen spreadsheet-collected lessons, submitted by reviewers through the
normal `/submit` flow using the LOCKED 2026 template (Google Doc
`1C0tCnRJXgdNxUJtv25aq2ZDnKHjTcjA0H6LIY248xQk`), then reviewed immediately by the same
person. Three owner decisions this brief implements:

1. **AI auto-tag OFF for the short term, code KEPT.** "i think for the short term i do
   not want to use it. i dont want to just delete it because i think i will come back to
   it and build it out." The two Anthropic passes in `process-submission` (CRF +
   activity-type) have NEVER run in PROD (127 submissions, 0 drafts — all predate the
   feature) and currently depend silently on whether ANTHROPIC_API_KEY happens to be set.
   Make the OFF state explicit and deliberate.
2. **Mechanical prefill from the template's labeled cells** — the wave's tag entry must
   not be ~15 hand-picked fields per lesson. Deterministic: exact-match against closed
   vocab or leave blank. Reviewer remains the gate; nothing auto-saves.
3. **Empty-summary approve guard** (candidates §1): block approving a NEW lesson with a
   blank summary.

## ⛔ Ordering

Branch AFTER FP5 brief 1 is merged (the parser targets the POST-rename vocab:
"Social-Emotional Skills" options incl. the 6 new values; "Cultural Diversity").
No DB changes in this brief. One PR + one edge-function deploy gate (process-submission).

## Scope

### 1. AI auto-tag off switch (`supabase/functions/process-submission/index.ts`)

- Gate BOTH LLM passes (Step 4.5 CRF auto-tag, Step 4.6 activity-type auto-tag) behind
  one explicit flag, default OFF:
  `const AI_AUTO_TAG_ENABLED = Deno.env.get('ENABLE_AI_AUTO_TAG') === 'true';`
- When disabled, log one line (`[auto-tag] disabled by owner decision 2026-07-04`) and
  skip both passes entirely (no Anthropic import side effects at runtime — the import
  itself may stay).
- Dated comment at the flag: owner decision 2026-07-04, short-term off, re-enable by
  setting the secret `ENABLE_AI_AUTO_TAG=true` (owner will revisit and build out later).
- DELETE nothing. Prompts, models, merge logic all stay.
- Deploy = the standard edge deploy gate (owner presses). Post-deploy verify: deployed
  source contains the flag (get_edge_function), version bumped.

### 2. Mechanical template prefill (frontend, review-form init layer)

New pure util `parseTemplateTags(content: string)` in `src/pages/` alongside
`parseExtractedContent` (same layer — `reviewDetailHelpers.ts` or a sibling file), wired
into the same init path (`reviewMetadataInit.ts`) that already prefills title/summary.
Prefill populates the FORM only; reviewer edits freely; the normal canonicalize + Zod
paths run unchanged on save.

**Ground truth about the input** (Fable-probed 2 real PROD rows): extracted_content
renders template tables as labeled lines, e.g.
`Core Competencies: | Environmental and community stewardship, social justice |`.
Re-probe 1–2 rows yourself before building.

**⚠️ THE core design constraint — instruction-boilerplate detection.** The locked
template's cells CONTAIN their option lists as instructions (e.g. Core Competencies cell
ships with "List all that apply: Environmental and community stewardship, social justice,
garden skills…, kitchen skills…, cultural diversity"; the SEL cell ships with "pick all
that apply or add your own: Bravery, kindness, respect, self-management (safety),
collaboration, pride, joy"). A teacher who leaves the stock text in place has answered
NOTHING. Required guards, in order:
  a. Strip known instruction prefixes ("List all that apply:", "pick all that apply or
     add your own:", the parenthetical variants) before matching.
  b. If the remaining cell text still contains ALL options of the category (= stock list
     untouched), treat the cell as UNANSWERED → prefill nothing for that field.
  c. Only exact (case-insensitive, punctuation-tolerant) value matches count; never
     fuzzy/substring-across-words.
Unit-test all three guards with the stock template text as a fixture.

**V1 field list (and no more):**
- `coreCompetencies` — from the "Core Competencies:" cell. Alias map for template
  phrasings: "cultural diversity" → `Cultural Diversity` (post-brief-1 this is the
  canonical value anyway), "garden skills and related academic content" etc. match
  case-insensitively. "Social-Emotional Intelligence" is NEVER prefidden — not offered
  by the template; if its words appear, ignore (owner: new lessons don't pick it).
- `socialEmotionalLearning` — from the "Social-Emotional Skills" cell (accept the label
  with/without hyphen). Match the post-brief-1 vocab (Bravery, Kindness, Respect,
  Self-management, Collaboration, Pride, Joy + the legacy 5). "self-management (safety)"
  → `Self-management`.
- `cookingMethods` — find "Heating element" (Tags cell or anywhere): map
  none → `basic-prep`, stove → `stovetop`, oven → `oven` (stored kebab values, per
  `FILTER_CONFIGS.cookingMethods`).
- From the "Tags–Pick a tag from each category" cell ONLY (bound the scan to that cell's
  text, after stripping its long instruction sentence — it name-drops vocab-adjacent
  words like "compost", "stove or oven"):
  `observancesHolidays`, `cookingSkills`, `mainIngredients`, `gardenSkills` — exact
  value matches against each closed vocab. For `mainIngredients`, auto-add the parent
  group per `INGREDIENT_PARENT_MAP` when a specific matches (the Zod refinement
  `refineMainIngredientParents` REJECTS orphan specifics — prefill must satisfy it).
- OUT of V1: culturalHeritage (free-text cell → reviewer), thematicCategories (monthly
  theme names need a month→theme mapping — reviewer), gradeLevels (not on page 1),
  activityType (AI's field, now off — reviewer picks; it's 4 checkboxes),
  "Food and Nutrition Standard" (no app field exists — ignore).
- If a prefilled field would be EMPTY after guards, leave it untouched (undefined), so
  the form renders exactly as today.

Tests: fixture = the real template's stock text (verbatim); a filled-in variant; a
half-filled variant (stock SEL cell + real competencies cell); assert per-field guards,
kebab cooking-methods mapping, ingredient parent auto-add, and that a non-template doc
(legacy submission text) prefills nothing beyond today's title/summary.

### 3. Empty-summary approve guard (rider, candidates §1)

In the review form/approve path: block `approve_new` when summary is empty/whitespace —
inline plain-language message ("Add a one-or-two-sentence summary — it appears in search
results."), not a toast. Do NOT gate `approve_update` (the RPC keeps the existing summary
via `COALESCE(NULLIF(...))` — verified), nor needs_revision/reject. Test both paths.

## Out of scope

Deleting/removing AI-draft code or columns; any vocab change (brief 1's job); heritage
prefill; month→theme mapping; any DB change; FP4 briefs 1–4 surfaces.

## Verify

`npm run check` + `npm run test:run`. Live drive on the deploy preview (TEST data):
open a review whose extracted_content contains filled template cells — expect prefilled
checkboxes matching the doc; stock-template submission prefills nothing; approve with
empty summary blocked with the message. Confirm deployed process-submission (after gate)
logs the disabled line on a fresh TEST submission and writes NO ai_draft_metadata.

## Hand-back

One-line status + file paths. Surprises → hand-back; design forks → Fable.
