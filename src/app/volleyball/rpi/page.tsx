import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { Faq } from '@/kit/components/Faq';
import { assertReleased } from '@/kit/release';
import { buildMetadata } from '@/kit/seo/metadata';
import { ratings } from '@/site/data';
import { rpiTable } from '@/site/derived';
import { shortDate } from '@/site/format';
import { linkIndex } from '@/site/pages';
import { RPI_WEIGHTS } from '@/site/sim';
import { Assumptions, Byline, DatasetLd, DownloadLink, MoreData } from '@/site/toolkit';
import { SourceLink } from '@/site/ui';

const PATH = '/volleyball/rpi';
const CSV_PATH = `${PATH}/rpi.csv`;

export const revalidate = 3600;

export function generateMetadata() {
  assertReleased(PATH);
  const page = linkIndex().get(PATH) ?? { title: 'NCAA Volleyball RPI', description: '' };
  return buildMetadata({ path: PATH, title: page.title, description: page.description! });
}

const f3 = (x: number) => x.toFixed(4);

export default function VolleyballRpi() {
  assertReleased(PATH);
  const index = linkIndex();
  const s = ratings();
  const { rows, matches } = rpiTable();
  const top = rows[0];
  const higher = [...rows].sort((a, b) => b.delta - a.delta).slice(0, 8);
  const lower = [...rows].sort((a, b) => a.delta - b.delta).slice(0, 8);

  const faq = [
    {
      question: 'What is the RPI in college volleyball?',
      answer:
        'The Rating Percentage Index ranks teams by results and schedule: a team\'s own winning percentage, its opponents\' winning percentage and its opponents\' opponents\' winning percentage. NCAA.com reports that the Division I committee used the adjusted RPI rankings to make its tournament selections from 2010 to 2017.',
    },
    {
      question: 'Is this the official NCAA RPI?',
      answer:
        'No. It is our own calculation of the classic 25/50/25 RPI from NCAA.com results. The NCAA publishes its own RPI on stats.ncaa.org, which blocks automated access, so we cannot compare the two row by row. Treat ours as a close projection, not the committee\'s sheet.',
    },
    {
      question: 'How is this different from the D1 Picks ratings?',
      answer:
        'RPI counts wins and losses and who you played. Our rating counts sets and corrects for opponent strength, so it separates a 3-0 win from a 3-2 win. The "Model rank" column puts the two side by side; the gap shows which teams the RPI treats differently.',
    },
  ];

  return (
    <div>
      <Breadcrumbs items={index.breadcrumbs(PATH)} />
      <header className="mt-4 max-w-3xl">
        <h1 className="display text-5xl sm:text-6xl">NCAA volleyball RPI</h1>
        <p className="mt-4 text-lg">
          Projected RPI for all {rows.length} D1 women&apos;s volleyball teams, rebuilt from {matches.toLocaleString('en-US')} completed D1 matches. {top.team.name} is
          first at {f3(top.rpi)}. The table shows each team&apos;s model rank beside its RPI rank, and the file is yours to download.
        </p>
        <Byline note={`Results through ${shortDate(s.params.results_through)}.`} />
        <div className="mt-5">
          <DownloadLink href={CSV_PATH} label="Download the RPI table (CSV)" detail={`${rows.length} teams, every input column, as of ${s.as_of}`} />
        </div>
      </header>

      <div className="mt-8 max-h-[80vh] overflow-auto border-2 border-ink bg-card">
        <table className="data-table text-sm">
          <caption className="sr-only">Projected RPI for D1 women&apos;s volleyball, {s.as_of}</caption>
          <thead>
            <tr>
              <th scope="col" className="r">RPI rank</th>
              <th scope="col">Team</th>
              <th scope="col">Conference</th>
              <th scope="col" className="r">RPI</th>
              <th scope="col" className="r">WP</th>
              <th scope="col" className="r">OWP</th>
              <th scope="col" className="r">OOWP</th>
              <th scope="col" className="r">Record</th>
              <th scope="col" className="r">Model rank</th>
              <th scope="col" className="r">AVCA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="r num font-semibold">{r.rank}</td>
                <td className="whitespace-nowrap font-semibold">{r.team.name}</td>
                <td className="whitespace-nowrap text-muted">{r.team.conference_name}</td>
                <td className="r num">{f3(r.rpi)}</td>
                <td className="r num">{f3(r.wp)}</td>
                <td className="r num">{f3(r.owp)}</td>
                <td className="r num">{f3(r.oowp)}</td>
                <td className="r num">{r.wins}-{r.losses}</td>
                <td className="r num">{r.team.rank}</td>
                <td className="r num">{r.team.avca_rank ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="gaps" className="mt-12">
        <h2 id="gaps" className="display text-3xl">Where RPI and our model disagree</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          A positive gap means the RPI ranks the team higher than the model does. Teams that win a lot against a soft schedule gain on RPI;
          teams that win by sweeps against strong opponents gain on the model.
        </p>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          {[
            { title: 'RPI likes more than the model', list: higher },
            { title: 'The model likes more than RPI', list: lower },
          ].map((g) => (
            <div key={g.title} className="overflow-x-auto border-2 border-ink bg-card">
              <table className="data-table text-sm">
                <caption className="p-2 text-left font-semibold">{g.title}</caption>
                <thead>
                  <tr>
                    <th scope="col">Team</th>
                    <th scope="col" className="r">RPI rank</th>
                    <th scope="col" className="r">Model rank</th>
                    <th scope="col" className="r">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {g.list.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap font-semibold">{r.team.name}</td>
                      <td className="r num">{r.rank}</td>
                      <td className="r num">{r.team.rank}</td>
                      <td className="r num">{r.delta > 0 ? `+${r.delta}` : r.delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how" className="mt-12 max-w-3xl">
        <h2 id="how" className="display text-3xl">How this RPI is calculated</h2>
        <div className="prose mt-3">
          <p>
            RPI = {RPI_WEIGHTS.wp} x WP + {RPI_WEIGHTS.owp} x OWP + {RPI_WEIGHTS.oowp} x OOWP.
          </p>
          <ul>
            <li><strong>WP</strong> is the team&apos;s winning percentage over completed D1 matches.</li>
            <li><strong>OWP</strong> is the average winning percentage of the team&apos;s opponents, with each opponent&apos;s game against this team left out.</li>
            <li><strong>OOWP</strong> is the average OWP of those opponents.</li>
          </ul>
          <p>
            The RPI is one input to selection, not a verdict: NCAA.com&apos;s own study says there is no RPI ranking that is the definitive
            cut-off for the field of 64. See how teams in the adjusted RPI landed from 2010 to 2017 in{' '}
            <SourceLink href="https://www.ncaa.com/news/volleyball-women/article/2018-11-21/teams-rpi-ranking-make-ncaa-volleyball-tournament-more-50">
              the NCAA.com article, checked 2026-10-14
            </SourceLink>
            . To see what the model projects for the field itself, use the <Link href="/volleyball/ncaa-tournament-predictions">tournament projection</Link>.
          </p>
        </div>
      </section>

      <Assumptions
        items={[
          <>Matches are the completed D1 versus D1 best-of-five matches in the saved <SourceLink href={s.source.page}>NCAA.com scoreboard</SourceLink> results ({matches.toLocaleString('en-US')} through {shortDate(s.params.results_through)}). Non-D1 opponents are left out, as in our ratings.</>,
          <>We use the plain 25/50/25 formula. The NCAA&apos;s own sheet may add adjustments we cannot see, and may count matches differently, so ranks can differ by a few places. The official figures are on stats.ncaa.org.</>,
          <>Results are refreshed after the ratings are fit, so a team&apos;s record here can be a match ahead of its record on the <Link href="/volleyball/ratings">ratings page</Link>.</>,
          <>Early in the season a team with few matches or a soft schedule can rank high; every RPI table has that problem, and it fades as schedules fill in.</>,
        ]}
      />
      <Faq items={faq} />
      <MoreData current={PATH} />
      <DatasetLd path={PATH} name="D1 women's volleyball projected RPI" description={`Projected RPI, winning percentage, opponents' winning percentage and model rank for ${rows.length} D1 women's volleyball teams.`} csvPath={CSV_PATH} dateModified={s.generated_at} />
    </div>
  );
}
