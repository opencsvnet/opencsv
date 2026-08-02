import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C, MONO, Scene, Phone, Gears, ramp} from './lib';

// 04 — Scan-first: compact filters fan past; one marker hit; block download;
// proof verified; local index says no earlier occurrence.
export const Scan = () => {
  const frame = useCurrentFrame();
  const cards = 11;
  const hit = 6; // index of the glowing card
  const blockY = interpolate(ramp(frame, 150, 190), [0, 1], [-140, 100]);

  return (
    <Scene
      index="04"
      title="Scan-first verification"
      caption="your phone finds the anchor with proof-of-work filters — and checks double-spends locally."
    >
      <Phone x={120} y={210} label="recipient" delay={4} />

      {/* filter cards fanning past (kilobytes each) */}
      {Array.from({length: cards}).map((_, i) => {
        const start = 12 + i * 11;
        const t = ramp(frame, start, start + 40);
        const x = interpolate(t, [0, 1], [1240, 240]);
        const isHit = i === hit;
        const glow = isHit ? ramp(frame, start + 30, start + 44) : 0;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: 240 + (i % 3) * 12,
              width: 108,
              height: 148,
              borderRadius: 10,
              background: C.card,
              border: `2px solid ${isHit ? C.blue : C.border}`,
              boxShadow: isHit ? `0 0 ${glow * 30}px rgba(88,166,255,0.55)` : 'none',
              padding: 10,
              fontFamily: MONO,
              opacity: t > 0 && t < 1 ? 1 : t >= 1 ? 0 : 0,
            }}
          >
            <div style={{fontSize: 12, color: C.muted}}>filter</div>
            <div style={{fontSize: 12, color: C.muted}}>#{84000 + i}</div>
            <div style={{fontSize: 11, color: C.muted, marginTop: 54}}>~KB</div>
            {isHit ? (
              <div style={{fontSize: 12.5, color: C.blue, fontWeight: 700, marginTop: 4}}>
                marker hit
              </div>
            ) : null}
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 560,
          top: 420,
          fontFamily: MONO,
          fontSize: 15,
          color: C.muted,
          opacity: ramp(frame, 16, 30),
        }}
      >
        BIP157/158 compact filters — kilobytes per block
      </div>

      {/* the one candidate block slides down, merkle-checked */}
      <div
        style={{
          position: 'absolute',
          left: 800,
          top: blockY,
          width: 240,
          height: 120,
          borderRadius: 12,
          background: C.card,
          border: `2px solid ${C.blue}`,
          padding: 12,
          fontFamily: MONO,
          opacity: ramp(frame, 150, 168),
        }}
      >
        <div style={{fontSize: 14, color: C.blue, fontWeight: 700}}>candidate block</div>
        <div style={{fontSize: 12.5, color: C.muted, marginTop: 6}}>merkle-verified vs PoW headers</div>
        <div style={{fontSize: 12.5, color: C.muted, marginTop: 4}}>records + ctx → local index</div>
      </div>

      {/* proof check */}
      <Gears x={330} y={145} delay={205} />
      <div
        style={{
          position: 'absolute',
          left: 445,
          top: 160,
          fontFamily: MONO,
          fontSize: 20,
          color: C.green,
          fontWeight: 700,
          opacity: ramp(frame, 218, 234),
        }}
      >
        proof verified · 3.6 ms
      </div>

      {/* local occurrence index */}
      <div
        style={{
          position: 'absolute',
          left: 420,
          top: 480,
          width: 440,
          borderRadius: 12,
          background: C.card,
          border: `2px solid ${C.border}`,
          padding: '14px 18px',
          fontFamily: MONO,
          opacity: ramp(frame, 250, 268),
          transform: `translateY(${(1 - ramp(frame, 250, 268)) * 16}px)`,
        }}
      >
        <div style={{fontSize: 14, color: C.muted, marginBottom: 8}}>local index (rebuildable)</div>
        <div style={{fontSize: 16, color: C.fg}}>
          no earlier occurrence of nf <span style={{color: C.green, fontWeight: 700}}>✓</span>
        </div>
        <div style={{fontSize: 12.5, color: C.muted, marginTop: 6}}>
          H(nf ∥ ctx) over local records · no network, no third party
        </div>
      </div>
    </Scene>
  );
};
