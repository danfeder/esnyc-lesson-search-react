/**
 * C02 gold-key build tooling (P2.2) — scaffold / worksheet / assemble.
 *
 * A small, DB-free, model-free CLI that turns the committed 70-lesson sample
 * manifest (`artifacts/c02-answer-key-manifest.json`, from the P1.5 sampler)
 * into the human-adjudicated gold answer key for the cooking_skills +
 * main_ingredients re-tag pilot (design §6 / impl P2.2). It NEVER calls an LLM
 * or the database — the AI/Codex proposals it reconciles are produced
 * separately and dropped in as `artifacts/c02-proposals.jsonl`.
 *
 * Three subcommands:
 *
 *   scaffold  — join the 70 selected ids against the regenerated corpus
 *               (`artifacts/corpus.jsonl`, 764 lines, with the two fields) and
 *               write `artifacts/c02-answer-key-scaffold.jsonl`: per lesson, the
 *               verbatim CURRENT tags + the deterministic FLOOR ANCHOR (current
 *               folded through the real C02 floor, kept only where the folded
 *               value is a canonical manifest value) + a ~2000-char body
 *               excerpt + hardCaseJudgment (= classifyHardCase !== null). Fails
 *               loudly if any selected id is missing or the corpus is stale
 *               (a record lacking BOTH field keys).
 *
 *   worksheet — render `artifacts/c02-answer-key-worksheet.md`: one section per
 *               lesson (manifest order, numbered N/70) with the read-only
 *               context (title/id/layer/body/current/floor/draft/codex + a
 *               DISAGREE flag) and two pre-filled, strictly-parseable FINAL
 *               lines a human edits. Optionally reconciles an existing
 *               `artifacts/c02-proposals.jsonl` (draft/codex per id).
 *
 *   assemble  — parse the (human-edited) worksheet's FINAL lines and emit
 *               `artifacts/c02-answer-key.final.jsonl` (70 rows of
 *               {id, cooking_skills, main_ingredients}). Validates every value
 *               against the canonical manifest (case-insensitive via matchKey,
 *               rewritten to canonical casing), enforces the specific->group
 *               parent invariant, de-dupes, and requires exactly the manifest's
 *               sections. Exits 1 with a precise per-row message on any failure.
 *
 * REUSES, never re-implements: loadC02Floor / matchKey / C02Floor (normalize),
 * c02MainIngredientsValues / c02IngredientParentMap / loadC02Manifest (vocab),
 * classifyHardCase / buildC02SamplerContext / loadCorpus / corpusRecordSchema
 * (sample-answer-key).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { loadC02Floor, matchKey, type C02Floor } from './normalize';
import {
  buildC02SamplerContext,
  classifyHardCase,
  loadCorpus,
  type C02SamplerContext,
  type CorpusRecordForSampling,
  type HardCaseClass,
} from './sample-answer-key';
import {
  c02IngredientParentMap,
  c02MainIngredientsValues,
  loadC02Manifest,
  type C02Manifest,
} from './vocab';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ARTIFACTS_DIR = path.join(MODULE_DIR, 'artifacts');

const MANIFEST_FILENAME = 'c02-answer-key-manifest.json';
const CORPUS_FILENAME = 'corpus.jsonl';
const SCAFFOLD_FILENAME = 'c02-answer-key-scaffold.jsonl';
const PROPOSALS_FILENAME = 'c02-proposals.jsonl';
const WORKSHEET_FILENAME = 'c02-answer-key-worksheet.md';
const FINAL_FILENAME = 'c02-answer-key.final.jsonl';

/** Body excerpt cap — enough for a human/LLM to derive tags (design P2.2). */
export const BODY_EXCERPT_CHARS = 2000;

/** Field separator inside a FINAL line (a `;`-delimited value list). */
const FINAL_SEP = ';';

// ---------------------------------------------------------------------------
// Manifest selection shape (the committed P1.5 manifest's `selected[]`)
// ---------------------------------------------------------------------------

export interface ManifestSelection {
  id: string;
  title: string;
  layer: 'hard-case' | 'coverage' | 'clean-core';
  hardCaseClass: HardCaseClass | null;
}

const manifestSelectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  layer: z.enum(['hard-case', 'coverage', 'clean-core']),
  hardCaseClass: z.enum(['vague-cooking', 'herbs-aromatics', 'orphan-food']).nullable(),
});

