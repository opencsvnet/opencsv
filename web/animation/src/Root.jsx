import React from 'react';
import {Composition, Series} from 'remotion';
import {Mint} from './Mint';
import {Anchor} from './Anchor';
import {Gossip} from './Gossip';
import {Scan} from './Scan';
import {Batch} from './Batch';
import {Trust} from './Trust';

const SCENE = 400; // 13.3s per scene at 30fps → 80s total

export const RemotionRoot = () => (
  <Composition
    id="OpenCSV-E2E"
    width={1280}
    height={720}
    fps={30}
    durationInFrames={SCENE * 6}
    component={() => (
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
    )}
  />
);
