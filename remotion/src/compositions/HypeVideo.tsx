import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  Sequence,
  staticFile,
} from 'remotion';
import { Background } from './components/Background';
import { SlamText, GlitchText, PulseText, CountingNumber, FlashOverlay } from './components/HypeText';
import { colors, formatMoneyline, formatUnits } from '../lib/colors';
import { formatDisplayDate } from '../lib/data';
import { getRandomCTA, getQuickAnalysis } from '../lib/hooks';
import type { ManualPick } from '../lib/types';

export interface HypeVideoProps {
  picks: ManualPick[];
  date: string;
  hook: {
    text: string;
    subtext?: string;
  };
  screenshotPath?: string; // Path to website screenshot
}

export const HypeVideo: React.FC<HypeVideoProps> = ({
  picks,
  date,
  hook,
  screenshotPath,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const cta = getRandomCTA();

  // Timing (in frames) - fast-paced TikTok style
  const hookDuration = fps * 2.5; // 2.5s hook
  const pickRevealStart = fps * 2;
  const pickDuration = fps * 3; // 3s per pick
  const websiteShowStart = fps * 2 + picks.length * pickDuration;
  const ctaStart = durationInFrames - fps * 3;

  return (
    <AbsoluteFill>
      <Background variant="gradient" />

      {/* HOOK SECTION - First 2.5 seconds */}
      <Sequence from={0} durationInFrames={hookDuration}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 50,
          }}
        >
          {/* Flash on entry */}
          <FlashOverlay frame={frame} triggerFrame={0} />

          {/* Main hook text */}
          <SlamText
            text={hook.text}
            delay={0}
            fontSize={76}
            color={colors.textPrimary}
            style={{ textAlign: 'center', marginBottom: 30 }}
          />

          {/* Subtext */}
          {hook.subtext && (
            <GlitchText
              text={hook.subtext}
              delay={15}
              fontSize={36}
              color={colors.textSecondary}
              style={{ textAlign: 'center' }}
            />
          )}

          {/* Pick count badge */}
          <div
            style={{
              marginTop: 60,
              opacity: interpolate(frame, [30, 45], [0, 1], { extrapolateRight: 'clamp' }),
              transform: `scale(${interpolate(frame, [30, 45], [0.5, 1], { extrapolateRight: 'clamp' })})`,
            }}
          >
            <div
              style={{
                backgroundColor: colors.pickColors['D1 PICK'].bg,
                border: `3px solid ${colors.pickColors['D1 PICK'].border}`,
                borderRadius: 16,
                padding: '16px 40px',
              }}
            >
              <span
                style={{
                  color: colors.pickColors['D1 PICK'].text,
                  fontSize: 32,
                  fontWeight: 800,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {picks.length} PICKS TODAY
              </span>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* PICK REVEALS - Quick cuts through each pick */}
      {picks.map((pick, index) => {
        const pickStart = pickRevealStart + index * pickDuration;
        const labelColors = colors.pickColors[pick.pickLabel] || colors.pickColors['PASS'];

        return (
          <Sequence key={pick.id} from={pickStart} durationInFrames={pickDuration}>
            <AbsoluteFill
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                padding: 50,
              }}
            >
              {/* Flash on entry */}
              <FlashOverlay frame={frame} triggerFrame={pickStart} />

              {/* Pick number */}
              <div
                style={{
                  position: 'absolute',
                  top: 120,
                  opacity: interpolate(frame - pickStart, [0, 10], [0, 1], { extrapolateRight: 'clamp' }),
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    color: colors.textMuted,
                    fontWeight: 600,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    letterSpacing: 4,
                  }}
                >
                  PICK {index + 1} OF {picks.length}
                </span>
              </div>

              {/* Label badge */}
              <div
                style={{
                  marginBottom: 30,
                  transform: `scale(${spring({
                    frame: frame - pickStart - 5,
                    fps,
                    config: { damping: 10, stiffness: 300 },
                  })})`,
                }}
              >
                <div
                  style={{
                    backgroundColor: labelColors.bg,
                    border: `3px solid ${labelColors.border}`,
                    borderRadius: 12,
                    padding: '12px 32px',
                  }}
                >
                  <span
                    style={{
                      color: labelColors.text,
                      fontSize: 28,
                      fontWeight: 800,
                      letterSpacing: 2,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                  >
                    {pick.pickLabel}
                  </span>
                </div>
              </div>

              {/* Team name - SLAM in */}
              <SlamText
                text={pick.team}
                delay={10}
                fontSize={68}
                color={colors.textPrimary}
                style={{ textAlign: 'center', marginBottom: 16 }}
              />

              {/* vs Opponent */}
              <GlitchText
                text={`vs ${pick.opponent}`}
                delay={20}
                fontSize={32}
                color={colors.textSecondary}
                style={{ marginBottom: 40 }}
              />

              {/* Moneyline - Big and bold */}
              <PulseText
                text={formatMoneyline(pick.moneyline)}
                delay={25}
                fontSize={120}
                color={colors.blue}
                style={{ marginBottom: 20 }}
              />

              {/* Units + sportsbook */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  opacity: interpolate(frame - pickStart, [35, 45], [0, 1], { extrapolateRight: 'clamp' }),
                }}
              >
                <div
                  style={{
                    backgroundColor: colors.darker,
                    borderRadius: 12,
                    padding: '12px 24px',
                  }}
                >
                  <span
                    style={{
                      color: colors.textPrimary,
                      fontSize: 28,
                      fontWeight: 700,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                  >
                    {formatUnits(pick.units)}
                  </span>
                </div>
                <span
                  style={{
                    color: colors.textMuted,
                    fontSize: 24,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  on {pick.sportsbook}
                </span>
              </div>

              {/* Quick analysis */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 250,
                  left: 50,
                  right: 50,
                  opacity: interpolate(frame - pickStart, [50, 60], [0, 1], { extrapolateRight: 'clamp' }),
                }}
              >
                <div
                  style={{
                    backgroundColor: `${colors.darker}ee`,
                    borderRadius: 12,
                    padding: 24,
                    borderLeft: `4px solid ${labelColors.border}`,
                  }}
                >
                  <span
                    style={{
                      color: colors.textSecondary,
                      fontSize: 24,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      lineHeight: 1.4,
                    }}
                  >
                    {getQuickAnalysis(pick.pickLabel, pick.units)}
                  </span>
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* WEBSITE SCREENSHOT - Show the real site */}
      {screenshotPath && (
        <Sequence from={websiteShowStart} durationInFrames={fps * 3}>
          <AbsoluteFill>
            {/* Darken background */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: colors.darker,
              }}
            />

            {/* Screenshot with zoom animation */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: `scale(${interpolate(
                  frame - websiteShowStart,
                  [0, 30, fps * 3],
                  [1.2, 1, 0.9],
                  { extrapolateRight: 'clamp' }
                )})`,
                opacity: interpolate(
                  frame - websiteShowStart,
                  [0, 10, fps * 3 - 10, fps * 3],
                  [0, 1, 1, 0],
                  { extrapolateRight: 'clamp' }
                ),
              }}
            >
              <Img
                src={staticFile(screenshotPath)}
                style={{
                  width: '95%',
                  height: 'auto',
                  borderRadius: 20,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                  border: `2px solid ${colors.border}`,
                }}
              />
            </div>

            {/* Overlay text */}
            <div
              style={{
                position: 'absolute',
                bottom: 200,
                left: 0,
                right: 0,
                textAlign: 'center',
                opacity: interpolate(frame - websiteShowStart, [20, 30], [0, 1], { extrapolateRight: 'clamp' }),
              }}
            >
              <div
                style={{
                  backgroundColor: `${colors.blue}ee`,
                  display: 'inline-block',
                  padding: '16px 40px',
                  borderRadius: 12,
                }}
              >
                <span
                  style={{
                    color: colors.textPrimary,
                    fontSize: 32,
                    fontWeight: 700,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  Full analysis at d1picks.com
                </span>
              </div>
            </div>
          </AbsoluteFill>
        </Sequence>
      )}

      {/* CTA SECTION - Last 3 seconds */}
      <Sequence from={ctaStart}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 50,
          }}
        >
          {/* Flash */}
          <FlashOverlay frame={frame} triggerFrame={ctaStart} />

          {/* Main CTA */}
          <SlamText
            text={cta.main}
            delay={0}
            fontSize={48}
            color={colors.textSecondary}
            style={{ textAlign: 'center', marginBottom: 30 }}
          />

          {/* Handle */}
          <PulseText
            text={cta.handle}
            delay={15}
            fontSize={72}
            color={colors.blue}
            style={{ textAlign: 'center' }}
          />

          {/* Website */}
          <div
            style={{
              marginTop: 40,
              opacity: interpolate(frame - ctaStart, [30, 40], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <span
              style={{
                fontSize: 28,
                color: colors.textMuted,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              d1picks.com
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Persistent bottom branding */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 50,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: colors.textMuted,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            opacity: 0.5,
          }}
        >
          @d1sportpicks
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
