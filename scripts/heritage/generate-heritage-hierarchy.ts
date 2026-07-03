/**
 * Heritage hierarchy generator (PR C1.1).
 *
 * Reads the single source of truth
 * (`data/vocab/cultural-heritage.vocab.json`) and deterministically emits three
 * committed, reviewable artifacts (no build-time magic):
 *
 *   A. `src/utils/heritageHierarchy.generated.ts`
 *      Three exports:
 *      - `culturalHeritageOptions`: the nested SEARCH-filter options tree of ONLY
 *        the `top` + `sub` tier nodes (`internal` EXCLUDED). 31 options across 6
 *        roots. Consumed by `filterDefinitions.ts` at C1.4. Each option carries a
 *        kebab `value` (= vocab `key`), a Title-Case `label`, and an optional
 *        recursive `children` array nested by vocab `parent`.
 *      - `culturalHeritageReviewOptions` (Brief 4): the FLAT, closed option list
 *        for the REVIEWER metadata control, covering ALL tiers (incl. `internal`)
 *        with Title-Case `value` (= the stored representation) and full-chain
 *        `label`. See `buildHeritageReviewOptions`.
 *      - `CULTURAL_HERITAGE_VALUES` (Brief 4): the closed reviewer value set for
 *        `CulturalHeritageEnum` (src/types/lessonMetadata.zod.ts + edge mirror).
 *
 *   B. `scripts/heritage/artifacts/heritage-hierarchy-seed.sql`
 *      An INERT SQL fragment with INSERT rows for ALL nodes — top + sub +
 *      internal (~71). Internal nodes are excluded from the UI but MUST live in
 *      the table so the recursive `expand_cultural_heritage` walk can match
 *      them. C1.2 folds this fragment into the real migration. C1.1 writes
 *      NOTHING to any database; this `.sql` file is a static artifact only.
 *
 *   C. `src/utils/heritageAncestry.generated.ts` (added C1.6)
 *      A slug↔label normalizer (`aliasToSlug`) + a slug→[self,...ancestors]
 *      map (`ancestorsBySlug`) over ALL ~71 nodes incl. internal. Consumed by
 *      `facetCounts.ts` to make Cultural Heritage badge counts slug-keyed and
 *      expansion-aware (a parent counts distinct lessons across all its
 *      transitive descendants, including internal-tier tradition leaves).
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
const ANCESTRY_TS_PATH = path.join(REPO_ROOT, 'src/utils/heritageAncestry.generated.ts');
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
  alias_map: z.record(z.string(), z.string()),
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
// Output D — flat CLOSED option list for the REVIEWER control (ALL tiers)
// ---------------------------------------------------------------------------

/** Flat option consumed by the REVIEWER Cultural Heritage control (all tiers). */
export interface HeritageReviewOption {
  value: string;
  label: string;
}

/**
 * Build the FLAT, closed option list for the REVIEWER Cultural Heritage control.
 *
 * Unlike Output A (search filter — top+sub tiers only, kebab `value`), this list:
 *   - covers ALL 71 canonical nodes INCLUDING `internal` tiers, so every value a
 *     lesson can currently store (e.g. "Soul Food", "Egyptian", "Southern United
 *     States") stays pickable — nothing gets invalidated when the former free-text
 *     control is closed (40 of the 71 stored PROD values are internal-tier);
 *   - uses the Title-Case `label` as BOTH the `value` and the stored representation,
 *     matching how `lessons.cultural_heritage` actually stores values (Title-Case
 *     labels — verified by the Brief-4 PROD census). A reviewer pick therefore
 *     round-trips byte-identically with the existing corpus, and the SEARCH side
 *     (which normalizes labels↔slugs via `aliasToSlug`) is left untouched;
 *   - carries the full ancestor chain ("Americas → Latin American → Mexican") as
 *     the display `label` so the flat control still reads hierarchically.
 *
 * Order: DFS pre-order over the full tree (each parent immediately followed by its
 * descendants); siblings sort by the same display rule as Output A (frequency DESC,
 * then key ASC).
 */
