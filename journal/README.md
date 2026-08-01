# The OpenCSV Journal

A chronological record of discoveries and how the architecture evolved.
Rendered on the site at [web/journal.html](../web/journal.html).

---

## 2026-07-31 — Inception: a client-side verified stablecoin on Bitcoin L1

The project starts from [Shielded CSV](https://eprint.iacr.org/2025/068)
(Nick–Eagen–Linus): client-side validation taken to its conclusion — the chain
carries only nullifiers, recipients verify proofs. Design decisions locked on
day one: anchor directly to Bitcoin L1 (no fork, no new chain), shielded
amounts with **public asset IDs and issuers** (auditable supply over shielded
transfers — the stablecoin-specific tension), and — unusually — **no zkVM**:
hand-written AIR over BabyBear with Plonky3-style recursion, "AIR or faster."

First artifacts: the [paper](../paper/opencsv.md) (v0.1) and the explainer site.

## 2026-07-31 — Recursive PCD works: constant-size proofs over arbitrary history

The core technical bet lands: the transfer circuit verifies **two predecessor
proofs in-circuit** (mint → transfer → transfer), giving constant proof size
and verification time regardless of coin history — the defining property of
proof-carrying data, demonstrated, not assumed. Later measured at 56,041 bytes
and ~3.6 ms verify per hop, identical at hop 1 and hop 2.
([BENCHMARKS.md](https://github.com/opencsvnet/opencsv-rs/blob/main/crates/opencsv-pcd/BENCHMARKS.md))

## 2026-07-31 — Formal verification from the start

Lean 4 mechanization of the protocol logic: inflation soundness (T1),
conservation (T2), nullifier uniqueness (T3), receiver correctness (T4) —
sorry-free, every hardness assumption a labeled axiom. Later: CI **axiom
gating**, so the assumption set can't grow silently
([run](https://github.com/opencsvnet/opencsv-formal/actions/runs/30674804692)).

## 2026-07-31 — Discovery: proving is single-thread-bound

Core-scaling benchmarks: 1 core ≈ 4 = 8 = 64 cores (~3 s per transfer). The
prover is effectively single-threaded at these circuit sizes — so single-core
speed is all that matters, which turns out to make phones interesting.

## 2026-08-01 — Phones beat the server 3–5×

On-device benchmarks (iPhone 16e / A18, iPhone 17 Pro Max / A19 Pro, via
[opencsv-rs#1](https://github.com/opencsvnet/opencsv-rs/issues/1)): recursive
transfer proving at **~0.55–0.96 s on-device** vs 2.97 s on the 64-core Xeon.
Mobile proving is viable — interactive UX territory. Proof sizes byte-identical
to the server, confirming the same circuits.

## 2026-08-01 — Payments over production Signal, both directions

The full loop on a physical iPhone: CLI mints → consignment as an E2E Signal
attachment → `+100 USD · verified` rendered natively in-app; the phone proves a
2-in/2-out transfer (~1 s) → CLI verifies. Audits agree on both sides.
([Signal-iOS#1](https://github.com/opencsvnet/Signal-iOS/issues/1),
[PR #2](https://github.com/opencsvnet/Signal-iOS/pull/2))

CLI-side captures (regenerated weekly by CI from real regtest runs):

![mint](../web/screenshots/mint.png)

## 2026-08-01 — **Discovery: copy-griefing** (the mempool attack)

A raw anchor record is just bytes. A mempool spy can copy a record into their
own transaction and front-run it — under a naive first-occurrence rule the copy
wins and the victim's coins freeze. **Burn, not theft**: the attacker gains
nothing, but the value is destroyed. This started a three-round redesign of the
anchor layer.

## 2026-08-01 — **Failure: the sidecar binding** (caught in code review)

First fix attempt: publish `(nf, B = H(nf, ctx))` and check well-formedness
publicly. Broken on arrival — both inputs are on-chain, so the griefer
*recomputes* B under their own context. The implementing agent flagged it
honestly rather than shipping it. The lesson that shaped the final design:
**public matchability and copy-forgeability are the same property.**

## 2026-08-01 — The bound-payload fix

The corrected construction: the on-chain payload IS the bound value,
`P = H("bind" ∥ nf ∥ ctx)`, and the raw nullifier never goes on-chain (it
travels in the consignment, already inside the proof's public data). Occurrence
recognition requires `nf`, so conflicts are visible to consignment holders.
Copying fails (wrong ctx); recomputing needs `nf` (preimage). Both directions
later mechanized in Lean (`griefer_copy_invisible`,
`no_occurrence_without_knowledge`).

## 2026-08-01 — Real Bitcoin: regtest e2e and a live signet anchor

The demo chain dies. A bitcoind-RPC backend runs the full flow with real
transactions on regtest (mint → VERIFIED → double-spend rejected at a real
block location → supply audit), and a 100-USD mint confirms on **Mutinynet
signet** (tx
[`3282c8ab…`](https://mutinynet.com/tx/3282c8abf1959f35827916ce56debc2d5ddbd52c2a8df33c53c4c724930495d1),
height 3308725), verified by a fresh wallet from server-scanned blocks. Two
backends (bitcoind RPC, esplora) converge on one ctx derivation after a near
dialect split.

## 2026-08-01 — **Discovery: BIP158 filters exclude OP_RETURN**

Empirical (verified against live bitcoind): basic compact block filters omit
OP_RETURN outputs entirely, so anchor records are never filter-matchable — the
compact-filter plan for point verification dies on contact. SPV (headers +
merkle + one block) takes over the point check. The exclusion scan is
*separately* impossible via filters because of the bound-payload duality above.

## 2026-08-01 — u64 limb soundness becomes a theorem

The u64 conservation gadget's carry argument — the scariest informal claim in
the codebase (a wrap-around bug there would mint money) — is mechanized
([b036cf3](https://github.com/opencsvnet/opencsv-formal/commit/b036cf3)):
field equality ⟺ integer equality within the checked range. Bonus honest
finding: the general converse is false (some valid splits are rejected at
witness generation — a completeness limitation, not a soundness hole),
documented instead of lurking. The living formal page now carries 17 theorems,
regenerated weekly from the build.

## 2026-08-01 — Indexing evolves four times in a day

Anchor-server (demoted) → owner's full node → N-of-M indexer cross-check →
finally **scan-first indexing**, the design that made filters useful again:
anchor transactions add a **constant marker output** (546 sats to
`OP_0 ∥ sha256(OP_TRUE)`, P2WSH, quantum-clean). Filters include it, so phones
find anchor blocks trustlessly at ~KB/block; the OP_RETURN record stays
ctx-bound and uncopiable; exclusion becomes a *local* check. Indexers demoted
to optional, spot-verifiable accelerators. Paper §4.7.1 rewritten the same day.

## 2026-08-01 — The scan soundness formal package (in progress)

The formal layer follows the deployment: no-false-negatives of filter
discovery (trustless absence is *provable*, not assumed), scan-exclusion
soundness (scan-first ≡ full-block scanning), marker zero-authority, and
accelerator fraud-provability. The N-of-M honesty hypothesis is **eliminated
from the roadmap** — the architecture got better, so the assumptions got fewer.

---

*Screenshots are regenerated weekly by CI from real regtest runs
([workflow](https://github.com/opencsvnet/opencsv/actions/workflows/screenshots.yml)).
Benchmarks live in
[BENCHMARKS.md](https://github.com/opencsvnet/opencsv-rs/blob/main/crates/opencsv-pcd/BENCHMARKS.md).
The formal ledger is at [opencsvnet.github.io/opencsv/web/formal.html](../web/formal.html).*
