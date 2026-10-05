import Link from 'next/link';
import { AuthorBio } from '@/kit/components/AuthorBio';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { buildMetadata } from '@/kit/seo/metadata';
import { backtest, ratings } from '@/site/data';
import { pct, shortDate } from '@/site/format';
import { linkIndex } from '@/site/pages';
import { PUBLISHING, VOLLEYBALL } from '@/site/policy';

const PATH = '/methodology';

export const revalidate = 3600;

export function generateMetadata() {
  const page = linkIndex().get(PATH)!;
  return buildMetadata({ path: PATH, title: 'How the D1 Picks Model Works', description: page.description! });
}

function Formula({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto border-l-4 border-cobalt bg-card px-4 py-3 text-[0.95rem] leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export default function Methodology() {
  const index = linkIndex();
  const s = ratings();
  const bt = backtest();
  const p = s.params;
  const g = VOLLEYBALL.game_pages;
  const priorSd = (1 / Math.sqrt(p.prior_precision)).toFixed(1);
  const weakest = [...bt.prior_precision_grid].sort((a, b) => a.prior_precision - b.prior_precision)[0];
  const weakestFails = weakest.log_loss > 0.6931;

  return (
    <div>
      <Breadcrumbs items={index.breadcrumbs(PATH)} />
      <article className="prose mt-4">
        <h1 className="display text-5xl sm:text-6xl">How the model works</h1>
        <p className="text-lg">
          Every number on D1 Picks comes from one published model, fit to public results, tested on matches it had not seen, and
          graded in public. This page is the whole recipe for model <code>{s.model}</code>, the volleyball model running today. If the
          model changes, its version changes, and this page says how.
        </p>

        <h2 id="short">The short version</h2>
        <ul>
          <li>Each D1 team gets one rating, fit to every set of D1 against D1 volleyball played this season.</li>
          <li>Two ratings and home court give the chance of winning a set; the set chance gives the match chance and the odds of every set score.</li>
          <li>Raw match probabilities run hot, so we shrink them with a calibration fit only on out-of-sample predictions.</li>
          <li>Each match is predicted once, before first serve, and graded after the final. The record started at zero.</li>
          <li>The model knows results, opponents and home court. It knows nothing about injuries, lineups or travel.</li>
        </ul>

        <h2 id="data">The data</h2>
        <p>
          Results and schedules come from the{' '}
          <a href={s.source.page} rel="noopener" target="_blank">
            NCAA.com Division I scoreboard
          </a>
          , read once a day from the same JSON feed that page loads, one request per date and never more than one request a second.
          For each match we keep the two teams, which one is at home, the sets each won, the scheduled start, each team&apos;s
          conference and its AVCA poll rank, plus a link back to the NCAA.com match page. Every result shown on this site links there.
        </p>
        <p>
          A team counts as D1 when NCAA.com lists it in one of the {Object.keys(VOLLEYBALL.d1_conferences).length} Division I volleyball
          conferences. Matches against non-D1 opponents are dropped, and so are the few that did not finish as a best-of-five. Today&apos;s
          ratings use {p.matches_used.toLocaleString('en-US')} D1 matches through {shortDate(p.results_through)} covering {p.teams} teams.
        </p>
        <p>
          We would rather read stats.ncaa.org directly, but it refuses scripted requests, so the scoreboard feed is the source. It has one
          known gap: it marks one team as home in every match, including the handful played at neutral sites, so the model gives home
          court to a team that may not have had it.
        </p>

        <h2 id="model">The rating model</h2>
        <p>
          The model is a Bradley-Terry model on sets. Team <em>i</em> has rating <em>r<sub>i</sub></em>. When home team <em>h</em> plays
          away team <em>a</em>, the chance the home team wins any one set is:
        </p>
        <Formula>{'p = 1 / (1 + exp(-(r_h - r_a + H)))'}</Formula>
        <p>
          <em>H</em> is one home-court term shared by every team, fit from the data. Today it is {p.home_logit.toFixed(3)}, which means two
          evenly rated teams split sets {pct(s.home_edge.set_win_even)} to the home side, and the home side wins the match{' '}
          {pct(s.home_edge.match_win_even)} of the time after calibration.
        </p>
        <p>
          The ratings are the values that make this season&apos;s set results most likely, with one guard: a prior that pulls every
          rating toward 0, the average D1 team. It is a normal distribution with precision {p.prior_precision} (a standard deviation of{' '}
          {priorSd} rating points), and it is what stops a 3-0 team from getting an infinite rating in week one. The fit is solved with
          Newton&apos;s method.
        </p>
        <p>
          A match stops when a team wins three sets, which sounds like it should bias a model that counts sets. It does not: because the
          stopping rule depends only on the set results themselves, the likelihood for the set probability is the same as if every set had
          been planned in advance.
        </p>

        <h2 id="calibration">Calibration</h2>
        <p>
          Turning a set probability into a match probability assumes sets are independent, and they are not quite: a team that is sharp on
          the night tends to win sets in bunches. Left alone, that makes the model overconfident. In the backtest, raw probabilities
          scored a log loss of {bt.uncalibrated.log_loss.toFixed(3)}; after calibration, {bt.result.log_loss.toFixed(3)}.
        </p>
        <p>So we shrink the raw match probability toward 50% with one number, <em>k</em>:</p>
        <Formula>{'p_match = 1 / (1 + exp(-k * logit(p_raw)))'}</Formula>
        <p>
          <em>k</em> is fit only on predictions the model made out of sample, before it saw those results. Today <em>k</em> is{' '}
          {p.calibration_scale.toFixed(3)}, fit on {bt.calibration_rows.toLocaleString('en-US')} out-of-sample predictions. The set-score odds
          are then recomputed from the set probability that matches the calibrated number, so the six set scores always add up to the
          headline probability.
        </p>

        <h2 id="outputs">Set-score odds and fair lines</h2>
        <p>With a set probability <em>p</em> for the home team and <em>q = 1 - p</em>:</p>
        <Formula>{'home 3-0 = p^3\nhome 3-1 = 3 p^3 q\nhome 3-2 = 6 p^3 q^2\n(and the same with p and q swapped for the away team)'}</Formula>
        <p>
          A fair line is the match probability written as American odds with no bookmaker margin: a favorite at probability <em>P</em> is{' '}
          <code>-100 P / (1 - P)</code>, an underdog is <code>+100 (1 - P) / P</code>. It shows what our number is worth as a price. Since
          we quote no market prices, it is never a bet call.
        </p>

        <h2 id="backtest">The backtest</h2>
        <p>
          A walk-forward backtest replays the season: for each match day from {shortDate(bt.first_day)} to {shortDate(bt.last_day)}, the
          model is fit only on earlier days and predicts that day&apos;s matches, with calibration also fit only on earlier days. Scoring
          starts once the typical team has played {bt.min_median_matches} D1 matches. Across {bt.result.matches.toLocaleString('en-US')} matches
          the favorite won {pct(bt.result.accuracy)} of the time (the home team won {pct(bt.result.home_team_won)}), with a Brier score of{' '}
          {bt.result.brier.toFixed(3)} against 0.250 for a coin flip. The calibration table is on the{' '}
          <Link href="/results#backtest">results page</Link>.
        </p>
        <p>The prior strength was chosen on this backtest. Here is every value we tried:</p>
        <div className="overflow-x-auto">
          <table className="data-table max-w-lg text-sm">
            <thead>
              <tr>
                <th scope="col" className="r">Prior precision</th>
                <th scope="col" className="r">Log loss</th>
                <th scope="col" className="r">Brier</th>
                <th scope="col" className="r">Favorite won</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {bt.prior_precision_grid.map((r) => (
                <tr key={r.prior_precision} className={r.prior_precision === bt.prior_precision ? 'font-semibold' : ''}>
                  <td className="r num">
                    {r.prior_precision}
                    {r.prior_precision === bt.prior_precision ? ' (used)' : ''}
                  </td>
                  <td className="r num">{r.log_loss.toFixed(3)}</td>
                  <td className="r num">{r.brier.toFixed(3)}</td>
                  <td className="r num">{pct(r.accuracy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Picking a setting on the same data you report flatters the result a little, so read the backtest as a sanity check and the
          live record as the real test.
          {weakestFails
            ? ' The weakest prior in the table shows why the prior exists: with almost no pull toward average, early-season ratings blow up and the predictions score worse than a coin flip.'
            : ''}
        </p>

        <h2 id="ledger">Predictions and grading</h2>
        <ul>
          <li>
            Every morning the job rates every team and predicts every D1 match in the next {VOLLEYBALL.predictions.window_days} days that does
            not have a prediction yet.
          </li>
          <li>
            A match is predicted once. The number is written to an append-only log with a timestamp before first serve (before midnight
            Eastern on match day when no start time is published) and is never revised.
          </li>
          <li>
            After the final, the grade is appended: winner, set score, whether the favorite won, Brier score and log loss. A canceled or
            moved match is voided and does not count.
          </li>
          <li>
            The record started at zero with the first logged prediction. There are no backfilled or preseason entries, and a check fails the
            publish if any logged line changes.
          </li>
        </ul>

        <h2 id="game-pages">Which matches get a full preview</h2>
        <p>
          Most matches are a row on the <Link href="/volleyball/predictions">predictions board</Link>. A match gets its own preview page only
          when both teams have played at least {g.min_d1_matches} D1 matches and at least one of these holds:
        </p>
        <ul>
          <li>both teams are in the AVCA poll;</li>
          <li>both teams are in our top {g.our_top_n};</li>
          <li>it is an NCAA tournament match;</li>
          <li>people measurably search for the matchup (from our keyword research).</li>
        </ul>
        <p>
          At most {PUBLISHING.max_game_pages_per_sport_per_day} previews a day per sport and {PUBLISHING.max_game_pages_site_per_day} across
          the site, and none at all if fewer than half of them are getting indexed by Google. Each preview&apos;s written analysis is
          generated from its numbers, and a check rejects the page if any number in the text cannot be traced to the saved model output or
          NCAA.com results. The <Link href="/editorial-policy">editorial policy</Link> explains why these pages publish without a human
          edit.
        </p>

        <h2 id="limits">What the model cannot see</h2>
        <ul>
          <li>Injuries, illness, lineup and rotation changes, or a starter sitting out.</li>
          <li>Travel, rest and back-to-back weekends.</li>
          <li>Neutral sites, which the feed marks as home games.</li>
          <li>Anything from earlier seasons: ratings start from average every August.</li>
          <li>Market prices. We quote none, so we make no claim of an edge over anyone.</li>
        </ul>
        <p>
          If you know something the model does not, adjust from the number. That is what it is for.
        </p>

        <h2 id="versions">Versions</h2>
        <p>
          <strong>{s.model}</strong>, introduced Oct. 4, 2026: Bradley-Terry on sets with one home-court term, a
          normal prior of precision {p.prior_precision} and walk-forward calibration.
        </p>
      </article>
      <div className="max-w-2xl">
        <AuthorBio slug="beau-branton" />
      </div>
    </div>
  );
}
