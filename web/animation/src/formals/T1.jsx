import React from 'react';
import {useCurrentFrame, useVideoConfig, spring} from 'remotion';
import {C, MONO, Scene, Coin, KeyIcon, ramp} from '../lib';

// T1 — Inflation soundness: every coin traces to an issuer-signed mint;
// a forger's unsigned branch is pruned.
const edge = (x1, y1, x2, y2, color, t, dash = 0) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={2.5}
      strokeDasharray={dash || len}
      strokeDashoffset={dash ? 0 : len * (1 - t)}
    />
  );
};

export const T1 = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const prune = ramp(frame, 250, 295);
  const s = (d) => spring({frame: frame - d, fps, config: {damping: 14, stiffness: 160, mass: 0.6}});

  return (
    <Scene
      index="T1"
      title="Inflation soundness"
      caption="every coin traces to an issuer-signed mint — supply = Σ mints − Σ redeems."
    >
      <svg style={{position: 'absolute', inset: 0}} width={1280} height={720}>
        {edge(640, 190, 470, 292, C.border, ramp(frame, 40, 70))}
        {edge(640, 190, 810, 292, C.border, ramp(frame, 46, 76))}
        {edge(470, 330, 390, 442, C.border, ramp(frame, 86, 116))}
        {edge(470, 330, 550, 442, C.border, ramp(frame, 92, 122))}
        {/* forger's dashed branch (pruned with the coin) */}
        <g opacity={1 - prune}>{edge(240, 560, 380, 570, C.red, ramp(frame, 185, 220), 7)}</g>
      </svg>

      {/* signed mint root */}
      <div
        style={{
          position: 'absolute', left: 520, top: 110, width: 240, height: 80,
          borderRadius: 12, background: C.card, border: `2px solid ${C.orange}`,
          boxShadow: '0 0 24px rgba(247,147,26,0.35)', padding: '10px 14px',
          fontFamily: MONO, opacity: ramp(frame, 8, 22),
        }}
      >
        <div style={{fontSize: 16, color: C.orange, fontWeight: 700}}>signed mint</div>
        <div style={{fontSize: 12.5, color: C.muted, marginTop: 3}}>sig(asset, V, nonce) ✓</div>
      </div>
      <KeyIcon x={478} y={124} size={44} delay={10} />

      {/* the coin family tree */}
      <Coin x={470} y={310} r={30} delay={62} label="100" />
      <Coin x={810} y={310} r={30} delay={72} label="50" />
      <Coin x={390} y={460} r={24} delay={105} label="60" />
      <Coin x={550} y={460} r={24} delay={115} label="40" />
      <div style={{position: 'absolute', left: 830, top: 356, fontFamily: MONO, fontSize: 13, color: C.muted, opacity: ramp(frame, 90, 104)}}>
        transfers …
      </div>

      {/* forger */}
      <div style={{position: 'absolute', left: 130, top: 520, opacity: ramp(frame, 150, 168) * (1 - 0.7 * prune)}}>
        <svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
        </svg>
        <div style={{fontFamily: MONO, fontSize: 13, color: C.red, marginTop: 2}}>forger</div>
      </div>
      {/* the unsigned branch coin, rejected and pruned */}
      <div style={{position: 'absolute', left: 350, top: 540, opacity: (1 - prune) * ramp(frame, 205, 225)}}>
        <div
          style={{
            width: 56, height: 56, borderRadius: '50%',
            border: `3px dashed ${C.red}`, background: 'rgba(248,81,73,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: MONO, fontSize: 12, color: C.red,
          }}
        >
          +1000
        </div>
      </div>
      <div style={{position: 'absolute', left: 300, top: 612, fontFamily: MONO, fontSize: 15, color: C.red, fontWeight: 700, opacity: ramp(frame, 235, 252) * (1 - prune)}}>
        no issuer signature ✗ — pruned
      </div>

      {/* summary */}
      <div
        style={{
          position: 'absolute', left: 780, top: 480, padding: '12px 18px',
          borderRadius: 10, background: C.card, border: `2px solid ${C.green}`,
          fontFamily: MONO, fontSize: 16, color: C.green,
          opacity: ramp(frame, 320, 345),
          transform: `translateY(${(1 - ramp(frame, 320, 345)) * 14}px)`,
        }}
      >
        supply = Σ mints − Σ redeems ✓
      </div>
    </Scene>
  );
};
