/**
 * T4 dedup sweep — deterministic candidate-group generation (NO AI).
 *
 * Reads the local corpus export (`artifacts/corpus.json`, produced by
 * export-corpus.ts) and emits `docs/plans/t4-dedup/candidates.json`: every
 * duplicate-candidate group with its members, pairwise signal matrix, family
 * flags, and tier. Fully deterministic — same corpus in, byte-identical
 * candidates out.
 *
 * Candidate pairs = union of four blocking rules (brief t4a §2):
 *   (a) normalized-title equality  (norm = lower + collapse whitespace/control)
 *   (b) title trigram similarity ≥ 0.55
 *   (c) content_hash equality
 *   (d) identical non-empty main_ingredients AND thematic_categories sets
 * Pairs are merged into groups with union-find. Each group is tiered by its
 * MAX pairwise content trigram similarity: A ≥ 0.92, B 0.75–0.92, C < 0.75.
 *
 * A pre-registered calibration gate (live PROD pg_trgm probes, 2026-07-02)
 * runs before anything is written; any failure throws (STOP + report).
 *
 * Usage:  npx tsx scripts/dedup-sweep/generate-candidates.ts
 */
/* eslint-disable no-console -- CLI script: console output is the operator UI */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TIER_A_MIN, TIER_B_MIN, TITLE_SIM_THRESHOLD } from './constants';
import { FACET_ARRAY_COLUMNS } from './export-corpus';
import { normTitle, trigramSet, trigramSim } from './trigram';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, '..', '..');
const CORPUS_PATH = path.join(MODULE_DIR, 'artifacts', 'corpus.json');
const OUTPUT_DIR = path.join(REPO_ROOT, 'docs', 'plans', 't4-dedup');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'candidates.json');

// ---------------------------------------------------------------------------
// Corpus record shape (mirrors export-corpus.ts CorpusRecord)
// ---------------------------------------------------------------------------

interface CorpusRecord {
  lesson_id: string;
  title: string;
  summary: string | null;
  content_text: string;
  content_hash: string | null;
  created_at: string | null;
  updated_at: string | null;
  original_submission_id: string | null;
  file_link: string | null;
  grade_levels: string[] | null;
  content_length: number;
  [facetColumn: string]: unknown;
}

function facetArray(rec: CorpusRecord, col: string): string[] {
  const v = rec[col];
  return Array.isArray(v) ? (v as string[]) : [];
}

/** Count of the 14 facet columns that are populated (non-empty array). */
function populatedFacetCount(rec: CorpusRecord): number {
  let n = 0;
  for (const col of FACET_ARRAY_COLUMNS) {
    if (facetArray(rec, col).length > 0) n += 1;
  }
  return n;
}

function setSignature(values: string[]): string {
  return [...new Set(values)].sort().join('|');
}

// ---------------------------------------------------------------------------
// Union-find
// ---------------------------------------------------------------------------

class UnionFind {
  private parent = new Map<string, string>();

  add(id: string): void {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    let root = id;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root) as string;
    }
    // Path compression.
    let cur = id;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur) as string;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    this.add(a);
    this.add(b);
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

// ---------------------------------------------------------------------------
// Family-signal detection (per group, scanned over member titles)
// ---------------------------------------------------------------------------

const GRADE_BAND_RE = /\b(3K|PK|K-2|3-5|6-8|\(K\)|MS|grade)\b/i;
const MOBILE_ED_RE = /mobile education/i;
const SERIES_PART_RE = /\b(Part\s*\d|Pt\.?\s*\d|Session\s*\d|Day\s*\d)\b/i;

