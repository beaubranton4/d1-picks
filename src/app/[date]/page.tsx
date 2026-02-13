import { Header } from '@/components/Header';
import { GameCard, CompactGameGrid } from '@/components/GameCard';
import { NoPicksMessage } from '@/components/NoPicksMessage';
import { EmailCapture } from '@/components/EmailCapture';
import { ShareButton } from '@/components/ShareButton';
import { ArticlesSection } from '@/components/ArticlesSection';
import { DailyArticleBanner } from '@/components/DailyArticleBanner';
import { SEOContent } from '@/components/SEOContent';
import { ExpertPicks } from '@/components/ExpertPicks';
import { fetchESPNGames } from '@/lib/scrapers/espn';
import { scrapeWarrenNolan } from '@/lib/scrapers/warren-nolan';
import { fetchOdds } from '@/lib/scrapers/odds-api';
import { getPicksForDate } from '@/lib/content/picks';
import {
  convertESPNGames,
  mergeWarrenNolanPredictions,
  matchGamesWithOdds,
} from '@/lib/normalizer';
import { calculateGameEdges } from '@/lib/calculators/ev-calculator';
import type { GameWithEdges } from '@/lib/types';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { date } = await params;
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    title: `D1 Baseball Picks for ${displayDate} - Best College Baseball Bets`,
    description: `AI-powered college baseball picks for ${displayDate}. Smart picks rated 1-10 using our prediction model vs live odds from DraftKings, FanDuel, and BetMGM.`,
    openGraph: {
      title: `D1 Baseball Picks for ${displayDate}`,
      description: `Today's best college baseball picks. AI-scored ratings you can trust.`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `D1 Baseball Picks - ${displayDate}`,
      description: `Today's AI-scored college baseball picks. Smart betting made simple.`,
    },
    alternates: {
      canonical: `https://d1picks.com/${date}`,
    },
  };
}

