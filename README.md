# OpenCSV

**Client-side verified stablecoins on Bitcoin.**

OpenCSV is a verification scheme for stablecoins in which transaction validity is
checked by the parties to a payment — not by a global consensus network. It builds
on the client-side validation lineage, most directly
[Shielded CSV](https://eprint.iacr.org/2025/068) (Nick–Eagen–Linus, 2025), and adds
what a stablecoin needs: issuer-gated issuance, publicly auditable supply, and
shielded user-to-user transfers — anchored directly to Bitcoin L1 with no fork and
a 64-byte on-chain footprint per transaction.

- **No fork, no new chain.** Transactions publish 64-byte nullifiers inside ordinary
  Bitcoin transactions. The base chain provides ordering and double-spend
  resolution; it never sees amounts or logic.
- **Client-side verification.** Recipients verify one constant-size recursive proof
  (proof-carrying data over AIR — no zkVM) plus one Bitcoin anchor.
- **Shielded transfers, auditable supply.** Amounts and counterparties are hidden
  in transfers; mints and redemptions are transparent, so anyone can compute
  outstanding supply per asset.
- **Issuer-gated supply.** Supply grows only under the issuer key bound into the
  asset's genesis parameters.

**Read the paper: [`paper/opencsv.md`](paper/opencsv.md)** — and the explainer site
at [`web/index.html`](web/index.html).

## Status

Working reference implementation, live-tested end to end (2026-07-31): coins
minted, anchored, delivered as an end-to-end-encrypted Signal attachment, and
verified by the recipient's client with the real recursive proof engine —
`VERIFIED 100 USD`. Double-spend attempts are rejected by the first-occurrence
rule. Core protocol logic mechanized in Lean 4 (sorry-free).

| proof | prove (release) | verify | size |
|---|---|---|---|
| genesis mint | 64 ms | 3.2 ms | 46,431 B |
| transfer (2-in/2-out, 2 predecessors verified in-circuit) | 2.97 s | 3.6 ms | 56,041 B |
| redeem | 1.47 s | 3.5 ms | 54,058 B |

Constant proof size and verification time regardless of coin history — the
defining property of proof-carrying data, confirmed by measurement
(test-grade FRI parameters; see the paper §7 for the full table and caveats).

## Repositories

| repo | contents |
|---|---|
| **[opencsv](https://github.com/opencsv-project/opencsv)** | this repo — the paper (`paper/`) and explainer site (`web/`) |
| **[opencsv-rs](https://github.com/opencsv-project/opencsv-rs)** | Rust reference implementation: core types & accept driver, AIR-native recursive PCD engine, wallet CLI, Signal transport |
| **[opencsv-formal](https://github.com/opencsv-project/opencsv-formal)** | Lean 4 mechanization: inflation soundness, conservation, nullifier uniqueness, receiver correctness |

## Reference

Nick, Eagen, Linus — *Shielded CSV: Private and Efficient Client-Side Validation*,
[ePrint 2025/068](https://eprint.iacr.org/2025/068). Full bibliography in the paper.