function detectFlags(titles: string[]): {
  grade_band: boolean;
  mobile_ed: boolean;
  series_part: boolean;
} {
  return {
    grade_band: titles.some((t) => GRADE_BAND_RE.test(t)),
    mobile_ed: titles.some((t) => MOBILE_ED_RE.test(t)),
    series_part: titles.some((t) => SERIES_PART_RE.test(t)),
  };
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

interface PairSignal {
  id_a: string;
  id_b: string;
  title_sim: number;
  content_sim: number;
  hash_equal: boolean;
  metadata_match: boolean;
}

interface MemberSignal {
  lesson_id: string;
  title: string;
  norm_title: string;
  summary_present: boolean;
  content_length: number;
  populated_facet_count: number;
  grade_levels: string[];
  created_at: string | null;
  updated_at: string | null;
  file_link: string | null;
  original_submission_id: string | null;
}

interface GroupOutput {
  group_id: string;
  tier: 'A' | 'B' | 'C';
  representative_title: string;
  member_count: number;
  max_content_sim: number;
  max_title_sim: number;
  candidate_reasons: string[];
  flags: { grade_band: boolean; mobile_ed: boolean; series_part: boolean };
  members: MemberSignal[];
  pairwise: PairSignal[];
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const records: CorpusRecord[] = JSON.parse(readFileSync(CORPUS_PATH, 'utf8'));
  console.log(`🔄 Loaded ${records.length} corpus records from ${CORPUS_PATH}`);

  const byId = new Map<string, CorpusRecord>();
  for (const rec of records) byId.set(rec.lesson_id, rec);

  // Precompute normalized titles + title trigram sets.
  const norm = new Map<string, string>();
  const titleTrg = new Map<string, Set<string>>();
  for (const rec of records) {
    norm.set(rec.lesson_id, normTitle(rec.title));
    titleTrg.set(rec.lesson_id, trigramSet(rec.title));
  }

  // Content trigram sets: memoized lazily (only lessons that enter a pair).
  const contentTrg = new Map<string, Set<string>>();
  const getContentTrg = (id: string): Set<string> => {
    let s = contentTrg.get(id);
    if (s === undefined) {
      s = trigramSet(byId.get(id)?.content_text ?? '');
      contentTrg.set(id, s);
    }
    return s;
  };

  const ids = records.map((r) => r.lesson_id);
  const uf = new UnionFind();
  for (const id of ids) uf.add(id);

  // pairKey -> set of reason codes ('a'|'b'|'c'|'d')
  const pairReasons = new Map<string, Set<string>>();
  const pairKey = (a: string, b: string): string => (a < b ? `${a} :: ${b}` : `${b} :: ${a}`);
  const addPair = (a: string, b: string, reason: string): void => {
    if (a === b) return;
    const key = pairKey(a, b);
    let s = pairReasons.get(key);
    if (s === undefined) {
      s = new Set<string>();
      pairReasons.set(key, s);
    }
    s.add(reason);
    uf.union(a, b);
  };

  // (a) normalized-title equality.
  const byNorm = new Map<string, string[]>();
  for (const id of ids) {
    const nt = norm.get(id) as string;
    const arr = byNorm.get(nt);
    if (arr) arr.push(id);
    else byNorm.set(nt, [id]);
  }
  let sameTitleGroupCount = 0;
  let sameTitleRowCount = 0;
  for (const members of byNorm.values()) {
    if (members.length > 1) {
      sameTitleGroupCount += 1;
      sameTitleRowCount += members.length;
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) {
          addPair(members[i], members[j], 'a');
        }
      }
    }
  }

  // (b) title trigram similarity ≥ threshold (all O(n²) pairs).
  for (let i = 0; i < ids.length; i += 1) {
    const ti = titleTrg.get(ids[i]) as Set<string>;
    for (let j = i + 1; j < ids.length; j += 1) {
      const sim = trigramSim(ti, titleTrg.get(ids[j]) as Set<string>);
      if (sim >= TITLE_SIM_THRESHOLD) addPair(ids[i], ids[j], 'b');
    }
  }

  // (c) content_hash equality.
  const byHash = new Map<string, string[]>();
  for (const rec of records) {
    if (!rec.content_hash) continue;
    const arr = byHash.get(rec.content_hash);
    if (arr) arr.push(rec.lesson_id);
    else byHash.set(rec.content_hash, [rec.lesson_id]);
  }
  let hashEqualPairCount = 0;
  for (const members of byHash.values()) {
    if (members.length > 1) {
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) {
          hashEqualPairCount += 1;
          addPair(members[i], members[j], 'c');
        }
      }
    }
  }

  // (d) identical non-empty main_ingredients AND thematic_categories sets.
  const byMeta = new Map<string, string[]>();
  for (const rec of records) {
    const ing = facetArray(rec, 'main_ingredients');
    const them = facetArray(rec, 'thematic_categories');
    if (ing.length === 0 || them.length === 0) continue;
    const sig = `${setSignature(ing)} :: ${setSignature(them)}`;
    const arr = byMeta.get(sig);
    if (arr) arr.push(rec.lesson_id);
    else byMeta.set(sig, [rec.lesson_id]);
  }
  for (const members of byMeta.values()) {
    if (members.length > 1) {
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) {
          addPair(members[i], members[j], 'd');
        }
      }
    }
  }

  // Assemble groups from union-find roots (only components with >1 member).
  const componentsByRoot = new Map<string, string[]>();
  for (const id of ids) {
    const root = uf.find(id);
    const arr = componentsByRoot.get(root);
    if (arr) arr.push(id);
    else componentsByRoot.set(root, [id]);
  }

  const hashEqual = (a: string, b: string): boolean => {
    const ha = byId.get(a)?.content_hash;
    const hb = byId.get(b)?.content_hash;
    return ha != null && ha === hb;
  };
  const metaMatch = (a: string, b: string): boolean => {
    const ra = byId.get(a) as CorpusRecord;
    const rb = byId.get(b) as CorpusRecord;
    const ia = facetArray(ra, 'main_ingredients');
    const ib = facetArray(rb, 'main_ingredients');
    const ta = facetArray(ra, 'thematic_categories');
    const tb = facetArray(rb, 'thematic_categories');
    if (ia.length === 0 || ib.length === 0 || ta.length === 0 || tb.length === 0) return false;
    return setSignature(ia) === setSignature(ib) && setSignature(ta) === setSignature(tb);
  };

  const groups: GroupOutput[] = [];
  for (const members of componentsByRoot.values()) {
    if (members.length < 2) continue;
    const sorted = [...members].sort();

    // Full pairwise signal matrix over group members.
    const pairwise: PairSignal[] = [];
    let maxContentSim = 0;
    let maxTitleSim = 0;
    const reasons = new Set<string>();
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const a = sorted[i];
        const b = sorted[j];
        const tSim = trigramSim(titleTrg.get(a) as Set<string>, titleTrg.get(b) as Set<string>);
        const cSim = trigramSim(getContentTrg(a), getContentTrg(b));
        const hEq = hashEqual(a, b);
        const mMatch = metaMatch(a, b);
        pairwise.push({
          id_a: a,
          id_b: b,
          title_sim: round3(tSim),
          content_sim: hEq ? 1 : round3(cSim),
          hash_equal: hEq,
          metadata_match: mMatch,
        });
        maxContentSim = Math.max(maxContentSim, hEq ? 1 : cSim);
        maxTitleSim = Math.max(maxTitleSim, tSim);
        const r = pairReasons.get(pairKey(a, b));
        if (r) for (const x of r) reasons.add(x);
      }
    }

    const tier: 'A' | 'B' | 'C' =
      maxContentSim >= TIER_A_MIN ? 'A' : maxContentSim >= TIER_B_MIN ? 'B' : 'C';

    const memberSignals: MemberSignal[] = sorted.map((id) => {
      const rec = byId.get(id) as CorpusRecord;
      return {
        lesson_id: id,
        title: rec.title,
        norm_title: norm.get(id) as string,
        summary_present: (rec.summary ?? '').trim().length > 0,
        content_length: rec.content_length,
        populated_facet_count: populatedFacetCount(rec),
        grade_levels: rec.grade_levels ?? [],
        created_at: rec.created_at,
        updated_at: rec.updated_at,
        file_link: rec.file_link,
        original_submission_id: rec.original_submission_id,
      };
    });

    // Representative title = most-frequent normalized title (tie → alphabetical).
    const normCounts = new Map<string, number>();
    for (const id of sorted) {
      const nt = norm.get(id) as string;
      normCounts.set(nt, (normCounts.get(nt) ?? 0) + 1);
    }
    const representativeNorm = [...normCounts.entries()].sort((x, y) =>
      y[1] !== x[1] ? y[1] - x[1] : x[0] < y[0] ? -1 : 1
    )[0][0];
    const representativeTitle =
      memberSignals.find((m) => m.norm_title === representativeNorm)?.title ??
      memberSignals[0].title;

    const slug =
      representativeTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'group';
    const hash6 = createHash('sha1').update(sorted.join(',')).digest('hex').slice(0, 6);

    groups.push({
      group_id: `${slug}-${hash6}`,
      tier,
      representative_title: representativeTitle,
      member_count: sorted.length,
      max_content_sim: round3(maxContentSim),
      max_title_sim: round3(maxTitleSim),
      candidate_reasons: [...reasons].sort(),
      flags: detectFlags(memberSignals.map((m) => m.title)),
      members: memberSignals,
      pairwise,
    });
  }

  // Sort Tier A → B → C, then by max_content_sim desc, then group_id for stability.
  const tierRank = { A: 0, B: 1, C: 2 };
  groups.sort((x, y) => {
    if (tierRank[x.tier] !== tierRank[y.tier]) return tierRank[x.tier] - tierRank[y.tier];
    if (y.max_content_sim !== x.max_content_sim) return y.max_content_sim - x.max_content_sim;
    return x.group_id < y.group_id ? -1 : 1;
  });

  const tierCounts = {
    A: groups.filter((g) => g.tier === 'A').length,
    B: groups.filter((g) => g.tier === 'B').length,
    C: groups.filter((g) => g.tier === 'C').length,
  };

  runCalibrationGate({
    groups,
    sameTitleGroupCount,
    sameTitleRowCount,
    hashEqualPairCount,
    getContentSim: (a, b) => trigramSim(getContentTrg(a), getContentTrg(b)),
    hasId: (id) => byId.has(id),
    hashEqual,
  });

  const output = {
    generated_from: 'scripts/dedup-sweep/artifacts/corpus.json (live PROD export, read-only)',
    corpus_row_count: records.length,
    thresholds: {
      title_sim: TITLE_SIM_THRESHOLD,
      tier_a_min: TIER_A_MIN,
      tier_b_min: TIER_B_MIN,
    },
    counts: {
      total_groups: groups.length,
      tier_a: tierCounts.A,
      tier_b: tierCounts.B,
      tier_c: tierCounts.C,
      same_title_groups: sameTitleGroupCount,
      same_title_rows: sameTitleRowCount,
      hash_equal_pairs: hashEqualPairCount,
    },
    groups,
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(`✅ Wrote ${groups.length} groups to ${OUTPUT_PATH}`);
  console.log(
    `   tiers: A=${tierCounts.A}  B=${tierCounts.B}  C=${tierCounts.C}` +
      `  | same-title groups=${sameTitleGroupCount} (${sameTitleRowCount} rows)` +
      `  | hash-equal pairs=${hashEqualPairCount}`
  );
  const sizes = groups.map((g) => g.member_count).sort((a, b) => b - a);
  console.log(`   largest groups: ${sizes.slice(0, 8).join(', ')}`);
}

