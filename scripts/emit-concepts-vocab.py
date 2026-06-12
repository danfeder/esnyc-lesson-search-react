#!/usr/bin/env python3
"""
Emit the PR 5b concepts vocabulary artifact from the RETURNED Stage 1
concepts verdict record.

Reuses scripts/build-concepts-tool.py's parse functions (loaded via importlib
because the filename is hyphenated) pointed at the returned verdict record —
NEVER the unfilled 2026-05-12 source worksheet.

Input:  docs/plans/2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md
Output: data/vocab/academic-concepts.vocab.json via
        --emit-json PATH --emit-date YYYY-MM-DD
        (worksheet §10 shape + provenance block; design doc §4.1/§4.2)

Mechanism notes (design doc 2026-06-11-…-pr5-canonicalization-design.md §4.1):

* Corpus-literal recovery: concepts canonical_keys are not mechanically
  invertible to corpus literals (`colonialisms_impact` ↔ "colonialism's
  impact"), so each of the 208 entries is matched to its Appendix A
  v3-baseline literal by normalized comparison (lowercase, alphanumerics
  only). The match must be exactly 1:1 or the emit fails loudly.
* `sorting` → `sorting_and_categorization` key rename: the one PR 5b key
  rename (curriculum-team conflict resolution archived 2026-06-11). The
  keep entry headed `sorting` emits under the renamed key; `categorization`'s
  merge_into re-points to the renamed key; the artifact records the rename
  in provenance.
* alias_map keys are corpus literals, values are canonical keys (worksheet
  §10 contract). Drops are the 7 drop entries' corpus literals.

Self-checks (fail loudly, no silent emit): verdict counts 119/82/7; every
merge_into resolves to a keep key after the rename; alias_map covers exactly
the 201 non-drop literals; labels unique; appearance sum == 1912; subjects
restricted to the 6 canonical subject keys.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
RETURNED_WORKSHEET = (
    REPO_ROOT
    / "docs"
    / "plans"
    / "2026-06-11-metadata-rebuild-stage1-concepts-worksheet-returned.md"
)

# Load the concepts parser despite its hyphenated (un-importable) filename.
_BCT_PATH = REPO_ROOT / "scripts" / "build-concepts-tool.py"
_spec = importlib.util.spec_from_file_location("build_concepts_tool", _BCT_PATH)
assert _spec is not None and _spec.loader is not None
bct = importlib.util.module_from_spec(_spec)
sys.modules["build_concepts_tool"] = bct  # dataclass resolution needs the registry entry
_spec.loader.exec_module(bct)

EXPECTED_VERDICT_COUNTS = {"keep": 119, "merge": 82, "drop": 7}
EXPECTED_DISTINCT_LITERALS = 208
EXPECTED_SUBJECT_PAIRS = 216
EXPECTED_TOTAL_APPEARANCES = 1912

# The one PR 5b canonical-key rename (conflict resolution archived 2026-06-11
# in the returned worksheet's provenance header; label was already changed to
# "Sorting and Categorization" in-file, the KEY rename was deferred to here).
RENAMES = {"sorting": "sorting_and_categorization"}
RENAME_EXPECTED_LABELS = {"sorting": "Sorting and Categorization"}

# Appendix A per-subject sections: heading → canonical subject key.
APPENDIX_SECTION_RE = re.compile(
    r"^### A\.(?P<num>[1-6]) (?P<subject>Science|Social Studies|Literacy/ELA|Math|Health|Arts)\b"
)
APPENDIX_END_RE = re.compile(r"^### A\.7\b")
LITERAL_COUNT_RE = re.compile(r"`(?P<literal>[^`]+)`\s*\((?P<count>\d+)\)")


def norm(s: str) -> str:
    """Normalized comparison form: lowercase alphanumerics only.

    Bridges canonical_key ↔ corpus literal across underscores, spaces,
    apostrophes, hyphens, and slashes:
      colonialisms_impact    ↔ colonialism's impact
      how_to_writing         ↔ how-to writing
      biotic_abiotic_factors ↔ biotic/abiotic factors
    """
    return re.sub(r"[^a-z0-9]", "", s.lower())


def strip_qualifier(subject: str) -> str:
    """Drop trailing parenthetical qualifiers: 'Social Studies (conditional)'
    → 'Social Studies'. Qualifiers are advisory prose for the curriculum
    team, not subject keys."""
    return re.sub(r"\s*\([^)]*\)\s*$", "", subject).strip()


def parse_appendix_a(raw_lines: list[str]) -> list[tuple[str, str, int]]:
    """Return (subject, literal, count) tuples from Appendix A sections
    A.1–A.6. A.7 (cross-subject recap) and A.8 are informational only —
    their counts already appear in A.1–A.6."""
    tuples: list[tuple[str, str, int]] = []
    current_subject: str | None = None
    for line in raw_lines:
        if APPENDIX_END_RE.match(line):
            break
        m = APPENDIX_SECTION_RE.match(line)
        if m:
            current_subject = m.group("subject")
            continue
        if current_subject is None:
            continue
        # Skip the section heading's own "(92 distinct concepts)" parenthetical
        # by only scanning lines that carry backticked literals.
        for lm in LITERAL_COUNT_RE.finditer(line):
            tuples.append(
                (current_subject, lm.group("literal"), int(lm.group("count")))
            )
    return tuples


def build_artifact(
    entries: list,
    appendix: list[tuple[str, str, int]],
    worksheet: Path,
    source_commit: str,
    emit_date: str,
) -> dict:
    """Build the PR 5b vocabulary artifact. Fails loudly on any internal
    inconsistency — a silent partial emit would poison the downstream
    migration generator."""
    errors: list[str] = []
    subjects = set(bct.SUBJECT_ORDER)

    # ---- Appendix A totals ----
    distinct_literals = sorted({lit for _, lit, _ in appendix})
    total_appearances = sum(c for _, _, c in appendix)
    if len(appendix) != EXPECTED_SUBJECT_PAIRS:
        errors.append(
            f"appendix: expected {EXPECTED_SUBJECT_PAIRS} (subject, literal) pairs,"
            f" found {len(appendix)}"
        )
    if len(distinct_literals) != EXPECTED_DISTINCT_LITERALS:
        errors.append(
            f"appendix: expected {EXPECTED_DISTINCT_LITERALS} distinct literals,"
            f" found {len(distinct_literals)}"
        )
    if total_appearances != EXPECTED_TOTAL_APPEARANCES:
        errors.append(
            f"appendix: expected {EXPECTED_TOTAL_APPEARANCES} total appearances,"
            f" found {total_appearances}"
        )

    # ---- Verdict distribution ----
    verdict_counts: dict[str, int] = {}
    for e in entries:
        v = e.field_value("verdict")
        verdict_counts[v] = verdict_counts.get(v, 0) + 1
    if verdict_counts != EXPECTED_VERDICT_COUNTS:
        errors.append(
            f"verdict counts: expected {EXPECTED_VERDICT_COUNTS},"
            f" found {verdict_counts}"
        )

    # ---- 1:1 normalized match: entries ↔ Appendix A literals ----
    literal_by_norm: dict[str, str] = {}
    for lit in distinct_literals:
        n = norm(lit)
        if n in literal_by_norm and literal_by_norm[n] != lit:
            errors.append(
                f"appendix literals collide under normalization:"
                f" {literal_by_norm[n]!r} vs {lit!r}"
            )
        literal_by_norm[n] = lit

    corpus_literal: dict[str, str] = {}  # canonical_key -> corpus literal
    matched_norms: set[str] = set()
    for e in entries:
        n = norm(e.canonical_key)
        lit = literal_by_norm.get(n)
        if lit is None:
            errors.append(
                f"`{e.canonical_key}`: no Appendix A literal matches under"
                f" normalization ({n!r})"
            )
            continue
        if n in matched_norms:
            errors.append(
                f"`{e.canonical_key}`: Appendix A literal {lit!r} already"
                f" matched by another entry"
            )
            continue
        matched_norms.add(n)
        corpus_literal[e.canonical_key] = lit
    unmatched = sorted(set(literal_by_norm) - matched_norms)
    if unmatched:
        errors.append(
            f"Appendix A literals with no worksheet entry:"
            f" {[literal_by_norm[n] for n in unmatched]}"
        )

    # ---- Rename guard ----
    for old_key, expected_label in RENAME_EXPECTED_LABELS.items():
        entry = next((e for e in entries if e.canonical_key == old_key), None)
        if entry is None:
            errors.append(f"rename source `{old_key}` has no worksheet entry")
        elif entry.field_value("canonical_label") != expected_label:
            errors.append(
                f"rename source `{old_key}`: expected label {expected_label!r},"
                f" found {entry.field_value('canonical_label')!r}"
                f" — stale worksheet file?"
            )

    def final_key(key: str) -> str:
        return RENAMES.get(key, key)

    # ---- Canonical entries (keeps; concepts has no `new` verdicts) ----
    keeps = [e for e in entries if e.field_value("verdict") == "keep"]
    keep_keys = {final_key(e.canonical_key) for e in keeps}

    canonical: list[dict] = []
    for e in keeps:
        label = e.field_value("canonical_label")
        primary = strip_qualifier(e.field_value("recommended_primary_subject"))
        secondary = [
            strip_qualifier(s)
            for s in bct.parse_recommended_secondary_subjects(
                e.field_value("recommended_secondary_subjects")
            )
        ]
        for subj in [primary, *secondary]:
            if subj not in subjects:
                errors.append(
                    f"`{e.canonical_key}`: subject {subj!r} not one of"
                    f" {sorted(subjects)}"
                )
        primary_count, _ = bct.parse_frequency(e.field_value("frequency"))
        canonical.append(
            {
                "key": final_key(e.canonical_key),
                "label": label,
                "primary_subject": primary,
                "secondary_subjects": secondary,
                "frequency": primary_count,
            }
        )

    labels = [c["label"] for c in canonical]
    for label in sorted({l for l in labels if labels.count(l) > 1}):
        errors.append(f"duplicate canonical label: {label!r}")

    # ---- alias_map + drops ----
    alias_map: dict[str, str] = {}
    drops: list[str] = []

    def add_alias(literal: str, target_key: str, source: str) -> None:
        existing = alias_map.get(literal)
        if existing is not None and existing != target_key:
            errors.append(
                f"alias collision: {literal!r} maps to both {existing!r} and"
                f" {target_key!r} (from {source})"
            )
            return
        alias_map[literal] = target_key

    for e in entries:
        lit = corpus_literal.get(e.canonical_key)
        if lit is None:
            continue  # already reported above
        v = e.field_value("verdict")
        if v == "keep":
            add_alias(lit, final_key(e.canonical_key), f"keep `{e.canonical_key}`")
        elif v == "merge":
            target = final_key(e.field_value("merge_into"))
            if target not in keep_keys:
                errors.append(
                    f"`{e.canonical_key}`: merge_into {target!r} does not"
                    f" resolve to a keep key"
                )
                continue
            add_alias(lit, target, f"merge `{e.canonical_key}`")
        elif v == "drop":
            drops.append(lit)
        else:
            errors.append(
                f"`{e.canonical_key}`: unsupported verdict {v!r} for artifact emit"
            )

    expected_alias_entries = EXPECTED_DISTINCT_LITERALS - EXPECTED_VERDICT_COUNTS["drop"]
    if len(alias_map) != expected_alias_entries:
        errors.append(
            f"alias_map: expected {expected_alias_entries} entries,"
            f" found {len(alias_map)}"
        )
    if len(drops) != EXPECTED_VERDICT_COUNTS["drop"]:
        errors.append(f"drops: expected 7 literals, found {len(drops)}: {drops}")
    overlap = set(alias_map) & set(drops)
    if overlap:
        errors.append(f"literals in both alias_map and drops: {sorted(overlap)}")

    if errors:
        raise ValueError("\n".join(errors))

    return {
        "provenance": {
            "source": str(worksheet.relative_to(REPO_ROOT))
            if worksheet.is_relative_to(REPO_ROOT)
            else str(worksheet),
            "source_commit": source_commit,
            "verdict_counts": dict(sorted(verdict_counts.items())),
            "emitted": emit_date,
            "renames": dict(RENAMES),
        },
        "canonical": sorted(canonical, key=lambda c: c["key"]),
        "alias_map": {k: alias_map[k] for k in sorted(alias_map)},
        "drops": sorted(drops),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--worksheet",
        type=Path,
        default=RETURNED_WORKSHEET,
        help="Path to the RETURNED concepts verdict record (default: the"
        " 2026-06-11 returned file — never the unfilled source worksheet).",
    )
    parser.add_argument(
        "--emit-json",
        type=Path,
        default=None,
        metavar="PATH",
        help="Write the PR 5b vocabulary artifact (canonical + alias_map +"
        " drops) to PATH.",
    )
    parser.add_argument(
        "--emit-date",
        default=None,
        metavar="YYYY-MM-DD",
        help="Provenance emit date for --emit-json (passed explicitly; no"
        " ambient clock).",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Run parser invariants + artifact self-checks and exit; do not emit.",
    )
    args = parser.parse_args()

    if args.emit_json is not None and not args.emit_date:
        parser.error("--emit-json requires --emit-date YYYY-MM-DD")
    if args.emit_json is None and not args.verify_only:
        parser.error("nothing to do: pass --emit-json PATH or --verify-only")

    entries, raw_lines = bct.parse_worksheet(args.worksheet)
    problems = bct.verify_invariants(entries)
    for p in problems:
        print(f"INVARIANT FAILURE: {p}", file=sys.stderr)
    if problems:
        print(
            "error: refusing to emit artifact with parser-invariant failures"
            " (see above).",
            file=sys.stderr,
        )
        return 1

    appendix = parse_appendix_a(raw_lines)
    source_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    try:
        artifact = build_artifact(
            entries,
            appendix,
            args.worksheet,
            source_commit,
            args.emit_date or "<verify-only>",
        )
    except ValueError as exc:
        print(f"ARTIFACT SELF-CHECK FAILURE:\n{exc}", file=sys.stderr)
        return 1

    print(
        f"Self-checks passed: {len(artifact['canonical'])} canonical,"
        f" {len(artifact['alias_map'])} alias_map entries,"
        f" {len(artifact['drops'])} drops.",
        file=sys.stderr,
    )

    if args.verify_only:
        return 0

    args.emit_json.parent.mkdir(parents=True, exist_ok=True)
    args.emit_json.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {args.emit_json}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
