import { Header } from '@/components/Header';
import { GameCard } from '@/components/GameCard';
import { NoPicksMessage } from '@/components/NoPicksMessage';
import { EmailCapture } from '@/components/EmailCapture';
import { ShareButton } from '@/components/ShareButton';
import { scrapeWarrenNolan } from '@/lib/scrapers/warren-nolan';
import { fetchOdds } from '@/lib/scrapers/odds-api';
import { matchGamesWithOdds } from '@/lib/normalizer';
import { calculateGameEdges } from '@/lib/calculators/ev-calculator';
import type { GameWithEdges } from '@/lib/types';

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function DailyPicksPage({ params }: PageProps) {
  const { date } = await params;

  console.log(`\n🏈 Generating picks for ${date}...\n`);

  // 1. Scrape Warren Nolan for predictions
  console.log('📊 Step 1: Scraping Warren Nolan predictions...');
  const games = await scrapeWarrenNolan(date);
  console.log(`   Found ${games.length} games\n`);

  if (games.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Header date={date} />
        <NoPicksMessage />
        <EmailCapture />
      </div>
    );
  }

  // 2. Fetch odds from The Odds API
  console.log('💰 Step 2: Fetching odds from The Odds API...');
  const oddsEntries = await fetchOdds();
  console.log(`   Found ${oddsEntries.length} odds entries\n`);

  if (oddsEntries.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Header date={date} />
        <NoPicksMessage />
        <EmailCapture />
      </div>
    );
  }

  // 3. Match games with odds
  console.log('🔗 Step 3: Matching games with odds...');
  const matchedGames = matchGamesWithOdds(games, oddsEntries);
  console.log(`   Matched ${matchedGames.length} games\n`);

  // 4. Calculate edges for each game
  console.log('📈 Step 4: Calculating EV edges...');
  const gamesWithEdges: GameWithEdges[] = matchedGames.map(({ game, odds }) => {
    const edges = calculateGameEdges(game, odds);
    return { ...game, edges };
  });

  // 5. Filter to only +EV picks (not PASS)
  const picks = gamesWithEdges.filter(game =>
    game.edges.some(e => e.classification !== 'PASS')
  );

  console.log(`   Found ${picks.length} games with +EV picks\n`);

  // Sort picks by best edge
  picks.sort((a, b) => {
    const maxEdgeA = Math.max(...a.edges.map(e => e.adjustedEdge));
    const maxEdgeB = Math.max(...b.edges.map(e => e.adjustedEdge));
    return maxEdgeB - maxEdgeA;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Header date={date} />

      {picks.length === 0 ? (
        <NoPicksMessage />
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

          <div className="space-y-6">
            {picks.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </>
      )}

      <EmailCapture />

      <footer className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
        <p>
          Data sources: Warren Nolan predictions · The Odds API
        </p>
        <p className="mt-2">
          For entertainment purposes only. Bet responsibly.
        </p>
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
