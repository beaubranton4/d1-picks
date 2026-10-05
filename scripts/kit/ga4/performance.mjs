#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Monthly GA4 audit: traffic, acquisition, behaviour and measurement health.
 * GSC answers "how does Google see us"; this answers "what do visitors do once
 * they arrive, and can we even tell". Measurement health comes first because
 * it bounds every other number.
 *
 * Writes docs/ga4-audits/YYYY-MM.md and prints it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cli, int } from '../lib/cli.mjs';
import { ROOT, loadConfig } from '../lib/config.mjs';
import { ga4Report, getAccessToken, SCOPES } from '../lib/google.mjs';
import { addDays, iso, round as R, table } from '../lib/md.mjs';

const { values } = cli(
  `
Usage: node scripts/kit/ga4/performance.mjs [--days N] [--out PATH]

  --days N     comparison window (default 28)
  --out PATH   report path (default docs/ga4-audits/YYYY-MM.md)

Property: site.config.json ga4PropertyId (or GA4_PROPERTY_ID). Key: GSA_KEY_PATH;
the service account needs Viewer on the GA4 property (analytics.readonly).
`,
  { days: { type: 'string' }, out: { type: 'string' } },
);

const cfg = loadConfig();
// Accept "123456789" or "properties/123456789".
const PROPERTY = String(cfg.ga4PropertyId || process.env.GA4_PROPERTY_ID || '').replace(/^properties\//, '');
if (!PROPERTY) {
  console.error('ga4: set ga4PropertyId in site.config.json (numeric property id, not the G- measurement id)');
  process.exit(2);
}
const DAYS = int(values.days, 28);
const token = await getAccessToken(SCOPES.ga4Read);
const run = (body) => ga4Report(token, PROPERTY, body);
const num = (v) => Number(v || 0);
const rows = (resp) => (resp.rows || []).map((r) => ({ dims: (r.dimensionValues || []).map((d) => d.value), mets: (r.metricValues || []).map((m) => num(m.value)) }));
const DATE = (s, e) => [{ startDate: iso(s), endDate: iso(e) }];
function delta(cur, prev) {
  const d = cur - prev;
  const p = prev === 0 ? null : (d / prev) * 100;
  return `${d >= 0 ? '+' : ''}${Math.round(d)} (${p === null ? 'new' : (d >= 0 ? '+' : '') + R(p, 0) + '%'})`;
}

// GA4 is same-day, but the last day is always partial.
const END = addDays(new Date(), -1);
const W = [
  [addDays(END, -(DAYS - 1)), END],
  [addDays(END, -(DAYS * 2 - 1)), addDays(END, -DAYS)],
];
const YOY = [addDays(addDays(END, -364), -(DAYS - 1)), addDays(END, -364)];
const out = [];
const say = (s = '') => out.push(s);

const HEADLINE = ['totalUsers', 'newUsers', 'sessions', 'screenPageViews', 'engagementRate', 'averageSessionDuration', 'bounceRate'];
const [cur, prev, yoy] = await Promise.all([W[0], W[1], YOY].map(([s, e]) => run({ dateRanges: DATE(s, e), metrics: HEADLINE.map((name) => ({ name })) })));
const mv = (resp, i) => num(resp.rows?.[0]?.metricValues?.[i]?.value);
const pctPt = (resp, i) => R(mv(resp, i) * 100, 1) + '%';

say(`# GA4 audit: ${iso(W[0][0])} to ${iso(W[0][1])}`);
say();
say(`Property ${PROPERTY} (${cfg.domain}). Generated ${iso(new Date())}. Compared to ${iso(W[1][0])} to ${iso(W[1][1])} and YoY ${iso(YOY[0])} to ${iso(YOY[1])}.`);
say();
say('## Headline');
say();
say(table(['Metric', 'Current', 'Prior', 'Change', 'YoY'], [
  ['Users', mv(cur, 0), mv(prev, 0), delta(mv(cur, 0), mv(prev, 0)), mv(yoy, 0)],
  ['New users', mv(cur, 1), mv(prev, 1), delta(mv(cur, 1), mv(prev, 1)), mv(yoy, 1)],
  ['Sessions', mv(cur, 2), mv(prev, 2), delta(mv(cur, 2), mv(prev, 2)), mv(yoy, 2)],
  ['Pageviews', mv(cur, 3), mv(prev, 3), delta(mv(cur, 3), mv(prev, 3)), mv(yoy, 3)],
  ['Engagement rate', pctPt(cur, 4), pctPt(prev, 4), R((mv(cur, 4) - mv(prev, 4)) * 100, 1) + 'pt', pctPt(yoy, 4)],
  ['Avg session (s)', R(mv(cur, 5), 0), R(mv(prev, 5), 0), delta(R(mv(cur, 5), 0), R(mv(prev, 5), 0)), R(mv(yoy, 5), 0)],
  ['Bounce rate', pctPt(cur, 6), pctPt(prev, 6), R((mv(cur, 6) - mv(prev, 6)) * 100, 1) + 'pt', pctPt(yoy, 6)],
]));
say();

// --- measurement health -----------------------------------------------------
say('## Measurement health');
say();
const [events, keyEvents] = await Promise.all([
  run({ dateRanges: DATE(...W[0]), dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }], orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 100 }),
  run({ dateRanges: DATE(...W[0]), dimensions: [{ name: 'eventName' }], metrics: [{ name: 'keyEvents' }], limit: 100 }).catch(() => ({ rows: [] })),
]);
const AUTOMATIC = new Set(['page_view', 'session_start', 'first_visit', 'user_engagement', 'scroll', 'click', 'file_download', 'video_start', 'video_progress', 'video_complete', 'view_search_results', 'form_start', 'form_submit', 'first_open']);
const eventRows = rows(events);
const custom = eventRows.filter((r) => !AUTOMATIC.has(r.dims[0]));
const configuredKey = rows(keyEvents).filter((r) => r.mets[0] > 0);
say(table(['Check', 'Result'], [
  ['Events received', eventRows.length],
  ['Custom events (non-automatic)', custom.length || '**0**'],
  ['Key events (conversions) with hits', configuredKey.length || '**0**'],
]));
say();
if (!custom.length) say('No custom events reach GA4: it can say who arrived and what they viewed, but nothing about what they did (tool runs, affiliate clicks, signups). Send those as GA4 events if you want to join channels to outcomes.\n');
if (!configuredKey.length) say('No key events fired, so GA4 conversion reports are empty by construction. Mark the outcome events (e.g. affiliate_click) as key events in GA4.\n');
{
  const notSet = rows(await run({ dateRanges: DATE(...W[0]), dimensions: [{ name: 'landingPagePlusQueryString' }], metrics: [{ name: 'sessions' }, { name: 'engagementRate' }], dimensionFilter: { filter: { fieldName: 'landingPagePlusQueryString', stringFilter: { value: '(not set)' } } } }))[0];
  const share = (notSet?.mets[0] || 0) / (mv(cur, 2) || 1);
  say(`Sessions with no landing page "(not set)": ${notSet?.mets[0] || 0} (${R(share * 100, 1)}% of sessions).${share > 0.03 ? ' Above 3%: confirm the GA4 tag fires page_view with page_location on first paint.' : ''}`);
  say();
}
say('### Events received');
say();
say(table(['Event', 'Count', 'Users', 'Source'], eventRows.slice(0, 25).map((r) => [r.dims[0], r.mets[0], r.mets[1], AUTOMATIC.has(r.dims[0]) ? 'automatic' : 'custom'])));
say();

