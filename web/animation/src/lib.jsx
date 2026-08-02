import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// Site palette (meta/web/index.html)
export const C = {
  bg: '#0d1117',
  fg: '#e6edf3',
  muted: '#9da7b3',
  orange: '#f7931a',
  blue: '#58a6ff',
  green: '#3fb950',
  red: '#f85149',
  card: '#161b22',
  border: '#30363d',
};
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
export const SANS = '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Smooth 0→1 ramp between two frames.
export const ramp = (frame, from, to) =>
  interpolate(frame, [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const pop = (frame, fps, delay = 0) =>
  spring({frame: frame - delay, fps, config: {damping: 14, stiffness: 160, mass: 0.6}});

// A scene title card, top-left: "01 — Mint".
export const TitleCard = ({index, title}) => {
  const frame = useCurrentFrame();
  const o = ramp(frame, 0, 14);
  return (
    <div
      style={{
        position: 'absolute',
        top: 44,
        left: 64,
        fontFamily: MONO,
        fontSize: 26,
        letterSpacing: 3,
        textTransform: 'uppercase',
        opacity: o,
        transform: `translateY(${(1 - o) * -12}px)`,
      }}
    >
      <span style={{color: C.orange}}>{index}</span>
      <span style={{color: C.muted}}> — </span>
      <span style={{color: C.fg}}>{title}</span>
    </div>
  );
};

// Bottom caption.
export const Caption = ({children, delay = 30}) => {
  const frame = useCurrentFrame();
  const o = ramp(frame, delay, delay + 16);
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 44,
        left: 64,
        right: 64,
        textAlign: 'center',
        fontFamily: SANS,
        fontSize: 27,
        color: C.muted,
        opacity: o,
        transform: `translateY(${(1 - o) * 14}px)`,
      }}
    >
      {children}
    </div>
  );
};

// The Bitcoin chain strip: a row of blocks growing from the left.
export const ChainStrip = ({y = 560, blocks = 5, delay = 0, highlight = -1}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top: y, display: 'flex', gap: 10}}>
      {Array.from({length: blocks}).map((_, i) => {
        const o = ramp(frame, delay + i * 6, delay + i * 6 + 10);
        const hot = i === highlight;
        return (
          <div
            key={i}
            style={{
              width: 74,
              height: 54,
              borderRadius: 8,
              background: hot ? 'rgba(247,147,26,0.15)' : C.card,
              border: `2px solid ${hot ? C.orange : C.border}`,
              opacity: o,
              transform: `translateY(${(1 - o) * 16}px)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: MONO,
              fontSize: 13,
              color: hot ? C.orange : C.muted,
            }}
          >
            {hot ? 'block' : '·'}
          </div>
        );
      })}
    </div>
  );
};

// A glowing coin disc.
export const Coin = ({x, y, r = 34, delay = 0, label, dim = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = pop(frame, fps, delay);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%, ${C.orange}, #b36a0e)`,
        boxShadow: dim ? 'none' : `0 0 ${r}px rgba(247,147,26,0.45)`,
        opacity: dim ? 0.45 : s,
        transform: `scale(${dim ? 1 : s})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: MONO,
        fontSize: r * 0.62,
        color: '#111',
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
};

// A small labeled box on the chain (OP_RETURN / marker / MINT anchor).
export const ChainBox = ({x, y, w, h = 46, color, title, sub, delay = 0, glow = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = pop(frame, fps, delay);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 10,
        background: C.card,
        border: `2px solid ${color}`,
        boxShadow: glow ? `0 0 26px ${color}66` : 'none',
        transform: `scale(${s})`,
        transformOrigin: 'top left',
        padding: '6px 12px',
        fontFamily: MONO,
      }}
    >
      <div style={{fontSize: 15, color, fontWeight: 700}}>{title}</div>
      {sub ? <div style={{fontSize: 12.5, color: C.muted, marginTop: 2}}>{sub}</div> : null}
    </div>
  );
};

// A chip showing scrolling hex (the 64-byte record / payload).
export const HexChip = ({x, y, w = 300, color = C.blue, prefix = '', size = 15, seed = 7}) => {
  const frame = useCurrentFrame();
  const hex = '0123456789abcdef';
  const rnd = (i) => hex[(seed * 31 + i * 17 + ((i * i) >> 2)) % 16];
  const total = 48;
  const shift = Math.floor(frame * 1.5) % 16;
  let s = '';
  for (let i = 0; i < total; i++) s += rnd(i + shift);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        fontFamily: MONO,
        fontSize: size,
        color,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {prefix}
      {s}
    </div>
  );
};

// A phone outline.
export const Phone = ({x, y, w = 150, h = 280, delay = 0, label}) => {
  const frame = useCurrentFrame();
  const o = ramp(frame, delay, delay + 14);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 22,
        border: `3px solid ${C.border}`,
        background: C.card,
        opacity: o,
        transform: `translateY(${(1 - o) * 20}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{width: 44, height: 5, borderRadius: 3, background: C.border, marginTop: 10}} />
      {label ? (
        <div style={{fontFamily: MONO, fontSize: 14, color: C.muted, marginTop: 14}}>{label}</div>
      ) : null}
    </div>
  );
};

// An SVG key icon (issuer key).
export const KeyIcon = ({x, y, size = 72, color = C.orange, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = pop(frame, fps, delay);
  return (
    <svg
      style={{position: 'absolute', left: x, top: y, transform: `scale(${s}) rotate(-25deg)`, transformOrigin: 'center'}}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.8 12.2 21 2" />
      <path d="m16 7 3 3" />
      <path d="m13 10 2.5 2.5" />
    </svg>
  );
};

// Two rotating gears with a label.
export const Gears = ({x, y, size = 44, speed = 4, delay = 0}) => {
  const frame = useCurrentFrame();
  const o = ramp(frame, delay, delay + 10);
  const rot = (frame - delay) * speed;
  const gear = (cx, cy, r, teeth, dir) => {
    const pts = [];
    for (let i = 0; i < teeth * 2; i++) {
      const rr = i % 2 === 0 ? r : r * 0.78;
      const a = (Math.PI / teeth) * i + (dir * rot * Math.PI) / 180;
      pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
    }
    return <polygon points={pts.join(' ')} fill={C.muted} />;
  };
  return (
    <svg style={{position: 'absolute', left: x, top: y, opacity: o}} width={size * 2.2} height={size * 1.6} viewBox={`0 0 ${size * 2.2} ${size * 1.6}`}>
      {gear(size * 0.55, size * 0.7, size * 0.5, 8, 1)}
      {gear(size * 1.5, size * 0.9, size * 0.38, 7, -1)}
    </svg>
  );
};

// Scene scaffold: bg + title + caption.
export const Scene = ({index, title, caption, captionDelay = 30, children}) => (
  <div style={{position: 'absolute', inset: 0, background: C.bg, fontFamily: SANS}}>
    <TitleCard index={index} title={title} />
    {children}
    <Caption delay={captionDelay}>{caption}</Caption>
  </div>
);
