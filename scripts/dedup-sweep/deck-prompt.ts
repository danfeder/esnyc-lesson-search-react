/**
 * T4 dedup sweep — self-contained per-group prompt builder for the evidence
 * deck fan-out. Pure: given a candidate group + the corpus body map, returns
 * the exact text handed to one Sonnet 4.6 agent. Everything the agent needs is
 * inlined here — the agents get NO database and NO file access.
 */
import { FACET_ARRAY_COLUMNS } from './export-corpus';

export const CONTENT_TRUNCATE_CHARS = 6000;

/** Human labels for the facet columns (agents never see raw column names). */
const FACET_LABELS: Record<string, string> = {
  activity_type: 'Activity type',
  location_requirements: 'Location',
  thematic_categories: 'Themes',
  season_timing: 'Season',
  core_competencies: 'Core competencies',
  cultural_heritage: 'Cultural heritage',
  academic_integration: 'Academic subjects',
  social_emotional_learning: 'Social-emotional learning',
  cooking_methods: 'Cooking methods',
  main_ingredients: 'Main ingredients',
  garden_skills: 'Garden skills',
  cooking_skills: 'Cooking skills',
  observances_holidays: 'Observances / holidays',
  cultural_responsiveness_features: 'Cultural responsiveness',
};

export interface CandidateMember {
  lesson_id: string;
  title: string;
  summary_present: boolean;
  content_length: number;
  populated_facet_count: number;
  grade_levels: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface CandidatePair {
  id_a: string;
  id_b: string;
  title_sim: number;
  content_sim: number;
  hash_equal: boolean;
  metadata_match: boolean;
}

export interface CandidateGroup {
  group_id: string;
  tier: 'A' | 'B' | 'C';
  representative_title: string;
  member_count: number;
  max_content_sim: number;
  max_title_sim: number;
  candidate_reasons: string[];
  flags: { grade_band: boolean; mobile_ed: boolean; series_part: boolean };
  members: CandidateMember[];
  pairwise: CandidatePair[];
}

/** Full corpus record (from artifacts/corpus.json) — only the fields we render. */
export interface CorpusBody {
  lesson_id: string;
  title: string;
  summary: string | null;
  content_text: string;
  created_at: string | null;
  grade_levels: string[] | null;
  [facet: string]: unknown;
}

function facetLines(body: CorpusBody): string {
  const lines: string[] = [];
  const grades = Array.isArray(body.grade_levels) ? body.grade_levels : [];
  if (grades.length > 0) lines.push(`  Grade levels: ${grades.join(', ')}`);
  for (const col of FACET_ARRAY_COLUMNS) {
    const v = body[col];
    if (Array.isArray(v) && v.length > 0) {
      lines.push(`  ${FACET_LABELS[col] ?? col}: ${(v as string[]).join(', ')}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : '  (no tags recorded)';
}

function shortDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : 'unknown date';
}

function truncateBody(text: string): string {
  if (text.length <= CONTENT_TRUNCATE_CHARS) return text;
  return `${text.slice(0, CONTENT_TRUNCATE_CHARS)}\n[…truncated — full lesson is ${text.length} characters]`;
}

function pct(sim: number): string {
  return `${Math.round(sim * 100)}%`;
}

const LETTER = (i: number): string => String.fromCharCode(65 + i); // 0→A, 1→B, …

export function buildDeckPrompt(group: CandidateGroup, bodies: Map<string, CorpusBody>): string {
  const memberBlocks = group.members
    .map((m, i) => {
      const body = bodies.get(m.lesson_id);
      const title = body?.title ?? m.title;
      const summary = (body?.summary ?? '').trim();
      const content = body ? truncateBody(body.content_text) : '(content unavailable)';
      return [
        `### Lesson ${LETTER(i)} — id: ${m.lesson_id}`,
        `  Title: ${title}`,
        `  Added: ${shortDate(m.created_at)}`,
        `  Summary: ${summary.length > 0 ? summary : '(none written)'}`,
        facetLines(body ?? ({} as CorpusBody)),
        '',
        `  Lesson text:`,
        content,
      ].join('\n');
    })
    .join('\n\n---\n\n');

  const pairLines = group.pairwise
    .map((p) => {
      const ia = group.members.findIndex((m) => m.lesson_id === p.id_a);
      const ib = group.members.findIndex((m) => m.lesson_id === p.id_b);
      const same = p.hash_equal
        ? 'word-for-word identical'
        : `about ${pct(p.content_sim)} of the wording overlaps`;
      const meta = p.metadata_match ? '; identical ingredient & theme tags' : '';
      return `  Lesson ${LETTER(ia)} vs Lesson ${LETTER(ib)}: ${same}${meta}`;
    })
    .join('\n');

  return `You help a school-garden curriculum team tidy up their lesson library. Some lessons look like they might be the same. Your job is to look at the actual lesson text below and decide, for THIS set, whether they are truly the same lesson saved twice, a related set that should both be kept, or unrelated lessons that just happen to look alike.

There are ${group.members.length} lessons in this set. Read the lesson text — do not rely only on the overlap numbers.

## The three choices (pick exactly one for the whole set)
- "retire_duplicate": the ENTIRE set collapses to a single lesson — every member is a redundant copy of one survivor (same activity, same steps). The team keeps the survivor and retires all the other copies. Only choose this if you would retire every member except one.
- "keep_family": the set should be KEPT because at least one member is a genuinely different or adapted lesson that stands on its own — for example the same recipe taught to different grades, a multi-part series, or the same dish in two genuinely different lesson plans. IMPORTANT: if the set is a MIX — two or more are redundant copies of each other, but one or more others are real, different, or grade-adapted lessons worth keeping — choose keep_family and, in whats_different, name which specific lessons are the redundant copies. (The team will retire those copies by hand; do not force the whole set to retire_duplicate just because part of it is duplicated.)
- "unrelated": they only look alike by coincidence (similar title or shared words) but are really about different things. A false alarm.

## If you pick "keep_family", also say which kind (family_type):
- "grade-band": the same lesson adapted for different grade levels.
- "mobile-ed": versions tied to a mobile-education / traveling-classroom program.
- "series-part": parts of a sequence (Part 1, Part 2, Session 3, Day 2…).
- "same-dish-different-lesson": same food or topic, but two genuinely different lesson plans.
- "other": related in some other clear way.
Otherwise set family_type to null.

## If you pick "retire_duplicate":
- Choose ONE lesson to keep (the survivor) and give its id in survivor_lesson_id.
- Prefer the copy that is more complete: a written summary, more tags recorded, richer/longer lesson text, or a more recent version.
- In survivor_why, say in one short sentence why that copy is the better one to keep.
Otherwise set survivor_lesson_id and survivor_why to null.

## Overlap signals (context only — trust the lesson text over these)
${pairLines}

## The lessons
${memberBlocks}

## How to answer
Reply with ONLY a JSON object — no code fences, no commentary before or after. Copy these key names EXACTLY, character for character (note "whats_the_same" includes the word "the"):
{
  "whats_the_same": "1-2 plain sentences a non-technical person can follow, describing what these lessons share",
  "whats_different": "1-3 plain, concrete sentences on how they differ (activities, grade focus, length, how complete they are) — if they are truly identical, say so",
  "recommended_verdict": "retire_duplicate | keep_family | unrelated",
  "family_type": "grade-band | mobile-ed | series-part | same-dish-different-lesson | other | null",
  "survivor_lesson_id": "the id of the lesson to keep, or null",
  "survivor_why": "one short sentence, or null",
  "confidence": "high | medium | low"
}

Write the two description fields in everyday words that will be read aloud to a non-technical person. Do NOT use technical jargon, database field names, percentages, or the words "trigram", "hash", or "similarity".`;
}
