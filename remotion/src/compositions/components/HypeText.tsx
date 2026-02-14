import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from 'remotion';
import { colors } from '../../lib/colors';

interface HypeTextProps {
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * Bold text that SLAMS into view
 */
export const SlamText: React.FC<HypeTextProps> = ({
  text,
  delay = 0,
  fontSize = 72,
  color = colors.textPrimary,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slamProgress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 8,
      stiffness: 400,
      mass: 0.3,
    },
  });

  const scale = interpolate(slamProgress, [0, 1], [3, 1]);
  const opacity = interpolate(slamProgress, [0, 0.3, 1], [0, 1, 1]);

  return (
    <div
      style={{
        fontSize,
        fontWeight: 900,
        color,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: -2,
        transform: `scale(${scale})`,
        opacity,
        textShadow: '0 4px 20px rgba(0,0,0,0.5)',
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/**
 * Text that glitches/flickers in
 */
export const GlitchText: React.FC<HypeTextProps> = ({
  text,
  delay = 0,
  fontSize = 48,
  color = colors.textPrimary,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 200 },
  });

  // Glitch effect in first few frames
  const glitchPhase = frame - delay;
  const isGlitching = glitchPhase >= 0 && glitchPhase < 8;
  const glitchOffset = isGlitching ? Math.sin(glitchPhase * 5) * 5 : 0;
  const showRed = isGlitching && glitchPhase % 3 === 0;
  const showCyan = isGlitching && glitchPhase % 3 === 1;

  return (
    <div style={{ position: 'relative', ...style }}>
      {/* Cyan shadow layer */}
      {showCyan && (
        <div
          style={{
            position: 'absolute',
            fontSize,
            fontWeight: 800,
            color: '#00ffff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transform: `translateX(-3px)`,
            opacity: 0.7,
          }}
        >
          {text}
        </div>
      )}
      {/* Red shadow layer */}
      {showRed && (
        <div
          style={{
            position: 'absolute',
            fontSize,
            fontWeight: 800,
            color: '#ff0040',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transform: `translateX(3px)`,
            opacity: 0.7,
          }}
        >
          {text}
        </div>
      )}
      {/* Main text */}
      <div
        style={{
          fontSize,
          fontWeight: 800,
          color,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transform: `translateX(${glitchOffset}px)`,
          opacity: progress,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/**
 * Pulsing/breathing text for emphasis
 */
export const PulseText: React.FC<HypeTextProps> = ({
  text,
  delay = 0,
  fontSize = 48,
  color = colors.blue,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 200 },
  });

  // Continuous pulse after entry
  const pulseFrame = Math.max(0, frame - delay - 10);
  const pulse = 1 + Math.sin(pulseFrame * 0.15) * 0.05;

  return (
    <div
      style={{
        fontSize,
        fontWeight: 700,
        color,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transform: `scale(${enterProgress * pulse})`,
        opacity: enterProgress,
        textShadow: `0 0 30px ${color}80`,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/**
 * Typewriter effect text
 */
export const TypewriterText: React.FC<HypeTextProps & { charsPerFrame?: number }> = ({
  text,
  delay = 0,
  fontSize = 36,
  color = colors.textPrimary,
  charsPerFrame = 0.5,
  style = {},
}) => {
  const frame = useCurrentFrame();

  const activeFrame = Math.max(0, frame - delay);
  const charsToShow = Math.floor(activeFrame * charsPerFrame);
  const displayText = text.substring(0, charsToShow);

  const showCursor = activeFrame % 10 < 5 && charsToShow < text.length;

  return (
    <div
      style={{
        fontSize,
        fontWeight: 500,
        color,
        fontFamily: 'monospace',
        ...style,
      }}
    >
      {displayText}
      {showCursor && <span style={{ opacity: 1 }}>|</span>}
    </div>
  );
};

/**
 * Counting number animation
 */
export const CountingNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  delay?: number;
  duration?: number;
  fontSize?: number;
  color?: string;
}> = ({
  value,
  prefix = '',
  suffix = '',
  delay = 0,
  duration = 20,
  fontSize = 72,
  color = colors.blue,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(
    frame - delay,
    [0, duration],
    [0, 1],
    { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
  );

  const currentValue = Math.round(value * progress);

  const enterScale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 200 },
  });

  return (
    <div
      style={{
        fontSize,
        fontWeight: 900,
        color,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        transform: `scale(${enterScale})`,
        textShadow: `0 0 40px ${color}60`,
      }}
    >
      {prefix}{currentValue}{suffix}
    </div>
  );
};

/**
 * Flash/strobe overlay effect
 */
export const FlashOverlay: React.FC<{ frame: number; triggerFrame: number }> = ({
  frame,
  triggerFrame,
}) => {
  const delta = frame - triggerFrame;
  if (delta < 0 || delta > 4) return null;

  const opacity = interpolate(delta, [0, 4], [0.8, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#ffffff',
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
};
