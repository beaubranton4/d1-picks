'use client';

import { useMemo, useState } from 'react';
import { pct } from './format';
import { predictMatch, type ModelParams } from './sim';

export type CalcTeam = { id: string; name: string; conference_name: string; rating: number; rank: number };
type Venue = 'neutral' | 'a' | 'b';

/** Any two D1 teams, any floor: win chance and set scores from the saved ratings. Same math as pipeline/model.py. */
export function MatchupCalculator({ teams, params, defaultA, defaultB }: { teams: CalcTeam[]; params: ModelParams; defaultA: string; defaultB: string }) {
  const [a, setA] = useState(defaultA);
  const [b, setB] = useState(defaultB);
  const [venue, setVenue] = useState<Venue>('neutral');
  const ta = teams.find((t) => t.id === a)!;
  const tb = teams.find((t) => t.id === b)!;
  const same = a === b;

  const out = useMemo(() => {
    // The model is written for a home and an away side; map "A hosts" and "B hosts" onto it.
    const aHome = venue !== 'b';
    const home = aHome ? ta : tb;
    const away = aHome ? tb : ta;
    const r = predictMatch(home.rating, away.rating, venue === 'neutral', params);
    const pA = aHome ? r.pHome : 1 - r.pHome;
    const s = r.sets;
    const forA = aHome
      ? { '3-0': s.home_3_0, '3-1': s.home_3_1, '3-2': s.home_3_2 }
      : { '3-0': s.away_3_0, '3-1': s.away_3_1, '3-2': s.away_3_2 };
    const forB = aHome
      ? { '3-0': s.away_3_0, '3-1': s.away_3_1, '3-2': s.away_3_2 }
      : { '3-0': s.home_3_0, '3-1': s.home_3_1, '3-2': s.home_3_2 };
    return { pA, forA, forB };
  }, [ta, tb, venue, params]);

  const sel = 'w-full border-2 border-ink bg-card px-3 py-2.5 text-base';
  const options = teams.map((t) => (
    <option key={t.id} value={t.id}>
      {t.name} ({t.conference_name}, #{t.rank})
    </option>
  ));

  return (
    <div className="border-2 border-ink bg-card p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Team A
          <select className={`${sel} mt-1`} value={a} onChange={(e) => setA(e.target.value)}>
            {options}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Team B
          <select className={`${sel} mt-1`} value={b} onChange={(e) => setB(e.target.value)}>
            {options}
          </select>
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">Where is it played?</legend>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {(
            [
              ['neutral', 'Neutral floor'],
              ['a', 'Team A at home'],
              ['b', 'Team B at home'],
            ] as [Venue, string][]
          ).map(([v, label]) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="venue" checked={venue === v} onChange={() => setVenue(v)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6" aria-live="polite">
        {same ? (
          <p className="font-semibold">Pick two different teams.</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="cond text-xl font-semibold leading-tight">{ta.name}</p>
                <p className="display num text-5xl">{pct(out.pA)}</p>
              </div>
              <div className="text-right">
                <p className="cond text-xl font-semibold leading-tight">{tb.name}</p>
                <p className="display num text-5xl">{pct(1 - out.pA)}</p>
              </div>
            </div>
            <div role="img" aria-label={`${ta.name} ${pct(out.pA)}, ${tb.name} ${pct(1 - out.pA)}`} className="relative mt-3 h-4 w-full">
              <div className="absolute inset-0 overflow-hidden rounded-[3px] bg-ball">
                <div className="h-full bg-cobalt" style={{ width: `${(out.pA * 100).toFixed(1)}%` }} />
              </div>
              <div className="absolute -bottom-1.5 -top-1.5 left-1/2 w-[2px] -translate-x-1/2 bg-ink" aria-hidden="true" />
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="data-table text-sm">
                <caption className="sr-only">Chance of each set score</caption>
                <thead>
                  <tr>
                    <th scope="col">Final set score</th>
                    <th scope="col" className="r">{ta.name} wins</th>
                    <th scope="col" className="r">{tb.name} wins</th>
                  </tr>
                </thead>
                <tbody>
                  {(['3-0', '3-1', '3-2'] as const).map((k) => (
                    <tr key={k}>
                      <td className="num font-semibold">{k}</td>
                      <td className="r num">{pct(out.forA[k])}</td>
                      <td className="r num">{pct(out.forB[k])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-muted">
              Ratings: {ta.name} {ta.rating.toFixed(2)} (rank {ta.rank}), {tb.name} {tb.rating.toFixed(2)} (rank {tb.rank}). Home court adds{' '}
              {params.home_logit.toFixed(2)} to the host&apos;s per-set log-odds. This is a what-if, not a logged prediction.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
