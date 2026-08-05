import React from 'react';
import {Series, interpolate, useCurrentFrame} from 'remotion';
import {C, MONO, SANS, Scene, ramp} from './lib';

const Box = ({left, top, width, children, color = C.border, opacity = 1}) => (
  <div style={{
    position: 'absolute', left, top, width, minHeight: 64, padding: '15px 18px',
    borderRadius: 12, border: `2px solid ${color}`, background: C.card,
    color: C.fg, fontFamily: MONO, fontSize: 16, opacity,
  }}>{children}</div>
);

const ProofCompression = () => {
  const frame = useCurrentFrame();
  const collapse = ramp(frame, 75, 180);
  const histories = ['mint', 'Alice', 'Bob', 'Carol', '… 10,000 hops'];
  return (
    <Scene index="01" title="Proof history stays off-chain" caption="recursive PCD makes verification independent of coin-history length.">
      {histories.map((label, index) => {
        const top = interpolate(collapse, [0, 1], [145 + index * 72, 305]);
        const left = interpolate(collapse, [0, 1], [120, 310]);
        return <Box key={label} left={left} top={top} width={250} color={C.blue} opacity={1 - collapse}>{label}</Box>;
      })}
      <Box left={310} top={305} width={250} color={C.blue} opacity={ramp(frame, 145, 185)}>history folded</Box>
      <div style={{position: 'absolute', left: 575, top: 290, color: C.orange, fontSize: 48, opacity: ramp(frame, 80, 130)}}>→</div>
      <Box left={700} top={248} width={430} color={C.orange} opacity={ramp(frame, 120, 165)}>
        <div style={{color: C.orange, fontWeight: 800, fontSize: 21}}>one current proof</div>
        <div style={{color: C.muted, marginTop: 9, lineHeight: 1.6}}>proof bytes travel privately<br/>Bitcoin stores one binding record</div>
      </Box>
      <div style={{position: 'absolute', left: 700, top: 430, color: C.green, font: `18px ${MONO}`, opacity: ramp(frame, 180, 220)}}>
        verification work ≠ history length
      </div>
    </Scene>
  );
};

const SharedTransaction = () => {
  const frame = useCurrentFrame();
  const people = ['P1', 'P2', 'P3', 'P4', '…', 'PN'];
  const flow = ramp(frame, 45, 175);
  return (
    <Scene index="02" title="Many payments share one transaction" caption="fixed overhead is shared; each participant still contributes weight and enforces their own signature policy.">
      {people.map((name, index) => {
        const y = 130 + index * 68;
        const width = interpolate(flow, [0, 1], [30, 455]);
        return <React.Fragment key={name}>
          <div style={{position: 'absolute', left: 90, top: y, width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 24, border: `2px solid ${C.blue}`, color: C.blue, font: `14px ${MONO}`}}>{name}</div>
          <div style={{position: 'absolute', left: 150, top: y + 21, width, height: 5, borderRadius: 4, background: `linear-gradient(90deg, ${C.blue}55, ${C.blue})`}} />
        </React.Fragment>;
      })}
      <Box left={650} top={160} width={480} color={C.orange} opacity={ramp(frame, 95, 145)}>
        <div style={{color: C.orange, fontSize: 20, fontWeight: 800}}>one co-funded Bitcoin transaction</div>
        <div style={{marginTop: 14, color: C.muted, lineHeight: 1.75}}>
          input 0 · reusable stock<br/>
          outputs 0–2 · header, marker, stock<br/>
          per person · fee input, payload, change
        </div>
      </Box>
      <div style={{position: 'absolute', left: 700, top: 430, display: 'flex', gap: 24, opacity: ramp(frame, 165, 205)}}>
        <div style={{font: `700 34px ${MONO}`, color: C.orange}}>67%</div>
        <div style={{font: `16px ${SANS}`, color: C.muted, maxWidth: 340}}>modeled fee saving at N=64 and 5 sat/vB—not a 64× TPS claim</div>
      </div>
    </Scene>
  );
};

