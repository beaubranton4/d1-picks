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

export type PickLabel = 'D1 PICK' | 'SMART BET' | 'LEAN' | 'PASS';

export interface BetEdge {
  team: string;
  sportsbook: string;
  moneyline: number;
  modelProb: number;
  impliedProb: number;
  rawEdge: number;
  adjustedEdge: number;
  aiScore: number;
  pickLabel: PickLabel;
  classification: 'STRONG BET' | 'GOOD BET' | 'WEAK BET' | 'PASS'; // deprecated, kept for compatibility
  modifierReason: string | null;
}

export interface GameWithEdges extends Game {
  edges: BetEdge[];
  odds?: OddsEntry[]; // Raw odds for games without predictions
}

export type TeamMappings = Record<string, string[]>;

export interface ManualPick {
  id: string;
  team: string;
  opponent: string;
  moneyline: number;
  sportsbook: string;
  pickLabel: PickLabel;
  units: number;
  analysis: string;
}

export interface DailyPicks {
  date: string;
  picks: ManualPick[];
}
