#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Crawl a running site from its sitemap and check every technical-SEO item
 * that can be checked from HTML. Point it at production or at a local
 * `VERCEL_ENV=production npm start`; sitemap URLs (canonical host) are
 * rewritten onto the base URL so a local build audits exactly like live.
 *
 * Errors (exit 1):
 *   robots.txt blocks crawling or lists no reachable sitemap
 *   sitemap URL not on https://<canonicalHost>, duplicated, or lastmod in the future
 *   sitemap URL not 200, or more than one redirect hop
 *   canonical missing, relative, or not the page's own URL
 *   not exactly one <h1>; missing <title> or meta description
 *   noindex (meta robots or X-Robots-Tag) on a sitemap URL
 *   JSON-LD that does not parse or has no @type
 *   <img> without alt; raster <img> not served as AVIF/WebP or via /_next/image
 *   orphan: a sitemap URL no other crawled page links to
 *   internal link that 404s (or redirects more than once)
 *   release leak: an unreleased page (future publishDate / schedule date)
 *   that does not 404 or appears in the sitemap
 * Warnings: one redirect hop on a sitemap URL, description outside 70-160,
 * empty alt, duplicate titles/descriptions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cli, int } from './lib/cli.mjs';
import { ROOT } from './lib/config.mjs';
import { unreleasedPaths } from './lib/content.mjs';
import { inspectPage } from './lib/html.mjs';
import { table } from './lib/md.mjs';
import { pool } from './lib/pool.mjs';
import { fetchSitemap, mapToBase } from './lib/sitemap.mjs';

const { values, positionals } = cli(
  `
Usage: node scripts/kit/audit-site.mjs <baseUrl> [options]

  <baseUrl>              e.g. http://localhost:3000 or https://example.com
  --concurrency N        parallel requests (default 6)
  --no-release-check     skip the unreleased-page leak check
  --json PATH            also write the full results as JSON
  --ua STRING            user agent (default: a Googlebot-compatible UA)
  --timeout SECONDS      per-request timeout (default 20)

Run from the site's repo root so site.config.json and content/ are found.
`,
  {
    concurrency: { type: 'string' },
    'no-release-check': { type: 'boolean' },
    json: { type: 'string' },
    ua: { type: 'string' },
    timeout: { type: 'string' },
  },
);

const BASE = (positionals[0] ?? '').replace(/\/$/, '');
if (!/^https?:\/\//.test(BASE)) {
  console.error('audit-site: pass the base URL, e.g. http://localhost:3000 (see --help)');
  process.exit(2);
}
const CONCURRENCY = int(values.concurrency, 6);
const TIMEOUT_MS = int(values.timeout, 20) * 1000;
const UA = values.ua ?? 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) site-kit-audit';
const cfgFile = path.join(ROOT, 'site.config.json');
const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, 'utf8')) : null;
const ORIGIN = cfg ? `https://${cfg.canonicalHost}` : new URL(BASE).origin;

const issues = []; // { level, path, check, msg }
const add = (level, p, check, msg) => issues.push({ level, path: p, check, msg });
const toPath = (u) => {
  const p = new URL(u, BASE).pathname;
  return p.length > 1 ? p.replace(/\/+$/, '') : '/';
};

