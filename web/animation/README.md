# OpenCSV explainer animation

"OpenCSV: a payment end to end" — an 80-second, 1280×720, 30 fps Remotion
animation in the site's visual language (dark `#0d1117`, orange `#f7931a`,
blue `#58a6ff`, monospace accents). Six scenes: mint → anchor → off-chain
transport → scan-first verification → batching → trust summary.

The rendered video is retained as a conceptual protocol explainer at
`out/opencsv-e2e.mp4` (h264), with `out/poster.png`. It is not the homepage
lead; the homepage now leads with the real Signal round-trip film documented
below.

The batching scene does not claim that the assembler learns nothing. Proof
contents and coin openings remain private, while membership, fee inputs,
change scripts, and timing can remain observable.

## Bitcoin performance composition

`Bitcoin-Performance` is a separate 48-second conceptual composition for
`/scale.html`. It separates four claims: recursive proof compression,
co-funded transaction overhead, verified-unconfirmed availability, and the
limits that remain. Its figures are generated from the versioned performance
receipt; it contains no simulated wallet screen or live-payment claim.

```sh
npm run render:scale
npm run still:scale
```

The publishable files are
`out/scale/opencsv-bitcoin-performance.mp4` and `out/scale/poster.png`.

## Real Signal round-trip film

The homepage film is a 59.3-second cut made entirely from one uninterrupted
230.803-second recording of the real Bob Signal simulator. It begins on Bob's
received +1 Test USD card and follows his 1 Test USD return through pending to
verified. Signal stays on the left and a synchronized explainer stays in a
separate right-hand panel throughout. The opening identifies the received +1
card; later panels explain each send step, pending state, local proof, signed
persistence, relay, observer checks, and verified delivery. No card covers the
app. Action runs at normal speed; only the static DEBUG proof and network
verification interval runs at 8.5×, labeled on every affected panel. The Signal
interface and payment states are never recreated by Remotion or another
renderer.

- MP4: `../media/opencsv-real-signal-test-usd-roundtrip.mp4`
- poster: `../media/opencsv-real-signal-test-usd-poster.jpg`
- social card: `../media/opencsv-real-signal-test-usd-social.jpg`
- MP4 SHA-256: `e3c0c70e2742c622b8e852fecf0ce45d151d7405dc859753005817d13b348cb3`
- Carol → Bob anchor: `445c43cbe53a7e5e737a7e5c6ef26281c34998d283258e319bd9d9b4315400fd`
- Bob → Carol anchor: `6d85895fc516716f48a7b6ee41e2fd25f99a6698b67c9725f298e2c548ef49aa`

Both anchors are public Bitcoin signet receipts and confirmed at heights 316765
and 316766. Test USD has no monetary or redemption value. The film is a simple
consumer payment receipt; it does not claim an unconfirmed-parent child.

## Two-screen message-flow draft

`Signal-Message-Flow` is the next editorial cut. It preserves the approved
homepage film and renders to a separate draft asset. The composition alternates
between one real simulator plus a side explanation and two real simulator
recordings. Its moving dot explains the encrypted Signal attachment path; it
does not recreate a Signal bubble or claim network acceptance.

The Bob/Carol two-screen passage uses recordings whose media creation times are
identical (`2026-08-08T10:15:29Z`). The active send passage cuts dead pauses from
the real Bob recording while leaving each retained action at 1×. Source media
is intentionally excluded from Git because it lives in the receipt archive:

- `bob-send-return.mp4` — SHA-256 `bbf524608a040bd0d7f5af561028d181dda776f1272ead529482528653a4851f`
- `bob-live-roundtrip.mp4` — SHA-256 `a19880e24921f0d08ec13364fcf0120985946ea89330838f88fd3d5446b39b68`
- `carol-live-roundtrip.mp4` — SHA-256 `de7de06a4d5e28312608f41cd505ee2bd7649c22aea1e42ada37691c0592aeb2`

Stage those exact files in `public/signal/message-flow/`, then run:

```sh
npm run render:message-flow
npm run still:message-flow
```