export default async function DailyPicksPage({ params }: PageProps) {
  const { date } = await params;

  console.log(`\n⚾ Generating picks for ${date}...\n`);

  // Fetch expert picks (manual picks from our team)
  const expertPicks = await getPicksForDate(date);
  console.log(`📝 Found ${expertPicks.length} expert picks for ${date}\n`);

  // 1. Fetch ALL games from ESPN (primary source)
  console.log('📺 Step 1: Fetching all games from ESPN...');
  const espnGames = await fetchESPNGames(date);
  const allGames = convertESPNGames(espnGames);
  console.log(`   Found ${allGames.length} scheduled games from ESPN\n`);

  // 2. Fetch Warren Nolan predictions (for subset of games)
  console.log('📊 Step 2: Fetching Warren Nolan predictions...');
  const warrenNolanGames = await scrapeWarrenNolan(date);
  console.log(`   Found ${warrenNolanGames.length} games with predictions\n`);

  // 3. Merge Warren Nolan predictions into ESPN games
  console.log('🔗 Step 3: Merging predictions...');
  const gamesWithPredictions = mergeWarrenNolanPredictions(allGames, warrenNolanGames);
  const predictedCount = gamesWithPredictions.filter(g => g.hasPrediction).length;
  console.log(`   ${predictedCount} games have predictions\n`);

  // 4. Fetch odds from The Odds API
  console.log('💰 Step 4: Fetching odds from The Odds API...');
  const oddsEntries = await fetchOdds();
  console.log(`   Found ${oddsEntries.length} odds entries\n`);

  // 5. Match games with odds
  console.log('🎯 Step 5: Matching games with odds...');
  const matchedGames = matchGamesWithOdds(gamesWithPredictions, oddsEntries);
  const gamesWithOdds = matchedGames.filter(m => m.odds.length > 0).length;
  console.log(`   ${gamesWithOdds} games have odds\n`);

  // 6. Calculate edges and AI scores for each game
  console.log('📈 Step 6: Calculating AI scores...');
  const gamesWithEdges: GameWithEdges[] = matchedGames.map(({ game, odds }) => {
    // Only calculate edges for games with predictions
    const edges = game.hasPrediction ? calculateGameEdges(game, odds) : [];
    // Pass raw odds for games without predictions
    return { ...game, edges, odds: game.hasPrediction ? undefined : odds };
  });

  // 7. Split into categories
  // Picks: games with prediction AND at least one pick that's not PASS
  const picks = gamesWithEdges.filter(
    game => game.hasPrediction && game.edges.some(e => e.pickLabel !== 'PASS')
  );

  // Other games with predictions but no value
  const otherPredictedGames = gamesWithEdges.filter(
    game => game.hasPrediction && game.edges.every(e => e.pickLabel === 'PASS')
  );

  // Games without predictions (odds only)
  const oddsOnlyGames = gamesWithEdges.filter(
    game => !game.hasPrediction && game.edges.length === 0
  );

  console.log(`   Found ${picks.length} games with value picks`);
  console.log(`   Found ${otherPredictedGames.length} other predicted games`);
  console.log(`   Found ${oddsOnlyGames.length} odds-only games\n`);

  // Sort picks by best AI Score
  picks.sort((a, b) => {
    const maxScoreA = Math.max(...a.edges.map(e => e.aiScore), 0);
    const maxScoreB = Math.max(...b.edges.map(e => e.aiScore), 0);
    return maxScoreB - maxScoreA;
  });

  // Sort other predicted games by AI Score
  otherPredictedGames.sort((a, b) => {
    const maxScoreA = Math.max(...a.edges.map(e => e.aiScore), 0);
    const maxScoreB = Math.max(...b.edges.map(e => e.aiScore), 0);
    return maxScoreB - maxScoreA;
  });

  // Sort odds-only games by start time
  oddsOnlyGames.sort((a, b) => {
    if (a.startTime === 'TBD') return 1;
    if (b.startTime === 'TBD') return -1;
    return a.startTime.localeCompare(b.startTime);
  });

  // Check if we have any games at all
  const totalGames = picks.length + otherPredictedGames.length + oddsOnlyGames.length;

  if (totalGames === 0) {
    return (
      <div className="min-h-screen bg-mlb-dark">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Header date={date} />
          <DailyArticleBanner date={date} />
          <ExpertPicks picks={expertPicks} />
          <NoPicksMessage />
          <EmailCapture />
          <ArticlesSection excludeDate={date} />
          <SEOContent />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mlb-dark">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Header date={date} />
        <DailyArticleBanner date={date} />
        <ExpertPicks picks={expertPicks} />

        {/* Stats summary */}
        <div className="mb-6 text-center">
          <p className="text-sm text-mlb-textMuted">
            {totalGames} games today &middot; {predictedCount} with predictions &middot;{' '}
            {gamesWithOdds} with odds
          </p>
        </div>

        {/* Today's Picks Section */}
        {picks.length === 0 ? (
          <NoPicksMessage hasGames={totalGames > 0} />
        ) : (
          <>
            <div className="mb-6 text-center">
              <p className="text-lg text-mlb-textSecondary">
                Found <span className="font-bold text-green-400">{picks.length}</span>{' '}
                {picks.length === 1 ? 'game' : 'games'} with value
              </p>
              <div className="mt-3">
                <ShareButton date={date} picksCount={picks.length} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {picks.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </>
        )}

        {/* Other Predicted Games Section */}
        {otherPredictedGames.length > 0 && (
          <div className="mt-10">
            <div className="mb-4 border-b border-mlb-border pb-3">
              <h2 className="text-xl font-bold text-mlb-textSecondary">
                Other Games{' '}
                <span className="text-base font-normal text-mlb-textMuted">
                  ({otherPredictedGames.length})
                </span>
              </h2>
              <p className="text-sm text-mlb-textMuted mt-1">
                No value found — AI Score below 5
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {otherPredictedGames.map(game => (
                <GameCard key={game.id} game={game} muted />
              ))}
            </div>
          </div>
        )}

        {/* All Other Games Section - Compact Grid */}
        {oddsOnlyGames.length > 0 && (
          <div className="mt-10">
            <div className="mb-4 border-b border-mlb-border pb-3">
              <h2 className="text-xl font-bold text-mlb-textSecondary">
                All Other Games{' '}
                <span className="text-base font-normal text-mlb-textMuted">
                  ({oddsOnlyGames.length})
                </span>
              </h2>
              <p className="text-sm text-mlb-textMuted mt-1">
                No prediction available — showing schedule and odds
              </p>
            </div>
            <CompactGameGrid games={oddsOnlyGames} />
          </div>
        )}

        <EmailCapture />

        <ArticlesSection excludeDate={date} />

        <SEOContent />

        <footer className="mt-8 pt-6 border-t border-mlb-border text-center text-sm text-mlb-textMuted">
          <p>Data sources: ESPN &middot; Warren Nolan &middot; The Odds API</p>
          <p className="mt-2">For entertainment purposes only. Bet responsibly.</p>
        </footer>
      </div>
    </div>
  );
}

// Generate static pages for upcoming dates
export async function generateStaticParams() {
  const dates: Array<{ date: string }> = [];
  const today = new Date();

  // Generate pages for next 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dates.push({ date: dateStr });
  }

  return dates;
}
