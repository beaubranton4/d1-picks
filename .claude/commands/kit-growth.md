---
description: SEO growth loop. Weekly auto-research, draft, gate and publish of future-dated pages, plus 14/28/60 day measurement and expand/refresh/merge/prune decisions. Auto-publish is allowed only when every gate passes. Usage: /kit-growth [dry-run | status | run | enable | pause]
---
<!-- site-kit v0.1.0 -->

# Growth loop

The loop lives in `scripts/kit/growth/` and runs weekly from
`.github/workflows/growth-loop.yml`. Read the "Growth loop exception" section of
`CLAUDE.md` first: it is the only place this kit lets AI drafts publish without
a human, and only because of the gates below.

## Stages (what the scripts do)

1. Brakes: kill switch, pause file, indexed share at 30 days, impression drop, manual-action flag.
2. Measure pages the loop published, at 14, 28 and 60 days (Search Console clicks, impressions, position; URL Inspection; GA4 engaged sessions) and decide: expand, refresh, merge, investigate indexing, or noindex and prune.
3. Pick topics: Search Console striking distance and gaps, plus DataForSEO `keyword_suggestions` (real keyword difficulty) around `clusters[].seeds`, within the monthly spend cap.
4. AI-Overview filter: one organic SERP per shortlisted candidate with `load_async_ai_overview`; skip when an overview answers it and we have no tool, data or verified-facts angle. Skips are logged with the reason.
5. Cannibalization: overlap with an existing page becomes "extend that page", not a new page.
6. Draft with the Anthropic API from fetched source text only; gate (lint, fact-check, duplicates, value, size); publish a future-dated page; the workflow opens a PR and auto-merges when CI passes.
7. Log every decision to `docs/growth/log.md` and write `docs/growth/report-YYYY-WW.md`.

## Commands

```bash
npm run growth:dry        # fixtures only; no keys; writes to a scratch dir
npm run test:growth       # gate and pipeline unit tests
npm run growth:verify     # re-run every gate on loop pages from their saved sources
node scripts/kit/growth/run.mjs --stage pick          # live: topics + AI-Overview filter only (DataForSEO spend only)
node scripts/kit/growth/run.mjs --keyword "..."       # live: one forced topic through the whole pipeline
node scripts/kit/growth/run.mjs --resume              # clear an auto-pause after you have looked at why
node scripts/kit/growth/run.mjs --ledger-add dataforseo,<endpoint>,<cost>   # record spend made through the MCP tool
```

## Rules for you (the agent) when asked to work on the loop

- Never weaken a gate to get a draft through. A dropped draft is the system working.
- Never edit a loop page by hand; `growth:verify` fails the PR if the post drifts from the gated markdown.
- Never turn `enabled` to true or add secrets for the user. Tell them what to do (`docs/growth/README.md`).
- Check the DataForSEO balance (`v3/appendix/user_data`, free) before any paid call, and keep to the per-site cap in `growth.config.json`.
- Refresh, expand, merge and prune actions sit in `docs/growth/state.json` `refreshQueue`. Working one is a normal reviewed PR, not an auto-merge.
