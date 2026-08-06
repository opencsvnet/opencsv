import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {SANS} from './lib';

export const CONSUMER_USD_DURATION = 720;

const SIGNAL_BLUE = '#2c6bed';
const SIGNAL_NAVY = '#17223b';
const CHAT_BG = '#f4f5f8';
const TEXT = '#111827';
const MUTED = '#6b7280';

const fade = (frame, from, to) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const pop = (frame, fps, at) =>
  spring({
    frame: frame - at,
    fps,
    config: {damping: 18, stiffness: 180, mass: 0.65},
  });

const Avatar = ({name, color}) => (
  <div
    style={{
      width: 38,
      height: 38,
      borderRadius: 19,
      background: color,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 15,
      fontWeight: 750,
      flex: '0 0 auto',
    }}
  >
    {name.slice(0, 1)}
  </div>
);

const PaymentCard = ({amount, direction, at, deliveredAt, frame, fps}) => {
  const scale = pop(frame, fps, at);
  const incoming = direction === 'incoming';
  const status = incoming
    ? 'Received'
    : frame < deliveredAt - 24
      ? 'Sending…'
      : frame < deliveredAt
        ? 'Sent'
        : 'Delivered';

  return (
    <div
      style={{
        alignSelf: incoming ? 'flex-start' : 'flex-end',
        width: 206,
        borderRadius: 20,
        padding: '15px 16px 13px',
        background: incoming ? '#fff' : SIGNAL_BLUE,
        color: incoming ? TEXT : '#fff',
        border: incoming ? '1px solid #e1e4ea' : '1px solid rgba(255,255,255,.16)',
        boxShadow: '0 7px 22px rgba(17,24,39,.11)',
        opacity: Math.min(1, scale),
        transform: `scale(${Math.max(0, scale)})`,
        transformOrigin: incoming ? 'bottom left' : 'bottom right',
      }}
    >
      <div style={{fontSize: 31, lineHeight: 1, fontWeight: 760, letterSpacing: -1}}>
        ${amount}.00
      </div>
      <div style={{fontSize: 12, marginTop: 7, opacity: 0.78}}>Test USD</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 13,
          paddingTop: 10,
          borderTop: `1px solid ${incoming ? '#e8eaf0' : 'rgba(255,255,255,.24)'}`,
          fontSize: 12,
          fontWeight: 650,
        }}
      >
        <span
          style={{
            width: 17,
            height: 17,
            borderRadius: 9,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: incoming ? '#e9f7ef' : 'rgba(255,255,255,.2)',
            color: incoming ? '#16854b' : '#fff',
            fontSize: 11,
          }}
        >
          ✓
        </span>
        {status}
      </div>
    </div>
  );
};

const SendSheet = ({amount, recipient, from, to, frame}) => {
  const visible = fade(frame, from, from + 12) * (1 - fade(frame, to - 10, to));
  const typed = Math.round(
    interpolate(frame, [from + 18, from + 62], [0, amount], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const pressed = frame >= to - 24;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 5,
        background: 'rgba(23,34,59,.18)',
        display: 'flex',
        alignItems: 'flex-end',
        opacity: visible,
      }}
    >
      <div
        style={{
          width: '100%',
          height: 336,
          borderRadius: '28px 28px 0 0',
          background: '#fff',
          padding: '22px 20px 20px',
          textAlign: 'center',
          transform: `translateY(${(1 - visible) * 36}px)`,
          boxShadow: '0 -12px 35px rgba(17,24,39,.13)',
        }}
      >
        <div style={{fontSize: 15, fontWeight: 720}}>Send dollars</div>
        <div style={{fontSize: 13, color: MUTED, marginTop: 4}}>to {recipient}</div>
        <div style={{fontSize: 54, lineHeight: 1, fontWeight: 760, letterSpacing: -2, marginTop: 38}}>
          ${typed}.00
        </div>
        <div style={{fontSize: 13, color: MUTED, marginTop: 9}}>Test USD</div>
        <div
          style={{
            height: 48,
            borderRadius: 24,
            marginTop: 38,
            background: pressed ? '#1f55c8' : SIGNAL_BLUE,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 720,
            transform: `scale(${pressed ? 0.97 : 1})`,
          }}
        >
          Send ${amount}.00
        </div>
      </div>
    </div>
  );
};

