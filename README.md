# OpenCSV

**Client-side verified stablecoins on Bitcoin.**

OpenCSV is a verification scheme for stablecoins in which transaction validity is
checked by the parties to a payment — not by a global consensus network. It builds on
the client-side validation (CSV) line of work, most directly
[Shielded CSV](https://eprint.iacr.org/2025/068) (Nick–Eagen–Linus, 2025), and adds the
machinery a stablecoin needs: issuer-gated issuance, publicly auditable supply, and
shielded user-to-user transfers — anchored directly to Bitcoin L1 with no fork and a
64-byte on-chain footprint per transaction.

Key properties:

- **No fork, no new chain.** Transactions publish 64-byte nullifiers as payload in
  ordinary Bitcoin transactions. The base chain provides ordering and double-spend
  resolution; it never sees amounts, balances, or contract logic.
- **Client-side verification.** A recipient verifies a succinct proof (proof-carrying
  data, built on AIR-native recursion — no zkVM) that the coins they receive descend
  from a valid issuer-signed mint through conservation-respecting transfers.
- **Shielded transfers, auditable supply.** Amounts and counterparties in user
  transfers are hidden; mints and redemptions are transparent events, so total supply
  per asset is publicly computable.
- **Issuer-gated supply.** New units come into existence only under a signature from
  the issuer key bound into the asset's genesis parameters.

## Status

Early-stage design + reference implementation. See the roadmap below.

## Repository layout

```
paper/opencsv.md     # the scheme paper (markdown)
web/index.html       # single-page explainer site (static, no build)
crates/opencsv-core/ # Rust: commitments, nullifiers, consignments, verification driver
crates/opencsv-pcd/  # Rust: AIR-native recursive proof engine (Plonky3 + recursion, no zkVM)
crates/opencsv-cli/  # text wallet client
crates/opencsv-signal/ # Signal transport via presage (linked device)
formal/              # Lean 4 mechanization of the core predicates (sorry-free)
```

## Roadmap

1. **Paper + explainer site** — scheme specification and security analysis. *(done)*
2. **Rust core** — `opencsv-core` + `opencsv-pcd`: real proof-carrying data via
   AIR-native recursion over BabyBear (Plonky3 0.6 + Plonky3-recursion), Poseidon2
   commitments/nullifiers, mint/transfer/redeem predicates. *(done — recursive
   transfer verifies 2 predecessor proofs in-circuit; constant 56 KB proofs and
   ~3.6 ms verification regardless of history length; see
   [`crates/opencsv-pcd/BENCHMARKS.md`](crates/opencsv-pcd/BENCHMARKS.md))*
3. **Formal verification** — Lean 4 mechanization of the protocol logic: inflation
   soundness, conservation, nullifier uniqueness, receiver correctness.
   *(done — see [`formal/`](formal/README.md); `lake build` is sorry-free)*
4. **Signal client** — consignments delivered over Signal (presage, all-Rust) plus a
   text CLI driving the wallet. *(done — `opencsv signal link|send|listen` links the
   CLI to your existing Signal account as a secondary device and moves consignment
   blobs as attachments; see
   [`crates/opencsv-signal/README.md`](crates/opencsv-signal/README.md). Note:
   building the `signal` feature needs `protoc` and pulls in AGPL-licensed presage)*

## References

- Nick, Eagen, Linus — *Shielded CSV: Private and Efficient Client-Side Validation*,
  [ePrint 2025/068](https://eprint.iacr.org/2025/068)
- Full list in [`paper/opencsv.md`](paper/opencsv.md)
