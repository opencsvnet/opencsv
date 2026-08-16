# OpenCSV Master Plan (2026-08-08, rev 13) — Final Signal acceptance and release gates

## Plan of record

This revision reconciles the owner-approved **OpenCSV Rev 4 — Permanent Test
USD and Final Signal Acceptance** plan with the real Carol→Bob→Carol path, the
first explicit shared-transaction batch, and the first protocol-safe fee
replacement in Signal simulators. Coordination state lives in repositories and
GitHub issues, not chat. Earlier roadmap revisions and failed approaches remain
in Git history and the public journal.

The execution order is still:

1. formal/kernel
2. prover
3. batching
4. reference signet/mainnet readiness
5. Signal/iOS integration last

Tracks 1–4 have reached their reference implementation baselines. Signal PR #6
is merged at `db818658`; the solo two-hop, true zero-confirmation child, shared
batch, and protocol-safe RBF have all settled on signet. A fresh live audit
opened and closed two narrow fix-forwards: Signal PR #8 for canonical
presentation lookup and Rust PR #16 for verified spent-coin reselection.
Signal PR #9 pins the merged Rust SHA; its PR-tip jobs passed, but its
post-merge default Build and Test failed while recovery passed. Neither merge
implies a release, upstream Signal submission, physical-device rollout, or
mainnet readiness. The public execution view is a separate evidence page at
[`roadmap.html`](roadmap.html), with a versioned snapshot in
[`web/data/roadmap-v1.json`](web/data/roadmap-v1.json).

## Verified completed baselines

### Formal and kernel

