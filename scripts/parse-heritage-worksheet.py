#!/usr/bin/env python3
"""
Parse the Stage 1 heritage worksheet's per-value entries and emit the §16
end-summary canonical-vocabulary table.

Input:  docs/plans/2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md
Output: 88-row 7-column markdown table (stdout by default), or in-place
        replacement of the §16 table block (with --apply).

Section selection: §11.X (Asian), §12.X (Americas), §13.X (African),
§14.X (European), §15.X (Middle Eastern), §9.1.X (Cross-cluster Diaspora &
Indigenous). The §4 entry-shape template and §10 cluster template are skipped.

Per-value entry shape: a `####`-heading section followed by labeled-line
bullets `- **<field>:** <value>`. Inline HTML comments are tolerated and
stripped per §7. Drift entries (verdict `merge`) carry a `canonical_key`
identical to their `merge_into` target per the §7 alias_map identity-shaped-
entries invariant.

Frequency comes from the section header parenthetical; multiple shapes are
supported:
  - "Asian (63)"                                        → 63
  - "`asian` (drift literal — 1 corpus appearance)"     → 1
  - "Indigenous/Native American (1, v3 canonical ...)"  → 1
  - "Diaspora & Indigenous (cluster root — NEW canonical, 57 distinct ...)"
                                                        → 57

Output column order: canonical_key | surface_label | parent | filter_ui_tier
| frequency | aliases | verdict. The verdict cell encodes merge targets inline
as `merge → <target_canonical_key>`; consumers MUST filter on
`verdict in ('keep', 'new')` BEFORE keying canonical vocabulary by
`canonical_key` to avoid drift/canonical collision (§7 parser invariant).
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WORKSHEET = (
    REPO_ROOT
    / "docs"
    / "plans"
    / "2026-05-10-metadata-rebuild-stage1-heritage-worksheet.md"
)

# Clusters whose per-value entries feed §16, in §16 emission order.
TARGET_CLUSTERS = ("11", "12", "13", "14", "15", "9.1")
_CLUSTER_ORDER = {c: i for i, c in enumerate(TARGET_CLUSTERS)}

HEADING_RE = re.compile(
    r"^####\s+(?P<cluster>\d+(?:\.\d+)?)\.(?P<idx>\d+)\.\s+(?P<rest>.*?)\s*$"
)
FIELD_RE = re.compile(r"^-\s+\*\*(?P<field>[a-z_]+):\*\*\s*(?P<value>.*?)\s*$")
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)

FIELD_NAMES = {
    "canonical_key",
    "surface_label",
    "parent",
    "filter_ui_tier",
    "verdict",
    "merge_into",
    "split_into",
    "drop_to",
    "aliases",
}


@dataclass
class Entry:
    cluster: str
    idx: int
    raw_heading: str
    frequency: int
    canonical_key: str = ""
    surface_label: str = ""
    parent: str | None = None
    filter_ui_tier: str = ""
    verdict: str = ""
    merge_into: str | None = None
    split_into: str | None = None
    drop_to: str | None = None
    aliases: list[str] = field(default_factory=list)
    source_lineno: int = 0


def strip_inline_comments(text: str) -> str:
    return HTML_COMMENT_RE.sub("", text).strip()


def strip_backticks(text: str) -> str:
    text = text.strip()
    if text.startswith("`") and text.endswith("`") and len(text) >= 2:
        return text[1:-1]
    return text


def parse_value(field_name: str, raw: str) -> str | None | list[str]:
    cleaned = strip_inline_comments(raw)
    if field_name == "aliases":
        # Aliases are always backtick-wrapped JSON arrays per §4 convention.
        cleaned = strip_backticks(cleaned)
        if not cleaned:
            return []
        try:
            value = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(f"aliases is not valid JSON: {raw!r}") from exc
        if not isinstance(value, list):
            raise ValueError(f"aliases is not a list: {raw!r}")
        return value

    cleaned = strip_backticks(cleaned)
    if cleaned == "null":
        return None
    return cleaned


def extract_frequency(heading_rest: str) -> int:
    """Pull frequency from the section header parenthetical.

    Supported shapes:
      "Asian (63)"
      "`asian` (drift literal — 1 corpus appearance)"
      "`east-asian` (drift literal — 2 corpus appearances)"
      "Indigenous/Native American (1, v3 canonical surface label)"
      "Diaspora & Indigenous (cluster root — NEW canonical, 57 distinct ...)"
    """
    drift = re.search(r"drift literal\s*[—–-]\s*(\d+)\s+corpus appearance", heading_rest)
    if drift:
        return int(drift.group(1))

    new_cluster = re.search(r"NEW canonical,\s*(\d+)\s+distinct", heading_rest)
    if new_cluster:
        return int(new_cluster.group(1))

    paren = re.search(r"\((\d+)(?:[,\s)]|$)", heading_rest)
    if paren:
        return int(paren.group(1))

    raise ValueError(f"could not extract frequency from heading: {heading_rest!r}")


def parse_worksheet(path: Path) -> list[Entry]:
    entries: list[Entry] = []
    lines = path.read_text(encoding="utf-8").splitlines()

    current: Entry | None = None
    for lineno, line in enumerate(lines, start=1):
        heading_match = HEADING_RE.match(line)
        if heading_match:
            if current is not None:
                entries.append(current)
                current = None
            cluster = heading_match.group("cluster")
            idx_str = heading_match.group("idx")
            rest = heading_match.group("rest")
            if cluster not in TARGET_CLUSTERS:
                continue
            # Skip template placeholders that use literal "<cluster>" / "N" tokens.
            if "<" in rest and "<cluster>" in line:
                continue
            try:
                idx = int(idx_str)
            except ValueError:
                continue
            try:
                freq = extract_frequency(rest)
            except ValueError as exc:
                print(
                    f"warn: line {lineno}: {exc}", file=sys.stderr
                )
                continue
            current = Entry(
                cluster=cluster,
                idx=idx,
                raw_heading=rest,
                frequency=freq,
                source_lineno=lineno,
            )
            continue

        if current is None:
            continue

        field_match = FIELD_RE.match(line)
        if field_match:
            field_name = field_match.group("field")
            if field_name not in FIELD_NAMES:
                continue
            try:
                value = parse_value(field_name, field_match.group("value"))
            except ValueError as exc:
                print(
                    f"warn: line {lineno}: {field_name}: {exc}",
                    file=sys.stderr,
                )
                continue
            setattr(current, field_name, value)
            continue

        if line.strip() == "":
            continue

        # First non-blank, non-bullet line after a heading closes the entry's
        # labeled-line block (Notes paragraph, <details> tag, --- separator,
        # next section heading, etc.). Commit and return to inter-entry mode.
        entries.append(current)
        current = None

    if current is not None:
        entries.append(current)

    return entries


def cluster_sort_key(entry: Entry) -> tuple:
    """Order entries §11 → §12 → §13 → §14 → §15 → §9.1, then by idx."""
    return (_CLUSTER_ORDER[entry.cluster], entry.idx)


def render_aliases(aliases: list[str]) -> str:
    if not aliases:
        return "[]"
    return json.dumps(aliases, ensure_ascii=False)


def render_parent(parent: str | None) -> str:
    return "null" if parent is None else parent


def render_verdict(entry: Entry) -> str:
    if entry.verdict == "merge":
        target = entry.merge_into or "<to_fill>"
        return f"merge → {target}"
    if entry.verdict == "split":
        target = entry.split_into or "<to_fill>"
        return f"split → {target}"
    if entry.verdict == "drop":
        target = entry.drop_to or "<to_fill>"
        return f"drop → {target}"
    return entry.verdict or "<to_fill>"


def render_table(entries: list[Entry]) -> str:
    header = "| canonical_key | surface_label | parent | filter_ui_tier | frequency | aliases | verdict |"
    sep = "|---|---|---|---|---|---|---|"
    rows = [header, sep]
    for entry in sorted(entries, key=cluster_sort_key):
        rows.append(
            "| "
            + " | ".join(
                [
                    entry.canonical_key or "<to_fill>",
                    entry.surface_label or "<to_fill>",
                    render_parent(entry.parent),
                    entry.filter_ui_tier or "<to_fill>",
                    str(entry.frequency),
                    render_aliases(entry.aliases),
                    render_verdict(entry),
                ]
            )
            + " |"
        )
    return "\n".join(rows)


def verify_invariants(entries: list[Entry]) -> list[str]:
    """Return a list of human-readable invariant-violation messages (empty if clean).

    Expected per-cluster, tier, and verdict distributions are calibrated to the
    Session 75 / PR #491 curriculum-team-fill state of the worksheet (88 rows).
    Update the expected_* dicts here when the worksheet evolves (new entries,
    verdict reclassifications, tier promotions).
    """
    problems: list[str] = []

    expected_counts = {"11": 18, "12": 22, "13": 10, "14": 14, "15": 11, "9.1": 13}
    expected_tier_distribution = {"top": 12, "sub": 19, "internal": 57}
    expected_verdict_distribution = {"keep": 51, "merge": 17, "new": 20}
    allowed_tiers = set(expected_tier_distribution)
    allowed_verdicts = set(expected_verdict_distribution) | {"<to_fill>"}

    by_cluster: dict[str, list[Entry]] = {}
    for entry in entries:
        by_cluster.setdefault(entry.cluster, []).append(entry)

    for cluster, expected in expected_counts.items():
        actual = len(by_cluster.get(cluster, []))
        if actual != expected:
            problems.append(
                f"cluster {cluster}: expected {expected} entries, found {actual}"
            )

    if len(entries) != 88:
        problems.append(f"total entries: expected 88, found {len(entries)}")

    tier_counts: dict[str, int] = {}
    verdict_counts: dict[str, int] = {}
    for entry in entries:
        tier = entry.filter_ui_tier or "<to_fill>"
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
        if tier not in allowed_tiers:
            problems.append(
                f"{entry.cluster}.{entry.idx}: unknown filter_ui_tier {tier!r}"
                f" (allowed: {sorted(allowed_tiers)})"
            )

        verdict = entry.verdict or "<to_fill>"
        verdict_counts[verdict] = verdict_counts.get(verdict, 0) + 1
        if verdict not in allowed_verdicts:
            problems.append(
                f"{entry.cluster}.{entry.idx}: unknown verdict {verdict!r}"
                f" (allowed: {sorted(allowed_verdicts)})"
            )

    if verdict_counts.get("<to_fill>", 0) != 0:
        problems.append(
            f"verdict <to_fill>: expected 0 unfilled cells, found {verdict_counts['<to_fill>']}"
        )

    for tier, expected in expected_tier_distribution.items():
        actual = tier_counts.get(tier, 0)
        if actual != expected:
            problems.append(
                f"tier {tier!r}: expected {expected} entries, found {actual}"
            )

    for verdict, expected in expected_verdict_distribution.items():
        actual = verdict_counts.get(verdict, 0)
        if actual != expected:
            problems.append(
                f"verdict {verdict!r}: expected {expected} entries, found {actual}"
            )

    # Drift-entry §7 alias_map identity invariant: a merge entry's canonical_key
    # equals its merge_into target's canonical_key (drift literals only).
    drift_candidates = [e for e in entries if e.verdict == "merge"]
    for entry in drift_candidates:
        if entry.merge_into is None:
            problems.append(
                f"{entry.cluster}.{entry.idx}: verdict merge missing merge_into"
            )
            continue
        # Drift entries are surfaced when their surface_label equals the kebab-case
        # slug (lowercase) — same surface text as the canonical_key. Skip the
        # check for true merge entries that are NOT drift (e.g., AA-diaspora →
        # African American), where the canonical_key differs from the merge target.
        if entry.canonical_key == entry.surface_label and entry.canonical_key != entry.merge_into:
            problems.append(
                f"{entry.cluster}.{entry.idx} drift entry: canonical_key {entry.canonical_key!r}"
                f" ≠ merge_into {entry.merge_into!r} (§7 identity invariant)"
            )

    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--worksheet",
        type=Path,
        default=DEFAULT_WORKSHEET,
        help="Path to the heritage worksheet markdown file.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Replace the existing §16 table block in-place (default: print to stdout).",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Run invariant checks and exit; do not emit a table.",
    )
    args = parser.parse_args()

    entries = parse_worksheet(args.worksheet)

    problems = verify_invariants(entries)
    if problems:
        for p in problems:
            print(f"INVARIANT FAILURE: {p}", file=sys.stderr)
        # Continue to emit the table even with failures so the diff is reviewable.

    if args.verify_only:
        # Summary distribution
        dist: dict[str, int] = {}
        for e in entries:
            key = "merge" if e.verdict == "merge" else (e.verdict or "<to_fill>")
            dist[key] = dist.get(key, 0) + 1
        tiers: dict[str, int] = {}
        for e in entries:
            tiers[e.filter_ui_tier] = tiers.get(e.filter_ui_tier, 0) + 1
        print(f"Total entries: {len(entries)}", file=sys.stderr)
        print(f"Verdict distribution: {dist}", file=sys.stderr)
        print(f"Tier distribution: {tiers}", file=sys.stderr)
        return 1 if problems else 0

    table = render_table(entries)

    if args.apply:
        if problems:
            print(
                "error: refusing to apply with invariant failures (see above).",
                file=sys.stderr,
            )
            return 1
        content = args.worksheet.read_text(encoding="utf-8")
        # The §16 table block lives between the introductory ``` fence and the
        # closing ``` fence. Replace only the fenced block to preserve preamble
        # and trailing prose.
        fence_pattern = re.compile(
            r"(## 16\. End summary: canonical vocabulary table.*?```\n)(.*?)(\n```)",
            re.DOTALL,
        )
        match = fence_pattern.search(content)
        if not match:
            print(
                "error: could not locate the §16 fenced table block to replace.",
                file=sys.stderr,
            )
            return 2
        replacement = match.group(1) + table + match.group(3)
        new_content = content[: match.start()] + replacement + content[match.end():]
        args.worksheet.write_text(new_content, encoding="utf-8")
        print(f"Replaced §16 table in {args.worksheet}", file=sys.stderr)
    else:
        print(table)

    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
