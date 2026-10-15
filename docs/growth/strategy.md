# Growth strategy: D1 Picks

## Decision

**The growth loop is on, for one cluster: women's D1 volleyball tournament and ratings explainers, each paired with our own data.** The loop writes guides under `/guides`. It never writes, edits or shares caps with anything the pipeline publishes: predictions, ratings, results and game previews (`pipeline/`, `data/volleyball/`, `content/volleyball-games/`, `/volleyball/*`, `/results`) keep their own guardrails and daily caps (`CLAUDE.md`, "Auto-publish exception"). The loop's write surface is `docs/growth/` and `content/guides/` only, enforced in `.github/workflows/growth-loop.yml`.

## What is in

| Topic | Examples | Built from |
|---|---|---|
| Tournament and seeding | how NCAA volleyball seeding, the selection process, at-large bids and regional seeds work; what bracketology is | NCAA and governing-body pages (`ncaa.org`, `ncaa.com`, `avca.org` only, as sources and as outbound links) |
| Ratings and RPI | how the RPI is built, what strength of schedule is, how a power rating differs from a poll | Same sources, explained next to our own ratings |

Every page must carry a tool or our own data (`gates.valueTypes` is `tool` and `data` only; fact-only queries are skipped before any Anthropic spend). The registered tools are `/volleyball/ratings` and `/results`. Every guide ends with a "See it in our data" section linking both, and the guide template adds a live "From our model" box (top five teams and the graded-record size) read from `src/site/data.ts`; no number in it is typed in or written by the loop. Rules and procedures cite NCAA pages with the date checked ("Sources and date checked", inserted and re-verified by the gates).

Pages are explainers of how the system works. They never say who will win a match, which team to back, or what a team's chances are in a game.

| Stage | Status |
|---|---|
| Brakes, measure | on (kill switch, `PAUSED` file, indexed share at 30 days, impression drop, manual-action flag) |
| Topic pick, draft, publish | on, `perRunPages: 1`, `weeklyPages: 1`, Anthropic cap $2 a month |
| Merge | **by hand** (`autoMerge: false`); each loop PR is a future-dated guide that Beau merges after `verify` passes |

## What is out (and how it is enforced)

Betting advice, picks, "best bets", predictions, projections, sportsbook promotions and bonuses, guarantees, "locks", anything implying profit or an edge, prediction markets and fantasy; every sport other than women's D1 volleyball (hockey stays gated until its model exists; baseball, basketball and the rest likewise); men's, club, high school, beach and pro volleyball; news, recruiting, tickets and live scores.

1. **Allowlist.** `allow.patterns` requires "volleyball" plus a seeding, bracket, RPI, rating, ranking, poll, tournament or "how it works" term. Anything else is logged as "outside the allowed cluster".
2. **Blocklist.** `skip.patterns` wins over the allowlist and carries a reason per rule in the log.
3. **Banned phrases.** `gates.bannedPhrases` (best bet, free pick, parlay, promo code, bonus bet, guaranteed, profit, beat the books, and similar) on top of the site's own `contentRules.bannedPhrases` (lock, guarantee, can't lose, sure thing, free money, max bet).
4. **Primary sources only.** `sources.requireDomains` limits SERP sources and outbound links to NCAA and AVCA domains. Sportsbook and odds sites are also on `sources.excludeDomains`.
5. **21+ line.** A guide whose body touches odds, betting, wagers, sportsbooks, gambling, spreads, moneylines, fair lines or parlays gets the responsible-gambling line (21+ only, 1-800-MY-RESET, link to `/responsible-gambling`) inserted by script; lint and `src/site/pages.test.ts` fail a guide that touches odds without it.
6. **Fact-check, duplicates, size.** Every number sits beside a link to a fetched NCAA page that contains it; no near-duplicate of an existing page; word and internal-link minimums.

## Where guides live, and how they stay clear of the model routes

`/guides` and `/guides/<slug>` (MDX collection `guides`, `content/guides/*.mdx`). The `/guides` hub exists only once a guide is live. Guides are dated by `publishDate` (never listed in `content/release-schedule.json`), 404 in production until their date and stay out of the sitemap, hubs and `llms.txt` until then. They count toward the kit's 3 editorial pages a week; the pipeline's data pages stay exempt through `releaseCadence.exemptPaths`, and the game-page caps in `pipeline/config/publishing.json` count only game pages.

## Switching on and off

`enabled` is `true` in `growth.config.json`, but the workflow exits with a notice until the secrets exist (`docs/growth/README.md`). Stop it with `"enabled": false`, or `touch docs/growth/PAUSED`. Hockey, women's basketball and baseball get their own clusters only after their model, backtest and ledger exist.
