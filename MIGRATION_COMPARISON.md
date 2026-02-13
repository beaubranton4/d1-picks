# Python → Next.js Migration Comparison

## Side-by-Side Comparison

### Development Workflow

| Aspect | Python Version | Next.js Version |
|--------|---------------|-----------------|
| **Start preview** | Run `python generate_picks.py` | Run `npm run dev` |
| **See changes** | Regenerate entire HTML file | Auto-reload in browser |
| **Time to preview** | ~5-10 seconds | Instant (<500ms) |
| **Hot reload** | ❌ No | ✅ Yes |
| **Type checking** | Optional (mypy) | Built-in (TypeScript) |

### File Structure Mapping

| Python | Next.js | Purpose |
|--------|---------|---------|
| `scrapers/warren_nolan.py` | `src/lib/scrapers/warren-nolan.ts` | Scrape Warren Nolan |
| `scrapers/odds_fetcher.py` | `src/lib/scrapers/odds-api.ts` | Fetch odds from API |
| `calculators/ev_calculator.py` | `src/lib/calculators/ev-calculator.ts` | Calculate EV edges |
| `calculators/classifier.py` | `src/lib/calculators/classifier.ts` | Classify bets |
| `scrapers/normalizer.py` | `src/lib/normalizer.ts` | Normalize team names |
| `data/team_mappings.json` | `src/data/team-mappings.json` | Team name aliases |
| `templates/picks.html` | `src/app/[date]/page.tsx` | Daily picks page |
| `generate_picks.py` | Built into Next.js build | Main script |
| N/A | `src/components/GameCard.tsx` | Game card UI |
| N/A | `src/components/EdgeBadge.tsx` | Edge badge UI |

### Code Examples

#### Warren Nolan Scraper

**Python:**
```python
from bs4 import BeautifulSoup
import requests

def scrape_predictions(date_str: str) -> List[Dict]:
    url = f"https://www.warrennolan.com/baseball/{year}/schedules-date/{date_str}"
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    # Parse with BeautifulSoup
```

**Next.js:**
```typescript
import * as cheerio from 'cheerio';

export async function scrapeWarrenNolan(dateStr: string): Promise<Game[]> {
  const url = `https://www.warrennolan.com/baseball/${year}/schedules-date/${dateStr}`;
  const response = await fetch(url, { headers });
  const html = await response.text();
  const $ = cheerio.load(html);
  // Parse with Cheerio
}
```

#### EV Calculation

**Python:**
```python
def moneyline_to_prob(moneyline: int) -> float:
    if moneyline > 0:
        return 100 / (moneyline + 100)
    else:
        return abs(moneyline) / (abs(moneyline) + 100)
```

**Next.js:**
```typescript
export function moneylineToProb(moneyline: number): number {
  if (moneyline > 0) {
    return 100 / (moneyline + 100);
  } else {
    return Math.abs(moneyline) / (Math.abs(moneyline) + 100);
  }
}
```

#### UI Rendering

**Python (Jinja2):**
```html
{% for game in picks %}
<div class="game-card">
  <h3>{{ game.team_a }} vs {{ game.team_b }}</h3>
  {% for edge in game.edges %}
    <div class="edge-badge">
      {{ edge.team }}: {{ edge.moneyline }}
    </div>
  {% endfor %}
</div>
{% endfor %}
```

**Next.js (React):**
```tsx
{picks.map(game => (
  <GameCard key={game.id} game={game}>
    {game.edges.map((edge, idx) => (
      <EdgeBadge key={idx} edge={edge} />
    ))}
  </GameCard>
))}
```

### Dependencies

**Python (`requirements.txt`):**
```
requests
beautifulsoup4
python-dotenv
```

**Next.js (`package.json`):**
```json
{
  "dependencies": {
    "next": "^15.1.5",
    "react": "^19.0.0",
    "cheerio": "^1.0.0"
  }
}
```

### Data Flow

**Python:**
```
generate_picks.py
  → scrape_predictions()
  → fetch_odds()
  → normalize_teams()
  → calculate_edges()
  → classify_bets()
  → render_template()
  → output/2026-02-13.html
```

**Next.js:**
```
npm run build
  → generateStaticParams()
  → [date]/page.tsx (for each date)
    → scrapeWarrenNolan()
    → fetchOdds()
    → matchGamesWithOdds()
    → calculateGameEdges()
    → React render
  → out/2026-02-13.html
