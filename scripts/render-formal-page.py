#!/usr/bin/env python3
"""Inject checked Lean audit fragments and provenance into the formal page."""

import argparse
import datetime
from pathlib import Path


def replace_block(text: str, marker: str, fragment: str) -> str:
    begin = f"<!-- {marker}:BEGIN -->"
    end = f"<!-- {marker}:END -->"
    if text.count(begin) != 1 or text.count(end) != 1:
        raise SystemExit(
            f"error: expected exactly one {begin!r} and one {end!r}"
        )
    before, remainder = text.split(begin, 1)
    _, after = remainder.split(end, 1)
    return f"{before}{begin}\n{fragment.strip()}\n{end}{after}"


def replace_provenance(text: str, value: str) -> str:
    begin = "<!-- GEN-PROVENANCE -->"
    end = "<!-- /GEN-PROVENANCE -->"
    if text.count(begin) != 1 or text.count(end) != 1:
        raise SystemExit("error: expected exactly one formal-page provenance marker")
    before, remainder = text.split(begin, 1)
    _, after = remainder.split(end, 1)
    return f"{before}{begin}{value}{end}{after}"


def read_fragment(path: Path, label: str) -> str:
    fragment = path.read_text().strip()
    if "<table>" not in fragment or "axiom-audit.txt" not in fragment:
        raise SystemExit(f"error: {label} audit fragment is incomplete")
    return fragment


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--page", type=Path, required=True)
    parser.add_argument("--model-fragment", type=Path, required=True)
    parser.add_argument("--aeneas-fragment", type=Path, required=True)
    parser.add_argument("--model-sha", required=True)
    parser.add_argument("--aeneas-sha", required=True)
    parser.add_argument("--generated-at")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    generated_at = args.generated_at or datetime.datetime.now(
        datetime.timezone.utc
    ).strftime("%Y-%m-%d %H:%M UTC")
    page = args.page.read_text()
    page = replace_block(
        page,
        "GEN-AXIOM-TABLE",
        read_fragment(args.model_fragment, "model"),
    )
    page = replace_block(
        page,
        "GEN-AENEAS-AXIOM-TABLE",
        read_fragment(args.aeneas_fragment, "translated-Rust"),
    )
    page = replace_provenance(
        page,
        (
            f"regenerated {generated_at} · both builds green · "
            f"opencsv-formal@{args.model_sha} · formal-aeneas@{args.aeneas_sha}"
        ),
    )
    args.output.write_text(page)
    print(f"rendered {args.output}")


if __name__ == "__main__":
    main()
