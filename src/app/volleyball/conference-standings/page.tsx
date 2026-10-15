import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { Faq } from '@/kit/components/Faq';
import { assertReleased } from '@/kit/release';
import { buildMetadata } from '@/kit/seo/metadata';
import { ratings } from '@/site/data';
import { conferenceTables, NCAA_FIELD, NO_AUTO_BID, SIM } from '@/site/derived';
import { etStamp, ordinal, pct, shortDate } from '@/site/format';
import { linkIndex } from '@/site/pages';
import { Assumptions, Byline, DatasetLd, DownloadLink, MoreData } from '@/site/toolkit';
import { SourceLink } from '@/site/ui';

const PATH = '/volleyball/conference-standings';
const CSV_PATH = `${PATH}/standings.csv`;

export const revalidate = 3600;

export function generateMetadata() {
  assertReleased(PATH);
  const page = linkIndex().get(PATH) ?? { title: 'Volleyball Conference Standings', description: '' };
  return buildMetadata({ path: PATH, title: page.title, description: page.description! });
}

const BIG = ['big-ten', 'sec', 'big-12'];

export default function ConferenceStandings() {
  assertReleased(PATH);
  const index = linkIndex();
  const s = ratings();
  const tables = conferenceTables();
  const ordered = [...tables.filter((t) => BIG.includes(t.key)).sort((a, b) => BIG.indexOf(a.key) - BIG.indexOf(b.key)), ...tables.filter((t) => !BIG.includes(t.key))];
  const best = tables[0];

  const faq = [
    {
      question: 'How are these volleyball conference standings calculated?',
      answer: `Conference record counts every completed match between two teams the NCAA.com feed places in the same league, from the saved results through ${shortDate(s.params.results_through)}. Ratings and title odds come from the D1 Picks model.`,
    },
    {
      question: 'What are the conference title odds?',
      answer: `The share of ${SIM.fieldTrials.toLocaleString('en-US')} simulated conference tournaments each team won. Each simulation seeds the league's top eight teams by a randomly nudged rating and plays a single-elimination bracket on neutral floors. It is an estimate of strength, not a forecast of each league's real format.`,
    },
    {
      question: 'Which conference is strongest?',
      answer: `By average model rating, ${best.name} is first at ${best.avgRating.toFixed(2)}, where 0.00 is an average D1 team. The table at the top of the page ranks all ${tables.length} leagues.`,
    },
  ];

  return (
    <div>
      <Breadcrumbs items={index.breadcrumbs(PATH)} />
      <header className="mt-4 max-w-3xl">
        <h1 className="display text-5xl sm:text-6xl">Volleyball conference standings</h1>
        <p className="mt-4 text-lg">
          Standings for all {tables.length} D1 women&apos;s volleyball conferences, starting with the Big Ten, SEC and Big 12. Each team shows its
          conference record, its model rank and rating, and its estimated chance to win the league. {best.name} is the strongest league by
          average rating.
        </p>
        <Byline note={`Records through ${shortDate(s.params.results_through)}.`} />
        <div className="mt-5">
          <DownloadLink href={CSV_PATH} label="Download the standings (CSV)" detail={`${s.params.teams} teams, ${tables.length} conferences, as of ${s.as_of}`} />
        </div>
      </header>

      <section aria-labelledby="strength" className="mt-10">
        <h2 id="strength" className="display text-3xl">Conferences ranked by strength</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Average model rating of the league&apos;s teams (0.00 is an average D1 team) and the number of teams the model expects in the NCAA
          field, from the <Link href="/volleyball/ncaa-tournament-predictions" className="underline">tournament projection</Link>.
        </p>
        <div className="mt-3 overflow-x-auto border-2 border-ink bg-card">
          <table className="data-table text-sm">
            <caption className="sr-only">D1 volleyball conferences by average model rating</caption>
            <thead>
              <tr>
                <th scope="col" className="r">Rank</th>
                <th scope="col">Conference</th>
                <th scope="col" className="r">Teams</th>
                <th scope="col" className="r">Avg. rating</th>
                <th scope="col" className="r">Expected NCAA bids</th>
                <th scope="col">Best team</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => {
                const top = [...t.teams].sort((a, b) => a.team.rank - b.team.rank)[0].team;
                return (
                  <tr key={t.key}>
                    <td className="r num font-semibold">{t.strengthRank}</td>
                    <td className="font-semibold">
                      <a href={`#${t.key}`} className="underline">{t.name}</a>
                    </td>
                    <td className="r num">{t.teams.length}</td>
                    <td className="r num">{t.avgRating.toFixed(2)}</td>
                    <td className="r num">{t.expectedBids.toFixed(1)}</td>
                    <td className="whitespace-nowrap">
                      {top.name} <span className="text-muted">(#{top.rank})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {ordered.map((t) => {
        const top = [...t.teams].sort((a, b) => b.pChampion - a.pChampion)[0];
        return (
          <section key={t.key} id={t.key} aria-labelledby={`h-${t.key}`} className="mt-12 scroll-mt-4">
            <h2 id={`h-${t.key}`} className="display text-3xl">
              {t.name} volleyball standings
            </h2>
            <p className="mt-2 max-w-3xl text-sm">
              {t.name} ranks {ordinal(t.strengthRank)} of {tables.length} conferences by average rating ({t.avgRating.toFixed(2)}). The model
              gives {top.team.name} the best chance to win it, {pct(top.pChampion, 0)}, and expects {t.expectedBids.toFixed(1)} of its{' '}
              {t.teams.length} teams in the NCAA field.
              {t.autoBid ? '' : ' We assume this league has no automatic bid in 2026, so its teams can only get in at large.'}
            </p>
            <div className="mt-3 overflow-x-auto border-2 border-ink bg-card">
              <table className="data-table text-sm">
                <caption className="sr-only">{t.name} standings, sorted by conference record</caption>
                <thead>
                  <tr>
                    <th scope="col">Team</th>
                    <th scope="col" className="r">Conf.</th>
                    <th scope="col" className="r">D1 record</th>
                    <th scope="col" className="r">Model rank</th>
                    <th scope="col" className="r">Rating</th>
                    <th scope="col" className="r">Title odds</th>
                    <th scope="col" className="r">AVCA</th>
                  </tr>
                </thead>
                <tbody>
                  {t.teams.map((r) => (
                    <tr key={r.team.id}>
                      <td className="whitespace-nowrap font-semibold">{r.team.name}</td>
                      <td className="r num">{r.confW}-{r.confL}</td>
                      <td className="r num">{r.team.wins}-{r.team.losses}</td>
                      <td className="r num">{r.team.rank}</td>
                      <td className="r num">{r.team.rating.toFixed(2)}</td>
                      <td className="r num">{r.pChampion < 0.005 ? '<1%' : pct(r.pChampion, 0)}</td>
                      <td className="r num">{r.team.avca_rank ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <Assumptions
        items={[
          <>Records come from completed D1 matches in the saved <SourceLink href={s.source.page}>NCAA.com scoreboard</SourceLink> results. A match counts as a conference match when both teams sit in the same league in that feed. Ratings were fit {etStamp(s.generated_at)}, so a record can include a match played after the ratings were fit.</>,
          <>Title odds simulate a single-elimination tournament of each league&apos;s top {8} teams on neutral floors, with every rating nudged by its estimated uncertainty ({SIM.fieldTrials.toLocaleString('en-US')} runs, seed {SIM.fieldSeed}). Leagues that crown a regular-season champion, or that use another format, will differ. We do not know each league&apos;s remaining schedule.</>,
          <>The NCAA field is {NCAA_FIELD.teams} teams: {NCAA_FIELD.auto} automatic bids and {NCAA_FIELD.atLarge} at large (<SourceLink href="https://www.ncaa.com/championships/volleyball-women/d1/road-to-the-championship">NCAA.com, checked 2026-10-14</SourceLink>). Our feed lists {tables.length} leagues; we assume {NO_AUTO_BID.map((k) => tables.find((t) => t.key === k)?.name).join(', ')} has no automatic bid in 2026. That is our assumption, not an NCAA statement.</>,
        ]}
      />

      <Faq items={faq} />
      <MoreData current={PATH} />
      <DatasetLd
        path={PATH}
        name="D1 women's volleyball conference standings and ratings"
        description={`Conference record, model rating and conference title odds for ${s.params.teams} D1 women's volleyball teams.`}
        csvPath={CSV_PATH}
        dateModified={s.generated_at}
      />
    </div>
  );
}