// ---------------------------------------------------------------------------
// Calibration gate (pre-registered from live PROD pg_trgm probes 2026-07-02)
// ---------------------------------------------------------------------------

interface NamedPair {
  label: string;
  id_a: string;
  id_b: string;
  sqlContentSim: number;
  expectedBand: 'A' | 'C';
  hashExpected?: boolean;
}

// Verbatim lesson_ids + SQL pg_trgm content-similarity from the 2026-07-02
// PROD probe (committed alongside this script). Bands: A ≥ 0.92, C < 0.75.
const NAMED_PAIRS: NamedPair[] = [
  {
    label: 'Sun Printing',
    id_a: '1YuKoPyuJb5ImdgY1vTne8snk8VQeCCAjaPcJcxWIfhM',
    id_b: 'lesson_d5c52872fd214f289d3cafaf0af3e607',
    sqlContentSim: 0.987,
    expectedBand: 'A',
  },
  {
    label: 'The Garden in the Fall',
    id_a: '1A34UK78EbtdHIVeiVe0lNiLJaJ557y-JlS_o673-hmw',
    id_b: 'lesson_d4a676556c8d4c03bbc142d0f89c0010',
    sqlContentSim: 0.969,
    expectedBand: 'A',
  },
  {
    label: 'Worm Study',
    id_a: '1wp71sAPQQycFDAHX_k-Tk8fpzz-bb2FW',
    id_b: 'lesson_2004c1a511fe41b58e58f1aefd339773',
    sqlContentSim: 0.967,
    expectedBand: 'A',
  },
  {
    label: 'Vegetable Ramen (top pair)',
    id_a: '1FUQYevNBKMdDFgZYFGyPDT90O_61dVOf',
    id_b: 'lesson_d28f99cce1784da08593876f227338ed',
    sqlContentSim: 0.959,
    expectedBand: 'A',
  },
  {
    label: 'Seed Dispersal (pair)',
    id_a: '0BzCUl-9h7sgESGZ0MThTY0NBYVE',
    id_b: '1_WlZmDJv8Ql-sCLlOyxr2qL4zeb1GQda',
    sqlContentSim: 0.545,
    expectedBand: 'C',
  },
  {
    label: 'The Water Cycle',
    id_a: '135RmnOeDA2UjHnKmfQIh4JylpENfk4CN',
    id_b: '1LO4p1z6TBKdq_ViV9yPH42ZD7_sJhSEU',
    sqlContentSim: 0.504,
    expectedBand: 'C',
  },
  {
    // SQL pg_trgm for this exact id-pair (1Dz/1gh1) = 0.568; the other Fattoush
    // non-hash pairs run 0.303–0.365 (the brief's "≈0.30–0.57" range). All < 0.75.
    label: 'Fattoush (non-hash pair)',
    id_a: '1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI',
    id_b: '1gh1_OqCpnhDkGOmte5VIdIkEkU8_HpXs34KdcSuPkrQ',
    sqlContentSim: 0.568,
    expectedBand: 'C',
  },
  {
    label: 'Fattoush (hash-identical pair)',
    id_a: '1vDebvrcoPdDcoooLnpF64P3ade4l8ZRqVkfSlEAyYts',
    id_b: '1YeRlyncgM-gMS-Aica2Fk7wjBsRN9-K6',
    sqlContentSim: 1.0,
    expectedBand: 'A',
    hashExpected: true,
  },
];