const ConversationPhone = ({owner, contact, accent, x, outgoing, incoming, sheet, frame, fps}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: 82,
      width: 320,
      height: 588,
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: -37,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#cbd5e1',
        fontSize: 13,
        fontWeight: 750,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
      }}
    >
      {owner}&apos;s Signal
    </div>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 45,
        padding: 9,
        background: '#080b12',
        border: '1px solid rgba(255,255,255,.16)',
        boxShadow: '0 28px 70px rgba(0,0,0,.42)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 37,
          overflow: 'hidden',
          background: CHAT_BG,
          color: TEXT,
        }}
      >
        <div
          style={{
            height: 27,
            padding: '8px 18px 0',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            fontWeight: 650,
            background: '#fff',
          }}
        >
          <span>9:41</span>
          <span>●●●</span>
        </div>
        <div
          style={{
            height: 66,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            background: '#fff',
            borderBottom: '1px solid #e7e9ef',
          }}
        >
          <span style={{fontSize: 25, color: SIGNAL_BLUE}}>‹</span>
          <Avatar name={contact} color={accent} />
          <div>
            <div style={{fontSize: 15, fontWeight: 740}}>{contact}</div>
            <div style={{fontSize: 11, color: MUTED}}>Signal message</div>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: 13,
            right: 13,
            top: 107,
            bottom: 62,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          {owner === 'Bob' && incoming ? (
            <PaymentCard {...incoming} direction="incoming" frame={frame} fps={fps} />
          ) : null}
          {owner === 'Carol' && outgoing ? (
            <PaymentCard {...outgoing} direction="outgoing" frame={frame} fps={fps} />
          ) : null}
          {owner === 'Carol' && incoming ? (
            <PaymentCard {...incoming} direction="incoming" frame={frame} fps={fps} />
          ) : null}
          {owner === 'Bob' && outgoing ? (
            <PaymentCard {...outgoing} direction="outgoing" frame={frame} fps={fps} />
          ) : null}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 11,
            height: 42,
            borderRadius: 22,
            background: '#fff',
            border: '1px solid #dde1e8',
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            color: '#9ca3af',
            fontSize: 13,
          }}
        >
          Message {contact}
          <span
            style={{
              marginLeft: 'auto',
              width: 27,
              height: 27,
              borderRadius: 14,
              background: SIGNAL_BLUE,
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 760,
            }}
          >
            $
          </span>
        </div>

        {sheet ? <SendSheet {...sheet} frame={frame} /> : null}
      </div>
    </div>
  </div>
);

const TransferCue = ({amount, direction, from, to, frame}) => {
  const opacity = fade(frame, from, from + 12) * (1 - fade(frame, to - 12, to));
  const y = interpolate(frame, [from, to], [10, -10], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 520,
        top: 310,
        width: 240,
        textAlign: 'center',
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{fontSize: 38, fontWeight: 780, letterSpacing: -1}}>${amount}.00</div>
      <div style={{fontSize: 50, color: '#7aa2ff', lineHeight: 1.1}}>{direction === 'right' ? '→' : '←'}</div>
      <div style={{fontSize: 13, color: '#94a3b8'}}>Test USD</div>
    </div>
  );
};

export const ConsumerUsd = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const introOpacity = 1 - fade(frame, 55, 75);
  const finalOpacity = fade(frame, 600, 630);

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(circle at 50% 42%, #22345c 0%, #111a2e 42%, #090e1a 100%)',
        color: '#fff',
        fontFamily: SANS,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 34,
          fontSize: 16,
          fontWeight: 760,
          letterSpacing: 0.4,
        }}
      >
        OPEN<span style={{color: '#f7931a'}}>CSV</span> × SIGNAL
      </div>
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 32,
          padding: '6px 10px',
          borderRadius: 99,
          border: '1px solid rgba(255,255,255,.2)',
          color: '#94a3b8',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.9,
        }}
      >
        PRODUCT ANIMATION · TEST USD · SIGNET
      </div>

      <ConversationPhone
        owner="Carol"
        contact="Bob"
        accent="#7c6cf2"
        x={100}
        frame={frame}
        fps={fps}
        sheet={{amount: 25, recipient: 'Bob', from: 74, to: 190}}
        outgoing={{amount: 25, at: 184, deliveredAt: 285}}
        incoming={{amount: 10, at: 520, deliveredAt: 548}}
      />
      <ConversationPhone
        owner="Bob"
        contact="Carol"
        accent="#e36f8e"
        x={860}
        frame={frame}
        fps={fps}
        sheet={{amount: 10, recipient: 'Carol', from: 350, to: 470}}
        incoming={{amount: 25, at: 248, deliveredAt: 270}}
        outgoing={{amount: 10, at: 464, deliveredAt: 550}}
      />

      <div
        style={{
          position: 'absolute',
          left: 455,
          top: 142,
          width: 370,
          textAlign: 'center',
          opacity: introOpacity,
        }}
      >
        <div style={{fontSize: 43, lineHeight: 1.06, fontWeight: 790, letterSpacing: -1.6}}>
          Send dollars<br />in Signal
        </div>
        <div style={{fontSize: 17, color: '#a7b3c8', marginTop: 16}}>As simple as sending a message.</div>
      </div>

      <TransferCue amount={25} direction="right" from={185} to={330} frame={frame} />
      <TransferCue amount={10} direction="left" from={465} to={590} frame={frame} />

      <div
        style={{
          position: 'absolute',
          left: 455,
          top: 205,
          width: 370,
          textAlign: 'center',
          opacity: finalOpacity,
        }}
      >
        <div style={{fontSize: 48, fontWeight: 800, letterSpacing: -1.7}}>Done.</div>
        <div style={{fontSize: 20, color: '#cbd5e1', marginTop: 13, lineHeight: 1.35}}>
          Carol paid Bob.<br />Bob paid Carol back.
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 11,
          textAlign: 'center',
          color: '#7f8ba1',
          fontSize: 11,
          letterSpacing: 0.2,
        }}
      >
        Test USD on Bitcoin signet · no monetary or redemption value
      </div>
    </AbsoluteFill>
  );
};
