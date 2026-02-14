import Link from 'next/link';

interface DateNavigationProps {
  currentDate: string;
}

export function DateNavigation({ currentDate }: DateNavigationProps) {
  const current = new Date(currentDate + 'T00:00:00');

  const prev = new Date(current);
  prev.setDate(prev.getDate() - 1);
  const prevStr = prev.toISOString().split('T')[0];
  const prevLabel = prev.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const next = new Date(current);
  next.setDate(next.getDate() + 1);
  const nextStr = next.toISOString().split('T')[0];
  const nextLabel = next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const currentLabel = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href={`/baseball/${prevStr}`}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-mlb-textSecondary hover:text-mlb-blue hover:bg-mlb-card transition-colors"
      >
        <span className="text-lg">&larr;</span>
        <span className="hidden sm:inline">{prevLabel}</span>
      </Link>
      <span className="font-semibold text-mlb-textPrimary px-4 py-2 bg-mlb-card rounded-lg border border-mlb-border">
        {currentLabel}
      </span>
      <Link
        href={`/baseball/${nextStr}`}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-mlb-textSecondary hover:text-mlb-blue hover:bg-mlb-card transition-colors"
      >
        <span className="hidden sm:inline">{nextLabel}</span>
        <span className="text-lg">&rarr;</span>
      </Link>
    </div>
  );
}
