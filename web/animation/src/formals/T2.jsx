import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, MONO, Scene, Coin, ramp} from '../lib';

// T2 — Conservation: the balance scale stays level; a faked output tips
// and is rejected.
const CX = 640;
const CY = 250; // beam pivot

export const T2 = () => {
  const frame = useCurrentFrame();

  // Phase 1: settle to level with a decaying wobble. Phase 2: fake output
  // tips the beam, then a hard reject.
  const settle = Math.max(0, frame - 30);
  const wobble = frame < 30 ? 0 : 5 * Math.exp(-settle / 26) * Math.sin(settle / 5);
  const tip = interpolate(ramp(frame, 330, 390), [0, 1], [0, 11]);
  const reject = ramp(frame, 400, 430);
  const rot = wobble + tip * (1 - 0.4 * reject);

  const fake = ramp(frame, 300, 330); // the 30 becomes a 40

  return (
    <Scene
      index="T2"
      title="Conservation"
      caption="transfers can't create or destroy value — Σ in = Σ out, per asset, range-checked."
    >
      {/* labels */}
      <div style={{position: 'absolute', left: 320, top: 120, fontFamily: MONO, fontSize: 16, color: C.muted, opacity: ramp(frame, 10, 24)}}>
        inputs · 60 + 40
      </div>
      <div style={{position: 'absolute', left: 850, top: 120, fontFamily: MONO, fontSize: 16, color: C.muted, opacity: ramp(frame, 10, 24)}}>
        outputs · 70 + {fake > 0.5 ? '40' : '30'}
        {fake > 0.5 ? <span style={{color: C.red}}> ✗</span> : null}
      </div>

      {/* scale */}
      <svg style={{position: 'absolute', inset: 0}} width={1280} height={720}>
        {/* fulcrum */}
        <polygon points={`${CX - 26},470 ${CX + 26},470 ${CX},${CY + 18}`} fill={C.border} />
        <g transform={`rotate(${rot} ${CX} ${CY})`}>
          {/* beam */}
          <line x1={CX - 230} y1={CY} x2={CX + 230} y2={CY} stroke={C.fg} strokeWidth={6} strokeLinecap="round" />
          {/* strings + pans */}
          {[-1, 1].map((s) => (
            <g key={s}>
              <line x1={CX + s * 230} y1={CY} x2={CX + s * 230} y2={CY + 90} stroke={C.border} strokeWidth={3} />
              <ellipse cx={CX + s * 230} cy={CY + 96} rx={86} ry={14} fill={C.card} stroke={C.border} strokeWidth={2.5} />
            </g>
          ))}
        </g>
      </svg>

      {/* coins ride with the pans (same rotation group, mirrored in divs) */}
      <PanCoins rot={rot} side={-1} coins={[60, 40]} color={C.orange} show={ramp(frame, 24, 44)} />
      <PanCoins rot={rot} side={1} coins={fake > 0.5 ? [70, 40] : [70, 30]} color={C.orange} show={ramp(frame, 60, 80)} hot={fake} />

      {/* verdicts */}
      <div style={{position: 'absolute', left: 500, top: 530, fontFamily: MONO, fontSize: 20, color: C.green, fontWeight: 700, opacity: ramp(frame, 150, 175) * (1 - fake)}}>
        Σ in = Σ out ✓ level
      </div>
      <div style={{position: 'absolute', left: 430, top: 530, fontFamily: MONO, fontSize: 20, color: C.red, fontWeight: 700, opacity: reject}}>
        outputs exceed inputs — REJECTED ✗
      </div>
    </Scene>
  );
};

const PanCoins = ({rot, side, coins, color, show, hot = 0}) => {
  // pan center in unrotated coords, rotated about (CX,CY)
  const a = (rot * Math.PI) / 180;
  const px = CX + side * 230;
  const py = CY + 96;
  const dx = px - CX;
  const dy = py - CY;
  const rx = CX + dx * Math.cos(a) - dy * Math.sin(a);
  const ry = CY + dx * Math.sin(a) + dy * Math.cos(a);
  return (
    <>
      {coins.map((v, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: rx - 26 + (i - 0.5) * 58,
            top: ry - 62,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${color}, #b36a0e)`,
            border: hot > 0.5 && i === 1 ? `3px solid ${C.red}` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: MONO,
            fontSize: 17,
            fontWeight: 700,
            color: '#111',
            opacity: show,
            transform: `rotate(${rot}deg)`,
          }}
        >
          {v}
        </div>
      ))}
    </>
  );
};
