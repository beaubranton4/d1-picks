import type { GameWithEdges, OddsEntry } from '@/lib/types';
import { EdgeBadge } from './EdgeBadge';

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

function formatMoneyline(ml: number): string {
  return ml > 0 ? `+${ml}` : `${ml}`;
}

function getBestOdds(odds: OddsEntry[], teamName: string): { ml: number; book: string } | null {
  const teamOdds = odds.filter(o => {
    const normalized = o.team.toLowerCase().replace(/\s+/g, '_');
    return normalized.includes(teamName.replace(/_/g, '')) ||
           teamName.includes(normalized.replace(/_/g, ''));
  });

  if (teamOdds.length === 0) return null;

  const best = teamOdds.reduce((a, b) => a.moneyline > b.moneyline ? a : b);
  return { ml: best.moneyline, book: best.sportsbook };
}

function getBookAbbrev(book: string): string {
  const abbrevs: Record<string, string> = {
    draftkings: 'DK',
    fanduel: 'FD',
    betmgm: 'MGM',
  };
  return abbrevs[book.toLowerCase()] || book.slice(0, 2).toUpperCase();
}

export function GameCard({ game, muted = false, oddsOnly = false }: GameCardProps) {
  // For odds-only games, use compact card
  if (oddsOnly) {
    return <CompactGameCard game={game} />;
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
        <span className={muted ? 'text-mlb-textMuted' : 'text-mlb-blue'}>
          @ {formatTeamName(game.teamA)}
        </span>
      );
    } else if (game.venueType === 'home_b') {
      return (
        <span className={muted ? 'text-mlb-textMuted' : 'text-mlb-blue'}>
          @ {formatTeamName(game.teamB)}
        </span>
      );
    } else {
      return <span className={muted ? 'text-mlb-textMuted' : 'text-purple-400'}>Neutral Site</span>;
    }
  };

  const cardClasses = muted
    ? 'bg-mlb-card rounded-lg p-6 border border-mlb-border'
    : 'bg-mlb-card rounded-lg p-6 border border-mlb-border hover:border-mlb-blue/50 hover:shadow-lg hover:shadow-mlb-blue/10 transition-all';

  return (
    <div className={cardClasses}>
      <div className="flex justify-between items-start mb-4 border-b border-mlb-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${muted ? 'text-mlb-textMuted' : 'text-mlb-textSecondary'}`}>
              {game.startTime}
            </span>
            {muted && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-mlb-textMuted text-mlb-darker">
                NO BET
              </span>
            )}
            {game.predictionSource === 'warren_nolan' && !muted && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-mlb-blue/20 text-mlb-blue">
                WN
              </span>
            )}
          </div>
          <h3 className={`text-2xl font-bold ${muted ? 'text-mlb-textMuted' : 'text-mlb-textPrimary'}`}>
            {formatTeamName(game.teamA, game.teamARank)} vs{' '}
            {formatTeamName(game.teamB, game.teamBRank)}
          </h3>
          <div className={`text-sm mt-1 ${muted ? 'text-mlb-textMuted' : 'text-mlb-textSecondary'}`}>
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
          <div className="text-xs text-mlb-textMuted">{game.broadcast}</div>
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

