/**
 * Actor-map regeneration via the approved-account "isCurrentUser" sweep
 * (Drive provenance, Gate 2 tooling — SUPERVISED, LOCAL-ONLY; this mechanism
 * never ships in deployed runtime behavior).
 *
 * Drive Activity identifies actors as opaque `people/NNN` resource names with
 * no email — EXCEPT that when the QUERYING identity is the actor, the
 * response marks `knownUser.isCurrentUser: true`. Querying the same file's
 * activity as each approved account therefore reveals which `people/NNN` is
 * which account, one account at a time — the exact method the 2026-07-17
 * investigation proved ("approved-account sweep").
 *
 * This module is the PURE bookkeeping; the CLI supplies identities at runtime
 * and does the IO. Nothing here logs emails or ids.
 */

/**
 * Collect the unresolved CREATE actors across files:
 *   personName → Set<fileId> for every person-actor CREATE whose personName
 *   is not yet in actorMap. Null/absent personNames (non-person or ambiguous
 *   actors) are skipped — they can never resolve and the decision layer
 *   already fails closed on them.
 *
 * @param {Map<string, Array<{personName: string|null}>>} perFileCreates
 * @param {Map<string, string>} actorMap personName → account email
 * @returns {Map<string, Set<string>>}
 */
export function collectUnresolvedCreators(perFileCreates, actorMap) {
  const unresolved = new Map();
  for (const [fileId, creates] of perFileCreates) {
    for (const action of creates) {
      const p = action.personName;
      if (!p || actorMap.has(p)) continue;
      const set = unresolved.get(p);
      if (set) set.add(fileId);
      else unresolved.set(p, new Set([fileId]));
    }
  }
  return unresolved;
}

/**
 * Apply one (subject, file) sweep observation: every activity actor the
 * response marks isCurrentUser — CREATEs and EDITs alike, both identify the
 * querying subject — resolves that personName to the subject's email.
 * A CONFLICT (personName already mapped to a different email) is a hard
 * error: two different querying subjects can never both be the same person.
 *
 * @param {Map<string, string>} actorMap mutated in place
 * @param {string} subjectEmail
 * @param {Array<{personName: string|null, isCurrentUser: boolean}>} actions
 * @returns {string[]} newly resolved personNames
 */
export function applySweepObservation(actorMap, subjectEmail, actions) {
  const resolved = [];
  for (const action of actions) {
    if (!action.isCurrentUser || !action.personName) continue;
    const existing = actorMap.get(action.personName);
    if (existing === undefined) {
      actorMap.set(action.personName, subjectEmail);
      resolved.push(action.personName);
    } else if (existing !== subjectEmail) {
      throw new Error(
        'sweep conflict: one activity person resolved to two different accounts — aborting'
      );
    }
  }
  return resolved;
}

/**
 * The files worth querying for a given subject: only those still carrying an
 * unresolved CREATE actor. Keeps the sweep's API cost shrinking as actors
 * resolve.
 */
export function filesStillUnresolved(unresolved) {
  const files = new Set();
  for (const set of unresolved.values()) for (const f of set) files.add(f);
  return [...files];
}
