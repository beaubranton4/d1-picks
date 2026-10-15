import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { Faq } from '@/kit/components/Faq';
import { assertReleased } from '@/kit/release';
import { buildMetadata } from '@/kit/seo/metadata';
import { ratings } from '@/site/data';
import { defaultBracket, modelParams, NCAA_FIELD, NO_AUTO_BID, SIM } from '@/site/derived';
import { BracketSimulator } from '@/site/BracketSimulator';
import { pct, ordinal } from '@/site/format';
import { linkIndex } from '@/site/pages';
import { Assumptions, Byline, MoreData, ToolLd } from '@/site/toolkit';
import { RgLine, SourceLink } from '@/site/ui';

const PATH = '/volleyball/bracket-simulator';

export const revalidate = 3600;

export function generateMetadata() {
  assertReleased(PATH);
  const page = linkIndex().get(PATH) ?? { title: 'NCAA Volleyball Bracket Simulator', description: '' };
  return buildMetadata({ path: PATH, title: page.title, description: page.description! });
}

export default function BracketSimulatorPage() {
  assertReleased(PATH);
  const index = linkIndex();
  const s = ratings();
  const { field, results } = defaultBracket();
  const favorite = [...results].sort((a, b) => b.stages[5] - a.stages[5])[0];
  const teams = s.teams.map((t) => ({ id: t.id, name: t.name, conference_name: t.conference_name, rating: t.rating, rank: t.rank }));
  const ff = [...results].sort((a, b) => b.stages[3] - a.stages[3]).slice(0, 5);

  const faq = [
    {
      question: 'How does the NCAA volleyball bracket simulator work?',
      answer: `It plays the 64-team bracket ${SIM.bracketTrials.toLocaleString('en-US')} times. Every match is won with the probability our rating model gives for the two teams, and the page counts how often each team reaches each round.`,
    },
    {
      question: 'Where does the starting field come from?',
      answer: 'From our projected field on the bracketology page: the likeliest champion in each league with an automatic bid, plus the teams most likely to be picked at large. You can swap any team out and rerun it.',
    },
    {
      question: 'Is this the real NCAA bracket?',
      answer: 'No. The committee announces the real bracket on Nov. 29, picks seeds with criteria we cannot see, and places teams geographically. This is a model of the format run on our ratings.',
    },
  ];

  return (
    <div>
      <Breadcrumbs items={index.breadcrumbs(PATH)} />
      <header className="mt-4 max-w-3xl">
        <h1 className="display text-5xl sm:text-6xl">NCAA volleyball bracket simulator</h1>
        <p className="mt-4 text-lg">
          The {NCAA_FIELD.teams}-team NCAA bracket, played {SIM.bracketTrials.toLocaleString('en-US')} times from our ratings. On the projected field, {favorite.name} wins
          the title {pct(favorite.stages[5])} of the time and reaches the Final Four {pct(favorite.stages[3])}. Swap in your own teams and rerun it.
        </p>
        <Byline />
      </header>

      <div className="mt-8">
        <BracketSimulator
          teams={teams}
          defaultField={field.map((f) => f.id)}
          params={modelParams()}
          seed={SIM.bracketSeed}
          defaultTrials={SIM.bracketTrials}
        />
      </div>
      <div className="mt-4 max-w-3xl">
        <RgLine />
      </div>

      <section aria-labelledby="ff" className="mt-12 max-w-3xl">
        <h2 id="ff" className="display text-3xl">Likeliest Final Four teams</h2>
        <p className="mt-2 text-sm">
          {ff.map((r) => `${r.name} (${pct(r.stages[3], 0)})`).join(', ')}. Seeds here follow our ratings: {ff
            .map((r) => `${r.name} is the ${ordinal(r.seedIdx + 1)} seed`)
            .join(', ')}.
        </p>
        <p className="mt-3 text-sm">
          Want to know who gets in first? The <Link href="/volleyball/ncaa-tournament-predictions" className="underline">bracketology page</Link> projects the
          field and the bubble.
        </p>
      </section>

      <Assumptions
        items={[
          <>Format, from <SourceLink href="https://www.ncaa.com/championships/volleyball-women/d1/road-to-the-championship">NCAA.com (checked 2026-10-14)</SourceLink>: {NCAA_FIELD.teams} teams, single elimination; 16 first-and-second-round sites send one team each to the regionals; regional semifinals and finals; two national semifinals and the title match on Dec. 17 and Dec. 20 in San Antonio. The {NCAA_FIELD.auto} automatic and {NCAA_FIELD.atLarge} at-large split is the NCAA&apos;s.</>,
          <>The top 32 teams are seeded nationally in pods of four, and within a pod ones are paired with eights, twos with sevens, threes with sixes and fours with fives (<SourceLink href="https://www.ncaa.com/news/volleyball-women/article/2025-11-30/division-i-womens-volleyball-committee-announces-2025-championship-field">NCAA.com, 2025 field announcement</SourceLink>). The committee also places teams geographically and avoids pairing teams from one conference early. We do neither.</>,
          <>Our pod layout is an assumption: seeds 1 to 16 host a pod, seed 17 to 32 teams are spread against them, and the 32 unseeded teams are dealt so the strongest host gets the weakest draw. In each pod the host plays the weakest team, the other seeded team plays the remaining unseeded team, and the winners meet. Regionals pair the four pod winners of a region as 1 v 16 and 8 v 9 and so on; the Final Four pairs regions 1 and 4, 2 and 3.</>,
          <>Seeds follow our model rating, not the committee&apos;s criteria. The projected field assumes {NO_AUTO_BID.join(', ')} has no automatic bid (our assumption).</>,
          <>Matches are won with the saved calibrated probability: home court for the pod host in rounds one and two if the box is ticked, neutral after. Rating uncertainty is not added here, so favorites can look surer than they are. Fixed seed {SIM.bracketSeed}.</>,
          <>The model was backtested on regular-season matches, not on tournament matches, and cannot see injuries.</>,
        ]}
      />
      <Faq items={faq} />
      <MoreData current={PATH} />
      <ToolLd path={PATH} name="NCAA volleyball bracket simulator" description="Monte Carlo simulation of the 64-team NCAA women's volleyball bracket from the D1 Picks ratings." />
    </div>
  );
}
