import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { authorPath, config } from '@/kit/config';
import { buildMetadata } from '@/kit/seo/metadata';
import { linkIndex } from '@/site/pages';

const PATH = '/about';

export const metadata = buildMetadata({
  path: PATH,
  title: `About ${config.name}`,
  description: `Who runs ${config.name}, what it publishes, how the predictions are made and graded, and how the site does and does not make money.`,
});

// Every claim here is a promise to readers and to Google's quality raters.
// If a practice changes, change this page the same day.
export default function AboutPage() {
  const index = linkIndex();
  return (
    <div className="prose">
      <Breadcrumbs items={index.breadcrumbs(PATH)} />
      <h1 className="display text-5xl sm:text-6xl">About {config.name}</h1>
      <p className="text-lg">
        D1 Picks publishes predictions for college sports from a model you can read, and grades every one of them in public. The
        pitch is simple: show the number, show where it came from, and keep score honestly, including the losses.
      </p>
      <h2>What we cover</h2>
      <p>
        Division I women&apos;s volleyball, right now. College hockey is next, then women&apos;s basketball in November and baseball
        from February 2027. We do not cover football or men&apos;s basketball. Each sport launches only once its model has a backtest
        and a methodology page behind it.
      </p>
      <h2>Who runs it</h2>
      <ul>
        {config.authors.map((a) => (
          <li key={a.slug}>
            <Link href={authorPath(a.slug)}>{a.name}</Link>: {a.bio}
          </li>
        ))}
      </ul>
      <h2>How it works</h2>
      <p>
        A daily job reads results from the NCAA.com scoreboard, refits the ratings, logs a prediction for every upcoming D1 match and
        grades the ones that finished. Predictions, ratings and match previews publish automatically, inside guardrails that are
        described in the <Link href="/editorial-policy">editorial policy</Link>. The <Link href="/methodology">methodology</Link> page
        has the model in full, and the <Link href="/results">results</Link> page has every prediction ever logged.
      </p>
      <h2>What we are not</h2>
      <p>
        D1 Picks is not a sportsbook, takes no bets, sells no picks and is not affiliated with the NCAA, any conference, school or
        sportsbook. Everything here is for adults 21 and over. Read our <Link href="/responsible-gambling">responsible gambling</Link>{' '}
        page if betting stops being fun.
      </p>
      <h2>How the site makes money</h2>
      <p>
        It does not, for now. There are no ads, no affiliate links and no paid picks. If that changes, this page and the editorial
        policy will say so before the first such link goes up.
      </p>
      {config.contactEmail ? (
        <>
          <h2>Contact</h2>
          <p>
            Corrections and questions: <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
          </p>
        </>
      ) : null}
    </div>
  );
}
