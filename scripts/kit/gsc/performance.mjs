#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Monthly GSC performance audit, the companion to audit.mjs. audit.mjs asks
 * "is it indexed?"; this asks "how is organic going, and where is the
 * upside?": trend, rankings-vs-demand attribution, section split, brand
 * split, movers, and the three opportunity buckets (striking distance, CTR
 * gap, page 2), plus the zero-click cohort (AI Overview casualties).
 *
 * Writes docs/gsc-audits/YYYY-MM-performance.md and prints it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cli, int } from '../lib/cli.mjs';
import { ROOT, loadConfig, loadTaxonomy, requireField, sectionOf, shortPath } from '../lib/config.mjs';
import { getAccessToken, gscQuery, SCOPES } from '../lib/google.mjs';
import { addDays, iso, round as R, table } from '../lib/md.mjs';

const { values } = cli(
  `
Usage: node scripts/kit/gsc/performance.mjs [--days N] [--out PATH] [--json PATH]

  --days N     comparison window (default 28)
  --out PATH   report path (default docs/gsc-audits/YYYY-MM-performance.md)
  --json PATH  also dump raw page/query rows

Sections come from data/seo-taxonomy.json; brand split from site.config.json
brandRegex. Key: GSA_KEY_PATH, webmasters.readonly scope.
`,
  { days: { type: 'string' }, out: { type: 'string' }, json: { type: 'string' } },
);

const cfg = loadConfig();
const tax = loadTaxonomy();
const SITE = requireField(cfg, 'gscProperty', 'e.g. sc-domain:example.com');
const DAYS = int(values.days, 28);
const brand = new RegExp(cfg.brandRegex, 'i');
const token = await getAccessToken(SCOPES.gscRead);
const q = (body, all = false) => gscQuery(token, SITE, body, { all });

const sum = (rs, k) => rs.reduce((s, r) => s + r[k], 0);
const wpos = (rs) => {
  const i = sum(rs, 'impressions');
  return i ? rs.reduce((s, r) => s + r.position * r.impressions, 0) / i : 0;
};
const short = (u) => shortPath(u, cfg);
function delta(cur, prev) {
  const d = cur - prev;
  const p = prev === 0 ? null : (d / prev) * 100;
  return `${d >= 0 ? '+' : ''}${d} (${p === null ? 'new' : (d >= 0 ? '+' : '') + R(p, 0) + '%'})`;
}
/** Rough industry CTR-by-position curve, used only to size the CTR gap. */
function expectedCtr(pos) {
  const curve = [0, 0.28, 0.15, 0.1, 0.07, 0.053, 0.042, 0.034, 0.028, 0.024, 0.021];
  if (pos <= 10) return curve[Math.max(1, Math.round(pos))];
  return pos <= 20 ? 0.012 : 0.005;
}

// GSC data lags 2-3 days.
const END = addDays(new Date(), -3);
const W = [
  [addDays(END, -(DAYS - 1)), END],
  [addDays(END, -(DAYS * 2 - 1)), addDays(END, -DAYS)],
  [addDays(END, -(DAYS * 3 - 1)), addDays(END, -DAYS * 2)],
];
const YOY = [addDays(addDays(END, -364), -(DAYS - 1)), addDays(END, -364)];
const range = ([s, e]) => ({ startDate: iso(s), endDate: iso(e) });

const [d1, d0, dy, daily] = await Promise.all([
  q({ ...range(W[0]), dimensions: ['date'] }),
  q({ ...range(W[1]), dimensions: ['date'] }),
  q({ ...range(YOY), dimensions: ['date'] }),
  q({ startDate: iso(addDays(END, -485)), endDate: iso(END), dimensions: ['date'] }),
]);
const pages = [];
for (const w of W) pages.push(await q({ ...range(w), dimensions: ['page'] }, true));
const [q1, q0] = await Promise.all([q({ ...range(W[0]), dimensions: ['query'] }, true), q({ ...range(W[1]), dimensions: ['query'] }, true)]);
const [dev1, ctry] = await Promise.all([
  q({ ...range(W[0]), dimensions: ['device'], rowLimit: 100 }),
  q({ ...range(W[0]), dimensions: ['country'], rowLimit: 50 }),
]);

