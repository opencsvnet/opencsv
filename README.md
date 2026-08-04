# OpenCSV

**Client-side verified RWAs, stables, and more — on Bitcoin.**

OpenCSV is a verification scheme for issuer-backed assets — RWAs, stablecoins,
and more — in which transaction validity is
checked by the parties to a payment — not by a global consensus network. It builds
on the client-side validation lineage, most directly
[Shielded CSV](https://eprint.iacr.org/2025/068) (Nick–Eagen–Linus, 2025), and adds
what such assets need: issuer-gated issuance, publicly auditable supply, and
shielded user-to-user transfers — anchored directly to Bitcoin L1 with no fork.
Each solo anchor carries a fixed 64-byte record plus one BIP158-visible marker
output; co-funded batches amortize the marker and miner fee.

- **No fork, no new chain.** Transactions publish 64-byte context-bound records
  inside ordinary Bitcoin transactions. Raw nullifiers stay in consignments.
  The base chain provides ordering and double-spend resolution; it never
  evaluates OpenCSV logic.
- **Client-side verification.** Recipients verify one constant-size recursive proof
  (proof-carrying data over AIR — no zkVM) plus one Bitcoin anchor.
- **Shielded transfers, auditable supply.** Amounts and counterparties are hidden
  in transfers; mints and redemptions are transparent, so anyone can compute
  outstanding supply per asset.
- **Issuer-gated supply.** Supply grows only under the issuer key bound into the
  asset's genesis parameters.

**Read the paper: [`paper/opencsv.md`](paper/opencsv.md)** — and the explainer site
at [`index.html`](index.html).

## Status

The protocol has real end-to-end evidence: mint, transfer, rejection of a
double-spend, redemption, and supply audit on regtest; a confirmed signet
anchor; scan-only verification with no RPC/indexer; and two-way transport over
production Signal on a physical iPhone. That August 1 phone demo used the
historical feasibility profile. It proved the interaction model, not production
parameters.

The frozen proof-lineage-v3 profile now binds issuer authorization and recursive
predecessor keys in-circuit, rejects legacy proof/profile tags, and enforces a
94-bit conservative union-adjusted security floor. Current release measurements:

| proof | Apple M4 prove (warm) | verify | size | iPhone 16e prove (cold) |
|---|---:|---:|---:|---:|
| genesis mint | 102 ms | 14.8 ms | 535,705 B | 181 ms |
| transfer / mint predecessors | 7.77 s | 22.2 ms | 854,105 B | 11.25 s |
| transfer / node predecessors | 9.76 s | 21.4 ms | 841,464 B | 14.47 s |
| redeem | 4.71 s | 19.9 ms | 778,466 B | 7.28 s |

Proof size and verification remain independent of coin-history length; cost
depends on the fixed predecessor circuit shape. Full parameters, cold/warm
rows, failed memory profiles, and the security accounting live in the
[benchmark receipt](https://github.com/opencsvnet/opencsv-rs/blob/main/crates/opencsv-pcd/BENCHMARKS.md).

The reference stack also includes co-funded batching v2 and its two-round peer
gossip, a verified pure Rust kernel and pure accept-decision boundary on
`opencsv-rs/main`, and dated signet/readiness receipts. The final Signal product
architecture is intentionally not presented as shipped: Rust owns an OpenCSV
asset wallet and a BIP84 Bitcoin **fee** wallet; there is no anchor server and
no arbitrary-Bitcoin-send API. The base account-wallet foundation is on
`opencsv-rs/main` at `4dc05cf`; its recovery/relay descendant and the
owner-only USD boundary are under review in
[opencsv-rs PR #5](https://github.com/opencsvnet/opencsv-rs/pull/5) at
`e505b181` (owner-only boundary `11ba73ca`).
[Signal-iOS PR #4](https://github.com/opencsvnet/Signal-iOS/pull/4)
at `645f12574d` presents one USD wallet product backed by separately identified,
reviewed issuer instruments. Signal holds owner keys only: it has no issuer
secret, mint action, arbitrary asset creator, or mint FFI. The current registry
is deliberately empty until exact issuer manifests are approved; a ticker is
never enough. The OpenCSV test issuer's disclosure lives in the
[test USD terms](usd-preview/terms-v1/). Both PRs are drafts; physical-phone
acceptance and the merge decision remain outstanding.

Formal evidence is kept in two ledgers rather than one inflated count: 54
sorry-free protocol theorems in `opencsv-formal`, and 15 audited declarations
covering the Aeneas-translated Rust kernel refinements, now on
`formal-aeneas/main` at `3bcafed`. See the
[journal](journal/README.md) for the discoveries, failures, and exact receipts.

## Repositories

| repo | contents |
|---|---|
| **[opencsv](https://github.com/opencsvnet/opencsv)** | this repo — canonical homepage (`index.html`), site assets/pages (`web/`), paper (`paper/`), and journal (`journal/`) |
| **[opencsv-rs](https://github.com/opencsvnet/opencsv-rs)** | Rust reference implementation: core types & accept driver, AIR-native recursive PCD engine, SPV light client + scan engine, bitcoind backend, wallet CLI, Signal transport |
| **[opencsv-formal](https://github.com/opencsvnet/opencsv-formal)** | Lean 4 protocol mechanization (54 audited theorems): inflation, conservation, nullifier/occurrence, receiver correctness, limb soundness, batching v2, scan exclusion |
| **[formal-aeneas](https://github.com/opencsvnet/formal-aeneas)** | Separate Lean 4.31 + mathlib project connecting the Aeneas-translated pure Rust kernel to the specification (15 audited declarations on the green reproducibility receipt) |

## Reference

Nick, Eagen, Linus — *Shielded CSV: Private and Efficient Client-Side Validation*,
[ePrint 2025/068](https://eprint.iacr.org/2025/068). Full bibliography in the paper.
