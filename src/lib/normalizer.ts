import teamMappings from '@/data/team-mappings.json';
import type { Game, OddsEntry, GameWithEdges, BetEdge } from './types';
import type { ESPNGame } from './scrapers/espn';

export function normalizeTeamName(name: string): string {
  const normalized = name.toLowerCase().trim();

  // Check each canonical name's aliases
  for (const [canonical, aliases] of Object.entries(teamMappings)) {
    if (aliases.includes(normalized)) {
      return canonical;
    }
  }

  // If no match found, return normalized name (replace spaces with underscores)
  return normalized.replace(/\s+/g, '_');
}

/**
 * Convert ESPN games to the unified Game format.
 * These games start without predictions (hasPrediction = false).
 */
export function convertESPNGames(espnGames: ESPNGame[]): Game[] {
  return espnGames
    .filter(g => g.status === 'scheduled') // Only include scheduled games
    .map(espnGame => {
      const homeTeamNormalized = normalizeTeamName(espnGame.homeTeam.name);
      const awayTeamNormalized = normalizeTeamName(espnGame.awayTeam.name);

      const game: Game = {
        id: `espn_${espnGame.id}`,
        date: espnGame.date,
        startTime: espnGame.startTime,
        // Away team is teamA, home team is teamB (matching Warren Nolan format)
        teamA: awayTeamNormalized,
        teamB: homeTeamNormalized,
        teamAHome: false,
        teamBHome: !espnGame.neutralSite,
        venueType: espnGame.neutralSite ? 'neutral' : 'home_b',
        // No prediction yet - set to 0.5 (no edge)
        modelProbA: 0.5,
        modelProbB: 0.5,
        hasPrediction: false,
        predictionSource: 'none',
        venue: espnGame.venue?.fullName,
        broadcast: espnGame.broadcast,
        teamARank: espnGame.awayTeam.rank,
        teamBRank: espnGame.homeTeam.rank,
        espnGameId: espnGame.id,
      };

      return game;
    });
}

/**
 * Merge Warren Nolan predictions into ESPN games.
 * Warren Nolan games that match ESPN games will update the prediction fields.
 */
export function mergeWarrenNolanPredictions(
  espnGames: Game[],
  warrenNolanGames: Game[]
): Game[] {
  // Create a copy of ESPN games
  const mergedGames = espnGames.map(g => ({ ...g }));

  for (const wnGame of warrenNolanGames) {
    // Try to find matching ESPN game
    const matchIndex = mergedGames.findIndex(espnGame => {
      // Normalize all team names for comparison
      const espnTeamA = normalizeTeamName(espnGame.teamA);
      const espnTeamB = normalizeTeamName(espnGame.teamB);
      const wnTeamA = normalizeTeamName(wnGame.teamA);
      const wnTeamB = normalizeTeamName(wnGame.teamB);

      // Check if teams match (in either order)
      const teamsMatch =
        (espnTeamA === wnTeamA && espnTeamB === wnTeamB) ||
        (espnTeamA === wnTeamB && espnTeamB === wnTeamA);

      return teamsMatch;
    });

    if (matchIndex !== -1) {
      // Update the ESPN game with Warren Nolan predictions
      const espnGame = mergedGames[matchIndex];

      // Determine if the teams are in the same order
      const sameOrder =
        normalizeTeamName(espnGame.teamA) === normalizeTeamName(wnGame.teamA);

      if (sameOrder) {
        mergedGames[matchIndex] = {
          ...espnGame,
          modelProbA: wnGame.modelProbA,
          modelProbB: wnGame.modelProbB,
          hasPrediction: true,
          predictionSource: 'warren_nolan',
        };
      } else {
        // Teams are in reverse order, swap probabilities
        mergedGames[matchIndex] = {
          ...espnGame,
          modelProbA: wnGame.modelProbB,
          modelProbB: wnGame.modelProbA,
          hasPrediction: true,
          predictionSource: 'warren_nolan',
        };
      }
    } else {
      // Warren Nolan game not in ESPN data - add it directly
      // This shouldn't happen often but handles edge cases
      mergedGames.push({
        ...wnGame,
        hasPrediction: true,
        predictionSource: 'warren_nolan',
      });
    }
  }

  return mergedGames;
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

      // Check if this odds entry matches this game
      const teamsMatch =
        (normalizedHome === game.teamA || normalizedHome === game.teamB) &&
        (normalizedAway === game.teamA || normalizedAway === game.teamB);

      if (teamsMatch) {
        gameOdds.push(entry);
      }
    }

    // Include all games, even those without odds
    matched.push({ game, odds: gameOdds });
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