const manifestFileSchema = z
  .object({
    selected: z.array(manifestSelectionSchema).min(1),
  })
  .passthrough();

/** Load + Zod-validate the committed answer-key manifest's `selected[]`. */
export function loadManifestSelections(filePath: string): ManifestSelection[] {
  const parsed = manifestFileSchema.parse(JSON.parse(readFileSync(filePath, 'utf8')));
  const seen = new Set<string>();
  for (const s of parsed.selected) {
    if (seen.has(s.id)) throw new Error(`c02 manifest has a duplicate selected id: ${s.id}`);
    seen.add(s.id);
  }
  return parsed.selected;
}

// ---------------------------------------------------------------------------
// Field-pair shape used throughout (current / floorAnchor / proposals / final)
// ---------------------------------------------------------------------------

export interface FieldPair {
  cooking_skills: string[];
  main_ingredients: string[];
}

const fieldPairSchema = z.object({
  cooking_skills: z.array(z.string()),
  main_ingredients: z.array(z.string()),
});

// ---------------------------------------------------------------------------
// floorAnchor — the deterministic clean-core prediction
// ---------------------------------------------------------------------------

/**
 * Fold a tag list through one field's match-lookup and KEEP only the values
 * that land on a canonical manifest value, in canonical casing, de-duped
 * (first-occurrence order). A non-canonical leftover (no alias, not a canonical)
 * is DROPPED — the anchor is the floor's clean, valid, canonical contribution.
 */
function foldAndKeepCanonical(
  tags: readonly string[],
  folds: Map<string, string>,
  canonical: ReadonlySet<string>
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const folded = folds.get(matchKey(tag));
    if (folded === undefined || !canonical.has(folded)) continue;
    if (seen.has(folded)) continue;
    seen.add(folded);
    out.push(folded);
  }
  return out;
}

/**
 * Append each present specific's required parent group if absent (the floor's R9
 * `ingredientParentReconcile`, applied here via the SAME `floor.parentMap` the
 * normalize rule + sampler `predictMembership` use — never re-derived). Null-
 * parent specifics (absent from the map) and bare groups are no-ops. Keeps
 * first-occurrence order; appends parents at the end.
 */
function appendParents(
  ingredients: readonly string[],
  parentMap: Record<string, string>
): string[] {
  const out = [...ingredients];
  const present = new Set(ingredients);
  for (const value of ingredients) {
    const parent = parentMap[value];
    if (parent !== undefined && !present.has(parent)) {
      present.add(parent);
      out.push(parent);
    }
  }
  return out;
}

/**
 * The deterministic floor anchor for a record's CURRENT tags: each field folded
 * through the real C02 floor, kept only where the result is a canonical manifest
 * value, then (for main_ingredients) parent-reconciled so a present specific
 * always carries its group (R9). This is exactly what the floor alone produces
 * on the clean core — fold (R7/R8) + parent-reconcile (R9) — so the anchor is
 * internally consistent and passes the same specific->group invariant `assemble`
 * enforces. Specifics that must be ADDED by reading do not appear here (that is
 * the judgment work the gold key supplies).
 */
export function floorAnchor(
  current: FieldPair,
  floor: C02Floor,
  cookingValues: ReadonlySet<string>,
  ingredientValues: ReadonlySet<string>
): FieldPair {
  return {
    cooking_skills: foldAndKeepCanonical(current.cooking_skills, floor.cookingFolds, cookingValues),
    main_ingredients: appendParents(
      foldAndKeepCanonical(current.main_ingredients, floor.ingredientFolds, ingredientValues),
      floor.parentMap
    ),
  };
}

// ---------------------------------------------------------------------------
// scaffold
// ---------------------------------------------------------------------------

export interface C02ScaffoldRecord {
  id: string;
  title: string;
  layer: ManifestSelection['layer'];
  hardCaseClass: HardCaseClass | null;
  hardCaseJudgment: boolean;
  current: FieldPair;
  floorAnchor: FieldPair;
  bodyExcerpt: string;
}

/**
 * Detect the stale pre-2026-06-12 corpus: a record that carries NEITHER
 * cooking_skills NOR main_ingredients as a key (the export predating the C02
 * fields). `.optional()` on the schema makes a stale row parse fine, so guard
 * explicitly. A row with the key present but an empty/null array is NOT stale.
 */
