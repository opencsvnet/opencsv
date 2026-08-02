# OpenCSV explainer animation

"OpenCSV: a payment end to end" — an 80-second, 1280×720, 30 fps Remotion
animation in the site's visual language (dark `#0d1117`, orange `#f7931a`,
blue `#58a6ff`, monospace accents). Six scenes: mint → anchor → off-chain
transport → scan-first verification → batching → trust summary.

The rendered video is embedded in `web/index.html` ("Watch it end to end")
and committed at `out/opencsv-e2e.mp4` (h264) with `out/poster.png`.

## Re-render

Requires Node.js (v20+) and, for the first render, network access so
Remotion can download its headless Chrome. `ffmpeg` is not required.

```sh
npm install
npm run render    # → out/opencsv-e2e.mp4  (npx remotion render … --crf=23)
npm run still     # → out/poster.png       (poster frame, --frame=300)
npm run studio    # interactive preview at http://localhost:3000
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
