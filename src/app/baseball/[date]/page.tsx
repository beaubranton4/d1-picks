import { Header } from '@/components/Header';
import { ScoreboardCard } from '@/components/ScoreboardCard';
import { EmailCapture } from '@/components/EmailCapture';
import { DailyArticleBanner } from '@/components/DailyArticleBanner';
import { fetchESPNGames, type ESPNGame } from '@/lib/scrapers/espn';
import { isPickedGame } from '@/lib/hardcoded-picks';
import { getPicksForDate } from '@/lib/content/picks';
import { generateConsistentWriteUp } from '@/lib/writeup-generator';
import { getPerformanceStats } from '@/lib/calculators/performance';
import type { PickResultsData } from '@/lib/calculators/performance';
import type { ManualPick } from '@/lib/types';
import type { Metadata } from 'next';
import pickResultsData from '@/lib/data/pick-results.json';

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
    title: `College Baseball Scoreboard - ${displayDate} | D1 Picks`,
    description: `College baseball scores and D1 Picks for ${displayDate}. Live scores, game times, and our daily picks with analysis.`,
    openGraph: {
      title: `College Baseball Scoreboard - ${displayDate}`,
      description: `Today's college baseball games and D1 Picks.`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `D1 Picks - ${displayDate}`,
      description: `College baseball scoreboard and picks.`,
    },
    alternates: {
      canonical: `https://d1picks.com/baseball/${date}`,
    },
  };
}

interface GameWithPick extends ESPNGame {
  isPick: boolean;
  pickedTeam: string | null;
  writeUp?: string;
  moneyline?: number;
  sportsbook?: string;
}

