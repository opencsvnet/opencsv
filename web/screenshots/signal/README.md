# Historical Signal wallet screenshot receipt

These are full-resolution `simctl` captures from a live, registered Signal iOS
simulator. They are not reconstructed product mockups.

- captured: 2026-08-04
- simulated device: iPhone 17e, iOS 26.4
- app bundle: `org.whispersystems.signal`
- Signal source: `opencsvnet/Signal-iOS@4fec89e902`
- network: public Bitcoin signet
- reviewed asset: OpenCSV USD Preview
- asset id: `1d58a8145eedac17efe66371293eb472a4c68554141cc14380360e6eb720b507`
- wallet public owner: `ff17c90b2e7c511f8d64734e07833502d6a82308d0c5ba0ca862f61ebd48c124`
- canonical consignment: `16d16cde8b9fda972bf5b56abda706399907d4259987251a1d1ddd09f36fdd68`
- confirmed replacement anchor: `2cac7c0208f3f8373b1bf96ea99467da480d8906492e45b918ec555c4bda762c`

Files 01–06 show the attachment and the wallet before the anchor reached
Signal's required depth of six confirmations. Zero USD is the expected
fail-closed result. The 20,000 sats shown in the app are confirmed signet funds
restricted to OpenCSV protocol fees; there is no arbitrary Bitcoin send path.
These images predate the dependency-safe provisional verifier. They remain an
exact receipt of that source revision, not evidence of the newer
`available-unconfirmed → settled` behavior.

The source screen recording for the composed film is normalized at 30 fps in
`../../animation/public/signal/signal-wallet-walkthrough.mp4`. Remotion adds the
site background, captions, receipts, and progress line; the phone rectangle is
the real recording.

Capture pattern:

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
  xcrun simctl io SIMULATOR_UDID screenshot OUTPUT.png
```

No recovery root, issuer seed, Signal phone number, or private checkpoint is
present in these assets.

## Current homepage receipt

The homepage no longer uses these zero-balance captures as its principal
Signal evidence. The current lead film is
`../../media/opencsv-real-signal-test-usd-roundtrip.mp4`, a 59.3-second edit
made entirely from one uninterrupted 230.803-second recording of the real Bob
simulator. It begins on Bob's received +1 Test USD card and follows his 1 Test
USD return through pending to verified. Action runs at normal speed with Signal
centered alone. During the static wait, the phone moves left and four reading
cards use a separate right-hand panel; no card obscures the app. Its DEBUG proof
and network-verification interval runs at 8.5× and is labeled on every card. No
Signal screen or payment state was reconstructed. Its SHA-256 is
`b9c7e6538f3322451362c9651884d7d1e60a8b348a295b69e67aaae365cdbf14`.

The public signet anchors are
`445c43cbe53a7e5e737a7e5c6ef26281c34998d283258e319bd9d9b4315400fd`
(Carol → Bob, 1 Test USD, height 316765) and
`6d85895fc516716f48a7b6ee41e2fd25f99a6698b67c9725f298e2c548ef49aa`
(Bob → Carol, 1 Test USD, height 316766). Both public APIs returned the same
confirmed blocks. Test USD has no monetary or redemption value.
