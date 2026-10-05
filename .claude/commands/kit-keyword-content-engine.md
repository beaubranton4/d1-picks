---
description: Weekly content pipeline. DataForSEO keyword discovery, scoring, SERP and AI-Overview check, brief, then a draft that lands as a pull request with a future publishDate. Never auto-publishes. Usage: /kit-keyword-content-engine [seed keyword or target keyword]
---
<!-- site-kit v0.1.0 -->

# Keyword content engine

Discovery to draft in four phases, with a hard budget. For a one-off keyword
or SERP question use the `dataforseo-research` skill instead of this pipeline.

## Configuration (all from the repo, nothing hardcoded)

- Site, audience and voice: `site.config.json` (`name`, `tagline`, `description`, `authors`) and `CLAUDE.md`.
- Competitors: `site.config.json` `competitors`.
- Seeds and history (create lazily, commit the first two):
  - `data/keyword-research/seeds.json` (editable seed list)
  - `data/keyword-research/published.json` (keywords already targeted; dedupe against it)
  - `data/keyword-research/last_run.json` (gitignore it)
- Locale: US English unless the site says otherwise (`location_code` 2840, `language_code` en).
- API: the DataForSEO MCP tool (`mcp__dataforseo__api_request`) or `node scripts/kit/dataforseo.ts`. Each call prints its cost.

## Budget (hard)

Target 0.10 USD per run, ceiling 0.50 USD. At most 3 seeds, `limit` at most 200
per call, never loop an endpoint without a bounded count. If spend passes 0.25
USD before phase 3, stop and report.

## Phase 1: discovery (1 call)

`dataforseo_labs/google/keyword_suggestions/live` for up to 3 seeds (from
`$ARGUMENTS` or the least recently used in `seeds.json`). Keep
`search_volume > 50` and `keyword_difficulty < 35`. Dedupe across seeds and
against `published.json` and existing page titles.

## Phase 2: score (0-1 calls)

Drop queries under 3 words and pure shopping queries unless the site is an
affiliate site. Score `(volume / 1000) * (1 - kd / 100) * intent`, intent
multipliers informational 1.2, commercial 1.5, transactional 0.8,
navigational 0.3. Keep the top 15.

## Phase 3: SERP + AI-Overview check (up to 5 calls)

`serp/google/organic/live/advanced` for each of the top 5 (`depth` 10,
`load_async_ai_overview: true`). Live SERP endpoints take ONE task per
request, so this is one call per keyword; stop early once a clear winner
emerges. For each, record: who ranks (domain strength, content type,
freshness, gaps) and **whether `ai_overview` appears in `item_types`**.
Without `load_async_ai_overview` only cached overviews are returned and
presence is undercounted.

Apply the **AI-Overview filter** (CLAUDE.md): if the AI Overview answers the
query completely, the page only gets built paired with a tool, printable,
original data or verified listings. If none of those is credible, drop it.

Optional: one `dataforseo_labs/google/ranked_keywords/live` per competitor
(limit 200) for gap bonus. Pick the winner: high score, weak SERP, passes the filter.

## Phase 4: brief, then draft as a PR (0 calls)

1. Write the brief to `docs/content-briefs/YYYY-MM-DD-<slug>.md`: target and secondary keywords, search intent, SERP notes, AI-Overview verdict, the built thing (tool/printable/data/listings), outline, internal links (2-3 existing released pages, resolved through the registry), and the sources to cite.
2. Draft the MDX entry in the right collection with frontmatter `title` (50-60 chars, keyword included), `description` (70-160 chars), `author` (a real author slug), and **`publishDate` in the future, chosen with `/kit-release-plan`**. Never today-or-earlier unless the user explicitly says to publish now.
3. Body rules: no H1 (the template renders the title), `##` sections, keyword in the first 100 words and one H2, images only through `<Img>`, affiliate links only through `<AffiliateLink id>`. Every statistic links to its source. No invented facts, people, businesses, quotes, ratings or stats. First-hand language only when the named author actually did the thing.
4. `npm run lint:content` must pass.
5. Create a branch, commit (brief + entry + any images), push, and open a PR whose description lists the target keyword, the publishDate, and the AI-Overview verdict. **Do not merge. Do not set a past date. Do not publish.** The release date does the publishing after a human merges.

## Log

Append to `last_run.json`: date, seeds, keywords evaluated, winner, cost
reported by the API (never an invented figure), file, PR URL. Append the
winner to `published.json`.

## Report

Winner and why, the AI-Overview verdict, total API cost as reported, and the PR link.
