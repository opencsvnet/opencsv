# OpenCSV Master Plan (2026-08-03, rev 4) — artifact-first

## Context-robustness rule (from the owner)
All coordination state lives in repos/issues, never in chat. This file is the
index; the repos are the state. Committed to opencsvnet/opencsv; tracks map to
GitHub issues. Rev 3 incorporates the handover execution order, makes proof
reproducibility a gate for kernel adoption, moves iOS to the final workstream,
and freezes production FRI parameters only after circuit-shaping work. Rev 4
separates historical prototype receipts from the frozen production profile,
records the co-funded batching/security work that landed, and adopts the
Signal-native, serverless account-wallet architecture.

## Where we are (verified facts)
Working system end to end: production proof-lineage v3 (94-bit enforced floor,
0.54–0.85 MB proofs, 15–22 ms desktop verification, 11.25–14.47 s physical
iPhone transfer proving); real Bitcoin anchoring (regtest e2e and live signet
receipts); scan-first indexing (no-RPC/no-indexer verification and
cross-implementation anchor discovery); co-funded batching v2 with real
three-peer gossip→broadcast→replacement evidence; retarget-correct signet
header sync; and 54 CI-gated Lean specification theorems. The separate Aeneas
project has 15 audited translated-Rust declarations on its default branch.

