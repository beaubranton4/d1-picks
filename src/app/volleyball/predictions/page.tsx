import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { Faq } from '@/kit/components/Faq';
import { releasedOnly } from '@/kit/release';
import { buildMetadata } from '@/kit/seo/metadata';
import { deadline, ledger, ratings, type LedgerRow } from '@/site/data';
import { dayDate, etStamp, shortDate } from '@/site/format';
import { linkIndex } from '@/site/pages';
import { SlateRow } from '@/site/slate';
import { RgLine } from '@/site/ui';

const PATH = '/volleyball/predictions';

export const revalidate = 3600;

export function generateMetadata() {
  const page = linkIndex().get(PATH)!;
  return buildMetadata({ path: PATH, title: page.title, description: page.description! });
}

const FAQ = [
  {
    question: 'How are these volleyball predictions made?',
    answer:
      'From a Bradley-Terry rating model fit to every D1 versus D1 set played this season, with a home-court term, then calibrated against the model\'s own out-of-sample record. The methodology page has the full math and the backtest.',
  },
  {
    question: 'What is a fair line?',
    answer:
      'Our win probability converted to American odds with no bookmaker margin added. It shows what the probability is worth as a price. It is not a bet recommendation.',
  },
  {
    question: 'Do you make betting picks?',
    answer:
      'Not yet. We publish probabilities, set-score odds and fair lines, but we quote no sportsbook or prediction-market prices, so no match carries a bet call.',
  },
  {
    question: 'Do the predictions change before a match?',
    answer:
      'No. Each match is predicted once, up to two days before first serve, and that number is the one we grade on the results page, win or lose.',
  },
  {
    question: 'Is betting on college volleyball legal?',
    answer:
      'Sports betting is legal only in some states, and some states restrict college markets. Check your state\'s law. D1 Picks is for adults 21 and over and takes no bets.',
  },
];

function groupByDate(rows: LedgerRow[]) {
  const out = new Map<string, LedgerRow[]>();
  for (const r of [...rows].sort((a, b) => (a.start ?? a.date).localeCompare(b.start ?? b.date))) {
    out.set(r.date, [...(out.get(r.date) ?? []), r]);
  }
  return [...out.entries()];
}

export default function VolleyballPredictions() {
  const index = linkIndex();
  const now = Date.now();
  const rows = ledger();
  const snap = ratings();
  const upcoming = rows.filter((r) => !r.grade && deadline(r) > now);
  const awaiting = rows.filter((r) => !r.grade && deadline(r) <= now);
  const recent = rows.filter((r) => r.grade?.status === 'graded').slice(0, 8);
  const days = groupByDate(upcoming);
  const previews = releasedOnly(index.children(PATH));
  const upcomingPreviewPaths = new Set(upcoming.map((r) => r.gamePath).filter(Boolean));

  return (
    <div>
      <Breadcrumbs items={index.breadcrumbs(PATH)} />
      <header className="mt-4 max-w-3xl">
        <h1 className="display text-5xl sm:text-6xl">College volleyball predictions</h1>
        <p className="mt-4 text-lg">
          {upcoming.length
            ? `${upcoming.length} D1 women's volleyball ${upcoming.length === 1 ? 'match' : 'matches'} on the board, each with a win probability, set-score odds and a fair line.`
            : 'No D1 matches are on the board right now.'}{' '}
          Every number here was logged before first serve and gets graded on the <Link href="/results" className="underline">results page</Link>.
        </p>
        <p className="mt-2 text-sm text-muted">
          Ratings as of {shortDate(snap.as_of)}, from {snap.params.matches_used.toLocaleString('en-US')} D1 matches. Board updated{' '}
          {etStamp(snap.generated_at)}. Model {snap.model}.
        </p>
      </header>

      <div className="mt-6 border-l-4 border-ball bg-card px-4 py-3">
        <RgLine />
      </div>

      {days.length ? (
        days.map(([date, list]) => (
          <section key={date} aria-labelledby={`d-${date}`} className="mt-10">
            <h2 id={`d-${date}`} className="display border-b-2 border-ink pb-2 text-3xl">
              {dayDate(date)}
            </h2>
            <ul>
              {list.map((p) => (
                <SlateRow key={p.id} p={p} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <section className="mt-10 max-w-2xl">
          <h2 className="display text-3xl">Nothing on the board</h2>
          <p className="mt-2">
            The next predictions go up the morning of the next match day, up to two days ahead. Meanwhile the{' '}
            <Link href="/volleyball/ratings" className="underline">ratings</Link> show where every team stands.
          </p>
        </section>
      )}

      {awaiting.length ? (
        <section aria-labelledby="awaiting" className="mt-12">
          <h2 id="awaiting" className="display border-b-2 border-ink pb-2 text-3xl">
            Played, waiting on a grade
          </h2>
          <p className="mt-2 text-sm text-muted">These matches have started. Grades land on the results page after the next update.</p>
          <ul>
            {awaiting.map((p) => (
              <SlateRow key={p.id} p={p} />
            ))}
          </ul>
        </section>
      ) : null}

      {recent.length ? (
        <section aria-labelledby="recent" className="mt-12">
          <h2 id="recent" className="display border-b-2 border-ink pb-2 text-3xl">
            Latest grades
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span>
                  {r.away_name} at {r.home_name}, {shortDate(r.date)}
                </span>
                <span className={`font-semibold ${r.grade!.correct ? 'text-hit' : 'text-miss'}`}>{r.grade!.correct ? 'Hit' : 'Miss'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            <Link href="/results" className="font-semibold underline">
              Full record and calibration
            </Link>
          </p>
        </section>
      ) : null}

      <section aria-labelledby="previews" className="mt-12 max-w-3xl">
        <h2 id="previews" className="display border-b-2 border-ink pb-2 text-3xl">
          Match previews
        </h2>
        {previews.length ? (
          <ul className="mt-3 space-y-2">
            {previews.map((g) => (
              <li key={g.path}>
                <Link href={g.path} className="font-semibold underline">
                  {g.title}
                </Link>
                {upcomingPreviewPaths.has(g.path) ? <span className="ml-2 text-sm text-muted">upcoming</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3">
            No match on the board clears the bar for a full preview yet. Previews go up for matchups between two AVCA-ranked
            teams, two of our top 40, matchups people search for and the NCAA tournament, at most five a day. The{' '}
            <Link href="/methodology#game-pages" className="underline">methodology</Link> explains the rule.
          </p>
        )}
      </section>

      <div className="max-w-3xl">
        <Faq items={FAQ} title="Questions about these predictions" />
      </div>
    </div>
  );
}
