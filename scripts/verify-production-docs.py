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
    readme = ROOT / "README.md"
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
            "production_issuance_not_authorized",
            "production_root_vk_authentication_required",
            "D5 root verification-key authentication",
            "Consumer policy is not issuance authority",
            "crash resume verify that authorization before parsing",
            "fee-bump paths verify it before authoritative chain checks",
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
            "Activated release with zero issuers or a placeholder revision",
            "Mainnet mint writes: <code>production_issuance_not_authorized</code>",
            "production_root_vk_authentication_required",
            "D5: independent recursive root-key authentication",
            "Crash resume revalidates it before parsing or network I/O",
            "Fee bump revalidates it before chain checks or signing",
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
            "production_issuance_not_authorized",
            "production_root_vk_authentication_required",
            "D5 — root verification-key authentication",
            "Crash resume revalidates it before transaction parsing",
            "fee bump does so before chain verification or replacement signing",
        ],
    )
    require_all(
        readme,
        [
            "D4 binds predecessor keys, but v4 still rebuilds",
            "the root verifier from proof-carried common data.",
            "must independently authenticate that root before a mainnet write can activate.",
            "production_issuance_not_authorized",
            "production_root_vk_authentication_required",
            "proof tag cannot bypass D5.",
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
            "production_issuance_not_authorized",
            "production_root_vk_authentication_required",
            "D5 requires a",
            "Crash",
            "rebroadcast of solo, shared-batch, and reserve transactions",
            "before chain verification or replacement signing",
        ],
    )

    implementation = "aa495a76d84003c91e457e7ded522125231bac03"
    ci_receipt = "6fc1e4ca410083297250f4d7a7cfce474f4f2d93"
    activation_receipt = "6fdafb48867e5237c0f38d4e125ec62b4e076205"
    issuance_receipt = "a1809ebf7be42e7fa01f23b969c3a401b8aa8722"
    resume_receipt = "36cadb9f4e886499c5f3cae302c7c38c26badd4d"
    receipt = "11bad686b10775207d40e3c85bdde61099637e63"
    d5_receipt = "cd9a71f7ab4703162b47848dc1fdda0f9841b7b3"
    commitment = "bf808e3e0a5fad6cbc8caf23741e82adb5fbe5dd21dfb5a00840fd0801361169"
    require_all(canonical, [d5_receipt, "31919832350", "31919834317"])
    require_all(roadmap, [d5_receipt, "31919832350", "31919834317"])
    require_all(
        journal,
        [
            implementation,
            ci_receipt,
            activation_receipt,
            issuance_receipt,
            resume_receipt,
            receipt,
            d5_receipt,
            commitment,
            "115 passed, 0 failed",
            "31.92 seconds",
            "production_issuance_not_authorized",
            "production_root_vk_authentication_required",
            "The roadmap overstated root-key readiness",
        ],
    )
    require_all(
        rendered_journal,
        [
            implementation,
            ci_receipt,
            activation_receipt,
            issuance_receipt,
            resume_receipt,
            receipt,
            d5_receipt,
            commitment,
            "115 passed, 0 failed",
            "31.92 seconds",
            "production_issuance_not_authorized",
            "production_root_vk_authentication_required",
            "The roadmap overstated root-key readiness",
        ],
    )

    link_count = verify_local_links(page) + verify_local_links(ROOT / "roadmap.html")
    print(f"verified production contract across 7 surfaces and {link_count} local links")
    return 0


if __name__ == "__main__":
    sys.exit(main())
