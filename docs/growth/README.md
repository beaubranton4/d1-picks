# Growth loop: setup and operation

Weekly, unattended: research topics, draft a page from fetched sources, run the gates, open a PR with a future-dated page, auto-merge when CI passes, then measure each page at 14, 28 and 60 days and decide what to do with it.

## One-time setup (you do these)

1. **Repo secrets** (Settings, Secrets and variables, Actions): `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` (API access page, not the dashboard password), `GSC_SA_KEY_BASE64` (`base64 -i <service-account.json> | gh secret set GSC_SA_KEY_BASE64`; the account needs Restricted access on the Search Console property and Viewer on GA4), `ANTHROPIC_API_KEY`, `GA4_PROPERTY_ID` (numeric).
2. **Optional but needed for hands-off merging:** a fine-grained PAT with contents and pull-requests write as secret `GROWTH_PR_TOKEN` (PRs opened by the default token do not trigger CI, so auto-merge never fires without it). Turn on Allow auto-merge and make the CI job a required check on `main`.
3. **`growth.config.json`:** fill `site`, `clusters`, `content.tools` and `skip`, then set `"enabled": true`. It ships `false`.
4. Keep Search Console email alerts on. Manual actions are not exposed by the API; if you get one, `touch docs/growth/manual-action.flag` and the loop halts.

Until the secrets exist and `enabled` is true the workflow prints a notice and exits.

## Anthropic budget (shared across all sites)

The loop's total Anthropic budget is about **$20 per month across every site** (raise it later). Each site's share is `caps.monthlyUsd.anthropic` in its own `growth.config.json`; the scripts add up reported token usage in `docs/growth/ledger.jsonl` and refuse a call that would pass the cap. Keep the sum of all sites' caps at or under $20:

| Site | Anthropic cap / month |
|---|---|
| Spend My Stipend (pilot, starts highest) | 8 |
| Each other site (up to 6 sites) | 2 |

Model choice is the cheapest that passes the gates: `anthropic.models` is tried cheapest first (Haiku 4.5, $1/$5 per MTok), and a draft that cannot pass the gates escalates to Sonnet 5.5 ($2/$10). A typical draft is about 20k tokens in and 7k out: roughly $0.05 on Haiku, $0.11 on Sonnet, so one page a week costs well under $1 a month per site. Only the second brain uses an Anthropic key today; add `ANTHROPIC_API_KEY` as a repo secret per site, ideally a separate workspace key so this spend is visible on its own.

## Files

| Path | What |
|---|---|
| `growth.config.json` | site, clusters, caps, gate thresholds, kill switch |
| `docs/growth/voice.md` | voice guide given to the drafter |
| `docs/growth/ledger.jsonl` | every paid call and its reported cost |
| `docs/growth/state.json` | loop pages, refresh queue, seed rotation, pause state |
| `docs/growth/pages/<slug>.json` and `.body.md` | per-page record and the exact gated markdown |
| `docs/growth/sources/<slug>/` | saved source texts the fact-check ran against |
| `docs/growth/log.md`, `report-YYYY-WW.md` | decisions and the weekly report |

## Safety brakes

`enabled: false`, a `docs/growth/PAUSED` file, auto-pause (indexed share under 50% of pages older than 30 days, site impressions down over 50% in 14 days), the manual-action flag, per-service monthly caps, and a hard cap of 3 pages per ISO week. Clear an auto-pause with `node scripts/kit/growth/run.mjs --resume`.
