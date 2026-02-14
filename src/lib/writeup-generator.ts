// Auto-generate write-ups for picks in the "nerdy analytical Barstool Sports" voice
// This is temporary until human-written write-ups are available

interface WriteUpContext {
  pickedTeam: string;
  opponent: string;
  isHome: boolean;
  pickedRank?: number;
  opponentRank?: number;
  venue?: string;
}

const TEMPLATES = [
  // Road dog templates
  {
    condition: (ctx: WriteUpContext) => !ctx.isHome && ctx.opponentRank && ctx.opponentRank <= 25,
    templates: [
      `{team} rolls into {venue} tonight as a live dog against {opponent}. The books are giving too much credit to the home chalk here. Fade the public, ride the value.`,
      `We're hammering {team} on the road against {opponent}. Yeah, {opponent} is ranked, but the market is overcorrecting. This line is too juicy to pass up.`,
      `{team} catching points on the road? Sign us up. {opponent} is solid at home, but the sharps are all over this number. Lock it in.`,
    ],
  },
  // Ranked team templates
  {
    condition: (ctx: WriteUpContext) => ctx.pickedRank && ctx.pickedRank <= 25,
    templates: [
      `#{rank} {team} should handle business here against {opponent}. The model loves the chalk in this spot, and frankly, so do we. Hammer the favorite.`,
      `Ranked teams don't stay ranked by accident. #{rank} {team} has the edge over {opponent}, and the line reflects value. Get in before it moves.`,
      `{team} is the real deal this season. The #{rank} ranking is deserved, and {opponent} doesn't match up well here. Play the favorite.`,
    ],
  },
  // Home team templates
  {
    condition: (ctx: WriteUpContext) => ctx.isHome,
    templates: [
      `{team} has home field advantage at {venue}, and that matters in college baseball. {opponent} is walking into a tough environment. We're backing the home squad.`,
      `There's something about playing at home that just hits different. {team} should take care of business against {opponent} in front of the home crowd.`,
      `Home cooking for {team} tonight. {opponent} is making the trip, and historically, {team} is money at {venue}. Ride with the home team.`,
    ],
  },
  // Default templates
  {
    condition: () => true,
    templates: [
      `{team} has our attention today against {opponent}. The numbers line up, the matchup is favorable, and we're putting our money where our mouth is.`,
      `The model is screaming {team} in this one. {opponent} is no slouch, but the edge is clear. Trust the process, take {team}.`,
      `Sometimes the pick is just obvious. {team} over {opponent}. The analytics back it up, and we're not overthinking it. Lock it in.`,
      `{team} gets our bet today. The line is right, the matchup favors them, and we're riding the edge. Let's get this bread.`,
    ],
  },
];

export function generateWriteUp(context: WriteUpContext): string {
  // Find the first matching template group
  const templateGroup = TEMPLATES.find(t => t.condition(context));
  if (!templateGroup) return '';

  // Pick a random template from the group
  const template =
    templateGroup.templates[Math.floor(Math.random() * templateGroup.templates.length)];

  // Fill in the template
  return template
    .replace(/{team}/g, context.pickedTeam)
    .replace(/{opponent}/g, context.opponent)
    .replace(/{venue}/g, context.venue || 'the ballpark')
    .replace(/{rank}/g, String(context.pickedRank || ''));
}

// Generate a consistent write-up (seeded by team names for consistency)
export function generateConsistentWriteUp(context: WriteUpContext): string {
  // Use a simple hash to get consistent results
  const seed = (context.pickedTeam + context.opponent).split('').reduce((a, b) => {
    const c = a + b.charCodeAt(0);
    return c & c;
  }, 0);

  // Find the first matching template group
  const templateGroup = TEMPLATES.find(t => t.condition(context));
  if (!templateGroup) return '';

  // Pick a template based on the seed
  const template = templateGroup.templates[Math.abs(seed) % templateGroup.templates.length];

  // Fill in the template
  return template
    .replace(/{team}/g, context.pickedTeam)
    .replace(/{opponent}/g, context.opponent)
    .replace(/{venue}/g, context.venue || 'the ballpark')
    .replace(/{rank}/g, String(context.pickedRank || ''));
}
