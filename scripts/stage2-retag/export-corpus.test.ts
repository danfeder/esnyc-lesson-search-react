/**
 * Unit tests for export-corpus.ts body-override mechanism (B3.5b).
 *
 * The export script substitutes a sidecar body for the stored corpus
 * content_text on a small set of records whose PROD content_text is a stub or
 * a machine-written tag-summary card rather than real lesson text. The
 * original Who's-Who-only override (OQ5) is generalized here into a manifest-
 * driven mechanism: a tracked data file (data/body-overrides.json) lists the
 * override ids, and each id's real body lives in an untracked sidecar at
 * artifacts/body-overrides/<id>.txt.
 *
 * These helpers are PURE/filesystem-only (no network): the live-Doc fetch
 * happened out-of-band, the bodies are on disk, and the script just reads +
 * normalizes + min-length-guards them, mirroring the Who's-Who guard.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  MIN_OVERRIDE_BODY_CHARS,
  buildCorpusRecord,
  loadBodyOverridesManifest,
  loadOverrideBody,
  normalizeBody,
} from './export-corpus';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

const tmpDirs: string[] = [];
function makeTmpDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'export-corpus-test-'));
  tmpDirs.push(dir);
  return dir;
}
afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// loadBodyOverridesManifest — tracked data/body-overrides.json
// ---------------------------------------------------------------------------

describe('loadBodyOverridesManifest', () => {
  it('returns the override entries (id + title) from a well-formed manifest', () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'body-overrides.json');
    writeFileSync(
      file,
      JSON.stringify({
        provenance: { task: 'fixture' },
        overrides: [
          { id: 'aaa', title: 'Alpha', doc_type: 'native_google_doc', fetched_chars: 2500 },
          { id: 'bbb', title: 'Beta', doc_type: 'docx_office_file', fetched_chars: 2600 },
        ],
      })
    );
    const entries = loadBodyOverridesManifest(file);
    expect(entries.map((e) => e.id)).toEqual(['aaa', 'bbb']);
    expect(entries[0].title).toBe('Alpha');
  });

  it('throws on a duplicate override id (loud, never silently overrides the wrong body)', () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'body-overrides.json');
    writeFileSync(
      file,
      JSON.stringify({
        provenance: {},
        overrides: [
          { id: 'x', title: 'X', doc_type: 'native_google_doc', fetched_chars: 2500 },
          { id: 'x', title: 'X again', doc_type: 'docx_office_file', fetched_chars: 2600 },
        ],
      })
    );
    expect(() => loadBodyOverridesManifest(file)).toThrow(/duplicate.*id.*x/i);
  });

  it('throws when an override entry is missing a required field', () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'body-overrides.json');
    writeFileSync(file, JSON.stringify({ provenance: {}, overrides: [{ id: 'x' }] }));
    expect(() => loadBodyOverridesManifest(file)).toThrow();
  });

  it('loads the real checked-in data/body-overrides.json with the 4 re-extraction overrides', () => {
    const entries = loadBodyOverridesManifest(path.join(MODULE_DIR, 'data/body-overrides.json'));
    expect(entries.map((e) => e.id).sort()).toEqual(
      [
        '1I-62V3w_VT2EycS03QXR-YiX_xe9xTwo10JHBk8o3vs',
        '1P8fqhHyo7FIzysTkrh628cbOfkpYAQw1',
        '1YeRlyncgM-gMS-Aica2Fk7wjBsRN9-K6',
        '1vDebvrcoPdDcoooLnpF64P3ade4l8ZRqVkfSlEAyYts',
      ].sort()
    );
  });
});

// ---------------------------------------------------------------------------
// loadOverrideBody — reads + normalizes + min-length-guards a sidecar
// ---------------------------------------------------------------------------

describe('loadOverrideBody', () => {
  it('reads, normalizes, and trims a sidecar body', () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'sidecar.txt');
    // includes \r\n and a trailing newline to prove normalization + trim
    const body = `${'lesson body '.repeat(300)}\r\n`;
    writeFileSync(file, body);
    const loaded = loadOverrideBody(file);
    expect(loaded).not.toContain('\r');
    expect(loaded.endsWith(' ')).toBe(false); // trimmed
    expect(loaded.length).toBeGreaterThanOrEqual(MIN_OVERRIDE_BODY_CHARS);
  });

  it('throws when the sidecar is missing (operator must fetch the live Doc first)', () => {
    const dir = makeTmpDir();
    const missing = path.join(dir, 'does-not-exist.txt');
    expect(() => loadOverrideBody(missing)).toThrow(/missing.*sidecar/i);
  });

  it('throws when the sidecar is stub-sized (below the min-length guard)', () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'stub.txt');
    writeFileSync(file, 'too short');
    expect(() => loadOverrideBody(file)).toThrow(/chars/i);
  });
});

// ---------------------------------------------------------------------------
// normalizeBody — unchanged OQ5 behavior (regression guard kept after refactor)
// ---------------------------------------------------------------------------

describe('normalizeBody (OQ5 — unchanged after the override-mechanism refactor)', () => {
  it('strips \\x0B and normalizes \\r\\n and \\r to \\n', () => {
    const input = 'ab\r\nc\rd';
    expect(normalizeBody(input)).toBe('ab\nc\nd');
  });
});

// ---------------------------------------------------------------------------
// buildCorpusRecord — every column-backed field (incl. the two C02 fields)
// round-trips its text[] column values into the exported corpus record
// ---------------------------------------------------------------------------

describe('buildCorpusRecord (C02 — cooking_skills + main_ingredients round-trip)', () => {
  /** A full LessonRow keyed by the lessons text[] COLUMN names (what the SELECT returns). */
  const fullRow = {
    lesson_id: 'lesson-c02',
    title: 'Knife Skills with Tomatoes',
    content_text: 'A cooking lesson about dicing tomatoes and onions.',
    activity_type: ['cooking'],
    tags: [],
    season_timing: ['Summer'],
    cultural_responsiveness_features: [],
    cultural_heritage: [],
    academic_integration: [],
    social_emotional_learning: [],
    core_competencies: [],
    cooking_methods: ['Stovetop'],
    observances_holidays: [],
    garden_skills: [],
    cooking_skills: ['Knife Skills', 'Sautéing & Stir-Frying'],
    main_ingredients: ['Nightshades', 'Tomatoes', 'Alliums'],
    academic_concepts: { Science: ['Plant Parts'] },
  };

  it('round-trips both C02 fields from their text[] columns into the corpus record', () => {
    const record = buildCorpusRecord(fullRow, normalizeBody(fullRow.content_text));
    expect(record.cooking_skills).toEqual(['Knife Skills', 'Sautéing & Stir-Frying']);
    expect(record.main_ingredients).toEqual(['Nightshades', 'Tomatoes', 'Alliums']);
  });

  it('emits the supplied (normalized) body and id/title, and keeps academic_concepts', () => {
    const record = buildCorpusRecord(fullRow, 'overridden body text');
    expect(record.id).toBe('lesson-c02');
    expect(record.title).toBe('Knife Skills with Tomatoes');
    expect(record.content_text).toBe('overridden body text');
    expect(record.academic_concepts).toEqual({ Science: ['Plant Parts'] });
  });

  it('maps a null text[] column (incl. the C02 fields) to null in the record', () => {
    const record = buildCorpusRecord(
      { ...fullRow, cooking_skills: null, main_ingredients: null },
      normalizeBody(fullRow.content_text)
    );
    expect(record.cooking_skills).toBeNull();
    expect(record.main_ingredients).toBeNull();
  });
});
