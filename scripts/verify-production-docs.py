#!/usr/bin/env python3
"""Fail closed when the public production contract drifts across surfaces."""

from __future__ import annotations

import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    raise SystemExit(f"production documentation mismatch: {message}")


class LinkCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "a":
            return
        for key, value in attrs:
            if key == "href" and value:
                self.links.append(value)


def require_all(path: Path, values: list[str]) -> None:
    text = path.read_text()
    for value in values:
        if value not in text:
            fail(f"{path.relative_to(ROOT)} is missing {value!r}")


def verify_local_links(path: Path) -> int:
    parser = LinkCollector()
    parser.feed(path.read_text())
    checked = 0
    for href in parser.links:
        parsed = urlsplit(href)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        target = (path.parent / parsed.path).resolve()
        try:
            target.relative_to(ROOT)
        except ValueError:
            fail(f"{path.relative_to(ROOT)} links outside the repository: {href}")
        if not target.exists():
            fail(f"{path.relative_to(ROOT)} has a missing local link: {href}")
        checked += 1
    return checked


def main() -> int:
    canonical = ROOT / "PRODUCTION_MAINNET.md"
    page = ROOT / "production.html"
    roadmap = ROOT / "ROADMAP.md"
    paper = ROOT / "paper/opencsv.md"
    journal = ROOT / "journal/README.md"
    rendered_journal = ROOT / "web/journal.html"

    require_all(
        canonical,
        [
            "Test USD never migrates to mainnet",
            "production_activation_not_authorized",
            "candidate`, `limited`, or `general",
            "max_rolling_24h_outgoing_base_units",
            "max_reserve_allocation_sats",
            "max_miner_fee_sats",
            "Signed solo, batch, or reserve-maintenance bytes",
            "opencsv-registry",
            "activation_authorized: false",
            "No production manifest, production wallet, public release, or",
        ],
    )
    require_all(
        page,
        [
            "Nothing here is active.",
            "production issuers approved",
            "production releases",
            "mainnet broadcasts",
            "production_activation_not_authorized",
            "Wallet signature binds the snapshot to one operation",
            "Missing, substituted, or cross-operation authorization",
            "Structural validity is not activation authority",
        ],
    )
    require_all(
        roadmap,
        [
            "Test USD has no monetary or redemption value",
            "production_activation_not_authorized",
            "snapshot the complete authorizing release",
            "wallet-derived signature binds that commitment",
            "opencsv-registry",
        ],
    )
    require_all(
        paper,
        [
            "production/mainnet activation contract",
            "policy is readable but cannot write",
            "signed operation snapshots the complete",
            "wallet-derived signature also binds the commitment",
            "opencsv-registry",
        ],
    )

    implementation = "aa495a76d84003c91e457e7ded522125231bac03"
    receipt = "6fc1e4ca410083297250f4d7a7cfce474f4f2d93"
    commitment = "bf808e3e0a5fad6cbc8caf23741e82adb5fbe5dd21dfb5a00840fd0801361169"
    require_all(
        journal,
        [implementation, receipt, commitment, "112 passed, 0 failed", "32.13 seconds"],
    )
    require_all(
        rendered_journal,
        [
            implementation,
            receipt,
            commitment,
            "112 passed, 0 failed",
            "32.13 seconds",
        ],
    )

    link_count = verify_local_links(page) + verify_local_links(ROOT / "roadmap.html")
    print(f"verified production contract across 6 surfaces and {link_count} local links")
    return 0


if __name__ == "__main__":
    sys.exit(main())
