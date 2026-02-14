'use client';

import { useState } from 'react';

interface PickWriteUpProps {
  writeUp: string;
  pickedTeam: string;
}

export function PickWriteUp({ writeUp, pickedTeam }: PickWriteUpProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!writeUp) return null;

  return (
    <div className="border-t border-mlb-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm text-mlb-textSecondary hover:text-mlb-textPrimary hover:bg-mlb-cardHover transition-colors"
      >
        <span className="font-medium">Why {pickedTeam}?</span>
        <span className="text-mlb-textMuted">{isExpanded ? '▲' : '▼'}</span>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 text-sm text-mlb-textSecondary leading-relaxed">{writeUp}</div>
      )}
    </div>
  );
}
