import { DateNavigation } from './DateNavigation';

interface HeaderProps {
  date: string;
}

export function Header({ date }: HeaderProps) {
  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="mb-8">
      {/* Dark navbar spanning full width */}
      <div className="bg-mlb-darker border-b border-mlb-border -mx-4 px-4 py-4 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/d1-picks-logo.png"
              alt="D1 Baseball Picks"
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-mlb-textPrimary">
                D1 Picks
              </h1>
              <p className="text-xs text-mlb-textMuted">
                +EV College Baseball
              </p>
            </div>
          </div>

          {/* Date Navigation */}
          <DateNavigation currentDate={date} />
        </div>
      </div>

      {/* Date display */}
      <div className="text-center">
        <p className="text-xl text-mlb-textSecondary mb-2">{formattedDate}</p>
        <p className="text-sm text-mlb-textMuted">
          +EV picks based on Warren Nolan predictions
        </p>
      </div>
    </header>
  );
}
