# OpenCSV Test USD v2 reset contract

Test USD v2 is a clean application-level test deployment on Bitcoin Signet.
Bitcoin Signet itself is not reset or controlled by OpenCSV. The reset changes
every OpenCSV and wallet identity that could accidentally join old state to the
new demonstration.

## What changes

- Account configuration generation: `2`
- Deployment id: `opencsv-test-usd-v2`
- Checkpoint generation: `4`
- BIP84 fee-wallet derivation domain: v2
- OpenCSV owner, issuer-tool, batch-stock, database, backup, and device-binding
  domains: v2
- Test USD instrument: asset id
  `8a88b56e42450f5761b521063df3fa16806add5c434584441d3b626556115d62`,
  created by the headless issuer from the exact v2 terms

There is no v1 balance, coin, address, checkpoint, or backup migration. Opening
old signet/regtest wallet state fails with `testnet_reset_required`; it is never
silently reinterpreted as v2.

## What does not change

- Bitcoin Signet and its public history
- The OpenCSV wire unit code `USD`
- The protocol wire encoding
- The pure Rust kernel semantics already covered by the Aeneas refinements
- The rule that Signal is an owner wallet and cannot mint

## Evidence status

All Bob/Carol transactions, screenshots, and video published before this reset
are archived **Test USD v1 evidence**. They remain useful receipts for the
prototype behavior they actually exercised, but they are not v2 balances,
wallets, assets, or release evidence.

The v2 Rust deployment boundary is under review in
[opencsv-rs PR #19](https://github.com/opencsvnet/opencsv-rs/pull/19), now the
consolidated safe merge boundary directly onto `main`. Historical
[PR #18](https://github.com/opencsvnet/opencsv-rs/pull/18) must not merge alone:
strict decoding needs the canonical generator repair included in #19. The canonical-byte
formalization and pinned source correspondence are under review in
[opencsv-formal PR #5](https://github.com/opencsvnet/opencsv-formal/pull/5).
The Signal namespace, exact-manifest, backup-version, and non-issuer surface
are under review in
[Signal-iOS PR #11](https://github.com/opencsvnet/Signal-iOS/pull/11), pinned
to Rust commit `1288977`. Its local warnings-as-errors build and complete
1,572-test aggregate pass with zero failures; hosted CI remains a merge gate.
Follow-up tip `3f2a994` restores the two clean-runner CocoaPods checksums and
regenerates Signal's strings file after the first hosted run stopped at setup.
None of these reviews is represented as merged or released.

## Activation gates

1. Review and merge the exact-green Rust and formal tips.
2. Pin Signal to the merged Rust revision and use only v2 namespaces.
3. Build a new TestFlight candidate; do not reuse the v1 archive as v2.
4. Review and publish the backed-up exact v2 Test USD manifest.
5. Fund fresh v2 fee addresses with signet sats.
6. Execute and record a new Bob-to-Carol-to-Bob payment acceptance run.
7. Only then replace the archived v1 homepage film with v2 footage.

Test USD v2 has no monetary value, backing, or redemption promise.
