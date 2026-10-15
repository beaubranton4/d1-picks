import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { Faq } from '@/kit/components/Faq';
import { assertReleased } from '@/kit/release';
import { buildMetadata } from '@/kit/seo/metadata';
import { ratings } from '@/site/data';
import { fieldProjection, NCAA_FIELD, NO_AUTO_BID, rpiTable, SIM } from '@/site/derived';
import { pct, shortDate } from '@/site/format';
import { linkIndex } from '@/site/pages';
import { Assumptions, Byline, DatasetLd, DownloadLink, MoreData } from '@/site/toolkit';
import { RgLine, SourceLink } from '@/site/ui';

const PATH = '/volleyball/ncaa-tournament-predictions';
const CSV_PATH = `${PATH}/field.csv`;
const NCAA_PAGE = 'https://www.ncaa.com/championships/volleyball-women/d1/road-to-the-championship';

export const revalidate = 3600;

export function generateMetadata() {
  assertReleased(PATH);
  const page = linkIndex().get(PATH) ?? { title: 'NCAA Volleyball Bracketology', description: '' };
  return buildMetadata({ path: PATH, title: page.title, description: page.description! });
}

const share = (p: number) => (p >= 0.9995 ? '100%' : p < 0.0005 ? '0%' : p < 0.01 ? '<1%' : pct(p, 0));

