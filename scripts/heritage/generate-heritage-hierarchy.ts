/**
 * Heritage hierarchy generator (PR C1.1).
 *
 * Reads the single source of truth
 * (`data/vocab/cultural-heritage.vocab.json`) and deterministically emits two
 * committed, reviewable artifacts (no build-time magic):
 *
 *   A. `src/utils/heritageHierarchy.generated.ts`
 *      The nested UI options tree of ONLY the `top` + `sub` tier nodes
 *      (`internal` EXCLUDED). 31 options across 6 roots. Consumed by
 *      `filterDefinitions.ts` at C1.4. Each option carries a kebab `value`
 *      (= vocab `key`), a Title-Case `label`, and an optional recursive
 *      `children` array nested by vocab `parent`.
 *
 *   B. `scripts/heritage/artifacts/heritage-hierarchy-seed.sql`
 *      An INERT SQL fragment with INSERT rows for ALL nodes — top + sub +
 *      internal (~71). Internal nodes are excluded from the UI but MUST live in
 *      the table so the recursive `expand_cultural_heritage` walk can match
 *      them. C1.2 folds this fragment into the real migration. C1.1 writes
 *      NOTHING to any database; this `.sql` file is a static artifact only.
 *
 * Ordering rules (explicit, deterministic — both produce byte-identical output
 * across runs, which the drift guard test asserts):
 *   - Output A (UI options): siblings sort by vocab `frequency` DESCENDING, then
 *     `key` ASCENDING as a stable tie-break. A DISPLAY ordering.
 *   - Output B (SQL seed): rows sort by `depth` ASCENDING (roots first → every
 *     parent precedes its children = topological order), then `frequency` DESC,
 *     then `key` ASC within each depth band. A SEED-SAFE ordering. The two
 *     orderings INTENTIONALLY differ (display vs. parents-before-children seed);
 *     see the comments on `compareNodes` / `makeCompareSeedNodes` below.
 *
 * Run directly to (re)write both artifacts:
 *   npx tsx scripts/heritage/generate-heritage-hierarchy.ts
 *
 * HARD RULE: this script reads only the vocab JSON and writes only the two
 * artifact files. It performs no DB I/O, no network calls, and no lesson-data
 * writes.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { z } from 'zod';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, '../..');

const VOCAB_PATH = path.join(REPO_ROOT, 'data/vocab/cultural-heritage.vocab.json');
const GENERATED_TS_PATH = path.join(REPO_ROOT, 'src/utils/heritageHierarchy.generated.ts');
const SEED_SQL_PATH = path.join(
  REPO_ROOT,
  'scripts/heritage/artifacts/heritage-hierarchy-seed.sql'
);

// ---------------------------------------------------------------------------
// Vocab shape (validated subset — we only consume the fields C1.1 needs)
// ---------------------------------------------------------------------------

const heritageNodeSchema = z.object({
  key: z.string(),
  label: z.string(),
  parent: z.string().nullable(),
  filter_ui_tier: z.enum(['top', 'sub', 'internal']),
  frequency: z.number(),
});

const heritageVocabSchema = z.object({
  canonical: z.array(heritageNodeSchema),
});

export type HeritageNode = z.infer<typeof heritageNodeSchema>;
export type HeritageVocab = z.infer<typeof heritageVocabSchema>;

/** Recursive nested option consumed by the UI (filterDefinitions.ts at C1.4). */
export interface HeritageOption {
  value: string;
  label: string;
  children?: HeritageOption[];
}

// ---------------------------------------------------------------------------
// Load + validate
// ---------------------------------------------------------------------------

