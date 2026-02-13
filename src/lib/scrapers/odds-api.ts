import type { OddsEntry } from '../types';

export async function fetchOdds(): Promise<OddsEntry[]> {
  const apiKey = process.env.ODDS_API_KEY;

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.error('   ❌ ERROR: ODDS_API_KEY not set in .env.local file');
    console.error('   💡 Get a free API key from https://the-odds-api.com');
    return [];
  }

  const url = new URL('https://api.the-odds-api.com/v4/sports/baseball_ncaa/odds/');
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('regions', 'us');
  url.searchParams.set('markets', 'h2h'); // head-to-head moneyline
  url.searchParams.set('oddsFormat', 'american');
  url.searchParams.set('bookmakers', 'draftkings,fanduel,betmgm');

  console.log('   Fetching from The Odds API...');

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Odds API returned ${response.status}`);
    }

    // Check remaining quota
    const remaining = response.headers.get('x-requests-remaining');
    if (remaining) {
      console.log(`   API quota remaining: ${remaining}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.log('   ⚠️  No games found in The Odds API');
      return [];
    }

    // Parse odds data
    const allOdds: OddsEntry[] = [];

    for (const game of data) {
      const gameId = game.id || '';
      const homeTeam = game.home_team || '';
      const awayTeam = game.away_team || '';

      const bookmakers = game.bookmakers || [];

      for (const bookmaker of bookmakers) {
        const sportsbook = bookmaker.key || '';
        const markets = bookmaker.markets || [];

        for (const market of markets) {
          if (market.key !== 'h2h') {
            continue;
          }

          const outcomes = market.outcomes || [];

          for (const outcome of outcomes) {
            const team = outcome.name || '';
            const moneyline = outcome.price;

            if (moneyline) {
              const oddsEntry: OddsEntry = {
                gameId,
                homeTeam,
                awayTeam,
                sportsbook,
                team,
                moneyline: parseInt(String(moneyline), 10),
              };
              allOdds.push(oddsEntry);
            }
          }
        }
      }
    }

    const uniqueBooks = new Set(allOdds.map(o => o.sportsbook)).size;
    console.log(`   Found odds for ${data.length} games from ${uniqueBooks} books`);

    return allOdds;
  } catch (error) {
    console.error(`   ❌ Error fetching/parsing odds: ${error}`);
    return [];
  }
}
