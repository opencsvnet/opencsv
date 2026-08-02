import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, MONO, Scene, Phone, ramp} from './lib';

// 03 — Gossip: consignment + proof travels phone → phone in a chat bubble.
export const Gossip = () => {
  const frame = useCurrentFrame();
  const fly = ramp(frame, 40, 130);
  const arrive = ramp(frame, 128, 142);

  const bx = interpolate(fly, [0, 1], [330, 820]);
  const by = interpolate(fly, [0, 1], [300, 240]) - Math.sin(fly * Math.PI) * 110;
  const rot = interpolate(fly, [0, 1], [-8, 6]);

  return (
    <Scene
      index="03"
      title="Transport"
      caption="coins travel off-chain, end-to-end encrypted — with a constant-size proof of their whole history."
    >
      <Phone x={150} y={170} label="sender" delay={4} />
      <Phone x={830} y={170} label="recipient" delay={4} />

      {/* Signal-ish chat bubble carrying the package */}
      <div
        style={{
          position: 'absolute',
          left: bx,
          top: by,
          transform: `rotate(${rot}deg) scale(${0.6 + 0.4 * Math.min(1, fly * 3)})`,
          opacity: fly > 0 ? 1 : ramp(frame, 34, 40),
        }}
      >
        <div
          style={{
            background: C.blue,
            borderRadius: '18px 18px 18px 4px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 8px 30px rgba(88,166,255,0.35)',
          }}
        >
          {/* wrapped package = consignment + proof */}
          <svg width={54} height={54} viewBox="0 0 24 24" fill="none" stroke="#0d1117" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
          <div>
            <div style={{fontFamily: MONO, fontSize: 15, fontWeight: 700, color: '#0d1117'}}>
              consignment
            </div>
            <div style={{fontFamily: MONO, fontSize: 12.5, color: '#0d1117', opacity: 0.75}}>
              + proof · constant size
            </div>
          </div>
          {/* lock */}
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#0d1117" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      {/* arrival ping on the recipient phone */}
      {arrive > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: 900,
            top: 320,
            width: 12 + arrive * 60,
            height: 12 + arrive * 60,
            borderRadius: '50%',
            border: `3px solid ${C.green}`,
            opacity: 1 - arrive,
            transform: 'translate(-50%,-50%)',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 862,
          top: 380,
          fontFamily: MONO,
          fontSize: 15,
          color: C.green,
          opacity: ramp(frame, 150, 166),
        }}
      >
        received · e2e encrypted
      </div>
    </Scene>
  );
};
