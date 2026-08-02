import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, MONO, SANS, Scene, ramp} from './lib';

// 06 — Trust summary: checklist animates in, then the end card.
const ITEMS = [
  'no fork',
  'no trusted server',
  'shielded amounts',
  'public supply',
  'post-quantum hashes',
];

export const Trust = () => {
  const frame = useCurrentFrame();
  const endCard = ramp(frame, 170, 210);

  return (
    <Scene index="06" title="What you trust" caption="">
      <div style={{position: 'absolute', left: 340, top: 170}}>
        {ITEMS.map((item, i) => {
          const o = ramp(frame, 16 + i * 16, 32 + i * 16);
          const check = ramp(frame, 24 + i * 16, 36 + i * 16);
          return (
            <div
              key={item}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                marginBottom: 26,
                opacity: o * (1 - endCard),
                transform: `translateX(${(1 - o) * -18}px)`,
              }}
            >
              <svg width={34} height={34} viewBox="0 0 34 34">
                <circle cx={17} cy={17} r={15} fill="none" stroke={C.green} strokeWidth={2.5} opacity={o} />
                <path
                  d="M10 17.5 15 22.5 24 12"
                  fill="none"
                  stroke={C.green}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={24}
                  strokeDashoffset={24 * (1 - check)}
                />
              </svg>
              <span style={{fontFamily: MONO, fontSize: 26, color: C.fg}}>{item}</span>
            </div>
          );
        })}
      </div>

      {/* end card */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: C.bg,
          opacity: endCard,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{fontFamily: SANS, fontSize: 86, fontWeight: 800, letterSpacing: -2, color: C.fg}}>
          Open<span style={{color: C.orange}}>CSV</span>
        </div>
        <div style={{fontFamily: SANS, fontSize: 26, color: C.muted, marginTop: 18}}>
          client-side verified RWAs on Bitcoin
        </div>
        <div style={{fontFamily: MONO, fontSize: 20, color: C.blue, marginTop: 42}}>
          opencsvnet.github.io/opencsv
        </div>
      </div>
    </Scene>
  );
};
