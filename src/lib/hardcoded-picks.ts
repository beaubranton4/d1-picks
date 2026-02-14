// Hardcoded picks for specific dates
// This is temporary until the algorithm is properly integrated

export interface HardcodedPick {
  team: string;
  stars: 1 | 2 | 3 | 4 | 5;
  aiScore: number; // 0-10
  moneyline?: number;
  sportsbook?: string;
}

export const HARDCODED_PICKS: Record<string, HardcodedPick[]> = {
  '2026-02-13': [
    { team: 'ucla', stars: 4, aiScore: 8.2, moneyline: -145, sportsbook: 'DraftKings' },
    { team: 'arkansas', stars: 5, aiScore: 9.1, moneyline: +130, sportsbook: 'FanDuel' },
    { team: 'stanford', stars: 3, aiScore: 7.0, moneyline: -110, sportsbook: 'BetMGM' },
    { team: 'hawaii', stars: 2, aiScore: 5.5, moneyline: +180, sportsbook: 'DraftKings' },
  ],
  '2026-02-14': [
    { team: 'texas tech', stars: 4, aiScore: 8.5, moneyline: -160, sportsbook: 'FanDuel' },
    { team: 'oklahoma', stars: 3, aiScore: 7.2, moneyline: +105, sportsbook: 'DraftKings' },
    { team: 'tcu', stars: 5, aiScore: 9.3, moneyline: -125, sportsbook: 'BetMGM' },
    { team: 'georgia', stars: 2, aiScore: 6.0, moneyline: +145, sportsbook: 'FanDuel' },
  ],
};

export function getPickData(date: string, teamName: string): HardcodedPick | null {
  const picks = HARDCODED_PICKS[date] || [];
  const normalized = teamName.toLowerCase().replace(/\s+/g, '');
  return picks.find(pick => normalized.includes(pick.team)) || null;
}

export function isHardcodedPick(date: string, teamName: string): boolean {
  return getPickData(date, teamName) !== null;
}

export function getHardcodedPicks(date: string): HardcodedPick[] {
  return HARDCODED_PICKS[date] || [];
}

export function isPickedGame(
  date: string,
  homeTeam: string,
  awayTeam: string
): { isPick: boolean; pickedTeam: string | null; pickData: HardcodedPick | null } {
  const homePickData = getPickData(date, homeTeam);
  const awayPickData = getPickData(date, awayTeam);

  if (homePickData) {
    return { isPick: true, pickedTeam: homeTeam, pickData: homePickData };
  }
  if (awayPickData) {
    return { isPick: true, pickedTeam: awayTeam, pickData: awayPickData };
  }
  return { isPick: false, pickedTeam: null, pickData: null };
}