export function buildHeritageReviewOptions(vocab: HeritageVocab): HeritageReviewOption[] {
  const byKey = new Map(vocab.canonical.map((n) => [n.key, n]));

  const childrenByParent = new Map<string | null, HeritageNode[]>();
  for (const node of vocab.canonical) {
    const bucket = childrenByParent.get(node.parent);
    if (bucket) bucket.push(node);
    else childrenByParent.set(node.parent, [node]);
  }

  const chainLabel = (node: HeritageNode): string => {
    const parts: string[] = [];
    let cur: HeritageNode | undefined = node;
    while (cur) {
      parts.unshift(cur.label);
      cur = cur.parent === null ? undefined : byKey.get(cur.parent);
    }
    return parts.join(' → ');
  };

  const out: HeritageReviewOption[] = [];
  const walk = (parentKey: string | null): void => {
    const kids = (childrenByParent.get(parentKey) ?? []).slice().sort(compareNodes);
    for (const node of kids) {
      out.push({ value: node.label, label: chainLabel(node) });
      walk(node.key);
    }
  };
  walk(null);
  return out;
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
  const reviewOptions = buildHeritageReviewOptions(vocab);
  const reviewOptionLines = reviewOptions
    .map((o) => `  { value: ${JSON.stringify(o.value)}, label: ${JSON.stringify(o.label)} },`)
    .join('\n');
  const reviewValueLines = reviewOptions.map((o) => `  ${JSON.stringify(o.value)},`).join('\n');
  const source = `${GENERATED_HEADER}
/**
 * Recursive nested option for the Cultural Heritage SEARCH filter. \`value\` is the
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

/**
 * Flat option for the REVIEWER Cultural Heritage control. \`value\` is the Title-Case
 * label (the stored representation — a reviewer pick round-trips byte-identically
 * with \`lessons.cultural_heritage\`); \`label\` shows the full ancestor chain so the
 * flat control still reads hierarchically. Covers ALL 71 tiers incl. \`internal\`, so
 * closing the former free-text box invalidates nothing. See buildHeritageReviewOptions.
 */
export interface HeritageReviewOption {
  value: string;
  label: string;
}

export const culturalHeritageReviewOptions: HeritageReviewOption[] = [
${reviewOptionLines}
];

/**
 * The CLOSED set of Cultural Heritage values a reviewer may save — the \`value\`s of
 * culturalHeritageReviewOptions, same order. Consumed by \`CulturalHeritageEnum\` in
 * src/types/lessonMetadata.zod.ts (and hand-mirrored in the edge module
 * supabase/functions/_shared/metadataSchemas.ts; the equivalence test guards drift).
 * There is NO reviewer free-text path: to add a value, add it to
 * data/vocab/cultural-heritage.vocab.json and regenerate (ask the maintainer).
 */
export const CULTURAL_HERITAGE_VALUES = [
${reviewValueLines}
] as const;
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
// Output C — ancestry / alias maps (FULL tree incl. internal) — C1.6
//
// Consumed by the client facet-count tally (`src/utils/facetCounts.ts`) to make
// heritage badge counts slug-keyed AND expansion-aware. Unlike Output A (UI
// options, top+sub only) these maps cover ALL 71 nodes INCLUDING `internal`
// tiers, because a lesson can store an internal-tier label (e.g. "Soul Food")
// whose count must roll up to its hidden ancestors (african-american,
// indigenous-and-diaspora).
// ---------------------------------------------------------------------------

/**
 * Label/slug → canonical-slug normalizer, sourced verbatim from the vocab
 * `alias_map` (which maps both Title-Case labels and slugs → canonical slug),
 * then augmented so EVERY canonical slug maps to itself (slug-form storage
 * passes through even if the alias_map omits that slug as a key).
 */
export function buildAliasToSlug(vocab: HeritageVocab): Record<string, string> {
  const out: Record<string, string> = { ...vocab.alias_map };
  for (const node of vocab.canonical) {
    out[node.key] = node.key;
  }
  return out;
}

/**
 * Slug → [self, ...ancestors] over the FULL hierarchy (incl. internal). The
 * list begins with the node itself and walks UP the `parent` chain to the root.
 * Throws on a dangling parent (the vocab is self-consistent; this is a guard).
 */
export function buildAncestorsBySlug(vocab: HeritageVocab): Record<string, string[]> {
  const byKey = new Map(vocab.canonical.map((n) => [n.key, n]));
  const out: Record<string, string[]> = {};
  for (const node of vocab.canonical) {
    const chain: string[] = [];
    let cur: HeritageNode | undefined = node;
    while (cur) {
      chain.push(cur.key);
      if (cur.parent === null) break;
      const parent = byKey.get(cur.parent);
      if (!parent) {
        throw new Error(`Dangling parent "${cur.parent}" referenced by "${cur.key}"`);
      }
      cur = parent;
    }
    out[node.key] = chain;
  }
  return out;
}

const ANCESTRY_HEADER = `// AUTO-GENERATED by scripts/heritage/generate-heritage-hierarchy.ts — do not edit by hand
// Source of truth: data/vocab/cultural-heritage.vocab.json
// Slug↔label normalizer + slug→[self,...ancestors] maps over the FULL 71-node
// hierarchy (incl. internal tiers). Used by facetCounts.ts for slug-keyed,
// expansion-aware Cultural Heritage badge counts.
// Regenerate: npx tsx scripts/heritage/generate-heritage-hierarchy.ts
`;

/** Stable-key JSON for a Record so committed output is deterministic. */
function renderRecord(record: Record<string, unknown>): string {
  const keys = Object.keys(record).sort();
  const entries = keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(record[k])},`);
  return `{\n${entries.join('\n')}\n}`;
}

