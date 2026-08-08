import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  Series,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import {C, MONO, SANS, ramp} from './lib';

const FPS = 30;
const ONE_PHONE = 367;
const BRIDGE = 360;
const VERIFIED = 180;
const CODA = 180;

export const MESSAGE_FLOW_DURATION = ONE_PHONE + BRIDGE + VERIFIED + CODA;

const bobSend = staticFile('signal/message-flow/bob-send-return.mp4');
const bobLive = staticFile('signal/message-flow/bob-live-roundtrip.mp4');
const carolLive = staticFile('signal/message-flow/carol-live-roundtrip.mp4');

const fadeEdges = (frame, duration) =>
  Math.min(
    ramp(frame, 0, 10),
    interpolate(frame, [duration - 10, duration], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

const SourceVideo = ({src, fromSeconds}) => (
  <OffthreadVideo
    muted
    src={src}
    startFrom={Math.round(fromSeconds * FPS)}
    style={{width: '100%', height: '100%', objectFit: 'cover'}}
  />
);

const Phone = ({label, children, width = 282, height = 612}) => (
  <div style={{width, height, position: 'relative'}}>
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: -31,
        color: '#d8dee9',
        textAlign: 'center',
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 45,
        padding: 9,
        background: '#080a0d',
        border: '1px solid rgba(255,255,255,.18)',
        boxShadow: '0 28px 75px rgba(0,0,0,.5)',
      }}
    >
      <div style={{width: '100%', height: '100%', borderRadius: 37, overflow: 'hidden', background: '#fff'}}>
        {children}
      </div>
    </div>
  </div>
);

const Header = ({mode}) => (
  <div style={{position: 'absolute', left: 58, right: 58, top: 35, display: 'flex', alignItems: 'center'}}>
    <div style={{fontFamily: MONO, fontSize: 17, letterSpacing: 1.4}}>
      OPEN<span style={{color: C.orange}}>CSV</span> × SIGNAL
    </div>
    <div
      style={{
        marginLeft: 14,
        border: `1px solid ${C.green}`,
        color: C.green,
        borderRadius: 999,
        padding: '5px 9px',
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: 1,
      }}
    >
      REAL SIMULATORS · BITCOIN SIGNET
    </div>
    <div style={{marginLeft: 'auto', color: C.muted, fontFamily: MONO, fontSize: 11}}>{mode}</div>
  </div>
);

const Explanation = ({step, title, body, receipt, align = 'left'}) => (
  <div style={{textAlign: align}}>
    <div style={{color: C.orange, fontFamily: MONO, fontSize: 16, letterSpacing: 2.8}}>{step}</div>
    <h1 style={{fontSize: 48, lineHeight: 1.02, letterSpacing: -1.5, margin: '15px 0 21px'}}>{title}</h1>
    <p style={{fontSize: 21, lineHeight: 1.42, color: C.muted, margin: 0}}>{body}</p>
    <div
      style={{
        display: 'inline-block',
        marginTop: 27,
        padding: '9px 12px',
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 7,
        color: C.blue,
        fontFamily: MONO,
        fontSize: 12,
      }}
    >
      {receipt}
    </div>
  </div>
);

const onePhoneBeats = [
  {
    from: 0,
    to: 190,
    step: '01 · SEND',
    title: 'Bob opens payments.',
    body: 'This is the real Signal conversation and attachment menu. Bob chooses the OpenCSV payment action without leaving the chat.',
    receipt: 'ACTION AT 1× · DEAD PAUSES REMOVED',
  },
  {
    from: 190,
    to: 235,
    step: '02 · REVIEW',
    title: 'One dollar to Carol.',
    body: 'The real send sheet keeps the recipient and exact Test USD amount visible before anything is committed.',
    receipt: 'CAROL · 1 TEST USD · SIGNET ONLY',
  },
  {
    from: 235,
    to: 286,
    step: '03 · COMMIT',
    title: 'Signal asks once.',
    body: 'The receipt records this issuer and its test-only status. One tap authorizes Rust to make the operation durable before relay.',
    receipt: 'REVIEW · THEN PERSIST BEFORE RELAY',
  },
  {
    from: 286,
    to: ONE_PHONE,
    step: '04 · PENDING',
    title: 'The chat updates now.',
    body: 'Signal shows the payment immediately while proof generation and network observation continue in the background.',
    receipt: 'PENDING ≠ SETTLED',
  },
];

const OnePhone = () => {
  const frame = useCurrentFrame();
  const beat = onePhoneBeats.find((item) => frame >= item.from && frame < item.to) ?? onePhoneBeats.at(-1);
  return (
    <AbsoluteFill style={{opacity: fadeEdges(frame, ONE_PHONE)}}>
      <Header mode="ONE SCREEN + EXPLANATION" />
      <div style={{position: 'absolute', left: 93, top: 87}}>
        <Phone label="Bob · sender view">
          <Series>
            <Series.Sequence durationInFrames={190}><SourceVideo src={bobSend} fromSeconds={14.2} /></Series.Sequence>
            <Series.Sequence durationInFrames={45}><SourceVideo src={bobSend} fromSeconds={37.6} /></Series.Sequence>
            <Series.Sequence durationInFrames={51}><SourceVideo src={bobSend} fromSeconds={52.8} /></Series.Sequence>
            <Series.Sequence durationInFrames={81}><SourceVideo src={bobSend} fromSeconds={69.8} /></Series.Sequence>
          </Series>
        </Phone>
      </div>
      <div style={{position: 'absolute', left: 488, top: 157, width: 690}}>
        <Explanation {...beat} />
      </div>
    </AbsoluteFill>
  );
};

