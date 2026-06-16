/**
 * Document-surfaces sidecar (B2.5).
 *
 * Grade/season claims for an ESYNYC lesson can live in its Google Drive
 * FILENAME ("...Indoors 3K/PK") and its page HEADER ("Fall/Spring") — surfaces
 * that `lessons.content_text` does NOT capture (document extraction drops the
 * filename and the running-header part). The user ruled (rulings doc §A20)
 * that these are source-doc claims the re-tag pipeline must honor, and the
 * freshly-built answer key already encodes header-derived grades/seasons. So
 * the B3 contestant runs must see the same surfaces to be scoreable fairly.
 *
 * This module loads a checked-in sidecar (`data/doc-surfaces.json`,
 * transcribed from the 2026-06-12 Drive sweep) and exposes a pure helper that
 * appends a clearly-delimited filename/header block to a lesson body. The
 * sidecar currently covers ONLY the answer-key sample lessons; a corpus-wide
 * capture is pending before B4. Lessons absent from the sidecar get a
 * byte-identical body (no block appended), so the full-corpus run works
 * unchanged before that capture lands.
 *
 * A missing sidecar file is NON-fatal: the runner warns once and proceeds with
 * no surfaces. A present-but-malformed file throws (loud, not silent).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/** The checked-in sidecar path. */
export const DEFAULT_DOC_SURFACES_PATH = path.join(MODULE_DIR, 'data', 'doc-surfaces.json');

/** One lesson's document surfaces. `header` is null when the doc had no header
 *  part, an unfilled template header, or a blank header segment. */
export interface DocSurface {
  filename: string;
  header: string | null;
}

const docSurfaceSchema = z.object({
  filename: z.string().min(1),
  header: z.string().nullable(),
});

/** Sidecar file schema: a provenance block + an id→surface map. */
export const docSurfacesFileSchema = z.object({
  _provenance: z.record(z.unknown()),
  surfaces: z.record(docSurfaceSchema),
});

export type DocSurfacesFile = z.infer<typeof docSurfacesFileSchema>;

/**
 * Loads the sidecar into a Map<lesson_id, DocSurface>. A MISSING file warns
 * once and returns an empty map (the runner proceeds with no surfaces); a
 * present-but-schema-invalid file throws (loud failure, never silent).
 */
export function loadDocSurfaces(
  filePath: string = DEFAULT_DOC_SURFACES_PATH
): Map<string, DocSurface> {
  if (!existsSync(filePath)) {
    console.warn(
      `note: doc-surfaces sidecar not found at ${filePath} — proceeding with no ` +
        'document filename/header surfaces (lesson bodies sent unchanged).'
    );
    return new Map();
  }
  const parsed = docSurfacesFileSchema.parse(JSON.parse(readFileSync(filePath, 'utf8')));
  return new Map(Object.entries(parsed.surfaces));
}

/**
 * One-sentence note framing the surfaces as document-level claims, so the
 * classifier treats them with the same authority as in-body header fields
 * (grades/seasons may live here and nowhere in the body text).
 */
export const DOC_SURFACES_NOTE =
  'The following are document-level metadata from the source file (its Drive ' +
  'filename and page header); grades and seasons may be stated here and nowhere ' +
  'in the body above. Treat them as source-doc claims.';

/**
 * Renders the delimited surfaces block (pure, unit-tested). The filename line
 * is always present; the header line is OMITTED when `header` is null.
 */
export function renderDocSurfacesBlock(surface: DocSurface): string {
  const lines = [
    '--- Source document surfaces ---',
    DOC_SURFACES_NOTE,
    '',
    `Document filename: ${surface.filename}`,
  ];
  if (surface.header !== null) {
    lines.push(`Document page header: ${surface.header}`);
  }
  return lines.join('\n');
}

/**
 * Appends the surfaces block to a lesson body. When `surface` is undefined
 * (lesson absent from the sidecar) the body is returned BYTE-IDENTICAL, so the
 * full-corpus run is unchanged before the corpus-wide capture lands.
 */
export function appendDocSurfaces(body: string, surface: DocSurface | undefined): string {
  if (surface === undefined) return body;
  return `${body}\n\n${renderDocSurfacesBlock(surface)}`;
}
