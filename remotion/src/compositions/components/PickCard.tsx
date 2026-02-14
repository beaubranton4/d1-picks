import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { colors, formatMoneyline, formatUnits } from '../../lib/colors';
import type { ManualPick } from '../../lib/types';

interface PickCardProps {
  pick: ManualPick;
  delay?: number;
  index?: number;
}

export const PickCard: React.FC<PickCardProps> = ({ pick, delay = 0, index = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelColors = colors.pickColors[pick.pickLabel] || colors.pickColors['PASS'];

  // Card entrance animation
  const cardProgress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 0.5,
    },
  });

  // Badge pop animation
  const badgeProgress = spring({
    frame: frame - delay - 5,
    fps,
    config: {
      damping: 15,
      stiffness: 300,
      mass: 0.3,
    },
  });

  const opacity = cardProgress;
  const translateY = interpolate(cardProgress, [0, 1], [50, 0]);
  const badgeScale = interpolate(badgeProgress, [0, 1], [0.5, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        backgroundColor: colors.card,
        borderRadius: 20,
        border: `2px solid ${colors.border}`,
        padding: 40,
        marginBottom: 30,
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4)`,
      }}
    >
      {/* Pick Label Badge */}
      <div
        style={{
          display: 'inline-block',
          backgroundColor: labelColors.bg,
          border: `2px solid ${labelColors.border}`,
          borderRadius: 8,
          padding: '8px 16px',
          marginBottom: 20,
          transform: `scale(${badgeScale})`,
        }}
      >
        <span
          style={{
            color: labelColors.text,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 1,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {pick.pickLabel}
        </span>
      </div>

      {/* Team vs Opponent */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            color: colors.textPrimary,
            fontSize: 42,
            fontWeight: 700,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            marginBottom: 8,
          }}
        >
          {pick.team}
        </div>
        <div
          style={{
            color: colors.textSecondary,
            fontSize: 28,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          vs {pick.opponent}
        </div>
      </div>

      {/* Moneyline and Units Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: `1px solid ${colors.border}`,
          paddingTop: 20,
        }}
      >
        <div>
          <div
            style={{
              color: colors.blue,
              fontSize: 52,
              fontWeight: 800,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {formatMoneyline(pick.moneyline)}
          </div>
          <div
            style={{
              color: colors.textMuted,
              fontSize: 20,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {pick.sportsbook}
          </div>
        </div>

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
              fontWeight: 600,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {formatUnits(pick.units)}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact pick card for showing multiple picks
 */
export const CompactPickCard: React.FC<PickCardProps> = ({ pick, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelColors = colors.pickColors[pick.pickLabel] || colors.pickColors['PASS'];

  const cardProgress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 200,
      stiffness: 120,
      mass: 0.4,
    },
  });

  const opacity = cardProgress;
  const translateX = interpolate(cardProgress, [0, 1], [-80, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${translateX}px)`,
        backgroundColor: colors.card,
        borderRadius: 16,
        border: `2px solid ${labelColors.border}`,
        padding: 28,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left: Label + Team */}
      <div>
        <div
          style={{
            color: labelColors.text,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 1,
            marginBottom: 6,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {pick.pickLabel}
        </div>
        <div
          style={{
            color: colors.textPrimary,
            fontSize: 32,
            fontWeight: 700,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {pick.team}
        </div>
        <div
          style={{
            color: colors.textSecondary,
            fontSize: 20,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          vs {pick.opponent}
        </div>
      </div>

      {/* Right: Moneyline + Units */}
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            color: colors.blue,
            fontSize: 40,
            fontWeight: 800,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {formatMoneyline(pick.moneyline)}
        </div>
        <div
          style={{
            color: colors.textMuted,
            fontSize: 18,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {formatUnits(pick.units)}
        </div>
      </div>
    </div>
  );
};
