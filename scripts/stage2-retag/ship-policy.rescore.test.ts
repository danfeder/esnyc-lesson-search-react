/**
 * RE-SCORE GATE (design §3·PIVOT D-P11 / impl P2′.8 deliverable 2).
 *
 * Locks D-P11's numbers into REAL maintained code: runs `materializeC02Ship`
 * (and its exported `cookingFinalForShip` / floor helpers) over the STORED r4
 * pilot run (all 69, reconstructing the 4 finalC02-less records) and asserts the
 * three cooking policies reproduce the Session-14 honest all-69 re-score, plus
 * that the ingredient ship == the floor.
 *
 *   floor-only cooking       F1 ≈ 0.807   (P 0.900 / R 0.732)
 *   LLM-as-is cooking        F1 ≈ 0.836   (P 0.860 / R 0.813)
 *   floor-retention cooking  F1 ≈ 0.872   (P 0.833 / R 0.915)
 *   ingredients ship == floor (per row)
 *
 * This SUPERSEDES the throwaway `c02-cooking-floor-vs-llm.ts` analysis (since
 * removed) with a maintained equivalent. Numbers may shift ≤0.005 if computed
 * through cleaner code (tolerance below); a larger drift FAILS this gate (flag,
 * don't absorb).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { applyC02Floor, floorTagValues, loadC02FloorInput } from './c02-floor';
import { cookingFinalForShip, materializeC02Ship, type C02ShipRecord } from './ship-policy';
import { loadC02Manifest } from './vocab';

const ARTIFACTS = path.join(path.dirname(fileURLToPath(import.meta.url)), 'artifacts');
const RUN = path.join(ARTIFACTS, 'c02-run.opus-4-8.p2prime-r4.jsonl');
const GOLD = path.join(ARTIFACTS, 'c02-answer-key.final.jsonl');
const CORPUS = path.join(ARTIFACTS, 'corpus.jsonl');

const TOLERANCE = 0.005;

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

describe('P2′.8 re-score gate — D-P11 numbers reproduce through materializeC02Ship', () => {
  // This gate recomputes D-P11's numbers through real code from the STORED r4 run
  // + the PROD corpus — both gitignored (they carry lesson bodies) and present
  // only on a local dev checkout. In CI / a fresh clone the artifacts are absent,
  // so register a single skipped placeholder and bail BEFORE any read (the loads
  // below run at collection time, so a per-`it` skipIf cannot guard them). The
  // gate still runs locally as the maintained re-score check.
  if (!existsSync(RUN) || !existsSync(CORPUS)) {
    it.skip('requires local-only artifacts (corpus.jsonl + stored r4 run) — skipped in CI', () => {});
    return;
  }
  const floorInput = loadC02FloorInput();
  const cookingValues = new Set(loadC02Manifest().cookingSkills);

  const goldById = new Map<string, { cooking: string[]; ingredients: string[] }>();
  for (const r of readJsonl(GOLD)) {
    goldById.set(r.id, {
      cooking: (r.cooking_skills as string[]) ?? [],
      ingredients: (r.main_ingredients as string[]) ?? [],
    });
  }
  const corpusById = new Map<string, JsonlRow>();
  for (const r of readJsonl(CORPUS)) corpusById.set(r.id, r);
  const runById = new Map<string, C02ShipRecord>();
  for (const r of readJsonl(RUN)) runById.set(r.id, r as unknown as C02ShipRecord);

  const floorOnly: Agg = { tp: 0, fp: 0, fn: 0 };
  const llmAsIs: Agg = { tp: 0, fp: 0, fn: 0 };
  const floorRetention: Agg = { tp: 0, fp: 0, fn: 0 };
  let ingredientShipMatchesFloor = 0;
  let reconstructedCount = 0;

  for (const [id, gold] of goldById) {
    const existing = {
      cooking_skills: (corpusById.get(id)?.cooking_skills as string[]) ?? [],
      main_ingredients: (corpusById.get(id)?.main_ingredients as string[]) ?? [],
    };
    const record = runById.get(id) ?? {};
    if (!record.finalC02) reconstructedCount++;

    const floored = applyC02Floor(existing, floorInput);
    const flooredCooking = floorTagValues(floored.cooking);
    const flooredIngredients = floorTagValues(floored.ingredients);

    const ship = materializeC02Ship(record, existing, floorInput, cookingValues);
    const llmCooking = cookingFinalForShip(record, cookingValues);

    const goldCooking = new Set(gold.cooking);
    tally(floorOnly, flooredCooking, goldCooking);
    tally(llmAsIs, llmCooking, goldCooking);
    tally(floorRetention, ship.cooking_skills, goldCooking);

    // ingredients ship == floor (the floor-only ingredient policy)
    if (
      ship.main_ingredients.length === flooredIngredients.length &&
      ship.main_ingredients.every((v, i) => v === flooredIngredients[i])
    ) {
      ingredientShipMatchesFloor++;
    }
  }

  it('reconstructs cooking for the 4 finalC02-less records', () => {
    expect(reconstructedCount).toBe(4);
  });

  it('floor-only cooking F1 ≈ 0.807 (P 0.900 / R 0.732)', () => {
    const m = metrics(floorOnly);
    expect(m.f1).toBeCloseTo(0.807, 2);
    expect(Math.abs(m.f1 - 0.807)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(m.p - 0.9)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(m.r - 0.732)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('LLM-as-is cooking F1 ≈ 0.836 (P 0.860 / R 0.813)', () => {
    const m = metrics(llmAsIs);
    expect(Math.abs(m.f1 - 0.836)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(m.p - 0.86)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(m.r - 0.813)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('floor-retention cooking F1 ≈ 0.872 (P 0.833 / R 0.915) — the SHIPPED policy', () => {
    const m = metrics(floorRetention);
    expect(Math.abs(m.f1 - 0.872)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(m.p - 0.833)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(m.r - 0.915)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('floor-retention BEATS floor-only by ≈ +0.065 F1', () => {
    const delta = metrics(floorRetention).f1 - metrics(floorOnly).f1;
    expect(Math.abs(delta - 0.065)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('ingredients ship == floor for every one of the 69 rows', () => {
    expect(ingredientShipMatchesFloor).toBe(goldById.size);
    expect(goldById.size).toBe(69);
  });
});
