import Link from 'next/link';
import { config } from '@/kit/config';
import { buildMetadata } from '@/kit/seo/metadata';
import { backtest, deadline, ledger, ratings, recordSummary, type LedgerRow } from '@/site/data';
import { american, dayDate, etTime, ordinal, pct, shortDate, signed } from '@/site/format';
import { linkIndex } from '@/site/pages';
import { NetBar, RgLine, SetLadder, Stat } from '@/site/ui';

export const revalidate = 3600;

export const metadata = buildMetadata({
  path: '/',
  title: `${config.name}: College Volleyball Predictions, Graded in Public`,
  description: config.description,
});

/** The best matchup on the board: the highest combined rating, so both teams are good. */
function marquee(upcoming: LedgerRow[], r: Map<string, number>): LedgerRow | undefined {
  return [...upcoming].sort((a, b) => (r.get(b.home)! + r.get(b.away)!) - (r.get(a.home)! + r.get(a.away)!))[0];
}

export default function Home() {
  const index = linkIndex();
  const snap = ratings();
  const rec = recordSummary();
  const bt = backtest();
  const now = Date.now();
  const rows = ledger();
  const upcoming = rows.filter((x) => !x.grade && deadline(x) > now).sort((a, b) => (a.start ?? a.date).localeCompare(b.start ?? b.date));
  const rating = new Map(snap.teams.map((t) => [t.id, t.rating]));
  const m = marquee(upcoming, rating);
  const next = upcoming.filter((x) => x.id !== m?.id).slice(0, 6);
  const hockey = index.get('/hockey/predictions');

  return (
    <div>
      <section className="grid gap-10 lg:grid-cols-[1fr_minmax(0,30rem)] lg:items-end">
        <div>
          <h1 className="display text-[3.4rem] leading-[0.92] sm:text-[5.2rem]">The number before first serve. The grade after.</h1>
          <p className="mt-5 max-w-xl text-lg">
            Win probabilities and set-score odds for every D1 women&apos;s volleyball match, from a rating model we publish in full.
            Every prediction is logged in advance and graded in public, losses included.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/volleyball/predictions" className="bg-ink px-5 py-3 font-semibold text-white hover:bg-cobalt-deep">
              See the predictions
            </Link>
            <Link href="/methodology" className="border-2 border-ink px-5 py-2.5 font-semibold hover:bg-card">
              Read the model
            </Link>
          </div>
        </div>

        {m ? (
          <div className="border-2 border-ink bg-card p-5 sm:p-6">
            <p className="text-sm font-semibold text-muted">
              Best matchup on the board, {dayDate(m.date)}, {etTime(m.start, m.start_known)}
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="cond text-xl font-semibold leading-tight">{m.away_name}</p>
                <p className="display num text-5xl">{pct(1 - m.p_home)}</p>
              </div>
              <div className="text-right">
                <p className="cond text-xl font-semibold leading-tight">{m.home_name}</p>
                <p className="display num text-5xl">{pct(m.p_home)}</p>
              </div>
            </div>
            <div className="mt-3">
              <NetBar size="lg" pAway={1 - m.p_home} label={`${m.away_name} ${pct(1 - m.p_home)}, ${m.home_name} ${pct(m.p_home)}`} />
            </div>
            <div className="mt-6">
              <SetLadder sets={m.sets} away={m.away_name} home={m.home_name} />
            </div>
            <p className="mt-4 text-sm text-muted">
              Fair line: {m.away_name} {american(m.fair_away)}, {m.home_name} {american(m.fair_home)}. Ranked {ordinal(m.away_rank)} and{' '}
              {ordinal(m.home_rank)} of {snap.params.teams} by our model.
              {m.gamePath ? (
                <>
                  {' '}
                  <Link href={m.gamePath} className="font-semibold text-ink underline">
                    Full preview
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="board" className="mt-16 grid gap-12 lg:grid-cols-[1fr_22rem]">
        <div>
          <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
            <h2 id="board" className="display text-3xl">
              Next on the board
            </h2>
            <Link href="/volleyball/predictions" className="text-sm font-semibold underline">
              All {upcoming.length} matches
            </Link>
          </div>
          {next.length ? (
            <ul className="divide-y divide-line">
              {next.map((p) => (
                <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-3">
                  <p className="text-sm">
                    <span className="font-semibold">{p.away_name}</span> at <span className="font-semibold">{p.home_name}</span>
                    <span className="block text-xs text-muted">
                      {shortDate(p.date)}, {etTime(p.start, p.start_known)}
                    </span>
                  </p>
                  <p className="display num text-right text-2xl">
                    {pct(Math.max(p.p_home, 1 - p.p_home), 0)}
                    <span className="block text-xs font-normal text-muted" style={{ fontVariationSettings: "'wdth' 100" }}>
                      {p.p_home >= 0.5 ? p.home_name : p.away_name}
                    </span>
                  </p>
                  <div className="col-span-2">
                    <NetBar pAway={1 - p.p_home} label={`${p.away_name} ${pct(1 - p.p_home)}, ${p.home_name} ${pct(p.p_home)}`} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4">The board is empty until the next match day. The ratings below are current.</p>
          )}
        </div>

        <aside aria-labelledby="record" className="self-start border-2 border-ink bg-card p-5">
          <h2 id="record" className="display text-3xl">
            The record
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-5">
            <Stat value={`${rec.wins}-${rec.losses}`} label="Favorites won-lost" />
            <Stat value={String(rec.pending)} label="Pending" />
          </div>
          <p className="mt-4 text-sm">
            {rec.graded
              ? `${rec.graded} graded so far, Brier score ${rec.brier!.toFixed(3)}.`
              : 'It starts at zero. No backfilled wins, no preseason placeholders: the first grades land when the first logged matches finish.'}
          </p>
          <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
            For a sense of scale, the same model run walk-forward over {bt.result.matches.toLocaleString('en-US')} matches this season picked the
            winner {pct(bt.result.accuracy)} of the time. That backtest never counts toward the record.
          </p>
          <Link href="/results" className="mt-3 inline-block font-semibold underline">
            Every prediction, graded
          </Link>
        </aside>
      </section>

      <section aria-labelledby="top" className="mt-16">
        <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
          <h2 id="top" className="display text-3xl">
            Top ten right now
          </h2>
          <Link href="/volleyball/ratings" className="text-sm font-semibold underline">
            All {snap.params.teams} teams
          </Link>
        </div>
        <ol className="mt-2 grid gap-x-10 sm:grid-cols-2">
          {snap.teams.slice(0, 10).map((t) => (
            <li key={t.id} className="flex items-baseline gap-3 border-b border-line py-2">
              <span className="display num w-8 text-2xl">{t.rank}</span>
              <span className="flex-1 font-semibold">
                {t.name} <span className="font-normal text-muted">{t.conference_name}</span>
              </span>
              <span className="num text-sm">
                {t.wins}-{t.losses}
              </span>
              <span className="num w-14 text-right text-sm font-semibold">{signed(t.rating)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm text-muted">
          Ratings as of {shortDate(snap.as_of)}, from {snap.params.matches_used.toLocaleString('en-US')} D1 matches on the NCAA.com scoreboard.
        </p>
      </section>

      <section aria-labelledby="next" className="mt-16 grid gap-8 sm:grid-cols-3">
        <h2 id="next" className="sr-only">
          What we cover
        </h2>
        <div>
          <p className="display text-2xl">Volleyball</p>
          <p className="mt-1 text-sm">Live now, through the NCAA tournament in December.</p>
        </div>
        <div>
          <p className="display text-2xl">Hockey, then women&apos;s basketball</p>
          <p className="mt-1 text-sm">
            Next, each once its model is backtested.
            {hockey ? (
              <>
                {' '}
                <Link href={hockey.path} className="underline">
                  Hockey status
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div>
          <p className="display text-2xl">Baseball, February 2027</p>
          <p className="mt-1 text-sm">The flagship, built over the winter.</p>
        </div>
      </section>

      <div className="mt-12 border-l-4 border-ball bg-card px-4 py-3">
        <RgLine />
      </div>
    </div>
  );
}