The August 1 Signal-iOS prototype remains valid evidence for encrypted
transport, native rendering, self-scanning receive, and on-device feasibility;
its ~0.55–0.96 s numbers are explicitly the historical test profile. The final
architecture is different: Rust owns the asset wallet, BIP84 fee wallet,
operation journal, signing, transaction layout, and relay; Bitcoin is spendable
only by OpenCSV mint/transfer/fee-bump operations; no OpenCSV anchor server or
general BTC send path exists. The Rust wallet base is on `opencsv-rs/main` at
`4dc05cf`; recovery/relay hardening plus the fixed instrument boundary are in
draft [opencsv-rs PR #5](https://github.com/opencsvnet/opencsv-rs/pull/5) at
`3bfaa187`. Signal-iOS migration is published but unmerged in draft
[PR #4](https://github.com/opencsvnet/Signal-iOS/pull/4) at `aa9fc331` and
remains deliberately last. Its product surface is narrowed to one fixed
signet/regtest USD Preview; custom instrument creation is not a v1 goal.

## Track A — Executable formal verification (REVISED per spike verdict)
The spike (REPORT in formal-formal issue #1): **full-crate Aeneas is dead**
(charon std-iterator bug, dyn/GAT/serde rejection, aeneas crash, sorries in
aeneas's own Lean library). **Kernel-extraction-then-Aeneas is proven**
(spike crate translated, built, and proved `binding_eq_spec`,
`well_formed_spec` with only core axioms + opaque hash).
- **A2. `opencsv-kernel`** [DONE, `b64bdf4`]: carve the pure decision logic
  from opencsv-core — binding, well_formed, first_occurrence, supply audit —
  in the Aeneas-compatible shape (loops only, no iterator adapters, no
  serde/dyn/RNG/generics, opaque hash boundary). Byte-identical semantics;
  kernel≡core tests as the immediate bridge.
- **A3. `formal-aeneas` project** [DONE, `3bcafed`]: a **separate** Lean 4.31.0 +
  mathlib project (Aeneas pins its toolchain — the main repo stays v4.15
  dependency-free; this fork is deliberate and recorded). Refinement theorems:
  translated kernel ≡ Lean spec (occurrence, first-occurrence, §4.9 supply
  equation). Sorry-free, with the `#print axioms` audit ported from
  `axiom-audit.sh`. Adoption is gated on a pinned Git dependency, green CI,
  duplicate-theorem removal, and an expanded 15-declaration audit surface. The
  exact green commit was reviewed and fast-forwarded to the default branch;
  [PR #1](https://github.com/opencsvnet/formal-aeneas/pull/1) records the
  no-rewrite merge and its audit artifact.
- **A4. Production adoption (the sharpened endgame)** [DONE ON MAIN, `e4265b9`]: once A3 is reproducible,
  dual-run kernel and legacy decisions in tests, then have opencsv-core/FFI
  **adopt the verified kernel as the shipped implementation**. No
  language crossing — the verified Rust kernel IS the code. "The model is the
  code" achieved via verify-then-adopt, not extraction.
- **A5. accept() decision logic** [DONE ON MAIN, `e4265b9`]: a verifiable pure
  decision boundary with explicit input state and stable rejection reasons;
  the trait-heavy driver retains proof, chain, storage, and transport I/O.
- **A6. Differential testing** (bridge, standing): executable Lean model vs
  Rust accept() on random traces until A3 covers the kernel surface.
- Code-style rule (new): anything intended for future verification is written
  kernel-shaped from the start (loops, opaque boundaries, no adapters).
  lean2rust-style extraction is dropped as a path.

## Track C — Batching v2 (gossip over authenticated transports)
- **C0. Protocol + threat model** [DONE]: commit the participant commitments, fee and
  output rules, abort/retry semantics, coordinator DoS boundary, replay,
  ordering, and transcript serialization before implementation.
- **C1. Co-funded (coinjoin-style) batches** [DONE]: a signed reusable stock
  input fixes the shared context; each sender contributes one separate fee
  input, payload, and change output; no coordinator funds participant fees. Issue
  opencsv-rs#4.
- **C2. Authenticated gossip handshake** [DONE ON MAIN, `e4265b9`]: two rounds,
  canonical bodies, stock/fee-key authorization,
  durable reservations and exact-manifest recovery. The TCP/CLI relay key is a
  transport profile, not a Signal protocol requirement. Historical v2 is
  read-only; new sessions use the safe-marker v3 profile.
- **C3. Lean extension** [DONE ON MAIN, `c4f970d`]: co-funded batch model
  reusing `OpenCsv.Batch`. Review found that the first replacement relation
  did not require valid endpoint manifests; `a831b13` closed that gap. Final
  C1 reconciliation then added duplicate-field rejection, reusable
  stock/change floors, nonzero proposal guards, and corrected the
  64-participant label to reference policy. The checked audit now covers 54
  declarations; [PR #2](https://github.com/opencsvnet/opencsv-formal/pull/2)
  records the exact fast-forward.
- Recorded rejection: silent payments for coordination (quantum break; EC-scan
  costlier than GCS filters on mobile).

## Track D — Prover production readiness [DONE ON MAIN]
- **D1. Prover setup caching**: complete setup/vk identity; bounded reuse;
  cold/warm/invalidation/concurrency receipts.
- **D4. Predecessor vk hard-binding**: recursive predecessor commitments are
  constrained in-circuit; root-circuit commitment distribution remains an
  explicit deployment boundary.
- **D3. AIR-native issuer authorization**: v3 mints prove knowledge of the
  issuer seed bound by genesis and transcript-bind the mint statement in the
  same circuit. The coin proof is the authorization artifact; it is not a
  conventional standalone signature. Legacy Ed25519 records are read-only.
- **D2. Production FRI parameters**: frozen v3 profile, 94-bit conservative
  enforced floor, explicit version boundary, desktop and physical-device
  benchmarks. Failed high-memory phone profiles are recorded, not hidden.

## Track E — Mainnet path
- **E1. Signet field validation** [RECEIPTS ON MAIN; FINAL ACCEPTANCE OPEN] through the CLI/reference stack: cold/hot
  sync, bandwidth, latency, recovery, and reliability. iOS is not a gate.
- **E2. Mainnet beta economics** [MODEL RECORDED; RELEASE GATE OPEN]: anchor fees, marker cost, batch amortization,
  fee-wallet UX.
- **E3. Security review pass** [IN PROGRESS]: adversarial review of anchor/scan layers +
  optional automated scan (codex-security class) over CLI/FFI/Swift.
- **E4. Public beta packaging** [CHECKLIST/REPRO RECEIPT; NO RELEASE]: reproducible CLI/reference builds, release
  checklist, and receipts for every public claim.

## Track B — iOS product completion (final workstream)
- **B0. Prototype evidence** [DONE on feature branch]: PR blockers and S-items,
  explorer UI, persistent client, regtest/hardware receive measurements, and
  story captures. Revalidate; do not redo.
- **B1. Signal-native wallet architecture** [RUST BASE ON MAIN, `4dc05cf`;
  HARDENING/INSTRUMENT DRAFT `3bfaa187`; SWIFT DRAFT `aa9fc331`]: Rust-owned
  account root, non-migratable device binding, BIP84 fee
  wallet, owner/issuer derivation, durable operations, authoritative outpoint
  revalidation, signed-before-relay persistence, safe RBF, direct P2P relay,
  canonical consignment identity, and action-only FFI. No anchor server,
  caller-selected inputs/change, arbitrary BTC send, or raw broadcast.
- **B1a. USD Preview product boundary** [DRAFT PRS + LOCAL TEST RECEIPTS]: one fixed
  signet/regtest instrument, six-decimal exact amounts, no ticker-defined
  creation or multi-asset picker, legacy prototypes read-only, and an explicit
  authenticated version boundary before any future Tether instrument. Receipt:
  4 core instrument tests, 26 account-wallet tests, source-built CocoaPods pin,
  full unsigned Signal simulator build, and the focused exact-amount test.
- **B2. Final validation**: rebase, full suites, both flag configurations under
  `-warnings-as-errors`, physical-device two-way flow, crash recovery, and
  mempool-to-confirmed transitions.
- **B3. PR #2 final pass + upstream decision** (owner's explicit call).
- **B4. Optional self-hosted macOS runner** scoped to opencsvnet/Signal-iOS
  (owner approval — runner token).

## Sequencing & gates
1. A4/A5/readiness/C2-audit and the Rust account-wallet descendant are merged
   on exact green candidate CI. The owner deferred the outstanding independent
   adversarial re-review; it is not represented as completed, and later findings
   must be fixed forward.
2. The corrected C3 formal model is merged on exact green CI at `c4f970d`.
3. Finish reference signet acceptance, security review, and reproducible
   packaging. No release or mainnet broadcast is implied.
4. Last: fresh Signal-iOS checkout, in-place migration, both build flags,
   physical-device crash/recovery/confirmation/fee-bump acceptance, and PR
   decision.
5. Gates: no silent protocol fallback, every public claim has a receipt, every
   design failure is journaled, and upstream/release/mainnet actions require the
   owner's separate approval.

## Standing coordination
- opencsvnet/Signal-iOS#3 — iOS host channel.
- opencsvnet/opencsv-formal#1 — formal roadmap (spike verdict recorded).
- opencsvnet/opencsv-rs#3 (Track D), #4 (Track C).
- opencsvnet/formal-aeneas — separate Lean 4.31 + mathlib refinement project.
- web/journal.html — narrative of record.
