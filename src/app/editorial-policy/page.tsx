import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { config } from '@/kit/config';
import { buildMetadata } from '@/kit/seo/metadata';
import { linkIndex } from '@/site/pages';
import { PUBLISHING } from '@/site/policy';

const PATH = '/editorial-policy';

export function generateMetadata() {
  const page = linkIndex().get(PATH)!;
  return buildMetadata({ path: PATH, title: page.title, description: page.description! });
}

// A set of commitments. Each one is enforced by the pipeline or the build
// (CLAUDE.md, "Auto-publish exception"). If a practice changes, change the
// page the same day.
export default function EditorialPolicyPage() {
  return (
    <div className="prose">
      <Breadcrumbs items={linkIndex().breadcrumbs(PATH)} />
      <h1 className="display text-5xl sm:text-6xl">Editorial policy</h1>
      <p className="text-lg">How {config.name} decides what to publish, how it publishes without a human in the loop, and how we keep it honest.</p>

      <h2>Automated pages, on purpose</h2>
      <p>
        Daily predictions cannot wait for an editor, so the predictions board, the ratings, the results ledger and the match
        previews publish automatically from the model, including the short written analysis on each preview. That analysis is
        generated from the page&apos;s own numbers. Every automated page says so, and names the person who built and maintains the
        model. Nothing automated is presented as a person&apos;s first-hand opinion.
      </p>

      <h2>The guardrails that replace a human edit</h2>
      <ul>
        <li>
          <strong>Every number traces to saved data.</strong> Numbers come from saved model output or saved NCAA.com results. Before a
          preview is written, a check confirms that every number in its text appears in that match&apos;s saved facts, and that the
          facts match the logged prediction. If one does not, the page is not published.
        </li>
        <li>
          <strong>The content rules pass.</strong> The same content checks run on every generated page as on anything a person writes:
          no hype words, no guarantees, no &quot;lock&quot;, no hidden characters. A page that fails is not published.
        </li>
        <li>
          <strong>Few match pages, on a strict rule.</strong> A match gets its own page only when it clears the rule on the{' '}
          <Link href="/methodology#game-pages">methodology</Link> page, and never more than {PUBLISHING.max_game_pages_per_sport_per_day} a
          day per sport or {PUBLISHING.max_game_pages_site_per_day} across the site. If fewer than half of them are indexed by Google after
          four weeks, we stop making them until that recovers.
        </li>
        <li>
          <strong>Daily archives are not for search engines.</strong> Any page that only lists a past day&apos;s board is marked noindex.
        </li>
        <li>
          <strong>The record cannot be edited.</strong> Predictions are logged before first serve to an append-only file; a check fails
          the publish if any logged line changes.
        </li>
      </ul>

      <h2>Sourcing</h2>
      <p>
        Results, schedules and poll ranks come from the NCAA.com scoreboard, and every result we show links to its NCAA.com match
        page. We do not invent statistics, injury news, quotes or betting lines. When the model cannot know something, the page says
        so.
      </p>

      <h2>Prices and bet calls</h2>
      <p>
        We do not quote sportsbook or prediction-market prices, so no page makes a bet call. Fair lines are our probability written
        as odds, with no claim that anyone should bet them. We publish team markets only, never college player props.
      </p>

      <h2>People</h2>
      <p>
        Beau Branton built the model and the site and is responsible for what they publish. Anything written by a person carries
        their name; first-hand language appears only when that person actually did the thing described.
      </p>

      <h2>Corrections</h2>
      <p>
        If NCAA.com corrects a result, the next daily run picks it up. If we find a bug in the model or a page, we fix it, bump the
        model version when the numbers change, and note it on the <Link href="/methodology#versions">methodology</Link> page. Logged
        predictions are never rewritten, even when they were wrong.
      </p>

      <h2>Affiliate links and money</h2>
      <p>
        There are none. If that ever changes, the links will be labeled, each page that has one will carry a disclosure, and this page
        will say so first.
      </p>
    </div>
  );
}
