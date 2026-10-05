import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { RelatedLinks } from '@/kit/components/RelatedLinks';
import { absoluteUrl, authorPath, getAuthor } from '@/kit/config';
import { getCollection, getEntry } from '@/kit/content';
import { Mdx } from '@/kit/mdx';
import { assertReleased } from '@/kit/release';
import { JsonLd } from '@/kit/seo/jsonld';
import { buildMetadata } from '@/kit/seo/metadata';
import { gameFacts, ledger, type GameFacts } from '@/site/data';
import { american, dayDate, etStamp, etTime, ordinal, pct, shortDate, signed } from '@/site/format';
import { linkIndex } from '@/site/pages';
import { NetBar, RgLine, SetLadder, SourceLink } from '@/site/ui';

const COLLECTION = 'volleyballGames';

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return getCollection(COLLECTION).map((e) => ({ slug: e.slug }));
}

function load(slug: string) {
  const entry = getEntry(COLLECTION, slug);
  const facts = gameFacts(slug);
  if (!entry || !facts) notFound();
  return { entry, facts };
}

export async function generateMetadata({ params }: PageProps<'/volleyball/predictions/[slug]'>) {
  const { entry } = load((await params).slug);
  assertReleased(entry.path);
  return buildMetadata({ path: entry.path, title: entry.title, description: entry.description });
}

/** schema.org SportsEvent for the match. No author or rating claims: the page is model output. */
function sportsEvent(f: GameFacts, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${f.away.name} at ${f.home.name}, women's volleyball`,
    sport: 'Volleyball',
    startDate: f.start_known && f.start ? f.start : f.date,
    url: absoluteUrl(path),
    homeTeam: { '@type': 'SportsTeam', name: f.home.name },
    awayTeam: { '@type': 'SportsTeam', name: f.away.name },
    sameAs: f.url,
  };
}