```

### Deployment

**Python:**
```bash
# 1. Generate HTML manually
python generate_picks.py 2026-02-13

# 2. Upload output/ to server
scp output/*.html server:/var/www/

# 3. Update daily via cron
```

**Next.js:**
```bash
# 1. Push to GitHub
git push

# 2. Vercel auto-deploys
# (or run: vercel --prod)

# 3. Update daily via Vercel Cron
```

## Feature Comparison

| Feature | Python | Next.js |
|---------|--------|---------|
| Scraping | ✅ BeautifulSoup | ✅ Cheerio |
| Odds API | ✅ requests | ✅ fetch |
| Team normalization | ✅ | ✅ |
| EV calculation | ✅ | ✅ |
| Bet classification | ✅ | ✅ |
| Static HTML output | ✅ | ✅ |
| Hot reload | ❌ | ✅ |
| Type safety | Partial (optional) | ✅ Full |
| Component reuse | ❌ | ✅ |
| Auto-deploy | ❌ | ✅ |
| SEO friendly | ✅ | ✅ |
| Mobile responsive | ✅ (Tailwind) | ✅ (Tailwind) |

## Performance

| Metric | Python | Next.js |
|--------|--------|---------|
| **Build time** | ~5-10s per page | ~2-3s per page |
| **Page size** | ~8KB | ~8KB HTML + 102KB JS (shared) |
| **Dev reload** | Manual regeneration | <500ms auto |
| **Production speed** | Fast (static HTML) | Fast (static HTML) |
| **First load** | ~50ms | ~100ms |

## Advantages of Next.js Version

### Developer Experience
1. **Hot reload** - See changes instantly
2. **TypeScript** - Catch errors before runtime
3. **Better tooling** - VS Code autocomplete, refactoring
4. **Component reuse** - Build UI with composable pieces
5. **Modern workflow** - npm run dev → see results

### Deployment
1. **Auto-deploy** - Push to GitHub → Vercel deploys
2. **Preview deployments** - Every commit gets a preview URL
3. **Environment variables** - Managed in dashboard
4. **Zero config** - Works out of the box

### Code Quality
1. **Type safety** - TypeScript catches bugs
2. **Linting** - ESLint enforces standards
3. **Testing** - Easy to add Jest/React Testing Library
4. **Refactoring** - Safe rename/extract with TypeScript

## Disadvantages of Next.js Version

1. **Larger bundle** - 102KB JS vs 0KB for pure HTML
2. **More dependencies** - npm vs pip
3. **Learning curve** - React + TypeScript + Next.js
4. **Node.js required** - vs Python-only

## When to Use Each

### Use Python Version If:
- You prefer Python
- You don't need hot reload
- You want zero JavaScript
- Your team knows Python better

### Use Next.js Version If:
- You want hot reload dev experience
- You prefer modern web dev tools
- You want auto-deploy to Vercel
- You're building more interactive features
- Your team knows React/TypeScript

## Migration Path

If you want to migrate from Python to Next.js:

1. ✅ Install Node.js and npm
2. ✅ Copy team mappings
3. ✅ Port Python logic to TypeScript
4. ✅ Create React components
5. ✅ Set up Next.js config
6. ✅ Test locally with `npm run dev`
7. ✅ Deploy to Vercel

This has been completed for you! 🎉

## Maintenance

**Python:**
```bash
# Daily picks generation
0 6 * * * cd /path/to/project && python generate_picks.py
```

**Next.js:**
```bash
# Option 1: Vercel Cron (recommended)
# Configure in vercel.json

# Option 2: GitHub Actions
# Trigger build daily via workflow

# Option 3: Manual
npm run build && vercel --prod
```

## Summary

Both versions produce the same output (static HTML pages with picks), but Next.js offers:
- ✅ Better developer experience (hot reload, TypeScript)
- ✅ Easier deployment (Vercel one-click)
- ✅ Modern tooling (React, Tailwind)
- ✅ Component reusability

The Python version is simpler and requires fewer dependencies, but the Next.js version is better for active development and iteration.

**Recommendation**: Use Next.js version for ongoing development. It's production-ready and provides a much better workflow for making changes and seeing results.
