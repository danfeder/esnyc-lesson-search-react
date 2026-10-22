#!/usr/bin/env node
/**
 * T4 walkthrough decision recorder (design doc D6).
 *
 * Merges a batch spec into docs/plans/t4-dedup/decisions.json, pulling every
 * lesson_id VERBATIM from candidates.json by group_id + letter position
 * (deck.md letters A, B, C… = members[] order), so no ID is ever retyped.
 *
 * Usage: node scripts/dedup-sweep/record-decisions.mjs <batch-spec.json>
 *
 * Batch spec: JSON array of
 *   {
 *     "group_id":  "anywhere-farm-30bddc",
 *     "verdict":   "retire_duplicate" | "keep_family" | "unrelated",
 *     "family_label": "grade-band" | "mobile-ed" | "series-part"
 *                   | "same-dish-different-lesson" | "other",   // keep_family only
 *     "retire":    ["B"],          // letters to retire (may be empty/absent)
 *     "note":      "free text"     // optional
 *   }
 * Survivors are derived: every member not listed in `retire`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const candidatesPath = resolve(root, 'docs/plans/t4-dedup/candidates.json');
const decisionsPath = resolve(root, 'docs/plans/t4-dedup/decisions.json');

const specPath = process.argv[2];
if (!specPath) {
  console.error('Usage: node record-decisions.mjs <batch-spec.json>');
  process.exit(1);
}

const candidates = JSON.parse(readFileSync(candidatesPath, 'utf8'));
const byGroupId = new Map(candidates.groups.map((g) => [g.group_id, g]));

const VERDICTS = new Set(['retire_duplicate', 'keep_family', 'unrelated']);
const LABELS = new Set([
  'grade-band',
  'mobile-ed',
  'series-part',
  'same-dish-different-lesson',
  'other',
]);
const letterToIndex = (letter) => letter.toUpperCase().charCodeAt(0) - 65;

const spec = JSON.parse(readFileSync(specPath, 'utf8'));

const decisions = existsSync(decisionsPath)
  ? JSON.parse(readFileSync(decisionsPath, 'utf8'))
  : {
      artifact: 'T4 dedup walkthrough decisions (design doc D6)',
      decided_by:
        'Daniel Feder (user), live walkthrough with Claude (Fable) per D4; AI deck recommendations were the starting point, every verdict user-confirmed',
      session_dates: [],
      source_candidates: 'docs/plans/t4-dedup/candidates.json',
      evidence_deck: 'docs/plans/t4-dedup/deck.md (+ deck.json, model claude-sonnet-4-6)',
      verdict_key: {
        retire_duplicate:
          'true copy set: survivors stay live, retired[] get retired_at + retired_reason=dedup:<group_id>',
        keep_family:
          'genuinely different lessons kept for the post-sprint families project (family_label records how they relate); retired[] non-empty when an exact-copy pair was embedded in the family',
        unrelated: 'false positive — no action, kept for the record',
      },
      groups: [],
    };

const today = new Date().toISOString().slice(0, 10);
if (!decisions.session_dates.includes(today)) decisions.session_dates.push(today);

const byDecisionId = new Map(decisions.groups.map((g) => [g.group_id, g]));
let added = 0;
let replaced = 0;

for (const entry of spec) {
  const group = byGroupId.get(entry.group_id);
  if (!group) throw new Error(`Unknown group_id: ${entry.group_id}`);
  if (!VERDICTS.has(entry.verdict)) throw new Error(`Bad verdict for ${entry.group_id}: ${entry.verdict}`);
  if (entry.verdict === 'keep_family' && !LABELS.has(entry.family_label))
    throw new Error(`keep_family needs a valid family_label for ${entry.group_id}`);
  if (entry.verdict !== 'keep_family' && entry.family_label)
    throw new Error(`family_label only valid on keep_family (${entry.group_id})`);

  const retireLetters = entry.retire ?? [];
  const retireIdx = retireLetters.map(letterToIndex);
  for (const i of retireIdx) {
    if (i < 0 || i >= group.members.length)
      throw new Error(`Retire letter out of range for ${entry.group_id} (${group.members.length} members)`);
  }
  if (entry.verdict === 'retire_duplicate' && retireIdx.length === 0)
    throw new Error(`retire_duplicate with nothing to retire: ${entry.group_id}`);
  if (entry.verdict === 'unrelated' && retireIdx.length > 0)
    throw new Error(`unrelated cannot retire anything: ${entry.group_id}`);
  if (retireIdx.length >= group.members.length)
    throw new Error(`Refusing to retire every member of ${entry.group_id}`);

  const retiredSet = new Set(retireIdx);
  const record = {
    group_id: group.group_id,
    title: group.representative_title,
    tier: group.tier,
    verdict: entry.verdict,
    ...(entry.verdict === 'keep_family' ? { family_label: entry.family_label } : {}),
    survivors: group.members
      .filter((_, i) => !retiredSet.has(i))
      .map((m) => ({ lesson_id: m.lesson_id, title: m.title })),
    retired: group.members
      .filter((_, i) => retiredSet.has(i))
      .map((m) => ({ lesson_id: m.lesson_id, title: m.title })),
    decided_by: 'user',
    decided_on: today,
    ...(entry.note ? { note: entry.note } : {}),
  };

  if (byDecisionId.has(group.group_id)) {
    decisions.groups = decisions.groups.map((g) => (g.group_id === group.group_id ? record : g));
    replaced += 1;
  } else {
    decisions.groups.push(record);
    added += 1;
  }
  byDecisionId.set(group.group_id, record);
}

const totalRetired = decisions.groups.reduce((n, g) => n + g.retired.length, 0);
decisions.summary = {
  groups_decided: decisions.groups.length,
  groups_total: candidates.groups.length,
  verdicts: decisions.groups.reduce((acc, g) => {
    acc[g.verdict] = (acc[g.verdict] ?? 0) + 1;
    return acc;
  }, {}),
  total_lessons_to_retire: totalRetired,
};

writeFileSync(decisionsPath, JSON.stringify(decisions, null, 2) + '\n');
console.log(
  `${added} added, ${replaced} replaced → ${decisions.groups.length}/${candidates.groups.length} groups decided; ${totalRetired} lessons marked for retirement`
);
