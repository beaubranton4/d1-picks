#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Monthly GSC indexing audit: "is it indexed, and does Google agree with our
 * canonical?" Pulls the top N pages from Search Analytics (or every sitemap
 * URL with --sitemap, which suits young sites with little traffic), runs the
 * URL Inspection API on each, buckets the results and writes a markdown
 * report to docs/gsc-audits/YYYY-MM.md.
 *
 * Diagnostic only: submits nothing, triggers no reindexing. Unlike the
 * original Dugout Edge script there is no canonical autofix: kit pages get
 * their canonical from buildMetadata(), so a CANONICAL_MISMATCH means a page
 * bypassed it, and the fix is to route that page through buildMetadata.
 *
 * Exit codes: 0 clean; 1 an actionable bucket (5XX, 404, CANONICAL_MISMATCH,
 * DUPLICATE_CHOSEN_DIFFERENT, API_ERROR) is non-empty; 2 the audit itself
 * failed (bad key, no access, empty gscProperty) and wrote no report.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cli, int } from '../lib/cli.mjs';
import { ROOT, loadConfig, requireField, siteOrigin } from '../lib/config.mjs';
import { getAccessToken, gscQuery, inspectUrl, keyPath, pool, SCOPES } from '../lib/google.mjs';
import { addDays, iso, table } from '../lib/md.mjs';
import { fetchSitemap } from '../lib/sitemap.mjs';

const { values } = cli(
  `
Usage: node scripts/kit/gsc/audit.mjs [--rows N] [--days N] [--concurrency N] [--sitemap] [--out PATH]

  --rows N          top pages by clicks to inspect (default 500)
  --days N          Search Analytics window (default 90)
  --concurrency N   parallel inspections (default 8; quota ~600/min, 2000/day per property)
  --sitemap         inspect every URL in the live sitemap instead of the top pages
  --out PATH        report path (default docs/gsc-audits/YYYY-MM.md)

Property: site.config.json gscProperty. Key: GSA_KEY_PATH
(default ~/.config/gcloud/dugout-edge-sa.json), webmasters.readonly scope.
`,
  { rows: { type: 'string' }, days: { type: 'string' }, concurrency: { type: 'string' }, sitemap: { type: 'boolean' }, out: { type: 'string' } },
);

const cfg = loadConfig();
const SITE = requireField(cfg, 'gscProperty', 'e.g. sc-domain:example.com');
const ROWS = int(values.rows, 500);
const DAYS = int(values.days, 90);

function classify(r) {
  if (r.error) return 'API_ERROR';
  if (r.coverageState === 'Not found (404)') return '404';
  if (r.pageFetchState && /SERVER_ERROR|5XX/.test(r.pageFetchState)) return '5XX';
  if (r.coverageState === 'Page with redirect') return 'REDIRECT';
  if (r.coverageState && /currently not indexed/i.test(r.coverageState)) return 'NOT_INDEXED_OTHER';
  if (r.coverageState && /Duplicate/i.test(r.coverageState)) return 'DUPLICATE_CHOSEN_DIFFERENT';
  if (r.googleCanonical && r.userCanonical && r.googleCanonical !== r.userCanonical) return 'CANONICAL_MISMATCH';
  if (r.coverageState && /unknown to google/i.test(r.coverageState)) return 'NOT_DISCOVERED';
  if (r.coverageState && /Submitted and indexed|Indexed, not submitted/i.test(r.coverageState) && r.pageFetchState === 'SUCCESSFUL') return 'CLEAN';
  return 'OTHER';
}

