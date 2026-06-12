#!/usr/bin/env python3
"""
Generate the PR 5b concepts-canonicalization migration SQL from the
committed vocabulary artifact.

Input:  data/vocab/academic-concepts.vocab.json (emitted by
        scripts/emit-concepts-vocab.py from the RETURNED Stage 1 verdict
        record). Override with --artifact PATH (self-check testing only).
Output: full migration SQL on stdout — redirect into
        supabase/migrations/<datestamp>_pr5b_concepts_canonicalization.sql
        and commit the result. The mapping VALUES list is never hand-typed.

Unlike PR 5a (heritage), concepts has NO flat column: the rewrite edits
`metadata->'academicConcepts'` in place (locked design §4.4/§4.5). Per
subject array each element is mapped through the artifact's non-identity
alias pairs (corpus literal → canonical SURFACE LABEL, the stored Title
Case form — not the snake_case canonical key), the 7 worksheet-drop
literals are deleted, elements are deduped preserving first-occurrence
order, subject keys whose arrays empty are removed, and if the whole
object empties the `academicConcepts` key is removed entirely (matches
the corpus convention that concept-less rows lack the key). Subject keys
are otherwise untouched (no moves — locked design §4.5). Live rows only
(retired_at IS NULL). Idempotent: canonical labels are not in the alias
or drop literal sets (checked below), so a re-run matches zero rows.

Self-checks (fail loudly, no silent emit):
  * every alias target key resolves to a canonical entry;
  * every pair RHS is a canonical surface label distinct from its LHS —
    identity pairs are filtered mechanically (B.1 found zero, not assumed);
  * drop list == the artifact's 7 worksheet-drop literals exactly;
  * no literal appears in both alias_map and drops;
  * idempotency guard: no pair RHS label is itself a non-identity alias
    LHS or a drop literal (a re-run would rewrite/delete it again);
  * pair count == 208 − 7 drops − <identity count>; count logged to stderr.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ARTIFACT = REPO_ROOT / "data" / "vocab" / "academic-concepts.vocab.json"

EXPECTED_DISTINCT_LITERALS = 208
EXPECTED_DROPS = {
    "design",
    "discussion",
    "food systems",
    "garden topics",
    "general exploration",
    "historical context",
    "plant science",
}


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def build_pairs(artifact: dict) -> tuple[list[tuple[str, str]], list[str], int]:
    """Return (non-identity alias→label pairs, sorted drop literals, identity count)."""
    errors: list[str] = []
    label_by_key = {c["key"]: c["label"] for c in artifact["canonical"]}

    labels = [c["label"] for c in artifact["canonical"]]
    if len(set(labels)) != len(labels):
        dupes = sorted({x for x in labels if labels.count(x) > 1})
        errors.append(f"canonical labels not unique: {dupes}")

    drops = sorted(artifact["drops"])
    if set(drops) != EXPECTED_DROPS or len(artifact["drops"]) != len(EXPECTED_DROPS):
        errors.append(
            f"drop list != expected 7 worksheet drops:"
            f" got {drops}, expected {sorted(EXPECTED_DROPS)}"
        )

    overlap = set(artifact["alias_map"]) & set(artifact["drops"])
    if overlap:
        errors.append(f"literals in BOTH alias_map and drops: {sorted(overlap)}")

    pairs: list[tuple[str, str]] = []
    identity_count = 0
    for literal, target_key in sorted(artifact["alias_map"].items()):
        label = label_by_key.get(target_key)
        if label is None:
            errors.append(
                f"alias {literal!r}: target key {target_key!r} has no canonical entry"
            )
            continue
        if literal == label:
            identity_count += 1  # mechanically filtered, never assumed absent
            continue
        pairs.append((literal, label))

    canonical_labels = set(label_by_key.values())
    for literal, label in pairs:
        if label not in canonical_labels:
            errors.append(f"pair RHS {label!r} is not a canonical surface label")

    # Idempotency guard: a rewritten value must never itself be rewritable
    # or droppable on a re-run.
    lhs_literals = {lit for lit, _ in pairs}
    rhs_labels = {label for _, label in pairs}
    not_idempotent = rhs_labels & (lhs_literals | set(drops))
    if not_idempotent:
        errors.append(
            f"idempotency violation — these RHS labels are also alias LHS"
            f" literals or drop literals: {sorted(not_idempotent)}"
        )

    expected_pairs = EXPECTED_DISTINCT_LITERALS - len(EXPECTED_DROPS) - identity_count
    if len(pairs) != expected_pairs:
        errors.append(
            f"expected {expected_pairs} non-identity pairs"
            f" (208 − 7 drops − {identity_count} identity), found {len(pairs)}"
        )

    if errors:
        raise ValueError("\n".join(errors))
    return pairs, drops, identity_count


def render_values(pairs: list[tuple[str, str]], indent: str) -> str:
    return (",\n" + indent).join(
        f"({sql_quote(alias)}, {sql_quote(canonical)})" for alias, canonical in pairs
    )


def render_in_list(literals: list[str], indent: str, per_line: int = 4) -> str:
    lines: list[str] = []
    line: list[str] = []
    for lit in literals:
        line.append(sql_quote(lit))
        if len(line) == per_line:
            lines.append(", ".join(line))
            line = []
    if line:
        lines.append(", ".join(line))
    return (",\n" + indent).join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--artifact",
        type=Path,
        default=DEFAULT_ARTIFACT,
        help="vocab artifact path (override for self-check testing only)",
    )
    args = parser.parse_args()

    artifact = json.loads(args.artifact.read_text(encoding="utf-8"))
    try:
        pairs, drops, identity_count = build_pairs(artifact)
    except ValueError as exc:
        print(f"GENERATOR SELF-CHECK FAILURE:\n{exc}", file=sys.stderr)
        return 1

    print(
        f"self-check OK: {len(pairs)} non-identity pairs"
        f" (identity filtered: {identity_count}); drops: {len(drops)}",
        file=sys.stderr,
    )

    # Every literal the migration must eliminate from live rows:
    # non-identity alias LHS literals + the 7 drop literals.
    bad_literals = sorted({lit for lit, _ in pairs} | set(drops))

    values_4 = render_values(pairs, " " * 4)
    drops_4 = (",\n" + " " * 4).join(f"({sql_quote(d)})" for d in drops)
    bad_in_8 = render_in_list(bad_literals, " " * 8)
    bad_array_8 = render_in_list(bad_literals, " " * 8)
    provenance = artifact["provenance"]

    print(f"""\
