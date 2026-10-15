import Link from 'next/link';
import { ratings, recordSummary } from '@/site/data';
import { pct, shortDate } from '@/site/format';

/**
 * Live pairing for every guide: the top of our own ratings table and the size
 * of the graded record, read from the pipeline's saved output (src/site/data.ts).
 * Nothing here is written by the growth loop and no number is typed in.
 */
export function ModelSnapshot() {
  const s = ratings();
  const top = s.teams.slice(0, 5);
  const rec = recordSummary();
  return (
    <aside aria-label="From our model" className="not-prose mt-10 bg-card p-4">
      <h2 className="display text-2xl">From our model, updated daily</h2>
      <p className="mt-1 text-sm text-muted">
        Ratings use {s.params.matches_used.toLocaleString('en-US')} D1 matches through {shortDate(s.params.results_through)}. A rating is
        a strength estimate, not a prediction of any match.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="data-table text-sm">
          <caption className="sr-only">Top five teams in the D1 Picks volleyball ratings</caption>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Team</th>
              <th scope="col" className="r">Beats an average D1 team</th>
            </tr>
          </thead>
          <tbody>
            {top.map((t) => (
              <tr key={t.id}>
                <td className="num">{t.rank}</td>
                <td>{t.name}</td>
                <td className="r num">{pct(t.match_win_vs_avg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm">
        <Link href="/volleyball/ratings" className="underline">All {s.params.teams} team ratings</Link>
        {rec.graded > 0 ? (
          <>
            {' '}
            ·{' '}
            <Link href="/results" className="underline">{rec.graded} graded predictions, every one logged before first serve</Link>
          </>
        ) : (
          <>
            {' '}
            ·{' '}
            <Link href="/results" className="underline">Our results ledger</Link>
          </>
        )}
      </p>
    </aside>
  );
}
