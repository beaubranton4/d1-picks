# D1 Baseball Picks - Project Guidelines

## Project Vision

**Vibe**: Nerdy analytical Barstool Sports

Combine sharp quantitative analysis with casual, conversational sports betting content. Think: data-driven picks with personality.

## Tone & Style

### Voice
- **Analytical**: Show the math, explain the edge
- **Nerdy**: Reference advanced stats, models, probability theory
- **Conversational**: Write like you're talking to a buddy at the bar
- **Confident but honest**: "This is a good bet" not "This is a lock!"
- **Data-first**: Let the numbers do the talking

### Content Guidelines
- Lead with the edge percentage (the money stat)
- Explain *why* the model likes it
- Call out key factors (home field, matchup, trends)
- Use sports betting lingo naturally (juice, dog, chalk, fade, hammer)
- Be transparent about methodology
- No hype, just edges

### Examples

**Good**:
> **LSU (+130) @ Alabama - STRONG BET**
> +7.2% edge | Model: 43% win prob vs 35% implied
> The model loves this dog. Warren Nolan gives LSU a 43% shot, but FanDuel is pricing them at just 35%. That's a meaty 7.2% edge after the +0.5% home field adjustment for Bama. Fade the chalk, ride the value.

**Bad**:
> LSU is definitely going to win this game!

### UI/UX Principles
- Numbers front and center (edge %, probabilities)
- Clean, scannable layout (cards not walls of text)
- Color-coded by strength (green = strong, blue = good, yellow = lean)
- Quick reference stats (moneyline, book, edge)
- Expandable details for the nerds

## Technical Philosophy

- **Data quality over quantity**: Better to show 3 strong bets than 20 weak ones
- **Transparency**: Show the model probability, implied probability, and edge calculation
- **Conservative thresholds**: Only show +EV picks that actually have edge
- **Modifiers**: Apply home field and neutral site adjustments
- **Best odds**: Always show the best available line

## Design Aesthetic

- **Colors**:
  - Strong bet: Green (money, confidence)
  - Good bet: Blue (solid, trustworthy)
  - Weak bet: Yellow (caution, marginal)
  - Background: Light gray (clean, professional)
- **Typography**: Sans-serif, readable, modern
- **Cards**: Elevated (shadow), clean borders
- **Spacing**: Generous whitespace, easy to scan
- **Mobile-first**: Optimized for checking picks on phone

## Content Hierarchy

### Primary (always visible)
1. Team matchup
2. Bet classification (STRONG/GOOD/WEAK)
3. Edge percentage
4. Moneyline & sportsbook
5. Game time & venue

### Secondary (expandable or smaller)
- Model probability
- Implied probability
- Raw vs adjusted edge
- Modifier explanation (home/neutral)

## Brand Personality

- **Smart but accessible**: Advanced analytics explained simply
- **Confident but realistic**: "This is a good bet" not "guaranteed winner"
- **Sports-focused**: Baseball lingo, stats, matchup context
- **Community-oriented**: Share the picks, track performance, learn together
- **Anti-tout**: No BS, no selling picks, just math and edges

## Future Enhancements (stay on brand)

- **Performance tracking**: Show historical ROI, win rate, edge calibration
- **Bet logs**: Let users track their actual bets
- **Discord/Twitter integration**: Share picks automatically
- **Push notifications**: "New strong bet: LSU +130 @ Alabama"
- **Historical trends**: "LSU as road dogs in SEC play"
- **Line movement tracking**: "This line moved from +125 to +130"
- **Model explanations**: Deep dives on how Warren Nolan works
- **EV calculator**: Let users input their own model probabilities

## Don'ts

- ❌ No hype ("LOCK OF THE CENTURY!")
- ❌ No guarantees ("100% winning system")
- ❌ No selling picks (this is free, always)
- ❌ No hiding methodology (show the math)
- ❌ No cherry-picking (show all +EV bets above threshold)
- ❌ No ignoring variance (betting is probabilistic)
- ❌ No pretending to be experts (we trust the model)

## Example Pick Card

```
┌─────────────────────────────────────────────────┐
│ 🟢 STRONG BET                                   │
│                                                 │
│ LSU Tigers @ Alabama Crimson Tide               │
│ 3:00 PM ET • Tuscaloosa (home: Alabama)         │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ LSU +130 (FanDuel)            +7.2% edge │  │
│ │ Model: 43% | Implied: 35%                │  │
│ │ Home adjustment: +0.5% for Bama          │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ Why we like it: Warren Nolan gives LSU a 43%   │
│ win probability, but the books are only         │
│ pricing them at 35%. That's a fat +7.2% edge.  │
│ The Tigers are live in Tuscaloosa.              │
└─────────────────────────────────────────────────┘
```

## Tech Stack Alignment

The Next.js/TypeScript/Tailwind stack supports this vision:
- Fast loading = better UX for checking picks
- TypeScript = fewer bugs in edge calculations
- Tailwind = quick iteration on design/colors
- React = component reuse for consistent UI
- Static generation = reliable, fast, cheap hosting

## Measuring Success

- **Edge accuracy**: Do the picks actually have edge?
- **User engagement**: Are people checking daily?
- **Performance**: Are we beating the closing line?
- **Trust**: Are users confident in the methodology?
- **Accessibility**: Can anyone understand the picks?

---

**Remember**: The vibe is sharp analysis meets sports bar conversation. Data-driven betting with personality. No BS, just edges.