-- =====================================================
-- Migration: pr5b_concepts_canonicalization
-- =====================================================
-- GENERATED by scripts/generate-concepts-rewrite-migration.py from
-- data/vocab/academic-concepts.vocab.json — regenerate, don't hand-edit.
--   artifact source: {provenance["source"]}
--   artifact source_commit: {provenance["source_commit"]}
--   artifact emitted: {provenance["emitted"]}
--
-- Description: Rewrite every live metadata->'academicConcepts' value to its
-- Stage-1-locked canonical Title Case surface label (PR 5b — D4 vocabulary
-- canonicalization, concepts at scale). {len(pairs)} non-identity rewrites
-- (every stored literal is lowercase; canonical labels are Title Case, so
-- essentially every appearance rewrites — incl. 82 worksheet folds and the
-- `sorting` → "Sorting and Categorization" rename) + {len(drops)} worksheet-drop
-- literals deleted from rows (worksheet §10 contract).
--
-- Mechanism notes (design doc 2026-06-11-…-pr5-canonicalization-design.md §4):
--   * Concepts has NO flat column — the rewrite edits the jsonb key in
--     place. Shape ({{Subject: [concepts]}}) and subject keys are untouched
--     (no moves — §4.5); only array VALUES change.
--   * Per subject array: map literal → canonical LABEL, delete drop
--     literals, dedupe preserving first-occurrence order (folds can collide
--     with an existing co-tag). Subject keys whose arrays empty are removed;
--     if the whole object empties, the academicConcepts key is removed
--     entirely (Session-3 decision — concept-less rows lack the key).
--   * No cross-subject dedup: each subject array is rewritten independently
--     (the same canonical label may legitimately appear under two subjects).
--   * update_lesson_search_vector_trigger (UPDATE OF metadata, 20260521000000
--     + 20260523000000 helper) regenerates search_vector row-by-row.
--     lessons_normalize_write (20260518000000) also fires; its §A
--     academicIntegration.concepts rescue is inert corpus-wide and §J/§V
--     don't touch academicConcepts.
--   * Live rows only (retired_at IS NULL) — the 21 soft-retired imports
--     keep their archival vocabulary (user decision 2026-06-11).
--   * Non-array subject values pass through untouched (none exist in the
--     corpus — all 216 (subject, array) pairs verified array-shaped on TEST
--     2026-06-11; the guard mirrors 20260523000000's shape hardening).
--   * Idempotent: canonical labels are in neither the alias nor the drop
--     literal sets (generator-checked), so re-running the UPDATE matches
--     zero rows; the snapshot INSERT is ON CONFLICT DO NOTHING, so re-runs
--     never overwrite original pre-rewrite values.

-- =====================================================
-- (1) Rollback snapshot — original values of every row the rewrite touches
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pr5b_concepts_rollback (
  lesson_id text PRIMARY KEY,
  metadata_academicconcepts jsonb
);

-- Service-role-only: RLS enabled with NO policies.
ALTER TABLE public.pr5b_concepts_rollback ENABLE ROW LEVEL SECURITY;

INSERT INTO public.pr5b_concepts_rollback (lesson_id, metadata_academicconcepts)
SELECT l.lesson_id, l.metadata->'academicConcepts'
FROM public.lessons l
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
  AND EXISTS (
    SELECT 1
    FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END
    ) v(val)
    WHERE v.val IN (
        {bad_in_8}
    )
  )
