export function D1PickBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${className}`}
    >
      <svg
        className="w-3 h-3"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
          fill="white"
          opacity="0.3"
        />
      </svg>
      D1 Pick
    </span>
  );
}
