import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, MONO, Scene, ChainStrip, ramp} from './lib';

// 05 — Batching: many senders' payload chips funnel into one envelope.
export const Batch = () => {
  const frame = useCurrentFrame();
  const senders = [
    {y: 150, label: 'P₁', seed: 3},
    {y: 250, label: 'P₂', seed: 5},
    {y: 350, label: 'P₃', seed: 8},
    {y: 450, label: 'P₄', seed: 13},
  ];

  return (
    <Scene
      index="05"
      title="Batching"
      caption="proof contents stay private; membership, fee inputs, change scripts, and timing can remain visible."
    >
      <ChainStrip y={540} blocks={6} delay={100} highlight={4} />

      {/* sender icons + payload chips flying into the envelope */}
      {senders.map((s, i) => {
        const fly = ramp(frame, 30 + i * 18, 100 + i * 18);
        const cx = interpolate(fly, [0, 1], [300, 900]);
        const cy = interpolate(fly, [0, 1], [s.y, 420]);
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: 120,
                top: s.y - 22,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: C.card,
                border: `2px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: MONO,
                fontSize: 15,
                color: C.fg,
                opacity: ramp(frame, 8 + i * 6, 20 + i * 6),
              }}
            >
              {`s${i + 1}`}
            </div>
            {fly > 0 && fly < 1 ? (
              <div
                style={{
                  position: 'absolute',
                  left: cx,
                  top: cy,
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: C.card,
                  border: `2px solid ${C.orange}`,
                  fontFamily: MONO,
                  fontSize: 15,
                  color: C.orange,
                }}
              >
                {s.label} = H("bind"∥nfᵢ∥ctx)
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 180,
          top: 520,
          fontFamily: MONO,
          fontSize: 14.5,
          color: C.muted,
          opacity: ramp(frame, 24, 40),
        }}
      >
        24-byte payloads, computed locally
      </div>

      {/* the batch envelope on-chain */}
      <div
        style={{
          position: 'absolute',
          left: 900,
          top: 400,
          width: 280,
          height: 130,
          borderRadius: 12,
          background: C.card,
          border: `2px solid ${C.orange}`,
          boxShadow: `0 0 ${ramp(frame, 150, 190) * 30}px rgba(247,147,26,0.4)`,
          padding: 14,
          fontFamily: MONO,
          opacity: ramp(frame, 120, 150),
          transform: `scale(${0.7 + 0.3 * ramp(frame, 120, 150)})`,
        }}
      >
        <div style={{fontSize: 15, color: C.orange, fontWeight: 700}}>batch transaction</div>
        <div style={{fontSize: 12.5, color: C.muted, marginTop: 6}}>
          witness envelope · P₁…Pₙ
        </div>
        <div style={{fontSize: 12.5, color: C.muted, marginTop: 4}}>
          one header · one marker
        </div>
        <div style={{fontSize: 12.5, color: C.blue, marginTop: 8}}>
          batcher: liveness only
        </div>
      </div>
    </Scene>
  );
};
