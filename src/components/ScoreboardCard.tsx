'use client';

import Image from 'next/image';
import { D1PickBadge } from './D1PickBadge';
import { PickWriteUp } from './PickWriteUp';

interface Team {
  name: string;
  abbreviation: string;
  displayName: string;
  logo?: string;
  rank?: number;
  score?: number;
}

interface ScoreboardCardProps {
  homeTeam: Team;
  awayTeam: Team;
  startTime: string;
  status: 'scheduled' | 'in_progress' | 'final' | 'postponed' | 'canceled';
  period?: string;
  broadcast?: string;
  venue?: string;
  isPick: boolean;
  pickedTeam?: string;
  writeUp?: string;
  moneyline?: number;
  sportsbook?: string;
  stars?: 1 | 2 | 3 | 4 | 5;
  aiScore?: number;
}

function StarRating({ stars }: { stars: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`text-sm ${i <= stars ? 'text-yellow-400' : 'text-mlb-textMuted/30'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function AIScoreBadge({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 8.5) return 'text-green-400';
    if (s >= 7) return 'text-mlb-blue';
    if (s >= 5) return 'text-yellow-400';
    return 'text-mlb-textMuted';
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-mlb-textMuted uppercase tracking-wide">AI Profit Score</span>
      <span className={`text-sm font-bold ${getScoreColor(score)}`}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export function ScoreboardCard({
  homeTeam,
  awayTeam,
  startTime,
  status,
  period,
  broadcast,
  venue,
  isPick,
  pickedTeam,
  writeUp,
  moneyline,
  sportsbook,
  stars,
  aiScore,
}: ScoreboardCardProps) {
  const isLive = status === 'in_progress';
  const isFinal = status === 'final';
  const isPostponed = status === 'postponed' || status === 'canceled';

  const getStatusDisplay = () => {
    if (isLive && period) return period;
    if (isFinal) return 'Final';
    if (isPostponed) return status === 'postponed' ? 'PPD' : 'CXL';
    return startTime;
  };

  return (
    <div
      className={`bg-mlb-card rounded-lg border overflow-hidden transition-all ${
        isPick
          ? 'border-l-4 border-l-green-500 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
          : 'border-mlb-border hover:border-mlb-blue/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-mlb-darker/50">
        <div className="flex items-center gap-3">
          {isPick && <D1PickBadge />}
          {isPick && stars && <StarRating stars={stars} />}
          {isPick && aiScore !== undefined && <AIScoreBadge score={aiScore} />}
          {!isPick && venue && (
            <span className="text-xs text-mlb-textMuted truncate max-w-[150px]">{venue}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-mlb-textMuted">
            {broadcast && <span>{broadcast}</span>}
            {broadcast && <span>·</span>}
            <span
              className={`font-medium ${isLive ? 'text-red-500 animate-pulse' : ''} ${isFinal ? 'text-mlb-textMuted' : ''}`}
            >
              {getStatusDisplay()}
            </span>
          </div>
        </div>
      </div>

      {/* Teams */}
      <div className="px-4 py-3">
        {/* Away Team */}
        <TeamRow
          team={awayTeam}
          isAway={true}
          showScore={isLive || isFinal}
          isPicked={pickedTeam === awayTeam.displayName}
          moneyline={pickedTeam === awayTeam.displayName ? moneyline : undefined}
          sportsbook={pickedTeam === awayTeam.displayName ? sportsbook : undefined}
        />

        {/* Home Team */}
        <TeamRow
          team={homeTeam}
          isAway={false}
          showScore={isLive || isFinal}
          isPicked={pickedTeam === homeTeam.displayName}
          moneyline={pickedTeam === homeTeam.displayName ? moneyline : undefined}
          sportsbook={pickedTeam === homeTeam.displayName ? sportsbook : undefined}
        />
      </div>

      {/* Write-up section for picks */}
      {isPick && writeUp && <PickWriteUp writeUp={writeUp} pickedTeam={pickedTeam || ''} />}
    </div>
  );
}

function TeamRow({
  team,
  isAway,
  showScore,
  isPicked,
  moneyline,
  sportsbook,
}: {
  team: Team;
  isAway: boolean;
  showScore: boolean;
  isPicked: boolean;
  moneyline?: number;
  sportsbook?: string;
}) {
  const formatMoneyline = (ml: number) => (ml > 0 ? `+${ml}` : `${ml}`);
  const formatSportsbook = (sb: string) => {
    const abbrevs: Record<string, string> = {
      'DraftKings': 'DK',
      'FanDuel': 'FD',
      'BetMGM': 'MGM',
      'Caesars': 'CZR',
      'PointsBet': 'PB',
    };
    return abbrevs[sb] || sb;
  };
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${isPicked ? 'bg-green-900/20 -mx-4 px-4 rounded' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Team logo */}
        <div className="w-8 h-8 flex items-center justify-center">
          {team.logo ? (
            <Image
              src={team.logo}
              alt={team.displayName}
              width={32}
              height={32}
              className="object-contain"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-mlb-border flex items-center justify-center text-xs font-bold text-mlb-textMuted">
              {team.abbreviation.slice(0, 2)}
            </div>
          )}
        </div>

        {/* Team name */}
        <div className="flex items-center gap-2">
          {isAway && <span className="text-mlb-textMuted text-xs">@</span>}
          {team.rank && team.rank <= 25 && (
            <span className="text-xs text-mlb-textMuted">#{team.rank}</span>
          )}
          <span
            className={`font-medium ${isPicked ? 'text-green-400' : 'text-mlb-textPrimary'}`}
          >
            {team.displayName}
          </span>
          {isPicked && moneyline !== undefined && (
            <span className="text-green-400 font-semibold text-sm">
              {formatMoneyline(moneyline)}
            </span>
          )}
          {isPicked && sportsbook && (
            <span className="text-mlb-textMuted text-xs">
              ({formatSportsbook(sportsbook)})
            </span>
          )}
          {isPicked && !moneyline && (
            <span className="text-green-500 text-xs">★</span>
          )}
        </div>
      </div>

      {/* Score */}
      {showScore && (
        <span className="text-2xl font-bold text-mlb-textPrimary tabular-nums">
          {team.score ?? '-'}
        </span>
      )}
    </div>
  );
}
