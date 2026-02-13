import teamMappings from '@/data/team-mappings.json';
import type { Game, OddsEntry, GameWithEdges, BetEdge } from './types';

function normalizeTeamName(name: string): string {
  const normalized = name.toLowerCase().trim();

  // Check each canonical name's aliases
  for (const [canonical, aliases] of Object.entries(teamMappings)) {
    if (aliases.includes(normalized)) {
      return canonical;
    }
  }

  // If no match found, return normalized name
  return normalized.replace(/\s+/g, '_');
}

export function matchGamesWithOdds(
  games: Game[],
  oddsEntries: OddsEntry[]
): Array<{ game: Game; odds: OddsEntry[] }> {
  const matched: Array<{ game: Game; odds: OddsEntry[] }> = [];

  for (const game of games) {
    const gameOdds: OddsEntry[] = [];

    for (const entry of oddsEntries) {
      const normalizedHome = normalizeTeamName(entry.homeTeam);
      const normalizedAway = normalizeTeamName(entry.awayTeam);
      const normalizedEntryTeam = normalizeTeamName(entry.team);

      // Check if this odds entry matches this game
      const teamsMatch =
        (normalizedHome === game.teamA || normalizedHome === game.teamB) &&
        (normalizedAway === game.teamA || normalizedAway === game.teamB);

      if (teamsMatch) {
        gameOdds.push(entry);
      }
    }

    if (gameOdds.length > 0) {
      matched.push({ game, odds: gameOdds });
    }
  }

  return matched;
}

export function mergeGamesWithEdges(
  games: Game[],
  edges: BetEdge[]
): GameWithEdges[] {
  return games.map(game => {
    const gameEdges = edges.filter(edge => {
      // Match edges to game by team names
      const normalizedEdgeTeam = normalizeTeamName(edge.team);
      return normalizedEdgeTeam === game.teamA || normalizedEdgeTeam === game.teamB;
    });

    return {
      ...game,
      edges: gameEdges,
    };
  });
}

export { normalizeTeamName };
