/**
 * Private name-worksheet parsing (Drive provenance, Phase 5).
 *
 * The worksheets are PRIVATE evidence (owner-readable only, never committed).
 * Expected header (both the final and recovery worksheets use it):
 *   account_email, observed_drive_display_names, created_file_candidates,
 *   created_lesson_candidates, adapted_file_candidates,
 *   adapted_lesson_candidates, adapted_with_other_known_editors_files,
 *   approved_public_name, decision_approve_or_omit, notes
 *
 * Only account_email + approved_public_name + decision_approve_or_omit are
 * consumed. Errors reference ROW NUMBERS only — never row content.
 */

// Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF). Deterministic;
// no dependencies.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // Drop fully-empty trailing rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const REQUIRED_COLUMNS = ['account_email', 'approved_public_name', 'decision_approve_or_omit'];

/**
 * Parse one worksheet CSV into entries. Throws (row-number-only messages) on
 * structural problems; never includes cell content in an error.
 *
 * @returns {Array<{accountEmail: string, decision: 'approve'|'omit', publicName: string|null}>}
 */
export function parseWorksheet(text, label = 'worksheet') {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error(`${label}: empty file`);
  const header = rows[0].map((h) => h.trim());
  const idx = {};
  for (const col of REQUIRED_COLUMNS) {
    const i = header.indexOf(col);
    if (i === -1) throw new Error(`${label}: missing required column "${col}"`);
    idx[col] = i;
  }
  const entries = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const accountEmail = (cells[idx.account_email] ?? '').trim().toLowerCase();
    const rawDecision = (cells[idx.decision_approve_or_omit] ?? '').trim().toLowerCase();
    const publicName = (cells[idx.approved_public_name] ?? '').trim();
    if (!accountEmail) {
      throw new Error(`${label}: row ${r + 1} has an empty account_email`);
    }
    if (rawDecision !== 'approve' && rawDecision !== 'omit') {
      throw new Error(
        `${label}: row ${r + 1} has an unrecognized decision (expected approve|omit)`
      );
    }
    if (rawDecision === 'approve' && publicName === '') {
      throw new Error(`${label}: row ${r + 1} approves without an approved_public_name`);
    }
    entries.push({
      accountEmail,
      decision: rawDecision,
      publicName: publicName === '' ? null : publicName,
    });
  }
  return entries;
}

/**
 * Merge worksheet entry lists (later files may ADD accounts). A duplicate
 * account with a CONFLICTING decision/name is a hard error (row content never
 * printed); an identical duplicate is tolerated.
 *
 * @returns {Map<string, {decision: 'approve'|'omit', publicName: string|null}>}
 */
export function mergeWorksheets(entryLists) {
  const merged = new Map();
  for (const entries of entryLists) {
    for (const e of entries) {
      const existing = merged.get(e.accountEmail);
      if (existing) {
        if (existing.decision !== e.decision || existing.publicName !== e.publicName) {
          throw new Error(
            `worksheets disagree for one account (conflicting decision or name) — resolve before running`
          );
        }
        continue;
      }
      merged.set(e.accountEmail, { decision: e.decision, publicName: e.publicName });
    }
  }
  return merged;
}