- **A3 — reproducible Aeneas refinement: complete.** `formal-aeneas@3bcafed`
  pins its dependency, builds without `sorry`/`admit`, removes the duplicated
  theorem, and publishes a 15-declaration axiom audit. Default-branch CI:
  [run 30835243209](https://github.com/opencsvnet/formal-aeneas/actions/runs/30835243209).
- **A4 — staged kernel adoption: complete.** Production binding,
  occurrence/well-formedness, first-occurrence, and supply decisions use the
  adopted kernel, with generated valid/mutated differential tests retaining a
  test-only independent oracle.
- **A5 — pure accept decision boundary: complete.** Explicit observed input
  state maps to deterministic accept/reject results and stable reasons; proof,
  chain, storage, and transport I/O remain in the driver.
- A4/A5 are integrated in `opencsv-rs@e4265b9`; exact-tip CI passed in
  [run 30830366654](https://github.com/opencsvnet/opencsv-rs/actions/runs/30830366654).
- The public formal ledger contains **72 audited declarations** at
  `opencsv-formal@dc7e8eb`; default-branch CI passed in
  [run 31044400073](https://github.com/opencsvnet/opencsv-formal/actions/runs/31044400073),
  and the generated site deployed at `opencsv@75de1b7` in
  [run 31044493886](https://github.com/opencsvnet/opencsv/actions/runs/31044493886).

The standing bridge remains executable differential testing. The Lean/source
correspondence gate is fail-closed source-drift evidence; it is not represented
as a proof of the Rust AIR, FRI, storage, networking, or iOS implementation.

### Prover production readiness

- **D1 — setup caching: complete** at `ca8ad37`, keyed by complete setup and
  verification-key identity with cold, warm, invalidation, and concurrency
  coverage.
- **D4 — predecessor verification-key hard binding: complete** at `97187e6`.
- **D3 — AIR-native issuer authorization: complete** at `8ee7a81`.
- **D2 — production FRI profile: complete** at `d18c235`, with a 94-bit
  conservative enforced floor and explicit proof-version boundaries.
- Proof-lineage v4 one-input forwarding is on `opencsv-rs/main` through
  `46a3e48`. The measured physical iPhone 16e release receipt is 6.435 seconds
  proving, 19.75 ms verification, and 788,047 bytes. Debug multi-minute proofs
  are development behavior and are never product performance claims.

### Batching v2

- **C0 — protocol/threat model: complete** at `d51d139`.
- **C1 — co-funded deterministic batches: complete** at `0af0258`, followed
  by the reviewed remediation integrated at `e4265b9`.
- **C2 — authenticated two-round gossip: complete** at `54c0833`, with live
  relay admission, identity quotas, replay rules, durable reservations, abort
  guards, and gossip-to-broadcast/replacement receipts integrated at `e4265b9`.
- **C3 — Lean batch model: complete** at `opencsv-formal@c4f970d`; subsequent
  formal work is included in the 72-declaration ledger.

Current batching combines recipients collected before one proposal freezes.
It does not yet put a dependent Alice→Bob→Carol chain inside one underlying
Bitcoin transaction; that remains a separately versioned research item.

### Reference signet readiness

- Reference cold/hot sync, bandwidth, latency, recovery, fee, marker, and batch
  amortization receipts are integrated through `cfb902b`, `a7fe2e0`, and
  `e4265b9`.
- Reproducible reference builds and the release checklist exist. They are
  evidence and preparation, not a release.
- Independent mainnet security review, release signing/distribution, and any
  mainnet broadcast remain open.

### Domain

- Cloudflare delegation, GitHub organization verification, apex and `www`
  Pages records, TLS, and enforced HTTPS are complete. Current public checks
  return HTTP 200 for the homepage, journal, and formal ledger; `www` resolves
  to the canonical apex.
- DNSSEC remains open. No DS record is currently published for `opencsv.net`;
  completion requires enabling DNSSEC in Cloudflare and publishing the exact DS
  at Namecheap.

## Permanent Test USD product boundary

Signal exposes one user-facing product: **Test USD**.

- The wire unit code remains `USD`; no protocol encoding changes.
- Presentation becomes **Test USD** only when the account is signet and the
  exact reviewed manifest is marked `testOnly`.
- Test USD has no monetary or redemption value and is permanently bound to the
  signet account database, backup namespace, asset checkpoint, and BIP84 fee
  tree. It is never promoted to mainnet.
- Every underlying issuer retains its own exact asset ID, authorization key,
  terms, supply, priority, and claim. Signal may aggregate reviewed issuer
  balances for display, but one send selects one exact issuer instrument and
  records it in review and receipt details.
- The currently reviewed asset is
  `1d58a8145eedac17efe66371293eb472a4c68554141cc14380360e6eb720b507`.
  No Tether asset or redemption claim exists in this test registry.
- Unknown, removed, or ticker-lookalike instruments remain visible and
  read-only. New unsigned work fails with stable `asset_not_reviewed`.
- Signal cannot mint or create assets. Privileged signet/regtest issuance
  remains available only through the non-default headless `opencsv-issuer`
  tool. The stacked mainnet candidate admits issuance only through a
  registry-v2-committed threshold policy, an exact signed mint authorization,
  a canonical confirmed funding outpoint, and a replay-safe per-asset
  sequence/supply floor. The signed outpoint prevents old-backup replay from
  retargeting the same approval to fresh Bitcoin funding. Missing material returns
  `production_issuance_not_authorized`. Signal exposes none of this surface.
- Production USD requires a new reviewed asset and registry, separate account
  database and backup namespace, and a separately initialized mainnet fee tree.
  The fail-closed namespace, registry lifecycle, activation states, evidence
  gates, and still-open human decisions are specified in
  [`PRODUCTION_MAINNET.md`](PRODUCTION_MAINNET.md). That document is a review
  contract, not an activation or issuer claim.
- The current Rust candidate rejects loose mainnet issuer lists. A production
  registry is a versioned, deployment-bound release input whose ordered exact
  manifests/priorities, source revision, and public HTTPS approval receipts
  recompute to its exposed commitment. This makes the selected policy
  reproducible; it does not establish issuer backing or authority.
- The highest accepted registry version and commitment persist in both the
  account database and production Secure Backup. Older or conflicting policy
  remains readable but cannot start unsigned work; older checkpoints cannot
  lower the floor.
- The release commitment also binds a `candidate`, `limited`, or `general`
  phase and exact transfer, batch, rolling-day, recipient, reserve-allocation,
  and miner-fee ceilings. Candidate releases return
  `production_activation_not_authorized`; activated releases recheck their
  ceilings at intent creation and before proof/signing. Signed solo, batch,
  and reserve transactions snapshot the complete authorizing release, and RBF
  revalidates that commitment before applying its original fee ceiling.
  A wallet-derived signature binds that commitment to the stable solo, batch,
  or reserve operation identity. Missing or substituted mainnet authorization
  is database corruption rather than permission to fall back to live host
  policy. Crash resume revalidates it before transaction parsing, chain lookup,
  or relay; fee bump does so before chain verification or replacement signing.
  The separately featured, secret-free `opencsv-registry` tool uses the
  same Rust serializer and verifier as account open. It requires the expected
  application deployment, distinguishes structural validity from activation
  authority, and refuses to overwrite an existing release. Its checked-in
  candidate has zero issuers and cannot arm writes; limited/general validation
  rejects empty issuer sets and all-zero placeholder revisions. Registry v2
  additionally commits sorted exact asset-to-issuance-policy hashes while v1
  bytes remain unchanged and cannot authorize minting. The headless wallet
  atomically consumes each threshold-signed authorization with its mint
  operation, enforces contiguous sequence and supply transitions, carries the
  ledger in Secure Backup, and verifies signed historical policy snapshots on
  resume/RBF after policy rotation. Consumer policy alone never authorizes
  supply.

  The exact published draft is
  [opencsv-rs PR #31](https://github.com/opencsvnet/opencsv-rs/pull/31) at
  `3244e91afff3d0e9f3b45fb1509c328d7de77a58`, stacked on still-unmerged PR #30.
  An exact-tip adversarial pass found and closed a threshold alias: authority
  keys now require one lowercase compressed canonical encoding, so one signer
  cannot occupy two slots through upper/lowercase hex. A second pass bound each
  authorization to one exact funding outpoint so restoring an older valid
  backup cannot replay it with a different UTXO. Pre-sign, resume, and RBF
  independently recheck the operation row and persisted transaction input.
  FFI is 125 passed / 0
  failed / 3 intentional ignores; those three pass explicitly in release mode.
  The preceding complete warnings-denied workspace had no executed failure;
  the proof-heavy PCD node and redeem suites took 963.71 and 431.65 seconds.
  Registry and
  issuer tool suites pass 4/0 and 8/0. Hosted runs 31913977221 and 31913959340
  are superseded; exact-head runs 31916968138 and 31916970920 are executing,
  and independent review remains absent, so nothing here
  is merge or activation authority.
- The current local production candidates additionally fail closed unless
  mainnet has two required pinned raw-byte observer hosts, visible direct
  relay, and two distinct compact-filter peers. These candidates are not
  published product state until their prior PRs merge and the exact rebased
  tips pass hosted CI and independent review.

## Completed Rust merge gate

[opencsv-rs PR #10](https://github.com/opencsvnet/opencsv-rs/pull/10)
is merged by exact fast-forward on `opencsv-rs/main` at
`3295cd5896aa2615c992faf45a9075ad138094ca`. It adds:

- exact `usd_issuers` enforcement at planning, before proving, at proof commit,
  and before pre-broadcast signing;
- atomic cancellation of a revoked unsigned solo operation or frozen batch;
- recovery of already signed/broadcast operations despite later registry
  changes;
- issuer C symbols absent from the default Signal archive/header and available
  only under `issuer-tools`;
- separate proof, verification, signing/persistence, relay, observer, and SPV
  timing receipts.

Local default, recovery, issuer, integration, Clippy, formatting, and archive
surface gates passed. Hosted push
[run 31113193237](https://github.com/opencsvnet/opencsv-rs/actions/runs/31113193237)
and PR
[run 31113199886](https://github.com/opencsvnet/opencsv-rs/actions/runs/31113199886)
both succeeded at the exact tip, including twice-built byte-identical reference
binaries. Signal PR #6 pins this merged SHA.

## Merged Signal integration — fix-forward gates

Signal work was consolidated in
[Signal-iOS PR #6](https://github.com/opencsvnet/Signal-iOS/pull/6) and merged
at exact commit `db818658f1511eed0dc98df42affce1be78b486f`. PRs #4 and #5
remain historical stacked reviews.

The live acceptance build starts from Rust `3295cd5` and Signal
`c14f02025daa557ca9149325dfc3199bced1012b`. It preserves Test USD presentation,
queues a durable chat intent before proving, moves proof work off the sheet's
critical path, and resumes by operation id. The real run produced two confirmed
signet anchors and a verified provisional return. It also found repairs—signed
limb borrows in the value gadget, canonical confirmed-parent snapshot handling,
and corrupt BIP158 cache refetch—now consolidated in merged Rust and the
merged Signal integration. The post-merge hosted run is the current gate, not
the earlier branch candidate.

The consolidated Rust implementation is merged on `opencsv-rs/main` at
[`28010d8`](https://github.com/opencsvnet/opencsv-rs/commit/28010d8f714c361a6f4a94ded1ed8708affe70dd)
by exact fast-forward after hosted runs
[31231128052](https://github.com/opencsvnet/opencsv-rs/actions/runs/31231128052)
and
[31231129868](https://github.com/opencsvnet/opencsv-rs/actions/runs/31231129868)
passed on that SHA. Signal is merged at
[`db818658`](https://github.com/opencsvnet/Signal-iOS/commit/db818658f1511eed0dc98df42affce1be78b486f).
They include the corrected two-required-observer policy, the true unconfirmed
parent/child receipt, batch-envelope verification and account identity fixes,
cryptographic replacement identity, and a canonical logical-payment identity
that keeps an RBF replacement to one payment bubble while retaining both exact
attachments. The exact Rust recovery-feature suite passes 71 tests with two
explicitly ignored slow release-only cases; the warning-denied Signal store
suite passes 27 tests and the full simulator app builds against the exact Rust
XCFramework. In post-merge
[run 31262161093](https://github.com/opencsvnet/Signal-iOS/actions/runs/31262161093),
the recovery job and OpenCSV wallet tests passed while the default Xcode build
stopped at the upstream Signal fixture assertion
`OWSSwiftUtils.swift:56: Missing attachment file`. That failure is a
fix-forward gate and prevents any release claim. Rust `main` subsequently
advanced to [`ad8a45e`](https://github.com/opencsvnet/opencsv-rs/commit/ad8a45e9f99fc028f31015420be41820b0d9f6ee),
adding owner-only consignment export to the headless issuer CLI and keeping
Presage/AGPL Signal transport opt-in; default-branch CI
[31266597981](https://github.com/opencsvnet/opencsv-rs/actions/runs/31266597981)
passed on that exact tip.

The 2026-08-08 45/10 Test USD repeat then found two boundary edges. Signal PR
[#8](https://github.com/opencsvnet/Signal-iOS/pull/8) makes outgoing
presentation lookup use the same canonical payment identity as verdict storage;
the focused suite passes 28 tests and live relaunch suppressed prior
operations. Rust PR
[#16](https://github.com/opencsvnet/opencsv-rs/pull/16) reconciles locally
available coins against the registered PoW-verified spent set and retries the
next deterministic candidate, including a batch pre-sign check. Its local
default/recovery suites pass 71/73 tests with two deliberate slow ignores in
each. At discovery time both were locally green but still awaited hosted CI;
the intended sequence was Rust merge, Signal repin, then a hosted Signal build.

That sequence is now complete through the pin but not through the final hosted
gate. Signal PR #8 merged at `1e3472b9`; Rust PR #16 merged at `908bbb53` with
green PR and post-merge Rust CI; Signal PR #9 pins `908bbb53` at `9b72d86d`.
PR-tip default/recovery jobs passed, but post-merge Signal run
[31283234786](https://github.com/opencsvnet/Signal-iOS/actions/runs/31283234786)
failed its default Xcode job while the recovery build passed. A clean
default-branch rerun or fix remains required.

Required product behavior:

- show **Test USD** on balance, send, review, pending, verified receipt,
  notification, activity, and explorer surfaces;
- keep exact issuer identity and “no monetary value” in details;
- expose receive, send, evidence, fee reserve, and recovery state—never mint or
  custom-asset UI;
- render cached state in under one second as
  `Cached <time> · Updating…`, preserving known balances through refresh errors;
- durably persist the send intent and dismiss the sheet in under 500 ms;
- run proof generation outside the account-registry lock;
- keep release one-input proving under 10 seconds on iPhone-class hardware and
  local post-proof signing/persistence under one second;
- label P2P writes as submission only and require both configured pinned
  observers to return identical transaction bytes before zero-confirmation
  forwarding;
- keep Secure Backup mandatory for new writes and linked devices watch-only.

Hosted CI must run actual tests. After checkout, submodule, and Ruby setup it
runs `bundle exec pod install --deployment`, then fails if `Podfile.lock`
changes. `Pods/Manifest.lock` synchronization is not a dependency-pin change.

## Bob/Carol acceptance sequence

Bob and Carol are fresh disposable simulator wallets; restore/rebind is a
separate release gate and does not block this demonstration. The physical
iPhone 16e is out of scope.

Pre-run funding receipt:

- Bob: 30,000 confirmed signet sats.
- Carol: 20,890 confirmed signet sats.
- The first 100 Test USD mint is confirmed and its canonical consignment is
  ready for Signal delivery.

Acceptance status, preserving the original order:

1. **Complete:** install the consolidated build on Bob and Carol without
   erasing or relinking either Signal account.
2. **Complete:** both fee wallets synced and Carol's count-2 internal stock was
   confirmed before the explicit shared-batch run.
3. **Complete:** deliver and verify funded Test USD through Signal.
4. **Superseded for this run:** additional `[50, 50]` issuance was unnecessary
   for the solo round trip; Signal still exposes no issuance UI or issuer ABI.
5. **Complete:** Carol sent 25 Test USD to Bob in
   `e5ffe6076052e4bf98ba117d7122d79e21de14ed0992070c0dbe85da22dd9ee9`,
   confirmed at signet height 316611.
6. **Complete:** Bob spent the received coin into 10 Test USD for Carol plus 15
   change in
   `a3a3f4b12f71e3423801cea069e5251260aeae70fb9cfd133cd7aaefce12dc0a`.
   Carol accepted it before confirmation; it settled at height 316620. The
   first anchor had confirmed before the return was signed, so that historical
   run was not an unconfirmed-parent child. The
   required Blockstream observer matched raw bytes; mempool.space was Observe,
   timed out, and was honestly recorded unavailable.

   **2026-08-08 consumer-film refresh complete:** Carol→Bob operation
   `4b03fd18a787d9ab8ebaf2d394aee6d5` anchored 1 Test USD in
   `445c43cbe53a7e5e737a7e5c6ef26281c34998d283258e319bd9d9b4315400fd`
   at signet height 316765. Bob→Carol operation
   `7edbe4cde4627550288f353f2b81e343` returned 1 Test USD in
   `6d85895fc516716f48a7b6ee41e2fd25f99a6698b67c9725f298e2c548ef49aa`
   at height 316766. Both public APIs agreed on both confirmed blocks. The
   homepage film is a 36.288-second cut of real Bob and Carol simulator
   footage. One-screen moments pair the real interface with context; the
   handoff uses synchronized two-screen footage. Dead pauses are removed while
   retained application action stays at normal speed. The moving dot is
   disclosed as editorial explanation, not Signal UI or packet evidence. MP4
   SHA-256:
   `5a59058f94ce5863337a957e8ec21ef7d724a95520303902b91748d43fa89b0c`.

   The corrected dual-Require rerun is also complete. Carol→Bob operation
   `1bf04f226bdb5ed71c2d7b7035365da0` anchored in
   `2c3bc97c39615094486f8d1786974aed34ed426ba7d97a949890e073cfbf4786`.
   Before confirmation, Bob accepted it and operation
   `8b3bb9f703bb83a09b4315adad39a95b` spent that exact unconfirmed dependency
   into child
   `f77ff98673107a94391fd0509bfa8c2ec40e4551f62b7b6674319d8098d24554`.
   mempool.space and Blockstream returned matching bytes for both transactions;
   both were still unconfirmed when Bob and Carol exposed the received dollar
   as spendable with replacement risk.
7. **Complete:** Carol explicitly batched 5 Test USD to Bob and 5 Test USD to
   Note to Self. Operations `afcaa691e4a0adb3cfd24a6f986400d0` and
   `bc1850940e9e8f2c3af747aa60852725` share batch
   `c3d0260082cea04e98a1a56d9e7713fb` and signet transaction
   `771aefc62e38dae80b4fdeec5ebb183c5c4c53c7902b559991aa55679103c4c3`
   with their exact envelope positions. Both raw-byte observers matched; the
   transaction settled at height 316687. This is a two-recipient
   Bob/Carol-plus-self test, not a three-party claim.
8. **Complete for one replacement:** Bob's operation
   `3d2210aeda489dfa33acbb00c92951b1` sent 1 Test USD to Carol. Its 2 sat/vB
   transaction
   `cb32fa1048b83d479fadf4aaa6160664e61170e95036ab5d4d3d57bdd0d98fd5`
   was replaced at 5 sat/vB by
   `4ae0f1c686977cfb270e94dc834043d4609283781b27e3bb47f222dde6cbd7f7`.
   Funding input, record, marker, change destination, context, output positions,
   and delivery identity remained protected. Both observers see the replacement
   and no longer find the original.
9. **Partial:** batch operations survived deliberate relaunches after proof and
   broadcast with the same operation ids. A wider 2026-08-08 relaunch audit
   found that an outgoing attachment could be inserted again even though
   protocol credit remained deduplicated. Signal PR #8 fixes the canonical
   payment-id lookup and has local 28/28 wallet-store tests; hosted exact-tip CI
   remains the merge gate. The full DEBUG pause matrix at planning, signed
   persistence, broadcast, and pre-delivery remains open; every relaunch must
   resume the same operation ID with no duplicate spend or chat credit.
10. **Complete:** the solo round trip, true parent/child, shared batch, and RBF
    replacement reached confirmed settlement. Both public observers report
    replacement `4ae0f1c686977cfb270e94dc834043d4609283781b27e3bb47f222dde6cbd7f7`
    in signet block 316803 with block hash
    `000000110b921854bf388cfdfb480a73f5effb1a14603abcf2031dc47bcf72a5`.

The fresh 2026-08-08 parent/child repeat used Bob operation
`4837cc8c104ce828346b618a686bb828` and Carol operation
`48d9400065a26187ef6c6584a97c6b10`. Parent
`b8cf70152dfd84a85367e19fec1ace53c6ae6708147faba79b1d9d810b851269`
carried 45 Test USD; child
`2fbec40ae4aaed063018ce3f3e56d7cdbc9a7372e24cafcbcd5ee78c3db0d286`
forwarded 10 Test USD while both were unconfirmed. Both required observers
matched exact bytes and both later settled in block 316824. The run exposed a
stale deterministic coin-selection edge: Rust PR #16 now marks candidates
already spent on the verified chain and retries the next-best valid coin. Its
default/recovery local suites pass, and PR plus post-merge Rust CI are green at
merged commit `908bbb53`. Signal PR #9 pins that exact SHA; its post-merge
default Xcode job is the remaining hosted gate.

The return operation id is `052f6e79210ca3a847cca6eded9871ca` and its durable
intent-to-delivery interval was 328 seconds. Phase receipts separate 6.237s
local proving, 42ms signing/persistence, 1.826s relay, 77.861s funding
verification, and 93.163s pre-sign verification. This is instrumented
acceptance behavior, not a production UX target.

Recovery validation then runs in a separate clean simulator using Secure
Backup and DEBUG-only rebind. It must not replace or erase Bob or Carol.

## Publication receipt

Published from the current simple consumer send:

- a 36.288-second film containing only real Signal simulator screens, using one
  screen plus side explanation and synchronized Bob/Carol views during the
  handoff, with retained application action at normal speed and no reconstructed
  transaction state;
- homepage, story, performance page, paper, roadmap, README, and journal updates
  with exact txids, timings, and explicit signet-only language;
- source MP4 SHA-256
  `5a59058f94ce5863337a957e8ec21ef7d724a95520303902b91748d43fa89b0c`.

This revision adds the exact shared-batch and RBF textual receipts. A new
shared-batch/RBF film, the full final screenshot set, and crash-matrix captures
remain tied to recorded final behavior; no transaction state is reconstructed.

## Open gates

- Fix or rerun the failed default Xcode job in post-merge Signal run
  [31283234786](https://github.com/opencsvnet/Signal-iOS/actions/runs/31283234786)
  and obtain a complete green default-branch run at or after the PR #9 Rust pin.
- Complete the live crash-state pause matrix at planning, signed persistence,
  broadcast, and pre-delivery.
- Separate clean-install Secure Backup recovery/rebind acceptance.
- Independent mainnet security review.
- Release packaging/signing and upstream Signal submission decision.
- Physical-device rollout.
- Cloudflare DNSSEC activation and Namecheap DS publication. A missing DS means
  DNSSEC is not complete.
- All releases and every mainnet broadcast.

## Rules of engagement

- No fabricated state, silent fallback, or mock presented as product evidence.
- Every public claim has measured or CI-generated receipts.
- Every design change and failed approach receives a source and rendered journal
  entry.
- One agent owns one isolated branch/worktree; no force pushes or edits to
  another agent’s checkout.
- GitHub merges require reviewed exact-green tips.
- Releases, upstream submissions, physical-device migration, registrar changes,
  and mainnet actions require separate owner approval.

## Coordination channels

- [opencsvnet/opencsv#1](https://github.com/opencsvnet/opencsv/issues/1) — master work board.
- [opencsvnet/Signal-iOS#3](https://github.com/opencsvnet/Signal-iOS/issues/3) — Signal architecture and acceptance log.
- [opencsvnet/opencsv-rs#3](https://github.com/opencsvnet/opencsv-rs/issues/3) — completed prover track receipt.
- [opencsvnet/opencsv-rs#4](https://github.com/opencsvnet/opencsv-rs/issues/4) — completed batching track receipt.
- [Public journal](https://opencsv.net/web/journal.html) — narrative and failed approaches.
