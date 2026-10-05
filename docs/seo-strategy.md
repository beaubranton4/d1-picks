# d1picks.com SEO strategy: picks and predictions for D1 college sports

Prepared 2026-10-04. Research only: nothing here has been built, deployed or published.
Data: DataForSEO (Google US, en), live SERPs pulled 2026-10-04, raw JSON in
`docs/research/dataforseo/2026-10-04/`. Keyword map: `docs/research/keyword-map.csv`.
SERP summary: `docs/research/serp-summary.csv`.

## The answer

1. **Lead with the sports nobody models in public, and win them through data pages.**
   Order: women's volleyball now, college hockey now, women's basketball in November,
   then baseball as the flagship in February 2027, with softball and lacrosse joining
   it. Do not compete for men's basketball or football head terms.
2. **In the niche sports, the search demand is for rankings, RPI and tournament
   odds, not for "picks".** "ncaa volleyball rankings" averages 33,100 searches a
   month (135,000 in November). "ncaa volleyball picks" gets 10. The model's output
   should be sold through ratings pages, projected RPI and bracket simulators. The
   picks sit on top of those pages.
3. **Rank with one evergreen hub per sport, not one page per game.** Four hub URLs
   (`/cfb/predictions`, `/cbb/predictions`, `/march-madness/predictions`,
   `/wcbb/predictions`) carry 82% of Dimers' estimated college traffic, and 93% of
   the traffic in its top 300 college keywords. Matchup
   pages are the gated exception.
4. **Fix the live site before adding anything.** The header shows a "5-3 (+2.0u)"
   record built from placeholder results dated before the season opened, and the
   Feb 14 page shows 12 "D1 Picks" that were never picked. A picks site cannot carry
   a fabricated record.
5. **The track record page is the main asset.** Every pick is logged when it is
   published and graded after the game, with ROI, closing-line value and
   calibration. It earns the trust that the scaled-content filter and E-E-A-T both
   ask for, and it is what other sites link to.

---

## 1. Baseline: what Google sees today

**Rankings:** d1picks.com ranks for 1 keyword in the US: "ncaa div 1 baseball
scores" (480 searches a month), at position 44, with an estimated 1 visit a month. The
ranking URL is the homepage (`01-ranked_keywords-d1picks.com.json`).

**Live-site crawl (2026-10-04, fetched as Googlebot):**

| Finding | Evidence |
|---|---|
| Apex 307s to www, but every canonical and sitemap URL is the apex | `d1picks.com/*` returns 307 to `www.d1picks.com/*`; the canonical is `https://d1picks.com/baseball/...` |
| Homepage is a frozen redirect | `/` returns 307 to `/baseball/2026-02-15` (the date was fixed at build time) |
| Unlimited indexable date URLs | Every `/baseball/{date}` returns 200 with `index, follow`, including `/baseball/2030-01-01`; `/baseball/2026-10-04` is 102 words saying "0 games today" |
| Invalid paths crash | `/baseball/articles` and `/baseball/not-a-date` return 500; `/articles` returns 307 to that 500 |
| Fabricated track record in the header | "5-3 (+2.0u)" on every page, computed from `src/lib/data/pick-results.json`: 8 results dated 2026-02-10 to 02-12 (for example LSU vs Alabama on Feb 10), before the 2026 season opened on Feb 13 |
| Picks that were never made | `/baseball/2026-02-14` lists 12 "D1 Picks" from a 4-team hardcoded list. Substring matching on "georgia" tagged Georgia Tech, Georgia State, Georgia Southern and West Georgia, each at the same "+145 (FD)". Stars and "AI Profit Score" are typed by hand in `src/lib/hardcoded-picks.ts` |
| An unverifiable article | `/articles/2026-02-13` claims model edges, for example "Oregon State -250 vs Stanford ... lock of the night", with no odds snapshot or model output in the repo to back it. It has two H1s and no canonical |
| Unrendered methodology copy in the repo | `SEOContent.tsx` (not rendered on live pages today) says "We calculate the edge for every game, every day" against live DraftKings, FanDuel and BetMGM odds. Picks were hardcoded, so this copy must not ship as-is |
| No responsible-gambling messaging | Only "For entertainment purposes only. Bet responsibly." No 21+ notice and no help resources |
| Sitemap | Lists the apex (a redirect) and `/2026-02-13` (two hops) |

**The model today:** `model/training/coefficients/coefficients.json` has hand-set
round numbers (`"teams_with_models": 0`). `model/data/raw/games.json` holds 196
games. The live pipeline (`generate_picks.py`) is Warren Nolan's predictions plus
The Odds API, so the probabilities are Warren Nolan's, not ours. Baseball is the only
sport the code covers.

---

## 2. What the data says

### Volume caveat (read before using any number)

