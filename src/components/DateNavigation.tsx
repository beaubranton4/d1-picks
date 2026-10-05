import Link from 'next/link';
import { PICK_DATES } from '@/lib/hardcoded-picks';

interface DateNavigationProps {
  currentDate: string;
}

function shortLabel(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Navigates between dates that have real picks; no other date has a page.
export function DateNavigation({ currentDate }: DateNavigationProps) {
  const current = new Date(currentDate + 'T00:00:00');

  const prevStr = [...PICK_DATES].reverse().find(d => d < currentDate);
  const nextStr = PICK_DATES.find(d => d > currentDate);
  const prevLabel = prevStr ? shortLabel(prevStr) : '';
  const nextLabel = nextStr ? shortLabel(nextStr) : '';

  const currentLabel = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Check if navigation is allowed
  const canGoPrev = Boolean(prevStr);
  const canGoNext = Boolean(nextStr);

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