function bandOf(sim: number): 'A' | 'B' | 'C' {
  return sim >= TIER_A_MIN ? 'A' : sim >= TIER_B_MIN ? 'B' : 'C';
}

function runCalibrationGate(args: {
  groups: GroupOutput[];
  sameTitleGroupCount: number;
  sameTitleRowCount: number;
  hashEqualPairCount: number;
  getContentSim: (a: string, b: string) => number;
  hasId: (id: string) => boolean;
  hashEqual: (a: string, b: string) => boolean;
}): void {
  const failures: string[] = [];
  console.log('\n— Calibration gate (pre-registered PROD probes 2026-07-02) —');

  // 1. Same-title groups = 46 exactly; 96 rows.
  console.log(
    `   same-title groups: ${args.sameTitleGroupCount} (expect 46), rows: ${args.sameTitleRowCount} (expect 96)`
  );
  if (args.sameTitleGroupCount !== 46)
    failures.push(`same-title groups = ${args.sameTitleGroupCount}, expected 46`);
  if (args.sameTitleRowCount !== 96)
    failures.push(`same-title rows = ${args.sameTitleRowCount}, expected 96`);

  // 2. Exactly one hash-equal pair.
  console.log(`   hash-equal pairs: ${args.hashEqualPairCount} (expect 1)`);
  if (args.hashEqualPairCount !== 1)
    failures.push(`hash-equal pairs = ${args.hashEqualPairCount}, expected 1`);

  // 3. Named-pair tier bands must hold (TS may differ ±0.08 from SQL).
  console.log('   named-pair content-sim (TS vs SQL → band):');
  for (const p of NAMED_PAIRS) {
    // Guard: a named calibration id that has dropped out of the corpus would
    // otherwise score as empty content (sim 0 → still "passes" a C band) or
    // force sim 1 (hash pair) without a real row — a silent false-pass. Fail loud.
    if (!args.hasId(p.id_a) || !args.hasId(p.id_b)) {
      failures.push(`${p.label}: calibration id missing from corpus (${p.id_a} / ${p.id_b})`);
      console.log(`     ✗ ${p.label}: MISSING id — cannot score`);
      continue;
    }
    if (p.hashExpected && !args.hashEqual(p.id_a, p.id_b)) {
      failures.push(`${p.label}: expected a hash-identical pair but hashes differ`);
    }
    const tsSim = p.hashExpected ? 1 : args.getContentSim(p.id_a, p.id_b);
    const band = bandOf(tsSim);
    const drift = Math.abs(tsSim - p.sqlContentSim);
    const ok = band === p.expectedBand;
    console.log(
      `     ${ok ? '✓' : '✗'} ${p.label}: TS=${round3(tsSim)} SQL=${p.sqlContentSim} ` +
        `(Δ${round3(drift)}) → ${band} (expect ${p.expectedBand})`
    );
    if (!ok) {
      failures.push(
        `${p.label}: TS content_sim ${round3(tsSim)} → band ${band}, expected ${p.expectedBand}`
      );
    }
    if (drift > 0.08 && !p.hashExpected) {
      console.warn(
        `       ⚠️  TS/SQL drift ${round3(drift)} > 0.08 (band still ${ok ? 'OK' : 'FLIPPED'})`
      );
    }
  }

  // 4. Total group count sanity.
  console.log(`   total groups: ${args.groups.length} (expect 60–160; STOP if <40 or >250)`);
  if (args.groups.length < 40 || args.groups.length > 250) {
    failures.push(
      `total group count ${args.groups.length} outside [40, 250] — blocking rules suspect`
    );
  }

  if (failures.length > 0) {
    console.error('\n❌ CALIBRATION GATE FAILED — STOP and report:');
    for (const f of failures) console.error(`   • ${f}`);
    process.exit(1);
  }
  console.log('✅ Calibration gate passed.\n');
}

// Only run when invoked directly — importing a helper from this module (e.g. a
// future unit test) must NOT read the corpus, run the gate, write candidates.json,
// or process.exit as an import side effect.
const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  main();
}