const out = [];
const say = (s = '') => out.push(s);
say(`# GSC performance: ${iso(W[0][0])} to ${iso(W[0][1])}`);
say();
say(`Generated ${iso(new Date())} for ${SITE}. Window ${DAYS}d; compared to ${iso(W[1][0])} to ${iso(W[1][1])} and YoY ${iso(YOY[0])} to ${iso(YOY[1])}.`);
say();

say('## Headline');
say();
const ctr = (rs) => (sum(rs, 'impressions') ? R((sum(rs, 'clicks') / sum(rs, 'impressions')) * 100, 2) + '%' : 'n/a');
say(
  table(['Metric', 'Current', 'Prior', 'Change', 'YoY', 'Change YoY'], [
    ['Clicks', sum(d1, 'clicks'), sum(d0, 'clicks'), delta(sum(d1, 'clicks'), sum(d0, 'clicks')), sum(dy, 'clicks'), delta(sum(d1, 'clicks'), sum(dy, 'clicks'))],
    ['Impressions', sum(d1, 'impressions'), sum(d0, 'impressions'), delta(sum(d1, 'impressions'), sum(d0, 'impressions')), sum(dy, 'impressions'), delta(sum(d1, 'impressions'), sum(dy, 'impressions'))],
    ['CTR', ctr(d1), ctr(d0), '', ctr(dy), ''],
    ['Avg position', R(wpos(d1)), R(wpos(d0)), R(wpos(d1) - wpos(d0)), R(wpos(dy)), R(wpos(d1) - wpos(dy))],
  ]),
);
say();

say('## Monthly trend (16 months)');
say();
{
  const m = new Map();
  for (const r of daily) {
    const k = r.keys[0].slice(0, 7);
    const c = m.get(k) || { clicks: 0, imps: 0, posW: 0 };
    c.clicks += r.clicks;
    c.imps += r.impressions;
    c.posW += r.position * r.impressions;
    m.set(k, c);
  }
  const ms = [...m.entries()].sort();
  const max = Math.max(1, ...ms.map(([, v]) => v.clicks));
  say(table(['Month', 'Clicks', 'Impr', 'CTR', 'Pos', ''], ms.map(([k, v]) => [k, v.clicks, v.imps, v.imps ? R((v.clicks / v.imps) * 100, 2) + '%' : '', v.imps ? R(v.posW / v.imps) : '', '#'.repeat(Math.round((v.clicks / max) * 28))])));
}
say();

say('## Is a decline rankings or demand?');
say();
{
  const m0 = new Map(q0.map((r) => [r.keys[0], r]));
  const held = { di: 0, i0: 0, n: 0 };
  const lost = { di: 0, i0: 0, n: 0 };
  for (const r of q1) {
    if (r.impressions < 100 || !m0.has(r.keys[0])) continue;
    const p = m0.get(r.keys[0]);
    const b = r.position - p.position > 1.5 ? lost : held;
    b.di += r.impressions - p.impressions;
    b.i0 += p.impressions;
    b.n++;
  }
  const pct = (b) => (b.i0 ? R((b.di / b.i0) * 100, 0) + '%' : 'n/a');
  say(table(['Cohort (queries >=100 impr in both windows)', 'Queries', 'Impr prior', 'Impr now', 'Change'], [
    ['Position HELD (within 1.5)', held.n, held.i0, held.i0 + held.di, pct(held)],
    ['Position DROPPED (>1.5)', lost.n, lost.i0, lost.i0 + lost.di, pct(lost)],
  ]));
  say();
  say('If the loss sits in the HELD cohort it is search demand (seasonality), not rankings. Decide whether a decline needs action before planning one.');
}
say();

