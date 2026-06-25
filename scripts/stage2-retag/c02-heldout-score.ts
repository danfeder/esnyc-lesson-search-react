/**
 * P2′.7 — Held-out (fresh-25) COOKING-ONLY canary scorer (D-P2 / D-P12).
 *
 * Scores the SHIPPED per-field cooking output (floor-retention `cooking_skills`
 * via `materializeC02Ship` — D-P11) against an independently-labeled cooking
 * gold key, reusing the SAME tested helpers as the P2′.8 re-score gate
 * (`applyC02Floor`, `materializeC02Ship`, `cookingFinalForShip`). Ingredients
 * are NOT scored — under D-P11 they ship the deterministic floor, covered at
 * scale by the P3.1 all-700 prevalence review (D-P12).
 *
 * Self-validation: pointed at the 69-key + stored r4 run it MUST reproduce the
 * re-score gate (floor-only 0.807 / LLM-as-is 0.836 / floor-retention 0.872).
 *
 *   npx tsx scripts/stage2-retag/c02-heldout-score.ts \
 *     --run scripts/stage2-retag/artifacts/c02-run.opus-4-8.heldout.jsonl \
 *     --key scripts/stage2-retag/artifacts/c02-heldout-cooking-key.jsonl \
 *     [--corpus scripts/stage2-retag/artifacts/corpus.jsonl] [--md <out.md>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyC02Floor, floorTagValues, loadC02FloorInput } from './c02-floor';
import { cookingFinalForShip, materializeC02Ship, type C02ShipRecord } from './ship-policy';
import { loadC02Manifest } from './vocab';

const ARTIFACTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'artifacts');

interface JsonlRow {
  id: string;
  [key: string]: unknown;
}
function readJsonl(p: string): JsonlRow[] {
  return readFileSync(p, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as JsonlRow);
}

interface Agg {
  tp: number;
  fp: number;
  fn: number;
}
function tally(agg: Agg, pred: readonly string[], gold: ReadonlySet<string>): void {
  const p = new Set(pred);
  for (const v of p) gold.has(v) ? agg.tp++ : agg.fp++;
  for (const v of gold) if (!p.has(v)) agg.fn++;
}
function metrics(a: Agg): { p: number; r: number; f1: number } {
  const p = a.tp / (a.tp + a.fp || 1);
  const r = a.tp / (a.tp + a.fn || 1);
  const f1 = (2 * p * r) / (p + r || 1);
  return { p, r, f1 };
}
const f = (x: number) => x.toFixed(3);

function parseArgs(argv: string[]): { run: string; key: string; corpus: string; md?: string } {
  let run = path.join(ARTIFACTS, 'c02-run.opus-4-8.heldout.jsonl');
  let key = path.join(ARTIFACTS, 'c02-heldout-cooking-key.jsonl');
  let corpus = path.join(ARTIFACTS, 'corpus.jsonl');
  let md: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    const v = argv[i + 1];
    switch (argv[i]) {
      case '--run':
        run = v;
        i++;
        break;
      case '--key':
        key = v;
        i++;
        break;
      case '--corpus':
        corpus = v;
        i++;
        break;
      case '--md':
        md = v;
        i++;
        break;
    }
  }
  return { run, key, corpus, md };
}

function main(): void {
  const args = parseArgs(process.argv);
  const floorInput = loadC02FloorInput();
  const cookingValues = new Set(loadC02Manifest().cookingSkills);

  const goldById = new Map<string, string[]>();
  for (const r of readJsonl(args.key)) goldById.set(r.id, (r.cooking_skills as string[]) ?? []);
  const corpusById = new Map<string, JsonlRow>();
  for (const r of readJsonl(args.corpus)) corpusById.set(r.id, r);
  const runById = new Map<string, C02ShipRecord>();
  for (const r of readJsonl(args.run)) runById.set(r.id, r as unknown as C02ShipRecord);

  const floorOnly: Agg = { tp: 0, fp: 0, fn: 0 };
  const llmAsIs: Agg = { tp: 0, fp: 0, fn: 0 };
  const shipped: Agg = { tp: 0, fp: 0, fn: 0 }; // floor-retention = the SHIPPED policy
  const perValue = new Map<string, Agg>();
  const missingRun: string[] = [];
  let retentionSupersetOfFloor = 0;
  const perLesson: { id: string; gold: string[]; ship: string[]; fp: string[]; fn: string[] }[] =
    [];

  for (const [id, goldArr] of goldById) {
    const existing = {
      cooking_skills: (corpusById.get(id)?.cooking_skills as string[]) ?? [],
      main_ingredients: (corpusById.get(id)?.main_ingredients as string[]) ?? [],
    };
    const record = runById.get(id) ?? {};
    if (!runById.has(id)) missingRun.push(id);

    const floored = floorTagValues(applyC02Floor(existing, floorInput).cooking);
    const ship = materializeC02Ship(record, existing, floorInput, cookingValues).cooking_skills;
    const llmCooking = cookingFinalForShip(record, cookingValues);

    const gold = new Set(goldArr);
    tally(floorOnly, floored, gold);
    tally(llmAsIs, llmCooking, gold);
    tally(shipped, ship, gold);

    // floor-retention must be a superset of the floor (no clean-core loss vs floor)
    if (floored.every((v) => ship.includes(v))) retentionSupersetOfFloor++;

    // per-value (over the SHIPPED output)
    const shipSet = new Set(ship);
    for (const v of new Set<string>([...shipSet, ...gold])) {
      const a = perValue.get(v) ?? { tp: 0, fp: 0, fn: 0 };
      if (shipSet.has(v) && gold.has(v)) a.tp++;
      else if (shipSet.has(v)) a.fp++;
      else a.fn++;
      perValue.set(v, a);
    }
    perLesson.push({
      id,
      gold: goldArr,
      ship,
      fp: ship.filter((v) => !gold.has(v)),
      fn: goldArr.filter((v) => !shipSet.has(v)),
    });
  }

  // FAIL CLOSED: a key id absent from the run output would be scored as the
  // deterministic floor (empty record → floor-only ship), silently turning an
  // INCOMPLETE run into a passing-looking scorecard. An incomplete run must not
  // be reportable as a valid canary result — throw before emitting any numbers.
  if (missingRun.length) {
    throw new Error(
      `FAIL-CLOSED: ${missingRun.length} key id(s) absent from the run output (\`${path.basename(
        args.run
      )}\`) — an incomplete run cannot produce a valid scorecard. Missing: ${missingRun.join(', ')}`
    );
  }

  const mShip = metrics(shipped);
  const mFloor = metrics(floorOnly);
  const mLlm = metrics(llmAsIs);

  const sentinels = ['Tasting', 'Kitchen & food safety'];
  const lines: string[] = [];
  lines.push(`# C02 P2′.7 — Held-out (fresh-25) cooking-only canary scorecard`);
  lines.push('');
  lines.push(
    `- run: \`${path.basename(args.run)}\`  ·  key: \`${path.basename(args.key)}\`  ·  lessons: **${goldById.size}**`
  );
  lines.push(
    `- floor-retention ⊇ floor (no loss vs floor): **${retentionSupersetOfFloor}/${goldById.size}**`
  );
  lines.push('');
  lines.push(`## Aggregate cooking_skills (micro, over the SHIPPED output)`);
  lines.push('');
  lines.push(`| policy | P | R | F1 | tp | fp | fn |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  lines.push(
    `| floor-only | ${f(mFloor.p)} | ${f(mFloor.r)} | ${f(mFloor.f1)} | ${floorOnly.tp} | ${floorOnly.fp} | ${floorOnly.fn} |`
  );
  lines.push(
    `| LLM-as-is | ${f(mLlm.p)} | ${f(mLlm.r)} | ${f(mLlm.f1)} | ${llmAsIs.tp} | ${llmAsIs.fp} | ${llmAsIs.fn} |`
  );
  lines.push(
    `| **floor-retention (SHIPPED)** | **${f(mShip.p)}** | **${f(mShip.r)}** | **${f(mShip.f1)}** | ${shipped.tp} | ${shipped.fp} | ${shipped.fn} |`
  );
  lines.push('');
  lines.push(
    `floor-retention − floor-only F1 delta: **${(mShip.f1 - mFloor.f1 >= 0 ? '+' : '') + f(mShip.f1 - mFloor.f1)}**`
  );
  lines.push('');
  lines.push(`## Sentinels (precision over the SHIPPED output)`);
  lines.push('');
  lines.push(`| sentinel | P | R | tp | fp | fn | gold-support |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  for (const s of sentinels) {
    const a = perValue.get(s) ?? { tp: 0, fp: 0, fn: 0 };
    const m = metrics(a);
    const support = a.tp + a.fn;
    lines.push(
      `| ${s} | ${a.tp + a.fp === 0 ? 'n/a' : f(m.p)} | ${support === 0 ? 'n/a' : f(m.r)} | ${a.tp} | ${a.fp} | ${a.fn} | ${support} |`
    );
  }
  lines.push('');
  lines.push(`## Per-value cooking_skills (SHIPPED), support-sorted`);
  lines.push('');
  lines.push(`| value | P | R | tp | fp | fn |`);
  lines.push(`|---|---|---|---|---|---|`);
  const rows = [...perValue.entries()].sort((a, b) => b[1].tp + b[1].fn - (a[1].tp + a[1].fn));
  for (const [v, a] of rows) {
    const m = metrics(a);
    lines.push(
      `| ${v} | ${a.tp + a.fp === 0 ? 'n/a' : f(m.p)} | ${a.tp + a.fn === 0 ? 'n/a' : f(m.r)} | ${a.tp} | ${a.fp} | ${a.fn} |`
    );
  }
  lines.push('');
  lines.push(`## Per-lesson diffs (SHIPPED vs gold) — only lessons with a delta`);
  lines.push('');
  for (const l of perLesson) {
    if (!l.fp.length && !l.fn.length) continue;
    lines.push(
      `- \`${l.id.slice(0, 12)}\` ship=[${l.ship.join(', ')}] gold=[${l.gold.join(', ')}]` +
        (l.fp.length ? ` **+FP:** ${l.fp.join(', ')}` : '') +
        (l.fn.length ? ` **−FN:** ${l.fn.join(', ')}` : '')
    );
  }

  const out = lines.join('\n') + '\n';
  process.stdout.write(out);
  if (args.md) {
    writeFileSync(args.md, out);
    process.stderr.write(`\nWROTE ${args.md}\n`);
  }
}

main();
