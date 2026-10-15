'use client';

import { useMemo, useState } from 'react';
import { pct } from './format';
import { podTeams, simulateBracket, STAGES, type ModelParams } from './sim';

export type BracketTeam = { id: string; name: string; conference_name: string; rating: number; rank: number };

const TRIAL_CHOICES = [5000, 20000, 50000];

/**
 * The 64-team bracket, simulated in the browser from the saved ratings. The
 * first render uses the projected field and the same seed as the server, so
 * the numbers on the page before any click are the numbers a crawler sees.
 */
export function BracketSimulator({
  teams,
  defaultField,
  params,
  seed,
  defaultTrials,
}: {
  teams: BracketTeam[];
  defaultField: string[];
  params: ModelParams;
  seed: number;
  defaultTrials: number;
}) {
  const byId = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const [field, setField] = useState<string[]>(defaultField);
  const [hostEdge, setHostEdge] = useState(true);
  const [trials, setTrials] = useState(defaultTrials);
  const [out, setOut] = useState('');
  const [inn, setIn] = useState('');

  // Seeds follow rating, best first, whoever is in the field.
  const seeded = useMemo(() => [...field].map((id) => byId.get(id)!).sort((a, b) => b.rating - a.rating), [field, byId]);
  const odds = useMemo(() => simulateBracket(seeded.map((t) => t.rating), params, { trials, seed, hostEdge }), [seeded, params, trials, seed, hostEdge]);

  const rows = seeded.map((t, i) => ({ t, seed: i + 1, o: odds[i] })).sort((a, b) => b.o[5] - a.o[5] || a.seed - b.seed);
  const outside = teams.filter((t) => !field.includes(t.id));
  const changed = field.some((id) => !defaultField.includes(id));
  const sel = 'w-full border-2 border-ink bg-card px-3 py-2 text-sm';

  function swap() {
    if (!out || !inn) return;
    setField((f) => f.map((id) => (id === out ? inn : id)));
    setOut('');
    setIn('');
  }

  return (
    <div>
      <div className="border-2 border-ink bg-card p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-sm font-semibold">
            Take a team out of the field
            <select className={`${sel} mt-1`} value={out} onChange={(e) => setOut(e.target.value)}>
              <option value="">Choose a team in the field</option>
              {seeded.map((t, i) => (
                <option key={t.id} value={t.id}>
                  #{i + 1} {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Put a team in
            <select className={`${sel} mt-1`} value={inn} onChange={(e) => setIn(e.target.value)}>
              <option value="">Choose a team outside the field</option>
              {outside.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.conference_name}, #{t.rank})
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={swap} disabled={!out || !inn} className="bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-cobalt-deep disabled:opacity-40">
            Swap
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={hostEdge} onChange={(e) => setHostEdge(e.target.checked)} />
            Home court for the host in rounds one and two
          </label>
          <label className="flex items-center gap-2">
            Simulations
            <select className="border-2 border-ink bg-card px-2 py-1" value={trials} onChange={(e) => setTrials(Number(e.target.value))}>
              {TRIAL_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString('en-US')}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setField(defaultField);
              setHostEdge(true);
              setTrials(defaultTrials);
            }}
            disabled={!changed && hostEdge && trials === defaultTrials}
            className="border-2 border-ink px-3 py-1 font-semibold hover:bg-ball-soft disabled:opacity-40"
          >
            Reset to the projected field
          </button>
        </div>
        <p className="mt-3 text-xs text-muted" aria-live="polite">
          {changed ? 'Custom field. ' : 'Projected field. '}
          {trials.toLocaleString('en-US')} simulated tournaments, fixed seed {seed}, so a reload gives the same numbers.
        </p>
      </div>

      <div className="mt-6 max-h-[80vh] overflow-auto border-2 border-ink bg-card">
        <table className="data-table text-sm">
          <caption className="sr-only">Chance of reaching each round, 64-team bracket, sorted by title chance</caption>
          <thead>
            <tr>
              <th scope="col" className="r">Seed</th>
              <th scope="col">Team</th>
              {STAGES.map((s) => (
                <th key={s} scope="col" className="r">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ t, seed: s, o }) => (
              <tr key={t.id}>
                <td className="r num font-semibold">{s}</td>
                <td className="whitespace-nowrap font-semibold">
                  {t.name}
                  <span className="ml-2 text-xs font-normal text-muted">{t.conference_name}</span>
                </td>
                {o.map((p, i) => (
                  <td key={i} className={`r num ${i === 5 ? 'font-semibold' : ''}`}>
                    {p >= 0.9995 ? '100%' : p < 0.0005 ? '<0.1%' : pct(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mt-6 border-2 border-line bg-card p-4 text-sm">
        <summary className="cursor-pointer font-semibold">The 16 pods this field makes</summary>
        <ol className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {Array.from({ length: 16 }, (_, s) => {
            const [host, b, weak, mid] = podTeams(s);
            return (
              <li key={s}>
                <span className="font-semibold">Pod {s + 1}</span> (hosted by {seeded[host].name}):{' '}
                {seeded[host].name} v {seeded[weak].name}; {seeded[b].name} v {seeded[mid].name}
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
