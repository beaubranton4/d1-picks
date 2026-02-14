import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface AnimatedTextProps {
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number | string;
  style?: React.CSSProperties;
  animationType?: 'fadeUp' | 'fadeIn' | 'scaleIn' | 'slideRight';
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  delay = 0,
  fontSize = 48,
  color = '#ffffff',
  fontWeight = 'normal',
  style = {},
  animationType = 'fadeUp',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 0.5,
    },
  });

  let transform = 'none';
  let opacity = progress;

  switch (animationType) {
    case 'fadeUp':
      transform = `translateY(${interpolate(progress, [0, 1], [30, 0])}px)`;
      break;
    case 'scaleIn':
      transform = `scale(${interpolate(progress, [0, 1], [0.8, 1])})`;
      break;
    case 'slideRight':
      transform = `translateX(${interpolate(progress, [0, 1], [-50, 0])}px)`;
      break;
    case 'fadeIn':
    default:
      break;
  }

  return (
    <div
      style={{
        fontSize,
        color,
        fontWeight,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        opacity,
        transform,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

interface StaggeredTextProps {
  lines: string[];
  startDelay?: number;
  staggerDelay?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number | string;
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';
}

export const StaggeredText: React.FC<StaggeredTextProps> = ({
  lines,
  startDelay = 0,
  staggerDelay = 5,
  fontSize = 48,
  color = '#ffffff',
  fontWeight = 'normal',
  lineHeight = 1.4,
  align = 'center',
}) => {
  return (
    <div style={{ textAlign: align }}>
      {lines.map((line, index) => (
        <AnimatedText
          key={index}
          text={line}
          delay={startDelay + index * staggerDelay}
          fontSize={fontSize}
          color={color}
          fontWeight={fontWeight}
          style={{ lineHeight }}
        />
      ))}
    </div>
  );
};
