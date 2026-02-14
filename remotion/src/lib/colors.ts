/**
 * MLB Theme Colors - ported from tailwind.config.js
 */
export const colors = {
  // Background colors
  dark: '#1a1a1a',
  darker: '#0f0f0f',
  card: '#282828',
  cardHover: '#333333',
  border: '#444d58',

  // Accent colors
  blue: '#0062e3',
  blueHover: '#2c7df8',

  // Text colors
  textPrimary: '#ffffff',
  textSecondary: '#acb3bc',
  textMuted: '#8a8a8a',

  // Pick label colors
  pickColors: {
    'D1 PICK': {
      bg: 'rgba(34, 197, 94, 0.3)', // green-500/30
      border: '#22c55e', // green-500
      text: '#4ade80', // green-400
    },
    'SMART BET': {
      bg: 'rgba(0, 98, 227, 0.3)', // mlb-blue/30
      border: '#0062e3', // mlb-blue
      text: '#2c7df8', // mlb-blueHover
    },
    'LEAN': {
      bg: 'rgba(234, 179, 8, 0.3)', // yellow-500/30
      border: '#eab308', // yellow-500
      text: '#facc15', // yellow-400
    },
    'PASS': {
      bg: 'rgba(138, 138, 138, 0.3)',
      border: '#8a8a8a',
      text: '#acb3bc',
    },
  },
} as const;

export type PickLabel = keyof typeof colors.pickColors;

/**
 * Format moneyline with +/- prefix
 */
export function formatMoneyline(ml: number): string {
  return ml > 0 ? `+${ml}` : `${ml}`;
}

/**
 * Format units display
 */
export function formatUnits(units: number): string {
  return units === 1 ? '1 unit' : `${units} units`;
}
