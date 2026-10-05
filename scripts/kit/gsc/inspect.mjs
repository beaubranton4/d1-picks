#!/usr/bin/env node
// site-kit v0.1.0
/**
 * URL Inspection for specific URLs: what Google knows about a page right now
 * (indexed?, last crawl, canonical it chose). Use it the week a page releases,
 * before asking "why is this not ranking".
 */
import { cli, int } from '../lib/cli.mjs';
import { loadConfig, requireField, siteOrigin } from '../lib/config.mjs';
import { getAccessToken, inspectUrl, pool, SCOPES } from '../lib/google.mjs';
import { table } from '../lib/md.mjs';
import { fetchSitemap } from '../lib/sitemap.mjs';

const { values, positionals } = cli(
  `
Usage: node scripts/kit/gsc/inspect.mjs [paths or URLs...] [--sitemap] [--concurrency N]

  paths or URLs   e.g. /guides/foo or https://example.com/guides/foo
  --sitemap       inspect every URL in the live sitemap
  --concurrency N parallel requests (default 4)

Property: site.config.json gscProperty. Key: GSA_KEY_PATH, webmasters.readonly scope.
`,
  { sitemap: { type: 'boolean' }, concurrency: { type: 'string' } },
);

const cfg = loadConfig();
requireField(cfg, 'gscProperty', 'e.g. sc-domain:example.com');
const origin = siteOrigin(cfg);
let urls = positionals.map((u) => (u.startsWith('http') ? u : origin + (u.startsWith('/') ? u : `/${u}`)));
if (values.sitemap) urls.push(...(await fetchSitemap(origin)).urls);
urls = [...new Set(urls)];
if (!urls.length) {
  console.error('inspect: pass paths/URLs or --sitemap (see --help)');
  process.exit(2);
}

const token = await getAccessToken(SCOPES.gscRead);
const results = await pool(urls, int(values.concurrency, 4), (u) => inspectUrl(token, cfg.gscProperty, u));
console.log(
  table(
    ['URL', 'Verdict', 'Coverage', 'Last crawl', 'Google canonical'],
    results.map((r) => [
      r.url.replace(origin, '') || '/',
      r.error ? 'ERROR' : r.verdict,
      r.error ?? r.coverageState,
      r.lastCrawlTime?.slice(0, 10) ?? '',
      !r.googleCanonical ? '' : !r.userCanonical ? `${r.googleCanonical} (page declares none)` : r.googleCanonical !== r.userCanonical ? `${r.googleCanonical} (differs)` : 'matches',
    ]),
  ),
);
