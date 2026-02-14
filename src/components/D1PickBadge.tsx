import Image from 'next/image';

interface D1PickBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function D1PickBadge({
  className = '',
  size = 'md',
  showText = true
}: D1PickBadgeProps) {
  const sizeConfig = {
    sm: { logo: 16, text: 'text-xs', padding: 'px-2 py-0.5', gap: 'gap-1' },
    md: { logo: 20, text: 'text-sm', padding: 'px-2.5 py-1', gap: 'gap-1.5' },
    lg: { logo: 28, text: 'text-base', padding: 'px-3 py-1.5', gap: 'gap-2' },
  };

  const config = sizeConfig[size];

  return (
    <span
      className={`
        inline-flex items-center ${config.gap}
        bg-gradient-to-r from-green-600 via-green-500 to-emerald-500
        text-white ${config.padding} rounded-full
        ${config.text} font-bold uppercase tracking-wide
        shadow-lg shadow-green-500/30
        border border-green-400/30
        hover:shadow-green-400/50 hover:scale-105
        transition-all duration-200
        ${className}
      `}
    >
      <Image
        src="/d1-picks-logo.png"
        alt="D1 Picks"
        width={config.logo}
        height={config.logo}
        className="drop-shadow-sm"
      />
      {showText && <span className="drop-shadow-sm">D1 Pick</span>}
    </span>
  );
}

/**
 * Larger featured badge for hero sections or callouts
 */
export function D1PickFeaturedBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`
        inline-flex items-center gap-3
        bg-gradient-to-br from-mlb-card via-mlb-cardHover to-mlb-card
        px-4 py-2.5 rounded-xl
        border-2 border-green-500/50
        shadow-xl shadow-green-500/20
        ${className}
      `}
    >
      <div className="relative">
        <Image
          src="/d1-picks-logo.png"
          alt="D1 Picks"
          width={36}
          height={36}
          className="drop-shadow-lg"
        />
        {/* Glow effect behind logo */}
        <div className="absolute inset-0 bg-green-500/30 blur-md rounded-full -z-10" />
      </div>
      <div className="flex flex-col">
        <span className="text-green-400 text-xs font-semibold uppercase tracking-wider">
          Featured
        </span>
        <span className="text-white text-lg font-bold tracking-tight">
          D1 Pick
        </span>
      </div>
    </div>
  );
}
