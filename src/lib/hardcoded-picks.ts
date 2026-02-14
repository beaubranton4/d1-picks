// Hardcoded picks for specific dates
// This is temporary until the algorithm is properly integrated

export const HARDCODED_PICKS: Record<string, string[]> = {
  '2026-02-13': ['ucla', 'arkansas', 'stanford', 'hawaii'],
  '2026-02-14': ['texas tech', 'oklahoma', 'tcu'],
};

export function isHardcodedPick(date: string, teamName: string): boolean {
  const picks = HARDCODED_PICKS[date] || [];
  const normalized = teamName.toLowerCase().replace(/\s+/g, '');
  return picks.some(pick => normalized.includes(pick));
}

export function getHardcodedPicks(date: string): string[] {
  return HARDCODED_PICKS[date] || [];
}

export function isPickedGame(
  date: string,
  homeTeam: string,
  awayTeam: string
): { isPick: boolean; pickedTeam: string | null } {
  const homePicked = isHardcodedPick(date, homeTeam);
  const awayPicked = isHardcodedPick(date, awayTeam);

  if (homePicked) {
    return { isPick: true, pickedTeam: homeTeam };
  }
  if (awayPicked) {
    return { isPick: true, pickedTeam: awayTeam };
  }
  return { isPick: false, pickedTeam: null };
}
