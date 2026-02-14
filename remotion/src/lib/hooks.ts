/**
 * TikTok-style hooks and captions for viral sports betting content
 */

export interface HookTemplate {
  text: string;
  subtext?: string;
  style: 'warning' | 'hype' | 'insider' | 'question' | 'bold';
}

/**
 * Hook templates that grab attention in the first 1-2 seconds
 */
export const hookTemplates: HookTemplate[] = [
  // Warning/Alert style hooks
  { text: "STOP SCROLLING", subtext: "You need to see these picks", style: 'warning' },
  { text: "THE BOOKS HATE THIS", subtext: "3 bets they don't want you to make", style: 'warning' },
  { text: "DON'T BET TODAY", subtext: "Until you see this", style: 'warning' },

  // Hype/Excitement hooks
  { text: "OPENING DAY LOCKS", subtext: "College baseball is BACK", style: 'hype' },
  { text: "FREE MONEY ALERT", subtext: "The model found an edge", style: 'hype' },
  { text: "WE'RE EATING TODAY", subtext: "3 picks. Let's ride.", style: 'hype' },

  // Insider/Knowledge hooks
  { text: "The sharps are on this", subtext: "Here's why", style: 'insider' },
  { text: "Books moved the line", subtext: "We got in early", style: 'insider' },
  { text: "Vegas doesn't want you to know", subtext: "But we're telling you anyway", style: 'insider' },

  // Question hooks
  { text: "Would you take this?", subtext: "+135 on a ranked team", style: 'question' },
  { text: "This line makes no sense", subtext: "Let me explain", style: 'question' },

  // Bold/Confident hooks
  { text: "BEST BET OF THE DAY", subtext: "Not even close", style: 'bold' },
  { text: "THIS IS THE ONE", subtext: "Max units. No hesitation.", style: 'bold' },
  { text: "LOCK IT IN", subtext: "Thank me later", style: 'bold' },
];

/**
 * Get a random hook, optionally filtered by style
 */
export function getRandomHook(style?: HookTemplate['style']): HookTemplate {
  const filtered = style
    ? hookTemplates.filter(h => h.style === style)
    : hookTemplates;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Get a hook based on pick data
 */
export function getContextualHook(pickCount: number, hasHighConfidence: boolean): HookTemplate {
  if (hasHighConfidence) {
    return getRandomHook('bold');
  }
  if (pickCount >= 3) {
    return { text: `${pickCount} PICKS TODAY`, subtext: "All +EV. All fire.", style: 'hype' };
  }
  return getRandomHook('hype');
}

/**
 * Call-to-action templates
 */
export const ctaTemplates = [
  { main: "Follow for daily picks", handle: "@d1sportpicks" },
  { main: "Free picks every day", handle: "@d1sportpicks" },
  { main: "No paywall. No BS.", handle: "@d1sportpicks" },
  { main: "Link in bio for more", handle: "@d1sportpicks" },
  { main: "d1picks.com", handle: "@d1sportpicks" },
];

export function getRandomCTA() {
  return ctaTemplates[Math.floor(Math.random() * ctaTemplates.length)];
}

/**
 * Pick reveal text based on moneyline
 */
export function getPickRevealText(team: string, moneyline: number): string {
  const ml = moneyline > 0 ? `+${moneyline}` : `${moneyline}`;

  if (moneyline >= 150) {
    return `${team} ${ml} is a DOG play`;
  }
  if (moneyline >= 100) {
    return `${team} ${ml} - Plus money? Yes please`;
  }
  if (moneyline >= -120) {
    return `${team} ${ml} - Small chalk, big edge`;
  }
  return `${team} ${ml} - Laying the juice here`;
}

/**
 * Analysis snippets for quick TikTok-style breakdowns
 */
export function getQuickAnalysis(pickLabel: string, units: number): string {
  const unitText = units >= 2 ? "MAX CONFIDENCE" : "Solid play";

  switch (pickLabel) {
    case 'D1 PICK':
      return `${unitText} - This is THE pick of the day`;
    case 'SMART BET':
      return `${unitText} - Model loves this matchup`;
    case 'LEAN':
      return `${unitText} - Value is there at this price`;
    default:
      return unitText;
  }
}
