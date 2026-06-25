/* eslint-disable no-console -- CLI script: console output is the operator UI */
/**
 * ANALYSIS-ONLY (decision (a) cooking_skills sub-question, Session 14).
 * v2 — honest all-69 scoring after Codex audit (agent a1be3c2d…) refuted the
 * earlier r2-backfill approach.
 *
 * For each of the 69 gold-keyed lessons, compare cooking_skills three ways, ALL
 * scored across the full 69 (no excluded lessons, no cross-round backfill):
 *
 *   A  FLOOR-ONLY        = deterministic applyC02Floor() over existing tags
 *   B  LLM-AS-IS (r4)    = finalC02.cooking_skills; for the 4 records whose
 *                          finalC02 was discarded by an off-vocab INGREDIENT
 *                          (whole-record validation coupling), reconstruct the
 *                          LLM's intended cooking final from the raw r4 decision
 *                          (keep ∪ add) — the cooking decision itself is valid.
 *   C  OPTION 3 (floor-retention) = floor ∪ finalCooking. The LLM may KEEP/ADD
 *                          but cannot DROP a floored skill (= a NEW floor-
 *                          retention policy, NOT the existing add-suppressing
 *                          keep-only lock; re-opens D-P6 for cooking).
 *
 * Plus the LLM-vs-floor deviation breakdown on the records with real output.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { applyC02Floor, floorTagValues, loadC02FloorInput } from './c02-floor';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'artifacts');
const RUN = path.join(DIR, 'c02-run.opus-4-8.p2prime-r4.jsonl');
const GOLD = path.join(DIR, 'c02-answer-key.final.jsonl');
const CORPUS = path.join(DIR, 'corpus.jsonl');

function readJsonl(p: string): any[] {
  return fs
    .readFileSync(p, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

const floorInput = loadC02FloorInput();
const goldById = new Map<string, string[]>();
for (const r of readJsonl(GOLD)) goldById.set(r.id, r.cooking_skills ?? []);
const corpusById = new Map<string, any>();
for (const r of readJsonl(CORPUS)) corpusById.set(r.id, r);

// r4 "final cooking" per id: finalC02 if present, else reconstruct keep∪add from
// the raw decision (keep = strings, add = {value,reason} objects — handle both).
const llmFinalById = new Map<string, string[]>();
const reconstructed: string[] = [];
for (const r of readJsonl(RUN)) {
  if (r.finalC02) {
    llmFinalById.set(r.id, r.finalC02.cooking_skills ?? []);
  } else {
    const dec = r.rawInput?.cooking_skills;
    if (dec && Array.isArray(dec.keep)) {
      const keep = dec.keep as string[];
      const add = (dec.add ?? []).map((a: any) => (typeof a === 'string' ? a : a.value));
      llmFinalById.set(r.id, [...new Set([...keep, ...add])]);
      reconstructed.push(r.id.slice(0, 8));
    }
  }
}
console.log(
  `reconstructed cooking from raw r4 decision (finalC02 discarded by ingredient-fail): ${reconstructed.join(', ') || '(none)'}\n`
);

const set = (a: string[]) => new Set(a);
const minus = (a: Set<string>, b: Set<string>) => [...a].filter((x) => !b.has(x));
const inter = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x));
const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

type Agg = { tp: number; fp: number; fn: number };
const A: Agg = { tp: 0, fp: 0, fn: 0 }; // floor-only
const B: Agg = { tp: 0, fp: 0, fn: 0 }; // LLM-as-is
const C: Agg = { tp: 0, fp: 0, fn: 0 }; // option 3 floor-retention

// deviation buckets (only on lessons with real LLM output)
let recovery = 0,
  noise = 0,
  lostTp = 0,
  prune = 0,
  withOutput = 0;

function tally(agg: Agg, pred: string[], gold: Set<string>) {
  const p = set(pred);
  agg.tp += inter(p, gold).length;
  agg.fp += minus(p, gold).length;
  agg.fn += minus(gold, p).length;
}

for (const [id, goldArr] of goldById) {
  const corpus = corpusById.get(id) ?? {};
  const floor = floorTagValues(
    applyC02Floor(
      {
        cooking_skills: corpus.cooking_skills ?? [],
        main_ingredients: corpus.main_ingredients ?? [],
      },
      floorInput
    ).cooking
  );
  const llm = llmFinalById.get(id) ?? []; // empty only if no decision at all
  const gS = set(goldArr);

  tally(A, floor, gS);
  tally(B, llm, gS);
  tally(C, union(floor, llm), gS);

  // deviation breakdown (LLM final vs floor), only where the LLM produced tags
  if (llmFinalById.has(id)) {
    withOutput++;
    const fS = set(floor),
      lS = set(llm);
    for (const add of minus(lS, fS)) gS.has(add) ? recovery++ : noise++;
    for (const drp of minus(fS, lS)) gS.has(drp) ? lostTp++ : prune++;
  }
}

function f1(a: Agg) {
  const p = a.tp / (a.tp + a.fp || 1);
  const r = a.tp / (a.tp + a.fn || 1);
  return { p, r, f: (2 * p * r) / (p + r || 1) };
}
const row = (name: string, a: Agg) => {
  const m = f1(a);
  console.log(
    `  ${name.padEnd(28)} P=${m.p.toFixed(3)} R=${m.r.toFixed(3)} F1=${m.f.toFixed(3)}   (tp=${a.tp} fp=${a.fp} fn=${a.fn})`
  );
};

console.log(`=== cooking_skills, scored across ALL ${goldById.size} gold lessons (r4) ===`);
row('A  FLOOR-ONLY', A);
row('B  LLM-AS-IS (r4)', B);
row('C  OPTION 3 (floor∪LLM)', C);
console.log(
  `\n  C over A (option 3 vs floor-only): F1 ${f1(C).f - f1(A).f >= 0 ? '+' : ''}${(f1(C).f - f1(A).f).toFixed(3)}`
);
console.log(
  `  B over A (LLM-as-is vs floor):      F1 ${f1(B).f - f1(A).f >= 0 ? '+' : ''}${(f1(B).f - f1(A).f).toFixed(3)}`
);

console.log(`\nLLM-vs-floor deviations (on the ${withOutput} lessons with LLM output):`);
console.log(`  RECOVERY (add, in gold)   = ${recovery}   <- real skills only the LLM reaches`);
console.log(`  NOISE    (add, not gold)  = ${noise}`);
console.log(`  LOST-TP  (drop, in gold)  = ${lostTp}   <- recovered by option 3 (floor retention)`);
console.log(
  `  PRUNE    (drop, not gold) = ${prune}   <- option 3 keeps these floor FPs (its cost)`
);
