import type { GameWithEdges } from '@/lib/types';
import { EdgeBadge } from './EdgeBadge';
import { OddsBadge } from './OddsBadge';

interface GameCardProps {
  game: GameWithEdges;
  muted?: boolean;
  oddsOnly?: boolean;
}

function formatTeamName(name: string, rank?: number): string {
  const formatted = name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return rank ? `#${rank} ${formatted}` : formatted;
}

export function GameCard({ game, muted = false, oddsOnly = false }: GameCardProps) {
  // For odds-only games (no predictions), show a card with odds
  if (oddsOnly) {
    const hasOdds = game.odds && game.odds.length > 0;

    return (
      <div className="bg-gray-50 rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{game.startTime}</span>
              {hasOdds ? (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  ODDS ONLY
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                  NO ODDS
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mt-1">
              {formatTeamName(game.teamA, game.teamARank)} @{' '}
              {formatTeamName(game.teamB, game.teamBRank)}
            </h3>
            {game.venue && (
              <p className="text-sm text-gray-400 mt-0.5">{game.venue}</p>
            )}
          </div>
          {game.broadcast && (
            <div className="text-xs text-gray-400 ml-4">{game.broadcast}</div>
          )}
        </div>

        {/* Show odds if available */}
        {hasOdds && (
          <OddsBadge odds={game.odds!} teamA={game.teamA} teamB={game.teamB} />
        )}
      </div>
    );
  }

  // For muted cards, show all edges including PASS
  // For normal cards, only show edges that aren't PASS
  const visibleEdges = muted
    ? game.edges
    : game.edges.filter(e => e.classification !== 'PASS');

  if (visibleEdges.length === 0 && !oddsOnly) {
    return null;
  }

  const getVenueText = () => {
    if (game.venueType === 'home_a') {
      return (
        <span className={muted ? 'text-gray-500' : 'text-blue-600'}>
          @ {formatTeamName(game.teamA)}
        </span>
      );
    } else if (game.venueType === 'home_b') {
      return (
        <span className={muted ? 'text-gray-500' : 'text-blue-600'}>
          @ {formatTeamName(game.teamB)}
        </span>
      );
    } else {
      return <span className={muted ? 'text-gray-500' : 'text-purple-600'}>Neutral Site</span>;
    }
  };

  const cardClasses = muted
    ? 'bg-gray-50 rounded-lg shadow p-6 border border-gray-200'
    : 'bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow';

  return (
    <div className={cardClasses}>
      <div className="flex justify-between items-start mb-4 border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${muted ? 'text-gray-400' : 'text-gray-500'}`}>
              {game.startTime}
            </span>
            {muted && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-300 text-gray-700">
                NO BET
              </span>
            )}
            {game.predictionSource === 'warren_nolan' && !muted && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                WN
              </span>
            )}
          </div>
          <h3 className={`text-2xl font-bold ${muted ? 'text-gray-600' : ''}`}>
            {formatTeamName(game.teamA, game.teamARank)} vs{' '}
            {formatTeamName(game.teamB, game.teamBRank)}
          </h3>
          <div className={`text-sm mt-1 ${muted ? 'text-gray-500' : 'text-gray-600'}`}>
            {game.venue ? (
              <span>
                {getVenueText()} &middot; {game.venue}
              </span>
            ) : (
              getVenueText()
            )}
          </div>
        </div>
        {game.broadcast && (
          <div className="text-xs text-gray-400">{game.broadcast}</div>
        )}
      </div>

      <div className="space-y-3">
        {visibleEdges.map((edge, idx) => (
          <EdgeBadge key={idx} edge={edge} muted={muted} />
        ))}
      </div>
    </div>
  );
}
