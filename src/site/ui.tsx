/**
 * Site UI pieces. Server components, no client JS.
 *
 * NetBar is the signature: away share in cobalt from the left, home share in
 * ball yellow from the right, and a net at 50%. How far the seam sits from
 * the net is how sure the model is.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SetKey } from './data';
import { pct } from './format';

export function NetBar({ pAway, size = 'md', label }: { pAway: number; size?: 'md' | 'lg'; label: string }) {
  const h = size === 'lg' ? 'h-5' : 'h-2.5';
  return (
    <div role="img" aria-label={label} className={`relative w-full ${h}`}>
      <div className="absolute inset-0 overflow-hidden rounded-[3px] bg-ball">
        <div className="h-full bg-cobalt" style={{ width: `${(pAway * 100).toFixed(1)}%` }} />
      </div>
      <div className="absolute -top-1.5 -bottom-1.5 left-1/2 w-[2px] -translate-x-1/2 bg-ink" aria-hidden="true" />
    </div>
  );
}

const ORDER: SetKey[] = ['away_3_0', 'away_3_1', 'away_3_2', 'home_3_2', 'home_3_1', 'home_3_0'];

/**
 * The six set scores laid out from an away sweep to a home sweep, net in the
 * middle. Labels are winner-first ("3-1"); the bar color says who won.
 */
export function SetLadder({ sets, away, home }: { sets: Record<SetKey, number>; away: string; home: string }) {
  const max = Math.max(...ORDER.map((k) => sets[k]));
  return (
    <figure>
      <div className="grid grid-cols-6 items-end gap-1.5 sm:gap-2" style={{ height: '8.5rem' }}>
        {ORDER.map((k, i) => {
          const isAway = k.startsWith('away');
          return (
            <div key={k} className={`flex h-full flex-col justify-end ${i === 3 ? 'border-l-2 border-ink pl-1.5 sm:pl-2' : ''}`}>
              <span className="num mb-1 text-center text-xs font-semibold sm:text-sm">{pct(sets[k])}</span>
              <div
                className={`${isAway ? 'bg-cobalt' : 'bg-ball'} rounded-t-[3px]`}
                style={{ height: `${Math.max((sets[k] / max) * 100, 2).toFixed(1)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-6 gap-1.5 text-center text-xs text-muted sm:gap-2">
        {ORDER.map((k, i) => (
          <span key={k} className={`num ${i === 3 ? 'pl-1.5 sm:pl-2' : ''}`}>
            3-{k.slice(-1)}
          </span>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-sm">
        <span>
          <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[2px] bg-cobalt align-middle" aria-hidden="true" />
          {away} wins
        </span>
        <span>
          {home} wins
          <span className="ml-1.5 inline-block h-2.5 w-2.5 rounded-[2px] bg-ball align-middle" aria-hidden="true" />
        </span>
      </figcaption>
    </figure>
  );
}

/** The 21+ line every picks page carries. */
export function RgLine() {
  return (
    <p className="text-sm text-muted">
      21+ only. These are probabilities, not promises, and D1 Picks takes no bets. If gambling stops being fun, call or text{' '}
      <a href="tel:18006973738" className="font-semibold text-ink underline">
        1-800-MY-RESET
      </a>{' '}
      or read our <Link href="/responsible-gambling" className="underline">responsible gambling</Link> page.
    </p>
  );
}

export function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div>
      <p className="display num text-4xl sm:text-5xl">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
    </div>
  );
}

export function SourceLink({ href, children = 'NCAA.com' }: { href: string; children?: ReactNode }) {
  return (
    <a href={href} rel="noopener" target="_blank" className="underline decoration-line hover:decoration-ink">
      {children}
    </a>
  );
}
