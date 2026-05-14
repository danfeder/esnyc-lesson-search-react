#!/usr/bin/env python3
"""
Parse the Stage 1 concepts worksheet's per-value entries and emit either a
JSON dataPayload (default) or a self-contained interactive HTML tool
(``--build-html``) for the curriculum-team verdict pass.

Companion to ``scripts/parse-heritage-worksheet.py``. Heritage emits the §16
summary table; concepts emits a richer payload because the concepts tool is a
full interactive form rather than a static table regeneration.

Input:  docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md
Output:
  - default              : JSON dataPayload on stdout
  - --verify-only        : run invariants and exit (no output on stdout)
  - --build-html         : write self-contained HTML tool to
                           docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html
  - --output PATH        : redirect JSON output to PATH instead of stdout

Per-value entry shape (per worksheet §4 / D-C7):

    ### `<canonical_key>`

    - canonical_label: <Title Case label>
    - verdict: <keep | merge | new | drop | <to_fill>>
    - frequency: <count> appearances  (or `<N> as-tagged, <M> if aliases merge`)
    - current_subjects: <Subject (count), ...>
    - recommended_primary_subject: <single subject>
    - recommended_secondary_subjects: <list or `<none>`>
    - merge_aliases: <list of (string, count) tuples, or `<none>`>
                     (or `merge_into: <canonical_key>` for merge-verdict entries)
    - theme_overlap: <none | YES — adjudication notes>
    - claude_notes: <one paragraph>
    - curriculum_notes: <to_fill>

    <details><summary>Corpus evidence (N lessons)</summary>
    ... opaque to the parser, preserved byte-for-byte for export roundtrip ...
    </details>

Tier sections:

    ## §11 High-impact tier — concepts with ≥ 10 appearances    (32 entries)
    ## §12 Mid-tier — concepts with 3–9 appearances             (39 entries)
    ## §13 Long-tail tier — concepts with 1–2 appearances       (137 entries)

Template entry at §4 line 161 (``### `<canonical_key>` ``) is skipped via
literal-token heuristic. Methodology sections §1–§10 are not parsed as
entries; their raw lines pass through unchanged in the embedded markdown.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WORKSHEET = (
    REPO_ROOT
    / "docs"
    / "plans"
    / "2026-05-12-metadata-rebuild-stage1-concepts-worksheet.md"
)
DEFAULT_TOOL_OUTPUT = (
    REPO_ROOT
    / "docs"
    / "plans"
    / "concepts-worksheet-form"
    / "concepts-worksheet-tool.html"
)
DEFAULT_TEMPLATE = (
    REPO_ROOT
    / "scripts"
    / "concepts-worksheet-tool.template.html"
)
DATA_PAYLOAD_PLACEHOLDER = "__DATA_PAYLOAD__"

# Tier sections, in worksheet order.
TIER_ORDER: tuple[str, ...] = ("11", "12", "13")
TIER_LABELS: dict[str, str] = {
    "11": "§11 High-impact tier",
    "12": "§12 Mid-tier",
    "13": "§13 Long-tail tier",
}
TIER_FREQ_RANGE: dict[str, str] = {
    "11": "≥ 10 appearances",
    "12": "3–9 appearances",
    "13": "1–2 appearances",
}

# Subject order locked at worksheet §8 / Session 78 probe.
SUBJECT_ORDER: tuple[str, ...] = (
    "Science",
    "Social Studies",
    "Literacy/ELA",
    "Math",
    "Arts",
    "Health",
)

VERDICTS: tuple[str, ...] = ("keep", "merge", "new", "drop", "<to_fill>")

VERDICT_CAPTIONS: dict[str, str] = {
    "keep": "Keep — concept is canonical",
    "merge": "Merge — collapse into another canonical",
    "new": "New — add to canonical even though not in v3 baseline",
    "drop": "Drop — remove entirely from canonical vocabulary",
    "<to_fill>": "(unfilled)",
}

FIELD_LABELS: dict[str, str] = {
    "canonical_label": "Canonical label",
    "verdict": "Verdict",
    "frequency": "Frequency",
    "current_subjects": "Current subjects",
    "recommended_primary_subject": "Recommended primary subject",
    "recommended_secondary_subjects": "Recommended secondary subjects",
    "merge_aliases": "Merge aliases",
    "merge_into": "Merge into",
    "theme_overlap": "Theme overlap",
    "claude_notes": "Claude notes (pre-handoff recommendation)",
    "curriculum_notes": "Curriculum team notes",
}

KNOWN_FIELDS: set[str] = {
    "canonical_label",
    "verdict",
    "frequency",
    "current_subjects",
    "recommended_primary_subject",
    "recommended_secondary_subjects",
    "merge_aliases",
    "merge_into",
    "theme_overlap",
    "claude_notes",
    "curriculum_notes",
}

# CON-NN cluster signals (audit register cross-entry signals that affect
# multiple per-value entries' verdicts). Maintained against the audit signal
# register at docs/plans/2026-05-12-metadata-rebuild-stage1-concepts-audit-signal-register.md.
# Update CLUSTER_SIGNAL_DEFINITIONS when the register adds new cluster signals.
CLUSTER_SIGNAL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "id": "CON-12",
        "label": "Writing-cluster canonical shape",
        "members": [
            "writing",
            "narrative_writing",
            "opinion_writing",
            "descriptive_writing",
            "how_to_writing",
            "recipe_writing",
            "informational_writing",
        ],
        "options": [
            "Keep `writing` 8 as catch-all + sub-types stay canonical",
            "Drop `writing` 8 + sub-types are the only canonicals",
            "Merge sub-types into `writing` 8 catch-all",
        ],
        "question": (
            "How should the writing-cluster shape (catch-all + 7 sub-types) "
            "resolve?"
        ),
    },
    {
        "id": "CON-16",
        "label": "Indigenous-cluster cross-field overlap (concepts × heritage)",
        "members": [
            "indigenous_knowledge",
            "indigenous_stories",
            "native_american_history",
        ],
        "options": [
            "Keep concepts-side as separate singleton canonicals",
            "Reframe under heritage `Indigenous and Diaspora` cluster (D1)",
            "Drop concepts-side and rely on heritage-side tagging",
        ],
        "question": (
            "The 3 concepts singletons fragment across the heritage worksheet's "
            "§9.1 Indigenous and Diaspora cluster. Coordinate before Stage 2."
        ),
    },
    {
        "id": "CON-22",
        "label": "Reading-cluster boundary",
        "members": [
            "reading",
            "reading_comprehension",
            "narrative_reading",
            "biography_reading",
            "informational_text",
            "biography",
        ],
        "options": [
            "Keep all 6 as distinct canonicals",
            "Merge specific reading sub-types into `reading`",
            "Drop generic `reading` and keep specific sub-types",
        ],
        "question": (
            "How should the reading cluster (6 entries) resolve canonical "
            "shape?"
        ),
    },
    {
        "id": "CON-23",
        "label": "Measurement-cluster boundary",
        "members": [
            "measurement",
            "volume",
            "area",
            "weight",
            "perimeter",
        ],
        "options": [
            "Keep `measurement` parent + 4 specific sub-types as canonicals",
            "Merge specific sub-types into `measurement` parent",
        ],
        "question": (
            "Does `measurement` keep alongside 4 specific sub-types, or "
            "collapse into the parent?"
        ),
    },
    {
        "id": "CON-24",
        "label": "Figurative-language cluster",
        "members": [
            "figurative_language",
            "similes",
            "descriptive_language",
            "sensory_details",
        ],
        "options": [
            "Keep `figurative_language` parent + 3 specific sub-types",
            "Merge specific sub-types into `figurative_language`",
            "Pick one canonical (figurative_language OR descriptive_language)",
        ],
        "question": (
            "How should the figurative-language cluster (4 entries) resolve?"
        ),
    },
]

# Regexes.
ENTRY_HEADING_RE = re.compile(r"^### `(?P<key>[^`]+)`\s*$")
TIER_HEADING_RE = re.compile(
    r"^## §(?P<tier>1[123])\s+(?P<rest>.+)$"
)
FIELD_LINE_RE = re.compile(
    r"^- (?P<field>[a-z_]+):\s*(?P<value>.*)$"
)
DETAILS_OPEN_RE = re.compile(r"^<details(?:\s|>)")
DETAILS_CLOSE_RE = re.compile(r"^</details>\s*$")
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
# Match a frequency display like "239 appearances" or
# "206 as-tagged, 208 if aliases merge" or "107 appearances (Health 100 + ...)"
FREQUENCY_FIRST_INT_RE = re.compile(r"^\s*(\d+)\b")
FREQUENCY_MERGE_TOTAL_RE = re.compile(r"(\d+)\s+if\s+aliases\s+merge")
# Match a `Subject (count)` tuple, e.g. "Science (239)" or "Literacy/ELA (75)".
SUBJECT_COUNT_RE = re.compile(
    r"(?P<subject>[A-Z][A-Za-z/]+(?:\s+[A-Za-z/]+)*)\s*\((?P<count>\d+)\)"
)


# ---------- Data classes ----------


@dataclass
class FieldValue:
    """One labeled-line field on a per-value entry.

    raw_line keeps the source byte sequence so the HTML tool can swap the
    user-edited line back in at the original line number on export without
    disturbing the rest of the worksheet.
    """

    name: str
    value: str
    raw_line: str
    lineno: int


@dataclass
class Entry:
    canonical_key: str
    tier: str
    tier_idx: int  # 1-based index within the tier section
    heading_line: str
    heading_lineno: int
    fields: dict[str, FieldValue] = field(default_factory=dict)
    details_lines: list[str] = field(default_factory=list)
    details_start_lineno: int | None = None
    details_end_lineno: int | None = None

    @property
    def has_details(self) -> bool:
        return self.details_start_lineno is not None

    def field_value(self, name: str) -> str:
        fv = self.fields.get(name)
        return fv.value if fv is not None else ""


# ---------- Helpers ----------


def strip_inline_comments(text: str) -> str:
    return HTML_COMMENT_RE.sub("", text).strip()


def parse_frequency(raw: str) -> tuple[int, int | None]:
    """Return (primary_count, post_merge_total).

    Primary count is the first integer in the frequency display. Post-merge
    total is set when the dual-count D-C11 pattern is present, else None.
    """
    primary_match = FREQUENCY_FIRST_INT_RE.match(raw)
    primary = int(primary_match.group(1)) if primary_match else 0
    merge_match = FREQUENCY_MERGE_TOTAL_RE.search(raw)
    post_merge = int(merge_match.group(1)) if merge_match else None
    return primary, post_merge


def parse_current_subjects(raw: str) -> list[dict[str, Any]]:
    """Parse 'Science (239), Arts (1)' into [{'subject': 'Science', 'count': 239}, ...]."""
    pairs: list[dict[str, Any]] = []
    for match in SUBJECT_COUNT_RE.finditer(raw):
        pairs.append(
            {
                "subject": match.group("subject").strip(),
                "count": int(match.group("count")),
            }
        )
    return pairs


def parse_recommended_secondary_subjects(raw: str) -> list[str]:
    cleaned = strip_inline_comments(raw)
    if cleaned in ("", "<none>", "None", "none"):
        return []
    # Could be a comma-separated list; strip ` (conditional)` / parenthetical
    # qualifiers because they're advisory for the curriculum team and not
    # subject keys per se.
    parts = [p.strip() for p in cleaned.split(",")]
    return [p for p in parts if p]


def parse_merge_aliases(raw: str) -> list[dict[str, Any]]:
    """Parse merge_aliases value into a list of {alias, count} dicts.

    Supported shapes:
      - "<none>" → []
      - '[("identifying plants", 2), ("plant ID", 1)]' →
            [{"alias": "identifying plants", "count": 2},
             {"alias": "plant ID", "count": 1}]
    """
    cleaned = strip_inline_comments(raw)
    if cleaned in ("", "<none>"):
        return []
    # Permissive parse: find every ("string", N) tuple.
    pattern = re.compile(r"""\(\s*["'](?P<s>[^"']+)["']\s*,\s*(?P<n>\d+)\s*\)""")
    matches = list(pattern.finditer(cleaned))
    return [
        {"alias": m.group("s"), "count": int(m.group("n"))}
        for m in matches
    ]


def parse_theme_overlap(raw: str) -> dict[str, Any]:
    """Return {'flagged': bool, 'note': str}."""
    cleaned = strip_inline_comments(raw)
    if cleaned in ("", "none", "<none>"):
        return {"flagged": False, "note": ""}
    if cleaned.startswith("YES"):
        # Strip leading "YES — " / "YES - " / "YES " prefix for the note body.
        m = re.match(r"^YES\s*[—–-]?\s*(.*)$", cleaned, re.DOTALL)
        note = m.group(1).strip() if m else cleaned
        return {"flagged": True, "note": note}
    return {"flagged": False, "note": cleaned}


# ---------- Core parser ----------


def parse_worksheet(path: Path) -> tuple[list[Entry], list[str]]:
    """Return (entries, raw_lines). raw_lines is the full markdown as a list
    of lines (no trailing newlines) for embedding into the HTML tool."""
    raw_lines = path.read_text(encoding="utf-8").splitlines()

    entries: list[Entry] = []
    current: Entry | None = None
    current_tier: str | None = None
    tier_idx_counter: dict[str, int] = {t: 0 for t in TIER_ORDER}
    in_details = False
    details_start = -1

    for idx, line in enumerate(raw_lines):
        lineno = idx + 1  # 1-based

        # Track tier section boundaries.
        tier_match = TIER_HEADING_RE.match(line)
        if tier_match:
            if current is not None:
                entries.append(current)
                current = None
            in_details = False
            current_tier = tier_match.group("tier")
            continue

        # Track <details> blocks (opaque to structured parsing; preserved
        # for export roundtrip).
        if in_details:
            if current is not None:
                current.details_lines.append(line)
            if DETAILS_CLOSE_RE.match(line):
                if current is not None:
                    current.details_end_lineno = lineno
                in_details = False
            continue

        if DETAILS_OPEN_RE.match(line):
            if current is not None:
                current.details_start_lineno = lineno
                current.details_lines = [line]
                in_details = True
            continue

        # Entry heading.
        heading_match = ENTRY_HEADING_RE.match(line)
        if heading_match:
            key = heading_match.group("key")
            # Skip the §4 template placeholder (literal `<canonical_key>`
            # heading at line 161-ish).
            if key.startswith("<") and key.endswith(">"):
                if current is not None:
                    entries.append(current)
                    current = None
                continue
            if current is not None:
                entries.append(current)
            # Tier defaults to current_tier; if no tier seen yet, skip entry
            # as out-of-section.
            if current_tier is None:
                current = None
                continue
            tier_idx_counter[current_tier] += 1
            current = Entry(
                canonical_key=key,
                tier=current_tier,
                tier_idx=tier_idx_counter[current_tier],
                heading_line=line,
                heading_lineno=lineno,
            )
            continue

        # Field line (only meaningful when we're inside an entry).
        if current is not None:
            field_match = FIELD_LINE_RE.match(line)
            if field_match:
                fname = field_match.group("field")
                if fname in KNOWN_FIELDS:
                    fvalue = strip_inline_comments(field_match.group("value"))
                    current.fields[fname] = FieldValue(
                        name=fname,
                        value=fvalue,
                        raw_line=line,
                        lineno=lineno,
                    )
                continue

    if current is not None:
        entries.append(current)

    return entries, raw_lines


# ---------- Invariant checks ----------


def verify_invariants(entries: list[Entry]) -> list[str]:
    """Return a list of invariant-violation messages (empty if clean).

    Distribution targets are calibrated to the Session 81 / PR #496
    pre-handoff fill state of the worksheet (208 entries pre-filled with
    verdict + curriculum_notes as <to_fill>). Update the expected_*
    distributions here when the worksheet evolves (curriculum-team verdict
    pass, new entries, etc.).
    """
    problems: list[str] = []

    expected_tier_counts = {"11": 32, "12": 39, "13": 137}
    expected_total = sum(expected_tier_counts.values())

    by_tier: dict[str, list[Entry]] = {t: [] for t in TIER_ORDER}
    for entry in entries:
        by_tier.setdefault(entry.tier, []).append(entry)

    for tier, expected in expected_tier_counts.items():
        actual = len(by_tier.get(tier, []))
        if actual != expected:
            problems.append(
                f"tier §{tier}: expected {expected} entries, found {actual}"
            )

    if len(entries) != expected_total:
        problems.append(
            f"total entries: expected {expected_total}, found {len(entries)}"
        )

    allowed_verdicts = set(VERDICTS)
    # canonical_label + verdict + frequency + current_subjects +
    # recommended_primary_subject + recommended_secondary_subjects +
    # merge_aliases + theme_overlap + claude_notes + curriculum_notes.
    required_fields = {
        "canonical_label",
        "verdict",
        "frequency",
        "current_subjects",
        "recommended_primary_subject",
        "recommended_secondary_subjects",
        "merge_aliases",
        "theme_overlap",
        "claude_notes",
        "curriculum_notes",
    }

    canonical_keys_seen: set[str] = set()
    for entry in entries:
        # Duplicate canonical_key check.
        if entry.canonical_key in canonical_keys_seen:
            problems.append(
                f"§{entry.tier}.{entry.tier_idx} `{entry.canonical_key}`: "
                f"duplicate canonical_key"
            )
        canonical_keys_seen.add(entry.canonical_key)

        # Required fields presence.
        missing = required_fields - set(entry.fields)
        if missing:
            problems.append(
                f"§{entry.tier}.{entry.tier_idx} `{entry.canonical_key}`: "
                f"missing fields {sorted(missing)}"
            )

        # Verdict whitelist.
        verdict = entry.field_value("verdict")
        if verdict and verdict not in allowed_verdicts:
            problems.append(
                f"§{entry.tier}.{entry.tier_idx} `{entry.canonical_key}`: "
                f"verdict {verdict!r} not in {sorted(allowed_verdicts)}"
            )

        # merge_into present iff verdict == merge.
        has_merge_into = "merge_into" in entry.fields and entry.field_value("merge_into") not in ("", "<to_fill>")
        if verdict == "merge" and not has_merge_into:
            problems.append(
                f"§{entry.tier}.{entry.tier_idx} `{entry.canonical_key}`: "
                f"verdict=merge but merge_into is empty/<to_fill>"
            )
        if verdict not in ("merge", "") and has_merge_into:
            problems.append(
                f"§{entry.tier}.{entry.tier_idx} `{entry.canonical_key}`: "
                f"merge_into present but verdict is {verdict!r} (not merge)"
            )

    return problems


# ---------- Emit JSON payload ----------


def entry_to_json(entry: Entry) -> dict[str, Any]:
    """Serialize one Entry to the JSON payload shape consumed by the HTML tool."""
    fields_json: dict[str, dict[str, Any]] = {}
    for fname, fv in entry.fields.items():
        fields_json[fname] = {
            "value": fv.value,
            "raw_line": fv.raw_line,
            "lineno": fv.lineno,
        }

    freq_raw = entry.field_value("frequency")
    primary_count, post_merge_total = parse_frequency(freq_raw)
    return {
        "canonical_key": entry.canonical_key,
        "tier": entry.tier,
        "tier_idx": entry.tier_idx,
        "heading_line": entry.heading_line,
        "heading_lineno": entry.heading_lineno,
        "fields": fields_json,
        "details": {
            "present": entry.has_details,
            "lineno_start": entry.details_start_lineno,
            "lineno_end": entry.details_end_lineno,
            "lines": entry.details_lines,
        },
        "parsed": {
            "canonical_label": entry.field_value("canonical_label"),
            "verdict": entry.field_value("verdict"),
            "frequency_display": freq_raw,
            "frequency_primary": primary_count,
            "frequency_post_merge": post_merge_total,
            "current_subjects": parse_current_subjects(
                entry.field_value("current_subjects")
            ),
            "recommended_primary_subject": entry.field_value(
                "recommended_primary_subject"
            ),
            "recommended_secondary_subjects": parse_recommended_secondary_subjects(
                entry.field_value("recommended_secondary_subjects")
            ),
            "merge_aliases": parse_merge_aliases(
                entry.field_value("merge_aliases")
            ),
            "theme_overlap": parse_theme_overlap(
                entry.field_value("theme_overlap")
            ),
            "claude_notes": entry.field_value("claude_notes"),
            "curriculum_notes": entry.field_value("curriculum_notes"),
        },
    }


def build_payload(
    entries: list[Entry],
    raw_lines: list[str],
) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "worksheet_filename": DEFAULT_WORKSHEET.name,
        "tier_order": list(TIER_ORDER),
        "tier_labels": TIER_LABELS,
        "tier_freq_range": TIER_FREQ_RANGE,
        "subject_order": list(SUBJECT_ORDER),
        "verdicts": list(VERDICTS),
        "verdict_captions": VERDICT_CAPTIONS,
        "field_labels": FIELD_LABELS,
        "cluster_signals": CLUSTER_SIGNAL_DEFINITIONS,
        "entry_count": len(entries),
        "entries": [entry_to_json(e) for e in entries],
        "raw_markdown_lines": raw_lines,
    }


# ---------- Main ----------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--worksheet",
        type=Path,
        default=DEFAULT_WORKSHEET,
        help="Path to the concepts worksheet markdown file.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Write JSON output to PATH instead of stdout.",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Run invariant checks and exit; do not emit JSON.",
    )
    parser.add_argument(
        "--build-html",
        action="store_true",
        help=(
            "Build the self-contained HTML tool to "
            "docs/plans/concepts-worksheet-form/concepts-worksheet-tool.html "
            "(or --tool-output PATH)."
        ),
    )
    parser.add_argument(
        "--tool-output",
        type=Path,
        default=DEFAULT_TOOL_OUTPUT,
        help="Path to write the built HTML tool (with --build-html).",
    )
    parser.add_argument(
        "--template",
        type=Path,
        default=DEFAULT_TEMPLATE,
        help="Path to the HTML template (with --build-html).",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output (default: compact).",
    )
    args = parser.parse_args()

    entries, raw_lines = parse_worksheet(args.worksheet)

    problems = verify_invariants(entries)
    for problem in problems:
        print(f"INVARIANT FAILURE: {problem}", file=sys.stderr)

    # Always report distribution to stderr for visibility.
    print(
        f"Parsed {len(entries)} entries (§11={sum(1 for e in entries if e.tier == '11')}, "
        f"§12={sum(1 for e in entries if e.tier == '12')}, "
        f"§13={sum(1 for e in entries if e.tier == '13')}).",
        file=sys.stderr,
    )

    if args.verify_only:
        return 1 if problems else 0

    if args.build_html:
        if problems:
            print(
                "error: refusing to build HTML with invariant failures (see above).",
                file=sys.stderr,
            )
            return 1
        if not args.template.exists():
            print(f"error: template not found at {args.template}", file=sys.stderr)
            return 2
        template = args.template.read_text(encoding="utf-8")
        if DATA_PAYLOAD_PLACEHOLDER not in template:
            print(
                f"error: template missing placeholder {DATA_PAYLOAD_PLACEHOLDER!r}",
                file=sys.stderr,
            )
            return 2
        payload = build_payload(entries, raw_lines)
        # Compact JSON to keep the embedded payload small. The HTML parser
        # accepts any whitespace inside <script id="dataPayload"
        # type="application/json">.
        payload_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        # Escape `</script>` if it appears anywhere in the payload (defensive;
        # the worksheet body could in theory contain that literal substring
        # and would otherwise terminate our script tag).
        payload_json = payload_json.replace("</script>", "<\\/script>")
        html = template.replace(DATA_PAYLOAD_PLACEHOLDER, payload_json)
        args.tool_output.parent.mkdir(parents=True, exist_ok=True)
        args.tool_output.write_text(html, encoding="utf-8")
        size_kb = args.tool_output.stat().st_size / 1024
        print(
            f"Wrote HTML tool to {args.tool_output} ({size_kb:.1f} KB)",
            file=sys.stderr,
        )
        return 0

    payload = build_payload(entries, raw_lines)
    indent = 2 if args.pretty else None
    text = json.dumps(payload, ensure_ascii=False, indent=indent)

    if args.output is not None:
        args.output.write_text(text + ("\n" if not text.endswith("\n") else ""), encoding="utf-8")
        print(f"Wrote JSON payload to {args.output}", file=sys.stderr)
    else:
        sys.stdout.write(text)
        if not text.endswith("\n"):
            sys.stdout.write("\n")

    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
