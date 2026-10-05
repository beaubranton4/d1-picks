import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { buildMetadata } from '@/kit/seo/metadata';
import { backtest, ledger, recordSummary } from '@/site/data';
import { etStamp, etToday, pct, shortDate } from '@/site/format';
import { linkIndex } from '@/site/pages';
import { RgLine, SourceLink, Stat } from '@/site/ui';

const PATH = '/results';
const SHOW = 300;

export const revalidate = 3600;

export function generateMetadata() {
  const page = linkIndex().get(PATH)!;
  return buildMetadata({ path: PATH, title: page.title, description: page.description! });
}

function CalibrationTable({ rows, caption }: { rows: { bucket: string; matches: number; predicted: number; won: number }[]; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table max-w-xl text-sm">
        <caption className="mb-2 text-left text-sm text-muted">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Favorite&apos;s probability</th>
            <th scope="col" className="r">Matches</th>
            <th scope="col" className="r">Average predicted</th>
            <th scope="col" className="r">Favorite won</th>
          </tr>
        </thead>
        <tbody className="bg-card">
          {rows.map((c) => (
            <tr key={c.bucket}>
              <td className="num">{c.bucket}%</td>
              <td className="r num">{c.matches}</td>
              <td className="r num">{pct(c.predicted)}</td>
              <td className="r num font-semibold">{pct(c.won)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Results() {
  const index = linkIndex();
  const rec = recordSummary();
  const rows = ledger();
  const bt = backtest();
  const shown = rows.slice(0, SHOW);

  return (
    <div>
      <Breadcrumbs items={index.breadcrumbs(PATH)} />
      <header className="mt-4 max-w-3xl">
        <h1 className="display text-5xl sm:text-6xl">Prediction results</h1>
        <p className="mt-4 text-lg">
          Every prediction we publish is written to an append-only log before first serve, then graded against the final from
          NCAA.com. Nothing is edited, deleted or backfilled. The record started at zero
          {rec.firstLogged ? ` with the first logged prediction on ${shortDate(etToday(new Date(rec.firstLogged)))}` : ''}.
        </p>
      </header>

      <section aria-labelledby="record" className="mt-8 border-2 border-ink bg-card p-6">
        <h2 id="record" className="sr-only">
          Live record
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat value={`${rec.wins}-${rec.losses}`} label="Favorites won-lost" note="Our pick is the side we gave over 50%" />
          <Stat value={String(rec.pending)} label="Pending" note={`${rec.logged} logged, ${rec.void} void`} />
          <Stat value={rec.brier == null ? 'None yet' : rec.brier.toFixed(3)} label="Brier score" note="Lower is better; a coin flip scores 0.250" />
          <Stat value={rec.logLoss == null ? 'None yet' : rec.logLoss.toFixed(3)} label="Log loss" note="Lower is better; a coin flip scores 0.693" />
        </div>
        {rec.graded === 0 ? (
          <p className="mt-6 border-t border-line pt-4">
            No prediction has been graded yet. The first grades land after the first logged matches finish
            {rows.length ? `, starting with ${rows[rows.length - 1].away_name} at ${rows[rows.length - 1].home_name} on ${shortDate(rows[rows.length - 1].date)}` : ''}.
          </p>
        ) : null}
        <p className="mt-4 text-sm text-muted">
          We quote no prices, so there is no units or ROI line: grading is on whether the favorite won and on how good the
          probability was (Brier score and log loss).
        </p>
      </section>

      {rec.calibration.length ? (
        <section aria-labelledby="live-cal" className="mt-10">
          <h2 id="live-cal" className="display text-3xl">
            Calibration, live
          </h2>
          <p className="mt-1 mb-4 max-w-2xl">If the model is honest, the favorite should win about as often as we said it would in each band.</p>
          <CalibrationTable
            caption={`${rec.graded} graded predictions`}
            rows={rec.calibration.map((c) => ({ bucket: c.bucket, matches: c.matches, predicted: c.avgPredicted, won: c.favoriteWon }))}
          />
        </section>
      ) : null}

      <section aria-labelledby="ledger" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="ledger" className="display text-3xl">
            The ledger
          </h2>
          <a href="/results/volleyball-predictions.csv" className="font-semibold underline">
            Download every prediction (CSV)
          </a>
        </div>
        <p className="mt-1 mb-4 text-sm text-muted">
          {rows.length > SHOW ? `The latest ${SHOW} of ${rows.length}; the CSV has all of them.` : `${rows.length} predictions, newest first.`} Times are
          Eastern.
        </p>
        <div className="max-h-[75vh] overflow-auto border-2 border-ink bg-card">
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th scope="col">Match date</th>
                <th scope="col">Match</th>
                <th scope="col">Our pick</th>
                <th scope="col" className="r">Prob.</th>
                <th scope="col">Logged</th>
                <th scope="col">Result</th>
                <th scope="col" className="r">Brier</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const g = r.grade;
                const pickName = r.pick === 'home' ? r.home_name : r.away_name;
                return (
                  <tr key={r.id}>
                    <td className="num whitespace-nowrap">{shortDate(r.date)}</td>
                    <td className="whitespace-nowrap">
                      {r.gamePath ? (
                        <Link href={r.gamePath} className="underline">
                          {r.away_name} at {r.home_name}
                        </Link>
                      ) : (
                        <>
                          {r.away_name} at {r.home_name}
                        </>
                      )}
                    </td>
                    <td className="whitespace-nowrap font-semibold">{pickName}</td>
                    <td className="r num">{pct(r.pick_p)}</td>
                    <td className="num whitespace-nowrap text-muted">{etStamp(r.predicted_at)}</td>
                    <td className="whitespace-nowrap">
                      {!g ? (
                        <span className="text-muted">Pending</span>
                      ) : g.status === 'void' ? (
                        <span className="text-muted">Void ({g.reason})</span>
                      ) : (
                        <SourceLink href={g.url}>
                          <span className={`font-semibold ${g.correct ? 'text-hit' : 'text-miss'}`}>{g.correct ? 'Hit' : 'Miss'}</span>{' '}
                          <span className="num">
                            {g.winner === 'home' ? r.home_name : r.away_name} {Math.max(g.home_sets!, g.away_sets!)}-{Math.min(g.home_sets!, g.away_sets!)}
                          </span>
                        </SourceLink>
                      )}
                    </td>
                    <td className="r num">{g?.brier != null ? g.brier.toFixed(3) : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="backtest" className="mt-14 border-t-2 border-dashed border-muted pt-8">
        <h2 id="backtest" className="display text-3xl">
          Backtest: not part of the record
        </h2>
        <p className="mt-2 max-w-3xl">
          Before trusting the live record, here is how the same model would have done this season if it had been running. Each match
          day from {shortDate(bt.first_day)} to {shortDate(bt.last_day)} was predicted by a model fit only on earlier days, with the
          calibration also fit only on earlier days. These {bt.result.matches.toLocaleString('en-US')} matches never count above.
        </p>
        <dl className="mt-6 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-muted">Favorite won</dt>
            <dd className="display num text-4xl">{pct(bt.result.accuracy)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Brier score</dt>
            <dd className="display num text-4xl">{bt.result.brier.toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Log loss</dt>
            <dd className="display num text-4xl">{bt.result.log_loss.toFixed(3)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Home team won</dt>
            <dd className="display num text-4xl">{pct(bt.result.home_team_won)}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <CalibrationTable
            caption={`Walk-forward backtest, ${bt.result.matches.toLocaleString('en-US')} D1 matches, generated ${etStamp(bt.generated_at)}`}
            rows={bt.result.calibration.map((c) => ({ bucket: c.bucket, matches: c.matches, predicted: c.avg_predicted, won: c.favorite_won }))}
          />
        </div>
        <p className="mt-4 max-w-3xl text-sm text-muted">
          The model&apos;s one tuned setting, the strength of the prior, was picked as the best of six values on this same backtest, so
          these numbers flatter the model slightly. The live record is the real test. Details on the{' '}
          <Link href="/methodology#backtest" className="underline">methodology</Link> page.
        </p>
      </section>

      <div className="mt-10 border-l-4 border-ball bg-card px-4 py-3">
        <RgLine />
      </div>
    </div>
  );
}