- Google Ads returns **null for nearly every "college X" phrasing** ("college
  baseball rankings", even "college football rankings") while the "ncaa X" twin
  returns a value. Ads merges close variants, so treat the "ncaa X" figure as the
  cluster's volume. A second request for the nulls on their own still came back null
  (`06-...requery.json`).
- Gambling terms are thin in Google's keyword data. Where Ads had nothing, the map
  falls back to DataForSEO clickstream. On this keyword set, raw clickstream runs
  about 4 to 7 times below Ads (for example "ncaa baseball rankings": 60,500 Ads vs
  15,874 clickstream). `volume_source` in the CSV says which source each number
  came from.
- Matchup queries are fresh and spiky. A 12-month average hides a game-week peak:
  "texas vs oklahoma prediction" averages 2,900 but peaked at 27,100 in October 2025.
  Use the `peak_month` and `peak_month_volume` columns.

### Demand by sport (Google Ads, US, 12-month average, with the peak month in brackets)

| Sport | "Picks/predictions/odds" intent | Data intent (rankings, RPI, tournament) | Marquee matchup example |
|---|---|---|---|
| Women's volleyball | predictions 90, odds 140, picks 10 | rankings 33,100 (135,000 Nov) · bracketology 6,600 (74,000 Dec) · RPI 1,300 | nebraska vs penn state volleyball 1,900 (12,100 Oct) |
| Men's hockey | odds 170, predictions 70, picks 10 | rankings 40,500 (90,500 Nov to Feb) · pairwise 1,300 (2,900) | michigan vs michigan state hockey 1,900 (14,800 Feb) |
| Women's basketball | ncaaw odds 210, predictions 40 to 170 | women's bracketology 14,800 (135,000 Mar) · women's March Madness predictions 1,300 (14,800 Mar) | uconn vs south carolina prediction 480 (5,400 Apr) |
| Baseball | picks 170 (1,300 Jun), odds 390, predictions 480 | rankings 60,500 (246,000 Apr) · baseball rpi 14,800 · tournament predictions 3,600 (40,500 May) · regional predictions 1,600 (18,100 May) · scores 165,000 (823,000 Jun) | lsu vs arkansas baseball prediction (peak 1,900 Jun 2025) |
| Softball | predictions 110, odds 90, picks 10 | rankings 27,100 (135,000 Apr) · ncaa softball rpi 1,900 · scores 60,500 (450,000 May) | texas vs oklahoma softball 720 (8,100 Apr) |
| Lacrosse | odds 70, predictions 30, picks 10 | rankings 9,900 (33,100 Mar to Apr) | notre dame vs syracuse lacrosse 1,300 (12,100 May) |
| Men's basketball | ncaab picks 9,900 (33,100 Feb to Mar) · college basketball odds 12,100 | march madness predictions 12,100 (110,000 Mar) · bracketology 110,000 · kenpom 110,000 | duke vs unc prediction 1,000 (12,100 Mar) |
| Football | college football picks 18,100 (60,500 Sep to Oct) · odds 27,100 | cfp predictions 40,500 (165,000 Nov to Dec) · heisman odds 74,000 | ohio state vs michigan prediction 6,600 (60,500 Nov) |

**Reading:** in every niche sport, betting-intent demand is in the tens to low
hundreds per month. Data-intent demand is in the thousands to hundreds of thousands
at peak. Warren Nolan (estimated 289,000 visits a month) confirms the pattern: its
traffic comes from standings, team schedules, live RPI and NET pages
(`/baseball/YYYY/rpi-live` alone ranks for "baseball rpi", 14,800). Its
`predict-winners` pages barely show up.

### Season curves (Google Ads monthly, Sep 2025 to Aug 2026)

| Keyword | Sep | Oct | Nov | Dec | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ncaa volleyball rankings | 90,500 | 110,000 | 135,000 | 49,500 | 3,600 | 2,400 | 2,900 | 2,900 | 1,900 | 1,600 | 1,600 | 33,100 |
| volleyball bracketology | 260 | 590 | 6,600 | 74,000 | 720 | 720 | 880 | 320 | 260 | 170 | 210 | 210 |
| ncaa hockey rankings | 4,400 | 60,500 | 90,500 | 60,500 | 90,500 | 90,500 | 74,000 | 9,900 | 880 | 720 | 590 | 880 |
| women's bracketology | 390 | 320 | 880 | 1,600 | 3,600 | 9,900 | 135,000 | 8,100 | 880 | 590 | 480 | 320 |
| ncaab picks | 140 | 210 | 14,800 | 18,100 | 27,100 | 33,100 | 33,100 | 2,400 | 260 | 170 | 70 | 50 |
| ncaa baseball rankings | 2,900 | 3,600 | 3,600 | 3,600 | 9,900 | 90,500 | 201,000 | 246,000 | 201,000 | 27,100 | 1,600 | 1,300 |
| ncaa baseball tournament predictions | 10 | 10 | 10 | 10 | 20 | 70 | 320 | 6,600 | 40,500 | 480 | 20 | 20 |
| ncaa softball rankings | 880 | 880 | 880 | 720 | 2,400 | 49,500 | 74,000 | 135,000 | 74,000 | 3,600 | 590 | 480 |
| ncaa lacrosse rankings | 1,300 | 1,300 | 1,000 | 1,000 | 2,400 | 18,100 | 33,100 | 33,100 | 14,800 | 880 | 480 | 480 |
| college football picks | 60,500 | 60,500 | 49,500 | 33,100 | 12,100 | 1,300 | 1,600 | 880 | 480 | 320 | 590 | 8,100 |

Volleyball and hockey are in season now. Volleyball ends in mid-December, so its
window is the next 10 weeks. Baseball, softball and lacrosse are dormant until
February.

### SERP findings (21 targets, live, 2026-10-04)

Full table: `docs/research/serp-summary.csv`.

- **AI Overviews appeared on 18 of 21 SERPs at least once, and on all 7 matchup
  SERPs.** For upcoming games the overview restates the date, time and venue from
  Google's sports data and who is favored. For Texas vs Oklahoma it gave "roughly a
  78.9% implied probability" and cited Covers and Burnt Orange Nation. It does not
  give a model probability with the inputs that moved it, a price comparison, or a
  graded history. Those are the parts that still earn the click.
- **AIO presence is volatile.** "college baseball picks" had no overview at 22:49 UTC
  and one at 22:53. "college football picks" and "college basketball picks" had one,
  then didn't. Treat AIO as likely on any of these queries.
- **No overview on "college hockey picks" or "college lacrosse picks" in two checks
  each**, and no odds widget was detected on any of the 21 SERPs. Top Stories appeared
  only on the two football queries.
- **Niche SERPs have no model-driven picks site.**
  - "college volleyball predictions" (135 results): Kalshi match pages, VolleyTalk,
    Facebook, NCAA.com, results from 2021 and 2023.
  - "college hockey picks": College Hockey News, USCHO, NCAA.com rankings,
    DraftKings. No picks site in the top 10.
  - "college lacrosse picks": X accounts, Lacrosse Reference win probabilities,
    Kalshi, forums.
  - "college softball picks": NCAA.com, Warren Nolan, Yahoo, Facebook.
- **Baseball is contested but beatable.** Warren Nolan's predictor, Action Network,
  RotoWire's daily posts, Reddit daily threads, SGPN, D1Baseball and SignalOdds all
  rank. No single model-plus-track-record site owns it.
- **Big-sport SERPs are locked.** In football and men's basketball, 3 to 7 of the
  top 10 are CBS, Covers, Action Network, Pickswise, Fox, SI or VSiN, plus AIO and
  Top Stories.
- **Prediction markets rank.** Kalshi or Polymarket pages appear in the top 20 on 8
  of 21 SERPs, mostly in the niche sports. They are programmatic matchup pages, and
  they are the competitor in the wedge.
- **Stale results win niche matchups.** For "nebraska vs penn state volleyball
  prediction", 5 of the top 10 predate 2026, and the overview reports that the
  Oct 1, 2026 match already happened (Nebraska 3-0). A dated, graded page beats a
  forum thread.
- **Generic "how to bet" is answered.** "how to bet on college baseball" has an
  overview citing 8 sources that fully answers the query. Drop it.

### Competitors (Labs `ranked_keywords`)

| Domain | Est. US visits/mo | What earns it |
|---|---|---|
| dimers.com (college keywords only) | 12,586 from 1,633 college keywords | 4 hub pages carry 82% of the total (93% of the top-300 keywords' traffic): `/cfb/predictions` 7,913, `/cbb/predictions` 1,295, `/march-madness/predictions` 802, `/wcbb/predictions` 333. None of the top 300 college keywords is a "vs" query |
| warrennolan.com | 289,480 | Standings, team schedules, live RPI, live scores, NET, bracketology. Data utility, not predictions |
| signalodds.com | 25,766 from 6,820 keywords | Programmatic `/h2h/team-vs-team` pages (MLB, NBA, soccer) ranking at positions 14 to 50 for navigational "X vs Y" queries. This is the scaled pattern to avoid copying |

---

## 3. Sport priority

| Rank | Sport | Start | Why |
|---|---|---|---|
| 1 | **Women's volleyball** | Now (hub live wk 3) | In season, peaks Nov to Dec. The SERPs are the weakest found (no model site, stale results). Data demand is real (rankings 135,000 in Nov, bracketology 74,000 in Dec). A simple rating model is feasible in 2 weeks. Odds are scarce, so frame it as predictions and use prices only where they exist (Kalshi lists D1 women's volleyball match markets) |
| 2 | **Men's hockey** | Now (hub wk 5) | Season runs Oct to Apr and peaks Jan to Mar. No picks site in the top 10. Rivalry series peak at 14,800. Weekend series fit one page per series. The PairWise/NPI projection and Frozen Four simulator become the March tentpole. DraftKings has a college hockey odds page, but NCAA hockey is not on The Odds API's sports list |
| 3 | **Women's basketball** | Tip-off (hub wk 6) | Growing demand with a March tentpole (women's bracketology 135,000). Odds are available (`basketball_wncaab` on The Odds API). SERP competition is moderate: Her Hoop Stats, Dimers, Covers |
| 4 | **Baseball (flagship)** | Preseason ratings late Jan, live mid-Feb 2027 | Largest data demand of the wedge sports (rankings 246,000 in Apr; tournament predictions 40,500 in May), odds on The Odds API, existing code. Beau's background as a former pro player is the strongest E-E-A-T signal the site has. Use Oct to Jan to build and backtest a real model |
| 5 | **Softball** | With baseball | Same infrastructure and the same diamond-sport expertise. Rankings reach 135,000 in Apr. No picks sites on the SERP. Odds are scarce (not on The Odds API; Kalshi has markets) |
| 6 | **Lacrosse** | With baseball | Small demand (rankings 33,100 at peak). Odds on The Odds API. Lacrosse Reference already publishes D1 win probabilities and is a strong niche incumbent |
| defer | Men's basketball, football | Not in this plan | Head terms and matchups are owned by big brands, AIO and Top Stories. Revisit later for mid-major matchup pages only |

