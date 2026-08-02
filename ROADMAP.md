# OpenCSV Master Plan (2026-08-02, rev 2) — artifact-first

## Context-robustness rule (from the owner)
All coordination state lives in repos/issues, never in chat. This file is the
index; the repos are the state. Committed to opencsvnet/opencsv; tracks map to
GitHub issues. Rev 2 incorporates the Aeneas spike verdict and the day's
shipped work.

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
journal, living formal page). In flight: `opencsv-kernel` carve + Aeneas
refinement project (agent-6); iOS signet measurement campaign + story-page
captures (iOS host).

## Track A — Executable formal verification (REVISED per spike verdict)
The spike (REPORT in formal-formal issue #1): **full-crate Aeneas is dead**
(charon std-iterator bug, dyn/GAT/serde rejection, aeneas crash, sorries in
aeneas's own Lean library). **Kernel-extraction-then-Aeneas is proven**
(spike crate translated, built, and proved `binding_eq_spec`,
`well_formed_spec` with only core axioms + opaque hash).
- **A2. `opencsv-kernel`** [IN FLIGHT, agent-6]: carve the pure decision logic
  from opencsv-core — binding, well_formed, first_occurrence, supply audit —
  in the Aeneas-compatible shape (loops only, no iterator adapters, no
  serde/dyn/RNG/generics, opaque hash boundary). Byte-identical semantics;
  kernel≡core tests as the immediate bridge.
- **A3. `formal-aeneas` project** [IN FLIGHT]: a **separate** Lean 4.31.0 +
  mathlib project (Aeneas pins its toolchain — the main repo stays v4.15
  dependency-free; this fork is deliberate and recorded). Refinement theorems:
  translated kernel ≡ Lean spec (occurrence, first-occurrence, §4.9 supply
  equation). sorry-free, `#print axioms` CI audit ported from axiom-audit.sh.
- **A4. Production adoption (the sharpened endgame)**: once the kernel is
  verified, opencsv-core/FFI **adopt it as the shipped implementation**. No
  language crossing — the verified Rust kernel IS the code. "The model is the
  code" achieved via verify-then-adopt, not extraction.
- **A5. accept() decision logic** (later, ~2–4 weeks): the big design item —
  a verifiable pure decision kernel out of the trait-heavy accept() driver.
- **A6. Differential testing** (bridge, standing): executable Lean model vs
  Rust accept() on random traces until A3 covers the kernel surface.
- Code-style rule (new): anything intended for future verification is written
  kernel-shaped from the start (loops, opaque boundaries, no adapters).
  lean2rust-style extraction is dropped as a path.

## Track B — iOS product completion
- **B1. Field numbers** (iOS host; unblocked): cold-walk + one-day sync
  bandwidth, battery windows, receive latency on signet. Gates the
  "mobile-viable" claims.
- **B2. Story-page captures** (S1 chat, S2 verified bubble, S3 send sheet;
  optional 20–30 s receive→verify video) → drop into web/story.html.
- **B3. PR #2 final pass + upstream decision** (owner's call).
- **B4. Optional self-hosted macOS runner** scoped to opencsvnet/Signal-iOS
  (owner approval — runner token).

## Track C — Batching v2 (gossip over Signal)
- **C1. Co-funded (coinjoin-style) batches**: each sender contributes their own
  input; per-sender ctx_i; no coordinator funding or pre-commit. Issue
  opencsv-rs#4.
- **C2. Gossip handshake over Signal** (2 rounds; 24-byte payloads only).
  CLI first, then iOS; gate: C1 regtest-proven.
- **C3. Lean extension**: co-funded batch model reusing OpenCsv/Batch.lean.
- Recorded rejection: silent payments for coordination (quantum break; EC-scan
  costlier than GCS filters on mobile).

## Track D — Prover production readiness (issue opencsv-rs#3)
- **D1. Prover setup caching** (biggest sender-latency win).
- **D2. Production FRI parameters** (currently test-grade; re-benchmark after).
- **D3. AIR-native issuer signature** (replaces off-circuit Ed25519; closes
  the last prototype crypto deviation + the post-quantum caveat).
- **D4. Predecessor vk hard-binding** (upstream p3-recursion exposure or
  pinned fork).

## Track E — Mainnet path
- **E1. Signet field validation** (gated on B1 numbers).
- **E2. Mainnet beta economics**: anchor fees, marker dust, batch amortization,
  fee-wallet UX.
- **E3. Security review pass**: adversarial review of anchor/scan layers +
  optional automated scan (codex-security class) over CLI/FFI/Swift.
- **E4. Public beta packaging**: reproducible builds, release checklist, the
  Signal-iOS PR (if B3 says go) as flagship demo.

## Sequencing & gates
1. Now: A2/A3 land; B1/B2 from iOS host.
2. Next: D1, C1 design; A5 scoping after A3 proves out.
3. Gates: E1 on B1 numbers; C2 on C1 regtest; production adoption of the
   kernel (A4) only after A3 refinement theorems are green; upstream PR only
   on owner's explicit go.

## Standing coordination
- opencsvnet/Signal-iOS#3 — iOS host channel.
- opencsvnet/opencsv-formal#1 — formal roadmap (spike verdict recorded).
- opencsvnet/opencsv-rs#3 (Track D), #4 (Track C).
- opencsvnet/formal-aeneas — to be created when A3 lands (or kept as a
  directory of opencsv-formal with a separate lakefile; decide at A3 review).
- web/journal.html — narrative of record.
