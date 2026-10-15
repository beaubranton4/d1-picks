# Pages wave 2: five data and tool pages

Built 2026-10-15 from `docs/seo-strategy.md` and `docs/research/keyword-map.csv` (branch `seo/strategy`), plus one DataForSEO call
(`docs/research/dataforseo/2026-10-15/`, $0.0436 of the $1.50 allowed). Volumes are Google Ads US 12-month averages with the peak month
in brackets; KD is DataForSEO keyword difficulty.

Rule for all five: an AI answer can say what RPI or bracketology is, but it cannot hand over today's numbers from our model, a working
simulator, or a file. Every figure comes from the saved ratings (`data/volleyball/ratings`), the saved NCAA.com results
(`data/volleyball/results-2026.json`) or the seeded simulations in `src/site/sim.ts` run on them. No betting advice, no picks, no
promotions; pages with probabilities carry the 21+ line.

## The five

| # | URL | Release | Target keywords (volume, peak, KD) | Asset |
|---|---|---|---|---|
| 1 | `/volleyball/conference-standings` | 2026-10-21 | big ten volleyball standings 9,900 (60,500 Nov) KD 9; sec volleyball standings 5,400 (27,100 Nov) KD 13; big 12 volleyball standings 2,900 (18,100 Nov) KD 12; big ten volleyball rankings 9,900 KD 31 | Standings for all 32 leagues with model rank, rating, conference title odds and expected NCAA bids; CSV `standings.csv` |
| 2 | `/volleyball/rpi` | 2026-10-23 | volleyball rpi 1,000 (6,600 Nov) KD 4; ncaa volleyball rpi 1,300 (8,100 Nov) KD 16; ncaa volleyball rpi rankings 1,300 (8,100 Nov) KD 32 | RPI for every D1 team rebuilt from NCAA.com results (WP, OWP, OOWP), RPI rank vs model rank, biggest gaps; CSV `rpi.csv` |
| 3 | `/volleyball/matchup-calculator` | 2026-10-28 | nebraska vs penn state volleyball 1,900 (12,100) KD 3; texas vs nebraska volleyball 1,600 KD 1; nebraska vs wisconsin volleyball 880 KD 1 (all from keyword-map.csv); ncaa volleyball rankings 33,100 (135,000 Nov) KD 35 as the broader intent | Any two of 348 teams, any floor: win chance and set-score odds; top-10 head-to-head grid rendered in HTML |
| 4 | `/volleyball/ncaa-tournament-predictions` | 2026-10-30 | volleyball bracketology 6,600 (74,000 Dec) KD 4; ncaa volleyball bracket 49,500 (673,000 Dec) KD 21; ncaa volleyball tournament bracket 1,600 (14,800 Dec) KD 22; ncaa volleyball bracket predictions 320 (2,900 Dec) KD 0; ncaa volleyball selection show 1,600 (14,800 Nov) KD 14 | Projected 64-team field (31 automatic, 33 at large), each team's chance to win its league, get an at-large bid and make the field, the bubble, bids by conference; CSV `field.csv` |
| 5 | `/volleyball/bracket-simulator` | 2026-11-04 | ncaa volleyball tournament predictions 70 (390 Nov) KD 2; volleyball final four predictions (no record); also the bracket terms above | In-browser Monte Carlo of the 64-team bracket: every team's chance to reach each round and win the title; swap teams, toggle home court, rerun; default results server-rendered |

Schedule: two pages a week (W43: Oct 21, 23; W44: Oct 28, 30; W45: Nov 4) so the growth loop's one weekly guide keeps the cap of three.
Downloads 404 until their page's date (`src/site/download.ts`). Nothing is backdated.

## Why AI cannot replace each

1. **Conference standings:** an Overview lists a league's top teams from a poll. It cannot give conference title odds from a model, a
   conference-strength ranking, or a file.
2. **RPI:** Overviews define RPI and name last season's leaders. They cannot compute today's table, show where RPI and a set-based
   rating disagree, or provide the CSV with every input column.
3. **Matchup calculator:** the three marquee pairs are what people type; the tool answers the pair they actually have in mind. An
   Overview cannot run our model for an arbitrary pair.
4. **Bracketology:** the keyword map shows an Overview on "volleyball bracketology" and "ncaa volleyball bracket predictions". Ours
   quantifies each team's odds of getting in, shows the bubble, and ships the CSV.
5. **Simulator:** a simulation the reader can change, with the pod and region assumptions on the page.

## Data behind each

| Page | Saved inputs | Derived by |
|---|---|---|
| Conference standings | `ratings/<date>.json`, `results-2026.json` (conference record = completed matches between teams in the same league) | `src/site/derived.ts` `conferenceTables()`; title odds from `projectField` |
| RPI | `results-2026.json` completed D1 best-of-five matches, snapshot ranks | `computeRpi` (25/50/25); hand-checked unit test |
| Matchup calculator | ratings, `home_logit`, `calibration_scale` | `predictMatch`, a port of `pipeline/model.py`; test reproduces every logged prediction to 3 decimals |
| Bracketology | ratings, results | `projectField`: 4,000 seeded simulations of 31 conference tournaments and 33 at-large picks |
| Simulator | the projected field and ratings | `simulateBracket`: 20,000 seeded runs; sums checked (one champion, four in the Final Four) |

NCAA facts used (all from NCAA.com, checked 2026-10-14): 64-team field, 31 automatic and 33 at large, selection show Nov. 29, round dates,
top 32 seeded nationally in pods of four, pairings of ones with eights and so on; NCAA.com study of adjusted RPI and the field of 64.

## Assumptions the pages state

- Our feed lists 32 leagues; the NCAA lists 31 automatic bids (NCAA.com and bid specs, checked 2026-10-15). We assume the new Pac-12 has none (first championship the week of Nov. 23; a projected list of 31 qualifiers has no Pac-12). Unconfirmed, stated on the pages and in the CSVs: change
  `NO_AUTO_BID` in `src/site/derived.ts` if wrong.
- Conference champions are simulated as an eight-team neutral-floor bracket. Leagues that award the bid for the regular season differ.
- Rating uncertainty (about 1 / sqrt(0.25 + 0.76 per match)) is our approximation, not a pipeline output.
- At-large order is by model rating, not the committee's criteria. The RPI is the classic formula without the NCAA's adjustments.
- Pod layout and the regional and Final Four pairings are our assumptions about the NCAA bracket; rating-based seeds, no geography.
- Results refresh after ratings are fit, so a record on RPI and conference pages can be a match ahead of `/volleyball/ratings`.

## Rejected

- **A ratings history CSV and a ratings database:** only two snapshots exist (Oct 4, Oct 15), so a "history" is two rows per team. Revisit
  in December, when the daily snapshots make it real. Not backfilled: that would mean changing pipeline output.
- **A page per team:** capped by design and thin on two snapshots; no keyword with demand a team page serves better than the ratings
  table and the calculator. Revisit with a cap of 16 once there is a month of history.
- **PairWise projections:** hockey, gated until its model exists.
- **"NCAA volleyball scores" (27,100):** scoreboard intent, owned by NCAA.com and ESPN.
- **"Picks" and "odds" pages:** the research shows tens of searches a month.
- **Fair lines or sportsbook prices on the new pages:** probabilities only, no bet calls.
- **Separate page per big conference:** the standings page gives each of the three its own section and anchor; separate URLs would
  split five fast-growing pages into thin ones before we know what ranks.
- **Official-RPI claim:** we cannot fetch the NCAA sheet (stats.ncaa.org blocks scripts), so the page says it is our calculation.
