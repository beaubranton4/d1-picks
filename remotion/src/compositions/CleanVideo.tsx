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
import { colors, formatMoneyline } from '../lib/colors';
import { formatDisplayDate } from '../lib/data';
import type { ManualPick } from '../lib/types';

export interface CleanVideoProps {
  picks: ManualPick[];
  date: string;
  screenshotPath?: string;
}

/**
 * Clean, minimal TikTok-style video
 * - No flashy effects
 * - Soft animations
 * - Authentic/casual vibe
 * - Shows the website naturally
 */
export const CleanVideo: React.FC<CleanVideoProps> = ({
  picks,
  date,
  screenshotPath,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const displayDate = formatDisplayDate(date);

  // Soft fade helper
  const softFade = (startFrame: number, duration: number = 15) => {
    return interpolate(
      frame,
      [startFrame, startFrame + duration],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  };

  // Timing
  const introEnd = fps * 3;
  const picksDuration = picks.length * fps * 3.5;
  const ctaStart = durationInFrames - fps * 3;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>

      {/* INTRO - Clean and simple */}
      <Sequence from={0} durationInFrames={introEnd}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 60,
          }}
        >
          {/* Simple date */}
          <div
            style={{
              opacity: softFade(0),
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontSize: 24,
                color: '#666',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 500,
                letterSpacing: 2,
                textTransform: 'uppercase',
              }}
            >
              {displayDate}
            </span>
          </div>

          {/* Main intro text - casual */}
          <div
            style={{
              opacity: softFade(10),
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: 52,
                color: '#fff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 600,
                lineHeight: 1.3,
              }}
            >
              today's college baseball picks
            </span>
          </div>

          {/* Subtle pick count */}
          <div
            style={{
              opacity: softFade(25),
              marginTop: 40,
            }}
          >
            <span
              style={{
                fontSize: 20,
                color: '#888',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: 400,
              }}
            >
              {picks.length} games i like
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* PICKS - Clean cards */}
      {picks.map((pick, index) => {
        const pickStart = introEnd + index * fps * 3.5;
        const isD1Pick = pick.pickLabel === 'D1 PICK';

        // Soft accent color based on confidence
        const accentColor = isD1Pick ? '#22c55e' : pick.pickLabel === 'SMART BET' ? '#3b82f6' : '#888';

        return (
          <Sequence key={pick.id} from={pickStart} durationInFrames={fps * 3.5}>
            <AbsoluteFill
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                padding: 50,
              }}
            >
              {/* Pick number - subtle */}
              <div
                style={{
                  position: 'absolute',
                  top: 140,
                  opacity: softFade(pickStart) * 0.5,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    color: '#555',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 500,
                    letterSpacing: 3,
                  }}
                >
                  {index + 1} / {picks.length}
                </span>
              </div>

              {/* Main pick card */}
              <div
                style={{
                  opacity: softFade(pickStart + 5),
                  transform: `translateY(${interpolate(
                    frame - pickStart,
                    [5, 20],
                    [20, 0],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                  )}px)`,
                  width: '100%',
                  maxWidth: 900,
                  textAlign: 'center',
                }}
              >
                {/* "we like" indicator */}
                <div style={{ marginBottom: 24 }}>
                  <span
                    style={{
                      fontSize: 24,
                      color: '#666',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: 400,
                    }}
                  >
                    we like
                  </span>
                </div>

                {/* THE PICK - Team + Moneyline together, big and clear */}
                <div style={{ marginBottom: 20 }}>
                  <span
                    style={{
                      fontSize: 64,
                      color: '#fff',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: 700,
                    }}
                  >
                    {pick.team}
                  </span>
                  <span
                    style={{
                      fontSize: 64,
                      color: accentColor,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: 700,
                      marginLeft: 20,
                    }}
                  >
                    {formatMoneyline(pick.moneyline)}
                  </span>
                </div>

                {/* Opponent - smaller */}
                <div style={{ marginBottom: 30 }}>
                  <span
                    style={{
                      fontSize: 28,
                      color: '#555',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: 400,
                    }}
                  >
                    vs {pick.opponent}
                  </span>
                </div>

                {/* Sportsbook + confidence */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 20,
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      color: '#444',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: 400,
                    }}
                  >
                    {pick.sportsbook}
                  </span>
                  <span
                    style={{
                      fontSize: 16,
                      color: accentColor,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: 500,
                      backgroundColor: `${accentColor}15`,
                      padding: '6px 14px',
                      borderRadius: 20,
                    }}
                  >
                    {pick.units} {pick.units === 1 ? 'unit' : 'units'}
                  </span>
                </div>
              </div>

              {/* Quick analysis - conversational */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 220,
                  left: 50,
                  right: 50,
                  opacity: softFade(pickStart + 40),
                }}
              >
                <div
                  style={{
                    backgroundColor: '#111',
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      color: '#999',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      fontWeight: 400,
                      lineHeight: 1.5,
                    }}
                  >
                    {pick.analysis.length > 100
                      ? pick.analysis.substring(0, 100) + '...'
                      : pick.analysis}
                  </span>
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* WEBSITE SCREENSHOT - if provided */}
      {screenshotPath && (
        <Sequence from={introEnd + picksDuration} durationInFrames={fps * 3}>
          <AbsoluteFill
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              padding: 40,
            }}
          >
            <div
              style={{
                opacity: softFade(introEnd + picksDuration),
                transform: `scale(${interpolate(
                  frame - (introEnd + picksDuration),
                  [0, 20],
                  [0.95, 1],
                  { extrapolateRight: 'clamp' }
                )})`,
              }}
            >
              <Img
                src={staticFile(screenshotPath)}
                style={{
                  width: '100%',
                  maxWidth: 980,
                  borderRadius: 20,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}
              />
            </div>

            {/* Overlay text */}
            <div
              style={{
                position: 'absolute',
                bottom: 200,
                opacity: softFade(introEnd + picksDuration + 15),
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  color: '#888',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 400,
                }}
              >
                full breakdown at d1picks.com
              </span>
            </div>
          </AbsoluteFill>
        </Sequence>
      )}

      {/* CTA - Minimal */}
      <Sequence from={ctaStart}>
        <AbsoluteFill
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 60,
          }}
        >
          <div
            style={{
              opacity: softFade(ctaStart),
              textAlign: 'center',
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <span
                style={{
                  fontSize: 32,
                  color: '#666',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 400,
                }}
              >
                free picks daily
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span
                style={{
                  fontSize: 48,
                  color: '#fff',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 600,
                }}
              >
                @d1sportpicks
              </span>
            </div>

            <div>
              <span
                style={{
                  fontSize: 22,
                  color: '#444',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: 400,
                }}
              >
                d1picks.com
              </span>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Persistent subtle branding */}
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 50,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: 14,
            color: '#333',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 400,
          }}
        >
          d1picks.com
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