export default function TournamentField() {
  assertReleased(PATH);
  const index = linkIndex();
  const s = ratings();
  const proj = fieldProjection();
  const byId = new Map(s.teams.map((t) => [t.id, t]));
  const rpi = new Map(rpiTable().rows.map((r) => [r.id, r.rank]));
  const field = proj.field.map((f, i) => ({ ...f, team: byId.get(f.id)!, seed: i + 1, p: proj.rows.get(f.id)! }));
  const inSet = new Set(field.map((f) => f.id));
  const lastIn = field.filter((f) => f.kind === 'at-large').sort((a, b) => a.p.pField - b.p.pField).slice(0, 8);
  const firstOut = s.teams
    .filter((t) => !inSet.has(t.id))
    .map((t) => ({ team: t, p: proj.rows.get(t.id)! }))
    .sort((a, b) => b.p.pField - a.p.pField)
    .slice(0, 8);
  const bids = new Map<string, { name: string; n: number }>();
  for (const f of field) {
    const b = bids.get(f.team.conference) ?? { name: f.team.conference_name, n: 0 };
    b.n++;
    bids.set(f.team.conference, b);
  }
  const byBids = [...bids.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 12);
  const lastInP = Math.min(...field.filter((f) => f.kind === 'at-large').map((f) => f.p.pField));

  const faq = [
    {
      question: 'How many teams make the NCAA volleyball tournament?',
      answer: `${NCAA_FIELD.teams} teams: ${NCAA_FIELD.auto} conference champions with automatic bids and ${NCAA_FIELD.atLarge} at-large teams chosen by the Division I committee. The 2026 bracket is announced on Nov. 29 (NCAA.com).`,
    },
    {
      question: 'How is this volleyball bracketology made?',
      answer: `We nudge every team's rating by its estimated uncertainty, simulate each conference tournament to pick the automatic qualifiers, then give the ${NCAA_FIELD.atLarge} at-large spots to the best-rated teams left. We repeat that ${SIM.fieldTrials.toLocaleString('en-US')} times and count how often each team gets in.`,
    },
    {
      question: 'Does the committee use the same ranking?',
      answer: 'No. The committee weighs the RPI and other results-based factors that we cannot see in full. We rank at-large teams by our model rating, which is why the RPI page shows where the two disagree.',
    },
  ];

  return (
    <div>
      <Breadcrumbs items={index.breadcrumbs(PATH)} />
      <header className="mt-4 max-w-3xl">
        <h1 className="display text-5xl sm:text-6xl">NCAA volleyball bracketology: the projected field</h1>
        <p className="mt-4 text-lg">
          Our projected {NCAA_FIELD.teams}-team field for the 2026 NCAA tournament: {proj.autoLeagues} automatic bids and {proj.atLargeSpots} at large, simulated
          {' '}{SIM.fieldTrials.toLocaleString('en-US')} times from our ratings. The last team in has a {pct(lastInP, 0)} chance of getting in. The real field is announced Nov. 29.
        </p>
        <Byline note={`Ratings through ${shortDate(s.params.results_through)}.`} />
        <div className="mt-5 flex flex-wrap gap-3">
          <DownloadLink href={CSV_PATH} label="Download every team's odds (CSV)" detail={`${s.params.teams} teams: chance to win the league, get an at-large bid, make the field`} />
          <Link href="/volleyball/bracket-simulator" className="border-2 border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-cobalt-deep">
            Simulate the bracket
            <span className="block text-xs font-normal text-[#d9dfeb]">Final Four and title odds for this field</span>
          </Link>
        </div>
      </header>

      <section aria-labelledby="field" className="mt-10">
        <h2 id="field" className="display text-3xl">The projected 64</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Seeds follow our model rating. &ldquo;Auto&rdquo; marks the likeliest champion of a league with an automatic bid; &ldquo;Field&rdquo; is how often the team
          is in the field across all simulations.
        </p>
        <div className="mt-3 max-h-[80vh] overflow-auto border-2 border-ink bg-card">
          <table className="data-table text-sm">
            <caption className="sr-only">Projected NCAA volleyball tournament field, {s.as_of}</caption>
            <thead>
              <tr>
                <th scope="col" className="r">Seed</th>
                <th scope="col">Team</th>
                <th scope="col">Conference</th>
                <th scope="col">Bid</th>
                <th scope="col" className="r">Field</th>
                <th scope="col" className="r">Win league</th>
                <th scope="col" className="r">Model rank</th>
                <th scope="col" className="r">RPI rank</th>
                <th scope="col" className="r">AVCA</th>
              </tr>
            </thead>
            <tbody>
              {field.map((f) => (
                <tr key={f.id}>
                  <td className="r num font-semibold">{f.seed}</td>
                  <td className="whitespace-nowrap font-semibold">{f.team.name}</td>
                  <td className="whitespace-nowrap text-muted">{f.team.conference_name}</td>
                  <td>{f.kind === 'auto' ? 'Auto' : 'At large'}</td>
                  <td className="r num">{share(f.p.pField)}</td>
                  <td className="r num">{share(f.p.pChampion)}</td>
                  <td className="r num">{f.team.rank}</td>
                  <td className="r num">{rpi.get(f.id) ?? ''}</td>
                  <td className="r num">{f.team.avca_rank ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="bubble" className="mt-12">
        <h2 id="bubble" className="display text-3xl">The bubble</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Lowest-odds teams in our field, and the teams just outside it. Odds this far from selection are wide: ratings move with every match
          and conference tournaments are not played yet.
        </p>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto border-2 border-ink bg-card">
            <table className="data-table text-sm">
              <caption className="p-2 text-left font-semibold">Last teams in</caption>
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  <th scope="col">Conference</th>
                  <th scope="col" className="r">Field</th>
                  <th scope="col" className="r">Record</th>
                </tr>
              </thead>
              <tbody>
                {lastIn.map((f) => (
                  <tr key={f.id}>
                    <td className="whitespace-nowrap font-semibold">{f.team.name}</td>
                    <td className="whitespace-nowrap text-muted">{f.team.conference_name}</td>
                    <td className="r num">{share(f.p.pField)}</td>
                    <td className="r num">{f.team.wins}-{f.team.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto border-2 border-ink bg-card">
            <table className="data-table text-sm">
              <caption className="p-2 text-left font-semibold">First teams out</caption>
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  <th scope="col">Conference</th>
                  <th scope="col" className="r">Field</th>
                  <th scope="col" className="r">Record</th>
                </tr>
              </thead>
              <tbody>
                {firstOut.map((o) => (
                  <tr key={o.team.id}>
                    <td className="whitespace-nowrap font-semibold">{o.team.name}</td>
                    <td className="whitespace-nowrap text-muted">{o.team.conference_name}</td>
                    <td className="r num">{share(o.p.pField)}</td>
                    <td className="r num">{o.team.wins}-{o.team.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="bids" className="mt-12 max-w-3xl">
        <h2 id="bids" className="display text-3xl">Bids by conference</h2>
        <div className="mt-3 overflow-x-auto border-2 border-ink bg-card">
          <table className="data-table text-sm">
            <caption className="sr-only">Teams in the projected field, by conference</caption>
            <thead>
              <tr>
                <th scope="col">Conference</th>
                <th scope="col" className="r">Teams in the projected field</th>
              </tr>
            </thead>
            <tbody>
              {byBids.map((b) => (
                <tr key={b.name}>
                  <td className="font-semibold">{b.name}</td>
                  <td className="r num">{b.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">
          Every league&apos;s odds are on the <Link href="/volleyball/conference-standings" className="underline">conference standings</Link> page.
        </p>
      </section>

      <div className="mt-6 max-w-3xl">
        <RgLine />
      </div>

      <Assumptions
        items={[
          <>Format and dates, from <SourceLink href={NCAA_PAGE}>NCAA.com (checked 2026-10-14)</SourceLink>: {NCAA_FIELD.teams} teams, {NCAA_FIELD.auto} automatic and {NCAA_FIELD.atLarge} at large; selection show Nov. 29; first and second rounds Dec. 3 to 5; regionals Dec. 10 to 13; semifinals and title match Dec. 17 and 20 in San Antonio.</>,
          <>Automatic bids: our feed lists {proj.autoLeagues + NO_AUTO_BID.length} leagues, the NCAA says {NCAA_FIELD.auto} bids. We assume {NO_AUTO_BID.map((k) => s.teams.find((t) => t.conference === k)?.conference_name).join(', ')} has none this year. This is our assumption, not an NCAA statement, and it moves several teams&apos; odds if wrong.</>,
          <>Each league&apos;s champion is simulated as an eight-team single-elimination bracket on neutral floors, seeded by rating. Leagues that award the bid for the regular season, or that use another format, will differ. We do not know the remaining schedules.</>,
          <>Every rating is nudged in each simulation by an estimated uncertainty (about one over the square root of 0.25 plus 0.76 per match played). That estimate is ours, not a pipeline output.</>,
          <>At-large spots go to the best-rated teams left with a winning D1 record. The committee uses the RPI and other criteria; see the <Link href="/volleyball/rpi" className="underline">RPI page</Link> for where the two differ. Fixed seed {SIM.fieldSeed}, so the page is reproducible from the saved ratings.</>,
        ]}
      />
      <Faq items={faq} />
      <MoreData current={PATH} />
      <DatasetLd path={PATH} name="NCAA women's volleyball tournament field projection" description={`Simulated chance for each of ${s.params.teams} D1 teams to win its conference tournament, earn an at-large bid and make the NCAA field.`} csvPath={CSV_PATH} dateModified={s.generated_at} />
    </div>
  );
}
