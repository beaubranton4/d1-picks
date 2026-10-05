# D1 Picks

College sports predictions from a published model, graded in public:
https://www.d1picks.com. Women's volleyball is live; hockey, women's
basketball and baseball follow (see `CLAUDE.md`, "Decisions on record").

Two halves:

- **`pipeline/`** (Python): fetches results from NCAA.com, fits the ratings,
  logs predictions before first serve, grades them, picks and writes the gated
  match previews, and checks every auto-publish guardrail. It writes only to
  `data/` and `content/volleyball-games/`.
- **The site** (Next 16 on [site-kit](https://github.com/beaubranton4/site-kit)):
  server-renders those files. It computes nothing a reader would call a number,
  except counts and averages over the graded ledger.

Rules for changes (kit boundary, guardrails, voice) are in `CLAUDE.md`. The
SEO plan is `docs/seo-strategy.md`.

## Quick start

```bash
npm ci
pip install -r pipeline/requirements.txt      # numpy, requests, PyYAML
python -m pipeline.run daily                  # fetch, rate, grade, predict, write pages, check
npm run dev                                    # http://localhost:3000
```

`python -m pipeline.run daily --no-fetch` reruns everything from the saved
results without touching NCAA.com. `python -m pipeline.run backfill` refetches
the whole season.

## The model (volleyball, `vb-bt-1`)

Bradley-Terry on sets: one rating per D1 team plus one home-court term, fit by
maximum likelihood with a normal prior toward the D1 average, then a one-number
calibration fit only on walk-forward out-of-sample predictions. Set-score odds
come from the calibrated set probability. The full write-up is `/methodology`
(`src/app/methodology/page.tsx`), and every number on it is read from the files
below.

## Data (`data/volleyball/`, written only by the pipeline)

| File | What | Rule |
|---|---|---|
| `results-2026.json` | Every D1 contest from the NCAA.com scoreboard, with its NCAA.com URL | Source data; refetched for the last 7 days each run |
| `ratings/YYYY-MM-DD.json` | Daily ratings snapshot with model version and parameters | Never rewritten once a prediction references it |
| `predictions/YYYY-MM.jsonl` | The ledger: one prediction per match, logged before first serve | Append-only |
| `grades/YYYY-MM.jsonl` | Grades and voids | Append-only |
| `backtest-2026.json` | Walk-forward backtest, labeled as such | Regenerated daily; never counts toward the record |
| `game-pages.json`, `games/<slug>.json` | Which matches got a preview, why, and the facts behind it | Append-only selection log |
| `manifest.json` | Which files are current | The site's entry point |

`content/volleyball-games/<slug>.mdx` holds each preview's generated analysis,
so the kit's content lint checks it like any other page.

## The daily job

`.github/workflows/daily-volleyball.yml` (recommended over a local LaunchAgent:
it runs when the Mac is asleep, logs every run, and every data change is a
commit). In order: pipeline unit tests, `pipeline.run daily`, `pipeline.run
check --base HEAD` (ledger append-only, number trace, caps), content lint,
`npm test`, build, commit `data/` and `content/` to main, deploy.

**It is not scheduled.** To switch it on once this branch is merged to main:

1. Run it once by hand (Actions, Daily volleyball, Run workflow) and check the commit it makes.
2. Uncomment the `schedule:` block (10:15 UTC daily) and merge.
3. If Vercel does not build commits pushed by `github-actions[bot]`, create a Deploy Hook in Vercel and save it as the `VERCEL_DEPLOY_HOOK` repo secret; the job calls it after each commit.
4. Weekly, review game-page indexing (CLAUDE.md, "Kill switch").

Any failed check stops the job before the commit, so nothing unchecked publishes.

## Checks

| Command | What |
|---|---|
| `python -m unittest discover -s pipeline/tests -t .` | Model math, ledger rules, number trace, copy rules |
| `python -m pipeline.run check [--base <ref>]` | Guardrails over everything saved |
| `npm run lint:content` | Kit content lint, including generated previews |
| `npm test` | Kit tests, registry and orphans, game-page caps and number trace |
| `/kit-preflight` | Lint, tests, build, then audit, prerender and robots against a local production server |
| `npm run audit -- <url>` / `npm run prerender -- --base <url>` | Crawl checks against a running site |

## One-time setup still to do (production only)

See the kit README for the generic steps. For this site: in Vercel, set
`www.d1picks.com` as the primary domain with `d1picks.com` 308-redirecting to
it; verify `sc-domain:d1picks.com` in Search Console and add the service
account; then fill `ga4MeasurementId`, `ga4PropertyId` and `contactEmail` in
`site.config.json`.

## Layout

| Path | Owner | What |
|---|---|---|
| `pipeline/` | site | Python pipeline, its config (`config/volleyball.json`, `config/publishing.json`) and tests |
| `src/kit/`, `scripts/kit/`, `.claude/commands/kit-*` | kit | Never edit here; sync from site-kit |
| `src/app/` | site | Routes |
| `src/site/` | site | Registry (`pages.ts`), data loaders (`data.ts`), formatting, UI |
| `data/`, `content/` | pipeline | Generated; never hand-edit |
| `legacy/baseball/` | site | The old baseball scripts, kept for parts. Not a model |
| `remotion/`, `tiktok-system/` | site | Video tooling; must be rewired to `data/` before use |
| `docs/` | site | SEO strategy and research, screenshots |
