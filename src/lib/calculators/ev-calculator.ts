import type { Game, OddsEntry, BetEdge, EdgeCalculation } from '../types';
import { classifyBet, calculateAIScore, getPickLabel } from './classifier';

export function moneylineToProb(moneyline: number): number {
  if (moneyline > 0) {
    return 100 / (moneyline + 100);
  } else {
    return Math.abs(moneyline) / (Math.abs(moneyline) + 100);
  }
}

export function calculateEdge(
  modelProb: number,
  moneyline: number,
  isHome: boolean,
  isNeutral: boolean
): EdgeCalculation {
  const impliedProb = moneylineToProb(moneyline);
  const rawEdge = modelProb - impliedProb;

  let modifier = 0;
  let modifierReason: string | null = null;

  if (isHome) {
    modifier = 0.005; // +0.5% for home team
    modifierReason = 'home: +0.5%';
  } else if (isNeutral) {
    modifier = 0.0025; // +0.25% for neutral site
    modifierReason = 'neutral: +0.25%';
  }

  const adjustedEdge = rawEdge + modifier;

  return { impliedProb, rawEdge, adjustedEdge, modifierReason };
}

export function calculateGameEdges(
  game: Game,
  oddsEntries: OddsEntry[]
): BetEdge[] {
  const edges: BetEdge[] = [];

  // Group odds by team
  const oddsByTeam: Record<string, OddsEntry[]> = {};

  for (const entry of oddsEntries) {
    const teamLower = entry.team.toLowerCase();
    if (!oddsByTeam[teamLower]) {
      oddsByTeam[teamLower] = [];
    }
    oddsByTeam[teamLower].push(entry);
  }

  // Calculate edges for each team
  for (const teamName of [game.teamA, game.teamB]) {
    const teamOdds = oddsByTeam[teamName] || [];

    if (teamOdds.length === 0) {
      continue;
    }

    // Find best odds (highest moneyline = best payout)
    const bestOdd = teamOdds.reduce((best, current) =>
      current.moneyline > best.moneyline ? current : best
    );

    const bestMoneyline = bestOdd.moneyline;
    const bestSportsbook = bestOdd.sportsbook;

    // Get model probability
    const modelProb = teamName === game.teamA ? game.modelProbA : game.modelProbB;
    const isHome = teamName === game.teamA ? game.teamAHome : game.teamBHome;
    const isNeutral = game.venueType === 'neutral';

    // Calculate edge
    const edgeCalc = calculateEdge(modelProb, bestMoneyline, isHome, isNeutral);

    // Calculate AI Score and labels
    const aiScore = calculateAIScore(edgeCalc.adjustedEdge);
    const pickLabel = getPickLabel(aiScore);
    const classification = classifyBet(edgeCalc.adjustedEdge); // deprecated

    const edge: BetEdge = {
      team: teamName,
      sportsbook: bestSportsbook,
      moneyline: bestMoneyline,
      modelProb,
      impliedProb: edgeCalc.impliedProb,
      rawEdge: edgeCalc.rawEdge,
      adjustedEdge: edgeCalc.adjustedEdge,
      aiScore,
      pickLabel,
      classification,
      modifierReason: edgeCalc.modifierReason,
    };

    edges.push(edge);
  }

  return edges;
}
