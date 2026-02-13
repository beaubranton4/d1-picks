import type { PickLabel } from '../types';

export type BetClassification = 'STRONG BET' | 'GOOD BET' | 'WEAK BET' | 'PASS';

/**
 * Calculate AI Score from edge percentage
 *
 * Formula: 5 + (edge * 50)
 * - 0% edge = 5.0 (neutral)
 * - 2% edge = 6.0 (minimum shown)
 * - 5% edge = 7.5 (good)
 * - 7% edge = 8.5 (strong)
 * - 10%+ edge = 10.0 (max)
 */
export function calculateAIScore(adjustedEdge: number): number {
  const score = 5 + (adjustedEdge * 50);
  return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
}

/**
 * Get pick label based on AI Score
 *
 * - 9-10: D1 PICK (top pick, strong value)
 * - 7-8: SMART BET (good value)
 * - 5-6: LEAN (worth considering)
 * - 1-4: PASS (no value, don't show)
 */
export function getPickLabel(aiScore: number): PickLabel {
  if (aiScore >= 8.5) {
    return 'D1 PICK';
  } else if (aiScore >= 7) {
    return 'SMART BET';
  } else if (aiScore >= 5) {
    return 'LEAN';
  } else {
    return 'PASS';
  }
}

/**
 * @deprecated Use getPickLabel instead
 */
export function classifyBet(adjustedEdge: number): BetClassification {
  if (adjustedEdge >= 0.07) {
    return 'STRONG BET';
  } else if (adjustedEdge >= 0.05) {
    return 'GOOD BET';
  } else if (adjustedEdge >= 0.03) {
    return 'WEAK BET';
  } else {
    return 'PASS';
  }
}
