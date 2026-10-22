/**
 * T4 dedup sweep — assemble the human-readable walkthrough deck (deck.md) from
 * the deterministic candidate groups (candidates.json) + the collected Sonnet
 * verdicts (deck.json). Pure rendering: no AI, no DB. Re-runnable any time
 * without re-running the fan-out.
 *
 * The deck is READ ALOUD to a non-technical curriculum owner, so the copy is
 * plain-language: friendly lesson labels (Lesson A/B/C), overlap described in
 * words, no internal field names. Ordered Tier A → B → C; Tier A rolls up into
 * a batch-confirmation table at the top.
 *
 * Usage:  npx tsx scripts/dedup-sweep/build-deck-md.ts
 */
/* eslint-disable no-console -- CLI script: console output is the operator UI */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CandidateGroup, CandidateMember, CandidatePair } from './deck-prompt';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, '..', '..');
const DIR = path.join(REPO_ROOT, 'docs', 'plans', 't4-dedup');
const CANDIDATES_PATH = path.join(DIR, 'candidates.json');
const DECK_JSON_PATH = path.join(DIR, 'deck.json');
const DECK_MD_PATH = path.join(DIR, 'deck.md');

interface DeckEntry {
  group_id: string;
  whats_the_same: string;
  whats_different: string;
  recommended_verdict: 'retire_duplicate' | 'keep_family' | 'unrelated';
  family_type: string | null;
  survivor_lesson_id: string | null;
  survivor_why: string | null;
  confidence: 'high' | 'medium' | 'low';
}

const LETTER = (i: number): string => String.fromCharCode(65 + i);

/**
 * Display-clean a raw lesson title for the markdown deck: replace control
 * characters (notably the trailing vertical tab that 10 title pairs carry) with
 * a space and collapse. Without this the raw control bytes would land verbatim
 * in deck.md, making it a binary (grep-invisible) file. Codepoint scan rather
 * than a control-character regex (which `no-control-regex` forbids).
 */
function cleanTitle(t: string): string {
  let out = '';
  let prevSpace = false;
  for (const ch of t) {
    const code = ch.codePointAt(0) as number;
    if (code <= 0x1f || code === 0x7f) {
      if (!prevSpace) {
        out += ' ';
        prevSpace = true;
      }
    } else {
      out += ch;
      prevSpace = false;
    }
  }
  return out.trim();
}

const VERDICT_PHRASE: Record<DeckEntry['recommended_verdict'], string> = {
  retire_duplicate: 'Same lesson saved more than once — keep one, retire the extra copies',
  keep_family: 'Keep all of these — related, not the same lesson',
  unrelated: 'False alarm — these are not actually related',
};

const FAMILY_PHRASE: Record<string, string> = {
  'grade-band': 'same lesson adapted for different grades',
  'mobile-ed': 'versions tied to the mobile-education program',
  'series-part': 'parts of a sequence (Part 1, Part 2, …)',
  'same-dish-different-lesson': 'same food or topic, but genuinely different lessons',
  other: 'related in another way',
};

function shortDate(iso: string | null): string {
  return iso ? iso.slice(0, 10) : 'unknown';
}

function pct(sim: number): string {
  return `${Math.round(sim * 100)}%`;
}

function flagPhrases(flags: CandidateGroup['flags']): string[] {
  const out: string[] = [];
  if (flags.grade_band) out.push('mentions grade levels');
  if (flags.mobile_ed) out.push('mentions Mobile Education');
  if (flags.series_part) out.push('looks like a multi-part series');
  return out;
}

function overlapWords(p: CandidatePair): string {
  return p.hash_equal
    ? 'word-for-word identical'
    : `~${pct(p.content_sim)} of the wording overlaps`;
}

function memberLine(m: CandidateMember, i: number, survivorId: string | null): string {
  const isSurvivor = survivorId && m.lesson_id === survivorId;
  const grades =
    m.grade_levels.length > 0 ? `grades ${m.grade_levels.join(', ')}` : 'no grades tagged';
  const summary = m.summary_present ? 'has a summary' : 'no summary';
  return (
    `- **Lesson ${LETTER(i)}**${isSurvivor ? ' ⭐ (suggested keeper)' : ''} — “${cleanTitle(m.title)}” · ` +
    `added ${shortDate(m.created_at)} · ${grades} · ${m.content_length.toLocaleString()} characters · ` +
    `${m.populated_facet_count} tag groups · ${summary}  \n  <sub>id: \`${m.lesson_id}\`</sub>`
  );
}

