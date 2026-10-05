import Link from 'next/link';
import type { LedgerRow, SetKey } from './data';
import { american, etTime, ordinal, pct } from './format';
import { NetBar, SourceLink } from './ui';

function topScore(sets: Record<SetKey, number>, home: string, away: string): string {
  const k = (Object.keys(sets) as SetKey[]).reduce((a, b) => (sets[b] > sets[a] ? b : a));
  return `${k.startsWith('home') ? home : away} 3-${k.slice(-1)} (${pct(sets[k])})`;
}

/** One match on the board: away left, home right, the net bar between. */
export function SlateRow({ p }: { p: LedgerRow }) {
  const pAway = 1 - p.p_home;
  const awayFav = pAway > 0.5;
  return (
    <li className="border-b border-line py-4 last:border-b-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm text-muted">
        <span className="num">{etTime(p.start, p.start_known)}</span>
        <span>
          {p.gamePath ? (
            <Link href={p.gamePath} className="mr-3 font-semibold text-cobalt-deep underline">
              Full preview
            </Link>
          ) : null}
          <SourceLink href={p.url}>Match on NCAA.com</SourceLink>
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 sm:grid-cols-[minmax(0,14rem)_1fr_minmax(0,14rem)] sm:gap-x-5">
        <div className="min-w-0">
          <p className={`cond text-lg leading-tight break-words ${awayFav ? 'font-bold' : 'font-medium'}`}>{p.away_name}</p>
          <p className="text-xs text-muted">
            {p.away_avca ? `AVCA No. ${p.away_avca}, ` : ''}our {ordinal(p.away_rank)}
          </p>
        </div>
        <p className="display num text-2xl sm:hidden">
          {pct(pAway, 0)} <span className="text-muted">/</span> {pct(p.p_home, 0)}
        </p>
        <div className="hidden items-center gap-3 sm:flex">
          <span className={`display num w-16 text-right text-2xl ${awayFav ? '' : 'text-muted'}`}>{pct(pAway)}</span>
          <NetBar pAway={pAway} label={`${p.away_name} ${pct(pAway)}, ${p.home_name} ${pct(p.p_home)}`} />
          <span className={`display num w-16 text-2xl ${awayFav ? 'text-muted' : ''}`}>{pct(p.p_home)}</span>
        </div>
        <div className="min-w-0 text-right">
          <p className={`cond text-lg leading-tight break-words ${awayFav ? 'font-medium' : 'font-bold'}`}>{p.home_name}</p>
          <p className="text-xs text-muted">
            {p.home_avca ? `AVCA No. ${p.home_avca}, ` : ''}our {ordinal(p.home_rank)}
          </p>
        </div>
      </div>
      <div className="mt-2 sm:hidden">
        <NetBar pAway={pAway} label={`${p.away_name} ${pct(pAway)}, ${p.home_name} ${pct(p.p_home)}`} />
      </div>
      <p className="mt-2.5 text-sm text-muted">
        Most likely <span className="font-semibold text-ink">{topScore(p.sets, p.home_name, p.away_name)}</span>
        <span className="mx-2 text-line" aria-hidden="true">|</span>
        Fair line <span className="num font-semibold text-ink">{american(p.fair_away)}</span> {p.away_name},{' '}
        <span className="num font-semibold text-ink">{american(p.fair_home)}</span> {p.home_name}
      </p>
    </li>
  );
}
