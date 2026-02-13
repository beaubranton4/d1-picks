export function NoPicksMessage() {
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
        This could mean:
      </p>
      <ul className="list-disc list-inside text-sm text-yellow-700 mt-1 ml-2">
        <li>No games scheduled for this date</li>
        <li>No odds available yet from sportsbooks</li>
        <li>Market odds match or exceed model probabilities</li>
      </ul>
    </div>
  );
}
