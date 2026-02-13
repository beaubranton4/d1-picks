# D1 Baseball Picks

## Project Overview

A free D1 college baseball picks site showing +EV betting opportunities. Built to provide genuine value that competitors charge $10-250/month for.

## Brand Voice

**Nerdy analytical Barstool Sports vibe:**
- Data-driven, not gut picks
- Casual/fun but backed by math
- Self-aware, not taking itself too seriously
- "Here's the edge, here's why, you decide"

## Core Philosophy

Give ALL value away for free. No paywalls, no premium tiers (for now). Build an audience by providing genuine value to college baseball bettors, then expand to other D1 sports.

## Goals

1. Launch and start building traffic
2. Provide real value that competitors charge $10-250/month for
3. Build an email list / audience you own
4. Eventually expand to D1 basketball, football, etc.

## Tech Stack

- **Framework**: Next.js 15 + TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (SSG)
- **Data Sources**: Warren Nolan predictions + The Odds API
- **Email**: Buttondown
- **Analytics**: Vercel Analytics

## Architecture

```
Data Flow:
Warren Nolan Scraper → Odds API → EV Calculator → Classification → GameCard UI
```

Key directories:
- `src/app/[date]/page.tsx` - Daily picks page (SSG)
- `src/components/` - React components (Header, GameCard, EdgeBadge, etc.)
- `src/lib/scrapers/` - Warren Nolan and Odds API scrapers
- `src/lib/calculators/` - EV calculator and edge classifier

## Key Decisions

- **Free forever**: Core picks are always free. Build trust before monetizing.
- **Niche focus**: D1 college baseball is underserved by major competitors
- **Simple UX**: No account needed, no signup walls, just picks
- **SSG**: Static generation for speed and cost efficiency

## Environment Variables

- `ODDS_API_KEY` - Required for fetching live odds from The Odds API

## Commands

```bash
npm run dev     # Local development
npm run build   # Production build
npm run start   # Production server
vercel --prod   # Deploy to production
```

## Competitive Advantage

1. **100% Free** - Competitors charge $10-249/month
2. **Niche Focus** - D1 college baseball is underserved
3. **Simplicity** - No account needed, no signup walls
4. **Credible Source** - Warren Nolan is a respected model
5. **Community-First** - Build trust before monetizing