---

## 4. The AI-Overview filter, applied

The house rule: if Google's AI Overview answers the query perfectly, do we still get
the click?

| Page type | Does the overview replace it? | What earns the click |
|---|---|---|
| Sport predictions hub (today's slate) | No. The overview lists a few favorites; it cannot show every match with probabilities | A full daily table: every D1 match, win probability, projected score, price comparison where one exists |
| Ratings / projected RPI / PairWise | Partly. It names the AP or AVCA top 3 | A sortable table of every team with today's rating, strength of schedule and projected RPI. Original data |
| Tournament simulator | No | Monte Carlo odds for each team to reach each round, updated nightly |
| Matchup prediction (gated) | Partly. It restates date, venue and favorite | Model probability against the market, the 3 inputs that moved it, set or score distribution, graded result afterwards |
| Track record | No | Every pick, graded, with ROI, CLV and calibration charts, plus a CSV download |
| "How to bet on college X" | **Yes, fully** (8 cited sources) | Nothing. Drop it |
| "Is college X betting legal" | Yes | Fold one line into the hub FAQ |

---

## 5. Page types, ranked

| # | Page type | Example URL | Primary targets | Why this rank |
|---|---|---|---|---|
| 1 | **Sport predictions hub**: evergreen URL, today's slate, every D1 match as a row | `/volleyball/predictions` | "college volleyball predictions", "ncaa hockey odds", "ncaaw predictions today" | Dimers: 4 hubs carry 82% of its college traffic. One URL builds authority all season |
| 2 | **Track record**, site-wide and per sport | `/results`, `/volleyball/results` | brand, "best college volleyball prediction site", links | Trust, E-E-A-T, backlinks; the proof behind every other page |
| 3 | **Ratings** for every D1 team, updated daily | `/volleyball/ratings`, `/hockey/ratings` | "ncaa volleyball rankings" (33,100), "ncaa hockey rankings" (40,500) | Original data. Warren Nolan shows data pages carry niche traffic |
| 4 | **Projected RPI / PairWise** | `/volleyball/rpi`, `/baseball/rpi`, `/hockey/pairwise-projections` | "baseball rpi" (14,800), "ncaa volleyball rpi" (1,300), "pairwise rankings" (1,300) | A computed live table; AIO points to it rather than replacing it |
| 5 | **Tournament simulator**: one URL per sport that evolves from projections to bracket to Final Four | `/volleyball/ncaa-tournament-predictions`, `/baseball/ncaa-tournament-predictions` | "volleyball bracketology" (74,000 Dec), "ncaa baseball tournament predictions" (40,500 May) | Highest seasonal peaks. A Reddit "50K Monte Carlo" post ranks #1 for "college world series odds", so the demand for simulations is proven |
| 6 | **Matchup or series prediction**, gated (section 6) | `/volleyball/predictions/nebraska-vs-wisconsin-2026-11-20`, `/hockey/predictions/michigan-vs-michigan-state-2027-02-12` | Marquee "X vs Y prediction" queries | Real peaks (12,000 to 15,000) but AIO is present, so build only where the page adds the model view |
| 7 | **Methodology**, site-wide and per sport | `/methodology/volleyball` | "college volleyball prediction model" | E-E-A-T, required by the house rules |
| 8 | **Editorial**: weekly preview or recap, at most 3 per week | `/volleyball/big-ten-title-race-model-odds` | Long tail, links | Personality ("nerdy Barstool") lives here, carried by the data |
| 9 | **Daily archive** | `/volleyball/predictions/2026-10-21` | none | `noindex, follow`. Exists for users and the record, not for ranking |
| later | Team pages (season prediction, schedule with win probabilities) | `/baseball/teams/lsu` | "{team} baseball predictions" (Warren Nolan ranks #1 for "nebraska basketball prediction", 720) | Strong pattern, but it is scaled by nature. Add per sport once the hubs index well |
| drop | Generic how-to, college player props | | | AIO-answered or a compliance risk |

---

## 6. Avoiding scaled-content abuse

Google's spam policy targets pages produced at scale mainly to rank, whoever or
whatever writes them. A page per game per day across six sports would generate
thousands of near-identical URLs. The defense is that each indexable page carries
data no one else has, and that most games never get their own URL.

### 6.1 What makes a pick page original (all required, or the page is not created)

1. **Model probability** from our own model (not Warren Nolan's), with the projected
   score or set distribution (volleyball 3-0 / 3-1 / 3-2; baseball run totals).
2. **The inputs that moved it:** the top 3 factors for this game, as numbers (for
   example "Penn State's sideout rate on the road: 61.2%, 14th in D1"). These come
   from the feature contributions, not a template sentence.
3. **Market comparison**, where a real price exists: the best line at publish time,
   implied probability after removing the vig, the edge, and the timestamp. If no
   price exists, the page says so and makes no "bet" call.
4. **Line movement and availability notes**, only when sourced: open-to-current
   movement from our own snapshots, injury or starter notes linked to their source.
   Never invented (the old "3.21 ERA in fall scrimmages" kind of claim is banned).
5. **Head-to-head and form from our own game database**, with the source named.
6. **Graded result after the game:** the final score, whether the pick won, closing
   line value, and a link to the entry in `/results`.
7. **A human sentence or two** from the named author on marquee pages. The model
   writes the numbers; Beau writes the take.

### 6.2 Gates: when a game gets its own indexable URL

A game becomes a page only if **all** of the following hold.

- **Enough data:** both teams have played at least N D1 games this season
  (volleyball 6, hockey 6, women's basketball 5, baseball 10, softball 10,
  lacrosse 4). Before that, matches appear on the hub as rows only.
- **And at least one of these:**
  - a model edge of at least 3 percentage points against a real market price;
  - both teams in a major poll or our top 40;
  - a rivalry or conference showdown on national TV;
  - any postseason game;
  - the matchup is in the keyword map with measured demand.
- **And the page passes the completeness check in 6.1.**

Everything else is a row on the hub with a probability. It gets no URL of its own.

### 6.3 Consolidation rules

- **Series, not games**, where the sport plays series. Baseball and softball weekend
  series and Friday-Saturday hockey series get one page per series, not three.
- **One tournament URL per sport**, evolving from projections to bracket to Final
  Four. Not one page per round.
- **Daily archives are `noindex, follow`.** The hub URL is what ranks.
- **Prune with data:** a regular-season matchup page with no impressions 30 days
  after the game becomes `noindex`. Postseason and rivalry pages stay indexed.

### 6.4 Cadence and kill switch

- **First 8 weeks:** at most 5 new indexable matchup or series pages per sport per
  day, and 12 site-wide.
- **Ramp only if the data supports it:** Search Console shows at least 70% of
  submitted matchup URLs indexed and impressions growing. If indexed stays below 50%
  after 4 weeks, tighten the gate and stop new matchup URLs until it recovers.
- **Editorial pages** follow the site-kit cap of 3 per ISO week. Hubs, ratings,
  results and tournament pages are data pages backed by our own pipeline. Treat them
  like the kit's `exemptPaths` (needs Beau's sign-off; see Decisions).

---

## 7. The track record page (`/results`)

The trust and backlink asset. Build it before the first pick ships.

- **Immutable ledger.** Each pick is written when published (`published_at`, model
  probability, market, odds and book, stake in units) and never edited. Grading adds
  the result, closing odds and CLV. Use an append-only table or a committed JSONL so
  the history is auditable.
- **What it shows:**
  - record, units and ROI by sport, season, market and confidence tier;
  - average CLV (closing-line value: the best evidence of real edge in small samples);
  - a **calibration chart** (predicted probability bucket against actual win rate,
    with counts) and Brier score or log loss against the market's implied probability;
  - cumulative units over time;
  - every pick in a filterable table;
  - a CSV download.
- **Backtests are kept separate.** Backtest results get their own tab, labeled as
  such, and never count toward the live record.
- **The record starts at zero.** Delete the current "5-3 (+2.0u)". No pre-season or
  placeholder entries.
- **Link earning:** the graded season recap (volleyball in mid-December, hockey after
  the Frozen Four) is the outreach piece, offered to college analytics communities
  and stats writers. No paid links.

---

## 8. Responsible gambling and compliance basics

- **21+ notice** in the footer and on every picks page. Some states allow 18+, but a
  single 21+ standard is simpler and stricter.
- **Help resources** on every picks page and on `/responsible-gambling`: the National
  Problem Gambling Helpline (1-800-GAMBLER) and the National Council on Problem
  Gambling (ncpgambling.org). Verify the current number and wording before shipping.
  Link state resources if the site later targets specific states.
- **No guarantees and no hype.** Ban "lock" (the Feb 13 article uses "lock of the
  night"), "guaranteed", "can't lose" and "back up the truck". Every pick shows a
  probability, and the page says outcomes are uncertain.
- **Do not publish college player-prop picks.** Several states prohibit wagering on
  college player props and the NCAA has pushed for more bans. Team markets only. Do
  not single out individual athletes negatively.
- **Clear status:** "D1 Picks is not a sportsbook and accepts no wagers. Sports
  betting is legal only in some states; check your state's law."
- **Affiliate links are deprioritized.** If any are added later, they need operator
  and state compliance review and FTC disclosure, and they cannot sit next to
  minors-adjacent content.
- **Prediction markets:** if Kalshi prices are used as the reference "market" for
  volleyball or softball, cite them as data only. Do not present Kalshi as a place to
  bet until legal review, because its status varies by state.
- **Trademarks:** stop hotlinking ESPN team logos. A betting site using school marks
  invites cease-and-desist letters. Use names, abbreviations and neutral colors.
- **Data terms:** stop scraping Warren Nolan for predictions (keep it at most as a
  public benchmark you cite). Prefer stats.ncaa.org over ESPN's unofficial API, and
  rate-limit both.

---

## 9. Launch set

**Week 1 (fix first, nothing new indexed until these are done):** remove the header
record; unpublish the Feb 2026 picks and article; canonical host and redirect fix;
`noindex` or 404 for the date URLs; RG footer.

**First indexable set (weeks 1 to 3):**

| URL | Type |
|---|---|
| `/` | Real homepage: today's slates for in-season sports and a results summary |
| `/volleyball/predictions` | Hub |
| `/volleyball/ratings` | Ratings |
| `/results` | Track record (live record at zero; backtest tab) |
| `/methodology`, `/methodology/volleyball` | E-E-A-T |
| `/about`, `/editorial-policy`, `/responsible-gambling`, `/authors/beau-branton` | Trust |

**Next (weeks 4 to 6):** `/volleyball/rpi`, gated volleyball matchup pages,
`/hockey/predictions`, `/hockey/ratings`, `/methodology/hockey`,
`/volleyball/ncaa-tournament-predictions`, `/womens-basketball/predictions`,
`/womens-basketball/ratings`.

**Kept out of the index for now:** `/baseball/predictions` stays `noindex` in the
off-season until preseason ratings exist (late January). A hub saying "season
starts in February" is thin.

---

## 10. Twelve-week calendar (Mon 2026-10-05 to Sun 2026-12-27)

Key dates were taken from Google's sports data as quoted in the 2026-10-04 AI
Overviews, or are seasonal estimates. Verify each against NCAA.com before
scheduling. Editorial pages never exceed 3 per ISO week.

| Wk | ISO week | Dates | In season | Data pages ship | Editorial (max 3) | Model and infra |
|---|---|---|---|---|---|---|
| 1 | 2026-W41 | Oct 5-11 | VB, hockey | none new; fixes from section 9 | `/about`, `/editorial-policy`, `/responsible-gambling` | Pick ledger and grading job; volleyball data ingest (2023-2026) |
| 2 | 2026-W42 | Oct 12-18 | VB, hockey | `/` rebuilt | `/methodology`, `/methodology/volleyball`, `/authors/beau-branton` | Volleyball model v0 and walk-forward backtest (calibration, Brier vs AVCA-rank baseline) |
| 3 | 2026-W43 | Oct 19-25 | VB, hockey | `/volleyball/predictions`, `/volleyball/ratings`, `/results` | 1 volleyball preview | Daily publish pipeline with the gate |
| 4 | 2026-W44 | Oct 26-Nov 1 | VB, hockey | First gated VB matchup pages (max 3 a day); `/volleyball/rpi` | 1 to 2 | Hockey data ingest and model v0 |
| 5 | 2026-W45 | Nov 2-8 | VB, hockey, WCBB and MCBB tip off | `/hockey/predictions`, `/hockey/ratings` | `/methodology/hockey` and 1 to 2 more | WCBB ingest and model v0 (The Odds API `basketball_wncaab`) |
| 6 | 2026-W46 | Nov 9-15 | same | `/volleyball/ncaa-tournament-predictions` (pre-selection); `/womens-basketball/predictions`, `/womens-basketball/ratings`; hockey series pages (gated) | `/methodology/womens-basketball` and 1 to 2 more | Monte Carlo bracket simulator |
| 7 | 2026-W47 | Nov 16-22 | same | Volleyball conference-race tables | 1 to 3 | **Search Console review:** indexed ratio, impressions, calibration so far; tighten or loosen the gate |
| 8 | 2026-W48 | Nov 23-29 | same | `/womens-basketball/predictions/south-carolina-vs-uconn-2026-11-24` (tentpole); volleyball bracket refresh on selection night (around Sun Nov 29; verify) | 1 to 3 | |
| 9 | 2026-W49 | Nov 30-Dec 6 | VB tournament | Every VB tournament match qualifies for a page; `/hockey/pairwise-projections` | 1 to 3 | Check hockey selection criteria (PairWise vs NPI; "college hockey rankings NPI" shows as a related search) |
| 10 | 2026-W50 | Dec 7-13 | VB regionals | VB regional pages | First results report (published calibration) | Baseball ingest (2023-2026 box scores) and backtest harness |
| 11 | 2026-W51 | Dec 14-20 | VB Final Four | Final Four and title pages | **Volleyball season recap with the full graded record** (the outreach piece) | Baseball model v0 |
| 12 | 2026-W52 | Dec 21-27 | hockey and basketball (holiday) | none | Season-in-review | Softball and lacrosse ingest; plan 2027 |

**After week 12:**
- **Late January 2027:** baseball, softball and lacrosse preseason ratings go live and
  `/baseball/predictions` is indexed.
- **Mid-February 2027:** baseball, softball and lacrosse hubs go live on opening day
  (2026 opened Feb 13; verify the 2027 date).
- **February to March 2027:** women's basketball and hockey tournament simulators.
- **April to June 2027:** baseball and softball tournament simulators (field of 64,
  regionals, supers, World Series), the largest demand window in the plan.

---

## 11. What the model needs, per sport

**Common to every sport:**
- a team ID crosswalk across sources;
- game results for 3 or more seasons;
- walk-forward backtests with no look-ahead;
- the immutable pick ledger and a grading job;
- odds snapshots at publish and at close, for edge and CLV;
- an RPI or PairWise calculator where selection uses it;
- feature contributions per game, which section 6.1 needs.

| Sport | Prediction unit | Rating approach | Key data | Price source | Gate (min games) | Must-have specific to the sport |
|---|---|---|---|---|---|---|
| Volleyball | Match, plus set distribution | Points-based, opponent-adjusted (points-won %, sideout %), home court | NCAA stats, ESPN scoreboard (confirm the endpoint) | Kalshi match markets; sportsbooks rarely | 6 | Set-score probabilities; RPI calculation; AVCA poll for the gate |
| Hockey | Fri-Sat series and games | Goals plus shot share, goalie starter, home ice | NCAA stats; CHN and USCHO publish PairWise and KRACH for comparison | DraftKings lists college hockey lines; not on The Odds API's list; Kalshi | 6 | PairWise or NPI simulator (confirm the 2026-27 selection method) |
| Women's basketball | Game | Possession-based adjusted efficiency, tempo, home court | NCAA box scores | The Odds API `basketball_wncaab` | 5 | Injury and availability notes (sourced) |
| Baseball | Weekend series and games | Run-based team rating plus a starting-pitcher adjustment, park, midweek vs weekend roles | NCAA box scores (2023-2026) | The Odds API `baseball_ncaa` | 10 | Probable starters (not reliably published; this is where Beau's expertise shows); RPI; field-of-64 simulator |
| Softball | Series and games | Run-based with an ace-usage adjustment | NCAA box scores | Not on The Odds API; Kalshi; scarce | 10 | Pitcher usage; RPI |
| Lacrosse | Game | Possession and face-off adjusted efficiency | NCAA box scores | The Odds API `lacrosse_ncaa` | 4 | Benchmark against Lacrosse Reference publicly |

The Odds API sport keys come from its sports list page (fetched 2026-10-04):
`americanfootball_ncaaf`, `americanfootball_ncaaf_fcs`, `basketball_ncaab`,
`basketball_wncaab`, `baseball_ncaa`, `lacrosse_ncaa`. Softball, volleyball and NCAA
hockey were not listed. Bookmaker coverage per game is thin for niche sports even
when a key exists. Measure it in week 1 before promising edges.

---

## 12. Existing content triage

| Item | Action |
|---|---|
| Header "5-3 (+2.0u)" badge and `pick-results.json` | **Remove now.** The record restarts at zero on `/results` |
| `hardcoded-picks.ts`, `src/content/picks/2026-02-14.json`, substring team matching | Remove. Picks only ever come from the ledger |
| `/articles/2026-02-13` | 410 (gone), unless Beau can produce the odds and model output behind it |
| `/baseball/{date}` (every date since 2026-02-13, plus any future date) | 308 in-season dates to `/baseball/predictions/{date}` (noindex, follow); 404 dates outside the schedule; 404 non-date segments (the 500s) |
| `/{date}` legacy redirects | One 308 hop to the final URL; drop them from the sitemap |
| `/` | Replace the redirect with a real homepage |
| Host | One canonical host (site-kit says the apex), 308 from the other; regenerate the sitemap from released pages only |
| `SEOContent.tsx` methodology copy (not rendered today) | Rewrite as `/methodology`, describing only what the pipeline does |
| Layout metadata ("D1 Baseball Picks", "+EV College Baseball") | Rebrand to multi-sport: "D1 Picks: college sports predictions" |
| ESPN logo hotlinks | Remove |
| `model/` stub coefficients, Warren Nolan scraper as the model | Replace with the trained models in section 11; Warren Nolan becomes a public benchmark at most |
| `tiktok-system`, `remotion` | Keep. Any record shown in videos must come from `/results` |

---

## 13. Risks

1. **Scaled-content classification** if the gate slips. Mitigation: section 6,
   Search Console monitoring and the kill switch.
2. **Small ceilings in the wedge sports.** Betting-intent volume is tiny, so most
   traffic will come through ratings, RPI and tournament pages. Set expectations in
   visits per sport, not dollars.
3. **Prediction markets** (Kalshi, Polymarket) are scaling programmatic matchup pages
   into the same niches.
4. **AIO absorbs "who is favored".** Pages must lead with what an overview cannot
   give: the model probability, the inputs that moved it, the price comparison and
   the graded history.
5. **A public model can look bad.** Calibration and CLV are shown regardless. Honest
   variance is on brand; hiding losses is not.
6. **Seasonality.** Volleyball ends in December, and baseball, softball and lacrosse
   are dark from July to January. Hubs should switch to a useful off-season state
   (final ratings, recap, preseason ratings) rather than going thin.
7. **Data access.** Scraping is fragile and may breach terms (ESPN's unofficial API,
   Warren Nolan). Budget for a licensed feed if scraping breaks.
8. **YMYL-adjacent topic.** Gambling content gets E-E-A-T scrutiny, so a real author,
   real methodology and real results are required.
9. **Brand confusion.** "D1" overlaps with D1Baseball and D1Softball (the
   navigational query "d1baseball" gets 40,500 searches a month). Never imply
   affiliation.
10. **Legal.** Player props, state rules, marketing to under-21s. Section 8.

---

## 14. Decisions for Beau

1. **Sport order:** volleyball and hockey now, women's basketball in November,
   baseball, softball and lacrosse in February, and no head-term push in football or
   men's basketball. Approve?
2. **Wipe the February 2026 record, picks and article** (recommended), or keep them
   noindexed if you can document them?
3. **Odds:** buy The Odds API paid tier (baseball, women's basketball, lacrosse)? For
   volleyball, hockey and softball, choose between Kalshi market data as the
   reference price and probabilities only, with no "bet" calls.
4. **Auto-publishing:** site-kit says generated drafts never auto-publish. Daily
   slates cannot wait for a pull request. Allow model pages to auto-publish behind
   the section 6 gate, with editorial still going through a PR?
5. **Platform:** rebuild on site-kit (Next 16, release gating, `buildMetadata`,
   audits), or retrofit the current Next 15 app?
6. **Canonical host:** apex (site-kit default) or www?
7. **Authorship:** confirm the bio facts (former pro baseball player, Stanford) for
   `/authors/beau-branton`. Decide who writes the 1 to 2 sentence takes on marquee
   pages, and how much daily time that takes.
8. **Units and stakes:** show stakes in units, or probabilities plus edge only?
9. **Prediction markets:** may the pages reference Kalshi prices at all?

## What Beau must provide

- Search Console access for d1picks.com (property verification status unknown);
  Vercel access to set the domain redirect.
- An odds budget and API keys.
- A bio, headshot and credentials for the author page.
- Sign-off on the record reset and on the auto-publish rule.
- About 15 minutes a day in season for marquee takes, or approval of a review-only
  workflow.
- Approval to pull 3 seasons of historical results per sport.

---

## Appendix: method and spend

**DataForSEO spend: $0.5578 over 40 calls** (cap $5.00; account balance before the
run $49.97, so the 40% ceiling was $19.99). Log: `costs.jsonl`.

| Endpoint | Calls | Cost |
|---|---|---|
| `appendix/user_data` | 1 | $0.0000 |
| `dataforseo_labs/google/ranked_keywords/live` (d1picks, dimers college filter, warrennolan, signalodds) | 4 | $0.1321 |
| `dataforseo_labs/google/keyword_suggestions/live` | 3 | $0.0544 |
| `keywords_data/google_ads/search_volume/live` (250 keywords, then a re-query of the 105 nulls) | 2 | $0.1800 |
| `dataforseo_labs/google/keyword_overview/live` (250 keywords, clickstream and SERP info) | 1 | $0.0503 |
| `serp/google/organic/live/advanced` (21 keywords, async AIO; 7 re-run at depth 30 for raw files; 1 server error, still charged) | 29 | $0.1410 |

**Wasted spend:** the $0.09 re-query of Ads nulls returned nothing. Ads does not
split close variants even when they are sent separately.

**Keyword suggestions were abandoned after 3 seeds.** Labs holds almost no long-tail
data for gambling phrasing ("college baseball picks" returned 1 suggestion). A
curated 250-keyword list measured directly was more useful.

**Deliberately not queried:**
- `keyword_ideas`;
- more matchup SERPs (7 is enough to see the pattern);
- men's basketball and football depth;
- backlink profiles;
- Bing and Google Trends.

**Files in `docs/research/dataforseo/2026-10-04/`:**
- `00`: balance;
- `01`: d1picks baseline;
- `02`-`04`: suggestions;
- `05`-`06`: Ads volumes;
- `07`: Labs overview;
- `08`-`10`: competitors;
- `serp-*.json`: live SERPs (depth 20 to 30, async AIO);
- `serp-first-run-inline-observations.json`: the first-run AIO observations for the
  calls whose full response came back inline.
