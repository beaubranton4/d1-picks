export interface Game {
  id: string;
  date: string;
  startTime: string;
  teamA: string;
  teamB: string;
  teamAHome: boolean;
  teamBHome: boolean;
  venueType: 'home_a' | 'home_b' | 'neutral';
  modelProbA: number;
  modelProbB: number;
  // New fields for ESPN integration
  hasPrediction: boolean;
  predictionSource: 'warren_nolan' | 'espn' | 'none';
  venue?: string;
  broadcast?: string;
  teamARank?: number;
  teamBRank?: number;
  espnGameId?: string;
}

export interface OddsEntry {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sportsbook: string;
  team: string;
  moneyline: number;
}

export interface EdgeCalculation {
  impliedProb: number;
  rawEdge: number;
  adjustedEdge: number;
  modifierReason: string | null;
}

export interface BetEdge {
  team: string;
  sportsbook: string;
  moneyline: number;
  modelProb: number;
  impliedProb: number;
  rawEdge: number;
  adjustedEdge: number;
  classification: 'STRONG BET' | 'GOOD BET' | 'WEAK BET' | 'PASS';
  modifierReason: string | null;
}

export interface GameWithEdges extends Game {
  edges: BetEdge[];
}

export type TeamMappings = Record<string, string[]>;