/** GET with manual redirects; returns the chain and the final response body. */
async function get(url, { body = true } = {}) {
  const chain = [];
  let cur = url;
  for (let hop = 0; hop < 6; hop++) {
    let res;
    try {
      res = await fetch(cur, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      return { status: 'ERR', chain, error: e.message };
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      chain.push({ status: res.status, from: cur });
      cur = new URL(res.headers.get('location'), cur).toString();
      if (!cur.startsWith(BASE) && cur.startsWith(ORIGIN)) cur = mapToBase(cur, BASE);
      continue;
    }
    try {
      return { status: res.status, chain, url: cur, headers: res.headers, text: body ? await res.text() : '' };
    } catch (e) {
      return { status: 'ERR', chain, error: e.message };
    }
  }
  return { status: 'LOOP', chain };
}

// --- robots.txt -----------------------------------------------------------
const robotsRes = await get(`${BASE}/robots.txt`);
const robots = robotsRes.status === 200 ? robotsRes.text : '';
if (robotsRes.status !== 200) add('error', '/robots.txt', 'robots', `robots.txt returned ${robotsRes.status}`);
{
  // Collect the rules of every group that applies to "*".
  let applies = false;
  let lastWasAgent = false;
  const disallow = [];
  for (const raw of robots.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, k, v] = m;
    if (/^user-agent$/i.test(k)) {
      applies = lastWasAgent ? applies || v === '*' : v === '*';
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (applies && /^disallow$/i.test(k) && v) disallow.push(v);
  }
  if (disallow.includes('/')) add('error', '/robots.txt', 'robots', 'robots.txt disallows everything for User-agent: * (preview build or a stray rule?)');
}

// --- sitemap ---------------------------------------------------------------
let sitemap;
try {
  sitemap = await fetchSitemap(BASE);
} catch (e) {
  add('error', '/sitemap.xml', 'sitemap', e.message);
  sitemap = { urls: [], images: [], lastmods: [] };
}
const today = new Date().toISOString().slice(0, 10);
const seenLoc = new Set();
for (const loc of sitemap.urls) {
  if (!loc.startsWith(ORIGIN + '/') && loc !== ORIGIN) add('error', loc, 'sitemap', `URL is not on the canonical origin ${ORIGIN}`);
  if (seenLoc.has(loc)) add('error', toPath(loc), 'sitemap', 'listed twice');
  seenLoc.add(loc);
}
for (const { url, lastmod } of sitemap.lastmods) {
  if (lastmod.slice(0, 10) > today) add('error', toPath(url), 'sitemap', `lastmod ${lastmod} is in the future`);
}
if (!sitemap.urls.length) add('error', '/sitemap.xml', 'sitemap', 'sitemap has no URLs');

// --- crawl sitemap URLs ----------------------------------------------------
const pages = await pool([...seenLoc], CONCURRENCY, async (loc) => {
  const p = toPath(loc);
  const res = await get(mapToBase(loc, BASE));
  const row = { path: p, loc, status: res.status, hops: res.chain.length, info: null };
  if (res.status !== 200) {
    add('error', p, 'status', `returned ${res.status}${res.error ? ` (${res.error})` : ''}`);
    return row;
  }
  if (res.chain.length > 1) add('error', p, 'redirects', `${res.chain.length} redirect hops (max 1)`);
  else if (res.chain.length === 1) add('warn', p, 'redirects', 'sitemap URL redirects; list the final URL instead');

  const xRobots = res.headers.get('x-robots-tag') ?? '';
  if (/noindex/i.test(xRobots)) add('error', p, 'noindex', `X-Robots-Tag: ${xRobots}`);

  const info = inspectPage(res.text);
  row.info = info;
  if (/noindex/i.test(info.robots)) add('error', p, 'noindex', `meta robots "${info.robots}" on a sitemap URL`);
  if (!info.canonical) add('error', p, 'canonical', 'no <link rel="canonical">');
  else if (!/^https?:\/\//.test(info.canonical)) add('error', p, 'canonical', `canonical is relative: ${info.canonical}`);
  else if (info.canonical.replace(/\/$/, '') !== loc.replace(/\/$/, '')) add('error', p, 'canonical', `canonical ${info.canonical} is not this page (${loc})`);
  if (info.h1Count !== 1) add('error', p, 'h1', `${info.h1Count} <h1> elements (need exactly 1)`);
  if (!info.title) add('error', p, 'title', 'missing <title>');
  if (!info.description) add('error', p, 'description', 'missing meta description');
  else if (info.description.length < 70 || info.description.length > 160) {
    add('warn', p, 'description', `meta description is ${info.description.length} chars (aim for 70-160)`);
  }
  for (const block of info.jsonld) {
    try {
      const data = JSON.parse(block);
      for (const node of Array.isArray(data) ? data : [data]) {
        if (!node['@type'] && !node['@graph']) add('error', p, 'json-ld', 'JSON-LD node without @type');
      }
    } catch (e) {
      add('error', p, 'json-ld', `JSON-LD does not parse: ${e.message}`);
    }
  }
  for (const img of info.images) {
    const src = img.src ?? '';
    if (!('alt' in img)) add('error', p, 'img-alt', `<img src="${src.slice(0, 80)}"> has no alt`);
    else if (!img.alt.trim()) add('warn', p, 'img-alt', `<img src="${src.slice(0, 80)}"> has empty alt (decorative?)`);
    const optimized = src.startsWith('/_next/image') || /\.(webp|avif|svg)(\?|$)/i.test(src) || src.startsWith('data:');
    if (src && !optimized) add('error', p, 'img-format', `<img src="${src.slice(0, 80)}"> is not AVIF/WebP and not via /_next/image`);
  }
  return row;
});

// --- link graph: orphans + internal 404s -----------------------------------
const crawled = new Map(pages.filter((r) => r.info).map((r) => [r.path, r]));
const inbound = new Map();
const internalTargets = new Map(); // path+query -> Set(source paths)
for (const r of crawled.values()) {
  for (const href of r.info.links) {
    if (/^(mailto|tel|javascript):/i.test(href) || href.startsWith('#')) continue;
    let u;
    try {
      u = new URL(href, BASE);
    } catch {
      continue;
    }
    const internal = u.origin === new URL(BASE).origin || u.origin === ORIGIN;
    if (!internal || u.pathname.startsWith('/_next/')) continue;
    const target = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, '') : '/';
    if (target !== r.path) {
      if (!inbound.has(target)) inbound.set(target, new Set());
      inbound.get(target).add(r.path);
    }
    const key = target + u.search;
    if (!internalTargets.has(key)) internalTargets.set(key, new Set());
    internalTargets.get(key).add(r.path);
  }
}
for (const r of crawled.values()) {
  if (r.path !== '/' && !inbound.get(r.path)?.size) add('error', r.path, 'orphan', 'no other crawled page links here');
}
const toCheck = [...internalTargets.keys()].filter((k) => !crawled.has(k));
await pool(toCheck, CONCURRENCY, async (k) => {
  const res = await get(BASE + k, { body: false });
  const from = [...internalTargets.get(k)].slice(0, 3).join(', ');
  if (res.status !== 200) add('error', k, 'broken-link', `internal link returns ${res.status} (linked from ${from})`);
  else if (res.chain.length > 1) add('error', k, 'broken-link', `internal link takes ${res.chain.length} redirect hops (linked from ${from})`);
});

// --- duplicates --------------------------------------------------------------
for (const field of ['title', 'description']) {
  const by = new Map();
  for (const r of crawled.values()) {
    const v = r.info[field];
    if (v) by.set(v, [...(by.get(v) ?? []), r.path]);
  }
  for (const [v, ps] of by) if (ps.length > 1) add('warn', ps.join(', '), `duplicate-${field}`, `"${v.slice(0, 70)}" on ${ps.length} pages`);
}

// --- release leak ----------------------------------------------------------
let leakChecked = 0;
if (!values['no-release-check'] && cfg) {
  const unreleased = unreleasedPaths(cfg);
  const inSitemap = new Set(sitemap.urls.map(toPath));
  await pool(unreleased, CONCURRENCY, async (p) => {
    leakChecked++;
    if (inSitemap.has(p)) add('error', p, 'release-leak', 'unreleased page is in the sitemap');
    const res = await get(BASE + p, { body: false });
    if (res.status !== 404) add('error', p, 'release-leak', `unreleased page returns ${res.status}; it must 404 until its date`);
    if (inbound.has(p)) add('error', p, 'release-leak', `linked from ${[...inbound.get(p)].join(', ')}`);
  });
}

// --- report ----------------------------------------------------------------
const errorsFor = (p) => issues.filter((i) => i.level === 'error' && i.path === p).length;
const warnsFor = (p) => issues.filter((i) => i.level === 'warn' && i.path === p).length;
const yes = (b) => (b ? 'ok' : 'FAIL');
console.log(`# Site audit: ${BASE}\n`);
console.log(`Canonical origin ${ORIGIN}. ${sitemap.urls.length} sitemap URLs, ${sitemap.images.length} sitemap images, ${toCheck.length} other internal link targets, ${leakChecked} unreleased paths checked.\n`);
console.log(
  table(
    ['Path', 'Status', 'Hops', 'Canonical', 'H1', 'Desc', 'JSON-LD', 'Imgs', 'Inbound', 'Errors', 'Warnings'],
    pages.map((r) => [
      r.path,
      r.status,
      r.hops,
      r.info ? yes(r.info.canonical?.replace(/\/$/, '') === r.loc.replace(/\/$/, '')) : '-',
      r.info ? r.info.h1Count : '-',
      r.info ? (r.info.description ? r.info.description.length : 'none') : '-',
      r.info ? r.info.jsonld.length : '-',
      r.info ? r.info.images.length : '-',
      r.path === '/' ? 'root' : inbound.get(r.path)?.size ?? 0,
      errorsFor(r.path),
      warnsFor(r.path),
    ]),
  ),
);
const errors = issues.filter((i) => i.level === 'error');
const warns = issues.filter((i) => i.level === 'warn');
if (issues.length) {
  console.log('\n## Issues\n');
  console.log(table(['Level', 'Check', 'Path', 'Detail'], [...errors, ...warns].map((i) => [i.level.toUpperCase(), i.check, i.path, i.msg])));
}
console.log(`\n${errors.length} error(s), ${warns.length} warning(s).`);
if (values.json) fs.writeFileSync(values.json, JSON.stringify({ base: BASE, origin: ORIGIN, pages, issues }, null, 2));
process.exit(errors.length ? 1 : 0);