say('## Clicks by section (three consecutive windows)');
say();
{
  const aggs = pages.map((rows) => {
    const m = new Map();
    for (const r of rows) {
      const k = sectionOf(short(r.keys[0]), tax);
      const c = m.get(k) || { clicks: 0, imps: 0 };
      c.clicks += r.clicks;
      c.imps += r.impressions;
      m.set(k, c);
    }
    return m;
  });
  const keys = [...new Set(aggs.flatMap((m) => [...m.keys()]))].sort((a, b) => (aggs[0].get(b)?.clicks || 0) - (aggs[0].get(a)?.clicks || 0));
  say(table(['Section', 'Clicks (oldest to newest)', 'Change latest', 'Impr latest', 'CTR'], keys.map((k) => {
    const c = aggs.map((m) => m.get(k)?.clicks || 0);
    const i0 = aggs[0].get(k)?.imps || 0;
    return [k, `${c[2]} / ${c[1]} / ${c[0]}`, delta(c[0], c[1]), i0, i0 ? R((c[0] / i0) * 100, 2) + '%' : ''];
  })));
  say();
  say('A drop spread evenly across sections is demand; one section collapsing is a real problem.');
}
say();

say('## Brand vs non-brand queries');
say();
{
  const split = (rows) => rows.reduce((a, r) => {
    const k = brand.test(r.keys[0]) ? 'brand' : 'non-brand';
    a[k].clicks += r.clicks;
    a[k].imps += r.impressions;
    return a;
  }, { brand: { clicks: 0, imps: 0 }, 'non-brand': { clicks: 0, imps: 0 } });
  const s1 = split(q1);
  const s0 = split(q0);
  say(table(['Segment', 'Clicks', 'Prior', 'Change', 'Impr'], ['brand', 'non-brand'].map((k) => [k, s1[k].clicks, s0[k].clicks, delta(s1[k].clicks, s0[k].clicks), s1[k].imps])));
  say();
  say('_Query rows exclude anonymized queries, so these totals are lower than the headline._');
}
say();

say('## Devices and countries');
say();
say(table(['Device', 'Clicks', 'Impr', 'CTR', 'Pos'], dev1.sort((a, b) => b.clicks - a.clicks).map((r) => [r.keys[0], r.clicks, r.impressions, R(r.ctr * 100, 2) + '%', R(r.position)])));
say();
say(table(['Country', 'Clicks', 'Impr', 'CTR'], ctry.sort((a, b) => b.clicks - a.clicks).slice(0, 6).map((r) => [r.keys[0], r.clicks, r.impressions, R(r.ctr * 100, 2) + '%'])));
say();

say('## Biggest page movers');
say();
{
  const m1 = new Map(pages[1].map((r) => [r.keys[0], r]));
  const all = new Map();
  for (const r of pages[0]) all.set(r.keys[0], { cur: r, prev: m1.get(r.keys[0]) });
  for (const r of pages[1]) if (!all.has(r.keys[0])) all.set(r.keys[0], { cur: null, prev: r });
  const rows = [...all.entries()].map(([u, v]) => ({ u: short(u), d: (v.cur?.clicks || 0) - (v.prev?.clicks || 0), c: v.cur?.clicks || 0, p: v.prev?.clicks || 0, cp: v.cur?.position, pp: v.prev?.position }));
  say('### Losing clicks');
  say();
  say(table(['Page', 'Now', 'Was', 'Change', 'Pos now', 'Pos was'], rows.filter((r) => r.d < 0).sort((a, b) => a.d - b.d).slice(0, 15).map((r) => [r.u, r.c, r.p, r.d, r.cp ? R(r.cp) : 'gone', r.pp ? R(r.pp) : ''])));
  say();
  say('### Gaining clicks');
  say();
  say(table(['Page', 'Now', 'Was', 'Change', 'Pos now'], rows.filter((r) => r.d > 0).sort((a, b) => b.d - a.d).slice(0, 15).map((r) => [r.u, r.c, r.p, '+' + r.d, r.cp ? R(r.cp) : ''])));
}
say();

