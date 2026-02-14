import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Sequence,
} from 'remotion';
import { Background } from './components/Background';
import { AnimatedText } from './components/AnimatedText';
import { CompactPickCard } from './components/PickCard';
import { colors } from '../lib/colors';
import { formatDisplayDate } from '../lib/data';
import type { ManualPick } from '../lib/types';

export interface DailyPicksVideoProps {
  picks: ManualPick[];
  date: string;
}

export const DailyPicksVideo: React.FC<DailyPicksVideoProps> = ({ picks, date }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const displayDate = formatDisplayDate(date);

  // Timing (in frames)
  const introEnd = fps * 3; // 3 seconds
  const picksStart = fps * 2;
  const pickDuration = fps * 4; // 4 seconds per pick
  const ctaStart = durationInFrames - fps * 4; // Last 4 seconds

  // Logo pulse animation
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 200, mass: 0.5 },
  });

  return (
    <AbsoluteFill>
      <Background />

      {/* Intro Section */}
      <Sequence from={0} durationInFrames={introEnd}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 60,
          }}
        >
          {/* Logo / Brand */}
          <div
            style={{
              transform: `scale(${interpolate(logoScale, [0, 1], [0.8, 1])})`,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: colors.textPrimary,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: -2,
              }}
            >
              D1 PICKS
            </div>
          </div>

          {/* Date */}
          <AnimatedText
            text={displayDate}
            delay={10}
            fontSize={36}
            color={colors.textSecondary}
            animationType="fadeUp"
          />

          {/* Pick count */}
          <AnimatedText
            text={`${picks.length} ${picks.length === 1 ? 'Pick' : 'Picks'} Today`}
            delay={20}
            fontSize={48}
            color={colors.blue}
            fontWeight={700}
            animationType="fadeUp"
            style={{ marginTop: 20 }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Picks Section */}
      <Sequence from={picksStart} durationInFrames={durationInFrames - picksStart - fps * 3}>
        <AbsoluteFill
          style={{
            padding: 50,
            paddingTop: 100,
          }}
        >
          {/* Small header */}
          <AnimatedText
            text="TODAY'S PICKS"
            delay={0}
            fontSize={28}
            color={colors.textMuted}
            fontWeight={600}
            style={{ letterSpacing: 3, marginBottom: 30 }}
          />

          {/* Pick cards */}
          <div style={{ marginTop: 20 }}>
            {picks.map((pick, index) => (
              <CompactPickCard
                key={pick.id}
                pick={pick}
                delay={30 + index * 15} // Staggered entrance
                index={index}
              />
            ))}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* CTA Section */}
      <Sequence from={ctaStart}>
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 200,
          }}
        >
          <AnimatedText
            text="Follow for daily picks"
            delay={0}
            fontSize={36}
            color={colors.textSecondary}
            animationType="fadeUp"
            style={{ marginBottom: 20 }}
          />
          <AnimatedText
            text="@d1picks"
            delay={10}
            fontSize={56}
            color={colors.blue}
            fontWeight={700}
            animationType="scaleIn"
          />
        </AbsoluteFill>
      </Sequence>

      {/* Persistent bottom watermark */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 60,
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: colors.textMuted,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            opacity: 0.6,
          }}
        >
          d1picks.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