function assertRecordHasC02Fields(rec: CorpusRecordForSampling): void {
  const r = rec as Record<string, unknown>;
  const hasCooking = 'cooking_skills' in r;
  const hasIngredients = 'main_ingredients' in r;
  if (!hasCooking && !hasIngredients) {
    throw new Error(
      `corpus record ${rec.id} carries neither a cooking_skills nor a main_ingredients ` +
        `key — the corpus is STALE (predates the C02 export). Regenerate ` +
        `artifacts/${CORPUS_FILENAME} with the two fields (the P2.1 corpus regeneration).`
    );
  }
}

/** Verbatim current tags (treats absent/null as empty). */
function currentOf(rec: CorpusRecordForSampling): FieldPair {
  return {
    cooking_skills: rec.cooking_skills ?? [],
    main_ingredients: rec.main_ingredients ?? [],
  };
}

/**
 * Build the scaffold rows: one per manifest selection, IN MANIFEST ORDER, each
 * joined to its corpus record by id. Throws if a selected id is missing from the
 * corpus or if the joined record is stale.
 */
export function buildScaffold(
  selections: ManifestSelection[],
  corpus: CorpusRecordForSampling[],
  manifest: C02Manifest,
  floor: C02Floor,
  ctx: C02SamplerContext
): C02ScaffoldRecord[] {
  const byId = new Map(corpus.map((r) => [r.id, r]));
  const cookingValues = new Set(manifest.cookingSkills);
  const ingredientValues = new Set(c02MainIngredientsValues(manifest));

  return selections.map((sel) => {
    const rec = byId.get(sel.id);
    if (!rec) {
      throw new Error(
        `c02 scaffold: selected id ${sel.id} (${sel.title}) is not in the corpus — ` +
          `regenerate the sample/corpus so the answer-key manifest and corpus agree.`
      );
    }
    assertRecordHasC02Fields(rec);
    const current = currentOf(rec);
    return {
      id: sel.id,
      title: sel.title,
      layer: sel.layer,
      hardCaseClass: sel.hardCaseClass,
      hardCaseJudgment: classifyHardCase(rec, ctx) !== null,
      current,
      floorAnchor: floorAnchor(current, floor, cookingValues, ingredientValues),
      bodyExcerpt: (rec.content_text ?? '').slice(0, BODY_EXCERPT_CHARS),
    };
  });
}

// ---------------------------------------------------------------------------
// Proposals (optional draft/codex per id)
// ---------------------------------------------------------------------------

export interface Proposal {
  draft?: FieldPair;
  codex?: FieldPair;
}

const proposalLineSchema = z.object({
  id: z.string().min(1),
  draft: fieldPairSchema.optional(),
  codex: fieldPairSchema.optional(),
});

/**
 * Load the OPTIONAL proposals file (id -> {draft?, codex?}). Tolerates absence
 * (returns an empty map). Each line is a JSON object; a duplicate id throws.
 */