ON CONFLICT (lesson_id) DO NOTHING;

-- =====================================================
-- (2) Rewrite: per subject array, map aliases → canonical surface labels,
--     delete drop literals, dedupe preserving first-occurrence order,
--     remove emptied subject keys / the emptied academicConcepts key
-- =====================================================

WITH alias_map(alias, canonical) AS (
  VALUES
    {values_4}
),
drop_literals(literal) AS (
  VALUES
    {drops_4}
)
UPDATE public.lessons l
SET metadata = (
  SELECT CASE
           WHEN agg.new_obj IS NULL THEN l.metadata - 'academicConcepts'
           ELSE jsonb_set(l.metadata, '{{academicConcepts}}', agg.new_obj)
         END
  FROM (
    SELECT jsonb_object_agg(per_subject.subj, per_subject.new_arr) AS new_obj
    FROM (
      SELECT s.subj,
             CASE
               WHEN jsonb_typeof(s.arr) <> 'array' THEN s.arr  -- passthrough (none in corpus)
               ELSE (
                 SELECT jsonb_agg(mapped.val ORDER BY mapped.first_ord)
                 FROM (
                   SELECT COALESCE(m.canonical, u.val) AS val, min(u.ord) AS first_ord
                   FROM jsonb_array_elements_text(s.arr) WITH ORDINALITY u(val, ord)
                   LEFT JOIN alias_map m ON m.alias = u.val
                   WHERE u.val NOT IN (SELECT literal FROM drop_literals)
                   GROUP BY COALESCE(m.canonical, u.val)
                 ) mapped
               )
             END AS new_arr
      FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
    ) per_subject
    WHERE per_subject.new_arr IS NOT NULL  -- removes subject keys whose arrays emptied
  ) agg
)
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
  AND EXISTS (
    SELECT 1
    FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END
    ) v(val)
    WHERE v.val IN (SELECT alias FROM alias_map)
       OR v.val IN (SELECT literal FROM drop_literals)
  );

-- =====================================================
-- (3) Post-verify: no alias or drop literal survives on any live row;
--     no empty subject array; no empty academicConcepts object
-- =====================================================

DO $$
DECLARE
  v_bad_literals CONSTANT text[] := ARRAY[
        {bad_array_8}
  ];
  v_literal_rows integer;
  v_empty_array_rows integer;
  v_empty_object_rows integer;
BEGIN
  SELECT count(*) INTO v_literal_rows
  FROM public.lessons l
  WHERE l.retired_at IS NULL
    AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
    AND EXISTS (
      SELECT 1
      FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
      CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END
      ) v(val)
      WHERE v.val = ANY (v_bad_literals)
    );

  SELECT count(*) INTO v_empty_array_rows
  FROM public.lessons l
  WHERE l.retired_at IS NULL
    AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
    AND EXISTS (
      SELECT 1
      FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
      WHERE s.arr = '[]'::jsonb
    );

  SELECT count(*) INTO v_empty_object_rows
  FROM public.lessons l
  WHERE l.retired_at IS NULL
    AND l.metadata->'academicConcepts' = '{{}}'::jsonb;

  IF v_literal_rows > 0 OR v_empty_array_rows > 0 OR v_empty_object_rows > 0 THEN
    RAISE EXCEPTION
      'pr5b concepts canonicalization failed post-verify: % live rows with surviving alias/drop literal, % with empty subject array, % with empty academicConcepts object',
      v_literal_rows, v_empty_array_rows, v_empty_object_rows;
  END IF;
END $$;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Restore is a FORWARD migration reading the snapshot table. jsonb_set
-- re-adds the academicConcepts key for rows whose object emptied (its
-- create-if-missing default is true); the FTS trigger refreshes
-- search_vector (UPDATE OF metadata). lessons_normalize_write's §A rescue
-- stays inert (academicIntegration.concepts is empty corpus-wide).
--
-- UPDATE public.lessons l
-- SET metadata = jsonb_set(l.metadata, '{{academicConcepts}}', r.metadata_academicconcepts)
-- FROM public.pr5b_concepts_rollback r
-- WHERE l.lesson_id = r.lesson_id;
--
-- pr5b_concepts_rollback is dropped by a cleanup migration after PR 6 ships:
-- DROP TABLE IF EXISTS public.pr5b_concepts_rollback;\
""")
    return 0


if __name__ == "__main__":
    sys.exit(main())