// Compact card for odds-only games - designed for grid layout
function CompactGameCard({ game }: { game: GameWithEdges }) {
  const hasOdds = game.odds && game.odds.length > 0;
  const teamAOdds = hasOdds ? getBestOdds(game.odds!, game.teamA) : null;
  const teamBOdds = hasOdds ? getBestOdds(game.odds!, game.teamB) : null;

  const teamAIsFavorite = teamAOdds && teamBOdds ? teamAOdds.ml < teamBOdds.ml : false;

  return (
    <div className="bg-mlb-card rounded-lg border border-mlb-border hover:border-mlb-blue/50 hover:shadow-lg hover:shadow-mlb-blue/10 transition-all overflow-hidden">
      {/* Header with time and broadcast */}
      <div className="px-3 py-2 bg-mlb-darker border-b border-mlb-border flex items-center justify-between">
        <span className="text-xs font-medium text-mlb-textSecondary">{game.startTime}</span>
        {game.broadcast && (
          <span className="text-xs text-mlb-textMuted">{game.broadcast}</span>
        )}
      </div>

      {/* Teams and odds */}
      <div className="p-3">
        {/* Away team (teamA) */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {game.teamARank && (
              <span className="text-xs font-bold text-amber-400">#{game.teamARank}</span>
            )}
            <span className="font-semibold text-mlb-textPrimary truncate">
              {formatTeamName(game.teamA)}
            </span>
          </div>
          {teamAOdds ? (
            <div className={`flex items-center gap-1.5 ${teamAIsFavorite ? 'text-amber-400' : 'text-green-400'}`}>
              <span className="text-lg font-bold">{formatMoneyline(teamAOdds.ml)}</span>
              <span className="text-xs text-mlb-textMuted">{getBookAbbrev(teamAOdds.book)}</span>
            </div>
          ) : (
            <span className="text-mlb-textMuted">—</span>
          )}
        </div>

        {/* Home team (teamB) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {game.teamBRank && (
              <span className="text-xs font-bold text-amber-400">#{game.teamBRank}</span>
            )}
            <span className="font-semibold text-mlb-textPrimary truncate">
              {formatTeamName(game.teamB)}
            </span>
            <span className="text-xs text-mlb-textMuted">(H)</span>
          </div>
          {teamBOdds ? (
            <div className={`flex items-center gap-1.5 ${!teamAIsFavorite ? 'text-amber-400' : 'text-green-400'}`}>
              <span className="text-lg font-bold">{formatMoneyline(teamBOdds.ml)}</span>
              <span className="text-xs text-mlb-textMuted">{getBookAbbrev(teamBOdds.book)}</span>
            </div>
          ) : (
            <span className="text-mlb-textMuted">—</span>
          )}
        </div>

        {/* Venue if available */}
        {game.venue && (
          <div className="mt-2 pt-2 border-t border-mlb-border">
            <span className="text-xs text-mlb-textMuted truncate block">{game.venue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Grid wrapper for compact cards
export function CompactGameGrid({ games }: { games: GameWithEdges[] }) {
  if (games.length === 0) return null;

  // Split into games with odds and games without
  const withOdds = games.filter(g => g.odds && g.odds.length > 0);
  const withoutOdds = games.filter(g => !g.odds || g.odds.length === 0);

  return (
    <div className="space-y-6">
      {/* Games with odds */}
      {withOdds.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-mlb-textSecondary">With Betting Lines</h3>
            <span className="text-xs text-mlb-textMuted">({withOdds.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {withOdds.map(game => (
              <CompactGameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}

      {/* Games without odds */}
      {withoutOdds.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-mlb-textMuted">Schedule Only</h3>
            <span className="text-xs text-mlb-textMuted">({withoutOdds.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {withoutOdds.map(game => (
              <MiniGameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Even more compact card for games without odds
function MiniGameCard({ game }: { game: GameWithEdges }) {
  return (
    <div className="bg-mlb-card rounded border border-mlb-border px-3 py-2 hover:border-mlb-blue/30 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-mlb-textSecondary truncate">
            {game.teamARank && <span className="text-amber-400">#{game.teamARank} </span>}
            {formatTeamName(game.teamA)}
          </div>
          <div className="text-sm text-mlb-textMuted truncate">
            @ {game.teamBRank && <span className="text-amber-400">#{game.teamBRank} </span>}
            {formatTeamName(game.teamB)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-mlb-textMuted">{game.startTime}</div>
          {game.broadcast && (
            <div className="text-xs text-mlb-textMuted">{game.broadcast}</div>
          )}
        </div>
      </div>
    </div>
  );
}
