export type BetClassification = 'STRONG BET' | 'GOOD BET' | 'WEAK BET' | 'PASS';

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
