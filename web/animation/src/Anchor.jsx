import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, MONO, Scene, ChainStrip, ChainBox, Coin, HexChip, ramp} from './lib';

// 02 — Anchor: coin splits; 64-byte record flies into OP_RETURN; dust → marker.
export const Anchor = () => {
  const frame = useCurrentFrame();
  const split = ramp(frame, 10, 46);
  const fly = ramp(frame, 70, 130);
  const dust = ramp(frame, 160, 200);

  const x1 = interpolate(split, [0, 1], [430, 330]);
  const x2 = interpolate(split, [0, 1], [430, 540]);
  const chipX = interpolate(fly, [0, 1], [330, 700]);
  const chipY = interpolate(fly, [0, 1], [300, 462]);

  return (
    <Scene
      index="02"
      title="Anchor"
      caption="every spend anchors 64 bytes + a constant marker — nothing else touches the chain."
    >
      {/* coin splits in two */}
      <Coin x={x1} y={300} r={36} delay={4} label="60" />
      {split > 0.2 ? <Coin x={x2} y={300} r={30} delay={0} label="40" /> : null}
      <div
        style={{
          position: 'absolute',
          left: 300,
          top: 370,
          fontFamily: MONO,
          fontSize: 15,
          color: C.muted,
          opacity: ramp(frame, 40, 54),
        }}
      >
        2-in / 2-out transfer
      </div>

      {/* flying 64-byte record */}
      {fly > 0 && fly < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: chipX,
            top: chipY,
            width: 220,
            padding: '8px 12px',
            borderRadius: 10,
            background: C.card,
            border: `2px solid ${C.blue}`,
            opacity: 0.4 + 0.6 * Math.sin(fly * Math.PI) ** 0.5 + 0.0,
          }}
        >
          <HexChip x={0} y={0} w={196} color={C.blue} prefix="" size={13} seed={11} />
        </div>
      ) : null}

      {/* chain: OP_RETURN + marker */}
      <ChainStrip y={540} blocks={7} delay={40} highlight={4} />
      <ChainBox
        x={700}
        y={460}
        w={330}
        h={56}
        color={C.blue}
        title="OP_RETURN · 64-byte record"
        sub="P = H(nf ∥ ctx) — no amounts, no owners"
        delay={128}
        glow
      />
      <ChainBox
        x={1060}
        y={460}
        w={170}
        h={56}
        color={C.blue}
        title="marker"
        sub="546 sats · dust"
        delay={196}
        glow
      />
      {/* dust coin dropping to the marker */}
      {dust > 0 ? (
        <Coin
          x={1135}
          y={interpolate(dust, [0, 1], [380, 436])}
          r={13}
          delay={0}
          label=""
          dim={false}
        />
      ) : null}
    </Scene>
  );
};
