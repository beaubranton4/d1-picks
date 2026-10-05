@AGENTS.md

# D1 Picks site rules

D1 Picks (https://www.d1picks.com) publishes college sports predictions from a
published model and grades every one in public. It is built from **site-kit**
(the kit rules below are the kit's, with two explicit exceptions for this
site) plus a Python pipeline in `pipeline/` that writes everything the pages
show. Read `README.md` once for the layout and the daily job.

## Decisions on record (Beau, 2026-10-04)

- **Sport order:** women's volleyball now, then hockey, then women's basketball (November), then baseball as the flagship from February 2027. No football or men's basketball.
- **Canonical host: www** (`https://www.d1picks.com`). This is an exception to the kit's apex rule; the apex 308s to www in Vercel.
- **Auto-publish:** model output AND generated written analysis publish automatically. This is an exception to the kit's "drafts never auto-publish" rule. The guardrails below replace human review.
- **No affiliate links. No paid odds source. No Kalshi prices** until Beau decides. Pages show our probabilities and fair lines only, and make no bet calls.
- **The record starts at zero.** No backfilled, preseason or invented results, ever.

## Auto-publish exception and its guardrails

What publishes without a human edit: the predictions hub, ratings, results,
and the gated match previews (`content/volleyball-games/*.mdx`, written by
`pipeline/pages.py` and `pipeline/writer.py`). Editorial pages (anything a
person writes) still follow the kit rule: a pull request with a future date,
merged by a human, at most 3 per ISO week.

The exception holds only while every guardrail holds. Each is enforced in code:

| Guardrail | Enforced by |
|---|---|
| **Every number on a page traces to saved model output or saved source data** (`data/<sport>/`: results, ratings snapshots, the ledger, facts files). No hardcoded statistics in templates. Explanatory constants (21+, a coin flip's 0.250 Brier) are not data claims. | Pages read only `src/site/data.ts`. Generated prose: `pipeline/pages.py` `check_page()` refuses any number not in the page's formatted facts and any facts that disagree with the ledger; `python -m pipeline.run check` and `src/site/pages.test.ts` re-check every page in CI |
| **The content lint passes** (kit list plus `contentRules.bannedPhrases`: lock, guarantee, can't lose, sure thing, free money, max bet, back up the truck) | Pipeline pre-check (`copy_problems`), then `npm run lint:content` in the daily job and CI; a failure stops the publish |
| **Anti-scaled-content caps:** at most 5 game pages per sport per day and 12 site-wide; only matches that pass the gate (both teams 6+ D1 matches, and both AVCA-ranked, both in our top 40, measured search demand, or postseason) | `pipeline/config/publishing.json` + `pipeline/pages.py`; `pages.test.ts` and `run check` fail on any day over the cap |
| **Kill switch:** if fewer than half of the game pages are indexed 4 weeks after publishing, set `game_pages_enabled: false` in `pipeline/config/publishing.json` and leave it off until indexing recovers | Weekly manual review (`node scripts/kit/gsc/inspect.mjs`, or the GSC Pages report filtered to `/volleyball/predictions/`); the pipeline obeys the flag |
| **Daily archives stay noindex.** None exist yet. If you add a `/<sport>/predictions/<date>` archive, pass `noindex: true` to `buildMetadata` and set `indexable: false` in the registry | Review rule; add a test with the route |
| **The ledger is append-only and pre-match.** One prediction per match, logged before first serve, never edited | `pipeline/ledger.py` `verify()`; `python -m pipeline.run check --base origin/main` fails if any logged line changed |

If any guardrail cannot be met (a check fails, a source breaks), the job stops
and nothing new publishes. Fix the cause; never weaken a check to get a page out.

## Voice

Nerdy analytical Barstool: sharp numbers, conversational delivery.

- Lead with the number. Show the inputs. Explain in plain words why the model leans one way.
- Confident about the math, honest about the uncertainty. Losses are shown, never hidden.
- Betting lingo in moderation (chalk, dog, fade). Never "lock", "guaranteed", "can't lose" or hype.
- No first-person experience claims on automated pages. Automated pages say they are automated.
- Team markets only. Never college player props, never single out an athlete negatively.
- No school logos or marks. Names and neutral colors only. Never imply affiliation with the NCAA, a conference, a school, D1Baseball or D1Softball.

## Kit boundary

- **Kit-owned, never edit here:** `src/kit/`, `scripts/kit/`, `.claude/commands/kit-*.md`. Fix kit bugs in the site-kit repo and sync (`node scripts/kit/kit-sync.mjs <site> --write` from site-kit). A local edit is overwritten by the next sync.
- **Site-owned:** `src/app/`, `src/site/`, `content/`, `data/`, `public/`, `pipeline/`, `site.config.json`, workflows, this file.
- Site identity lives only in `site.config.json`. Never hardcode the domain, property IDs or author details anywhere else.

## Pipeline and data

- `pipeline/` (Python 3.11+, `pipeline/requirements.txt`) owns every number. `python -m pipeline.run --help`.
- Source: the NCAA.com scoreboard feed (`pipeline/ncaa.py`), one request per date, at most one per second, honest User-Agent. stats.ncaa.org blocks scripts. Do not scrape ESPN or Warren Nolan for predictions.
- `data/<sport>/` is written only by the pipeline. Never hand-edit a ratings snapshot, a ledger line, a facts file or a generated MDX. A ratings snapshot that a logged prediction references is never rewritten.
- A model change is a new `model.version` in `pipeline/config/<sport>.json`, a line in the methodology "Versions" section, and a fresh backtest. Old predictions keep the version they were made with.
- `legacy/baseball/` is the old baseball pipeline (stub coefficients, Warren Nolan scraper). It is not a model and must not feed any page. Mine it for the baseball build in the winter.
- `remotion/` and `tiktok-system/` still point at the deleted Feb 2026 picks. Rewire them to `data/<sport>/` (the ledger and `/results`) before using them; any record in a video comes from `/results`.

## Release discipline (kit)

- **No bulk drops.** At most 3 editorial pages per ISO week. Data pages (hubs, ratings, results, game pages) are exempt via `releaseCadence.exemptPaths` because they are backed by our own pipeline; game pages have their own cap above.
- **Gate by date, never by hand.** MDX uses `publishDate` (the pipeline sets it to the selection day); other routes use `content/release-schedule.json`. Unreleased pages 404 in production and stay out of the sitemap, hubs, related links and llms.txt. Pages `export const revalidate = 3600`.
- **Never backdate.** A new page's date is today or later.
- Every gated route calls `assertReleased(path)` (page and `generateMetadata`). Dynamic routes return EVERY entry from `generateStaticParams` and set `dynamicParams = false`.
- An MDX page is dated by its `publishDate` only; never also list it in `release-schedule.json`.
- `/hockey/predictions` is a gated stub: it 404s in production until its release date and stays noindex until `data/hockey/manifest.json` exists.

## No fabrication

- **No invented teams, people, ratings, results, quotes, injury notes, odds or statistics.** Not as placeholders, not in samples, not "for now".
- Every result links to its NCAA.com match page. Every statistic traces to saved data. If you estimate, say so and show the assumption.
- The JSON-LD builders have no rating or review support on purpose. Game pages emit SportsEvent only, with no author claim.

## The AI-Overview filter

Before building any page, ask: **if Google's AI Overview answers this query perfectly, do we still get the click?** Our answer is original data (model probabilities, set-score odds, ratings, the graded record). A page without original data is not built.

## EEAT

- Editorial pages name a real author from `site.config.json`, linked to `/authors/<slug>`. Automated pages name the maintainer, say they are automated, and do not render the "Written by" box.
- `/about`, `/editorial-policy`, `/methodology` and `/responsible-gambling` must describe how the site really works. Change the practice or the page; never let them drift apart. Policy numbers are read from `pipeline/config/*.json` so they cannot drift.
- Re-verify the help resources on `/responsible-gambling` (NCPG 1-800-MY-RESET, Gamblers Anonymous) before each season.

## Technical rules (kit)

- **One canonical host: www.d1picks.com** (`canonicalHost`). Every page's metadata comes from `buildMetadata()`. Never hand-write `metadata` for an indexable page.
- **Server-render the content.** No client-side data fetches for page content.
- **Register every page in `src/site/pages.ts`.** **Links between pages go through the link index.**
- **FAQ schema only with a visible FAQ** (`<Faq>`).
- **Images:** `next/image` only. No affiliate links (registry is empty on purpose).
- **Copy:** no H1 in MDX bodies, no em or en dashes, no hype or AI-slop phrases, no emojis. `npm run lint:content` checks it.

## Commands

`python -m pipeline.run daily|backfill|check` · `python -m unittest discover -s pipeline/tests -t .` · `npm run lint:content` · `npm test` · `npm run build` · `npm run audit -- <url>` · `npm run prerender -- --base <url>` · `/kit-preflight` · `/kit-release-plan` · `/kit-gsc-audit`
