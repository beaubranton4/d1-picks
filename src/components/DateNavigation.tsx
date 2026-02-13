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
    <div className="flex items-center justify-center gap-4 text-sm">
      <Link
        href={`/${prevStr}`}
        className="text-gray-600 hover:text-green-600 transition-colors flex items-center gap-1"
      >
        <span className="text-lg">&larr;</span> {prevLabel}
      </Link>
      <span className="font-semibold text-gray-900 px-3 py-1 bg-gray-100 rounded">
        {currentLabel}
      </span>
      <Link
        href={`/${nextStr}`}
        className="text-gray-600 hover:text-green-600 transition-colors flex items-center gap-1"
      >
        {nextLabel} <span className="text-lg">&rarr;</span>
      </Link>
    </div>
  );
}
