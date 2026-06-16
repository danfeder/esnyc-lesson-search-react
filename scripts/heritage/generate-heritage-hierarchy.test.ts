/**
 * Tests for the heritage hierarchy generator (PR C1.1, TDD).
 *
 * The generator reads the single source of truth
 * (`data/vocab/cultural-heritage.vocab.json`) and deterministically emits two
 * committed artifacts:
 *
 *   A. `src/utils/heritageHierarchy.generated.ts` — the nested UI options tree
 *      of ONLY the `top` + `sub` tier nodes (`internal` excluded), consumed by
 *      `filterDefinitions.ts` at C1.4.
 *   B. `scripts/heritage/artifacts/heritage-hierarchy-seed.sql` — an inert SQL
 *      fragment with INSERT rows for ALL ~71 nodes (top + sub + internal),
 *      folded into the C1.2 migration. C1.1 writes NOTHING to any DB.
 *
 * Ordering rule (explicit, deterministic, applied everywhere): siblings sort by
 * vocab `frequency` DESC, then `key` ASC as a tie-break. Roots are siblings of
 * each other under that same rule.
 *
 * The drift guard re-runs the generator and asserts the produced strings are
 * byte-identical to the committed artifacts. This is the anti-drift contract.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  buildHeritageOptions,
  buildAliasToSlug,
  buildAncestorsBySlug,
  renderGeneratedTs,
  renderAncestryTs,
  renderSeedSql,
  loadVocab,
  type HeritageOption,
  type HeritageVocab,
} from './generate-heritage-hierarchy';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const GENERATED_TS_PATH = path.join(REPO_ROOT, 'src/utils/heritageHierarchy.generated.ts');
const ANCESTRY_TS_PATH = path.join(REPO_ROOT, 'src/utils/heritageAncestry.generated.ts');
const SEED_SQL_PATH = path.join(
  REPO_ROOT,
  'scripts/heritage/artifacts/heritage-hierarchy-seed.sql'
);

const vocab: HeritageVocab = loadVocab();
const options: HeritageOption[] = buildHeritageOptions(vocab);

/** Recursively flatten every node value in the options tree. */
function flattenValues(opts: HeritageOption[]): string[] {
  const out: string[] = [];
  for (const o of opts) {
    out.push(o.value);
    if (o.children) out.push(...flattenValues(o.children));
  }
  return out;
}

/** Find an option by value anywhere in the tree. */
function findOption(opts: HeritageOption[], value: string): HeritageOption | undefined {
  for (const o of opts) {
    if (o.value === value) return o;
    if (o.children) {
      const hit = findOption(o.children, value);
      if (hit) return hit;
    }
  }
  return undefined;
}

