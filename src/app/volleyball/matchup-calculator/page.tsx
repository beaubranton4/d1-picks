import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { Faq } from '@/kit/components/Faq';
import { assertReleased } from '@/kit/release';
import { buildMetadata } from '@/kit/seo/metadata';
import { ratings } from '@/site/data';
import { modelParams } from '@/site/derived';
import { pct } from '@/site/format';
import { MatchupCalculator } from '@/site/MatchupCalculator';
import { linkIndex } from '@/site/pages';
import { homeWinProb } from '@/site/sim';
import { Assumptions, Byline, MoreData, ToolLd } from '@/site/toolkit';
import { RgLine } from '@/site/ui';

const PATH = '/volleyball/matchup-calculator';

export const revalidate = 3600;

export function generateMetadata() {
  assertReleased(PATH);
  const page = linkIndex().get(PATH) ?? { title: 'Volleyball Matchup Calculator', description: '' };
  return buildMetadata({ path: PATH, title: page.title, description: page.description! });
}

const GRID = 10;

export default function MatchupCalculatorPage() {
  assertReleased(PATH);
  const index = linkIndex();
  const s = ratings();
  const params = modelParams();
  const teams = s.teams.map((t) => ({ id: t.id, name: t.name, conference_name: t.conference_name, rating: t.rating, rank: t.rank }));
  const top = s.teams.slice(0, GRID);

  const faq = [
    {
      question: 'How does the volleyball matchup calculator work?',
      answer:
        'It takes the two teams\' saved ratings, adds the home-court term if one side hosts, turns the rating gap into a chance of winning each set, and builds the match and set-score chances from that. It is the same math as our daily predictions.',
    },
    {
      question: 'Is a calculator result a prediction you grade?',
      answer:
        'No. Only matches on the predictions board are logged before first serve and graded on the results page. A calculator result is a what-if from today\'s ratings and is not logged.',
    },
    {
      question: 'Does it know about injuries or lineups?',
      answer: 'No. The model sees results, opponents and home court only, so a lineup change or an injury is invisible to it.',
    },
  ];

  return (
    <div>
      <Breadcrumbs items={index.breadcrumbs(PATH)} />
      <header className="mt-4 max-w-3xl">
        <h1 className="display text-5xl sm:text-6xl">Volleyball matchup calculator</h1>
        <p className="mt-4 text-lg">
          Pick any two of the {s.params.teams} D1 women&apos;s volleyball teams and a floor. You get the win chance and the odds of every set score from
          the same rating model that drives our <Link href="/volleyball/predictions" className="underline">daily predictions</Link>.
        </p>
        <Byline />
      </header>

      <div className="mt-8 max-w-4xl">
        <MatchupCalculator teams={teams} params={params} defaultA={top[0].id} defaultB={top[1].id} />
      </div>
      <div className="mt-4 max-w-3xl">
        <RgLine />
      </div>

      <section aria-labelledby="grid" className="mt-12">
        <h2 id="grid" className="display text-3xl">The top {GRID}, head to head</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Chance that the team in the row beats the team in the column in a best-of-five match on a neutral floor, from the same ratings.
        </p>
        <div className="mt-3 overflow-x-auto border-2 border-ink bg-card">
          <table className="data-table text-sm">
            <caption className="sr-only">Neutral-floor win chances among the ten highest-rated teams</caption>
            <thead>
              <tr>
                <th scope="col">Team</th>
                {top.map((t) => (
                  <th key={t.id} scope="col" className="r">{t.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap font-semibold">{a.name}</td>
                  {top.map((b) => (
                    <td key={b.id} className="r num">
                      {a.id === b.id ? '' : pct(homeWinProb(a.rating, b.rating, true, params), 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Assumptions
        title="What the calculator assumes"
        items={[
          <>Ratings are the saved {s.model} ratings from {s.as_of}, fit to {s.params.matches_used.toLocaleString('en-US')} completed D1 matches. A team with few matches has a less certain rating.</>,
          <>Home court adds {params.home_logit.toFixed(2)} to the host&apos;s log-odds of winning a set. A neutral floor adds nothing. The match chance is then shrunk by the calibration scale {params.calibration_scale.toFixed(2)}, fit on out-of-sample predictions (<Link href="/methodology" className="underline">methodology</Link>).</>,
          <>Sets are treated as independent. The set-score chances always add up to the match chance.</>,
        ]}
      />
      <Faq items={faq} />
      <MoreData current={PATH} />
      <ToolLd path={PATH} name="Volleyball matchup calculator" description="Win chance and set-score odds for any two D1 women's volleyball teams, from the D1 Picks rating model." />
    </div>
  );
}
