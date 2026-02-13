interface NoPicksMessageProps {
  hasGames?: boolean;
}

export function NoPicksMessage({ hasGames = false }: NoPicksMessageProps) {
  if (!hasGames) {
    // No games at all for this date
    return (
      <div className="bg-gray-50 border-l-4 border-gray-400 p-6 rounded-lg">
        <div className="flex items-center mb-2">
          <span className="text-2xl mr-2">📅</span>
          <h3 className="text-lg font-semibold text-gray-700">
            No Games Today
          </h3>
        </div>
        <p className="text-gray-600">
          No college baseball games found for this date.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This could mean:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-500 mt-1 ml-2">
          <li>No games scheduled for this date</li>
          <li>No odds available yet from sportsbooks</li>
          <li>Games haven&apos;t been added to Warren Nolan yet</li>
        </ul>
      </div>
    );
  }

  // Games exist but none have +EV
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
      <div className="flex items-center mb-2">
        <span className="text-2xl mr-2">⚠️</span>
        <h3 className="text-lg font-semibold text-yellow-900">
          No +EV Picks Today
        </h3>
      </div>
      <p className="text-yellow-800">
        No games found with positive expected value based on current odds and model predictions.
      </p>
      <p className="text-sm text-yellow-700 mt-2">
        Check out the games below to see the full analysis anyway.
      </p>
    </div>
  );
}
