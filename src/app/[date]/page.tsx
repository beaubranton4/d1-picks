import { Header } from '@/components/Header';
import { GameCard, CompactGameGrid } from '@/components/GameCard';
import { NoPicksMessage } from '@/components/NoPicksMessage';
import { EmailCapture } from '@/components/EmailCapture';
import { ShareButton } from '@/components/ShareButton';
import { ArticlesSection } from '@/components/ArticlesSection';
import { DailyArticleBanner } from '@/components/DailyArticleBanner';
import { fetchESPNGames } from '@/lib/scrapers/espn';
import { scrapeWarrenNolan } from '@/lib/scrapers/warren-nolan';
import { fetchOdds } from '@/lib/scrapers/odds-api';
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
    description: `Data-driven college baseball picks for ${displayDate}. Find +EV bets with our Warren Nolan model predictions vs live odds from DraftKings, FanDuel, and BetMGM.`,
    openGraph: {
      title: `D1 Baseball Picks for ${displayDate}`,
      description: `Today's best college baseball bets with positive expected value. Data-driven picks you can trust.`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `D1 Baseball Picks - ${displayDate}`,
      description: `Today's +EV college baseball picks. Data-driven betting analysis.`,
    },
    alternates: {
      canonical: `https://d1picks.com/${date}`,
    },
  };
}

export default async function DailyPicksPage({ params }: PageProps) {
  const { date } = await params;

  console.log(`\n⚾ Generating picks for ${date}...\n`);

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

  // 6. Calculate edges for each game
  console.log('📈 Step 6: Calculating EV edges...');
  const gamesWithEdges: GameWithEdges[] = matchedGames.map(({ game, odds }) => {
    // Only calculate edges for games with predictions
    const edges = game.hasPrediction ? calculateGameEdges(game, odds) : [];
    // Pass raw odds for games without predictions
    return { ...game, edges, odds: game.hasPrediction ? undefined : odds };
  });

  // 7. Split into categories
  // +EV picks: games with prediction AND positive edge
  const picks = gamesWithEdges.filter(
    game => game.hasPrediction && game.edges.some(e => e.classification !== 'PASS')
  );

  // Other games with predictions but no +EV edge
  const otherPredictedGames = gamesWithEdges.filter(
    game => game.hasPrediction && game.edges.every(e => e.classification === 'PASS')
  );

  // Games without predictions (odds only)
  const oddsOnlyGames = gamesWithEdges.filter(
    game => !game.hasPrediction && game.edges.length === 0
  );

  console.log(`   Found ${picks.length} games with +EV picks`);
  console.log(`   Found ${otherPredictedGames.length} other predicted games`);
  console.log(`   Found ${oddsOnlyGames.length} odds-only games\n`);

  // Sort picks by best edge
  picks.sort((a, b) => {
    const maxEdgeA = Math.max(...a.edges.map(e => e.adjustedEdge), 0);
    const maxEdgeB = Math.max(...b.edges.map(e => e.adjustedEdge), 0);
    return maxEdgeB - maxEdgeA;
  });

  // Sort other predicted games by best edge (closest to threshold)
  otherPredictedGames.sort((a, b) => {
    const maxEdgeA = Math.max(...a.edges.map(e => e.adjustedEdge), 0);
    const maxEdgeB = Math.max(...b.edges.map(e => e.adjustedEdge), 0);
    return maxEdgeB - maxEdgeA;
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Header date={date} />
        <DailyArticleBanner date={date} />
        <NoPicksMessage />
        <EmailCapture />
        <ArticlesSection excludeDate={date} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Header date={date} />
      <DailyArticleBanner date={date} />

      {/* Stats summary */}
      <div className="mb-6 text-center">
        <p className="text-sm text-gray-500">
          {totalGames} games today &middot; {predictedCount} with predictions &middot;{' '}
          {gamesWithOdds} with odds
        </p>
      </div>

      {/* +EV Picks Section */}
      {picks.length === 0 ? (
        <NoPicksMessage hasGames={totalGames > 0} />
      ) : (
        <>
          <div className="mb-6 text-center">
            <p className="text-lg text-gray-700">
              Found <span className="font-bold text-green-600">{picks.length}</span>{' '}
              {picks.length === 1 ? 'game' : 'games'} with positive expected value
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
          <div className="mb-4 border-b pb-3">
            <h2 className="text-xl font-bold text-gray-700">
              Other Predicted Games{' '}
              <span className="text-base font-normal text-gray-500">
                ({otherPredictedGames.length})
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              No +EV edge found — showing full analysis
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
          <div className="mb-4 border-b pb-3">
            <h2 className="text-xl font-bold text-gray-700">
              All Other Games{' '}
              <span className="text-base font-normal text-gray-500">
                ({oddsOnlyGames.length})
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              No prediction available — showing schedule and odds
            </p>
          </div>
          <CompactGameGrid games={oddsOnlyGames} />
        </div>
      )}

      <EmailCapture />

      <ArticlesSection excludeDate={date} />

      <footer className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
        <p>Data sources: ESPN &middot; Warren Nolan &middot; The Odds API</p>
        <p className="mt-2">For entertainment purposes only. Bet responsibly.</p>
      </footer>
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
