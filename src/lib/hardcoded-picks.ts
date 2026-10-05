// Hardcoded picks for specific dates
// This is temporary until the algorithm is properly integrated
//
// Each pick is pinned to an ESPN team id and matched by exact id equality.
// It used to be matched by substring on the team's display name, which made
// "georgia" tag Georgia Tech, Georgia State, Georgia Southern and West Georgia,
// and "arkansas" tag Central Arkansas and Arkansas State: picks that were never
// made. Never match picks by substring.
//
// Two entries from the original lists are deliberately absent: Hawaii
// (2026-02-13) and Texas Tech (2026-02-14). The old matcher never matched them
// ("Hawai'i" has an apostrophe; 'texas tech' kept its space), so they were never
// shown on the site. Adding them now would publish picks that were never
// published.

export interface HardcodedPick {
  team: string;
  espnTeamId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  aiScore: number; // 0-10
  moneyline?: number;
  sportsbook?: string;
}

export const HARDCODED_PICKS: Record<string, HardcodedPick[]> = {
  '2026-02-13': [
    { team: 'UCLA', espnTeamId: '66', stars: 4, aiScore: 8.2, moneyline: -145, sportsbook: 'DraftKings' },
    { team: 'Arkansas', espnTeamId: '58', stars: 5, aiScore: 9.1, moneyline: +130, sportsbook: 'FanDuel' },
    { team: 'Stanford', espnTeamId: '64', stars: 3, aiScore: 7.0, moneyline: -110, sportsbook: 'BetMGM' },
  ],
  '2026-02-14': [
    { team: 'Oklahoma', espnTeamId: '112', stars: 3, aiScore: 7.2, moneyline: +105, sportsbook: 'DraftKings' },
    { team: 'TCU', espnTeamId: '198', stars: 5, aiScore: 9.3, moneyline: -125, sportsbook: 'BetMGM' },
    { team: 'Georgia', espnTeamId: '78', stars: 2, aiScore: 6.0, moneyline: +145, sportsbook: 'FanDuel' },
  ],
};

/** Dates that carry real picks, oldest first. Only these dates get a page. */
export const PICK_DATES: string[] = Object.keys(HARDCODED_PICKS)
  .filter(date => HARDCODED_PICKS[date].length > 0)
  .sort();

export function isPickDate(date: string): boolean {
  return PICK_DATES.includes(date);
}

/** Normalize a school name for exact comparison ("Texas Tech" -> "texastech"). */
export function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getPickData(date: string, espnTeamId: string): HardcodedPick | null {
  const picks = HARDCODED_PICKS[date] || [];
  return picks.find(pick => pick.espnTeamId === espnTeamId) || null;
}

export function getHardcodedPicks(date: string): HardcodedPick[] {
  return HARDCODED_PICKS[date] || [];
}

interface GameTeam {
  id: string;
  displayName: string;
}

export function isPickedGame(
  date: string,
  homeTeam: GameTeam,
  awayTeam: GameTeam
): { isPick: boolean; pickedTeam: string | null; pickData: HardcodedPick | null } {
  const homePickData = getPickData(date, homeTeam.id);
  const awayPickData = getPickData(date, awayTeam.id);

  if (homePickData) {
    return { isPick: true, pickedTeam: homeTeam.displayName, pickData: homePickData };
  }
  if (awayPickData) {
    return { isPick: true, pickedTeam: awayTeam.displayName, pickData: awayPickData };
  }
  return { isPick: false, pickedTeam: null, pickData: null };
}
