'use client';

interface ShareButtonProps {
  date: string;
  picksCount: number;
}

export function ShareButton({ date, picksCount }: ShareButtonProps) {
  const dateObj = new Date(date + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const tweetText = encodeURIComponent(
    `Found ${picksCount} +EV college baseball pick${picksCount !== 1 ? 's' : ''} for ${formattedDate}. Free picks, no paywall, just data.\n\nCheck them out:`
  );

  const siteUrl = encodeURIComponent(`https://d1baseballpicks.com/${date}`);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${siteUrl}`;

  return (
    <a
      href={twitterUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-medium px-4 py-2 rounded-lg transition-colors"
    >
      <svg
        className="w-4 h-4"
        fill="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Share on X
    </a>
  );
}
