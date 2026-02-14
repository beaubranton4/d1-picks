import Link from 'next/link';

// College baseball season bounds
const SEASON_START = '2026-02-13';
const SEASON_END = '2026-06-30'; // CWS typically ends late June

interface DateNavigationProps {
  currentDate: string;
}

export function DateNavigation({ currentDate }: DateNavigationProps) {
  const current = new Date(currentDate + 'T00:00:00');
  const seasonStart = new Date(SEASON_START + 'T00:00:00');
  const seasonEnd = new Date(SEASON_END + 'T00:00:00');

  const prev = new Date(current);
  prev.setDate(prev.getDate() - 1);
  const prevStr = prev.toISOString().split('T')[0];
  const prevLabel = prev.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const next = new Date(current);
  next.setDate(next.getDate() + 1);
  const nextStr = next.toISOString().split('T')[0];
  const nextLabel = next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const currentLabel = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Check if navigation is allowed
  const canGoPrev = prev >= seasonStart;
  const canGoNext = next <= seasonEnd;

  return (
    <div className="flex items-center gap-2 text-sm">
      {canGoPrev ? (
        <Link
          href={`/baseball/${prevStr}`}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-mlb-textSecondary hover:text-mlb-blue hover:bg-mlb-card transition-colors"
        >
          <span className="text-lg">&larr;</span>
          <span className="hidden sm:inline">{prevLabel}</span>
        </Link>
      ) : (
        <span className="flex items-center gap-1 px-3 py-2 rounded-lg text-mlb-textMuted cursor-not-allowed opacity-50">
          <span className="text-lg">&larr;</span>
          <span className="hidden sm:inline">{prevLabel}</span>
        </span>
      )}
      <span className="font-semibold text-mlb-textPrimary px-4 py-2 bg-mlb-card rounded-lg border border-mlb-border">
        {currentLabel}
      </span>
      {canGoNext ? (
        <Link
          href={`/baseball/${nextStr}`}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-mlb-textSecondary hover:text-mlb-blue hover:bg-mlb-card transition-colors"
        >
          <span className="hidden sm:inline">{nextLabel}</span>
          <span className="text-lg">&rarr;</span>
        </Link>
      ) : (
        <span className="flex items-center gap-1 px-3 py-2 rounded-lg text-mlb-textMuted cursor-not-allowed opacity-50">
          <span className="hidden sm:inline">{nextLabel}</span>
          <span className="text-lg">&rarr;</span>
        </span>
      )}
    </div>
  );
}