const FlightPath = ({frame, reverse = false}) => {
  const travel = interpolate(frame, [145, 215], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const x = reverse ? 1 - travel : travel;
  const glow = frame >= 145 && frame <= 225 ? 1 : 0.25;
  return (
    <div style={{position: 'absolute', left: 404, top: 328, width: 472, height: 70}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 34, height: 2, background: C.border}} />
      <div
        style={{
          position: 'absolute',
          left: `${x * 440}px`,
          top: 22,
          width: 26,
          height: 26,
          borderRadius: 13,
          background: C.blue,
          boxShadow: `0 0 24px rgba(88,166,255,${glow})`,
        }}
      />
    </div>
  );
};

const TwoPhones = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity: fadeEdges(frame, BRIDGE)}}>
      <Header mode="TWO SYNCHRONIZED SCREENS" />
      <div style={{position: 'absolute', left: 73, top: 91}}>
        <Phone label="Bob · 6:19" width={260} height={565}>
          <SourceVideo src={bobLive} fromSeconds={263} />
        </Phone>
      </div>
      <div style={{position: 'absolute', right: 73, top: 91}}>
        <Phone label="Carol · 6:19" width={260} height={565}>
          <SourceVideo src={carolLive} fromSeconds={263} />
        </Phone>
      </div>
      <FlightPath frame={frame} />
      <div style={{position: 'absolute', left: 386, top: 151, width: 508, textAlign: 'center'}}>
        <div style={{color: C.orange, fontFamily: MONO, fontSize: 15, letterSpacing: 2.4}}>05 · HANDOFF</div>
        <h1 style={{fontSize: 39, lineHeight: 1.02, margin: '14px 0 17px'}}>One Signal message.<br />Two wallet views.</h1>
        <p style={{fontSize: 17, lineHeight: 1.4, color: C.muted, margin: 0}}>
          These recordings began at the same instant. The moving dot explains the encrypted attachment path; it is not a recreated payment bubble.
        </p>
      </div>
      <div style={{position: 'absolute', left: 461, top: 426, width: 358, textAlign: 'center', fontFamily: MONO, fontSize: 11, color: C.blue}}>
        ENCRYPTED CONSIGNMENT · NO OPENCSV SERVER
      </div>
      <div style={{position: 'absolute', left: 410, bottom: 36, width: 460, textAlign: 'center', fontFamily: MONO, fontSize: 10, color: C.muted}}>
        LIVE, SYNCHRONIZED CAPTURE · ACTION AT 1×
      </div>
    </AbsoluteFill>
  );
};

const Verified = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity: fadeEdges(frame, VERIFIED)}}>
      <Header mode="ONE SCREEN + EXPLANATION" />
      <div style={{position: 'absolute', left: 93, top: 87}}>
        <Phone label="Bob · final chat state">
          <SourceVideo src={bobSend} fromSeconds={196.5} />
        </Phone>
      </div>
      <div style={{position: 'absolute', left: 488, top: 167, width: 690}}>
        <Explanation
          step="06 · VERIFIED"
          title="The receipt replaces the promise."
          body="The same chat now carries the real consignment and a verified payment card. Network observation and proof checks are complete; confirmation is reported separately."
          receipt="BOB → CAROL · TX 6d85895f…ef49aa"
        />
      </div>
    </AbsoluteFill>
  );
};

const Coda = () => {
  const frame = useCurrentFrame();
  const pulse = (Math.sin(frame / 12) + 1) / 2;
  return (
    <AbsoluteFill style={{opacity: ramp(frame, 0, 14)}}>
      <Header mode="SEND · RECEIVE · RETURN" />
      <div style={{position: 'absolute', left: 93, top: 91}}>
        <Phone label="Bob" width={260} height={565}><SourceVideo src={bobSend} fromSeconds={224} /></Phone>
      </div>
      <div style={{position: 'absolute', right: 93, top: 91}}>
        <Phone label="Carol" width={260} height={565}><SourceVideo src={carolLive} fromSeconds={323} /></Phone>
      </div>
      <div style={{position: 'absolute', left: 410, top: 235, width: 460, textAlign: 'center'}}>
        <div style={{fontFamily: MONO, color: C.orange, fontSize: 15, letterSpacing: 2.5}}>OPENCSV TEST USD</div>
        <h1 style={{fontSize: 49, lineHeight: 1, margin: '17px 0'}}>Dollars move<br />inside Signal.</h1>
        <p style={{fontSize: 18, lineHeight: 1.4, color: C.muted}}>Real simulator UI. Real signet anchors.<br />Test assets with no monetary value.</p>
        <div style={{margin: '34px auto 0', width: 300, height: 2, background: C.border, position: 'relative'}}>
          <div style={{position: 'absolute', left: `${pulse * 274}px`, top: -6, width: 14, height: 14, borderRadius: 7, background: C.blue, boxShadow: '0 0 18px rgba(88,166,255,.8)'}} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const MessageFlow = () => (
  <AbsoluteFill style={{background: `radial-gradient(circle at 50% 48%, rgba(88,166,255,.09), transparent 38%), ${C.bg}`, color: C.fg, fontFamily: SANS, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 0, opacity: 0.14, backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`, backgroundSize: '48px 48px'}} />
    <Sequence durationInFrames={ONE_PHONE}><OnePhone /></Sequence>
    <Sequence from={ONE_PHONE} durationInFrames={BRIDGE}><TwoPhones /></Sequence>
    <Sequence from={ONE_PHONE + BRIDGE} durationInFrames={VERIFIED}><Verified /></Sequence>
    <Sequence from={ONE_PHONE + BRIDGE + VERIFIED} durationInFrames={CODA}><Coda /></Sequence>
  </AbsoluteFill>
);
