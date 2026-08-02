# OpenCSV Master Plan (2026-08-02) — artifact-first

## Context-robustness rule (from the owner)
All coordination state lives in repos/issues, never in chat. This plan is
committed as `ROADMAP.md` in opencsvnet/opencsv on approval, and every track
below maps to GitHub issues, so any future session or agent can resume from
artifacts alone. The plan file is the index; the repos are the state.

## Where we are (verified facts, not memory)
Working system end to end: recursive PCD prover (56 KB proofs, ~3.6 ms verify,
~0.55–0.96 s on-device proving); real Bitcoin anchoring (regtest e2e, Mutinynet
signet live anchor); Signal transport + Signal-iOS app with live two-direction
payments on a physical iPhone; scan-first indexing (marker output; consignment
verified with no RPC, no indexer; cross-implementation anchor discovery);
batching v1 (witness-envelope anchors); Lean formal layer (29 theorems,
CI-gated axioms); full site (animation, story page, journal, living formal
page). In flight at this writing: theorem explainer videos (agent), Aeneas
spike (agent), iOS signet measurement campaign + story-page captures (iOS host).

## Track A — Executable formal verification (the moat)
- **A1. Aeneas spike verdict** (running; agent-6): what translates, what chokes.
- **A2. Pure-kernel extraction** from opencsv-core: bindings, occurrence checks,
  first-occurrence, supply audit — isolated from trait-heavy accept/chain code
  so Aeneas can eat it.
- **A3. Refinement theorems**: translated Rust ≡ Lean spec (occurrence, accept
  decision, scan exclusion). The hand-maintained correspondence table becomes
  proved refinement.
- **A4. Model slimming**: generated definitions replace duplicated shapes;
  theorems re-based; honesty-gap #2 on formal.html flips from "documented, not
  machine-checked" to "proved".
- **A5. Bridge until then**: differential testing (executable Lean model vs
  Rust accept() on random traces) — catches drift while A2–A4 mature.
- Fallbacks in order: pure-kernel-then-Aeneas → Lean→C extraction of the pure
  kernel (Lean 4 emits C; Rust FFI) → keep differential testing as the floor.

## Track B — iOS product completion
- **B1. Field numbers** (iOS host, unblocked by e137096): cold-walk + one-day
  sync bandwidth, 15-min battery windows, receive latency on signet. Gate for
  every "mobile-viable" claim on the site.
- **B2. Story-page captures**: S1 chat view, S2 verified bubble (badge variant
  preferred), S3 send sheet; optional 20–30 s receive→verify centerpiece video.
  Drop-in to web/story.html slots.
- **B3. PR #2 final pass + upstream decision** (owner's call): independent
  re-review after blocker/S-item fixes; then submit to signalapp or hold.
- **B4. Optional self-hosted macOS runner** scoped to opencsvnet/Signal-iOS so
  the fork builds + tests on PRs (owner approval required — runner token).

## Track C — Batching v2 (gossip over Signal)
- **C1. Co-funded (coinjoin-style) batch construction**: each sender
  contributes their own input (ctx_i = own outpoint), binds locally, signs own
  input, pays own share — no coordinator funding, no pre-commit.
- **C2. Gossip handshake over Signal** (2 rounds): batch announce/collect
  (24-byte payloads only) → combine → broadcast. CLI first, then iOS; transport
  is Signal messages, protocol is Signal-agnostic.
- **C3. Lean extension**: co-funded batch model (per-sender ctx_i) reusing the
  Batch.lean envelope results.
- Note: silent payments explicitly rejected for coordination (ECDH breaks the
  quantum-clean anchor layer; EC-scan costlier than GCS filters on mobile).

## Track D — Prover production readiness
- **D1. Prover setup caching** (setup rebuilt per proof today; biggest sender
  latency win).
- **D2. Production FRI parameters** (currently test-grade; re-benchmark after).
- **D3. AIR-native issuer signature** (replaces off-circuit Ed25519; closes the
  last prototype crypto deviation and the post-quantum caveat).
- **D4. Predecessor vk hard-binding** (currently call-site discipline; needs
  upstream p3-recursion exposure or a pinned fork).

## Track E — Mainnet path
- **E1. Signet field validation** (B1 numbers as the gate).
- **E2. Mainnet beta economics**: anchor cost accounting (fees, marker dust,
  batch amortization), fee wallet UX, beta-tagged build.
- **E3. Security review pass**: adversarial review of the anchor/scan layers +
  optional automated scan (codex-security class) over CLI/FFI/Swift.
- **E4. Public beta packaging**: reproducible builds, release checklist, the
  Signal-iOS PR (if B3 says go) as the flagship demo.

## Sequencing & gates
1. Now: videos + Aeneas spike land; B1/B2 from iOS host.
2. This week: A2–A3 (if spike green), D1, C1 design.
3. Gates: E1 opens only on B1 numbers; C2 only after C1 regtest-proven;
   upstream PR only on owner's explicit go.

## Standing coordination
- opencsvnet/Signal-iOS#3 — iOS host channel (design updates, FFI surfaces).
- opencsvnet/opencsv-formal#1 — formal roadmap.
- opencsvnet/opencsv-rs#1,#2 — closed reference; new issues per track item.
- The journal (web/journal.html) records every design change and discovery as
  it lands — it is the narrative of record.
