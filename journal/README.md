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

## 2026-08-01 — The scan soundness formal package

The formal layer follows the deployment: no-false-negatives of filter
discovery (trustless absence is *provable* — and it fell out of the
construction in one line), scan-exclusion soundness (scan-first ≡ full-block
scanning), marker zero-authority, and accelerator fraud-provability — 23
theorems, no new axioms
([00edaed](https://github.com/opencsvnet/opencsv-formal/commit/00edaed)). The
N-of-M honesty hypothesis is **eliminated from the roadmap** — the
architecture got better, so the assumptions got fewer.

## 2026-08-02 — Verify-then-adopt becomes real

The pure [`opencsv-kernel`](https://github.com/opencsvnet/opencsv-rs/commit/b64bdf49caa3a46a10084e20fc36560bb2b8def3)
carves binding, occurrence, first-occurrence, and supply logic into an
Aeneas-compatible Rust surface and dual-runs it against the legacy core.
The separate `formal-aeneas` project proves translated Rust equal to the Lean
specification. The important distinction is now enforceable: 29 specification
theorems and 15 translated-Rust audit declarations are separate honesty
ledgers, not one inflated theorem count.

## 2026-08-02 — The mempool sentinel: one symptom, three lookups

Fresh mints verified everywhere except the phone's credit path. Consignments
created before confirmation carried a mempool sentinel, while one snapshot
path demanded a confirmed location. Fixing only `locate()` would still fail:
the accept driver asks `anchor_at` and `ctx_at` first. Commit
[`1616397`](https://github.com/opencsvnet/opencsv-rs/commit/1616397)
resolves the sentinel through one shared lookup and makes chain lag a retryable
condition rather than a final rejection.

## 2026-08-02 — Serverless crediting closes the receive loop

[`opencsv_scan_export_snapshot`](https://github.com/opencsvnet/opencsv-rs/commit/290c8e0)
projects the phone's own compact-filter scan into the snapshot consumed by the
crediting verifier. A real consignment was verified and credited with **no RPC,
no indexer, and no anchor server**. This demoted public explorers to optional
hints and made the architectural rule explicit: an OpenCSV-specific server is
not part of acceptance.

## 2026-08-02 — A proof that only builds on one laptop is not a receipt

The first Aeneas project depended on an absolute local path and audited only a
subset of its declarations. The reproducibility branch pins the Aeneas Lean
library by exact Git revision, removes the duplicate binding theorem, expands
the translated-Rust audit to 15 declarations, and passes hosted Lean CI
([run 30765043746](https://github.com/opencsvnet/formal-aeneas/actions/runs/30765043746)).
The public formal page labels the 29 specification theorems and 15 refinement
declarations separately. The exact green commit was later fast-forwarded to
`formal-aeneas/main` as
[`3bcafed`](https://github.com/opencsvnet/formal-aeneas/commit/3bcafedf754dc473e648fcb6565f5ad9b80af963)
without a merge commit or history rewrite.

## 2026-08-02 — Field sync finds a consensus bug; batching v1 finds a script bug

The first signet sync failed at height 2016 because the client treated signet
like a min-difficulty test chain. Commit
[`e137096`](https://github.com/opencsvnet/opencsv-rs/commit/e137096)
syncs 315,800 headers through 156 retargets. Batching v1 then exposed a
standardness mistake: a bare `OP_TRUE` witness script fails CLEANSTACK when
envelope items remain. The corrected `OP_DROP×(n+1) OP_TRUE` construction
shipped as [`3d4da5f`](https://github.com/opencsvnet/opencsv-rs/commit/3d4da5f),
useful prototype evidence that was later superseded for new batch creation.

## 2026-08-02 — Batching becomes co-funded and signer-verifiable

The frozen v2 design removes coordinator-funded Bitcoin. A signed stock input
fixes the shared OpenCSV context; each participant contributes one payload,
one fee input, and one change output; every participant reconstructs the full
canonical transaction and releases only `SIGHASH_ALL`. C0/C1/C2 land as
[`d51d139`](https://github.com/opencsvnet/opencsv-rs/commit/d51d139),
[`0af0258`](https://github.com/opencsvnet/opencsv-rs/commit/0af0258), and
[`54c0833`](https://github.com/opencsvnet/opencsv-rs/commit/54c0833).
The current reference profile caps one batch at 64 participants for script
safety; that number is not a universal relay quota.

## 2026-08-02 — The project domain gets a real front door

The GitHub Pages project site originally kept its homepage under `web/` and
used a root meta-refresh. The `opencsv.net` cutover makes the repository root
the canonical homepage instead: assets remain grouped under `web/`, while the
old `web/index.html` becomes a compatibility redirect. The ordering is part of
the design, not deployment trivia: verify domain ownership and DNS before
changing the Pages custom domain, so the working `github.io` site never
redirects into an unresolved hostname.

## 2026-08-03 — Production proofs replace the beautiful prototype numbers

The ~56 KB / ~3.6 ms / ~0.55 s-phone profile did its job: it proved recursive
PCD and mobile feasibility. It used two FRI queries and no grinding, so it is
now labeled historical. D1 → D4 → D3 → D2 lands setup caching, in-circuit
predecessor-key binding, in-circuit issuer-seed authorization, and the frozen
v3 proof/profile boundary
([`ca8ad37`](https://github.com/opencsvnet/opencsv-rs/commit/ca8ad37),
[`97187e6`](https://github.com/opencsvnet/opencsv-rs/commit/97187e6),
[`8ee7a81`](https://github.com/opencsvnet/opencsv-rs/commit/8ee7a81),
[`d18c235`](https://github.com/opencsvnet/opencsv-rs/commit/d18c235)).

The new receipt is less cinematic and more useful: a 94-bit conservative
union-adjusted enforced floor, ~0.54–0.85 MB proofs, 15–22 ms desktop
verification, and 11.25–14.47 s transfer proving on the iPhone 16e. Two
higher-memory profiles were killed by iOS before the four-step Horner packing
made the deepest shape fit. Failed profiles belong in the receipt too.

## 2026-08-03 — A live child spends the marker and changes the protocol

The original marker was `P2WSH(sha256(OP_TRUE))`: filter-visible, but also
anyone-can-spend. On signet, a third party immediately spent its 546 sats and
pinned the parent against ordinary RBF. New anchors now use the unspendable
`P2WSH(sha256(OP_RETURN))` marker. Historical version-2 records remain readable
but cannot enter a new replacement epoch; new creation uses version 3. A
generic Bitcoin Core fee bump later removed protocol change, providing the
negative receipt for a pure replacement validator that permits only
context/layout-preserving change reduction. See the dated
[`SIGNET_READINESS.md`](https://github.com/opencsvnet/opencsv-rs/blob/main/SIGNET_READINESS.md).

## 2026-08-03 — Adversarial review attacks the batching fix itself

The first C1/C2 review found that Boolean “verified” flags, unauthenticated
relay bodies, and newest-epoch-only recovery were not security boundaries.
The remediation uses typed capabilities from authoritative chain verification,
stock/fee-key authorization over exact canonical bodies, semantic quotas,
durable `signature_released` state, and exact-manifest recovery across epochs
([`8d047f6`](https://github.com/opencsvnet/opencsv-rs/commit/8d047f6)).

The follow-up attack pass then found two more edges: historical v2 could still
enter a live C2 session, and a peer could slow-drip a frame by resetting socket
timeouts. The current review tip rejects v2 at every live/reopen boundary and
shares one absolute prefix+body deadline
([`e4265b9`](https://github.com/opencsvnet/opencsv-rs/commit/e4265b9)).
Two test-only corrections were added because the first receipt described cases
more precisely than its tests exercised. Receipt prose is a release invariant,
not decoration. Hosted CI and an independent re-review remain merge gates.

## 2026-08-03 — A Lean build can be green while the modeled rule is wrong

The first C3 batching-v2 model built and matched its axiom baseline, but review
found that `ConformingReplacement` never required either endpoint manifest to
be well formed. A formally “conforming” pair could therefore change the marker
or violate exact fee allocation and conservation. The model, not the receipt,
was repaired: both endpoints must now be valid, marker preservation is proved,
the 64-participant limit is explicitly a Rust/CLI reference policy rather than
a universal protocol constant, and proof-bearing signer readiness separates
verified public inputs from each signer's private reservation. Corrective
commit
[`a831b13`](https://github.com/opencsvnet/opencsv-formal/commit/a831b13bd80384cd14fc0aeaf38c126707a7c5d4)
closed that gap. Final comparison against frozen C1 then found missing
duplicate operation/payload/change-script rejection, reusable stock/change
floors, and nonzero proposal guards. Those are now explicit in the
assumption-free `manifest_c1_guards` receipt. Corrective
[`c4f970d`](https://github.com/opencsvnet/opencsv-formal/commit/c4f970da787b0d1a8a3057982c202f68f8dc6834)
passed exact hosted CI, expanded the checked audit to 54 declarations, and was
fast-forwarded to `opencsv-formal/main` through
[PR #2](https://github.com/opencsvnet/opencsv-formal/pull/2).

## 2026-08-03 — Signal owns the fee wallet; Bitcoin is gas only

The anchor-server architecture is superseded. Signal's target account owns a
Rust-managed OpenCSV wallet and a BIP84 Bitcoin fee wallet. Rust selects and
reserves fee UTXOs, derives change, fixes input zero before proof generation,
persists signed bytes before relay, and allows RBF only when the OpenCSV
context, record, marker, positions, and change destination remain intact.
Public Esplora data is an accelerator; confirmed spend state is rechecked
through headers, BIP158, merkle proofs, and full blocks. There is no WIF,
caller-selected UTXO/change, general BTC recipient, raw-transaction broadcast,
or bespoke OpenCSV server at the FFI boundary.

## 2026-08-03 — The phone restore that cloned a primary

iOS restored Keychain state onto the developer iPhone 16e. That meant an
account root alone could silently arm two primary devices against the same
coins and fee UTXOs. The Rust open boundary now requires a distinct 32-byte
binding from a non-migratable `ThisDeviceOnly` item, stores its root-bound
commitment in SQLite and the backup checkpoint, and opens missing/mismatched
restores read/export-only. Missing-binding state is sticky: supplying a newly
generated binding later still cannot re-arm the database
([`fb4a26a`](https://github.com/opencsvnet/opencsv-rs/commit/fb4a26a)).
Authority moves only through a future explicit recovery/rekey flow.

## 2026-08-03 — One consignment, one verdict, one bubble

Signal delivery attempts are not payment identities. Bincode accepts distinct
wire encodings of the same semantic consignment, so hashing attachment bytes
could duplicate a verdict even before retry nonces. The Rust receive boundary
now decodes, canonically re-encodes, verifies/stores the canonical bytes, and
returns one SHA-256 identity for both accepted and rejected verdicts
([`4dc05cf`](https://github.com/opencsvnet/opencsv-rs/commit/4dc05cf)).
Swift must key verdict and rendered-cell storage on that value. The physical
acceptance test still owes the proof: crash/resume into two attachment attempts,
exactly one verified payment bubble.

## 2026-08-03 — A merged Rust foundation is still not an iOS wallet

After exact hosted candidate CI succeeded, the owner deferred the outstanding
independent adversarial re-review and authorized strict fast-forwards:
integration `e4265b9`, then wallet `4dc05cf`, are now on `opencsv-rs/main`.
That review is deferred, not represented as completed; later findings must be
fixed forward. This merge changes the Rust foundation, not the product claim:
Signal-iOS source, the linked iPhone, releases, and mainnet remain untouched.
Swift still owes in-place migration, `ThisDeviceOnly` recovery, canonical
verdict/render storage, both build flags, and physical crash/retry/RBF evidence.

## 2026-08-04 — “USD” is a label, not a product definition (first correction)

The first Signal mint UI asked for a ticker and amount. Entering `USD` could
therefore create an unrelated issuer asset without a named issuer, fixed
precision, backing statement, redemption terms, or recognizable identity.
Repeated attempts left several USD-looking assets and forced the sender to
choose among identifiers the product had never explained. The proof could be
valid while the wallet claim was meaningless.

The replacement preview supports one product: **OpenCSV USD Preview**, with
fixed Rust-owned terms, six decimals, and one exact `asset_id`. The production
FFI accepts no arbitrary definition; `opencsv_preview_usd_ensure(handle)` is
idempotent, signet/regtest-only, and freezes writes until the new checkpoint is
secured by Signal Backup. Signal accepts a human decimal amount and selects no
ticker, issuer, Bitcoin input, or asset identity. Old ticker-only and custom
assets remain readable prototypes but are excluded from issuance and send.

This is explicitly not Tether or USDT. A future Tether instrument must cross a
new authenticated issuer/terms/asset-version boundary; preview balances cannot
be silently renamed or converted.

The implementation is published as draft
[opencsv-rs PR #5](https://github.com/opencsvnet/opencsv-rs/pull/5) at
`3bfaa1876507a086feda15ba147f85d0ca3c4f4d` and draft
[Signal-iOS PR #4](https://github.com/opencsvnet/Signal-iOS/pull/4) at
`aa9fc33178`. The exact receipt is 4 core instrument tests, 26 Rust
account-wallet tests, an iOS 15 device/universal-simulator XCFramework build,
CocoaPods fetching and rebuilding that framework from the pushed Rust SHA, a
complete unsigned Signal simulator build with the app targets'
`-warnings-as-errors`, and the focused exact USD decimal parser/formatter test.
These are published-branch local integration receipts, not hosted CI approval,
a merge, release, mainnet activation, or physical-phone acceptance result. The
linked iPhone was deliberately untouched because its installed profiles require
an Apple Development certificate/private key that is not currently present in
the keychain. This was an intermediate correction, not the final trust model;
the next entry records why its per-wallet issuer was removed.

## 2026-08-04 — A fixed per-wallet issuer was still the wrong trust model

The first correction removed the custom ticker form, but it left Signal with a
derived issuer secret and a button that minted a fixed Preview instrument. That
still made every Signal account an issuer. Because OpenCSV asset identity binds
the issuer public key, each account's “same” Preview definition produced a
different `asset_id`; the wallet could not honestly present those claims as one
asset. It also put supply authority inside the highest-risk consumer surface.

The corrected boundary makes Signal an **owner-only wallet**. Production C ABI
symbols for preview activation and mint preparation are gone. Rust accepts only
public, reviewed issuer manifests in `usd_issuers`; it retains no issuer key in
production and reports `issuance_enabled: false`. Signal exposes one USD
product, aggregates balances only from exact `trusted_usd_v1` identities, and
shows the selected issuer before a send. Selection is deterministic by reviewed
priority, but a transfer spends one issuer instrument only. If the requested
amount is available only by adding claims from multiple issuers, version 1
rejects rather than silently changing the economic promise.

OpenCSV's test issuer and any future Tether issuer remain distinct assets with
distinct keys, terms, supply, and redemption obligations underneath that one
display product. No Tether identity is fabricated, and the registry remains
empty until an exact manifest is actually approved. Old locally minted Preview
assets are retained as untrusted/read-only history.

The correction is published on draft
[opencsv-rs PR #5](https://github.com/opencsvnet/opencsv-rs/pull/5) at
`e505b18190632618735e9a8932f206a4011c21b9` (owner-only boundary
`11ba73ca92de6eed93805d378d9bf2d9d9adb69d`) and draft
[Signal-iOS PR #4](https://github.com/opencsvnet/Signal-iOS/pull/4) at
`645f12574dfa2a6c259f67243a837cacc5df42db`. Rust's 27 account-wallet tests pass,
including multi-issuer classification and ticker-substitution rejection. The
source-pinned CocoaPods framework was rebuilt; focused Signal tests cover
priority selection, exact issuer selection, split rejection, untrusted
lookalikes, and exact six-decimal amounts; the complete unsigned simulator build
passes under the app targets' warnings-as-errors. These are local draft-branch
receipts, not hosted approval, a merge, physical-device acceptance, a real
issuer activation, or a mainnet claim.

The first hosted run exposed one honest integration failure: Cargo's
`--all-targets` compiled the signet issuer example after the default library had
correctly hidden `mint_prepare`. Commit `e505b181` gates that example and all
issuer state behind an explicit `issuer-tools` feature, adds a dedicated CI
compile check for the privileged harness, and leaves the default/CocoaPods build
owner-only. The exact warning-denied workspace test and the feature-specific
example check pass locally. Both hosted CI runs for `e505b181` subsequently
passed; that validates the owner-only default and featured acceptance harness,
not an issuer activation or merge.

## 2026-08-04 — Issuance belongs to a headless operator, not Signal

Removing mint from Signal was a custody boundary, not a decision to remove
OpenCSV issuance. The privileged methods are now exposed by a dedicated
`opencsv-issuer` binary behind the non-default `issuer-tools` feature at
`7882e185d1721ed4ee56eaa2214f2a670aaafef7`. Signal's C ABI and CocoaPods
dependency graph still expose no issuer action.

The operator reads independently generated account-root and device-binding
secrets from owner-only files rather than command-line values and emits JSON
for automation. It creates exact public manifests from committed terms,
prepares mints only by exact asset id, exports and exact-hash acknowledges
checkpoints, and exposes durable status, sign/broadcast, resume, cancel, and
protocol-safe fee-bump actions. A stale acceptance-example path that still
accepted a ticker was corrected to require the asset id.

Anyone can run the open-source tool, but only possession of the issuer seed
committed by an existing manifest can authorize its mint proof. Likewise,
creating another USD-labelled instrument does not place it in Signal's reviewed
issuer registry. No Tether authority, affiliation, or manifest is claimed.

Receipts: four issuer-CLI tests, the exact-checkpoint acknowledgement
regression, focused warnings-denied default/issuer builds, and focused issuer
Clippy pass locally. Hosted CI for `7882e185` is pending. No Signal source,
iPhone state, issuer activation, release, merge, or mainnet action changed.

## 2026-08-04 — An unsigned Signal simulator build is not an in-place upgrade

The first reviewed-issuer simulator install was compiled with
`CODE_SIGNING_ALLOWED=NO`. It produced an app, but not one with Signal's
effective application-group entitlement. Launch failed closed; CoreSimulator
then replaced the simulator-only app/group containers, so the provisional test
registration and wallet could not be recovered. No source, physical iPhone,
issuer checkpoint, or mainnet state changed.

The accepted procedure is now explicit: use Xcode's default local ad-hoc
signature, inspect the generated app-group and keychain entitlements, record
the logical containers before and after install, and treat any container change
as a failed in-place upgrade. A rebuilt signed app passed, and a fresh simulator
registration was completed without another reinstall. The exact incident and
runbook are published at `opencsv-rs@ab0b20f`.

## 2026-08-04 — The first reviewed issuer is exact, public, and signet-only

The registry-empty safety posture ended only for one test instrument. Signal
commit `4fec89e902` pins the exact **OpenCSV USD Preview** manifest on signet;
mainnet and regtest registries remain empty. The public identity is asset id
`1d58a8145eedac17efe66371293eb472a4c68554141cc14380360e6eb720b507`,
six decimals, issuer public key
`e269d625776ada22fa38720d11ae3373fe19fd16f98e4b095f042d103b58c517`,
and terms hash
`5e55e542dc34380d3530c9533d28655a43317d7323d48c5ad0a14a6f801e4764`.
The terms say the units are test-only, valueless, not redeemable for dollars or
USDT, and not a Tether claim.

A live registered simulator recognizes the policy as one USD product at zero
balance and retains 20,000 confirmed signet sats restricted to protocol fees.
Its public owner is
`ff17c90b2e7c511f8d64734e07833502d6a82308d0c5ba0ca862f61ebd48c124`.
The headless issuer's first mint preparation failed safely before proof
generation because its only confirmed UTXO was 1,000 sats and the wallet
requires at least 2,500. A 10,000-sat faucet request was accepted and observed
unconfirmed. No USD operation was created; confirmation, exact-checkpoint
acknowledgement, broadcast, Signal delivery, credit, and crash/RBF acceptance
remain open.

## 2026-08-04 — Live issuance found a checkpoint self-reference before signing

The first funded preparation used the debug prover and took about 13 minutes.
Its proof was valid, but the reported checkpoint was not stable: persisting the
checkpoint hash inside the operation and receipt changed the checkpoint that
had just been hashed. The operation was cancelled before signing or broadcast,
its fee outpoint was released, and the mismatching export was retained only as
private forensic evidence.

Commit `1ef29d2` canonicalizes backup checkpoints by excluding acknowledgement
metadata and the receipt's derived hash, stores the final receipt before
hashing, and independently recomputes current state at acknowledgement. The
prepared/exported hash now stays identical across acknowledgement, while any
later wallet-state change rejects the stale hash. The focused receipt is 29
warnings-denied account-wallet tests and four issuer-CLI tests, all passing.

The corrected release preparation minted 100 test-only preview USD to simulator
owner `ff17c90…8c124` under exact checkpoint
`77f94dc96d1610da4c7775a86fbbcb576ff0b72edadcf9346a04e75c06f524ef`.
Rust persisted the signed transaction before submitting it to both configured
signet peers. Transaction
`eb5571a6c2b5e916546dc5a099ef0047e47b8a03d1554c25845142491421c22c`
uses 455 sats at 2 sat/vB; record, marker, and change remain at vouts 0, 1,
and 2. The canonical 536,508-byte consignment id is
`16d16cde8b9fda972bf5b56abda706399907d4259987251a1d1ddd09f36fdd68`.

Signal delivered and the freshly registered simulator downloaded that one
537 KB attachment. The anchor is still in the signet mempool, so the wallet
correctly remains at 0 USD. This proves transport and pre-confirmation
fail-closed behavior; confirmation-depth credit, crash/resume, and the
physical iPhone acceptance receipt remain open.

## 2026-08-04 — A tracked fee bump preserved the OpenCSV transaction

The first attempt to continue the live fee bump lost terminal ownership and
briefly left two local processes competing to resume the same operation. Both
were identified and terminated before either changed the database. The audit
still showed the original transaction and operation state. This was not treated
as a harmless retry: the accepted procedure now allows exactly one tracked
writer session for a live operation.

One clean retry replaced `eb5571a6…1c22c` with signet transaction
[`2cac7c02…a762c`](https://mempool.space/signet/tx/2cac7c0208f3f8373b1bf96ea99467da480d8906492e45b918ec555c4bda762c)
at a 5 sat/vB target. The replacement adds 683 sats of fee and reduces only
change to 8,316 sats. Funding input zero, record vout 0, marker vout 1, change
vout 2, protocol context, and proof semantics remain unchanged. This entry
originally also said the consignment id remained unchanged; that was wrong
because its anchor reference names the exact transaction id. One configured
signet peer accepted the transaction directly; the other timed out. The new
post-bump checkpoint was written as a new owner-only file, durably synced,
hashed as `5b02915a…f3ac1`, and acknowledged exactly. The replacement then
confirmed at signet height 316228. Signal requires six confirmations, so at
chain tip 316229 the simulator correctly remained at 0 USD; four more blocks
are required before credit is expected.

The live run also exposed an operator footgun: printing a multi-megabyte secret
checkpoint to a terminal is unnecessary and makes exact recovery receipts hard
to handle. `opencsv-rs@15f0ac2` adds `backup export --output`, which creates a
new 0600 file, refuses overwrite, syncs the file and parent directory, removes a
partial file after a write failure, and returns only its path, byte count, and
checkpoint hash. Five focused issuer-CLI tests pass with warnings denied.

## 2026-08-04 — Pending is visible, but it is not owned or spendable

The confirmed replacement exposed a second, more important fact. A consignment's
anchor reference commits to the exact transaction id. The attachment already
delivered to Signal still named `eb5571a6…1c22c`; the chain contained replacement
`2cac7c02…a762c`. `AnchorNotFound` was therefore correct. Preserving input zero,
the OpenCSV record, marker, context, output positions, and proof semantics does
not preserve exact-txid consignment bytes.

Rust commit `53876eb1d702e49ebadb11765a27cae794ff4ab1` imports the durable pending proof,
atomically invalidates stale delivery bytes, persists the signed replacement,
and generates a new canonical consignment only after that replacement is
independently observed. The old attachment is never accepted by relaxing chain
verification. Thirty focused account-wallet tests pass, including exact-txid
replacement regeneration, cold reopen, relay failure, and layout invariants.

Signal commit `835ec46f34143f953337a259691db8a6e4c7b2f8` pins that exact Rust source and adds
a durable incoming presentation state: `confirming → available` or
`needs attention`. Confirming and failed entries store no amount, acceptance
verdict, or replay credit; only the complete accept path can add coins to the
balance and Rust coin selection. The wallet shows confirming payments below the
available balance as explicitly not included and not spendable. Replaceable
notifications announce confirming without sound, then replace that notice with
available (with sound) or needs-attention. The focused 20-test wallet-store suite
and the complete signed simulator build pass with the app targets' warnings as
errors. This is a source/build receipt, not a completed live replacement delivery
or credit receipt.

## 2026-08-04 — Verified unconfirmed is spendable; transport pending still is not

The earlier boundary used one word, “pending,” for two different facts. A
downloaded attachment is only transport: it has not earned an amount, a coin,
or spendability. An exact unconfirmed Bitcoin transaction can carry much
stronger evidence. Rust commits
[`eee48878eea19c949b794e5c7671001e15318f6a`](https://github.com/opencsvnet/opencsv-rs/commit/eee48878eea19c949b794e5c7671001e15318f6a)
and
[`420338280f0f926f89a32b577c9e81a35c02048e`](https://github.com/opencsvnet/opencsv-rs/commit/420338280f0f926f89a32b577c9e81a35c02048e)
therefore add a separate provisional acceptance capability rather than
weakening ordinary verification, plus immediate in-memory freezing when an
accepted parent disappears.

That capability is available only on the phone-owned self-scan path. The
confirmed scan snapshot remains the exclusion prefix; the generic Esplora
endpoint supplies the exact mempool transaction as a non-authoritative
accelerator. Rust independently checks the consignment proof, owner, binding,
transaction id, funding context, RBF signaling, and canonical
record/marker/change layout before adding a coin tagged with its parent txid.
Mempool observations never enter confirmed ordering or first-occurrence audit
logic. Cross-check and single-snapshot paths remain confirmation-gated.

Every dependent operation persists those parent ids in its journal, pending
export, and Secure Backup checkpoint. Rust re-observes them after coin selection
and immediately before signing. A missing or changed parent yields a stable
error, freezes provenance, and cannot silently fall back. Signal commit
[`7993fefb382ed900ba5f039525b26fdd6cb91f7c`](https://github.com/opencsvnet/Signal-iOS/commit/7993fefb382ed900ba5f039525b26fdd6cb91f7c)
exposes the distinct
`confirming → available-unconfirmed → settled` states, replacement-risk copy,
promotion notifications, and needs-attention recovery. The attachment remains
non-spendable until the complete provisional or settled accept path succeeds.

Receipts: 34 serialized Rust FFI tests passed; the complete Signal OpenCSV file
ran 71 tests in 14 suites on a disposable iPhone 16e simulator. Both the Debug
feature-on test host and Testable Release feature-off app build passed with
app-target warnings as errors. This is a source/test receipt. A real two-hop signet child,
parent replacement/freeze exercise, crash recovery, and refreshed film remain
open; no evidence simulator or physical phone was installed or modified.

## 2026-08-04 — A green build still must not be installed over the evidence simulator

After the green focused suite and signed build, a manual `simctl install` was run
against the registered evidence simulator. Its ordinary application-container
UUID changed and Signal returned to onboarding. The application-group database
files still exist, but the prior registration/keychain state is not usable by
the installed app, so the simulator cannot be counted as preserved or recovered.
The physical iPhone, private issuer state, and mainnet were untouched.

The corrected rule is stricter than the earlier signing check: compile and test
on a disposable simulator clone only. Never run unit-test host installation or
manual app installation against the registered evidence simulator. Before any
future evidence-device upgrade, record app, app-group, and keychain entitlement
identity and create a recoverable clone; abort on any mismatch. Re-registration
is owner work and is not silently automated.

## 2026-08-04 — Website evidence now includes the real Signal simulator

The old homepage animation explains protocol lineage and the weekly screenshots
prove the CLI/regtest path, but neither showed the current Signal product. A new
40-second composition combines a real simulator screen recording with Remotion
labels. Six full-resolution captures separately preserve the encrypted
consignment, shallow-confirmation rejection, 0-USD overview, public receive key,
restricted fee reserve, and exact reviewed-issuer details. Every visible value
comes from the registered signet wallet; the animation supplies framing only.
Confirmed-balance and send-review captures remain deliberately absent until the
replacement anchor reaches the required depth and the app credits it.

## 2026-08-04 — Fresh Signal wallets now verify the same chain view they write against

The first newly registered Carol simulator exposed three independent startup
problems that ordinary warm-cache tests did not. An empty peer setting selected
the reviewed two-peer signet policy while constructing Rust's account, but the
receive verifier read that same empty row literally and silently selected the
single-indexer path. A newly accepted Signal message request could also wait
behind the phone's first chain scan before its attachment was re-enqueued. Once
those were corrected, the fresh self-scan still started at signet height 1,
turning a relevant 260-filter scan into an hours-long full-history bootstrap.

Signal commit `bac3042202` applies one effective-peer policy to account opening,
receive planning, point verification, self-scan, and the wallet's provenance
display. It re-enqueues newly downloadable attachments before the slow scan and
uses reviewed signet birth height 316000 for the current preview instrument
registry. An explicit stored height still wins, and networks without a reviewed
lower bound still start conservatively at height 1. The rebuildable filter cache
is namespaced as v2; v1 is left intact and ignored rather than deleted.

The cold Carol scan reached tip 316259 in 232675 ms after reading 1,653,466
filter bytes and 3,727,569 matched-block bytes. Signal then accepted the exact
still-unconfirmed mint anchor `8c3a39aa…8943` through the phone-owned self-scan
path. Two Signal deliveries of the same 536,279-byte attachment produced one
canonical consignment id, `38176a0e…d758`; the live Rust account database stores
one row with `unconfirmed` finality. The complete focused OpenCSV gate passed 73
tests in 15 suites on the disposable simulator; the Xcode result is
`Test-Signal-2026.08.04_22-15-41--0400.xcresult`.

This is a live receive, verification, and replay-deduplication receipt. It is not
yet a spend receipt: independent signet indexers still show no fee-wallet
transaction for Carol, so the Carol-to-Bob child transaction, crash/resume
exercise, fee bump, final screenshots, and film remain open. The physical phone
and mainnet were not touched.

## 2026-08-05 — Performance claims now come from the transaction, not the payload size

The paper repeated an attractive but false shortcut: dividing Bitcoin block
space by a 64-byte record and calling the result transaction throughput. A real
anchor also contains inputs, outputs, witness, a discovery marker, and standard
transaction overhead. The pinned Rust fee model bounds a solo anchor at 911 WU
and an `N`-participant batch at `968 + 423N` WU. Under an explicitly idealized
4,000,000-WU block every 600 seconds, that is 7.32 solo operations/s and 15.15
operations/s for 64-party batches—not roughly 100.

At 5 sat/vB, 64 solo anchors cost 107,904 sats in the model; the 64-party batch
costs 35,596 sats, a 67% reduction. That larger fee result does not imply a 64×
capacity result: every participant still adds one fee input, payload, signature,
and change output. The public `/scale.html` page, versioned JSON receipt, and CI
verification script now share those exact formulas and pin their source to
`opencsv-rs@4dc05cfd`.

The same truth pass separates a second performance mechanism. A verified
unconfirmed OpenCSV child spends an off-chain asset coin and normally uses a
separate Bitcoin fee UTXO; it does not spend the parent's anchor output and is
not an ordinary Bitcoin UTXO descendant. Replacement risk still propagates
through the explicit wallet dependency graph and freezes descendants when an
exact parent disappears. The live Carol receipt proves provisional receive and
replay deduplication only. A real Carol-to-Bob child spend remains open.

## 2026-08-05 — One received coin no longer needs a fake second input

The original recursive transfer shape always verified two predecessors. That
was sound for coin merging, but it made the common wallet action—spend one coin
into a recipient output plus change—pay for a second verifier and require an
artificial padding strategy. Proof lineage v4 adds a distinct one-input,
two-output circuit. It binds one authenticated v3 or v4 predecessor, constrains
the unused nullifier slot to zero, and preserves exact value conservation. New
proofs carry `opencsv-pcd-coin-v4-with-v3-fri94`; merely changing a v3 envelope
byte fails with `StatementMismatch`.

The exact physical iPhone 16e build from `b0bc324432c5` proved the v4 path in
6.4353 seconds, verified it in 19.75 ms, and emitted 788,047 bytes at a 96-bit
union-adjusted floor. The same sequential harness completed the existing mint,
two-input, and redeem rows, so the new circuit did not push those shapes beyond
the phone's process limit. This is a measured draft receipt on
[opencsv-rs PR #8](https://github.com/opencsvnet/opencsv-rs/pull/8), not a merge
or a completed Signal payment.

The first attempt to install that source-built framework into the Bob and Carol
simulators exposed a separate deployment failure: an ad-hoc app bundle without
the application-group entitlements caused CoreSimulator to assign new empty
group containers. The source build itself was valid, but the installation was
not an in-place Signal upgrade. A corrected bundle now carries the Signal group
and keychain entitlements; live acceptance is paused until the 14:05 local APFS
snapshot is mounted read-only and both prior simulator databases are copied,
verified, and restored. No physical phone, mainnet state, or release was
touched, and no payment receipt is claimed from the failed install.

## 2026-08-05 — The v4 wallet shape gets a formal specialization and a source gate

The one-input circuit is no longer documented only by Rust tests and a phone
benchmark. `opencsv-formal@68acca5` adds seven sorry-free declarations covering
the exact wallet shape: one authenticated predecessor, one real nullifier, an
exact zero second slot, recipient plus optional change, value conservation, one
context-bound anchor, and an unchanged live pool. The hosted merge and default-
branch CI both passed, bringing the independently generated specification audit
from the historical C3 milestone of 54 to 61 declarations.

CI also reads a versioned correspondence manifest pinned to exact
`opencsv-rs@6278eae`. It fails if the reviewed Rust version tags, one-predecessor
API, conservation constraint, nullifier padding, output order, native statement
projection, or verifier tag drift. That is deliberately described as a source-
correspondence gate—not a Lean proof of the Rust AIR, FRI implementation,
storage, Bitcoin consensus, or networking. The separate Aeneas ledger remains
the direct refinement path for the pure kernel and remains counted separately.

## 2026-08-05 — The chat no longer waits for the proof

The several-second v4 phone proof is a protocol cost, but it does not belong on
the send sheet's critical path. Rust commit
[`46a3e4870e55cc8fe8908c411ae56c1229ce3b76`](https://github.com/opencsvnet/opencsv-rs/commit/46a3e4870e55cc8fe8908c411ae56c1229ce3b76)
adds a two-step boundary: `transfer_plan` durably records the exact asset,
recipient, and amount without selecting protocol coins or a Bitcoin input;
`operation_prove` later resumes the same operation from `planned` or
`fee_reserved` and is idempotent at `proof_ready`. A release crash receipt used
a real v4 mint, reopened at `fee_reserved`, re-observed the exact raw parent,
and returned the identical stored proof receipt on a repeated call.

Signal commit
[`c14f02025daa557ca9149325dfc3199bced1012b`](https://github.com/opencsvnet/Signal-iOS/commit/c14f02025daa557ca9149325dfc3199bced1012b)
persists the chat metadata, enqueues an authenticated “payment pending — not
spendable yet” message, closes the sheet, and leaves proof, checkpoint backup,
signing, broadcast, and final consignment delivery to one serialized recovery
worker. The worker does not prove until the pending message is durably
enqueued; restart resumes the same operation id. Terminal rejection produces
one idempotent failure follow-up, while successful delivery produces the
proof-bearing attachment and a local completion notification.

This does not make promises spendable. The recipient gets no amount, coin, or
balance from the pending text; the existing provisional/settled acceptance
checks still gate spendability. The exact Signal build passed 76 OpenCSV tests
with 3 external-fixture skips and the repository precommit checks on a
disposable iPhone 16e simulator. Bob, Carol, and the physical iPhone were not
installed or modified. Hosted CI, restoration of the registered simulators,
and the live Bob-to-Carol-to-Bob child-spend film remain open.

## 2026-08-06 — Test USD becomes a permanent signet product, not a preview of mainnet

The earlier plan still left two dangerous ambiguities: it described minting as
a Signal wallet action, and it treated the current USD identity like something
that might graduate to production. The owner rejected both. Signal now has one
user-facing **Test USD** product. Its exact reviewed asset, account database,
checkpoint history, backup namespace, and BIP84 fee tree are permanently
signet-only and have no monetary or redemption value. Production USD will use a
new reviewed asset and registry, a separate account and backup namespace, and a
separately initialized mainnet fee tree. No Tether claim exists in the test
registry.

Wire data still uses `USD`; Signal derives the Test USD label from signet plus
the exact `testOnly` reviewed manifest. Signal cannot mint or create assets.
Issuance remains possible only through the opt-in headless `opencsv-issuer`
operator. `opencsv-rs` PR #10 at `3295cd5` makes that separation a binary
property: the default header/archive omit the legacy issuer and mint C
symbols, while `issuer-tools` retains them for operator and protocol tests.

The same candidate closes a review finding that UI selection alone could not
close. Rust now requires the exact asset ID in `usd_issuers` when an intent is
planned, before proof generation, when a proof job commits, and again before
signing. A removed or unknown asset stays visible but becomes read-only with
stable `asset_not_reviewed`; revocation cancels an unsigned solo operation or
the entire unsigned frozen batch. Already signed work remains recoverable.

Receipts now time local proof, dependency observation, pre-sign verification,
local signing/persistence, relay submission, pinned observer evaluation, and
CBF/SPV confirmation separately. This prevents a slow chain recheck from being
published as proof time and makes the under-one-second post-proof signing gate
measurable. Local default, recovery, issuer, integration, Clippy, formatting,
and archive-surface checks passed. Hosted push run 31113193237 and PR run
31113199886 then passed at the exact tip, including the twice-built
byte-identical reference packages, and `main` fast-forwarded without a merge
commit. Signal PR #6 pins that SHA. Its hosted build and the Bob/Carol payment
sequence remain open; no simulator install, physical-iPhone action, release, or
mainnet action is claimed here.

The first Signal recovery-only hosted job at candidate `fb89112e` exposed a
runner-path assumption before compilation: the workflow supplied an Xcode
application-bundle path while the build script expected a developer-directory
path. Candidate `3142394` normalized both forms. A local deployment-mode pass
then found the locked dependency graph had a stale CocoaPods checksum;
`5324150` regenerated only that checksum. Full recovery validation next showed
that setting warnings-as-errors across the whole workspace contradicted the
explicit `-suppress-warnings` policy of several third-party pods. Candidate
`0da5a47` instead asserts Signal's existing owned-target warning policy.

At `0da5a47`, deployment-mode pod synchronization passes, the default OpenCSV
framework omits issuer/mint and recovery symbols, the full Signal simulator
app builds, and 81 OpenCSV tests pass with zero failures and two
environment-gated skips. The complete DEBUG recovery build contains the
test-only rebind symbol, then restores a default framework without it. All
failed or superseded runs remain receipts; none is relabelled as test success.

---

*Screenshots are regenerated weekly by CI from real regtest runs
([workflow](https://github.com/opencsvnet/opencsv/actions/workflows/screenshots.yml)).
Benchmarks live in
[BENCHMARKS.md](https://github.com/opencsvnet/opencsv-rs/blob/main/crates/opencsv-pcd/BENCHMARKS.md).
The formal ledger is at [opencsv.net/web/formal.html](../web/formal.html).*