describe('heritage hierarchy generator — UI options artifact (Output A)', () => {
  const topSubKeys = new Set(
    vocab.canonical
      .filter((n) => n.filter_ui_tier === 'top' || n.filter_ui_tier === 'sub')
      .map((n) => n.key)
  );
  const internalKeys = new Set(
    vocab.canonical.filter((n) => n.filter_ui_tier === 'internal').map((n) => n.key)
  );
  const allValues = flattenValues(options);

  it('emits exactly the top+sub tier nodes (31 total)', () => {
    expect(topSubKeys.size).toBe(31);
    expect(allValues.length).toBe(31);
    expect(new Set(allValues)).toEqual(topSubKeys);
  });

  it('emits exactly 6 roots, matching the vocab roots', () => {
    const expectedRoots = vocab.canonical.filter((n) => n.parent === null).map((n) => n.key);
    expect(expectedRoots.sort()).toEqual([
      'african',
      'americas',
      'asian',
      'european',
      'indigenous-and-diaspora',
      'middle-eastern',
    ]);
    expect(options.length).toBe(6);
    expect(options.map((o) => o.value).sort()).toEqual(expectedRoots.sort());
  });

  it('EXCLUDES every internal-tier node from the UI artifact', () => {
    expect(internalKeys.size).toBeGreaterThan(0);
    for (const k of internalKeys) {
      expect(allValues).not.toContain(k);
    }
  });

  it('each option carries a kebab value and Title-Case label from the vocab', () => {
    const labelByKey = new Map(vocab.canonical.map((n) => [n.key, n.label]));
    function check(opts: HeritageOption[]) {
      for (const o of opts) {
        expect(o.value).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/); // kebab slug
        expect(o.label).toBe(labelByKey.get(o.value));
        if (o.children) check(o.children);
      }
    }
    check(options);
  });

  it('nests correctly by parent: asian › east-asian, with internal children excluded', () => {
    const asian = findOption(options, 'asian')!;
    expect(asian).toBeDefined();
    const eastAsian = asian.children?.find((c) => c.value === 'east-asian');
    expect(eastAsian).toBeDefined();
    // east-asian sub-children: chinese (sub), japanese (sub), korean (sub) are
    // top/sub and present; taiwanese (internal) is excluded.
    const eaChildValues = (eastAsian!.children ?? []).map((c) => c.value);
    expect(eaChildValues).toContain('chinese');
    expect(eaChildValues).toContain('japanese');
    expect(eaChildValues).toContain('korean');
    expect(eaChildValues).not.toContain('taiwanese'); // internal
  });

  it('places tradition leaves correctly: soul-food is internal under african-american, so EXCLUDED from UI but PRESENT in seed', () => {
    // soul-food is filter_ui_tier=internal under african-american → absent in UI
    expect(allValues).not.toContain('soul-food');
    const aa = findOption(options, 'african-american')!;
    expect(aa).toBeDefined();
    // african-american's only children are internal (soul-food, black-culinary-history)
    // so it appears as a leaf in the UI tree.
    expect(aa.children).toBeUndefined();
  });

  it('orders siblings by frequency DESC then key ASC (roots example)', () => {
    // americas(170) > asian(63) > indigenous-and-diaspora(57) > european(53)
    // > african(41) > middle-eastern(23)
    expect(options.map((o) => o.value)).toEqual([
      'americas',
      'asian',
      'indigenous-and-diaspora',
      'european',
      'african',
      'middle-eastern',
    ]);
  });

  it('orders siblings by frequency DESC then key ASC (key tie-break example)', () => {
    // indigenous-and-diaspora children: african-american(24) and indigenous(24)
    // tie on frequency → key ASC → african-american first.
    const iad = findOption(options, 'indigenous-and-diaspora')!;
    expect((iad.children ?? []).map((c) => c.value)).toEqual(['african-american', 'indigenous']);
  });
});