// --- acquisition --------------------------------------------------------------
const [channels, sources, organic] = await Promise.all([
  run({ dateRanges: [...DATE(...W[0]), ...DATE(...W[1])], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 20 }),
  run({ dateRanges: DATE(...W[0]), dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }], metrics: [{ name: 'sessions' }, { name: 'engagementRate' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 50 }),
  run({ dateRanges: DATE(...W[0]), dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }], metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 50 }),
]);
say('## Acquisition');
say();
{
  const by = new Map();
  for (const r of channels.rows || []) {
    const name = r.dimensionValues[0].value;
    const rangeName = r.dimensionValues[r.dimensionValues.length - 1].value;
    const e = by.get(name) || { cur: 0, prev: 0, users: 0, eng: 0 };
    if (rangeName === 'date_range_0') Object.assign(e, { cur: num(r.metricValues[0].value), users: num(r.metricValues[1].value), eng: num(r.metricValues[2].value) });
    else e.prev = num(r.metricValues[0].value);
    by.set(name, e);
  }
  const total = [...by.values()].reduce((s, e) => s + e.cur, 0) || 1;
  say(table(['Channel', 'Sessions', 'Share', 'Change', 'Users', 'Engagement'], [...by.entries()].sort((a, b) => b[1].cur - a[1].cur).map(([n, e]) => [n, e.cur, R((e.cur / total) * 100, 1) + '%', delta(e.cur, e.prev), e.users, R(e.eng * 100, 1) + '%'])));
}
say();
say('### Top sources');
say();
say(table(['Source / medium', 'Sessions', 'Engagement'], rows(sources).slice(0, 12).map((r) => [`${r.dims[0]} / ${r.dims[1]}`, r.mets[0], R(r.mets[1] * 100, 1) + '%'])));
say();
say('### Organic engines Search Console cannot see');
say();
{
  const rs = rows(organic).filter((r) => r.dims[1] === 'organic');
  const google = rs.filter((r) => r.dims[0] === 'google').reduce((s, r) => s + r.mets[0], 0);
  const other = rs.filter((r) => r.dims[0] !== 'google');
  const otherTotal = other.reduce((s, r) => s + r.mets[0], 0);
  say(table(['Engine', 'Sessions', 'Engagement', 'Avg time (s)'], other.map((r) => [r.dims[0], r.mets[0], R(r.mets[1] * 100, 1) + '%', R(r.mets[2], 0)])));
  say();
  say(`Google organic ${google}, non-Google organic ${otherTotal} (${R((otherTotal / (google + otherTotal || 1)) * 100, 1)}% of organic).`);
}
say();
say('### AI assistant referrals');
say();
{
  const AI = /chatgpt|openai|perplexity|claude|anthropic|gemini|copilot|you\.com|phind/i;
  const ai = rows(sources).filter((r) => AI.test(r.dims[0]));
  say(ai.length ? table(['Source / medium', 'Sessions', 'Engagement'], ai.map((r) => [`${r.dims[0]} / ${r.dims[1]}`, r.mets[0], R(r.mets[1] * 100, 1) + '%'])) : 'No sessions from known AI assistants in this window.');
}
say();

