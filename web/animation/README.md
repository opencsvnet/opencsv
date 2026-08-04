# OpenCSV explainer animation

"OpenCSV: a payment end to end" — an 80-second, 1280×720, 30 fps Remotion
animation in the site's visual language (dark `#0d1117`, orange `#f7931a`,
blue `#58a6ff`, monospace accents). Six scenes: mint → anchor → off-chain
transport → scan-first verification → batching → trust summary.

The rendered video is embedded in the root `index.html` ("Watch the prototype
lineage end to end")
and committed at `out/opencsv-e2e.mp4` (h264) with `out/poster.png`.

## Real Signal wallet composition

`Signal-Wallet` is a separate 40-second composition. It places a real,
full-resolution iOS simulator recording inside the site's visual language and
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
Signal's six-confirmation threshold. Confirmed-balance and send-review footage
must come from a later real scan; do not synthesize those states.

This render is a historical architecture receipt. It predates the unspendable
`sha256(OP_RETURN)` marker, frozen production proof profile, co-funded batching
v2, and Rust-owned Signal account wallet. Re-render only after those current
semantics are represented; until then the homepage labels the deltas explicitly.

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
