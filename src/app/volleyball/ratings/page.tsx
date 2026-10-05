import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { buildMetadata } from '@/kit/seo/metadata';
import { ratings } from '@/site/data';
import { etStamp, ordinal, pct, shortDate, signed } from '@/site/format';
import { linkIndex } from '@/site/pages';
import { SourceLink } from '@/site/ui';

const PATH = '/volleyball/ratings';

export const revalidate = 3600;

export function generateMetadata() {
  const page = linkIndex().get(PATH)!;
  return buildMetadata({ path: PATH, title: page.title, description: page.description! });
}

function Move({ now, prev }: { now: number; prev: number | null }) {
  if (prev == null || prev === now) return <span className="text-muted">&nbsp;</span>;
  const up = prev > now;
  return (
    <span className={`num text-xs font-semibold ${up ? 'text-hit' : 'text-miss'}`} title={`Was ${ordinal(prev)}`}>
      {up ? '+' : '-'}
      {Math.abs(prev - now)}
    </span>
  );
}

export default function VolleyballRatings() {
  const index = linkIndex();
  const s = ratings();
  const top = s.teams[0];
  const hasMoves = s.teams.some((t) => t.prev_rank != null);

  return (
    <div>
      <Breadcrumbs items={index.breadcrumbs(PATH)} />
      <header className="mt-4 max-w-3xl">
        <h1 className="display text-5xl sm:text-6xl">NCAA volleyball ratings</h1>
        <p className="mt-4 text-lg">
          All {s.params.teams} D1 women&apos;s volleyball teams, rated by our model from {s.params.matches_used.toLocaleString('en-US')} D1
          matches played through {shortDate(s.params.results_through)}. {top.name} is first: against an average D1 team on a neutral
          floor, it wins {pct(top.match_win_vs_avg)} of the time.
        </p>
        <p className="mt-2 text-sm text-muted">
          Updated {etStamp(s.generated_at)}. Results from the <SourceLink href={s.source.page}>NCAA.com scoreboard</SourceLink>; poll ranks
          are the <SourceLink href={s.source.poll_page}>AVCA Coaches Poll</SourceLink> as NCAA.com shows it.
        </p>
      </header>

      <details className="mt-6 max-w-3xl bg-card p-4 text-sm">
        <summary className="cursor-pointer font-semibold">How to read this table</summary>
        <div className="mt-3 space-y-2">
          <p>
            <strong>Rating</strong> is the team&apos;s strength in log-odds per set. The gap between two ratings, plus home court, sets the
            chance of winning each set; a 0.00 team is exactly average for D1.
          </p>
          <p>
            <strong>Beats avg.</strong> is how often the team would beat an average D1 team in a best-of-five match on a neutral floor.
          </p>
          <p>
            <strong>SOS</strong> ranks the average rating of the D1 opponents a team has played, first being the toughest.{' '}
            {hasMoves ? <><strong>Move</strong> compares with the previous day&apos;s ratings. </> : null}
            Records count D1 opponents only. The full method is on the <Link href="/methodology" className="underline">methodology</Link> page.
          </p>
        </div>
      </details>

      <div className="mt-6 max-h-[80vh] overflow-auto border-2 border-ink bg-card">
        <table className="data-table text-sm">
          <caption className="sr-only">D1 women&apos;s volleyball ratings, {s.as_of}</caption>
          <thead>
            <tr>
              <th scope="col" className="r">Rank</th>
              {hasMoves ? <th scope="col">Move</th> : null}
              <th scope="col">Team</th>
              <th scope="col">Conference</th>
              <th scope="col" className="r">Rating</th>
              <th scope="col" className="r">Beats avg.</th>
              <th scope="col" className="r">D1 record</th>
              <th scope="col" className="r">Sets</th>
              <th scope="col">Last 5</th>
              <th scope="col" className="r">SOS</th>
              <th scope="col" className="r">AVCA</th>
            </tr>
          </thead>
          <tbody>
            {s.teams.map((t) => (
              <tr key={t.id}>
                <td className="r num font-semibold">{t.rank}</td>
                {hasMoves ? (
                  <td>
                    <Move now={t.rank} prev={t.prev_rank} />
                  </td>
                ) : null}
                <td className="whitespace-nowrap font-semibold">{t.name}</td>
                <td className="whitespace-nowrap text-muted">{t.conference_name}</td>
                <td className="r num">{signed(t.rating)}</td>
                <td className="r num">{pct(t.match_win_vs_avg)}</td>
                <td className="r num">
                  {t.wins}-{t.losses}
                </td>
                <td className="r num">
                  {t.sets_won}-{t.sets_lost}
                </td>
                <td className="num tracking-wider">
                  {[...t.last5].map((c, i) => (
                    <span key={i} className={c === 'W' ? 'text-hit' : 'text-miss'}>
                      {c}
                    </span>
                  ))}
                </td>
                <td className="r num">{t.sos_rank ?? ''}</td>
                <td className="r num">{t.avca_rank ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted">
        Want the matchups these ratings imply? The <Link href="/volleyball/predictions" className="underline">predictions board</Link> turns any two
        ratings into a win probability and set-score odds.
      </p>
    </div>
  );
}
