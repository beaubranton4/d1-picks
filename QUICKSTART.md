# 🚀 Quick Start Guide

## First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
echo "ODDS_API_KEY=de07f69dc94b1d04ca12286799334aa6" > .env.local

# 3. Start development server
npm run dev
```

Visit **http://localhost:3000** to see today's picks!

## Development Workflow

### Make Changes & See Them Instantly

1. **Edit any file** in `src/`
2. **Save** (Cmd+S / Ctrl+S)
3. **Browser auto-reloads** - see changes immediately!

No need to restart the server or regenerate HTML files.

### Common Edits

#### Add a new team mapping
Edit `src/data/team-mappings.json`:
```json
{
  "new_team": ["new team", "team nickname", "alias"]
}
```

#### Change edge thresholds
Edit `src/lib/calculators/classifier.ts`:
```typescript
export function classifyBet(adjustedEdge: number): BetClassification {
  if (adjustedEdge >= 0.08) return 'STRONG BET';  // was 0.07
  // ...
}
```

#### Modify home team modifier
Edit `src/lib/calculators/ev-calculator.ts`:
```typescript
if (isHome) {
  modifier = 0.01;  // was 0.005 (+0.5%), now +1.0%
  modifierReason = 'home: +1.0%';
}
```

#### Add more sportsbooks
Edit `src/lib/scrapers/odds-api.ts`:
```typescript
url.searchParams.set('bookmakers', 'draftkings,fanduel,betmgm,caesars');
```

#### Change UI colors
Edit `src/components/EdgeBadge.tsx` - modify the color classes:
```typescript
case 'STRONG BET':
  return 'bg-green-100 border-green-500 text-green-900';
```

## Building for Production

```bash
# Build static site
npm run build

# Output will be in out/ directory
ls out/
```

## Viewing Different Dates

- **Today**: http://localhost:3000
- **Tomorrow**: http://localhost:3000/2026-02-13
- **Any date**: http://localhost:3000/YYYY-MM-DD

## Deployment

### Option 1: Vercel (Easiest)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add `ODDS_API_KEY` in Vercel dashboard.

### Option 2: Netlify

```bash
npm run build
netlify deploy --prod --dir=out
```

### Option 3: GitHub Pages

```bash
npm run build
npx gh-pages -d out
```

## Troubleshooting

### Port 3000 already in use
Next.js will automatically use the next available port (3001, 3002, etc.).

### TypeScript errors
```bash
npx tsc --noEmit
```

### Clear build cache
```bash
rm -rf .next out
npm run build
```

### "No games found"
This is normal if:
- It's not baseball season (Feb-June typically)
- Warren Nolan doesn't have data for that date yet
- The date is too far in the future

## Daily Workflow

During baseball season:

```bash
# 1. Start dev server
npm run dev

# 2. Visit http://localhost:3000 to see today's picks

# 3. Check different dates:
# http://localhost:3000/2026-02-13
# http://localhost:3000/2026-02-14
# etc.

# 4. When ready to deploy:
npm run build
vercel --prod
```

## Project Commands

```bash
npm run dev       # Start dev server with hot reload
npm run build     # Build for production
npm run start     # Preview production build locally
npm run lint      # Run ESLint
```

## File Locations

```
src/
├── app/[date]/page.tsx        # Main picks page (edit to change layout)
├── components/GameCard.tsx    # Game card design
├── components/EdgeBadge.tsx   # Bet classification badge
├── lib/scrapers/              # Data fetching
├── lib/calculators/           # EV calculations
└── data/team-mappings.json    # Team name aliases
```

## Environment Variables

Create `.env.local`:
```env
ODDS_API_KEY=your_api_key_here
```

Get a free key: https://the-odds-api.com

## Need Help?

1. Check console logs in terminal
2. Check browser console (F12)
3. Read `README-NEXTJS.md` for detailed docs
4. Check `IMPLEMENTATION_SUMMARY.md` for architecture

---

**That's it! You're ready to generate picks.** 🎉
