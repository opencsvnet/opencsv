#!/usr/bin/env python3
"""Verify published Bitcoin-performance figures against their exact model."""

from __future__ import annotations

import argparse
import csv
import json
import math
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "web/data/bitcoin-performance-v1.json"


def fail(message: str) -> None:
    raise SystemExit(f"performance receipt mismatch: {message}")


def expected_row(constants: dict[str, int], participants: int, feerate: int) -> dict[str, int | float]:
    weight = constants["batch_base_weight_wu"] + constants["batch_per_participant_weight_wu"] * participants
    batch_vbytes = math.ceil(weight / 4)
    solo_total = participants * (
        constants["solo_max_vbytes"] * feerate + constants["marker_cost_sats"]
    )
    batch_total = batch_vbytes * feerate + constants["marker_cost_sats"]
    savings = solo_total - batch_total
    return {
        "participants": participants,
        "feerate_sat_vb": feerate,
        "batch_weight_wu": weight,
        "batch_vbytes": batch_vbytes,
        "solo_total_sats": solo_total,
        "batch_total_sats": batch_total,
        "savings_sats": savings,
        "savings_percent": round(100 * savings / solo_total, 1),
        "batch_charge_floor_sats": batch_total // participants,
        "batch_charge_ceil_sats": math.ceil(batch_total / participants),
        "theoretical_full_block_ops_per_second": round(
            math.floor(constants["block_weight_wu"] / weight)
            * participants
            / constants["model_block_interval_seconds"],
            2,
        ),
    }


def verify_json(data: dict) -> None:
    constants = data["constants"]
    expected_keys = {
        (participants, feerate)
        for participants in data["participant_counts"]
        for feerate in data["fee_rates_sat_vb"]
    }
    actual = {(row["participants"], row["feerate_sat_vb"]): row for row in data["rows"]}
    if set(actual) != expected_keys:
        fail("row grid does not cover every declared participant/feerate pair exactly once")
    for key, row in actual.items():
        expected = expected_row(constants, *key)
        if row != expected:
            fail(f"row {key} is {row}, expected {expected}")


def verify_rust(data: dict, rust_source: Path) -> None:
    command = [
        "cargo",
        "run",
        "--quiet",
        "--locked",
        "-p",
        "opencsv-bitcoin",
        "--example",
        "fee_model",
        "--",
        *map(str, data["fee_rates_sat_vb"]),
    ]
    output = subprocess.check_output(command, cwd=rust_source, text=True)
    rust_rows = {}
    for row in csv.DictReader(output.splitlines()):
        key = (int(row["participants"]), int(row["feerate_sat_vb"]))
        rust_rows[key] = {
            "solo_max_vbytes": int(row["solo_max_vbytes"]),
            "batch_max_vbytes": int(row["batch_max_vbytes"]),
            "solo_total_sats": int(row["solo_total_sats"]),
            "batch_total_sats": int(row["batch_total_sats"]),
            "savings_sats": int(row["savings_sats"]),
            "batch_charge_floor_sats": int(row["batch_charge_floor"]),
            "batch_charge_ceil_sats": int(row["batch_charge_ceiling"]),
        }
    for row in data["rows"]:
        key = (row["participants"], row["feerate_sat_vb"])
        rust = rust_rows.get(key)
        if rust is None:
            fail(f"Rust fee model omitted {key}")
        expected = {
            "solo_max_vbytes": data["constants"]["solo_max_vbytes"],
            "batch_max_vbytes": row["batch_vbytes"],
            "solo_total_sats": row["solo_total_sats"],
            "batch_total_sats": row["batch_total_sats"],
            "savings_sats": row["savings_sats"],
            "batch_charge_floor_sats": row["batch_charge_floor_sats"],
            "batch_charge_ceil_sats": row["batch_charge_ceil_sats"],
        }
        if rust != expected:
            fail(f"Rust fee model row {key} is {rust}, published row is {expected}")


def verify_copy() -> None:
    scale = (ROOT / "scale.html").read_text()
    paper = (ROOT / "paper/opencsv.md").read_text()
    required = ["7.32", "15.15", "67%", "35,596", "107,904"]
    for value in required:
        if value not in scale:
            fail(f"scale.html does not contain canonical value {value}")
    if "100 anchors per second" in paper:
        fail("paper still contains the superseded throughput claim")
    if "15.15" not in paper or "7.32" not in paper:
        fail("paper does not contain the corrected saturation bounds")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rust-source", type=Path)
    args = parser.parse_args()
    data = json.loads(DATA_PATH.read_text())
    verify_json(data)
    verify_copy()
    if args.rust_source:
        verify_rust(data, args.rust_source)
    print(f"verified {len(data['rows'])} performance rows and public copy")
    return 0


if __name__ == "__main__":
    sys.exit(main())
