export function SEOContent() {
  return (
    <section className="mt-12 pt-8 border-t border-mlb-border">
      <div className="space-y-10">
        {/* What is D1 Picks */}
        <div className="bg-mlb-card rounded-lg border border-mlb-border p-6">
          <h2 className="text-xl font-bold text-mlb-textPrimary mb-4">
            Free College Baseball Picks, Every Single Day
          </h2>
          <div className="space-y-4 text-mlb-textSecondary leading-relaxed">
            <p>
              Look, most betting sites are trying to sell you something. Premium picks, VIP access,
              some dude&apos;s &quot;lock of the century&quot; for $50 a pop. That&apos;s not us.
            </p>
            <p>
              D1 Picks is a free tool that finds positive expected value bets in college baseball.
              We compare model predictions to live sportsbook odds and surface the games where the
              math says you&apos;ve got an edge. No paywall. No subscription. No BS.
            </p>
            <p>
              We built this because we wanted it for ourselves. College baseball betting is a gold
              mine of inefficiency — the books don&apos;t have the same sharp models they run for
              MLB, and the betting market is thinner. That&apos;s where value lives.
            </p>
          </div>
        </div>

        {/* Methodology */}
        <div className="bg-mlb-card rounded-lg border border-mlb-border p-6">
          <h2 className="text-xl font-bold text-mlb-textPrimary mb-4">
            Our Methodology: Math Over Gut Feelings
          </h2>
          <div className="space-y-4 text-mlb-textSecondary leading-relaxed">
            <p>
              Here&apos;s how it works. We pull win probability predictions from Warren Nolan, one
              of the most respected college baseball analytics sources out there. Then we grab live
              moneyline odds from DraftKings, FanDuel, and BetMGM.
            </p>
            <p>
              When the model says a team has a 45% chance to win, but the sportsbook is pricing
              them at +150 (which implies only 40%), that&apos;s a gap. That gap is your edge.
            </p>
            <p>
              We calculate the edge for every game, every day. If a bet clears our threshold, it
              shows up as a STRONG BET, GOOD BET, or WEAK BET depending on the size of the edge. If
              it doesn&apos;t clear? We show you anyway so you can see exactly why we&apos;re
              passing.
            </p>
            <p>No black box. No secret sauce. Just transparent math.</p>
          </div>
        </div>

        {/* How to Read Picks */}
        <div className="bg-mlb-card rounded-lg border border-mlb-border p-6">
          <h2 className="text-xl font-bold text-mlb-textPrimary mb-4">
            Understanding Edge Percentage and Bet Classifications
          </h2>
          <div className="space-y-4 text-mlb-textSecondary leading-relaxed">
            <p>Every pick card shows you the same core info:</p>

            <div className="space-y-3 ml-1">
              <div>
                <h3 className="font-semibold text-mlb-textPrimary">Edge %</h3>
                <p className="text-sm">
                  This is the money number. It&apos;s the difference between what the model thinks
                  and what the book is pricing. A +7% edge means the model has you 7 percentage
                  points ahead of the implied odds. Over time, betting positive edge consistently
                  is how you beat the book.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-mlb-textPrimary">Model Win %</h3>
                <p className="text-sm">
                  What Warren Nolan&apos;s model predicts as the team&apos;s actual win probability.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-mlb-textPrimary">Implied Prob</h3>
                <p className="text-sm">
                  What the sportsbook&apos;s odds imply the win probability is. Convert any
                  moneyline to implied probability: for underdogs, it&apos;s 100 / (moneyline +
                  100). For favorites, it&apos;s |moneyline| / (|moneyline| + 100).
                </p>
              </div>
            </div>

            <div className="pt-2">
              <h3 className="font-semibold text-mlb-textPrimary mb-2">Classifications:</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <span className="font-semibold text-green-400">STRONG BET</span> — Big edge, high
                  confidence. These are the ones we&apos;d actually put money on.
                </li>
                <li>
                  <span className="font-semibold text-mlb-blue">GOOD BET</span> — Solid edge, worth
                  a look. Smaller but still positive expected value.
                </li>
                <li>
                  <span className="font-semibold text-yellow-400">WEAK BET</span> — Marginal edge.
                  Technically +EV but right on the line.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Betting Terms Glossary */}
        <div className="bg-mlb-card rounded-lg border border-mlb-border p-6">
          <h2 className="text-xl font-bold text-mlb-textPrimary mb-4">
            Sports Betting Glossary for College Baseball
          </h2>
          <div className="text-mlb-textSecondary leading-relaxed">
            <p className="mb-4">New to betting? Here&apos;s the vocab you need:</p>

            <dl className="space-y-3">
              <div>
                <dt className="font-semibold text-mlb-textPrimary">Moneyline</dt>
                <dd className="text-sm">
                  A straight-up bet on who wins. No spread, no totals. Just pick the winner.
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-mlb-textPrimary">Favorite vs. Underdog</dt>
                <dd className="text-sm">
                  The favorite is expected to win (negative moneyline like -150). The underdog is
                  expected to lose (positive moneyline like +130). We often find value on dogs
                  because the public overestimates favorites.
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-mlb-textPrimary">Juice (or Vig)</dt>
                <dd className="text-sm">
                  The cut the sportsbook takes. It&apos;s baked into the odds. A &quot;fair&quot;
                  line would be +100 on both sides, but books usually price both sides to guarantee
                  profit.
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-mlb-textPrimary">+EV (Positive Expected Value)</dt>
                <dd className="text-sm">
                  A bet where, over the long run, you&apos;d expect to make money. If you flip a
                  coin at +110 odds, that&apos;s +EV because you&apos;re getting better than fair
                  value.
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-mlb-textPrimary">Edge</dt>
                <dd className="text-sm">
                  The gap between your predicted probability and the implied probability from the
                  odds. Edge is profit margin over time.
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-mlb-textPrimary">Chalk</dt>
                <dd className="text-sm">
                  The favorite. &quot;Taking the chalk&quot; means betting the favorite.
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-mlb-textPrimary">Dog</dt>
                <dd className="text-sm">
                  The underdog. &quot;Playing the dog&quot; means betting the underdog.
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-mlb-textPrimary">Fade</dt>
                <dd className="text-sm">
                  To bet against. &quot;Fade the public&quot; means betting the opposite of popular
                  opinion.
                </dd>
              </div>

              <div>
                <dt className="font-semibold text-mlb-textPrimary">Sharp vs. Square</dt>
                <dd className="text-sm">
                  Sharps are professional bettors who move lines. Squares are recreational bettors.
                  College baseball has fewer sharps, which means more square money and more
                  inefficient lines.
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Why College Baseball */}
        <div className="bg-mlb-card rounded-lg border border-mlb-border p-6">
          <h2 className="text-xl font-bold text-mlb-textPrimary mb-4">
            Why D1 College Baseball is the Best-Kept Secret in Sports Betting
          </h2>
          <div className="space-y-4 text-mlb-textSecondary leading-relaxed">
            <p>Here&apos;s the truth: the college baseball betting market is inefficient as hell.</p>
            <p>
              The sportsbooks put their best oddsmakers on NFL, NBA, and MLB. College baseball?
              It&apos;s an afterthought. The lines are softer, the models are weaker, and the
              public doesn&apos;t pay nearly as much attention.
            </p>
            <p>
              That&apos;s exactly where value bettors thrive. When the market isn&apos;t efficient,
              edges are bigger and easier to find. You&apos;re not competing against a million
              sharps who&apos;ve already hammered the number.
            </p>
            <p>
              Plus, the college baseball season runs from February through June with games almost
              every day. That&apos;s months of opportunities to find +EV bets while everyone else
              is waiting for football season.
            </p>
            <p>
              D1 Picks does the work for you. We crunch the numbers, surface the value, and let you
              make the call. Free, daily, no strings attached.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
