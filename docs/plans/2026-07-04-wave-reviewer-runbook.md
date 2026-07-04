# Spreadsheet-wave reviewer runbook (one page)

*Written by the Fable coordination session, 2026-07-04, after pre-wave chain steps 1–3
went live on production (tracker: `2026-07-04-pre-wave-plan.md`). Audience: the
reviewers submitting the spreadsheet-collected lessons.*

## The loop, per lesson

1. **Copy the 2026 template** (Google Doc `1C0tCnRJXgdNxUJtv25aq2ZDnKHjTcjA0H6LIY248xQk`)
   — never type on the master. One copy per lesson.
2. **Fill the copy from the spreadsheet row.** Two cells matter more than the rest:
   - **Summary** — required. You cannot publish a new lesson with a blank summary
     (the form will stop you with a message); it's the blurb people see in search.
   - The **option cells** (Core Competencies, Social-Emotional Skills, Tags): replace
     the instruction text with your actual picks, typed as in the instruction list,
     separated by commas. Delete what you don't pick.
3. **Submit it**: `/submit/new` → paste the doc link → Submit.
4. **Review it yourself, immediately**: open the submission from the review queue
   (reviewing your own submission is supported — the review step IS the publish step).
5. **Check the pre-filled boxes against the doc, fill the rest, publish as new.**

## What fills in automatically (and what doesn't)

When you open the review, the form mechanically reads the doc and pre-ticks what it can
match **exactly**: title, summary, Core Competencies, Social-Emotional Skills, the
heating element (none → Basic prep, stove → Stovetop, oven → Oven), and — from the Tags
cell — holidays/observances, cooking skills, main ingredients (the food group is added
automatically with a specific ingredient), and garden skills.

**Fill these by hand every time** (never auto-filled): activity type, grade levels,
monthly theme, cultural heritage, location, seasons.

Three deliberate behaviors, not bugs:
- **Uncertain = blank.** Anything the form couldn't match exactly is left empty on
  purpose — nothing is ever guessed. A cell still holding its untouched instruction
  text counts as unanswered.
- **Picked every option in a category?** The form can't tell that apart from the
  untouched instruction list, so it leaves that category blank too — tick by hand.
- **Your edits always win.** Pre-fill never overwrites anything already set.

## Terminology (the doc and the app now match)

- "cultural diversity" in the doc **is** the Core Competency **Cultural Diversity**
  (renamed from "Culturally Responsive Education" — same concept).
- The doc's SEL words (bravery, kindness, respect, self-management, collaboration,
  pride, joy) map 1:1 onto the **Social-Emotional Skills** checkboxes.
- **Don't pick "Social-Emotional Intelligence"** (under Core Competencies) for new
  lessons — it's a legacy value old lessons carry; the template dropped it.
- **AI auto-tagging is off** (owner decision 2026-07-04). Nothing else fills in tags;
  there is nothing to wait for.

## If the duplicate warning pops up

Publishing may show **"This looks like an existing lesson"** naming a library lesson.
Check it: genuinely a different lesson → **Publish anyway**; it's the same lesson →
back out and choose "Publish as an update" or "Already in the library" instead.

## If something looks broken

Stop and report it (with the lesson name and a screenshot) rather than working around
it — one weird lesson is data; a workaround habit hides bugs.
