import React from 'react';
import { Composition } from 'remotion';
import { DailyPicksVideo } from './compositions/DailyPicksVideo';
import { SinglePickVideo } from './compositions/SinglePickVideo';
import type { ManualPick } from './lib/types';

// TikTok vertical format
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;

// Default props for previewing in studio
const defaultPicks: ManualPick[] = [
  {
    id: 'pick-1',
    team: 'Texas Tech',
    opponent: 'Vanderbilt',
    moneyline: 135,
    sportsbook: 'DraftKings',
    pickLabel: 'D1 PICK',
    units: 2,
    analysis: 'Opening Day special. The Red Raiders are getting plus money against preseason darling Vanderbilt.',
  },
  {
    id: 'pick-2',
    team: 'Oklahoma',
    opponent: 'Oklahoma State',
    moneyline: -125,
    sportsbook: 'FanDuel',
    pickLabel: 'SMART BET',
    units: 1,
    analysis: 'Bedlam in Norman. The Sooners are at home with clear pitching advantage.',
  },
  {
    id: 'pick-3',
    team: 'TCU',
    opponent: 'Arkansas',
    moneyline: 110,
    sportsbook: 'BetMGM',
    pickLabel: 'LEAN',
    units: 1,
    analysis: 'TCU is preseason #10 for a reason. Getting plus money against Arkansas feels like value.',
  },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DailyPicksVideo"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={DailyPicksVideo as React.FC<any>}
        durationInFrames={FPS * 20} // 20 seconds
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          picks: defaultPicks,
          date: '2026-02-14',
        }}
      />
      <Composition
        id="SinglePickVideo"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SinglePickVideo as React.FC<any>}
        durationInFrames={FPS * 10} // 10 seconds
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          pick: defaultPicks[0],
          date: '2026-02-14',
        }}
      />
    </>
  );
};