/**
 * Render the committed ancestry/alias TS artifact, run through the project
 * Prettier config so the committed file is canonical and the drift guard stays
 * byte-stable. Async because Prettier 3's format API is Promise-based.
 */
export async function renderAncestryTs(vocab: HeritageVocab): Promise<string> {
  const aliasToSlug = buildAliasToSlug(vocab);
  const ancestorsBySlug = buildAncestorsBySlug(vocab);
  const source = `${ANCESTRY_HEADER}
/**
 * Normalize a stored heritage value (Title-Case label OR slug) to its canonical
 * kebab slug. Built from the vocab \`alias_map\`, plus an identity entry for
 * every canonical slug. Unknown values are absent (callers fall back to the
 * verbatim value).
 */
export const aliasToSlug: Record<string, string> = ${renderRecord(aliasToSlug)};

/**
 * Each canonical slug → \`[self, ...ancestors]\` (the node itself first, then up
 * the parent chain to its root). Covers all tiers incl. \`internal\`.
 */
export const ancestorsBySlug: Record<string, string[]> = ${renderRecord(ancestorsBySlug)};
`;
  const config = (await prettier.resolveConfig(ANCESTRY_TS_PATH)) ?? {};
  return prettier.format(source, { ...config, filepath: ANCESTRY_TS_PATH });
}

// ---------------------------------------------------------------------------
// CLI entrypoint — write all artifacts
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const vocab = loadVocab();
  const tsOut = await renderGeneratedTs(vocab);
  const ancestryOut = await renderAncestryTs(vocab);
  const sqlOut = renderSeedSql(vocab);
  writeFileSync(GENERATED_TS_PATH, tsOut);
  writeFileSync(ANCESTRY_TS_PATH, ancestryOut);
  writeFileSync(SEED_SQL_PATH, sqlOut);
  const optionCount = buildHeritageOptions(vocab).length;

  console.error(
    `Wrote ${GENERATED_TS_PATH} (${optionCount} roots), ${ANCESTRY_TS_PATH} (${vocab.canonical.length} nodes) and ${SEED_SQL_PATH} (${vocab.canonical.length} rows)`
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
