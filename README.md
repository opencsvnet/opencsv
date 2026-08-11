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

**Read the paper: [`paper/opencsv.md`](paper/opencsv.md).** The public research
surface is deliberately split by question: the interactive
[`web/formal.html`](web/formal.html) proof map explains what is mechanized,
[`scale.html`](scale.html) publishes the exact Bitcoin performance model and
calculator, and [`roadmap.html`](roadmap.html) separates completed reference
work from active, owner-gated, and unauthorized work. The consumer demonstration
remains at [`index.html`](index.html). Public TestFlight status and the eventual
external invitation live at [`beta/index.html`](beta/index.html); until Apple
approves external testing, that page deliberately exposes no install link.

## Status

The protocol has real end-to-end evidence: mint, transfer, rejection of a
double-spend, redemption, and supply audit on regtest; a confirmed signet
anchor; scan-only verification with no RPC/indexer; and two-way transport over
production Signal on a physical iPhone. That August 1 phone demo used the
historical feasibility profile. It proved the interaction model, not production
parameters.

The frozen production FRI profile binds issuer authorization and recursive
predecessor keys in-circuit, rejects legacy proof/profile tags, and enforces a
94-bit conservative union-adjusted security floor. Proof lineage v4 retains
those parameters and adds a one-input/two-output forwarding circuit: a wallet
can spend one received coin into a payment plus change without manufacturing a
fake second input. V4 is on the reference main line through `46a3e48`.
Current authenticated-lineage measurements:

| proof | Apple M4 prove (warm) | verify | size | iPhone 16e prove (cold) |
|---|---:|---:|---:|---:|
| genesis mint | 102 ms | 14.8 ms | 535,705 B | 181 ms |
| v4 one-input / mint predecessor | 4.80 s | 20.4 ms | 788,068 B | 6.44 s |
| transfer / mint predecessors | 7.77 s | 22.2 ms | 854,105 B | 11.25 s |
| transfer / node predecessors | 9.76 s | 21.4 ms | 841,464 B | 14.47 s |
| redeem | 4.71 s | 19.9 ms | 778,466 B | 7.28 s |