export default async function BaseballScoreboardPage({ params }: PageProps) {
  const { date } = await params;

  console.log(`\n⚾ Loading scoreboard for ${date}...\n`);

  // Calculate performance stats
  const performanceStats = getPerformanceStats((pickResultsData as PickResultsData).results);

  // Fetch ALL games from ESPN
  const espnGames = await fetchESPNGames(date);
  console.log(`   Found ${espnGames.length} games from ESPN\n`);

  // Load picks from JSON for this date
  const dailyPicks = await getPicksForDate(date);

  // Helper to find matching pick for a team
  const findPickForTeam = (teamName: string): ManualPick | undefined => {
    const normalized = teamName.toLowerCase().replace(/\s+/g, '');
    return dailyPicks.find(pick =>
      normalized.includes(pick.team.toLowerCase().replace(/\s+/g, ''))
    );
  };

  // Enrich games with pick data and write-ups
  const gamesWithPicks: GameWithPick[] = espnGames.map(game => {
    const { isPick, pickedTeam } = isPickedGame(
      date,
      game.homeTeam.displayName,
      game.awayTeam.displayName
    );

    let writeUp: string | undefined;
    let moneyline: number | undefined;
    let sportsbook: string | undefined;

    if (isPick && pickedTeam) {
      const isHome = pickedTeam === game.homeTeam.displayName;
      const opponent = isHome ? game.awayTeam.displayName : game.homeTeam.displayName;
      const pickedRank = isHome ? game.homeTeam.rank : game.awayTeam.rank;
      const opponentRank = isHome ? game.awayTeam.rank : game.homeTeam.rank;

      // Try to find the pick data from JSON
      const pickData = findPickForTeam(pickedTeam);
      if (pickData) {
        writeUp = pickData.analysis;
        moneyline = pickData.moneyline;
        sportsbook = pickData.sportsbook;
      } else {
        // Fall back to generated write-up
        writeUp = generateConsistentWriteUp({
          pickedTeam,
          opponent,
          isHome,
          pickedRank,
          opponentRank,
          venue: game.venue?.fullName,
        });
      }
    }

    return {
      ...game,
      isPick,
      pickedTeam,
      writeUp,
      moneyline,
      sportsbook,
    };
  });

  // Sort: D1 Picks first, then by start time
  gamesWithPicks.sort((a, b) => {
    // Picks first
    if (a.isPick && !b.isPick) return -1;
    if (!a.isPick && b.isPick) return 1;

    // Then by start time
    if (a.startTime === 'TBD') return 1;
    if (b.startTime === 'TBD') return -1;
    return a.startTime.localeCompare(b.startTime);
  });

  // Split into picks and other games
  const picks = gamesWithPicks.filter(g => g.isPick);
  const otherGames = gamesWithPicks.filter(g => !g.isPick);

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-mlb-dark">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Header date={date} performanceStats={performanceStats} />

        {/* Daily Article Banner */}
        <DailyArticleBanner date={date} />

        {/* Stats summary */}
        <div className="mb-6 text-center">
          <p className="text-sm text-mlb-textMuted">
            {gamesWithPicks.length} games today
            {picks.length > 0 && (
              <>
                {' '}
                · <span className="text-green-400 font-medium">{picks.length} D1 Picks</span>
              </>
            )}
          </p>
        </div>

        {/* D1 Picks Section */}
        {picks.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 border-b border-green-500/30 pb-3">
              <h2 className="text-xl font-bold text-green-400">
                D1 Picks{' '}
                <span className="text-base font-normal text-mlb-textMuted">
                  ({picks.length})
                </span>
              </h2>
              <p className="text-sm text-mlb-textMuted mt-1">
                Today&apos;s picks with analysis
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {picks.map(game => (
                <ScoreboardCard
                  key={game.id}
                  homeTeam={{
                    name: game.homeTeam.name,
                    abbreviation: game.homeTeam.abbreviation,
                    displayName: game.homeTeam.displayName,
                    logo: game.homeTeam.logo,
                    rank: game.homeTeam.rank,
                    score: game.homeScore,
                  }}
                  awayTeam={{
                    name: game.awayTeam.name,
                    abbreviation: game.awayTeam.abbreviation,
                    displayName: game.awayTeam.displayName,
                    logo: game.awayTeam.logo,
                    rank: game.awayTeam.rank,
                    score: game.awayScore,
                  }}
                  startTime={game.startTime}
                  status={game.status}
                  period={game.period}
                  broadcast={game.broadcast}
                  venue={game.venue?.fullName}
                  isPick={true}
                  pickedTeam={game.pickedTeam || undefined}
                  writeUp={game.writeUp}
                  moneyline={game.moneyline}
                  sportsbook={game.sportsbook}
                />
              ))}
            </div>
          </section>
        )}

        <EmailCapture />

        {/* All Games Section */}
        {otherGames.length > 0 && (
          <section>
            <div className="mb-4 border-b border-mlb-border pb-3">
              <h2 className="text-xl font-bold text-mlb-textSecondary">
                All Games{' '}
                <span className="text-base font-normal text-mlb-textMuted">
                  ({otherGames.length})
                </span>
              </h2>
              <p className="text-sm text-mlb-textMuted mt-1">
                Today&apos;s college baseball scoreboard
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherGames.map(game => (
                <ScoreboardCard
                  key={game.id}
                  homeTeam={{
                    name: game.homeTeam.name,
                    abbreviation: game.homeTeam.abbreviation,
                    displayName: game.homeTeam.displayName,
                    logo: game.homeTeam.logo,
                    rank: game.homeTeam.rank,
                    score: game.homeScore,
                  }}
                  awayTeam={{
                    name: game.awayTeam.name,
                    abbreviation: game.awayTeam.abbreviation,
                    displayName: game.awayTeam.displayName,
                    logo: game.awayTeam.logo,
                    rank: game.awayTeam.rank,
                    score: game.awayScore,
                  }}
                  startTime={game.startTime}
                  status={game.status}
                  period={game.period}
                  broadcast={game.broadcast}
                  venue={game.venue?.fullName}
                  isPick={false}
                />
              ))}
            </div>
          </section>
        )}

        {/* No games message */}
        {gamesWithPicks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-mlb-textSecondary mb-2">No games scheduled</p>
            <p className="text-mlb-textMuted">Check back later for {displayDate}</p>
          </div>
        )}

        <footer className="mt-8 pt-6 border-t border-mlb-border text-center text-sm text-mlb-textMuted">
          <p>Data source: ESPN</p>
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

  // Always include hardcoded pick dates
  const hardcodedDates = ['2026-02-13', '2026-02-14'];
  for (const dateStr of hardcodedDates) {
    if (!dates.some(d => d.date === dateStr)) {
      dates.push({ date: dateStr });
    }
  }

  return dates;
}