// --- landing pages --------------------------------------------------------------
const landing = rows(await run({ dateRanges: DATE(...W[0]), dimensions: [{ name: 'landingPagePlusQueryString' }], metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 30 }));
const landRow = (r) => [r.dims[0].split('?')[0], r.mets[0], R(r.mets[1] * 100, 1) + '%', R(r.mets[2] * 100, 1) + '%', R(r.mets[3], 0)];
say('## Landing pages');
say();
say(table(['Landing page', 'Sessions', 'Engagement', 'Bounce', 'Avg time (s)'], landing.slice(0, 25).map(landRow)));
say();
say('### Weakest engagement (>=200 sessions)');
say();
say(table(['Landing page', 'Sessions', 'Engagement', 'Bounce', 'Avg time (s)'], landing.filter((r) => r.mets[0] >= 200).sort((a, b) => a.mets[1] - b.mets[1]).slice(0, 12).map(landRow)));
say();

// --- devices, geo, trend ----------------------------------------------------------
const [devices, countries, monthly] = await Promise.all([
  run({ dateRanges: DATE(...W[0]), dimensions: [{ name: 'deviceCategory' }], metrics: [{ name: 'sessions' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }),
  run({ dateRanges: DATE(...W[0]), dimensions: [{ name: 'country' }], metrics: [{ name: 'sessions' }, { name: 'engagementRate' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 }),
  run({ dateRanges: DATE(addDays(END, -400), END), dimensions: [{ name: 'yearMonth' }], metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'engagementRate' }], orderBys: [{ dimension: { dimensionName: 'yearMonth' } }], limit: 40 }),
]);
say('## Devices and geography');
say();
say(table(['Device', 'Sessions', 'Engagement', 'Avg time (s)'], rows(devices).map((r) => [r.dims[0], r.mets[0], R(r.mets[1] * 100, 1) + '%', R(r.mets[2], 0)])));
say();
say(table(['Country', 'Sessions', 'Engagement'], rows(countries).map((r) => [r.dims[0], r.mets[0], R(r.mets[1] * 100, 1) + '%'])));
say();
say('## Monthly trend');
say();
{
  const rs = rows(monthly);
  const max = Math.max(1, ...rs.map((r) => r.mets[1]));
  say(table(['Month', 'Users', 'Sessions', 'Engagement', ''], rs.map((r) => [`${r.dims[0].slice(0, 4)}-${r.dims[0].slice(4)}`, r.mets[0], r.mets[1], R(r.mets[2] * 100, 1) + '%', '#'.repeat(Math.round((r.mets[1] / max) * 28))])));
}
say();

const OUT = path.resolve(ROOT, values.out ?? `docs/ga4-audits/${iso(END).slice(0, 7)}.md`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n') + '\n');
console.log(out.join('\n'));
console.log(`\nReport written to ${path.relative(ROOT, OUT)}`);
