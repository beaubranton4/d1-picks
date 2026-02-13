import type { ManualPick, PickLabel } from '@/lib/types';

interface ExpertPicksProps {
  picks: ManualPick[];
}

function formatMoneyline(ml: number): string {
  return ml > 0 ? `+${ml}` : `${ml}`;
}

function getLabelStyles(label: PickLabel) {
  switch (label) {
    case 'D1 PICK':
      return {
        border: 'border-green-500',
        bg: 'bg-green-900/40',
        badge: 'bg-green-500 text-green-950',
      };
    case 'SMART BET':
      return {
        border: 'border-mlb-blue',
        bg: 'bg-mlb-blue/20',
        badge: 'bg-mlb-blue text-white',
      };
    case 'LEAN':
      return {
        border: 'border-yellow-500',
        bg: 'bg-yellow-900/40',
        badge: 'bg-yellow-500 text-yellow-950',
      };
    default:
      return {
        border: 'border-mlb-border',
        bg: 'bg-mlb-card',
        badge: 'bg-mlb-textMuted text-mlb-darker',
      };
  }
}

function getBookAbbrev(book: string): string {
  const abbrevs: Record<string, string> = {
    draftkings: 'DK',
    fanduel: 'FD',
    betmgm: 'MGM',
  };
  return abbrevs[book.toLowerCase()] || book;
}

function PickCard({ pick }: { pick: ManualPick }) {
  const styles = getLabelStyles(pick.pickLabel);

  return (
    <div
      className={`rounded-lg p-5 border-2 ${styles.border} ${styles.bg} hover:shadow-lg transition-all`}
    >
      {/* Header: Label badge + Units */}
      <div className="flex items-center justify-between mb-3">
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${styles.badge}`}>
          {pick.pickLabel}
        </span>
        <span className="text-sm font-semibold text-mlb-textSecondary">
          {pick.units}U
        </span>
      </div>

      {/* Matchup */}
      <h3 className="text-xl font-bold text-mlb-textPrimary mb-2">
        {pick.team} @ {pick.opponent}
      </h3>

      {/* Moneyline + Sportsbook */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl font-bold text-green-400">
          {pick.team} {formatMoneyline(pick.moneyline)}
        </span>
        <span className="text-sm text-mlb-textMuted">
          ({getBookAbbrev(pick.sportsbook)})
        </span>
      </div>

      {/* Analysis */}
      <p className="text-sm text-mlb-textSecondary leading-relaxed">
        {pick.analysis}
      </p>
    </div>
  );
}

export function ExpertPicks({ picks }: ExpertPicksProps) {
  if (picks.length === 0) {
    return null;
  }

  const d1Picks = picks.filter(p => p.pickLabel === 'D1 PICK');
  const smartBets = picks.filter(p => p.pickLabel === 'SMART BET');
  const leans = picks.filter(p => p.pickLabel === 'LEAN');

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-mlb-textPrimary">
            Today&apos;s Expert Picks
          </h2>
          <p className="text-sm text-mlb-textMuted mt-1">
            Hand-picked by our team of former college players
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-mlb-textSecondary">
            {picks.length} {picks.length === 1 ? 'pick' : 'picks'}
          </span>
          {d1Picks.length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500 text-green-950">
              {d1Picks.length} D1 PICK{d1Picks.length > 1 ? 'S' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Pick Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Show D1 PICKs first, then SMART BETs, then LEANs */}
        {[...d1Picks, ...smartBets, ...leans].map(pick => (
          <PickCard key={pick.id} pick={pick} />
        ))}
      </div>
    </section>
  );
}
