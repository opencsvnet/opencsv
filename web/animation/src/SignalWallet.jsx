import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {C, MONO, SANS, ramp} from './lib';

const beats = [
  {
    from: 0,
    to: 360,
    step: '01',
    title: 'A consignment arrives in Signal',
    body: 'The 537 KB proof payload travels as an ordinary encrypted Signal attachment. No OpenCSV relay or anchor server is involved.',
    receipt: 'consignment 16d16cde…fdd68',
  },
  {
    from: 360,
    to: 510,
    step: '02',
    title: 'Signal cannot mint USD',
    body: 'The app exposes one USD experience, but credits only exact instruments from reviewed issuers. An anchor below six confirmations remains unspendable.',
    receipt: 'fail closed · depth < 6',
  },
  {
    from: 510,
    to: 720,
    step: '03',
    title: 'Rust owns wallet policy',
    body: 'Signal asks for actions. Rust owns keys, coin selection, reservations, recovery state, transaction layout, and rejection reasons.',
    receipt: 'primary device · backup required',
  },
  {
    from: 720,
    to: 870,
    step: '04',
    title: 'Receive with a public owner key',
    body: 'A chat can carry the owner identity and the proof payload. Secret wallet material never enters message content or Swift JSON.',
    receipt: 'owner ff17c90b…8c124',
  },
  {
    from: 870,
    to: 1050,
    step: '05',
    title: 'Bitcoin is protocol gas only',
    body: 'The wallet can inspect fee UTXOs and confirmations, but it has no arbitrary Bitcoin recipient or general-purpose send path.',
    receipt: '20,000 confirmed signet sats',
  },
  {
    from: 1050,
    to: 1203,
    step: '06',
    title: 'One USD view, exact issuer claims',
    body: 'Issuer-specific instruments stay distinct under the balance. This preview issuer is test-only and carries no monetary value.',
    receipt: 'OpenCSV USD Preview · signet',
  },
];

const currentBeat = (frame) =>
  beats.find((beat) => frame >= beat.from && frame < beat.to) ?? beats[beats.length - 1];

const PhoneFrame = () => (
  <div
    style={{
      position: 'absolute',
      right: 104,
      top: 54,
      width: 282,
      height: 612,
      borderRadius: 45,
      padding: 10,
      background: '#080a0d',
      border: `1px solid ${C.border}`,
      boxShadow: '0 30px 80px rgba(0,0,0,.55), 0 0 60px rgba(88,166,255,.08)',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 36,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <OffthreadVideo
        muted
        src={staticFile('signal/signal-wallet-walkthrough.mp4')}
        style={{width: '100%', height: '100%', objectFit: 'cover'}}
      />
    </div>
  </div>
);

export const SignalWallet = () => {
  const frame = useCurrentFrame();
  const beat = currentBeat(frame);
  const local = frame - beat.from;
  const beatOpacity = Math.min(ramp(local, 0, 12), interpolate(local, [beat.to - beat.from - 12, beat.to - beat.from], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }));
  const progress = frame / 1202;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 82% 45%, rgba(88,166,255,.11), transparent 32%), ${C.bg}`,
        color: C.fg,
        fontFamily: SANS,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.16,
          backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(90deg, black, transparent 74%)',
        }}
      />

      <div style={{position: 'absolute', left: 70, top: 52, display: 'flex', gap: 12, alignItems: 'center'}}>
        <div style={{fontFamily: MONO, fontSize: 19, letterSpacing: 1.5, color: C.fg}}>
          OPEN<span style={{color: C.orange}}>CSV</span> × SIGNAL
        </div>
        <div
          style={{
            border: `1px solid ${C.green}`,
            color: C.green,
            borderRadius: 999,
            padding: '5px 10px',
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: 1,
          }}
        >
          REAL SIMULATOR · SIGNET
        </div>
      </div>

      <div style={{position: 'absolute', left: 70, top: 145, width: 650, opacity: beatOpacity}}>
        <div style={{fontFamily: MONO, color: C.orange, fontSize: 18, letterSpacing: 3}}>{beat.step}</div>
        <h1 style={{fontSize: 46, lineHeight: 1.08, letterSpacing: -1.2, margin: '14px 0 22px'}}>{beat.title}</h1>
        <p style={{fontSize: 23, lineHeight: 1.45, color: C.muted, maxWidth: 610}}>{beat.body}</p>
        <div
          style={{
            display: 'inline-block',
            marginTop: 30,
            padding: '10px 14px',
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            fontFamily: MONO,
            fontSize: 14,
            color: C.blue,
          }}
        >
          {beat.receipt}
        </div>
      </div>

      <div style={{position: 'absolute', left: 70, bottom: 53, width: 650}}>
        <div style={{height: 3, borderRadius: 2, background: C.border, overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${progress * 100}%`, background: C.orange}} />
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: MONO, fontSize: 12, color: C.muted}}>
          <span>LIVE WALLET RECEIPT · 2026-08-04</span>
          <span>{String(Math.floor(frame / 30)).padStart(2, '0')}s / 40s</span>
        </div>
      </div>

      <PhoneFrame />
    </AbsoluteFill>
  );
};
