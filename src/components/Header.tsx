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
    <header className="mb-8 text-center">
      <div className="flex items-center justify-center mb-4">
        <img
          src="/d1-picks-logo.png"
          alt="D1 Baseball Picks"
          className="h-24 w-auto"
        />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        D1 Baseball Picks
      </h1>
      <p className="text-xl text-gray-600 mb-3">{formattedDate}</p>
      <DateNavigation currentDate={date} />
      <p className="text-sm text-gray-500 mt-3">
        +EV picks based on Warren Nolan predictions
      </p>
    </header>
  );
}