function survivorLabel(group: CandidateGroup, survivorId: string | null): string {
  if (!survivorId) return '—';
  const idx = group.members.findIndex((m) => m.lesson_id === survivorId);
  if (idx === -1) return `\`${survivorId}\` (not in group!)`;
  return `Lesson ${LETTER(idx)} — “${cleanTitle(group.members[idx].title)}”`;
}

function renderGroup(
  group: CandidateGroup,
  entry: DeckEntry | undefined,
  index: number,
  flaggedLowOverlap: boolean
): string {
  const flags = flagPhrases(group.flags);
  const flagStr = flags.length > 0 ? ` · _${flags.join('; ')}_` : '';
  const header = `### ${index}. ${cleanTitle(group.representative_title)}  \n**Tier ${group.tier}** · ${group.members.length} lessons${flagStr}`;

  if (!entry) {
    return `${header}\n\n> ⚠️ No recommendation was produced for this group — review manually.\n\n${group.members
      .map((m, i) => memberLine(m, i, null))
      .join('\n')}\n`;
  }

  const confirmNote = flaggedLowOverlap
    ? "\n> ⚠️ **Please confirm before retiring.** The AI judges these to be the same lesson (usually one is a fuller, more finished version of the other), but the actual wording overlaps less than the tool's auto-safe threshold — so this one is worth a human look rather than a quick yes.\n"
    : '';

  const verdictLine =
    `**Recommendation:** ${VERDICT_PHRASE[entry.recommended_verdict]}` +
    (entry.recommended_verdict === 'keep_family' && entry.family_type
      ? ` — _${FAMILY_PHRASE[entry.family_type] ?? entry.family_type}_`
      : '') +
    `  (confidence: ${entry.confidence})`;
  const survivorLine =
    entry.recommended_verdict === 'retire_duplicate'
      ? `**Keep:** ${survivorLabel(group, entry.survivor_lesson_id)}` +
        (entry.survivor_why ? ` — ${entry.survivor_why}` : '')
      : '';

  const overlapLines = group.pairwise
    .map((p) => {
      const ia = group.members.findIndex((m) => m.lesson_id === p.id_a);
      const ib = group.members.findIndex((m) => m.lesson_id === p.id_b);
      const meta = p.metadata_match ? ', same ingredient & theme tags' : '';
      return `Lesson ${LETTER(ia)} ↔ ${LETTER(ib)}: ${overlapWords(p)}${meta}`;
    })
    .join('  \n');

  return [
    header,
    confirmNote,
    `**What's the same:** ${entry.whats_the_same}`,
    '',
    `**What's different:** ${entry.whats_different}`,
    '',
    verdictLine,
    survivorLine,
    '',
    '**The lessons:**',
    group.members.map((m, i) => memberLine(m, i, entry.survivor_lesson_id)).join('\n'),
    '',
    `<sub>Overlap: ${overlapLines || 'n/a'}</sub>`,
    '',
  ]
    .filter((s) => s !== '')
    .join('\n');
}

