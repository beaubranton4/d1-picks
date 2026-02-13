import type { BetEdge } from '@/lib/types';

interface EdgeBadgeProps {
  edge: BetEdge;
  muted?: boolean;
}

export function EdgeBadge({ edge, muted = false }: EdgeBadgeProps) {
  const getClassificationColor = (classification: string, isMuted: boolean) => {
    if (isMuted) {
      return 'bg-gray-100 border-gray-300 text-gray-600';
    }
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

  const getBadgeColor = (classification: string, isMuted: boolean) => {
    if (isMuted) {
      return 'bg-gray-400 text-white';
    }
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

  // Don't show PASS bets unless muted mode
  if (edge.classification === 'PASS' && !muted) {
    return null;
  }

  const formatMoneyline = (ml: number) => (ml > 0 ? `+${ml}` : `${ml}`);

  const edgePercent = edge.adjustedEdge * 100;
  const edgeDisplay = edgePercent >= 0 ? `+${edgePercent.toFixed(1)}%` : `${edgePercent.toFixed(1)}%`;
  const edgeColor = muted
    ? 'text-gray-500'
    : edgePercent >= 0
      ? 'text-green-700'
      : 'text-red-600';

  const badgeLabel = muted ? 'PASS' : edge.classification;

  return (
    <div
      className={`border-l-4 rounded-lg p-4 ${getClassificationColor(edge.classification, muted)}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${getBadgeColor(edge.classification, muted)}`}
          >
            {badgeLabel}
          </span>
          <span className={`text-lg font-bold capitalize ${muted ? 'text-gray-600' : ''}`}>
            {edge.team}
          </span>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${muted ? 'text-gray-600' : ''}`}>
            {formatMoneyline(edge.moneyline)}
          </div>
          <div className={`text-xs capitalize ${muted ? 'text-gray-400' : 'text-gray-600'}`}>
            {edge.sportsbook}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm mt-3">
        <div>
          <div className={`text-xs ${muted ? 'text-gray-400' : 'text-gray-600'}`}>Model Win %</div>
          <div className={`font-semibold ${muted ? 'text-gray-500' : ''}`}>
            {(edge.modelProb * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className={`text-xs ${muted ? 'text-gray-400' : 'text-gray-600'}`}>Implied Prob</div>
          <div className={`font-semibold ${muted ? 'text-gray-500' : ''}`}>
            {(edge.impliedProb * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className={`text-xs ${muted ? 'text-gray-400' : 'text-gray-600'}`}>Edge</div>
          <div className={`font-semibold ${edgeColor}`}>
            {edgeDisplay}
          </div>
        </div>
      </div>

      {edge.modifierReason && (
        <div className={`mt-2 text-xs italic ${muted ? 'text-gray-400' : 'text-gray-600'}`}>
          {edge.modifierReason}
        </div>
      )}
    </div>
  );
}
