/**
 * Historical creator acceptance rules (Drive provenance, Phase 5).
 *
 * PURE decision logic — the supervised backfill CLI feeds it per-file
 * evidence; these rules are the EXACT locked acceptance rules:
 *   1. one CREATE with one known human actor + an approved worksheet name → accept;
 *   2. multiple CREATEs accepted only when every CREATE resolves to the same
 *      one known actor AND every action agrees on subtype (new|copy) —
 *      otherwise omit as ambiguous;
 *   3. copy/adapted attribution additionally requires a later EDIT by the
 *      same actor;
 *   4. worksheet omit, unresolved/unknown actor, unsafe approved name,
 *      non-person actor, native-MIME mismatch, or any ambiguity → omit;
 *   5. source is 'drive_activity', attribution 'created'|'adapted';
 *      verification timestamp is stamped at backfill time (by the CLI);
 *   6. owner / revision actor / submitter / reviewer / inferred email-name
 *      expansion are never inputs here — the evidence shape doesn't carry them.
 *
 * Deterministic and side-effect-free; attribution.test.mjs covers every
 * branch with synthetic identities only.
 */

import { NATIVE_GOOGLE_DOC_MIME, isValidPublicCreatorName } from './driveUrl.mjs';

// ---------------------------------------------------------------------------
// Activity-timestamp helpers. RFC 3339 strings from Google carry 0/3/6/9
// fractional digits, so LEXICOGRAPHIC comparison is NOT chronological
// ('…00.900Z' < '…00Z' as strings but is 900ms LATER). Everything compares in
// parsed epoch milliseconds; unparseable/absent values are null and every
// comparison involving null — and exact equality — fails closed (not "later").
// ---------------------------------------------------------------------------

/** RFC 3339 string → epoch millis, or null when absent/unparseable. */
export function parseActivityTimestamp(ts) {
  if (typeof ts !== 'string' || ts === '') return null;
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? null : ms;
}

/** Epoch millis of the LAST parseable create timestamp; null when none parse. */
export function lastCreateMillis(createTimestamps) {
  let last = null;
  for (const ts of createTimestamps ?? []) {
    const ms = parseActivityTimestamp(ts);
    if (ms !== null && (last === null || ms > last)) last = ms;
  }
  return last;
}

/** STRICTLY-after test; null on either side (and equality) is NOT later. */
export function isLaterThan(editTs, lastCreateMs) {
  if (lastCreateMs === null) return false;
  const editMs = parseActivityTimestamp(editTs);
  return editMs !== null && editMs > lastCreateMs;
}

/**
 * @typedef {Object} CreateAction
 * @property {string|null} actorEmail  resolved account email, or null when the
 *   actor could not be resolved to a known account
 * @property {boolean} actorIsPerson  false for system/deleted/anonymous actors
 * @property {'new'|'copy'|'upload'|'unknown'} subtype  Drive Activity create origin
 */

/**
 * @typedef {Object} AttributionEvidence
 * @property {string|null} mimeType
 * @property {CreateAction[]} createActions
 * @property {string[]} laterEditActorEmails  resolved emails with an EDIT
 *   AFTER the (last) create action
 * @property {Map<string, {decision: 'approve'|'omit', publicName: string|null}>} worksheet
 *   account_email → human decision (merged worksheets)
 */

/**
 * @returns {{accept: true, attribution: 'created'|'adapted', name: string, actorEmail: string}
 *         | {accept: false, reason: string}}
 */
export function decideAttribution(evidence) {
  const { mimeType, createActions, laterEditActorEmails, worksheet } = evidence;

  if (mimeType !== NATIVE_GOOGLE_DOC_MIME) {
    return { accept: false, reason: 'non_native' };
  }
  if (!Array.isArray(createActions) || createActions.length === 0) {
    return { accept: false, reason: 'create_missing' };
  }

  // Every CREATE must have a resolved, human actor.
  for (const action of createActions) {
    if (!action.actorIsPerson) return { accept: false, reason: 'actor_nonperson' };
    if (!action.actorEmail) return { accept: false, reason: 'actor_unresolved' };
  }

  // All CREATEs must agree on ONE actor…
  const actorEmails = new Set(createActions.map((a) => a.actorEmail));
  if (actorEmails.size > 1) return { accept: false, reason: 'cross_actor_ambiguous' };
  const actorEmail = createActions[0].actorEmail;

  // …and on ONE subtype, which must be a supported one.
  const subtypes = new Set(createActions.map((a) => a.subtype));
  if (subtypes.size > 1) return { accept: false, reason: 'subtype_mismatch' };
  const subtype = createActions[0].subtype;
  if (subtype !== 'new' && subtype !== 'copy') {
    return { accept: false, reason: 'unsupported_subtype' };
  }

  // Worksheet gate: the human-approved name is the ONLY name source.
  const entry = worksheet.get(actorEmail);
  if (!entry) return { accept: false, reason: 'unmapped' };
  if (entry.decision !== 'approve') return { accept: false, reason: 'worksheet_omit' };
  if (!isValidPublicCreatorName(entry.publicName)) {
    return { accept: false, reason: 'unsafe_name' };
  }

  // Copy → adapted only when the same person demonstrably developed it after.
  if (subtype === 'copy' && !laterEditActorEmails.includes(actorEmail)) {
    return { accept: false, reason: 'copy_without_edit' };
  }

  return {
    accept: true,
    attribution: subtype === 'copy' ? 'adapted' : 'created',
    name: entry.publicName,
    actorEmail,
  };
}
