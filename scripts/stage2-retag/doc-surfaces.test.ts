/**
 * Tests for the document-surfaces sidecar (B2.5, TDD).
 *
 * The sidecar (`data/doc-surfaces.json`) carries each answer-key lesson's
 * Google Drive FILENAME and page-HEADER text — source-doc grade/season claims
 * that `lessons.content_text` lacks (ruling §A20). The runner appends these to
 * the per-lesson prompt input so the B3 contestant runs are scoreable against
 * the header-derived answer key.
 *
 * Every literal data assertion below is transcribed from the checked-in
 * artifacts (the sweep file + the worksheet L#→id map + the exclusions file),
 * never from memory.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_DOC_SURFACES_PATH,
  appendDocSurfaces,
  docSurfacesFileSchema,
  loadDocSurfaces,
  renderDocSurfacesBlock,
  type DocSurface,
} from './doc-surfaces';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Checked-in data file integrity
// ---------------------------------------------------------------------------

describe('data/doc-surfaces.json (checked-in sidecar)', () => {
  const raw = JSON.parse(readFileSync(DEFAULT_DOC_SURFACES_PATH, 'utf8')) as unknown;
  const parsed = docSurfacesFileSchema.parse(raw);

  it('parses against the Zod file schema', () => {
    expect(parsed.surfaces).toBeTypeOf('object');
  });

  it('carries a top-level provenance block citing the 2026-06-12 Drive sweep', () => {
    expect(parsed._provenance.source).toContain('Drive');
    expect(parsed._provenance.source).toContain('2026-06-12');
    // corpus-wide capture is flagged as still pending before B4
    expect(JSON.stringify(parsed._provenance).toLowerCase()).toContain('pending');
  });

  it('has exactly 57 surviving (non-excluded) key lessons', () => {
    expect(Object.keys(parsed.surfaces)).toHaveLength(57);
  });

  it('excludes the 3 answer-key-exclusions ids', () => {
    const exclusions = JSON.parse(
      readFileSync(path.join(MODULE_DIR, 'data/answer-key-exclusions.json'), 'utf8')
    ) as { excluded: Array<{ id: string }> };
    for (const { id } of exclusions.excluded) {
      expect(parsed.surfaces[id]).toBeUndefined();
    }
  });

  it('matches every id present in answer-key.final.jsonl (1:1)', () => {
    const finalIds = readFileSync(path.join(MODULE_DIR, 'artifacts/answer-key.final.jsonl'), 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => (JSON.parse(line) as { id: string }).id);
    const surfaceIds = Object.keys(parsed.surfaces);
    expect(new Set(surfaceIds)).toEqual(new Set(finalIds));
  });

  it('stores unfilled-template / no-header lessons with header: null', () => {
    // L8 Stuffed Dates and L58 Worms K-1 are unfilled ESYNYC templates.
    expect(parsed.surfaces['lesson_362e8be6fa894f5381f85297d42944f1'].header).toBeNull();
    expect(parsed.surfaces['lesson_f2466c648cb44ed597d5b49f2d51ffbd'].header).toBeNull();
  });

  it('preserves filled header text (e.g. the §A20 I-spy case L11)', () => {
    const l11 = parsed.surfaces['lesson_727ff8bd39e44c7eaa1439302f02c93a'];
    expect(l11.filename).toBe('I spy...in the garden! Indoors 3K/PK');
    expect(l11.header).toBe('3K/PK / Fall/Spring / Indoors / Year B');
  });

  it('strips the sweep annotation noise — no "(header)" tokens leak into stored text', () => {
    for (const s of Object.values(parsed.surfaces)) {
      expect(s.filename).not.toMatch(/\(header\)|\(filename\)/);
      if (s.header !== null) {
        expect(s.header).not.toMatch(/\(header\)|\(filename\)|^NONE|^TEMPLATE/);
        // the visible vertical-tab glyph is normalized away
        expect(s.header).not.toContain('␋');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

describe('docSurfacesFileSchema', () => {
  it('requires filename and allows header string|null', () => {
    const ok = {
      _provenance: { source: 'x' },
      surfaces: {
        a: { filename: 'A.docx', header: 'K-2 / Fall' },
        b: { filename: 'B', header: null },
      },
    };
    expect(() => docSurfacesFileSchema.parse(ok)).not.toThrow();
  });

  it('rejects a surface missing filename', () => {
    const bad = { _provenance: {}, surfaces: { a: { header: null } } };
    expect(() => docSurfacesFileSchema.parse(bad)).toThrow();
  });

  it('rejects a non-string header', () => {
    const bad = { _provenance: {}, surfaces: { a: { filename: 'A', header: 3 } } };
    expect(() => docSurfacesFileSchema.parse(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// loadDocSurfaces
// ---------------------------------------------------------------------------

describe('loadDocSurfaces', () => {
  it('returns a Map keyed by lesson id', () => {
    const map = loadDocSurfaces();
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(57);
    const l11 = map.get('lesson_727ff8bd39e44c7eaa1439302f02c93a');
    expect(l11?.filename).toBe('I spy...in the garden! Indoors 3K/PK');
  });

  it('warns once and returns an empty map when the file is missing (no crash)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const missing = path.join(tmpdir(), 'definitely-not-here-doc-surfaces.json');
    const map = loadDocSurfaces(missing);
    expect(map.size).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('doc-surfaces');
  });

  it('throws on a malformed (schema-invalid) file rather than silently ignoring', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'doc-surfaces-'));
    const bad = path.join(dir, 'bad.json');
    writeFileSync(bad, JSON.stringify({ surfaces: { a: { header: 'no filename' } } }));
    expect(() => loadDocSurfaces(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// renderDocSurfacesBlock + appendDocSurfaces (pure, byte-identical no-op)
// ---------------------------------------------------------------------------

describe('renderDocSurfacesBlock', () => {
  it('includes filename + header lines and the document-claim note', () => {
    const surface: DocSurface = { filename: 'Foo.docx', header: 'K-2 / Fall' };
    const block = renderDocSurfacesBlock(surface);
    expect(block).toContain('Document filename: Foo.docx');
    expect(block).toContain('Document page header: K-2 / Fall');
    expect(block.toLowerCase()).toContain('document-level');
  });

  it('omits the header line entirely when header is null', () => {
    const surface: DocSurface = { filename: 'Bar', header: null };
    const block = renderDocSurfacesBlock(surface);
    expect(block).toContain('Document filename: Bar');
    expect(block).not.toContain('Document page header:');
  });
});

describe('appendDocSurfaces', () => {
  const body = 'lesson body text';

  it('is byte-identical to the input body when surface is undefined', () => {
    expect(appendDocSurfaces(body, undefined)).toBe(body);
  });

  it('appends a clearly-delimited block when a surface is present', () => {
    const out = appendDocSurfaces(body, { filename: 'Foo.docx', header: 'K-2 / Fall' });
    expect(out.startsWith(body)).toBe(true);
    expect(out).not.toBe(body);
    expect(out).toContain('Document filename: Foo.docx');
    expect(out).toContain('Document page header: K-2 / Fall');
  });

  it('appends only the filename line when header is null', () => {
    const out = appendDocSurfaces(body, { filename: 'Bar', header: null });
    expect(out).toContain('Document filename: Bar');
    expect(out).not.toContain('Document page header:');
  });
});
