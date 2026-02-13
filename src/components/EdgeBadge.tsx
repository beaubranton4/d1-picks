import type { BetEdge, PickLabel } from '@/lib/types';

interface EdgeBadgeProps {
  edge: BetEdge;
  muted?: boolean;
}

export function EdgeBadge({ edge, muted = false }: EdgeBadgeProps) {
  const getLabelColor = (label: PickLabel, isMuted: boolean) => {
    if (isMuted) {
      return 'bg-mlb-card border-mlb-border text-mlb-textMuted';
    }
    switch (label) {
      case 'D1 PICK':
        return 'bg-green-900/40 border-green-500 text-green-100';
      case 'SMART BET':
        return 'bg-mlb-blue/20 border-mlb-blue text-blue-100';
      case 'LEAN':
        return 'bg-yellow-900/40 border-yellow-500 text-yellow-100';
      default:
        return 'bg-mlb-card border-mlb-border text-mlb-textSecondary';
    }
  };

  const getBadgeColor = (label: PickLabel, isMuted: boolean) => {
    if (isMuted) {
      return 'bg-mlb-textMuted text-mlb-darker';
    }
    switch (label) {
      case 'D1 PICK':
        return 'bg-green-500 text-white';
      case 'SMART BET':
        return 'bg-mlb-blue text-white';
      case 'LEAN':
        return 'bg-yellow-500 text-mlb-darker';
      default:
        return 'bg-mlb-textMuted text-mlb-darker';
    }
  };

  const getScoreColor = (score: number, isMuted: boolean) => {
    if (isMuted) return 'text-mlb-textMuted';
    if (score >= 8.5) return 'text-green-400';
    if (score >= 7) return 'text-mlb-blue';
    if (score >= 5) return 'text-yellow-400';
    return 'text-mlb-textMuted';
  };

  // Don't show PASS picks unless muted mode
  if (edge.pickLabel === 'PASS' && !muted) {
    return null;
  }

  const formatMoneyline = (ml: number) => (ml > 0 ? `+${ml}` : `${ml}`);

  const displayLabel = muted ? 'NO VALUE' : edge.pickLabel;

  return (
    <div
      className={`border-l-4 rounded-lg p-4 ${getLabelColor(edge.pickLabel, muted)}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${getBadgeColor(edge.pickLabel, muted)}`}
          >
            {displayLabel}
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

      {/* AI Score Display */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-mlb-border/50">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${muted ? 'text-mlb-textMuted' : 'text-mlb-textSecondary'}`}>
            AI Score
          </span>
        </div>
        <div className={`text-2xl font-bold ${getScoreColor(edge.aiScore, muted)}`}>
          {edge.aiScore.toFixed(1)}<span className="text-sm font-normal text-mlb-textMuted">/10</span>
        </div>
      </div>

      {/* Simple explanation - only for non-muted */}
      {!muted && (
        <div className="mt-3 text-sm text-mlb-textSecondary">
          {edge.pickLabel === 'D1 PICK' && (
            <span>Our model sees strong value here.</span>
          )}
          {edge.pickLabel === 'SMART BET' && (
            <span>Good value opportunity.</span>
          )}
          {edge.pickLabel === 'LEAN' && (
            <span>Slight value, worth considering.</span>
          )}
        </div>
      )}
    </div>
  );
}
