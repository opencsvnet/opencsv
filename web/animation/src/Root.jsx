import React from 'react';
import {Composition, Series} from 'remotion';
import {Mint} from './Mint';
import {Anchor} from './Anchor';
import {Gossip} from './Gossip';
import {Scan} from './Scan';
import {Batch} from './Batch';
import {Trust} from './Trust';
import {T1} from './formals/T1';
import {T2} from './formals/T2';
import {T3} from './formals/T3';
import {T4} from './formals/T4';
import {ScanSoundness} from './formals/ScanSoundness';
import {SignalWallet} from './SignalWallet';
import {ScaleVideo, SCALE_DURATION} from './Scale';
import {ConsumerUsd, CONSUMER_USD_DURATION} from './ConsumerUsd';
import {MessageFlow, MESSAGE_FLOW_DURATION} from './MessageFlow';

const SCENE = 400; // 13.3s per scene at 30fps → 80s total

const E2E = () => (
  <Series>
    <Series.Sequence durationInFrames={SCENE}>
      <Mint />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE}>
      <Anchor />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE}>
      <Gossip />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE}>
      <Scan />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE}>
      <Batch />
    </Series.Sequence>
    <Series.Sequence durationInFrames={SCENE}>
      <Trust />
    </Series.Sequence>
  </Series>
);

const FORMALS = [
  {id: 'T1-inflation', component: T1, durationInFrames: 750},
  {id: 'T2-conservation', component: T2, durationInFrames: 720},
  {id: 'T3-nullifiers', component: T3, durationInFrames: 840},
  {id: 'T4-receiver', component: T4, durationInFrames: 720},
  {id: 'Scan-soundness', component: ScanSoundness, durationInFrames: 780},
];

export const RemotionRoot = () => (
  <>
    <Composition
      id="OpenCSV-E2E"
      width={1280}
      height={720}
      fps={30}
      durationInFrames={SCENE * 6}
      component={E2E}
    />
    <Composition
      id="Signal-Wallet"
      width={1280}
      height={720}
      fps={30}
      durationInFrames={1203}
      component={SignalWallet}
    />
    <Composition
      id="Consumer-USD"
      width={1280}
      height={720}
      fps={30}
      durationInFrames={CONSUMER_USD_DURATION}
      component={ConsumerUsd}
    />
    <Composition
      id="Signal-Message-Flow"
      width={1280}
      height={720}
      fps={30}
      durationInFrames={MESSAGE_FLOW_DURATION}
      component={MessageFlow}
    />
    <Composition
      id="Bitcoin-Performance"
      width={1280}
      height={720}
      fps={30}
      durationInFrames={SCALE_DURATION}
      component={ScaleVideo}
    />
    {FORMALS.map((f) => (
      <Composition
        key={f.id}
        id={f.id}
        width={1280}
        height={720}
        fps={30}
        durationInFrames={f.durationInFrames}
        component={f.component}
      />
    ))}
  </>
);