const ProvisionalChain = () => {
  const frame = useCurrentFrame();
  const names = [
    {name: 'Alice', status: 'signed A', x: 90},
    {name: 'Bob', status: 'available—unconfirmed', x: 470},
    {name: 'Carol', status: 'receives child B', x: 850},
  ];
  return (
    <Scene index="03" title="Availability can precede settlement" caption="the child spends an OpenCSV coin, not the parent Bitcoin output; exact-parent risk remains explicit.">
      <div style={{position: 'absolute', left: 55, right: 55, top: 115, bottom: 120, border: `2px dashed ${C.blue}66`, borderRadius: 20, background: `${C.blue}08`, opacity: ramp(frame, 0, 20)}} />
      <div style={{position: 'absolute', right: 80, top: 130, color: C.blue, font: `13px ${MONO}`}}>MEMPOOL · UNCONFIRMED</div>
      {names.map((item, index) => <Box key={item.name} left={item.x} top={260} width={270} color={index === 1 ? C.orange : C.blue} opacity={ramp(frame, 25 + index * 55, 55 + index * 55)}>
        <div style={{fontSize: 23, fontWeight: 800}}>{item.name}</div>
        <div style={{color: index === 1 ? C.orange : C.muted, marginTop: 9}}>{item.status}</div>
        <div style={{fontSize: 12, color: C.muted, marginTop: 12}}>{index === 1 ? 'proof + owner + exact tx + exclusion' : 'separate Bitcoin fee UTXO'}</div>
      </Box>)}
      {[405, 785].map((x, index) => <div key={x} style={{position: 'absolute', left: x, top: 305, color: C.orange, fontSize: 38, opacity: ramp(frame, 75 + index * 55, 105 + index * 55)}}>→</div>)}
      <div style={{position: 'absolute', left: 410, top: 466, width: 450, textAlign: 'center', color: C.red, font: `14px ${MONO}`, opacity: ramp(frame, 210, 245)}}>
        parent disappears → descendants freeze
      </div>
    </Scene>
  );
};

const HonestLimits = () => {
  const frame = useCurrentFrame();
  const rows = [
    ['7.32 → 15.15 ops/s', 'theoretical full-block saturation'],
    ['35,596 vs 107,904 sats', 'generated at N=64 · 5 sat/vB'],
    ['not instant finality', 'settlement still belongs to Bitcoin'],
    ['two-hop receipt pending', 'live receive is not silently upgraded'],
  ];
  return (
    <Scene index="04" title="Receipts, not adjectives" caption="proof compression, batching, and provisional availability solve different problems—and keep their limits.">
      {rows.map(([value, label], index) => <div key={value} style={{
        position: 'absolute', left: 150, right: 150, top: 132 + index * 104,
        display: 'grid', gridTemplateColumns: '430px 1fr', gap: 35, alignItems: 'center',
        padding: '18px 22px', borderBottom: `1px solid ${C.border}`,
        opacity: ramp(frame, 20 + index * 35, 45 + index * 35),
        transform: `translateY(${(1 - ramp(frame, 20 + index * 35, 45 + index * 35)) * 12}px)`,
      }}>
        <div style={{color: index < 2 ? C.orange : C.fg, font: `700 24px ${MONO}`}}>{value}</div>
        <div style={{color: C.muted, font: `18px ${SANS}`}}>{label}</div>
      </div>)}
    </Scene>
  );
};

const SCENE = 360;

export const ScaleVideo = () => (
  <Series>
    <Series.Sequence durationInFrames={SCENE}><ProofCompression /></Series.Sequence>
    <Series.Sequence durationInFrames={SCENE}><SharedTransaction /></Series.Sequence>
    <Series.Sequence durationInFrames={SCENE}><ProvisionalChain /></Series.Sequence>
    <Series.Sequence durationInFrames={SCENE}><HonestLimits /></Series.Sequence>
  </Series>
);

export const SCALE_DURATION = SCENE * 4;