let urls;
let scope;
let results;
try {
  console.error(`Auth via ${keyPath()}`);
  const token = await getAccessToken(SCOPES.gscRead);
  if (values.sitemap) {
    urls = (await fetchSitemap(siteOrigin(cfg))).urls;
    scope = `all ${urls.length} sitemap URLs`;
  } else {
    const end = addDays(new Date(), -2);
    const start = addDays(end, -DAYS);
    const rows = await gscQuery(token, SITE, { startDate: iso(start), endDate: iso(end), dimensions: ['page'], rowLimit: ROWS });
    urls = rows.sort((a, b) => b.clicks - a.clicks).map((r) => r.keys[0]).filter((u) => !u.includes('#'));
    scope = `top ${urls.length} pages by clicks (${iso(start)} to ${iso(end)})`;
  }
  console.error(`Inspecting ${urls.length} URLs with concurrency ${int(values.concurrency, 8)}...`);
  results = await pool(urls, int(values.concurrency, 8), (u) => inspectUrl(token, SITE, u).catch((e) => ({ url: u, error: String(e) })));
} catch (e) {
  console.error(`gsc/audit failed before producing a report: ${e.message}`);
  process.exit(2);
}

const buckets = {};
for (const r of results) (buckets[classify(r)] ||= []).push(r);

const ORDER = ['5XX', '404', 'CANONICAL_MISMATCH', 'DUPLICATE_CHOSEN_DIFFERENT', 'REDIRECT', 'NOT_INDEXED_OTHER', 'NOT_DISCOVERED', 'API_ERROR', 'OTHER', 'CLEAN'];
const ACTIONABLE = ['5XX', '404', 'CANONICAL_MISMATCH', 'DUPLICATE_CHOSEN_DIFFERENT', 'API_ERROR'];
const FIX = {
  '5XX': 'Check Vercel runtime logs for the URL. Retired page: add a 301 in next.config.ts redirects(). Otherwise it is an outage.',
  '404': 'Indexed but gone. 301 it to the closest parent (hub or city page) in next.config.ts redirects(), or restore it.',
  CANONICAL_MISMATCH: 'The page bypassed buildMetadata() or emits the wrong host. Route its metadata through buildMetadata().',
  DUPLICATE_CHOSEN_DIFFERENT: 'Same content at two URLs. Point the canonical at the URL Google chose, or 301 the obsolete one.',
  REDIRECT: 'Usually intentional. Confirm a redirect exists for each, and that no sitemap or internal link points at it.',
  NOT_INDEXED_OTHER: '"Crawled, currently not indexed" is a quality signal. Improve or merge the page; do not just resubmit it.',
  NOT_DISCOVERED: 'Google has not found it. Check it is in the sitemap and linked from a hub; run audit-site for orphans.',
};

const ym = iso(new Date()).slice(0, 7);
const out = [`# GSC indexing audit: ${ym}`, '', `Run ${iso(new Date())} on ${SITE}. Inspected ${scope}.`, '', '## Summary', ''];
out.push(table(['Bucket', 'Count', 'Fix'], ORDER.map((k) => [k, (buckets[k] || []).length, FIX[k] ?? ''])), '');
for (const k of ORDER) {
  if (k === 'CLEAN' || !(buckets[k] || []).length) continue;
  out.push(`## ${k}: ${buckets[k].length}`, '');
  for (const r of buckets[k]) {
    out.push(`- ${r.url}`);
    if (r.googleCanonical && r.userCanonical && r.googleCanonical !== r.userCanonical) {
      out.push(`  - userCanonical: \`${r.userCanonical}\``, `  - googleCanonical: \`${r.googleCanonical}\``);
    }
    if (r.coverageState) out.push(`  - coverageState: ${r.coverageState}`);
    if (r.lastCrawlTime) out.push(`  - lastCrawlTime: ${r.lastCrawlTime}`);
    if (r.error) out.push(`  - error: ${r.error.slice(0, 200)}`);
  }
  out.push('');
}

const reportPath = path.resolve(ROOT, values.out ?? `docs/gsc-audits/${ym}.md`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, out.join('\n') + '\n');
console.log(out.join('\n'));
console.error(`\nReport written to ${path.relative(ROOT, reportPath)}`);
const issues = ACTIONABLE.reduce((n, k) => n + (buckets[k] || []).length, 0);
process.exit(issues > 0 ? 1 : 0);
