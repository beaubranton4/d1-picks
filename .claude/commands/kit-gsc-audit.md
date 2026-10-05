---
description: Monthly Search Console indexing audit. Inspects the top pages (or every sitemap URL) with the URL Inspection API, buckets problems (5XX, 404, canonical mismatch, duplicates, not indexed), and proposes fixes. Usage: /kit-gsc-audit [--sitemap]
---
<!-- site-kit v0.1.0 -->

# GSC indexing audit

Answers "is it indexed, and does Google agree with our canonical?" before
problems cost weeks of traffic. Diagnostic only: it submits nothing and
triggers no reindexing.

## Run

```bash
node scripts/kit/gsc/audit.mjs             # top 500 pages by clicks, last 90 days
node scripts/kit/gsc/audit.mjs --sitemap   # every sitemap URL (young sites with little traffic)
```

Flags: `--rows N`, `--days N`, `--concurrency N` (URL Inspection quota is about
600/min and 2000/day per property), `--out PATH`. Property comes from
`site.config.json` `gscProperty`; the key from `GSA_KEY_PATH` (default
`~/.config/gcloud/dugout-edge-sa.json`). Never print or open the key file.

The report lands in `docs/gsc-audits/YYYY-MM.md`. Exit 1 means an actionable
bucket is non-empty.

## Fix playbook

- **5XX:** read Vercel runtime logs for the URL. A retired page gets a 301 in `next.config.ts` `redirects()`; anything else is an outage to debug.
- **404 (indexed but gone):** 301 to the closest parent (the hub or city page) in `next.config.ts`, or restore the page. Do not guess a target you are not confident in; note it instead.
- **CANONICAL_MISMATCH:** kit pages get their canonical from `buildMetadata()`. A mismatch means the page bypassed it (hand-written `metadata`) or the host is wrong. Route the page through `buildMetadata()`. Check www vs apex: the apex is canonical and Vercel should 308 www to it.
- **DUPLICATE_CHOSEN_DIFFERENT:** the same content at two URLs. Identical content: point the canonical at Google's choice. One URL obsolete: 301 it.
- **REDIRECT:** usually intentional. Confirm the redirect exists and that no sitemap entry or internal link points at the old URL (`audit-site` catches both).
- **NOT_INDEXED_OTHER ("Crawled, currently not indexed"):** a quality verdict. Improve, merge or retire the page. Resubmitting does not help. Apply the AI-Overview filter from CLAUDE.md.
- **NOT_DISCOVERED:** Google never found it. Confirm it is in the sitemap and linked from a hub; run `audit-site` for orphans.

## Cadence

Monthly, via `.github/workflows/gsc-monthly.yml` once the repo has the
`GSC_SA_KEY_BASE64` secret. It pushes a `gsc-audit-YYYY-MM-DD` branch for
review. Check that the branch gets merged: an unread report is no report.

## Report

Bucket counts, then each actionable URL with the fix you made or propose, and
anything you deliberately left for a human with the reason.
