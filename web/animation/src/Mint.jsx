import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, MONO, Scene, ChainStrip, ChainBox, Coin, KeyIcon, ramp} from './lib';

// 01 — Mint: issuer key signs; coins appear; MINT anchor drops on-chain.
export const Mint = () => {
  const frame = useCurrentFrame();
  const sig = ramp(frame, 24, 60);
  const drop = ramp(frame, 150, 190);

  return (
    <Scene
      index="01"
      title="Mint"
      caption="supply is created only by the issuer's signature — and it's public."
    >
      {/* issuer key + signature */}
      <KeyIcon x={180} y={180} size={84} delay={6} />
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 292,
          fontFamily: MONO,
          fontSize: 17,
          color: C.muted,
          opacity: ramp(frame, 10, 22),
        }}
      >
        issuer key
      </div>
      <svg style={{position: 'absolute', left: 130, top: 330}} width={200} height={46} viewBox="0 0 200 46">
        <path
          d="M6 30 C 30 6, 50 44, 76 22 S 120 8, 140 26 S 180 34, 194 16"
          fill="none"
          stroke={C.orange}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray={300}
          strokeDashoffset={300 * (1 - sig)}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 130,
          top: 384,
          fontFamily: MONO,
          fontSize: 15,
          color: C.muted,
          opacity: ramp(frame, 46, 60),
        }}
      >
        sig(asset, V, nonce)
      </div>

      {/* coins */}
      <Coin x={620} y={250} r={44} delay={50} label="100" />
      <Coin x={760} y={220} r={30} delay={64} label="" dim={false} />
      <Coin x={860} y={280} r={24} delay={78} label="" />

      {/* chain + MINT anchor drop */}
      <ChainStrip y={560} blocks={6} delay={90} highlight={5} />
      <ChainBox
        x={470}
        y={interpolate(drop, [0, 1], [420, 496])}
        w={330}
        h={58}
        color={C.orange}
        title="MINT anchor"
        sub="public: asset · amount · mint commitment"
        delay={150}
        glow
      />
    </Scene>
  );
};
