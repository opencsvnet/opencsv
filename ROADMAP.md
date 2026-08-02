# OpenCSV Master Plan (2026-08-02, rev 3) — artifact-first

## Context-robustness rule (from the owner)
All coordination state lives in repos/issues, never in chat. This file is the
index; the repos are the state. Committed to opencsvnet/opencsv; tracks map to
GitHub issues. Rev 3 incorporates the handover execution order, makes proof
reproducibility a gate for kernel adoption, moves iOS to the final workstream,
and freezes production FRI parameters only after circuit-shaping work.

## Where we are (verified facts)
Working system end to end: recursive PCD prover (56 KB, ~3.6 ms verify,
~0.55–0.96 s on-device); real Bitcoin anchoring (regtest e2e, Mutinynet live
anchor); Signal transport + Signal-iOS app (live two-direction payments on a
physical iPhone); scan-first indexing (marker output; no-RPC/no-indexer
verification; cross-implementation anchor discovery); batching v1 code
(witness-envelope anchors, `3d4da5f`); retarget-fixed header sync (315,800
signet headers through 156 retargets, `e137096`); persistent CBF client
(`6dbbba6`); Lean formal layer (29 theorems, CI-gated); full site (80 s e2e
animation, five theorem explainer videos embedded in formal.html, story page,
journal, living formal page). The pure `opencsv-kernel` carve and four Aeneas
refinement families have landed; A3 reproducible CI and audit expansion are the
current gate. The iOS prototype has hardware/regtest evidence, explorer UI,
captures, and persistence fixes on its feature branch; signet field validation
and final-core integration remain, and iOS is deliberately last in execution.

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
- **A3. `formal-aeneas` project** [PROOFS LANDED; REPRODUCIBILITY IN FLIGHT]: a **separate** Lean 4.31.0 +
  mathlib project (Aeneas pins its toolchain — the main repo stays v4.15
  dependency-free; this fork is deliberate and recorded). Refinement theorems:
  translated kernel ≡ Lean spec (occurrence, first-occurrence, §4.9 supply
  equation). Sorry-free, with the `#print axioms` audit ported from
  `axiom-audit.sh`. Adoption is gated on a pinned Git dependency, green CI,
  duplicate-theorem removal, and an expanded audit surface.
- **A4. Production adoption (the sharpened endgame)**: once A3 is reproducible,
  dual-run kernel and legacy decisions in tests, then have opencsv-core/FFI
  **adopt the verified kernel as the shipped implementation**. No
  language crossing — the verified Rust kernel IS the code. "The model is the
  code" achieved via verify-then-adopt, not extraction.
- **A5. accept() decision logic** (after A4, ~2–4 weeks): a verifiable pure
  decision boundary with explicit input state and stable rejection reasons;
  the trait-heavy driver retains proof, chain, storage, and transport I/O.
- **A6. Differential testing** (bridge, standing): executable Lean model vs
  Rust accept() on random traces until A3 covers the kernel surface.
- Code-style rule (new): anything intended for future verification is written
  kernel-shaped from the start (loops, opaque boundaries, no adapters).
  lean2rust-style extraction is dropped as a path.

## Track C — Batching v2 (gossip over Signal)
- **C0. Protocol + threat model**: commit the participant commitments, fee and
  output rules, abort/retry semantics, coordinator DoS boundary, replay,
  ordering, and transcript serialization before implementation.
- **C1. Co-funded (coinjoin-style) batches**: each sender contributes their own
  input; per-sender ctx_i; no coordinator funding or pre-commit. Issue
  opencsv-rs#4.
- **C2. Gossip handshake over Signal** (2 rounds; 24-byte payloads only).
  CLI first, then iOS; gate: C1 regtest-proven.
- **C3. Lean extension**: co-funded batch model reusing OpenCsv/Batch.lean.
- Recorded rejection: silent payments for coordination (quantum break; EC-scan
  costlier than GCS filters on mobile).

## Track D — Prover production readiness (issue opencsv-rs#3; before Track C)
- **D1. Prover setup caching** (biggest sender-latency win).
- **D4. Predecessor vk hard-binding** (upstream p3-recursion exposure or
  pinned fork).
- **D3. AIR-native issuer signature** (replaces off-circuit Ed25519; closes
  the last prototype crypto deviation + the post-quantum caveat).
- **D2. Production FRI parameters** (last, after D4/D3 freeze circuit and vk
  behavior; explicit proof-version boundary and fresh benchmarks).

## Track E — Mainnet path
- **E1. Signet field validation** through the CLI/reference stack: cold/hot
  sync, bandwidth, latency, recovery, and reliability. iOS is not a gate.
- **E2. Mainnet beta economics**: anchor fees, marker dust, batch amortization,
  fee-wallet UX.
- **E3. Security review pass**: adversarial review of anchor/scan layers +
  optional automated scan (codex-security class) over CLI/FFI/Swift.
- **E4. Public beta packaging**: reproducible CLI/reference builds, release
  checklist, and receipts for every public claim.

## Track B — iOS product completion (final workstream)
- **B0. Prototype evidence** [DONE on feature branch]: PR blockers and S-items,
  explorer UI, persistent client, regtest/hardware receive measurements, and
  story captures. Revalidate; do not redo.
- **B1. Final-core integration**: durable pending export/import, fee key and
  watched UTXOs, phone-native signed anchor construction/P2P broadcast, final
  proof parameters, and batch envelope evidence.
- **B2. Final validation**: rebase, full suites, both flag configurations under
  `-warnings-as-errors`, physical-device two-way flow, crash recovery, and
  mempool-to-confirmed transitions.
- **B3. PR #2 final pass + upstream decision** (owner's explicit call).
- **B4. Optional self-hosted macOS runner** scoped to opencsvnet/Signal-iOS
  (owner approval — runner token).

## Sequencing & gates
1. Now: domain/coordination preparation and A3 reproducibility.
2. Next: staged A4 adoption, differential tests, then A5.
3. Then: D1 → D4 → D3 → D2; only then C0 → C1 → C3 → CLI C2.
4. Then: signet/mainnet readiness and CLI/reference packaging.
5. Last: iOS final-core integration and PR decision.
6. Gates: A4 on green A3 CI/audit; D2 on D4/D3 circuit freeze; C2 on C1
   regtest; security review after A4/A5, D2–D4, and C1; upstream PR only on
   owner's explicit go.

## Standing coordination
- opencsvnet/Signal-iOS#3 — iOS host channel.
- opencsvnet/opencsv-formal#1 — formal roadmap (spike verdict recorded).
- opencsvnet/opencsv-rs#3 (Track D), #4 (Track C).
- opencsvnet/formal-aeneas — separate Lean 4.31 + mathlib refinement project.
- web/journal.html — narrative of record.
