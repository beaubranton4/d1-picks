export interface ESPNTeam {
  id: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  logo?: string;
  rank?: number;
}

export interface ESPNVenue {
  fullName: string;
  city: string;
  state: string;
  indoor: boolean;
}

export interface ESPNGame {
  id: string;
  date: string;
  startTime: string;
  homeTeam: ESPNTeam;
  awayTeam: ESPNTeam;
  venue: ESPNVenue | null;
  neutralSite: boolean;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled';
  broadcast?: string;
}

interface ESPNAPIResponse {
  events?: Array<{
    id: string;
    date: string;
    name: string;
    status: {
      type: {
        name: string;
        state: string;
      };
    };
    competitions: Array<{
      id: string;
      neutralSite: boolean;
      venue?: {
        fullName: string;
        address: {
          city: string;
          state: string;
        };
        indoor: boolean;
      };
      competitors: Array<{
        id: string;
        homeAway: 'home' | 'away';
        team: {
          id: string;
          name: string;
          abbreviation: string;
          displayName: string;
          shortDisplayName: string;
          logo?: string;
        };
        curatedRank?: {
          current: number;
        };
      }>;
      broadcasts?: Array<{
        names: string[];
      }>;
    }>;
  }>;
}

function parseStartTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York',
    });
  } catch {
    return 'TBD';
  }
}

function parseStatus(
  statusName: string
): 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled' {
  const lower = statusName.toLowerCase();
  if (lower.includes('scheduled') || lower.includes('pre')) return 'scheduled';
  if (lower.includes('progress') || lower.includes('in')) return 'in_progress';
  if (lower.includes('final') || lower.includes('post')) return 'final';
  if (lower.includes('postpone')) return 'postponed';
  if (lower.includes('cancel')) return 'canceled';
  return 'scheduled';
}

export async function fetchESPNGames(dateStr: string): Promise<ESPNGame[]> {
  // Format date as YYYYMMDD for ESPN API
  const espnDate = dateStr.replace(/-/g, '');
  const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/college-baseball/scoreboard?dates=${espnDate}`;

  console.log(`   Fetching ESPN games for ${dateStr}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.warn(`   ESPN API returned ${response.status}`);
      return [];
    }

    const data: ESPNAPIResponse = await response.json();

    if (!data.events || data.events.length === 0) {
      console.log('   No games found in ESPN API');
      return [];
    }

    const games: ESPNGame[] = [];

    for (const event of data.events) {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const homeCompetitor = competition.competitors.find(c => c.homeAway === 'home');
      const awayCompetitor = competition.competitors.find(c => c.homeAway === 'away');

      if (!homeCompetitor || !awayCompetitor) continue;

      const homeTeam: ESPNTeam = {
        id: homeCompetitor.team.id,
        name: homeCompetitor.team.name,
        abbreviation: homeCompetitor.team.abbreviation,
        displayName: homeCompetitor.team.displayName,
        shortDisplayName: homeCompetitor.team.shortDisplayName,
        logo: homeCompetitor.team.logo,
        rank: homeCompetitor.curatedRank?.current,
      };

      const awayTeam: ESPNTeam = {
        id: awayCompetitor.team.id,
        name: awayCompetitor.team.name,
        abbreviation: awayCompetitor.team.abbreviation,
        displayName: awayCompetitor.team.displayName,
        shortDisplayName: awayCompetitor.team.shortDisplayName,
        logo: awayCompetitor.team.logo,
        rank: awayCompetitor.curatedRank?.current,
      };

      const venue: ESPNVenue | null = competition.venue
        ? {
            fullName: competition.venue.fullName,
            city: competition.venue.address?.city || '',
            state: competition.venue.address?.state || '',
            indoor: competition.venue.indoor || false,
          }
        : null;

      const broadcast = competition.broadcasts?.[0]?.names?.[0];

      const game: ESPNGame = {
        id: event.id,
        date: dateStr,
        startTime: parseStartTime(event.date),
        homeTeam,
        awayTeam,
        venue,
        neutralSite: competition.neutralSite || false,
        status: parseStatus(event.status?.type?.name || 'scheduled'),
        broadcast,
      };

      games.push(game);
    }

    console.log(`   Found ${games.length} games from ESPN`);
    return games;
  } catch (error) {
    console.error(`   Error fetching ESPN games: ${error}`);
    return [];
  }
}