function main(): void {
  const candidates: { groups: CandidateGroup[]; counts: Record<string, number> } = JSON.parse(
    readFileSync(CANDIDATES_PATH, 'utf8')
  );
  const deckData: { model: string; deck: DeckEntry[]; violations?: string[] } = JSON.parse(
    readFileSync(DECK_JSON_PATH, 'utf8')
  );
  const entryById = new Map(deckData.deck.map((e) => [e.group_id, e]));
  const groups = candidates.groups; // already sorted Tier A→C

  // Groups to flag "please confirm": the AI recommends retiring as duplicates,
  // but the group's wording overlap is below the near-duplicate floor (tier C).
  // Computed STRUCTURALLY from the verdict + the group's raw-derived tier — NOT
  // by pattern-matching the free-text `violations` message (which would silently
  // stop flagging if that wording ever changed). This is the one signal that
  // tells the walkthrough to look before retiring, so it must not be fragile.
  const flaggedGroups = groups.filter(
    (g) => entryById.get(g.group_id)?.recommended_verdict === 'retire_duplicate' && g.tier === 'C'
  );
  const flaggedIds = new Set(flaggedGroups.map((g) => g.group_id));

  const tierA = groups.filter((g) => g.tier === 'A');
  const tierB = groups.filter((g) => g.tier === 'B');
  const tierC = groups.filter((g) => g.tier === 'C');

  const verdictCount = (verdict: string): number =>
    deckData.deck.filter((e) => e.recommended_verdict === verdict).length;

  const lines: string[] = [];
  lines.push('# Duplicate-lesson walkthrough deck');
  lines.push('');
  lines.push(
    `_Generated for the T4 dedup walkthrough. ${groups.length} candidate sets found across the ` +
      `${candidates.counts.corpus_row_count ?? '764'}-lesson live library. Recommendations are from an ` +
      `AI reading each lesson (model \`${deckData.model}\`) — they are a starting point; every ` +
      `keep/retire decision is yours._`
  );
  lines.push('');
  lines.push(
    "**How to read a set:** each set groups lessons that looked alike. For each one you'll see "
  );
  lines.push(
    'what the lessons share, how they differ, and a suggested action. ⭐ marks the copy the AI '
  );
  lines.push('suggests keeping when it recommends retiring duplicates.');
  lines.push('');
  lines.push(
    `**Tally of suggestions:** ${verdictCount('retire_duplicate')} sets look like true duplicates to ` +
      `retire · ${verdictCount('keep_family')} look like related sets to keep · ${verdictCount('unrelated')} ` +
      `look like false alarms.`
  );
  lines.push('');
  lines.push(
    `Sets by tier: **Tier A** (near-certain copies) ${tierA.length} · **Tier B** (probable) ` +
      `${tierB.length} · **Tier C** (judgment calls / families) ${tierC.length}.`
  );
  lines.push('');

  if (flaggedGroups.length > 0) {
    lines.push(
      `> ⚠️ **${flaggedGroups.length} sets need a closer look before retiring.** The AI ` +
        `calls these the same lesson (usually one copy is much more finished than the other), but their ` +
        `wording overlaps less than the tool retires on its own, so please eyeball each one. They are ` +
        `marked "Please confirm" in the Tier C detail: ` +
        flaggedGroups.map((g) => `_${cleanTitle(g.representative_title)}_`).join(', ') +
        '.'
    );
    lines.push('');
  }

  // Tier A batch-confirmation table.
  lines.push('## Tier A — near-certain copies (batch review)');
  lines.push('');
  lines.push(
    'These sets have at least one word-for-word or near-identical pair. Skim the table, then '
  );
  lines.push(
    'see the detail below each. **Watch the "keep all?" column** — some Tier A sets contain a '
  );
  lines.push(
    'true copy *and* a genuinely different lesson, so the suggestion is to keep the set, not retire it.'
  );
  lines.push('');
  lines.push('| # | Lesson set | Lessons | Suggestion | Keep |');
  lines.push('|---|---|---|---|---|');
  tierA.forEach((g, i) => {
    const e = entryById.get(g.group_id);
    const suggestion = e ? VERDICT_PHRASE[e.recommended_verdict].split(' — ')[0] : '⚠️ review';
    const keep =
      e && e.recommended_verdict === 'retire_duplicate'
        ? survivorLabel(g, e.survivor_lesson_id)
        : 'keep all';
    lines.push(
      `| ${i + 1} | ${cleanTitle(g.representative_title)} | ${g.members.length} | ${suggestion} | ${keep} |`
    );
  });
  lines.push('');

  let idx = 0;
  lines.push('## Tier A — detail');
  lines.push('');
  for (const g of tierA) {
    idx += 1;
    lines.push(renderGroup(g, entryById.get(g.group_id), idx, flaggedIds.has(g.group_id)));
  }
  lines.push('## Tier B — probable duplicates & families');
  lines.push('');
  for (const g of tierB) {
    idx += 1;
    lines.push(renderGroup(g, entryById.get(g.group_id), idx, flaggedIds.has(g.group_id)));
  }
  lines.push('## Tier C — judgment calls, families, and false alarms');
  lines.push('');
  for (const g of tierC) {
    idx += 1;
    lines.push(renderGroup(g, entryById.get(g.group_id), idx, flaggedIds.has(g.group_id)));
  }

  writeFileSync(DECK_MD_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log(`✅ Wrote ${DECK_MD_PATH} (${groups.length} groups)`);
}

// Only run when invoked directly (see the same guard in export-corpus.ts): a
// future import of a helper from this module must not write deck.md on import.
const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  main();
}
