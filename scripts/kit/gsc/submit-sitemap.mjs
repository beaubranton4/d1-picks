#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Submit (or resubmit) the sitemap to Search Console and list what GSC has
 * on file: last download, warnings, errors, URLs submitted.
 *
 * Needs the WRITE scope (webmasters), and the service account must be an
 * Owner or Full user on the property. Resubmitting is only useful after a
 * structural change (new sitemap URL, a large batch of fixes); GSC re-reads a
 * known sitemap on its own.
 */
import { cli } from '../lib/cli.mjs';
import { loadConfig, requireField, siteOrigin } from '../lib/config.mjs';
import { getAccessToken, gscSitemaps, SCOPES } from '../lib/google.mjs';
import { table } from '../lib/md.mjs';

const { values } = cli(
  `
Usage: node scripts/kit/gsc/submit-sitemap.mjs [--list] [--url URL]

  --list      only list sitemaps GSC knows about, submit nothing
  --url URL   sitemap to submit (default https://<canonicalHost>/sitemap.xml)

Property: site.config.json gscProperty. Key: GSA_KEY_PATH; needs the
webmasters (write) scope and Owner/Full permission on the property.
`,
  { list: { type: 'boolean' }, url: { type: 'string' } },
);

const cfg = loadConfig();
requireField(cfg, 'gscProperty', 'e.g. sc-domain:example.com');
const sitemapUrl = values.url ?? `${siteOrigin(cfg)}/sitemap.xml`;
const token = await getAccessToken(values.list ? SCOPES.gscRead : SCOPES.gscWrite);
const list = await gscSitemaps(token, cfg.gscProperty, values.list ? {} : { submit: sitemapUrl });
if (!values.list) console.log(`Submitted ${sitemapUrl} to ${cfg.gscProperty}.\n`);
console.log(
  table(
    ['Sitemap', 'Last submitted', 'Last downloaded', 'Pending', 'Warnings', 'Errors', 'URLs submitted'],
    list.map((s) => [
      s.path,
      s.lastSubmitted?.slice(0, 10) ?? '',
      s.lastDownloaded?.slice(0, 10) ?? '',
      s.isPending ? 'yes' : 'no',
      s.warnings ?? 0,
      s.errors ?? 0,
      (s.contents ?? []).map((c) => `${c.type}: ${c.submitted}`).join(', '),
    ]),
  ),
);
