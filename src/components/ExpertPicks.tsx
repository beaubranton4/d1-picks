import Image from 'next/image';
import type { ManualPick, PickLabel } from '@/lib/types';
import { D1PickBadge } from './D1PickBadge';

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
        border: 'border-green-500/60',
        bg: 'bg-gradient-to-br from-green-900/50 via-green-900/30 to-mlb-card',
        glow: 'shadow-[0_0_20px_rgba(34,197,94,0.2)]',
        badge: 'bg-gradient-to-r from-green-600 to-emerald-500 text-white',
        accent: 'text-green-400',
      };
    case 'SMART BET':
      return {
        border: 'border-mlb-blue/60',
        bg: 'bg-gradient-to-br from-mlb-blue/30 via-mlb-blue/15 to-mlb-card',
        glow: 'shadow-[0_0_20px_rgba(0,98,227,0.15)]',
        badge: 'bg-gradient-to-r from-mlb-blue to-blue-400 text-white',
        accent: 'text-mlb-blue',
      };
    case 'LEAN':
      return {
        border: 'border-yellow-500/60',
        bg: 'bg-gradient-to-br from-yellow-900/40 via-yellow-900/20 to-mlb-card',
        glow: 'shadow-[0_0_20px_rgba(234,179,8,0.15)]',
        badge: 'bg-gradient-to-r from-yellow-500 to-amber-400 text-yellow-950',
        accent: 'text-yellow-400',
      };
    default:
      return {
        border: 'border-mlb-border',
        bg: 'bg-mlb-card',
        glow: '',
        badge: 'bg-mlb-textMuted text-mlb-darker',
        accent: 'text-mlb-textMuted',
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
  const isD1Pick = pick.pickLabel === 'D1 PICK';

  return (
    <div
      className={`
        rounded-xl p-5 border-2 ${styles.border} ${styles.bg} ${styles.glow}
        hover:scale-[1.02] hover:shadow-xl
        transition-all duration-300 ease-out
        relative overflow-hidden
      `}
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

      {/* Header: Label badge + Units */}
      <div className="flex items-center justify-between mb-4 relative">
        {isD1Pick ? (
          <div className="flex items-center gap-2">
            <Image
              src="/d1-picks-logo.png"
              alt="D1 Picks"
              width={28}
              height={28}
              className="drop-shadow-lg"
            />
            <D1PickBadge size="md" showText={true} />
          </div>
        ) : (
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-md ${styles.badge}`}>
            {pick.pickLabel}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${styles.accent}`}>
            {pick.units}U
          </span>
          <div className="w-px h-4 bg-mlb-border" />
          <span className="text-xs text-mlb-textMuted font-medium">
            {getBookAbbrev(pick.sportsbook)}
          </span>
        </div>
      </div>

      {/* Matchup */}
      <div className="mb-4 relative">
        <h3 className="text-xl font-bold text-mlb-textPrimary mb-1">
          {pick.team}
          <span className="text-mlb-textMuted font-normal mx-2">@</span>
          <span className="text-mlb-textSecondary">{pick.opponent}</span>
        </h3>
      </div>

      {/* Moneyline highlight */}
      <div className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-4
        bg-mlb-darker/80 border border-mlb-border/50
      `}>
        <span className={`text-2xl font-extrabold ${styles.accent}`}>
          {formatMoneyline(pick.moneyline)}
        </span>
        <span className="text-sm text-mlb-textSecondary font-medium">
          on {pick.team}
        </span>
      </div>

      {/* Analysis */}
      <p className="text-sm text-mlb-textSecondary leading-relaxed relative">
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Image
              src="/d1-picks-logo.png"
              alt="D1 Picks"
              width={48}
              height={48}
              className="drop-shadow-lg"
            />
            {/* Glow behind logo */}
            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full -z-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-mlb-textPrimary flex items-center gap-2">
              Today&apos;s Expert Picks
              {d1Picks.length > 0 && (
                <span className="text-sm font-semibold text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                  {d1Picks.length} D1
                </span>
              )}
            </h2>
            <p className="text-sm text-mlb-textMuted mt-0.5">
              Hand-picked by our team of former college players
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-mlb-textPrimary">
              {picks.length}
            </span>
            <span className="text-xs text-mlb-textMuted uppercase tracking-wide">
              {picks.length === 1 ? 'pick' : 'picks'} today
            </span>
          </div>
        </div>
      </div>

      {/* Pick Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Show D1 PICKs first, then SMART BETs, then LEANs */}
        {[...d1Picks, ...smartBets, ...leans].map(pick => (
          <PickCard key={pick.id} pick={pick} />
        ))}
      </div>
    </section>
  );
}
