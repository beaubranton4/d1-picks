import type { PerformanceStats, TierRecord, PickResult } from '@/lib/calculators/performance';
import { formatProfit, formatRecord } from '@/lib/calculators/performance';

interface PerformanceTrackerProps {
  stats: PerformanceStats;
}

function getTierColor(tier: string): string {
  switch (tier) {
    case 'D1 PICK':
      return 'text-green-400';
    case 'SMART BET':
      return 'text-mlb-blue';
    case 'LEAN':
      return 'text-yellow-400';
    default:
      return 'text-mlb-textSecondary';
  }
}

function getResultColor(result: string): string {
  switch (result) {
    case 'win':
      return 'bg-green-500';
    case 'loss':
      return 'bg-red-500';
    default:
      return 'bg-mlb-textMuted';
  }
}

function TierStat({ tier }: { tier: TierRecord }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-mlb-border/50 last:border-b-0">
      <span className={`text-sm font-medium ${getTierColor(tier.tier)}`}>
        {tier.tier}
      </span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-mlb-textPrimary font-mono">
          {formatRecord(tier)}
        </span>
        <span className="text-xs text-mlb-textMuted">
          ({tier.winPct.toFixed(0)}%)
        </span>
        <span className={`text-sm font-mono ${tier.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatProfit(tier.totalProfit)}
        </span>
      </div>
    </div>
  );
}

function RecentResultsDots({ results }: { results: PickResult[] }) {
  // Show last 10 results as colored dots
  const recent = results.slice(0, 10);

  return (
    <div className="flex items-center gap-1">
      {recent.map((r, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${getResultColor(r.result)}`}
          title={`${r.team} vs ${r.opponent}: ${r.result.toUpperCase()}`}
        />
      ))}
    </div>
  );
}

export function PerformanceTracker({ stats }: PerformanceTrackerProps) {
  const hasData = stats.overall.wins + stats.overall.losses > 0;

  if (!hasData) {
    return (
      <div className="bg-mlb-card rounded-lg p-4 border border-mlb-border">
        <h3 className="text-sm font-semibold text-mlb-textSecondary mb-2">Season Performance</h3>
        <p className="text-sm text-mlb-textMuted">No results tracked yet</p>
      </div>
    );
  }

  return (
    <div className="bg-mlb-card rounded-lg p-4 border border-mlb-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-mlb-textSecondary">Season Performance</h3>
        <RecentResultsDots results={stats.recentResults} />
      </div>

      {/* Overall Record */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-mlb-border">
        <div>
          <span className="text-2xl font-bold text-mlb-textPrimary">
            {formatRecord(stats.overall)}
          </span>
          <span className="text-sm text-mlb-textMuted ml-2">
            ({stats.overall.winPct.toFixed(0)}%)
          </span>
        </div>
        <div className={`text-xl font-bold ${stats.overall.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatProfit(stats.overall.totalProfit)}
        </div>
      </div>

      {/* By Tier */}
      <div>
        <h4 className="text-xs font-medium text-mlb-textMuted uppercase tracking-wider mb-2">
          By Classification
        </h4>
        {stats.byTier.map(tier => (
          <TierStat key={tier.tier} tier={tier} />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version for header display
 */
export function PerformanceBadge({ stats }: PerformanceTrackerProps) {
  const hasData = stats.overall.wins + stats.overall.losses > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-mlb-card rounded-full border border-mlb-border">
      <span className="text-sm font-semibold text-mlb-textPrimary">
        {formatRecord(stats.overall)}
      </span>
      <span className={`text-sm font-bold ${stats.overall.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        ({formatProfit(stats.overall.totalProfit)})
      </span>
    </div>
  );
}
