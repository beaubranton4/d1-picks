import type { OddsEntry } from '@/lib/types';

interface TeamOdds {
  team: string;
  odds: Array<{
    sportsbook: string;
    moneyline: number;
  }>;
  bestOdds: {
    sportsbook: string;
    moneyline: number;
  } | null;
}

interface OddsBadgeProps {
  odds: OddsEntry[];
  teamA: string;
  teamB: string;
}

function formatMoneyline(ml: number): string {
  return ml > 0 ? `+${ml}` : `${ml}`;
}

function formatTeamName(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getSportsbookAbbrev(sportsbook: string): string {
  const abbrevs: Record<string, string> = {
    draftkings: 'DK',
    fanduel: 'FD',
    betmgm: 'MGM',
    caesars: 'CZR',
    pointsbet: 'PB',
    betrivers: 'BR',
  };
  return abbrevs[sportsbook.toLowerCase()] || sportsbook.toUpperCase().slice(0, 3);
}

export function OddsBadge({ odds, teamA, teamB }: OddsBadgeProps) {
  if (!odds || odds.length === 0) {
    return (
      <div className="text-sm text-gray-400 italic mt-2">
        No odds available
      </div>
    );
  }

  // Group odds by team
  const teamAOdds: TeamOdds = { team: teamA, odds: [], bestOdds: null };
  const teamBOdds: TeamOdds = { team: teamB, odds: [], bestOdds: null };

  for (const entry of odds) {
    const normalizedTeam = entry.team.toLowerCase().replace(/\s+/g, '_');
    const targetTeam =
      normalizedTeam.includes(teamA.replace(/_/g, '')) ||
      teamA.includes(normalizedTeam.replace(/_/g, ''))
        ? teamAOdds
        : normalizedTeam.includes(teamB.replace(/_/g, '')) ||
            teamB.includes(normalizedTeam.replace(/_/g, ''))
          ? teamBOdds
          : null;

    if (targetTeam) {
      targetTeam.odds.push({
        sportsbook: entry.sportsbook,
        moneyline: entry.moneyline,
      });
    }
  }

  // Find best odds for each team (highest moneyline = best value)
  if (teamAOdds.odds.length > 0) {
    teamAOdds.bestOdds = teamAOdds.odds.reduce((best, curr) =>
      curr.moneyline > best.moneyline ? curr : best
    );
  }
  if (teamBOdds.odds.length > 0) {
    teamBOdds.bestOdds = teamBOdds.odds.reduce((best, curr) =>
      curr.moneyline > best.moneyline ? curr : best
    );
  }

  // Determine favorite/underdog
  const teamAIsFavorite =
    teamAOdds.bestOdds && teamBOdds.bestOdds
      ? teamAOdds.bestOdds.moneyline < teamBOdds.bestOdds.moneyline
      : false;

  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <TeamOddsCard
        team={teamAOdds}
        isFavorite={teamAIsFavorite}
        label={formatTeamName(teamA)}
      />
      <TeamOddsCard
        team={teamBOdds}
        isFavorite={!teamAIsFavorite}
        label={formatTeamName(teamB)}
      />
    </div>
  );
}

function TeamOddsCard({
  team,
  isFavorite,
  label,
}: {
  team: TeamOdds;
  isFavorite: boolean;
  label: string;
}) {
  if (!team.bestOdds) {
    return (
      <div className="bg-gray-100 rounded-lg p-3 text-center">
        <div className="text-sm font-medium text-gray-600 truncate">{label}</div>
        <div className="text-gray-400 text-sm mt-1">--</div>
      </div>
    );
  }

  const bgColor = isFavorite ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200';
  const textColor = isFavorite ? 'text-amber-700' : 'text-green-700';
  const labelText = isFavorite ? 'FAV' : 'DOG';

  return (
    <div className={`${bgColor} border rounded-lg p-3`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium text-gray-700 truncate">{label}</div>
        <span className={`text-xs px-1.5 py-0.5 rounded ${textColor} bg-white/50 font-medium`}>
          {labelText}
        </span>
      </div>
      <div className={`text-2xl font-bold ${textColor}`}>
        {formatMoneyline(team.bestOdds.moneyline)}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Best @ {getSportsbookAbbrev(team.bestOdds.sportsbook)}
      </div>
      {team.odds.length > 1 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {team.odds
            .filter(o => o.sportsbook !== team.bestOdds?.sportsbook)
            .map(o => (
              <span key={o.sportsbook} className="text-xs text-gray-400">
                {getSportsbookAbbrev(o.sportsbook)}: {formatMoneyline(o.moneyline)}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
