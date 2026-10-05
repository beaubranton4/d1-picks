---
description: Find queries the site already earns impressions for but has no dedicated page serving, from 12 months of Search Console data, and say what to build. Usage: /kit-content-gap [topic keyword]
---
<!-- site-kit v0.1.0 -->

# Content gap analysis

No argument: full-site sweep. A keyword (`$ARGUMENTS`) scopes it to one topic.
The method lives in `scripts/kit/gsc/content-gaps.mjs`, so it is reproducible.

## 1. Run

```bash
node scripts/kit/gsc/content-gaps.mjs --months 12 --top 30
node scripts/kit/gsc/content-gaps.mjs --months 12 --filter "$ARGUMENTS"
```

The brief lands in `docs/content-briefs/YYYY-MM-DD-<scope>-content-gaps.md`.
Tune generic pages, excluded paths, intent tiers and built-thing suggestions in
`data/seo-taxonomy.json`, not in the report.

## 2. Read it with the method in mind

- **Position comes from query+page pairs, never query-level averages.** A money page at 5 reports as 13 when /about ranks 70 for the same query.
- **T0 queries are dropped** (not our reader). Tiers multiply the score: T1 x3, T2 x1.5, T3 x0.5.
- **Buckets:** A, release candidates (a scheduled, unreleased entry already covers the gap: consider moving its date earlier, within the cap); B, write-new (the work list); C, improve-existing (a dedicated page ranks 11-30); and a covered appendix to sanity-check the run.

## 3. Verify before writing

- A query you know is covered must appear in the covered appendix, not in Bucket B.
- Spot-check two Bucket B clusters with a direct `['query','page']` pull.
- Run the **AI-Overview filter** (CLAUDE.md) on every Bucket B item: if Google's AI Overview answers it perfectly, it only gets built paired with a tool, printable, original data or verified listings. Otherwise drop it.

## 4. Build

Each new page goes through `/kit-keyword-content-engine` phase 4 (draft as a
PR with a future `publishDate`) and `/kit-release-plan` (cadence). Never
publish directly.

## Report

Bucket B top 10 with the built thing for each, the items you dropped at the
AI-Overview filter and why, and any Bucket A dates worth moving.
