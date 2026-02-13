import type { GameWithEdges } from '@/lib/types';
import { EdgeBadge } from './EdgeBadge';

interface GameCardProps {
  game: GameWithEdges;
}

export function GameCard({ game }: GameCardProps) {
  // Only show edges that aren't PASS
  const visibleEdges = game.edges.filter(e => e.classification !== 'PASS');

  if (visibleEdges.length === 0) {
    return null;
  }

  const getVenueText = () => {
    if (game.venueType === 'home_a') {
      return (
        <span className="text-blue-600">
          @ {game.teamA.charAt(0).toUpperCase() + game.teamA.slice(1)}
        </span>
      );
    } else if (game.venueType === 'home_b') {
      return (
        <span className="text-blue-600">
          @ {game.teamB.charAt(0).toUpperCase() + game.teamB.slice(1)}
        </span>
      );
    } else {
      return <span className="text-purple-600">Neutral Site</span>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex justify-between items-start mb-4 border-b pb-3">
        <div>
          <div className="text-sm text-gray-500">{game.startTime}</div>
          <h3 className="text-2xl font-bold capitalize">
            {game.teamA} vs {game.teamB}
          </h3>
          <div className="text-sm text-gray-600 mt-1">{getVenueText()}</div>
        </div>
      </div>

      <div className="space-y-3">
        {visibleEdges.map((edge, idx) => (
          <EdgeBadge key={idx} edge={edge} />
        ))}
      </div>
    </div>
  );
}