function FormTable({ team }: { team: GameFacts['home'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table text-sm">
        <caption className="mb-2 text-left font-semibold">{team.name}: last five D1 matches</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Opponent</th>
            <th scope="col">Result</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody className="bg-card">
          {[...team.recent].reverse().map((m) => (
            <tr key={m.url}>
              <td className="num whitespace-nowrap">{shortDate(m.date)}</td>
              <td>
                {m.home ? 'vs' : 'at'} {m.opponent_name}
              </td>
              <td className={`num font-semibold ${m.won ? 'text-hit' : 'text-miss'}`}>
                {m.won ? 'W' : 'L'} {m.sets_for}-{m.sets_against}
              </td>
              <td>
                <SourceLink href={m.url} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function GamePage({ params }: PageProps<'/volleyball/predictions/[slug]'>) {
  const { entry, facts: f } = load((await params).slug);
  assertReleased(entry.path);
  const index = linkIndex();
  const row = ledger().find((r) => r.id === f.prediction_id);
  const g = row?.grade;
  const pAway = 1 - f.p_home;
  const author = getAuthor(entry.author);
  const homeFav = f.p_home >= 0.5;

  return (
    <article>
      <Breadcrumbs items={index.breadcrumbs(entry.path)} />
      <header className="mt-4 max-w-4xl">
        <h1 className="display text-4xl sm:text-6xl">{entry.title}</h1>
        <p className="mt-3 text-muted">
          {dayDate(f.date)}, {etTime(f.start, f.start_known)}. <SourceLink href={f.url}>Match page on NCAA.com</SourceLink>
        </p>
      </header>

      <section aria-label="Win probability" className="mt-8 border-2 border-ink bg-card p-5 sm:p-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="cond text-lg font-semibold sm:text-2xl">{f.away.name}</p>
            <p className={`display num text-5xl sm:text-7xl ${homeFav ? 'text-muted' : ''}`}>{pct(pAway)}</p>
          </div>
          <div className="text-right">
            <p className="cond text-lg font-semibold sm:text-2xl">{f.home.name}</p>
            <p className={`display num text-5xl sm:text-7xl ${homeFav ? '' : 'text-muted'}`}>{pct(f.p_home)}</p>
          </div>
        </div>
        <div className="mt-4">
          <NetBar size="lg" pAway={pAway} label={`${f.away.name} ${pct(pAway)}, ${f.home.name} ${pct(f.p_home)}`} />
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted">Fair line</dt>
            <dd className="num font-semibold">
              {f.away.name} {american(f.fair_away)}, {f.home.name} {american(f.fair_home)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Neutral floor</dt>
            <dd className="num font-semibold">
              {homeFav ? f.home.name : f.away.name} {pct(homeFav ? f.p_home_neutral : 1 - f.p_home_neutral)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Ratings</dt>
            <dd className="num font-semibold">
              {signed(f.away.rating)} ({ordinal(f.away.rank)}) / {signed(f.home.rating)} ({ordinal(f.home.rank)})
            </dd>
          </div>
          <div>
            <dt className="text-muted">Logged</dt>
            <dd className="font-semibold">{etStamp(f.predicted_at)}</dd>
          </div>
        </dl>
      </section>

      {g ? (
        <section aria-label="Result" className={`mt-6 border-l-4 bg-card p-5 ${g.status === 'graded' ? (g.correct ? 'border-hit' : 'border-miss') : 'border-line'}`}>
          {g.status === 'graded' ? (
            <p className="text-lg">
              <span className="display mr-2 text-3xl">{g.correct ? 'Hit.' : 'Miss.'}</span>
              Final: {g.winner === 'home' ? f.home.name : f.away.name} {Math.max(g.home_sets!, g.away_sets!)}-
              {Math.min(g.home_sets!, g.away_sets!)}. We had {homeFav ? f.home.name : f.away.name} at {pct(row!.pick_p)}; the exact set score was a{' '}
              {pct(g.p_set_score!)} outcome. <Link href="/results" className="underline">See the full record</Link>.
            </p>
          ) : (
            <p>This prediction was voided ({g.reason}) and does not count in the record.</p>
          )}
        </section>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,42rem)_1fr]">
        <div>
          <section aria-labelledby="sets">
            <h2 id="sets" className="display text-3xl">
              Set-score odds
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted">Each bar is one exact result, from a {f.away.name} sweep to a {f.home.name} sweep.</p>
            <SetLadder sets={f.sets} away={f.away.name} home={f.home.name} />
          </section>
          <div className="prose mt-10">
            <Mdx source={entry.body} />
          </div>
          <p className="mt-8 border-t border-line pt-4 text-sm text-muted">
            Written automatically by the D1 Picks model from the numbers on this page, logged {etStamp(f.predicted_at)} using ratings as
            of {shortDate(f.ratings_as_of)} (model {f.model}). The model and this page template are built and maintained by{' '}
            <Link href={authorPath(author.slug)} className="underline">
              {author.name}
            </Link>
            . How we publish without a human edit: <Link href="/editorial-policy" className="underline">editorial policy</Link>.
          </p>
        </div>
        <aside className="space-y-8">
          <FormTable team={f.away} />
          <FormTable team={f.home} />
          {f.h2h.length ? (
            <div>
              <p className="font-semibold">Earlier this season</p>
              <ul className="mt-2 space-y-1 text-sm">
                {f.h2h.map((m) => (
                  <li key={m.url}>
                    {shortDate(m.date)}: {m.home_sets > m.away_sets ? m.home_name : m.away_name} won {Math.max(m.home_sets, m.away_sets)}-
                    {Math.min(m.home_sets, m.away_sets)} at {m.home_name}. <SourceLink href={m.url} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="bg-card p-4 text-sm">
            <p className="font-semibold">Why this match has its own page</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {f.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 text-muted">
              Most matches stay rows on the <Link href="/volleyball/predictions" className="underline">predictions board</Link>.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-10 border-l-4 border-ball bg-card px-4 py-3">
        <RgLine />
      </div>
      <RelatedLinks links={index.related(entry.path)} title="More match previews" />
      <JsonLd data={sportsEvent(f, entry.path)} />
    </article>
  );
}
