import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, MONO, Scene, Coin, Phone, ramp} from '../lib';

// Scan soundness — split screen: full scan vs filter sync, same verdict.
const Progress = ({x, y, w, label, t, color}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w}}>
    <div style={{fontFamily: MONO, fontSize: 13.5, color: C.muted, marginBottom: 6}}>{label}</div>
    <div style={{width: w, height: 10, borderRadius: 5, background: C.card, border: `1px solid ${C.border}`}}>
      <div style={{width: w * t, height: 8, borderRadius: 4, background: color, margin: 1}} />
    </div>
  </div>
);

export const ScanSoundness = () => {
  const frame = useCurrentFrame();
  const fullT = ramp(frame, 40, 300);
  const filtT = ramp(frame, 40, 210);
  const hitGlow = ramp(frame, 150, 175);
  const verdict = ramp(frame, 430, 465);

  return (
    <Scene
      index="S"
      title="Scan soundness"
      caption="scan-first ≡ full-block scanning — mechanized in Lean (OpenCsv.Scan)."
    >
      {/* divider + headers */}
      <svg style={{position: 'absolute', left: 638, top: 110}} width={4} height={480}>
        <line x1={2} y1={0} x2={2} y2={480} stroke={C.border} strokeWidth={2} />
      </svg>
      <div style={{position: 'absolute', left: 90, top: 110, fontFamily: MONO, fontSize: 19, color: C.muted, opacity: ramp(frame, 6, 18)}}>
        full scan — every block
      </div>
      <div style={{position: 'absolute', left: 730, top: 110, fontFamily: MONO, fontSize: 19, color: C.blue, opacity: ramp(frame, 6, 18)}}>
        filter sync — kilobytes
      </div>

      {/* left: blocks raining into the phone */}
      <Phone x={270} y={290} w={120} h={210} delay={14} />
      {Array.from({length: 9}).map((_, i) => {
        const t = ramp(frame, 30 + i * 24, 70 + i * 24);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: interpolate(t, [0, 1], [80 + (i % 3) * 170, 300]),
              top: interpolate(t, [0, 1], [150 + (i % 2) * 40, 420]),
              width: 52, height: 38, borderRadius: 6,
              background: C.card, border: `2px solid ${C.border}`,
              fontFamily: MONO, fontSize: 10.5, color: C.muted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: t > 0 && t < 1 ? 1 : 0,
            }}
          >
            block
          </div>
        );
      })}
      <Progress x={90} y={530} w={420} label={`blocks · ~${Math.round(400 * fullT)} MB`} t={fullT} color={C.muted} />

      {/* right: filter cards, one marker hit, one block */}
      <Phone x={890} y={290} w={120} h={210} delay={14} />
      {Array.from({length: 10}).map((_, i) => {
        const t = ramp(frame, 24 + i * 13, 56 + i * 13);
        const hit = i === 6;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: interpolate(t, [0, 1], [700 + (i % 5) * 105, 910]),
              top: interpolate(t, [0, 1], [160, 300 + (i % 2) * 20]),
              width: 34, height: 46, borderRadius: 5,
              background: C.card,
              border: `2px solid ${hit ? C.blue : C.border}`,
              boxShadow: hit ? `0 0 ${hitGlow * 22}px rgba(88,166,255,0.6)` : 'none',
              opacity: t > 0 && t < 1 ? 1 : 0,
            }}
          />
        );
      })}
      <div style={{position: 'absolute', left: 760, top: 215, fontFamily: MONO, fontSize: 13.5, color: C.blue, opacity: hitGlow}}>
        marker hit → 1 block
      </div>
      {(() => {
        const t = ramp(frame, 185, 225);
        return (
          <div
            style={{
              position: 'absolute',
              left: interpolate(t, [0, 1], [760, 915]),
              top: interpolate(t, [0, 1], [250, 420]),
              width: 52, height: 38, borderRadius: 6,
              background: C.card, border: `2px solid ${C.blue}`,
              fontFamily: MONO, fontSize: 10.5, color: C.blue,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: t > 0 && t < 1 ? 1 : t >= 1 ? 0 : 0,
            }}
          >
            block
          </div>
        );
      })()}
      <Progress x={730} y={530} w={420} label={`filters + 1 block · ~${Math.round(900 * filtT)} KB`} t={filtT} color={C.blue} />

      {/* same coin, same verdict */}
      <Coin x={400} y={300} r={26} delay={330} label="nf" />
      <Coin x={1040} y={300} r={26} delay={330} label="nf" />
      <div style={{position: 'absolute', left: 585, top: 270, fontFamily: MONO, fontSize: 44, color: C.fg, opacity: ramp(frame, 400, 425)}}>
        ≡
      </div>
      <div style={{position: 'absolute', left: 250, top: 585, width: 300, textAlign: 'center', fontFamily: MONO, fontSize: 18, color: C.green, fontWeight: 700, opacity: verdict}}>
        no earlier occurrence ✓
      </div>
      <div style={{position: 'absolute', left: 730, top: 585, width: 420, textAlign: 'center', fontFamily: MONO, fontSize: 18, color: C.green, fontWeight: 700, opacity: verdict}}>
        no earlier occurrence ✓
      </div>
    </Scene>
  );
};
