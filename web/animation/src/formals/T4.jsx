import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, MONO, Scene, ramp} from '../lib';

// T4 — Receiver correctness: the Accept checklist. Honest flow (left)
// passes; a forged coin (right) dies at the proof check.
const STEPS = [
  'parse & type-check',
  'proof verifies',
  'anchor present · 6 confs',
  'no earlier occurrence',
  'owned output',
];

const Checklist = ({x, y, title, titleColor, start, failAt = -1, verdict, verdictColor}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 480}}>
      <div style={{fontFamily: MONO, fontSize: 16, color: titleColor, marginBottom: 16, opacity: ramp(frame, start, start + 12)}}>
        {title}
      </div>
      {STEPS.map((step, i) => {
        const t0 = start + 14 + i * 26;
        const o = ramp(frame, t0, t0 + 12);
        const failed = i === failAt;
        const stalled = failAt >= 0 && i > failAt;
        const check = ramp(frame, t0 + 6, t0 + 18);
        return (
          <div key={step} style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 13, opacity: stalled ? 0.25 * o : o}}>
            <svg width={26} height={26} viewBox="0 0 26 26">
              <circle cx={13} cy={13} r={11.5} fill="none" stroke={failed ? C.red : C.green} strokeWidth={2} opacity={o} />
              {failed ? (
                <path d="M8.5 8.5 17.5 17.5 M17.5 8.5 8.5 17.5" stroke={C.red} strokeWidth={2.6} strokeLinecap="round"
                  strokeDasharray={26} strokeDashoffset={26 * (1 - check)} />
              ) : (
                <path d="M8 13.5 11.5 17 18 9.5" fill="none" stroke={C.green} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={18} strokeDashoffset={18 * (1 - check)} />
              )}
            </svg>
            <span style={{fontFamily: MONO, fontSize: 17.5, color: failed ? C.red : C.fg}}>{step}</span>
          </div>
        );
      })}
      <div
        style={{
          fontFamily: MONO, fontSize: 22, fontWeight: 700, color: verdictColor,
          marginTop: 10, opacity: ramp(frame, start + 14 + 5 * 26, start + 26 + 5 * 26),
        }}
      >
        {verdict}
      </div>
    </div>
  );
};

export const T4 = () => (
  <Scene
    index="T4"
    title="Receiver correctness"
    caption="accept only valid histories — anything else dies at the checklist."
  >
    <Checklist
      x={90} y={150} title="honest consignment" titleColor={C.muted}
      start={16} verdict="ACCEPT ✓" verdictColor={C.green}
    />
    <Checklist
      x={700} y={150} title="forged coin" titleColor={C.muted}
      start={90} failAt={1} verdict="REJECTED ✗" verdictColor={C.red}
    />
    <svg style={{position: 'absolute', left: 630, top: 130}} width={4} height={440}>
      <line x1={2} y1={0} x2={2} y2={440} stroke={C.border} strokeWidth={2} strokeDasharray="6 8" />
    </svg>
  </Scene>
);