Proof size and verification remain independent of coin-history length; cost
depends on the fixed predecessor circuit shape. Full parameters, cold/warm
rows, failed memory profiles, and the security accounting live in the
[v4 benchmark receipt](https://github.com/opencsvnet/opencsv-rs/blob/acfb422c171c75c8ee991b9262724a2d1084f608/crates/opencsv-pcd/BENCHMARKS.md).
The v4 phone row is a source-built physical iPhone 16e receipt at
`b0bc324432c5`.

The transaction-level performance model is deliberately less magical than a
payload-byte estimate. A solo anchor is bounded at 911 WU; an `N`-participant
batch at `968 + 423N` WU. Under an idealized all-OpenCSV 4,000,000-WU block every
600 seconds, that is 7.32 solo operations/s and 15.15 operations/s for a
64-party batch. At 5 sat/vB, the same batch costs 35,596 sats versus 107,904
sats for 64 solo anchors, a 67% saving. These are generated fee rows and
theoretical saturation bounds, not measured Bitcoin throughput. The
[performance explainer](scale.html) publishes the calculator, caveats, pinned
source revision, and machine-readable receipt.

The reference stack also includes co-funded batching v2 and its two-round peer
gossip, a verified pure Rust kernel and pure accept-decision boundary on
`opencsv-rs/main`, and dated signet/readiness receipts. Signal PR #6 is merged
at `db818658`, but the post-merge default-branch Xcode job failed; it remains a
prototype in fix-forward, not a release. Rust owns the OpenCSV asset wallet
and BIP84 Bitcoin **fee** wallet; there is no anchor server and no
arbitrary-Bitcoin-send API. Signal holds owner keys only: it has no issuer
secret, mint action, arbitrary asset creator, or mint FFI. It presents one
signet-only Test USD product over exact reviewed issuer instruments. The current
test issuer's disclosure and public identity live in the
[test USD terms](usd-preview/terms-v1/).

Issuance remains supported outside Signal. The non-default `issuer-tools`
feature builds a headless `opencsv-issuer` operator that creates exact public
manifests and prepares, backs up, signs, resumes, and fee-bumps issuer-authorized
mints by asset id. It reads issuer secrets from owner-only files and emits JSON
for automation. Running it does not confer another issuer's authority, and an
arbitrary USD-labelled manifest does not enter Signal's reviewed registry.

The current homepage lead is deliberately simpler than the full acceptance
matrix. On 2026-08-08, Carol sent 1 Test USD to Bob as operation
`4b03fd18a787d9ab8ebaf2d394aee6d5`, anchored by
[`445c43cb…400fd`](https://mempool.space/signet/tx/445c43cbe53a7e5e737a7e5c6ef26281c34998d283258e319bd9d9b4315400fd)
at signet height 316765. Bob then sent 1 Test USD back as operation
`7edbe4cde4627550288f353f2b81e343`, anchored by
[`6d85895f…f49aa`](https://mempool.space/signet/tx/6d85895fc516716f48a7b6ee41e2fd25f99a6698b67c9725f298e2c548ef49aa)
at height 316766. mempool.space and Blockstream reported the same confirmed
block for each transaction.

The published film is a 36.288-second cut of real Bob and Carol Signal
simulators. One-screen moments pair the real interface with context; the
handoff uses synchronized two-screen footage. Dead pauses are removed while
retained application action stays at normal speed. A moving dot is explicitly
editorial motion explaining the encrypted consignment path—not Signal UI or
packet-capture evidence. No Signal or transaction state is reconstructed. The
2,881,105-byte MP4 SHA-256 is
`5a59058f94ce5863337a957e8ec21ef7d724a95520303902b91748d43fa89b0c`.
Test USD is signet-only and has no monetary or redemption value.

The live simulator acceptance completed a real round trip. Carol sent 25 Test
USD to Bob in signet transaction
`e5ffe6076052e4bf98ba117d7122d79e21de14ed0992070c0dbe85da22dd9ee9`
(confirmed at height 316611). Bob then spent the received coin into 10 Test USD
for Carol plus 15 Test USD change in transaction
`a3a3f4b12f71e3423801cea069e5251260aeae70fb9cfd133cd7aaefce12dc0a`
(confirmed at height 316620). Carol verified proof, ownership, anchor binding,
and exact mempool bytes and exposed the return as
`available before confirmation · replacement risk` before settlement.
The first anchor had already confirmed before Bob signed the return, so this
receipt proves real forwarding and provisional receipt of the second anchor,
not an unconfirmed-parent child transaction.

The return operation took 328 seconds from durable intent to consignment
delivery in the instrumented simulator build. The receipt separates the work:
6.237 seconds local proving, 42 ms signing/persistence, and 1.826 seconds relay;
77.861 seconds funding verification and 93.163 seconds pre-sign verification
dominated the run, with backup and recovery scheduling between phases. This is
an acceptance-harness measurement, not a claim that a user waits five minutes
for production proving. Two ordinary Bitcoin peers recorded complete
transaction-submission writes; that is not a claim of mempool acceptance. The
required pinned Blockstream observer returned identical raw bytes
in 347 ms; the optional mempool.space observer timed out after 8.025 seconds
and was recorded as unavailable rather than success.

That historical one-required-observer policy is superseded in the merged Rust
implementation and merged Signal integration. Rust
[`28010d8`](https://github.com/opencsvnet/opencsv-rs/commit/28010d8f714c361a6f4a94ded1ed8708affe70dd)
and Signal
[`db818658`](https://github.com/opencsvnet/Signal-iOS/commit/db818658f1511eed0dc98df42affce1be78b486f)
derive the raw-byte gate from every API marked `Require`; fresh signet wallets
therefore require both pinned providers. A warning-denied simulator test fetched
the known return transaction from both providers in 1.831 seconds and received
identical bytes under the bundled certificate profiles.

The wallet-level rerun is now complete. Carol sent 1 Test USD to Bob in
[`2c3bc97c…f4786`](https://mempool.space/signet/tx/2c3bc97c39615094486f8d1786974aed34ed426ba7d97a949890e073cfbf4786).
While it remained unconfirmed at both providers, Bob accepted the exact proof
and raw bytes and sent that coin back in the true child
[`f77ff986…24554`](https://mempool.space/signet/tx/f77ff98673107a94391fd0509bfa8c2ec40e4551f62b7b6674319d8098d24554).
Both providers also reported the child unconfirmed while Carol exposed it as
`available before confirmation · replacement risk`. Local proving took 6.096s
and 5.995s; signing/persistence took 23ms and 18ms. Each operation survived a
post-broadcast relaunch with the same operation id; protocol credit remained
deduplicated at that checkpoint.

A fresh 45/10 Test USD repeat on 2026-08-08 exercised the same path with larger
coins. Bob operation `4837cc8c104ce828346b618a686bb828` anchored
[`b8cf7015…b851269`](https://mempool.space/signet/tx/b8cf70152dfd84a85367e19fec1ace53c6ae6708147faba79b1d9d810b851269),
and Carol forwarded 10 of the received 45 Test USD before confirmation in
operation `48d9400065a26187ef6c6584a97c6b10`, child
[`2fbec40a…db0d286`](https://mempool.space/signet/tx/2fbec40ae4aaed063018ce3f3e56d7cdbc9a7372e24cafcbcd5ee78c3db0d286).
Both pinned observers matched exact bytes while both transactions were still
unconfirmed; both later settled in signet block 316824. Local proving took
6.149s/6.171s and signing/persistence 24ms/22ms.

That wider relaunch audit also found two narrower integration defects. Signal
could retry an already-present outgoing attachment because its lookup used the
raw consignment id instead of the canonical payment id; the protocol credit
itself remained deduplicated. [Signal PR
#8](https://github.com/opencsvnet/Signal-iOS/pull/8) repairs the presentation
lookup. Rust could reject a send when deterministic selection first chose a
coin already spent on the verified chain, even when another valid coin was
available; [Rust PR #16](https://github.com/opencsvnet/opencsv-rs/pull/16)
reconciles confirmed spends and retries deterministic selection. Both fixes
are merged: Signal #8 at `1e3472b9` and Rust #16 at `908bbb53`, whose PR and
post-merge Rust CI are green. Signal #9 repins that Rust SHA at `9b72d86d`;
its PR-tip default/recovery jobs passed, but post-merge default Build and Test
failed while the recovery build passed. That exact default-branch failure
remains a fix-forward gate, and none of these merges is a release claim.

Carol subsequently created one real two-recipient batch: 5 Test USD to Bob and
5 Test USD to Note to Self. Operations
`afcaa691e4a0adb3cfd24a6f986400d0` and
`bc1850940e9e8f2c3af747aa60852725` share batch
`c3d0260082cea04e98a1a56d9e7713fb` and signet transaction
[`771aefc…03c4c3`](https://mempool.space/signet/tx/771aefc62e38dae80b4fdeec5ebb183c5c4c53c7902b559991aa55679103c4c3).
Both pinned observers returned identical raw bytes; the 908-sat, 1,808-WU
transaction settled at height 316687. Deliberate relaunches after proof and
broadcast resumed the same operation ids. This is a Bob/Carol-plus-self
two-recipient receipt, not a three-party claim.

A separate 1 Test USD Bob→Carol operation
`3d2210aeda489dfa33acbb00c92951b1` exercised protocol-safe RBF. Its 2 sat/vB
transaction
`cb32fa1048b83d479fadf4aaa6160664e61170e95036ab5d4d3d57bdd0d98fd5`
was replaced at 5 sat/vB by
[`4ae0f1c…cbd7f7`](https://mempool.space/signet/tx/4ae0f1c686977cfb270e94dc834043d4609283781b27e3bb47f222dde6cbd7f7).
Funding input, record, marker, change destination, protocol context, output
positions, and delivery identity were preserved. Both observers report the
replacement confirmed in signet block 316803 with block hash
`000000110b921854bf388cfdfb480a73f5effb1a14603abcf2031dc47bcf72a5`
and return 404 for the original. Carol's balance moved from 131 to 132 exactly
once. Rust now derives a cryptographic logical
payment id across replacements; Signal renders one +1 payment while retaining
both proof-bearing attachments as exact receipts.

The broader acceptance run found honest integration defects. Exact forwarding of
`25_000_000 = 10_000_000 + 15_000_000` needs a `-1` limb borrow, but the value
gadget had constrained carries to `{0,1}`. The local repair permits
`{-1,0,1}` while still pinning the final carry to zero and passes the exact
persisted-consignment reproducer plus focused transfer tests. A confirmed
parent was also being duplicated as a mempool sentinel and could conflict with
itself; that snapshot path now resolves to one canonical occurrence. These
repairs, batch-envelope/account-identity fixes, and replacement-delivery changes
are consolidated in Rust `main` and the merged Signal integration above. Rust PR #13 was
fast-forwarded exactly at `28010d8` after hosted runs
[31231128052](https://github.com/opencsvnet/opencsv-rs/actions/runs/31231128052)
and
[31231129868](https://github.com/opencsvnet/opencsv-rs/actions/runs/31231129868)
passed on that SHA. This is not represented as release code. The
exact Rust recovery-feature suite passes 71 tests with two deliberate slow
release-only ignores; the warning-denied Signal store suite passes 27 tests and
the full simulator app builds locally against the exact Rust XCFramework.
Signal PR #6 is merged, but post-merge run
[`31262161093`](https://github.com/opencsvnet/Signal-iOS/actions/runs/31262161093)
still requires a fix-forward for the failing default Xcode build. The recovery
job and OpenCSV wallet tests passed; the broad job stopped at the upstream
Signal test fixture assertion `OWSSwiftUtils.swift:56: Missing attachment
file`. This is not represented as a green run or a release. The subsequent
headless issuer export and opt-in Presage transport landed on Rust `main` at
[`ad8a45e`](https://github.com/opencsvnet/opencsv-rs/commit/ad8a45e9f99fc028f31015420be41820b0d9f6ee)
with green default-branch CI
[31266597981](https://github.com/opencsvnet/opencsv-rs/actions/runs/31266597981).

Zero-confirmation availability is deliberately narrower than “trust the
mempool.” It is enabled only when the phone owns the confirmed-history exclusion
prefix through self-scan; the proof, ownership, binding, exact transaction id,
funding input, and canonical record/marker/change layout all verify; and the
parent transaction is observed through the configured generic Esplora endpoint.
Rust tags every provisional coin with that parent, persists the dependency in
the operation journal and recovery checkpoint, and re-observes it after coin
selection and immediately before signing a child. A missing or replaced parent
freezes the dependent operation. Single-snapshot and indexer-cross-check modes
do not grant provisional credit.

The homepage is led by the 36.288-second real-Signal cut described above. It
alternates a real screen plus side explanation with synchronized Bob and Carol
views; retained application action stays at normal speed and dead pauses are
removed. No Signal screen or payment state is reconstructed. The published
MP4 has SHA-256
`5a59058f94ce5863337a957e8ec21ef7d724a95520303902b91748d43fa89b0c`.
Historical 25/10 and zero-confirmation captures remain labeled separately.

Formal evidence is kept in two ledgers rather than one inflated count: 72
audited declarations in the sorry-free `opencsv-formal` ledger, and 15 audited declarations
covering the Aeneas-translated Rust kernel refinements, now on
`formal-aeneas/main` at `3bcafed`. Seven declarations specialize the v4 one-input
forwarding shape and are paired with a fail-closed source-correspondence check
pinned to `opencsv-rs@6278eae`; that check detects source drift, but is not
represented as a proof of the Rust AIR or FRI implementation. See the
[journal](journal/README.md) for the discoveries, failures, and exact receipts.

## Repositories

| repo | contents |
|---|---|
| **[opencsv](https://github.com/opencsvnet/opencsv)** | this repo — canonical homepage (`index.html`), site assets/pages (`web/`), paper (`paper/`), and journal (`journal/`) |
| **[opencsv-rs](https://github.com/opencsvnet/opencsv-rs)** | Rust reference implementation: core types & accept driver, AIR-native recursive PCD engine, SPV light client + scan engine, bitcoind backend, wallet CLI, Signal transport |
| **[opencsv-formal](https://github.com/opencsvnet/opencsv-formal)** | Lean 4 protocol mechanization (72 audited declarations): inflation, conservation, nullifier/occurrence, receiver correctness, limb soundness, batching v2, scan exclusion, v4 one-input forwarding |
| **[formal-aeneas](https://github.com/opencsvnet/formal-aeneas)** | Separate Lean 4.31 + mathlib project connecting the Aeneas-translated pure Rust kernel to the specification (15 audited declarations on the green reproducibility receipt) |

## Reference

Nick, Eagen, Linus — *Shielded CSV: Private and Efficient Client-Side Validation*,
[ePrint 2025/068](https://eprint.iacr.org/2025/068). Full bibliography in the paper.
