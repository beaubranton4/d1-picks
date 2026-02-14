import React from 'react';
import { AbsoluteFill } from 'remotion';
import { colors } from '../../lib/colors';

interface BackgroundProps {
  variant?: 'default' | 'gradient';
}

export const Background: React.FC<BackgroundProps> = ({ variant = 'gradient' }) => {
  if (variant === 'gradient') {
    return (
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${colors.darker} 0%, ${colors.dark} 50%, ${colors.darker} 100%)`,
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(${colors.border}20 1px, transparent 1px),
              linear-gradient(90deg, ${colors.border}20 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
            opacity: 0.3,
          }}
        />
        {/* Blue glow accent at top */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 400,
            background: `radial-gradient(ellipse, ${colors.blue}40 0%, transparent 70%)`,
            filter: 'blur(60px)',
          }}
        />
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.dark,
      }}
    />
  );
};
