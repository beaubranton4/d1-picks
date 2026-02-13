# D1 Baseball Picks - Next.js Version

Daily +EV college baseball betting picks based on Warren Nolan predictions and real-time sportsbook odds.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev
```

Visit http://localhost:3000 to see today's picks (or the next available date).

### Build for Production

```bash
# Build static site
npm run build

# Preview production build
npm run start
```

The static site will be exported to the `out/` directory.

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page (redirects to today)
│   ├── globals.css             # Tailwind styles
│   └── [date]/
│       └── page.tsx            # Daily picks page
├── components/
│   ├── Header.tsx              # Page header with logo
│   ├── GameCard.tsx            # Game card component
│   ├── EdgeBadge.tsx           # Edge classification badge
│   └── NoPicksMessage.tsx      # No picks message
├── lib/
│   ├── types.ts                # TypeScript types
│   ├── normalizer.ts           # Team name normalization
│   ├── scrapers/
│   │   ├── warren-nolan.ts     # Scrape Warren Nolan
│   │   └── odds-api.ts         # Fetch from The Odds API
│   └── calculators/
│       ├── ev-calculator.ts    # EV edge calculation
│       └── classifier.ts       # Bet classification
└── data/
    └── team-mappings.json      # Team name mappings
```

## 🎯 How It Works

1. **Scrape Predictions**: Fetches game predictions from Warren Nolan
2. **Fetch Odds**: Gets real-time moneyline odds from The Odds API
3. **Normalize Teams**: Matches team names between sources
4. **Calculate EV**: Computes expected value edges
5. **Classify Bets**: Categorizes as STRONG/GOOD/WEAK BET or PASS
6. **Display Picks**: Shows only +EV picks sorted by edge

## 📊 Edge Classifications

- **STRONG BET**: ≥ 7.0% edge
- **GOOD BET**: ≥ 5.0% edge
- **WEAK BET**: ≥ 3.0% edge
- **PASS**: < 3.0% edge (hidden)

## 🔧 Configuration

### Environment Variables

Create `.env.local`:

```env
ODDS_API_KEY=your_api_key_here
```

Get a free API key from [The Odds API](https://the-odds-api.com).

### Generate Pages for Different Dates

Edit `src/app/[date]/page.tsx` to modify the `generateStaticParams` function:

```typescript
export async function generateStaticParams() {
  const dates: Array<{ date: string }> = [];
  const today = new Date();

  // Generate pages for next 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dates.push({ date: dateStr });
  }

  return dates;
}
```

## 📱 Usage

### View Picks for a Specific Date

Visit `http://localhost:3000/2026-02-13` (replace with your date in YYYY-MM-DD format).

### View Today's Picks

Visit `http://localhost:3000` and it will redirect to today's date.

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add your `ODDS_API_KEY` in the Vercel dashboard under Environment Variables.

### Netlify

```bash
# Build
npm run build

# Deploy the out/ directory
netlify deploy --prod --dir=out
```

### GitHub Pages

```bash
# Build
npm run build

# Push the out/ directory to gh-pages branch
npx gh-pages -d out
```

## 🎨 Customization

### Modify Edge Thresholds

Edit `src/lib/calculators/classifier.ts`:

```typescript
export function classifyBet(adjustedEdge: number): BetClassification {
  if (adjustedEdge >= 0.08) return 'STRONG BET';  // Change threshold
  // ...
}
```

### Add More Sportsbooks

Edit `src/lib/scrapers/odds-api.ts`:

```typescript
url.searchParams.set('bookmakers', 'draftkings,fanduel,betmgm,caesars,betrivers');
```

### Modify Home Team Modifier

Edit `src/lib/calculators/ev-calculator.ts`:

```typescript
if (isHome) {
  modifier = 0.01;  // Change to +1.0%
  modifierReason = 'home: +1.0%';
}
```

## 🧪 Development Tips

### Hot Reload

The dev server automatically reloads when you change files. No need to restart!

### Check for Errors

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

### Debug Scraper

Open `src/lib/scrapers/warren-nolan.ts` and check console logs during build.

## 🔍 Troubleshooting

### "No games found"

- Warren Nolan may not have data for that date
- Check the URL in console output and visit manually
- Baseball season typically runs Feb-June

### "No odds available"

- The Odds API free tier has limited requests
- Check your API quota in response headers
- Sportsbooks may not have posted odds yet

### Build fails

```bash
# Clear cache
rm -rf .next out

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

## 📈 Performance

- Static page generation: ~2-3 seconds per date
- Page load: ~50-100ms (static HTML)
- Hot reload: <500ms for code changes

## 📝 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Scraping**: Cheerio
- **Deployment**: Vercel/Netlify/GitHub Pages

## ⚠️ Disclaimer

For entertainment purposes only. Betting involves risk. Always bet responsibly and within your means.

## 📄 License

MIT