say('## Opportunity 1: striking distance (pos 3.5-20, >=300 impr)');
say();
say(table(['Query', 'Impr', 'Clicks', 'CTR', 'Pos', 'Upside at pos 3'], q1.filter((r) => r.position >= 3.5 && r.position <= 20 && r.impressions >= 300).sort((a, b) => b.impressions - a.impressions).slice(0, 30).map((r) => [r.keys[0], r.impressions, r.clicks, R(r.ctr * 100, 2) + '%', R(r.position), '+' + Math.max(0, Math.round(r.impressions * 0.1 - r.clicks))])));
say();

say('## Opportunity 2: CTR gap (pages >=500 impr, pos <=20, below expected CTR)');
say();
say(table(['Page', 'Impr', 'Clicks', 'CTR', 'Expected', 'Pos', 'Click gap'], pages[0].filter((r) => r.impressions >= 500 && r.position <= 20).map((r) => ({ r, gap: Math.round(r.impressions * expectedCtr(r.position) - r.clicks) })).filter((x) => x.gap > 20).sort((a, b) => b.gap - a.gap).slice(0, 25).map((x) => [short(x.r.keys[0]), x.r.impressions, x.r.clicks, R(x.r.ctr * 100, 2) + '%', R(expectedCtr(x.r.position) * 100, 1) + '%', R(x.r.position), '+' + x.gap])));
say();

say('## Opportunity 3: page 2 (pos 11-20, >=200 impr)');
say();
say(table(['Page', 'Impr', 'Clicks', 'CTR', 'Pos'], pages[0].filter((r) => r.position > 10 && r.position <= 20 && r.impressions >= 200).sort((a, b) => b.impressions - a.impressions).slice(0, 25).map((r) => [short(r.keys[0]), r.impressions, r.clicks, R(r.ctr * 100, 2) + '%', R(r.position)])));
say();

say('## Zero-click cohort (>=1500 impr, <0.3% CTR)');
say();
{
  const zc = pages[0].filter((r) => r.impressions >= 1500 && r.ctr < 0.003 && !r.keys[0].includes('#')).sort((a, b) => b.impressions - a.impressions);
  say(table(['Page', 'Impr', 'Clicks', 'CTR', 'Pos'], zc.slice(0, 25).map((r) => [short(r.keys[0]), r.impressions, r.clicks, R(r.ctr * 100, 2) + '%', R(r.position)])));
  say();
  say(`**Cohort:** ${zc.length} pages, ${sum(zc, 'impressions')} impressions, ${sum(zc, 'clicks')} clicks. This is the AI Overview casualty list: stop investing in pages Google answers for you, or pair them with a tool, original data or verified listings.`);
}
say();

{
  const frags = pages[0].filter((r) => r.keys[0].includes('#'));
  if (frags.length) {
    say(`## URLs indexed with #fragments: ${frags.length} (${sum(frags, 'impressions')} impr, ${sum(frags, 'clicks')} clicks)`);
    say();
    const withHash = (u) => u.replace(/^https?:\/\/[^/]+/, '') || '/';
    say(table(['URL', 'Impr', 'Clicks', 'Pos'], frags.sort((a, b) => b.impressions - a.impressions).slice(0, 10).map((r) => [withHash(r.keys[0]), r.impressions, r.clicks, R(r.position)])));
    say();
  }
}
say(`_${pages[0].length} pages and ${q1.length} queries in window._`);

const OUT = path.resolve(ROOT, values.out ?? `docs/gsc-audits/${iso(END).slice(0, 7)}-performance.md`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n') + '\n');
console.log(out.join('\n'));
console.log(`\nReport written to ${path.relative(ROOT, OUT)}`);
if (values.json) {
  fs.writeFileSync(values.json, JSON.stringify({ windows: W.map(([s, e]) => [iso(s), iso(e)]), pages: pages[0], pagesPrior: pages[1], queries: q1, queriesPrior: q0 }, null, 2));
}
