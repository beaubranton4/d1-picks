#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Prerender check: does each page type ship real content in its HTML, or a
 * loading shell that needs JavaScript?
 *
 * Googlebot renders JS eventually, on a budget. The AI crawlers we allow in
 * robots.txt (GPTBot, ClaudeBot, PerplexityBot, CCBot) largely do not. A route
 * that renders client-side is invisible to them. The usual killers: a
 * useEffect data fetch with a loading placeholder, or a mounted-gate that
 * returns null on the server. ('use client' alone is fine: client components
 * still server-render.)
 *
 * Looks inside <main> (the page's own content, not header/footer chrome), one
 * URL per route family from the sitemap. A page is a SHELL when its raw HTML
 * has no <h1> in <main>, shows a loading marker, or carries less than
 * --threshold characters of visible text. Thin-but-real pages pass; this is a
 * rendering check, not a quality check. Exits non-zero on any shell.
 */
import { cli, int } from './lib/cli.mjs';
import { loadConfig, siteOrigin } from './lib/config.mjs';
import { getAccessToken, gscQuery, SCOPES } from './lib/google.mjs';
import { mainHtml, mainText } from './lib/html.mjs';
import { table } from './lib/md.mjs';
import { pool } from './lib/pool.mjs';
import { fetchSitemap } from './lib/sitemap.mjs';

const { values, positionals } = cli(
  `
Usage: node scripts/kit/prerender-check.mjs [paths...] [options]

  paths              check these paths (e.g. /guides /tools/x) instead of the sample
  --base URL         server to check (default https://<canonicalHost>)
  --threshold N      minimum visible chars inside <main> (default 150)
  --all              check every sitemap URL, not one per route family
  --from-gsc N       check the top N pages by GSC clicks (needs GSA_KEY_PATH)
`,
  { base: { type: 'string' }, threshold: { type: 'string' }, all: { type: 'boolean' }, 'from-gsc': { type: 'string' } },
);

const cfg = loadConfig();
const BASE = (values.base ?? siteOrigin(cfg)).replace(/\/$/, '');
const THRESHOLD = int(values.threshold, 150);
const UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const SHELL_MARKERS = [/\bLoading\.\.\./i, /\bLoading (article|content|page|results)\b/i];

/** Route family: first path segment + depth (/guides/a and /guides/b are one family). */
const family = (p) => {
  const segs = p.split('/').filter(Boolean);
  return segs.length ? `${segs[0]}/${segs.length}` : '/';
};

async function targets() {
  if (positionals.length) return positionals;
  if (values['from-gsc']) {
    const token = await getAccessToken(SCOPES.gscRead);
    const end = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
    const start = new Date(Date.now() - 33 * 864e5).toISOString().slice(0, 10);
    const rows = await gscQuery(token, cfg.gscProperty, { startDate: start, endDate: end, dimensions: ['page'], rowLimit: int(values['from-gsc'], 50) });
    return rows.map((r) => r.keys[0].replace(/^https?:\/\/[^/]+/, '') || '/').filter((u) => !u.includes('#'));
  }
  const { urls } = await fetchSitemap(BASE);
  const paths = urls.map((u) => u.replace(/^https?:\/\/[^/]+/, '') || '/');
  if (values.all) return paths;
  const seen = new Map();
  for (const p of paths) if (!seen.has(family(p))) seen.set(family(p), p);
  return [...seen.values()];
}

const list = await targets();
const results = await pool(list, 6, async (u) => {
  try {
    const res = await fetch(BASE + u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    const html = await res.text();
    const text = mainText(html);
    const marker = SHELL_MARKERS.find((m) => m.test(text));
    return { u, status: res.status, chars: text.length, h1: /<h1\b/i.test(mainHtml(html)), marker: marker?.source ?? null };
  } catch (e) {
    return { u, status: 'ERR', chars: 0, h1: false, marker: String(e.message).slice(0, 60) };
  }
});

results.sort((a, b) => a.chars - b.chars);
const verdict = (r) =>
  r.status !== 200 ? 'NOT 200' : r.marker ? `SHELL (${r.marker})` : !r.h1 ? 'SHELL (no h1 in HTML)' : r.chars < THRESHOLD ? 'SHELL (no text)' : 'ok';
const bad = results.filter((r) => verdict(r) !== 'ok');
console.log(`# Prerender check: ${BASE}\n`);
console.log(`Checked ${results.length} URLs as Googlebot without running JavaScript. A page needs an <h1> and at least ${THRESHOLD} chars of visible text in <main>.\n`);
console.log(
  table(
    ['URL', 'Status', 'Main text chars', 'H1 in HTML', 'Verdict'],
    results.map((r) => [r.u, r.status, r.chars, r.h1 ? 'yes' : 'no', verdict(r)]),
  ),
);
if (bad.length) {
  console.log(`\n${bad.length} route(s) ship no server-rendered content. Non-JS crawlers see an empty page.`);
  console.log('Fix: fetch data in a server component (or generateStaticParams + server render) so the body is in the initial HTML.');
  process.exit(1);
}
console.log('\nAll checked routes ship server-rendered content.');
