/**
 * Deterministic, code-enforced mechanical tagging rules for Stage 2 re-tag.
 *
 * Two dry-run rounds proved that both claude-opus-4-7 and claude-opus-4-8
 * ignore certain mechanical tagging rules no matter how the prompt states
 * them (the `academic` activity_type exclusivity rule failed 11/15, 10/15,
 * 9/15 across two prompt formulations and two models). Supervisor decision:
 * enforce these rules in CODE, deterministically, in the validation layer —
 * the design §6 principle "Zod + repair pass remains the backstop".
 *
 * Rules enforced here (dry-run policy-violation findings R1/R4/R5):
 *
 *   R1 — `academic` activity_type exclusivity. `academic` is the
 *        by-elimination fallback: if a real activity MODE (cooking / garden /
 *        craft) is present, `academic` is dropped. Activity mode wins.
 *   R4 — academic_concepts ⇄ academic_integration reconciliation. A subject
 *        carrying framework concepts is evidence of integration, so a subject
 *        with non-empty `framework` that is missing from `academic_integration`
 *        gets ADDED. A subject in `academic_integration` with NO concepts is
 *        left alone (it may be legitimate) — the validation summary flags it
 *        separately; this function never removes integration subjects.
 *   R5 — synonym-pair lint. A synonym pair whose `everyday` string is not
 *        verbatim-present in that subject's `everyday` array, OR whose
 *        `framework` string is not in that subject's `framework` array, is
 *        DROPPED. Garbage pairs are worse than fewer pairs (they feed the
 *        search_synonyms PR).
 *
 * normalizeRecordInput is PURE (no mutation of its argument), IDEMPOTENT
 * (re-normalizing normalized output is a no-op), and NEVER silent (every
 * applied rule is named in the returned `normalizations` list). run-retag,
 * generate-diff-report, and validate-output all route raw tool_use input
 * through it so the persisted + diffed + applied values are the normalized
 * ones.
 */

/** Stable rule keys recorded in a record's `normalizations` provenance list
 *  and counted in the validation summary. Subject-scoped rules append
 *  `:<subject>` (one entry per affected subject). */
export const NORMALIZATION_RULES = {
  /** R1 — removed `academic` because a mode tag was also present. */
  academicExclusivityStrip: 'academic-exclusivity-strip',
  /** R4 — added a concept-bearing subject to academic_integration. */
  conceptsIntegrationAdd: 'concepts-integration-add',
  /** R5 — dropped one or more ungrounded synonym pairs for a subject. */
  synonymPairDrop: 'synonym-pair-drop',
} as const;

export interface NormalizationResult {
  /** A normalized DEEP COPY of the input (or the input unchanged when it is
   *  not a plain object — nothing to normalize). */
  rawInput: unknown;
  /** Every rule applied, in rule order. Empty when nothing changed. */
  normalizations: string[];
}

const ACTIVITY_MODE_TAGS = ['cooking', 'garden', 'craft'] as const;
const ACADEMIC_TAG = 'academic';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/**
 * R1 — strip `academic` from activity_type when any real activity mode tag is
 * also present. Mutates the working copy in place; pushes the rule name when
 * a strip happened.
 */
function applyAcademicExclusivity(work: Record<string, unknown>, normalizations: string[]): void {
  const activityType = work.activity_type;
  if (!isStringArray(activityType)) return;
  const hasMode = activityType.some((tag) =>
    (ACTIVITY_MODE_TAGS as readonly string[]).includes(tag)
  );
  if (hasMode && activityType.includes(ACADEMIC_TAG)) {
    work.activity_type = activityType.filter((tag) => tag !== ACADEMIC_TAG);
    normalizations.push(NORMALIZATION_RULES.academicExclusivityStrip);
  }
}

/**
 * R4 — add every concept-bearing subject (non-empty `framework`) that is
 * missing from academic_integration. Never removes; never reorders existing
 * entries (additions append in subject-key order).
 */
function applyConceptsIntegrationReconcile(
  work: Record<string, unknown>,
  normalizations: string[]
): void {
  const concepts = work.academic_concepts;
  if (!isPlainObject(concepts)) return;
  const integration = work.academic_integration;
  if (!isStringArray(integration)) return;

  const present = new Set(integration);
  const additions: string[] = [];
  for (const [subject, value] of Object.entries(concepts)) {
    if (!isPlainObject(value)) continue;
    const framework = value.framework;
    if (!isStringArray(framework) || framework.length === 0) continue;
    if (!present.has(subject)) {
      present.add(subject);
      additions.push(subject);
      normalizations.push(`${NORMALIZATION_RULES.conceptsIntegrationAdd}:${subject}`);
    }
  }
  if (additions.length > 0) {
    work.academic_integration = [...integration, ...additions];
  }
}

/**
 * R5 — drop synonym pairs whose `everyday` is not verbatim in the subject's
 * `everyday` array or whose `framework` is not in the subject's `framework`
 * array. One provenance entry per affected subject (regardless of how many
 * pairs that subject lost).
 */
function applySynonymPairLint(work: Record<string, unknown>, normalizations: string[]): void {
  const concepts = work.academic_concepts;
  if (!isPlainObject(concepts)) return;

  for (const [subject, value] of Object.entries(concepts)) {
    if (!isPlainObject(value)) continue;
    const pairs = value.synonym_pairs;
    if (!Array.isArray(pairs) || pairs.length === 0) continue;
    const everyday = isStringArray(value.everyday) ? new Set(value.everyday) : new Set<string>();
    const framework = isStringArray(value.framework) ? new Set(value.framework) : new Set<string>();

    const kept = pairs.filter((pair) => {
      if (!isPlainObject(pair)) return false;
      const pairEveryday = pair.everyday;
      const pairFramework = pair.framework;
      if (typeof pairEveryday !== 'string' || typeof pairFramework !== 'string') return false;
      return everyday.has(pairEveryday) && framework.has(pairFramework);
    });

    if (kept.length !== pairs.length) {
      value.synonym_pairs = kept;
      normalizations.push(`${NORMALIZATION_RULES.synonymPairDrop}:${subject}`);
    }
  }
}

/**
 * Apply every mechanical rule to a raw tool_use input object. Returns a deep
 * copy plus the provenance list. Non-object input is returned untouched (there
 * is nothing to normalize — e.g. an errored record's `null` rawInput).
 */
export function normalizeRecordInput(rawInput: unknown): NormalizationResult {
  if (!isPlainObject(rawInput)) {
    return { rawInput, normalizations: [] };
  }
  // Deep copy so the rules never mutate the caller's object. The tool output
  // is JSON (enum strings, arrays, plain objects), so a JSON round-trip is a
  // safe, dependency-free deep clone here.
  const work = JSON.parse(JSON.stringify(rawInput)) as Record<string, unknown>;
  const normalizations: string[] = [];

  applyAcademicExclusivity(work, normalizations);
  applyConceptsIntegrationReconcile(work, normalizations);
  applySynonymPairLint(work, normalizations);

  return { rawInput: work, normalizations };
}
