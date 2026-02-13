import type { BetEdge } from '@/lib/types';

interface EdgeBadgeProps {
  edge: BetEdge;
}

export function EdgeBadge({ edge }: EdgeBadgeProps) {
  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'STRONG BET':
        return 'bg-green-100 border-green-500 text-green-900';
      case 'GOOD BET':
        return 'bg-blue-100 border-blue-500 text-blue-900';
      case 'WEAK BET':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getBadgeColor = (classification: string) => {
    switch (classification) {
      case 'STRONG BET':
        return 'bg-green-500 text-white';
      case 'GOOD BET':
        return 'bg-blue-500 text-white';
      case 'WEAK BET':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Don't show PASS bets
  if (edge.classification === 'PASS') {
    return null;
  }

  const formatMoneyline = (ml: number) => (ml > 0 ? `+${ml}` : `${ml}`);

  return (
    <div
      className={`border-l-4 rounded-lg p-4 ${getClassificationColor(edge.classification)}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${getBadgeColor(edge.classification)}`}
          >
            {edge.classification}
          </span>
          <span className="text-lg font-bold capitalize">{edge.team}</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {formatMoneyline(edge.moneyline)}
          </div>
          <div className="text-xs text-gray-600 capitalize">{edge.sportsbook}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm mt-3">
        <div>
          <div className="text-gray-600 text-xs">Model Win %</div>
          <div className="font-semibold">{(edge.modelProb * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-gray-600 text-xs">Implied Prob</div>
          <div className="font-semibold">
            {(edge.impliedProb * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-gray-600 text-xs">Edge</div>
          <div className="font-semibold text-green-700">
            +{(edge.adjustedEdge * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {edge.modifierReason && (
        <div className="mt-2 text-xs text-gray-600 italic">
          {edge.modifierReason}
        </div>
      )}
    </div>
  );
}