The draft outputs are `out/message-flow/opencsv-signal-message-flow-draft.mp4`
and `out/message-flow/poster.png`. They are review artifacts, not transaction
receipts and not yet the homepage hero.

## Withdrawn Consumer USD composition

`Consumer-USD` is a 24-second reconstructed product animation made before the
live round trip existed. Its source and output remain available as design
history, but it is withdrawn from publication and must not be presented as
transaction evidence or as the homepage film.

```sh
npm run render:consumer
npm run still:consumer
```

The archival files are `out/consumer/opencsv-signal-usd.mp4` and
`out/consumer/poster.png`.

## Historical Signal wallet composition

`Signal-Wallet` currently contains a separate 40-second prelude composition.
It places a real, full-resolution iOS simulator recording inside the site's
visual language and
changes explanatory copy as the live UI moves through Signal delivery,
fail-closed shallow confirmation, the Rust-owned wallet, public receive key,
restricted Bitcoin fee reserve, and exact issuer details. Remotion supplies the
frame and labels only; it does not recreate or replace the phone UI.

The normalized 30 fps source is
`public/signal/signal-wallet-walkthrough.mp4`. The publishable output and poster
are `out/signal/opencsv-signal-wallet.mp4` and `out/signal/poster.png`.
Full-resolution still receipts live in `../screenshots/signal/`.

```sh
npm run render:signal
npm run still:signal
```

The captured wallet remains at 0 USD because the live anchor had not reached
Signal's six-confirmation threshold. This prelude is historical. The homepage
film supersedes it with real confirmed-balance and send-review footage.

### Remaining acceptance-media gates

The real round-trip film closes the basic consumer send/receive media gate.
Shared-transaction batching, one protocol-safe RBF, and a true
unconfirmed-parent child now also have live textual/on-chain receipts. A future
evidence film may add those recorded flows plus the still-open complete
crash-state matrix. Those states must come from actual captures and must not be
inferred from this film.

Phone numbers, account roots, device bindings, backup material, and checkpoint
contents remain prohibited from every screenshot, recording, caption, and
render.

The older `Signal-Wallet` render predates the unspendable `sha256(OP_RETURN)`
marker, frozen production proof profile, co-funded batching v2, and Rust-owned
Signal account wallet. Preserve its historical label if it is ever republished.

A second series — one short composition per formal-verification theorem
family — lives under `src/formals/` and renders to `out/formals/`
(embedded in `web/formal.html`):

| Composition | Video | Length | Embedded at |
| --- | --- | --- | --- |
| `T1-inflation` | `out/formals/T1-inflation.mp4` | 25 s | theorem card T1 |
| `T2-conservation` | `out/formals/T2-conservation.mp4` | 24 s | theorem card T2 |
| `T3-nullifiers` | `out/formals/T3-nullifiers.mp4` | 28 s | theorem card T3 |
| `T4-receiver` | `out/formals/T4-receiver.mp4` | 24 s | theorem card T4 |
| `Scan-soundness` | `out/formals/Scan-soundness.mp4` | 26 s | roadmap: "Scan soundness — shipped" |

## Re-render

Requires Node.js (v20+) and, for the first render, network access so
Remotion can download its headless Chrome. `ffmpeg` is not required.

```sh
npm install
npm run render    # → out/opencsv-e2e.mp4  (npx remotion render … --crf=23)
npm run still     # → out/poster.png       (poster frame, --frame=300)
npm run formals   # → out/formals/*.mp4    (all five theorem videos)
npm run studio    # interactive preview at http://localhost:3000

# one video only:
npx remotion render src/index.jsx T3-nullifiers out/formals/T3-nullifiers.mp4 --codec=h264 --crf=24
```

The scenes are plain React/SVG — no design dependencies beyond Remotion
itself. Timing: 400 frames per scene (13.3 s), six scenes, 2400 frames
total. `node_modules/` is git-ignored; `out/` is committed so the site
stays self-contained.

## Frame checks

```sh
for t in 10 25 55 70; do
  ffmpeg -ss $t -i out/opencsv-e2e.mp4 -frames:v 1 /tmp/check-$t.png -y
done
```
