import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { buildMetadata } from '@/kit/seo/metadata';
import { linkIndex } from '@/site/pages';

const PATH = '/responsible-gambling';

export function generateMetadata() {
  const page = linkIndex().get(PATH)!;
  return buildMetadata({ path: PATH, title: page.title, description: page.description! });
}

// Help resources verified 2026-10-04 against ncpgambling.org/help-treatment/
// ("Call. 1-800-MY-RESET Text. 1-800-MY-RESET Chat. Chat Online"), its helpline
// FAQ (confidential; call, text and chat 24/7/365; no payment or insurance
// information required, standard data rates apply) and gamblersanonymous.org
// (in-person, virtual and telephone meetings; no dues or fees).
// Re-check them before each season.
export default function ResponsibleGambling() {
  return (
    <div className="prose">
      <Breadcrumbs items={linkIndex().breadcrumbs(PATH)} />
      <h1 className="display text-5xl sm:text-6xl">Responsible gambling</h1>
      <p className="text-lg">
        D1 Picks is for adults 21 and over. We publish probabilities, and a probability is a statement about uncertainty: even our
        biggest favorites lose, and the <Link href="/results">results page</Link> shows every time they did.
      </p>

      <h2>Get help now</h2>
      <div className="border-2 border-ink bg-card p-5">
        <p className="display text-3xl">Call or text 1-800-MY-RESET</p>
        <p className="mt-2">
          That is 1-800-697-3738, the National Problem Gambling Helpline run by the National Council on Problem Gambling. You can also{' '}
          <a href="https://www.ncpgambling.org/chat/" rel="noopener" target="_blank">
            chat online
          </a>
          . It answers 24 hours a day, every day of the year, is confidential, and asks for no payment or insurance information
          (standard phone and data rates apply). More at{' '}
          <a href="https://www.ncpgambling.org/help-treatment/" rel="noopener" target="_blank">
            ncpgambling.org
          </a>
          .
        </p>
        <p className="mt-2">
          Peer support: <a href="https://gamblersanonymous.org/" rel="noopener" target="_blank">Gamblers Anonymous</a> holds meetings in
          person, online and by phone, with no dues or fees.
        </p>
      </div>

      <h2>Before you bet on anything</h2>
      <ul>
        <li>Set a budget you can afford to lose before you start, and stop when it is gone.</li>
        <li>Never chase losses. A model being right on average says nothing about the next match.</li>
        <li>Do not bet to fix money problems, or while drinking, tired or upset.</li>
        <li>Keep it separate from rent, bills and savings.</li>
        <li>Take breaks, and use the deposit limits and self-exclusion tools that licensed sportsbooks offer.</li>
      </ul>

      <h2>Warning signs</h2>
      <p>
        Betting more than you planned, hiding it, borrowing to bet, feeling restless when you try to stop, or betting to win back what
        you lost. If any of that sounds familiar, the helpline above is confidential and open around the clock.
      </p>

      <h2>What D1 Picks is and is not</h2>
      <ul>
        <li>We are not a sportsbook and accept no wagers.</li>
        <li>We do not sell picks and do not guarantee any outcome.</li>
        <li>We publish team markets only. Several states ban betting on college player props, and we do not publish them.</li>
        <li>Sports betting is legal only in some states, and rules for college sports differ by state. Check your state&apos;s law.</li>
      </ul>
    </div>
  );
}
