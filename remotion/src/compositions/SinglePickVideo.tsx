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
import { PickCard } from './components/PickCard';
import { colors, formatMoneyline } from '../lib/colors';
import type { ManualPick } from '../lib/types';

export interface SinglePickVideoProps {
  pick: ManualPick;
  date: string;
}

export const SinglePickVideo: React.FC<SinglePickVideoProps> = ({ pick, date }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const labelColors = colors.pickColors[pick.pickLabel] || colors.pickColors['PASS'];

  // Timing
  const hookEnd = fps * 2.5; // 2.5 seconds for hook
  const pickRevealStart = fps * 2;
  const analysisStart = fps * 5;
  const ctaStart = durationInFrames - fps * 2.5;

  // Hook animation - attention grabber
  const hookPulse = spring({
    frame: frame % 30, // Repeat every second
    fps,
    config: { damping: 10, stiffness: 400, mass: 0.3 },
  });

  return (
    <AbsoluteFill>
      <Background />

      {/* Hook Section - "We like..." */}
      <Sequence from={0} durationInFrames={hookEnd}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 60,
          }}
        >
          <AnimatedText
            text="We like..."
            delay={0}
            fontSize={48}
            color={colors.textSecondary}
            animationType="fadeIn"
          />
          <div
            style={{
              marginTop: 40,
              transform: `scale(${interpolate(hookPulse, [0, 1], [0.98, 1.02])})`,
            }}
          >
            <AnimatedText
              text={pick.team}
              delay={15}
              fontSize={72}
              color={colors.textPrimary}
              fontWeight={800}
              animationType="scaleIn"
            />
          </div>
          <AnimatedText
            text={formatMoneyline(pick.moneyline)}
            delay={25}
            fontSize={96}
            color={colors.blue}
            fontWeight={900}
            animationType="fadeUp"
            style={{ marginTop: 20 }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Pick Reveal Section */}
      <Sequence from={pickRevealStart} durationInFrames={durationInFrames - pickRevealStart - fps * 2}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 50,
          }}
        >
          {/* Label badge at top */}
          <div style={{ position: 'absolute', top: 120 }}>
            <div
              style={{
                backgroundColor: labelColors.bg,
                border: `3px solid ${labelColors.border}`,
                borderRadius: 12,
                padding: '12px 32px',
              }}
            >
              <AnimatedText
                text={pick.pickLabel}
                delay={0}
                fontSize={32}
                color={labelColors.text}
                fontWeight={800}
                style={{ letterSpacing: 2 }}
                animationType="scaleIn"
              />
            </div>
          </div>

          {/* Full pick card */}
          <div style={{ width: '100%', marginTop: 100 }}>
            <PickCard pick={pick} delay={10} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Analysis overlay - appears mid-video */}
      <Sequence from={analysisStart} durationInFrames={durationInFrames - analysisStart - fps * 3}>
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            padding: 50,
            paddingBottom: 250,
          }}
        >
          <div
            style={{
              backgroundColor: `${colors.darker}ee`,
              borderRadius: 16,
              padding: 30,
              borderLeft: `4px solid ${colors.blue}`,
            }}
          >
            <AnimatedText
              text="Why we like it:"
              delay={0}
              fontSize={22}
              color={colors.textMuted}
              fontWeight={600}
              animationType="fadeIn"
              style={{ marginBottom: 12 }}
            />
            <div
              style={{
                color: colors.textSecondary,
                fontSize: 24,
                lineHeight: 1.5,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {pick.analysis.length > 150
                ? pick.analysis.substring(0, 150) + '...'
                : pick.analysis}
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* CTA Section */}
      <Sequence from={ctaStart}>
        <AbsoluteFill
          style={{
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingBottom: 180,
          }}
        >
          <AnimatedText
            text="More picks daily"
            delay={0}
            fontSize={32}
            color={colors.textSecondary}
            animationType="fadeUp"
            style={{ marginBottom: 16 }}
          />
          <AnimatedText
            text="@d1sportpicks"
            delay={8}
            fontSize={52}
            color={colors.blue}
            fontWeight={700}
            animationType="scaleIn"
          />
        </AbsoluteFill>
      </Sequence>

      {/* Persistent watermark */}
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
