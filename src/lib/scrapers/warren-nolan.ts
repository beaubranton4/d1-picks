import * as cheerio from 'cheerio';
import type { Game } from '../types';

function cleanTeamName(name: string): string {
  // Remove rankings like "#1"
  name = name.replace(/#\d+\s*/g, '');
  // Remove records like "(15-3)"
  name = name.replace(/\(\d+-\d+\)/g, '');
  // Remove extra whitespace
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

function parseProbability(probText: string): number {
  probText = probText.trim();

  if (probText.includes('%')) {
    return parseFloat(probText.replace('%', '')) / 100;
  } else {
    return parseFloat(probText);
  }
}

export async function scrapeWarrenNolan(dateStr: string): Promise<Game[]> {
  const year = dateStr.split('-')[0];
  const url = `https://www.warrennolan.com/baseball/${year}/schedules-date/${dateStr}`;

  console.log(`   Fetching from: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      console.warn(`   ❌ Warren Nolan returned ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const games: Game[] = [];

    // Find all tables
    const tables = $('table');
    console.log(`   Found ${tables.length} tables on page`);

    // Find game rows (rows containing @ or vs)
    const gameRows: cheerio.Cheerio<any>[] = [];

    tables.each((_, table) => {
      $(table)
        .find('tr')
        .each((_, row) => {
          const cells = $(row).find('td, th');
          const cellText = cells
            .map((_, c) => $(c).text().trim())
            .get()
            .join(' ');

          if (cellText.includes('@') || cellText.toLowerCase().includes(' vs ')) {
            gameRows.push($(row));
          }
        });
    });

    console.log(`   Found ${gameRows.length} potential game rows`);

    for (const $row of gameRows) {
      try {
        const cells = $row.find('td, th');
        const cellTexts = cells.map((_, c) => $(c).text().trim()).get();

        // Find team matchup, probability, and time
        let teamsText: string | null = null;
        let probText: string | null = null;
        let timeText: string | null = null;

        for (const text of cellTexts) {
          // Look for team matchup
          if (text.includes('@') || text.toLowerCase().includes(' vs ')) {
            teamsText = text;
          }
          // Look for probability (percentage or decimal between 0 and 1)
          else if (text.includes('%')) {
            probText = text;
          } else if (!isNaN(parseFloat(text))) {
            const val = parseFloat(text);
            if (val > 0 && val < 1) {
              probText = text;
            }
          }
          // Look for time (contains : and digits)
          else if (text.includes(':') && /\d/.test(text)) {
            timeText = text;
          }
        }

        if (!teamsText) {
          continue;
        }

        // Parse teams
        let teamA: string;
        let teamB: string;
        let venueType: 'home_a' | 'home_b' | 'neutral';
        let teamAHome: boolean;
        let teamBHome: boolean;

        if (teamsText.includes('@')) {
          const parts = teamsText.split('@');
          const awayTeam = cleanTeamName(parts[0]);
          const homeTeam = cleanTeamName(parts[1]);
          venueType = 'home_b';
          teamA = awayTeam;
          teamB = homeTeam;
          teamAHome = false;
          teamBHome = true;
        } else if (teamsText.toLowerCase().includes(' vs ')) {
          const parts = teamsText.split(/\s+vs\s+/i);
          teamA = cleanTeamName(parts[0]);
          teamB = cleanTeamName(parts[1]);
          venueType = 'neutral';
          teamAHome = false;
          teamBHome = false;
        } else {
          continue;
        }

        // Parse probability if available
        let modelProbA: number;
        let modelProbB: number;

        if (probText) {
          try {
            const prob = parseProbability(probText);
            // Assume probability is for team B (home team or second team)
            modelProbB = prob;
            modelProbA = 1 - prob;
          } catch {
            continue;
          }
        } else {
          continue;
        }

        const gameId = `${dateStr}_${teamA}_${teamB}`.replace(/\s+/g, '_').toLowerCase();

        const game: Game = {
          id: gameId,
          date: dateStr,
          startTime: timeText || 'TBD',
          teamA: teamA.toLowerCase(),
          teamB: teamB.toLowerCase(),
          teamAHome,
          teamBHome,
          venueType,
          modelProbA,
          modelProbB,
        };

        games.push(game);
        console.log(
          `   ✓ ${teamA} vs ${teamB} - ${(modelProbA * 100).toFixed(1)}% / ${(modelProbB * 100).toFixed(1)}%`
        );
      } catch (error) {
        console.warn(`   ⚠️  Error parsing row: ${error}`);
        continue;
      }
    }

    if (games.length === 0) {
      console.log('   ⚠️  No games with probabilities found.');
      console.log('   💡 You may need to manually inspect Warren Nolan HTML and adjust the scraper.');
    }

    return games;
  } catch (error) {
    console.error(`   ❌ Error fetching Warren Nolan: ${error}`);
    return [];
  }
}
