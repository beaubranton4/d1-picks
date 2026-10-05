---
description: Monthly organic performance review from Search Console (and GA4 if configured). Trend, rankings-vs-demand split, sections, brand split, movers, striking-distance/CTR-gap/page-2 opportunities, zero-click cohort, plus a prerender check. Usage: /kit-gsc-performance [--days N]
---
<!-- site-kit v0.1.0 -->

# GSC performance review

The companion to `/kit-gsc-audit`: "how is organic going, and where is the upside?"

## Run, in this order

1. **Prerender check first:** `node scripts/kit/prerender-check.mjs --all` (against production). A client-rendered route makes every number about its section meaningless, and non-JS AI crawlers see nothing. Fix shells before reading anything else. `--from-gsc 60` checks the top 60 live pages instead.
2. **Performance:** `node scripts/kit/gsc/performance.mjs [--days 28]` writes `docs/gsc-audits/YYYY-MM-performance.md`.
3. **GA4** (if `ga4PropertyId` is set): `node scripts/kit/ga4/performance.mjs` writes `docs/ga4-audits/YYYY-MM.md`.
4. **Indexing:** run `/kit-gsc-audit` in the same pass.

Sections are bucketed by `data/seo-taxonomy.json` `sections`; brand vs
non-brand uses `site.config.json` `brandRegex`. Keep both current when URL
structure changes. Auth: `GSA_KEY_PATH`; never print the key.

## Read it in this order

1. **Rankings or demand?** If the impression loss sits in the position-HELD cohort, it is seasonality, not a penalty. Decide whether a decline needs action at all before planning one.
2. **Sections:** a drop spread evenly across sections is demand; one section collapsing is real.
3. **Opportunities, biggest gap first:** striking distance (pos 3.5-20) and page 2 (pos 11-20) want better on-page answers and internal links from strong pages; CTR gap wants a better title/description (through `buildMetadata`), never clickbait.
4. **Zero-click cohort:** high impressions, near-zero CTR. These are AI Overview casualties. Stop investing in them, or pair them with a tool, printable, original data or verified listings (the AI-Overview filter in CLAUDE.md).

## Report

Lead with the verdict (growing / flat / declining, and whether it is demand
or rankings). Then the top 5 actions ranked by click upside, each naming the
page and the change. Notes: GSC lags 2-3 days (the script offsets for it) and
retains 16 months.
