import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, MONO, Scene, ChainStrip, ChainBox, Coin, ramp} from '../lib';

// T3 — Nullifiers: copy-griefing fails the ctx check; a genuine
// double-spend loses to first occurrence.
export const T3 = () => {
  const frame = useCurrentFrame();

  const copyFly = ramp(frame, 190, 250);
  const copyX = interpolate(copyFly, [0, 1], [470, 890]);
  const copyY = interpolate(copyFly, [0, 1], [470, 200]);
  const grayOut = ramp(frame, 310, 340);

  const spend2 = ramp(frame, 430, 480);
  const verdict = ramp(frame, 560, 590);

  return (
    <Scene
      index="T3"
      title="Nullifiers & first occurrence"
      caption="copying fails — and a real double-spend conflicts visibly: first occurrence wins."
    >
      {/* coin → one nullifier */}
      <Coin x={200} y={200} r={34} delay={6} label="" />
      <svg style={{position: 'absolute', left: 250, top: 188, opacity: ramp(frame, 26, 42)}} width={90} height={26}>
        <line x1={4} y1={13} x2={74} y2={13} stroke={C.muted} strokeWidth={2.5} />
        <polygon points="74,7 88,13 74,19" fill={C.muted} />
      </svg>
      <div
        style={{
          position: 'absolute', left: 350, top: 178, padding: '8px 14px',
          borderRadius: 8, background: C.card, border: `2px solid ${C.orange}`,
          fontFamily: MONO, fontSize: 16, color: C.orange,
          opacity: ramp(frame, 34, 50),
        }}
      >
        nf — one per coin
      </div>

      {/* chain */}
      <ChainStrip y={560} blocks={8} delay={50} highlight={3} />

      {/* tx1: the genuine spend */}
      <ChainBox
        x={330}
        y={interpolate(ramp(frame, 80, 120), [0, 1], [400, 468])}
        w={300}
        h={56}
        color={verdict > 0 ? C.green : C.blue}
        title="tx₁ · P₁ = H(nf ∥ ctx₁)"
        sub="the owner's spend"
        delay={80}
        glow
      />
      {verdict > 0 ? (
        <div style={{position: 'absolute', left: 330, top: 424, fontFamily: MONO, fontSize: 15, color: C.green, fontWeight: 700, opacity: verdict}}>
          first occurrence ✓ authoritative
        </div>
      ) : null}

      {/* griefer copies the record */}
      <div style={{position: 'absolute', left: 1000, top: 130, opacity: ramp(frame, 150, 168)}}>
        <svg width={52} height={52} viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
        </svg>
        <div style={{fontFamily: MONO, fontSize: 13, color: C.red}}>griefer</div>
      </div>
      {copyFly > 0 && copyFly < 1 ? (
        <div
          style={{
            position: 'absolute', left: copyX, top: copyY, padding: '6px 12px',
            borderRadius: 8, background: C.card, border: `2px dashed ${C.red}`,
            fontFamily: MONO, fontSize: 14, color: C.red,
          }}
        >
          P₁ (copied bytes)
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute', left: 850, top: 250, width: 330, padding: '10px 14px',
          borderRadius: 10, background: C.card,
          border: `2px solid ${grayOut > 0 ? C.border : C.red}`,
          fontFamily: MONO, opacity: ramp(frame, 240, 265) * (1 - 0.75 * grayOut),
        }}
      >
        <div style={{fontSize: 14.5, color: grayOut > 0 ? C.muted : C.red}}>tx₂ · copied P₁ · ctx₂</div>
        <div style={{fontSize: 12.5, color: C.muted, marginTop: 4}}>griefer's tx — different inputs</div>
      </div>
      <div style={{position: 'absolute', left: 850, top: 330, fontFamily: MONO, fontSize: 15, color: C.red, fontWeight: 700, opacity: ramp(frame, 285, 305) * (1 - grayOut)}}>
        P₁ ≠ H(nf ∥ ctx₂) ✗ invisible
      </div>

      {/* the owner's own double-spend */}
      <ChainBox
        x={700}
        y={interpolate(spend2, [0, 1], [400, 468])}
        w={300}
        h={56}
        color={verdict > 0 ? C.red : C.orange}
        title="tx₃ · P₂ = H(nf ∥ ctx₃)"
        sub="same coin, spent again"
        delay={430}
        glow
      />
      {verdict > 0 ? (
        <div style={{position: 'absolute', left: 700, top: 424, fontFamily: MONO, fontSize: 15, color: C.red, fontWeight: 700, opacity: verdict}}>
          later occurrence ✗ rejected
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute', left: 460, top: 120, padding: '10px 16px',
          borderRadius: 10, background: C.card, border: `2px solid ${C.green}`,
          fontFamily: MONO, fontSize: 16, color: C.green,
          opacity: ramp(frame, 520, 548),
        }}
      >
        rule: first occurrence wins
      </div>
    </Scene>
  );
};