export function loadVocab(): HeritageVocab {
  const raw = JSON.parse(readFileSync(VOCAB_PATH, 'utf8')) as unknown;
  return heritageVocabSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// Ordering rules.
//
// The two artifacts INTENTIONALLY use different orderings, for different needs:
//
//   - Output A (UI options tree): siblings sort by `frequency` DESC, then `key`
//     ASC. This is a DISPLAY ordering — most-common groups appear first within
//     each level of the nested tree. Nesting (parent → children) is structural,
//     so a per-sibling-group sort is all that's needed. Uses `compareNodes`.
//
//   - Output B (flat SQL seed): rows sort by `depth` ASC, then `frequency` DESC,
//     then `key` ASC. This is a SEED-SAFE ordering — depth-ascending guarantees
//     every parent row precedes its children (topological order), which is the
//     robust, self-documenting way to emit a self-referential FK seed (works
//     even if the INSERT is ever split into multiple statements). Uses
//     `compareSeedNodes`. Within a depth band the ordering matches Output A's
//     display intent (frequency DESC, key ASC).
// ---------------------------------------------------------------------------

/** Display ordering for the UI options tree (per sibling group). */
function compareNodes(a: HeritageNode, b: HeritageNode): number {
  if (b.frequency !== a.frequency) return b.frequency - a.frequency;
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/**
 * Depth of a node = number of `parent` hops to a root. Roots (parent === null)
 * are depth 0. Computed by walking the parent chain over the full vocab.
 * Throws if a parent reference is dangling (the vocab is self-consistent, so
 * this is a guard, not an expected path).
 */
function computeDepths(vocab: HeritageVocab): Map<string, number> {
  const byKey = new Map(vocab.canonical.map((n) => [n.key, n]));
  const depthByKey = new Map<string, number>();
  const depthOf = (node: HeritageNode): number => {
    const cached = depthByKey.get(node.key);
    if (cached !== undefined) return cached;
    let d = 0;
    let cur: HeritageNode = node;
    while (cur.parent !== null) {
      const parent = byKey.get(cur.parent);
      if (!parent) {
        throw new Error(`Dangling parent "${cur.parent}" referenced by "${cur.key}"`);
      }
      cur = parent;
      d++;
    }
    depthByKey.set(node.key, d);
    return d;
  };
  for (const node of vocab.canonical) depthOf(node);
  return depthByKey;
}

/**
 * Seed-safe (topological) ordering for the flat SQL fragment: depth ASC (so
 * parents always precede children), then the display tie-break (frequency DESC,
 * then key ASC). Curried over the precomputed depth map.
 */
function makeCompareSeedNodes(
  depthByKey: Map<string, number>
): (a: HeritageNode, b: HeritageNode) => number {
  return (a, b) => {
    const da = depthByKey.get(a.key) ?? 0;
    const db = depthByKey.get(b.key) ?? 0;
    if (da !== db) return da - db;
    return compareNodes(a, b);
  };
}

// ---------------------------------------------------------------------------
// Output A — nested UI options (top + sub tiers only)
// ---------------------------------------------------------------------------

/**
 * Build the nested options tree of ONLY the top+sub tier nodes, nested by
 * `parent` and ordered by the ordering rule at every level. `internal` nodes
 * are excluded entirely.
 */
export function buildHeritageOptions(vocab: HeritageVocab): HeritageOption[] {
  const uiNodes = vocab.canonical.filter(
    (n) => n.filter_ui_tier === 'top' || n.filter_ui_tier === 'sub'
  );
  const uiKeys = new Set(uiNodes.map((n) => n.key));

  // Children grouped by their (UI-visible) parent. A top/sub node's parent is
  // guaranteed to also be top/sub or null (verified against the vocab), so the
  // top/sub subtree is self-contained.
  const childrenByParent = new Map<string | null, HeritageNode[]>();
  for (const node of uiNodes) {
    // If a parent is not itself a UI node, treat the node as a root of the UI
    // tree (defensive — does not occur in the current vocab).
    const parentKey = node.parent !== null && uiKeys.has(node.parent) ? node.parent : null;
    const bucket = childrenByParent.get(parentKey);
    if (bucket) bucket.push(node);
    else childrenByParent.set(parentKey, [node]);
  }

  const build = (parentKey: string | null): HeritageOption[] => {
    const kids = (childrenByParent.get(parentKey) ?? []).slice().sort(compareNodes);
    return kids.map((node) => {
      const children = build(node.key);
      const option: HeritageOption = { value: node.key, label: node.label };
      if (children.length > 0) option.children = children;
      return option;
    });
  };

  return build(null);
}

// ---------------------------------------------------------------------------
// Output A rendering — committed TS artifact
// ---------------------------------------------------------------------------

const GENERATED_HEADER = `// AUTO-GENERATED by scripts/heritage/generate-heritage-hierarchy.ts — do not edit by hand
// Source of truth: data/vocab/cultural-heritage.vocab.json
// Ordering: vocab frequency DESC, then key ASC (siblings, at every level)
// Regenerate: npx tsx scripts/heritage/generate-heritage-hierarchy.ts
`;

/** Render one option (and its subtree) as TS source at the given indent depth. */
function renderOption(option: HeritageOption, depth: number): string {
  const pad = '  '.repeat(depth);
  const inner = '  '.repeat(depth + 1);
  const lines: string[] = [];
  lines.push(`${pad}{`);
  lines.push(`${inner}value: ${JSON.stringify(option.value)},`);
  lines.push(`${inner}label: ${JSON.stringify(option.label)},`);
  if (option.children && option.children.length > 0) {
    lines.push(`${inner}children: [`);
    for (const child of option.children) {
      lines.push(renderOption(child, depth + 2));
    }
    lines.push(`${inner}],`);
  }
  lines.push(`${pad}},`);
  return lines.join('\n');
}

/**
 * Render the committed TS artifact. The body is built then run through the
 * project Prettier config so the committed file is canonical and lint-clean;
 * the drift guard re-runs this exact pipeline, so output stays byte-identical.
 * Async because Prettier 3's format API is Promise-based.
 */
export async function renderGeneratedTs(vocab: HeritageVocab): Promise<string> {
  const options = buildHeritageOptions(vocab);
  const optionLines = options.map((o) => renderOption(o, 1)).join('\n');
  const source = `${GENERATED_HEADER}
/**
 * Recursive nested option for the Cultural Heritage filter. \`value\` is the
 * kebab vocab slug sent by the UI; \`label\` is the Title-Case display string;
 * \`children\` recurses for nested groups. Only the \`top\` + \`sub\` vocab tiers
 * appear here — \`internal\` nodes are hidden in the UI but still match via the
 * recursive DB expansion.
 */
export interface HeritageOption {
  value: string;
  label: string;
  children?: HeritageOption[];
}

export const culturalHeritageOptions: HeritageOption[] = [
${optionLines}
];
`;
  const config = (await prettier.resolveConfig(GENERATED_TS_PATH)) ?? {};
  return prettier.format(source, { ...config, filepath: GENERATED_TS_PATH });
}

// ---------------------------------------------------------------------------
// Output B rendering — inert SQL seed fragment (ALL nodes)
// ---------------------------------------------------------------------------

const SEED_HEADER = `-- AUTO-GENERATED by scripts/heritage/generate-heritage-hierarchy.ts — do not edit by hand
-- Source of truth: data/vocab/cultural-heritage.vocab.json
-- Inert seed fragment for cultural_heritage_hierarchy (key, label, parent_key).
-- ALL tiers (top + sub + internal) are present: internal nodes are hidden in
-- the UI but MUST live in the table so the recursive expand_cultural_heritage
-- walk can match them. This file is folded into the C1.2 migration; C1.1
-- itself performs NO database writes.
-- Ordering: TOPOLOGICAL — depth ASC (roots first, so every parent row precedes
-- its children), then vocab frequency DESC, then key ASC within each depth band.
-- A single multi-row INSERT satisfies the self-referential FK at statement-end
-- regardless of row order; parents-before-children is used for readability and
-- robustness (safe even if the INSERT is ever split). This is INTENTIONALLY a
-- different ordering than the UI options artifact, which is frequency-DESC for
-- display.
`;

/** SQL string literal: single-quote escaping per the SQL standard ('' for '). */
function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function renderSeedSql(vocab: HeritageVocab): string {
  const depthByKey = computeDepths(vocab);
  const rows = vocab.canonical.slice().sort(makeCompareSeedNodes(depthByKey));
  const values = rows
    .map((n) => {
      const parent = n.parent === null ? 'NULL' : sqlString(n.parent);
      return `  (${sqlString(n.key)}, ${sqlString(n.label)}, ${parent})`;
    })
    .join(',\n');
  return `${SEED_HEADER}
INSERT INTO cultural_heritage_hierarchy (key, label, parent_key) VALUES
${values};
`;
}

// ---------------------------------------------------------------------------
// CLI entrypoint — write both artifacts
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const vocab = loadVocab();
  const tsOut = await renderGeneratedTs(vocab);
  const sqlOut = renderSeedSql(vocab);
  writeFileSync(GENERATED_TS_PATH, tsOut);
  writeFileSync(SEED_SQL_PATH, sqlOut);
  const optionCount = buildHeritageOptions(vocab).length;

  console.error(
    `Wrote ${GENERATED_TS_PATH} (${optionCount} roots) and ${SEED_SQL_PATH} (${vocab.canonical.length} rows)`
  );
}

// Run only when executed directly (not when imported by the test).
const INVOKED_PATH = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (INVOKED_PATH === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