export function loadProposals(filePath: string): Map<string, Proposal> {
  let text: string;
  try {
    text = readFileSync(filePath, 'utf8');
  } catch {
    return new Map();
  }
  const out = new Map<string, Proposal>();
  text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .forEach((line, index) => {
      let parsed: z.infer<typeof proposalLineSchema>;
      try {
        parsed = proposalLineSchema.parse(JSON.parse(line));
      } catch (e) {
        throw new Error(
          `${PROPOSALS_FILENAME} line ${index + 1} is malformed: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
      if (out.has(parsed.id)) {
        throw new Error(`${PROPOSALS_FILENAME} has a duplicate id: ${parsed.id}`);
      }
      out.set(parsed.id, { draft: parsed.draft, codex: parsed.codex });
    });
  return out;
}

// ---------------------------------------------------------------------------
// worksheet rendering
// ---------------------------------------------------------------------------

const LESSON_ID_RE = /<!--\s*lesson-id:\s*(\S+)\s*-->/;
const FINAL_COOKING_RE = /^FINAL cooking_skills\s*=(.*)$/;
const FINAL_INGREDIENTS_RE = /^FINAL main_ingredients\s*=(.*)$/;

function joinValues(values: readonly string[]): string {
  return values.join(`${FINAL_SEP} `);
}

/** De-duped union preserving a-then-b first-occurrence order. */
function unionOrdered(a: readonly string[], b: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of [...a, ...b]) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/**
 * The pre-filled FINAL value list for one field of one lesson: prefer codex on
 * judgment rows where it exists, else draft, else the floor anchor; ALWAYS
 * union-in the floor anchor (the floor is authoritative on the clean core).
 */
function prefillField(
  field: keyof FieldPair,
  row: C02ScaffoldRecord,
  proposal: Proposal | undefined
): string[] {
  const anchor = row.floorAnchor[field];
  let base: string[];
  if (row.hardCaseJudgment && proposal?.codex) base = proposal.codex[field];
  else if (proposal?.draft) base = proposal.draft[field];
  else base = anchor;
  return unionOrdered(base, anchor);
}

/** The DRAFT shown read-only: a proposal draft if present, else the floor anchor. */
function draftField(
  field: keyof FieldPair,
  row: C02ScaffoldRecord,
  proposal: Proposal | undefined
): string[] {
  return proposal?.draft ? proposal.draft[field] : row.floorAnchor[field];
}

function renderSection(
  row: C02ScaffoldRecord,
  index: number,
  total: number,
  proposal: Proposal | undefined
): string {
  const hardCaseNote = row.hardCaseClass ? ` · hard-case \`${row.hardCaseClass}\`` : '';
  const lines: string[] = [
    `## ${index}/${total} — ${row.title}`,
    '',
    `<!-- lesson-id: ${row.id} -->`,
    '',
    `- **id:** \`${row.id}\``,
    `- **layer:** \`${row.layer}\`${hardCaseNote} · judgment row: ${row.hardCaseJudgment ? 'YES' : 'no'}`,
    '',
    '**Body excerpt (read-only):**',
    '',
    '```',
    row.bodyExcerpt,
    '```',
    '',
    `- **Current:** cooking_skills = ${joinValues(row.current.cooking_skills)} | main_ingredients = ${joinValues(row.current.main_ingredients)}`,
    `- **Floor anchor:** cooking_skills = ${joinValues(row.floorAnchor.cooking_skills)} | main_ingredients = ${joinValues(row.floorAnchor.main_ingredients)}`,
  ];

  const draftCooking = draftField('cooking_skills', row, proposal);
  const draftIngredients = draftField('main_ingredients', row, proposal);
  lines.push(
    `- **Draft:** cooking_skills = ${joinValues(draftCooking)} | main_ingredients = ${joinValues(draftIngredients)}`
  );

  if (proposal?.codex) {
    lines.push(
      `- **Codex:** cooking_skills = ${joinValues(proposal.codex.cooking_skills)} | main_ingredients = ${joinValues(proposal.codex.main_ingredients)}`
    );
    // DISAGREE flag per field when draft and codex differ.
    if (proposal.draft) {
      const fields: (keyof FieldPair)[] = ['cooking_skills', 'main_ingredients'];
      for (const f of fields) {
        if (joinValues(proposal.draft[f]) !== joinValues(proposal.codex[f])) {
          lines.push(`  - ⚠️ DISAGREE: ${f}`);
        }
      }
    }
  }

  lines.push(
    '',
    '> Edit the two FINAL lines below. Values are `;`-separated; leave nothing after `=` for none.',
    '',
    `FINAL cooking_skills = ${joinValues(prefillField('cooking_skills', row, proposal))}`,
    `FINAL main_ingredients = ${joinValues(prefillField('main_ingredients', row, proposal))}`,
    '',
    '---'
  );
  return lines.join('\n');
}

/**
 * Render the human-editable worksheet. One section per scaffold row (the
 * scaffold is already in manifest order), numbered N/total. `proposals` is the
 * id -> {draft?, codex?} map (possibly empty).
 */
export function renderWorksheet(
  scaffold: C02ScaffoldRecord[],
  proposals: Map<string, Proposal>
): string {
  const total = scaffold.length;
  const intro = [
    '# C02 gold answer-key worksheet',
    '',
    '> One section per pilot lesson (manifest order). Everything except the two',
    '> `FINAL` lines is read-only context. Edit each `FINAL` line to the adjudicated',
    '> tags: `;`-separated canonical values; leave nothing after `=` for none. A',
    '> main_ingredients specific must have its parent group present too (assemble',
    '> enforces this). Run `assemble` to produce the gold key.',
    '',
    `> ${total} lessons.`,
    '',
    '---',
  ].join('\n');
  const sections = scaffold.map((row, i) =>
    renderSection(row, i + 1, total, proposals.get(row.id))
  );
  return `${intro}\n${sections.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// assemble (worksheet -> final.jsonl) + validation
// ---------------------------------------------------------------------------

export interface FinalKeyRecord {
  id: string;
  cooking_skills: string[];
  main_ingredients: string[];
}

interface ParsedSection {
  id: string;
  cooking_skills: string[] | null;
  main_ingredients: string[] | null;
}

function splitFinalLine(rhs: string): string[] {
  return rhs
    .split(FINAL_SEP)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Parse the worksheet into per-section FINAL value lists. Sections are delimited
 * by `<!-- lesson-id: X -->`. Within a section, EXACTLY one `FINAL cooking_skills
 * =` and one `FINAL main_ingredients =` line must appear (a second of either is
 * a hard error — strict).
 */
function parseSections(markdown: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of markdown.split('\n')) {
    const idMatch = line.match(LESSON_ID_RE);
    if (idMatch) {
      if (current) sections.push(current);
      current = { id: idMatch[1], cooking_skills: null, main_ingredients: null };
      continue;
    }
    if (!current) continue;

    const cookMatch = line.match(FINAL_COOKING_RE);
    if (cookMatch) {
      if (current.cooking_skills !== null) {
        throw new Error(`lesson ${current.id}: duplicate "FINAL cooking_skills =" line`);
      }
      current.cooking_skills = splitFinalLine(cookMatch[1]);
      continue;
    }
    const ingMatch = line.match(FINAL_INGREDIENTS_RE);
    if (ingMatch) {
      if (current.main_ingredients !== null) {
        throw new Error(`lesson ${current.id}: duplicate "FINAL main_ingredients =" line`);
      }
      current.main_ingredients = splitFinalLine(ingMatch[1]);
    }
  }
  if (current) sections.push(current);
  return sections;
}

/** Rewrite a value to its canonical casing via the field's fold lookup; throws on off-vocab. */
function canonicalizeValue(
  raw: string,
  folds: Map<string, string>,
  canonical: ReadonlySet<string>,
  field: keyof FieldPair,
  lessonId: string
): string {
  const folded = folds.get(matchKey(raw));
  if (folded !== undefined && canonical.has(folded)) return folded;
  throw new Error(
    `lesson ${lessonId}: "${raw}" is not a canonical ${field} value (off-vocab; ` +
      `not a canonical value and not an alias of one)`
  );
}

/** De-dupe preserving first-occurrence order. */
function dedupeOrdered(values: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/**
 * Validate + canonicalize one parsed section into a FinalKeyRecord. Per the
 * design: every value must be a canonical manifest value (matched
 * case-insensitively, rewritten to canonical casing); every specific must have
 * its required parent group present in the same row (null-parent specifics
 * exempt); de-duped, first-occurrence order. Throws a precise per-row message.
 */
export function validateSection(
  section: ParsedSection,
  floor: C02Floor,
  cookingValues: ReadonlySet<string>,
  ingredientValues: ReadonlySet<string>,
  parentMap: Record<string, string>
): FinalKeyRecord {
  if (section.cooking_skills === null) {
    throw new Error(`lesson ${section.id}: missing "FINAL cooking_skills =" line`);
  }
  if (section.main_ingredients === null) {
    throw new Error(`lesson ${section.id}: missing "FINAL main_ingredients =" line`);
  }

  const cooking = dedupeOrdered(
    section.cooking_skills.map((v) =>
      canonicalizeValue(v, floor.cookingFolds, cookingValues, 'cooking_skills', section.id)
    )
  );
  const ingredients = dedupeOrdered(
    section.main_ingredients.map((v) =>
      canonicalizeValue(v, floor.ingredientFolds, ingredientValues, 'main_ingredients', section.id)
    )
  );

  // Parent-map invariant: every specific present must have its parent group
  // present in the same row (null-parent specifics are exempt = absent from map).
  const present = new Set(ingredients);
  for (const value of ingredients) {
    const parent = parentMap[value];
    if (parent !== undefined && !present.has(parent)) {
      throw new Error(
        `lesson ${section.id}: main_ingredients specific "${value}" requires its parent ` +
          `group "${parent}" in the same row (orphan specific)`
      );
    }
  }

  return { id: section.id, cooking_skills: cooking, main_ingredients: ingredients };
}

/**
 * Assemble the gold key from a (human-edited) worksheet. Validates that exactly
 * the manifest's sections are present (count + id set), in manifest order, then
 * validates each section. Throws a precise message on the first failure.
 */
export function assembleFromWorksheet(
  markdown: string,
  selections: ManifestSelection[],
  manifest: C02Manifest,
  floor: C02Floor
): FinalKeyRecord[] {
  const sections = parseSections(markdown);
  const expectedIds = selections.map((s) => s.id);
  const expectedSet = new Set(expectedIds);

  if (sections.length !== expectedIds.length) {
    throw new Error(
      `c02 assemble: parsed ${sections.length} lesson section(s) but the manifest has ` +
        `${expectedIds.length} — every selected lesson needs exactly one section.`
    );
  }
  const seen = new Set<string>();
  for (const section of sections) {
    if (!expectedSet.has(section.id)) {
      throw new Error(
        `c02 assemble: worksheet section id ${section.id} is not in the manifest set`
      );
    }
    if (seen.has(section.id)) {
      throw new Error(`c02 assemble: worksheet has a duplicate section for id ${section.id}`);
    }
    seen.add(section.id);
  }
  // Manifest-order check: the parsed order must match the manifest order exactly.
  for (let i = 0; i < expectedIds.length; i++) {
    if (sections[i].id !== expectedIds[i]) {
      throw new Error(
        `c02 assemble: section ${i + 1} is ${sections[i].id} but the manifest expects ` +
          `${expectedIds[i]} (sections must be in manifest order)`
      );
    }
  }

  const cookingValues = new Set(manifest.cookingSkills);
  const ingredientValues = new Set(c02MainIngredientsValues(manifest));
  const parentMap = c02IngredientParentMap(manifest);

  return sections.map((section) =>
    validateSection(section, floor, cookingValues, ingredientValues, parentMap)
  );
}

// ---------------------------------------------------------------------------
// CLI orchestration (filesystem only)
// ---------------------------------------------------------------------------

export interface RunPaths {
  artifactsDir: string;
  manifestPath: string;
  corpusPath: string;
  scaffoldPath: string;
  proposalsPath: string;
  worksheetPath: string;
  finalPath: string;
}

function resolvePaths(artifactsDir: string): RunPaths {
  return {
    artifactsDir,
    manifestPath: path.join(artifactsDir, MANIFEST_FILENAME),
    corpusPath: path.join(artifactsDir, CORPUS_FILENAME),
    scaffoldPath: path.join(artifactsDir, SCAFFOLD_FILENAME),
    proposalsPath: path.join(artifactsDir, PROPOSALS_FILENAME),
    worksheetPath: path.join(artifactsDir, WORKSHEET_FILENAME),
    finalPath: path.join(artifactsDir, FINAL_FILENAME),
  };
}

export function runScaffold(paths: RunPaths): { scaffoldPath: string; count: number } {
  const selections = loadManifestSelections(paths.manifestPath);
  const corpus = loadCorpus(paths.corpusPath);
  const manifest = loadC02Manifest();
  const floor = loadC02Floor();
  const ctx = buildC02SamplerContext();
  const rows = buildScaffold(selections, corpus, manifest, floor, ctx);

  mkdirSync(paths.artifactsDir, { recursive: true });
  writeFileSync(paths.scaffoldPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return { scaffoldPath: paths.scaffoldPath, count: rows.length };
}

const scaffoldRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  layer: z.enum(['hard-case', 'coverage', 'clean-core']),
  hardCaseClass: z.enum(['vague-cooking', 'herbs-aromatics', 'orphan-food']).nullable(),
  hardCaseJudgment: z.boolean(),
  current: fieldPairSchema,
  floorAnchor: fieldPairSchema,
  bodyExcerpt: z.string(),
});

function loadScaffold(filePath: string): C02ScaffoldRecord[] {
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      try {
        return scaffoldRecordSchema.parse(JSON.parse(line));
      } catch (e) {
        throw new Error(
          `${SCAFFOLD_FILENAME} line ${index + 1} is malformed: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
    });
}

export function runWorksheet(paths: RunPaths): { worksheetPath: string; count: number } {
  const scaffold = loadScaffold(paths.scaffoldPath);
  const proposals = loadProposals(paths.proposalsPath);
  const markdown = renderWorksheet(scaffold, proposals);

  mkdirSync(paths.artifactsDir, { recursive: true });
  writeFileSync(paths.worksheetPath, markdown);
  return { worksheetPath: paths.worksheetPath, count: scaffold.length };
}

export function runAssemble(paths: RunPaths): { finalPath: string; count: number } {
  const selections = loadManifestSelections(paths.manifestPath);
  const manifest = loadC02Manifest();
  const floor = loadC02Floor();
  const markdown = readFileSync(paths.worksheetPath, 'utf8');
  const records = assembleFromWorksheet(markdown, selections, manifest, floor);

  mkdirSync(paths.artifactsDir, { recursive: true });
  writeFileSync(paths.finalPath, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return { finalPath: paths.finalPath, count: records.length };
}

const HELP = `
C02 gold-key build tooling (P2.2) — scaffold / worksheet / assemble.

Turns the committed 70-lesson sample manifest into the human-adjudicated gold
answer key for the cooking_skills + main_ingredients re-tag pilot. NO DB, NO
model/API calls, NO network.

Usage:
  npx tsx scripts/stage2-retag/build-c02-answer-key.ts <command> [--artifacts-dir <path>]

Commands:
  scaffold   join ${MANIFEST_FILENAME} × ${CORPUS_FILENAME} -> ${SCAFFOLD_FILENAME}
             (current tags + deterministic floor anchor + body excerpt +
             hardCaseJudgment). Fails if any selected id is missing or the
             corpus is stale.
  worksheet  ${SCAFFOLD_FILENAME} [+ optional ${PROPOSALS_FILENAME}] -> ${WORKSHEET_FILENAME}
             (one section per lesson; read-only context + two pre-filled FINAL
             lines a human edits).
  assemble   parse the edited ${WORKSHEET_FILENAME} -> ${FINAL_FILENAME}
             (70 rows of {id, cooking_skills, main_ingredients}; validates
             canonical vocab + the specific->group parent invariant).

Flags:
  --artifacts-dir <path>  override the artifacts directory
                          (default scripts/stage2-retag/artifacts)
  --help
`;

interface Args {
  command: 'scaffold' | 'worksheet' | 'assemble' | null;
  artifactsDir: string;
  help: boolean;
}

export function parseArgs(argv: string[]): Args {
  const a: Args = { command: null, artifactsDir: DEFAULT_ARTIFACTS_DIR, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      a.help = true;
    } else if (arg === '--artifacts-dir') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error('flag --artifacts-dir requires a value');
      }
      a.artifactsDir = next;
      i++;
    } else if (arg === 'scaffold' || arg === 'worksheet' || arg === 'assemble') {
      if (a.command !== null)
        throw new Error(`only one command may be given (got ${a.command} and ${arg})`);
      a.command = arg;
    } else {
      throw new Error(`unknown argument: ${arg} (use --help for usage)`);
    }
  }
  return a;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.command === null) {
    process.stdout.write(HELP);
    if (args.command === null && !args.help) process.exitCode = 1;
    return;
  }
  const paths = resolvePaths(args.artifactsDir);
  try {
    if (args.command === 'scaffold') {
      const { scaffoldPath, count } = runScaffold(paths);
      process.stdout.write(`c02 scaffold: ${count} lessons -> ${scaffoldPath}\n`);
    } else if (args.command === 'worksheet') {
      const { worksheetPath, count } = runWorksheet(paths);
      process.stdout.write(`c02 worksheet: ${count} lessons -> ${worksheetPath}\n`);
    } else {
      const { finalPath, count } = runAssemble(paths);
      process.stdout.write(`c02 assemble: ${count} gold-key rows -> ${finalPath}\n`);
    }
  } catch (e) {
    process.stderr.write(`ERROR: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  }
}

// Run only when invoked directly (mirrors sample-answer-key.ts).
const INVOKED_PATH = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (INVOKED_PATH === fileURLToPath(import.meta.url)) {
  main();
}