describe('heritage hierarchy generator — SQL seed fragment (Output B)', () => {
  const sql = renderSeedSql(vocab);

  it('includes an INSERT row for ALL ~71 nodes (top + sub + internal)', () => {
    const total = vocab.canonical.length;
    expect(total).toBe(71);
    // Count the per-row tuples in the VALUES list.
    const rowMatches = sql.match(/^\s*\(/gm) ?? [];
    expect(rowMatches.length).toBe(total);
  });

  it('emits roots with NULL parent_key and children with their parent slug', () => {
    // Spot-check a root and a deep internal leaf.
    expect(sql).toContain("('asian', 'Asian', NULL)");
    expect(sql).toContain("('soul-food', 'Soul Food', 'african-american')"); // internal, present in seed
    expect(sql).toContain("('taiwanese', 'Taiwanese', 'east-asian')"); // internal, present in seed
  });

  it('escapes single quotes in labels (Cajun/Creole has none, but assert no raw breakage)', () => {
    // cajun-creole label is "Cajun/Creole" (slash, no quote) — ensure it appears verbatim.
    expect(sql).toContain("('cajun-creole', 'Cajun/Creole', 'indigenous-and-diaspora')");
  });

  it('emits rows in topological (parents-before-children) order: every parent_key appears in an EARLIER row', () => {
    // Parse the emitted VALUES rows in document order: (key, label, parent_key).
    // The migration folds this fragment in as a SINGLE multi-row INSERT, so FK
    // satisfaction does NOT depend on row order — but emitting parents before
    // children is the robust, self-documenting seed order and lets the test
    // assert a deterministic topological invariant.
    const rowRe = /^\s*\('([^']+)',\s*'(?:[^']|'')*',\s*(NULL|'[^']+')\)/gm;
    const rows: { key: string; parentKey: string | null }[] = [];
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(sql)) !== null) {
      const parentKey = m[2] === 'NULL' ? null : m[2].slice(1, -1);
      rows.push({ key: m[1], parentKey });
    }
    // Sanity: we parsed every node.
    expect(rows.length).toBe(vocab.canonical.length);

    const seenKeys = new Set<string>();
    for (const row of rows) {
      if (row.parentKey !== null) {
        expect(seenKeys.has(row.parentKey)).toBe(true);
      }
      seenKeys.add(row.key);
    }
  });

  it('emits all 6 roots (NULL parent_key) before any non-root row (depth-0 first)', () => {
    const firstNonRootIdx = sql
      .split('\n')
      .filter((line) => /^\s*\('/.test(line))
      .findIndex((line) => !/,\s*NULL\)/.test(line));
    const rootLineCount = sql
      .split('\n')
      .filter((line) => /^\s*\('/.test(line))
      .slice(0, firstNonRootIdx)
      .filter((line) => /,\s*NULL\)/.test(line)).length;
    expect(rootLineCount).toBe(6);
  });
});

describe('heritage hierarchy generator — ancestry artifact (Output C, C1.6)', () => {
  const aliasToSlug = buildAliasToSlug(vocab);
  const ancestorsBySlug = buildAncestorsBySlug(vocab);

  it('aliasToSlug maps Title-Case labels to canonical slugs (label normalizer)', () => {
    expect(aliasToSlug['Mexican']).toBe('mexican');
    expect(aliasToSlug['Soul Food']).toBe('soul-food');
    expect(aliasToSlug['Chinese']).toBe('chinese');
    // alias-only label variants resolve too
    expect(aliasToSlug['Native American']).toBe('indigenous');
    expect(aliasToSlug['African American diaspora']).toBe('african-american');
  });

  it('aliasToSlug is self-mapping for every canonical slug (slug-form input passes through)', () => {
    for (const node of vocab.canonical) {
      expect(aliasToSlug[node.key]).toBe(node.key);
    }
  });

  it('ancestorsBySlug covers ALL 71 nodes incl. internal', () => {
    expect(Object.keys(ancestorsBySlug).length).toBe(vocab.canonical.length);
    expect(vocab.canonical.length).toBe(71);
  });

  it('each ancestry list starts with the node itself, then walks UP to the root', () => {
    // chinese → east-asian → asian (top/sub chain)
    expect(ancestorsBySlug['chinese']).toEqual(['chinese', 'east-asian', 'asian']);
    // mexican → latin-american → americas
    expect(ancestorsBySlug['mexican']).toEqual(['mexican', 'latin-american', 'americas']);
    // soul-food (internal) → african-american → indigenous-and-diaspora
    expect(ancestorsBySlug['soul-food']).toEqual([
      'soul-food',
      'african-american',
      'indigenous-and-diaspora',
    ]);
    // a root maps to just itself
    expect(ancestorsBySlug['asian']).toEqual(['asian']);
  });

  it('regenerated ancestry TS artifact is byte-identical to the committed file', async () => {
    const committed = readFileSync(ANCESTRY_TS_PATH, 'utf8');
    const regenerated = await renderAncestryTs(vocab);
    expect(regenerated).toBe(committed);
  });
});

describe('heritage hierarchy generator — drift guard (anti-drift contract)', () => {
  it('regenerated TS artifact is byte-identical to the committed file', async () => {
    const committed = readFileSync(GENERATED_TS_PATH, 'utf8');
    const regenerated = await renderGeneratedTs(vocab);
    expect(regenerated).toBe(committed);
  });

  it('regenerated SQL seed is byte-identical to the committed file', () => {
    const committed = readFileSync(SEED_SQL_PATH, 'utf8');
    const regenerated = renderSeedSql(vocab);
    expect(regenerated).toBe(committed);
  });
});
