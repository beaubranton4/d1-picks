import type { BetEdge } from '@/lib/types';

interface EdgeBadgeProps {
  edge: BetEdge;
  muted?: boolean;
}

export function EdgeBadge({ edge, muted = false }: EdgeBadgeProps) {
  const getClassificationColor = (classification: string, isMuted: boolean) => {
    if (isMuted) {
      return 'bg-mlb-card border-mlb-border text-mlb-textMuted';
    }
    switch (classification) {
      case 'STRONG BET':
        return 'bg-green-900/40 border-green-500 text-green-100';
      case 'GOOD BET':
        return 'bg-mlb-blue/20 border-mlb-blue text-blue-100';
      case 'WEAK BET':
        return 'bg-yellow-900/40 border-yellow-500 text-yellow-100';
      default:
        return 'bg-mlb-card border-mlb-border text-mlb-textSecondary';
    }
  };

  const getBadgeColor = (classification: string, isMuted: boolean) => {
    if (isMuted) {
      return 'bg-mlb-textMuted text-mlb-darker';
    }
    switch (classification) {
      case 'STRONG BET':
        return 'bg-green-500 text-white';
      case 'GOOD BET':
        return 'bg-mlb-blue text-white';
      case 'WEAK BET':
        return 'bg-yellow-500 text-mlb-darker';
      default:
        return 'bg-mlb-textMuted text-mlb-darker';
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
    ? 'text-mlb-textMuted'
    : edgePercent >= 0
      ? 'text-green-400'
      : 'text-red-400';

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
          <span className={`text-lg font-bold capitalize ${muted ? 'text-mlb-textMuted' : 'text-mlb-textPrimary'}`}>
            {edge.team}
          </span>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${muted ? 'text-mlb-textMuted' : 'text-mlb-textPrimary'}`}>
            {formatMoneyline(edge.moneyline)}
          </div>
          <div className={`text-xs capitalize ${muted ? 'text-mlb-textMuted' : 'text-mlb-textSecondary'}`}>
            {edge.sportsbook}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm mt-3">
        <div>
          <div className={`text-xs ${muted ? 'text-mlb-textMuted' : 'text-mlb-textSecondary'}`}>Model Win %</div>
          <div className={`font-semibold ${muted ? 'text-mlb-textMuted' : 'text-mlb-textPrimary'}`}>
            {(edge.modelProb * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className={`text-xs ${muted ? 'text-mlb-textMuted' : 'text-mlb-textSecondary'}`}>Implied Prob</div>
          <div className={`font-semibold ${muted ? 'text-mlb-textMuted' : 'text-mlb-textPrimary'}`}>
            {(edge.impliedProb * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className={`text-xs ${muted ? 'text-mlb-textMuted' : 'text-mlb-textSecondary'}`}>Edge</div>
          <div className={`font-semibold ${edgeColor}`}>
            {edgeDisplay}
          </div>
        </div>
      </div>

      {edge.modifierReason && (
        <div className={`mt-2 text-xs italic ${muted ? 'text-mlb-textMuted' : 'text-mlb-textSecondary'}`}>
          {edge.modifierReason}
        </div>
      )}
    </div>
  );
}
