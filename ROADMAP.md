# OpenCSV Master Plan (2026-08-04, rev 5) — artifact-first

## Context-robustness rule (from the owner)
All coordination state lives in repos/issues, never in chat. This file is the
index; the repos are the state. Committed to opencsvnet/opencsv; tracks map to
GitHub issues. Rev 3 incorporates the handover execution order, makes proof
reproducibility a gate for kernel adoption, moves iOS to the final workstream,
and freezes production FRI parameters only after circuit-shaping work. Rev 4
separates historical prototype receipts from the frozen production profile,
records the co-funded batching/security work that landed, and adopts the
Signal-native, serverless account-wallet architecture.
Rev 5 removes issuance authority from Signal and models its one USD product as
an aggregate view over separately authenticated issuer instruments.

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
only by OpenCSV transfer/fee-bump operations; no OpenCSV anchor server or
general BTC send path exists. The Rust wallet base is on `opencsv-rs/main` at
`4dc05cf`; recovery/relay hardening plus the owner-only issuer registry are in
draft [opencsv-rs PR #5](https://github.com/opencsvnet/opencsv-rs/pull/5) at
`ab0b20f` (owner-only boundary `11ba73ca`; headless issuer operator
`7882e185`). Signal-iOS migration is published but unmerged in draft
[PR #4](https://github.com/opencsvnet/Signal-iOS/pull/4), with the reviewed
signet-issuer integration at `4fec89e902`, and
remains deliberately last. Signal is an owner wallet, never an issuer console:
it shows one USD product over reviewed issuer-specific identities and exposes
no minting or custom instrument creation.

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
- **C4. Same-transaction sequential payments** [RESEARCH, NOT IMPLEMENTED]:
  current batches combine independent payments and current zero-confirmation
  children use separate Bitcoin fee anchors. Putting Alice→Bob and Bob→Carol
  inside one underlying transaction requires a versioned intra-batch dependency
  model, context/proof timing rules, fee responsibility, replacement semantics,
  and adversarial receipts. Do not infer this capability from C1 batching.
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
- **E2. Mainnet beta economics** [MODEL RECORDED; PUBLICATION DRAFT]: anchor
  fees, marker cost, batch amortization, and fee-wallet UX. The pinned model
  corrects the old payload-only throughput shortcut: 7.32 solo versus 15.15
  64-party theoretical full-block operations/s, and 67% modeled fee saving at
  5 sat/vB. `/scale.html`, its JSON receipt, paper v0.3, and CI reproduction must
  merge together; the release gate remains open.
- **E3. Security review pass** [IN PROGRESS]: adversarial review of anchor/scan layers +
  optional automated scan (codex-security class) over CLI/FFI/Swift.
- **E4. Public beta packaging** [CHECKLIST/REPRO RECEIPT; NO RELEASE]: reproducible CLI/reference builds, release
  checklist, and receipts for every public claim.

## Track B — iOS product completion (final workstream)
- **B0. Prototype evidence** [DONE on feature branch]: PR blockers and S-items,
  explorer UI, persistent client, regtest/hardware receive measurements, and
  story captures. Revalidate; do not redo.
- **B1. Signal-native wallet architecture** [RUST BASE ON MAIN, `4dc05cf`;
  OWNER-ONLY DRAFT `1ef29d2`; SWIFT DRAFT `4fec89e902`]: Rust-owned
  account root, non-migratable device binding, BIP84 fee
  wallet, owner derivation, durable operations, authoritative outpoint
  revalidation, signed-before-relay persistence, safe RBF, direct P2P relay,
  canonical consignment identity, and action-only FFI. No anchor server,
  caller-selected inputs/change, arbitrary BTC send, raw broadcast, issuer
  secret, asset-definition call, or mint call.
- **B1a. One USD product, exact issuers** [DRAFT PRS + LOCAL TEST RECEIPTS]:
  reviewed public manifests admit issuer-specific assets under the USD wallet
  product. Every issuer retains its own `asset_id`, key, terms, supply, and
  redemption claim. Signal aggregates display balances but chooses one
  priority-ordered issuer that covers the whole send, names it at review, and
  records its exact identity in the receipt. It rejects rather than silently
  mixing issuer tranches. Ticker lookalikes and legacy per-wallet preview assets
  remain read-only. Signet now pins one exact, test-only OpenCSV USD Preview
  manifest (`1d58a814…b507`); mainnet/regtest remain empty and Tether is neither
  implied nor fabricated. Receipt: 29 Rust account-wallet tests, source-built
  CocoaPods pin, focused selection/amount tests, a full signed Signal simulator
  build, and a live registered simulator showing 0 USD with 20,000 confirmed
  signet fee sats.
- **B1b. Headless issuer operator** [DRAFT `15f0ac2`; OPERATOR `7882e185`]: issuance remains
  available outside Signal through the non-default `opencsv-issuer` binary.
  It reads distinct issuer root/device-binding secrets from owner-only files,
  creates exact public manifests, mints only by exact asset id, requires exact
  checkpoint acknowledgements, owner-only create-new checkpoint-file export,
  and JSON status, broadcast, resume, cancel, and protocol-safe fee-bump
  operations. Signal's default/CocoaPods graph and C ABI remain owner-only.
  Five CLI tests plus 29 account-wallet
  tests and warnings-denied focused builds pass. Live preparation found and
  fixed a self-referential checkpoint hash; the corrected exact checkpoint was
  acknowledged before signing. The first funded mint is broadcast as signet
  transaction `eb5571a6…1c22c`, and its canonical consignment reached the
  registered simulator over Signal. A tracked protocol-safe bump replaced it
  with `2cac7c02…a762c` at 5 sat/vB while preserving the funding input, record,
  marker, output positions, context, and proof semantics. Because the first
  attachment named the replaced txid, exact-txid acceptance withheld it; the
  repaired wallet regenerates and redelivers replacement-bound consignment
  bytes. No USD credit or completed acceptance claim exists yet. The
  real simulator evidence set now contains six screenshots and a composed
  40-second screen recording; confirmed balance/send frames remain gated on
  actual confirmation.
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
