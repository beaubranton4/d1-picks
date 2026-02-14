import type { PickLabel } from '@/lib/types';

export interface PickResult {
  date: string;
  gameId: string;
  team: string;
  opponent: string;
  classification: PickLabel;
  odds: number;
  aiScore: number;
  result: 'win' | 'loss' | 'push';
  profit: number;
}

export interface PickResultsData {
  results: PickResult[];
}

export interface SeasonRecord {
  wins: number;
  losses: number;
  pushes: number;
  winPct: number;
  totalProfit: number;
}

export interface TierRecord extends SeasonRecord {
  tier: PickLabel;
}

export interface PerformanceStats {
  overall: SeasonRecord;
  byTier: TierRecord[];
  recentResults: PickResult[];
}

/**
 * Calculate win-loss record from a set of results
 */
export function calculateSeasonRecord(results: PickResult[]): SeasonRecord {
  const wins = results.filter(r => r.result === 'win').length;
  const losses = results.filter(r => r.result === 'loss').length;
  const pushes = results.filter(r => r.result === 'push').length;
  const totalProfit = results.reduce((sum, r) => sum + r.profit, 0);

  const gamesPlayed = wins + losses;
  const winPct = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

  return {
    wins,
    losses,
    pushes,
    winPct,
    totalProfit,
  };
}

/**
 * Calculate ROI as percentage of units wagered
 */
export function calculateROI(results: PickResult[]): number {
  if (results.length === 0) return 0;

  const totalProfit = results.reduce((sum, r) => sum + r.profit, 0);
  const totalWagered = results.length; // 1 unit per pick

  return (totalProfit / totalWagered) * 100;
}

/**
 * Get most recent N results, sorted by date descending
 */
export function getRecentResults(results: PickResult[], n: number = 10): PickResult[] {
  return [...results]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, n);
}

/**
 * Calculate performance broken down by tier
 */
export function calculateTierRecords(results: PickResult[]): TierRecord[] {
  const tiers: PickLabel[] = ['D1 PICK', 'SMART BET', 'LEAN'];

  return tiers.map(tier => {
    const tierResults = results.filter(r => r.classification === tier);
    const record = calculateSeasonRecord(tierResults);
    return { tier, ...record };
  }).filter(t => t.wins + t.losses > 0); // Only return tiers with results
}

/**
 * Get complete performance stats
 */
export function getPerformanceStats(results: PickResult[]): PerformanceStats {
  return {
    overall: calculateSeasonRecord(results),
    byTier: calculateTierRecords(results),
    recentResults: getRecentResults(results, 10),
  };
}

/**
 * Format profit for display (e.g., "+2.5u" or "-1.2u")
 */
export function formatProfit(profit: number): string {
  const sign = profit >= 0 ? '+' : '';
  return `${sign}${profit.toFixed(1)}u`;
}

/**
 * Format record for display (e.g., "12-8")
 */
export function formatRecord(record: SeasonRecord): string {
  return `${record.wins}-${record.losses}`;
}

/**
 * Get a streak description (e.g., "W3" or "L2")
 */
export function getStreak(results: PickResult[]): string {
  if (results.length === 0) return '-';

  const recent = getRecentResults(results, results.length);
  if (recent.length === 0) return '-';

  const firstResult = recent[0].result;
  let streak = 0;

  for (const r of recent) {
    if (r.result === firstResult && firstResult !== 'push') {
      streak++;
    } else {
      break;
    }
  }

  if (streak === 0) return '-';
  return `${firstResult === 'win' ? 'W' : 'L'}${streak}`;
}
