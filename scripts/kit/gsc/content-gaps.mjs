#!/usr/bin/env node
// site-kit v0.1.0
/**
 * Content-gap analysis from 12 months of Search Console data: queries the
 * site already earns impressions for but has no dedicated page serving,
 * clustered, scored by intent, and written up as a brief of what to build.
 *
 * The rule that governs it: never trust query-level average position. A
 * query reports position ~13 when /about and hubs rank 50-99 for it while the
 * money page sits at 5. Every position decision here comes from query+page
 * pairs, taking the best page that clears an impression floor.
 *
 * Site tuning lives in data/seo-taxonomy.json (generic pages, excluded paths,
 * intent tiers, built-thing suggestions). Local inventory comes from the MDX
 * collections: released entries can "cover" a query; unreleased (scheduled)
 * entries are release candidates.
 */
import fs from 'node:fs';
import path from 'node:path';
import { cli, int } from '../lib/cli.mjs';
import { ROOT, classifyIntent, loadConfig, loadTaxonomy, requireField, shortPath } from '../lib/config.mjs';
import { scanCollections } from '../lib/content.mjs';
import { getAccessToken, gscQuery, SCOPES } from '../lib/google.mjs';
import { addDays, iso, round as R, table } from '../lib/md.mjs';

const { values } = cli(
  `
Usage: node scripts/kit/gsc/content-gaps.mjs [--months 12] [--min-impressions 100]
         [--filter "keyword"] [--top 25] [--out PATH] [--json PATH]

  (no --filter)      full-site sweep
  --filter "kw"      topic-scoped sweep (query contains the keyword)

Writes docs/content-briefs/YYYY-MM-DD-<scope>-content-gaps.md.
Key: GSA_KEY_PATH, webmasters.readonly scope.
`,
  { months: { type: 'string' }, 'min-impressions': { type: 'string' }, filter: { type: 'string' }, top: { type: 'string' }, out: { type: 'string' }, json: { type: 'string' } },
);

const cfg = loadConfig();
const tax = loadTaxonomy();
const SITE = requireField(cfg, 'gscProperty', 'e.g. sc-domain:example.com');
const MONTHS = int(values.months, 12);
const MIN_IMPR = int(values['min-impressions'], 100);
const FILTER = values.filter ?? null;
const TOP = int(values.top, 25);
const short = (u) => shortPath(u, cfg);

const isGeneric = (p) => tax.genericPaths.some((re) => re.test(p));
const isExcluded = (p) => tax.excludePaths.some((re) => re.test(p));
const suggestBuild = (text) => tax.builtThings.find((b) => b.re.test(text)) ?? { tool: null, built: 'Needs an original data table, chart, tool or printable (the AI-Overview filter)' };
const INTENT_MULT = { T1: 3.0, T2: 1.5, T3: 0.5, T0: 0 };

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'my', 'your', 'how', 'do', 'i', 'is', 'are',
  'best', 'free', 'vs', 'by', 'what', 'when', 'where', 'can', 'you', ...Array.from({ length: 6 }, (_, i) => String(2024 + i)),
  ...tax.stopwords,
]);
const tokens = (s) => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t && !STOPWORDS.has(t));

// Collapse tool phrasings so a /x-generator page is recognized as the answer
// for "x maker", "x builder", "x app". Only for matching, never for slugs.
const SYN = {
  builder: 'generator', creator: 'generator', maker: 'generator', generate: 'generator',
  calculate: 'calculator', calc: 'calculator', estimator: 'calculator',
  app: 'tool', software: 'tool', program: 'tool', apps: 'tool',
  printable: 'template', pdf: 'template', sheet: 'template', form: 'template', printout: 'template',
};
const matchSet = (s) => {
  const out = new Set();
  for (const t of tokens(s)) {
    out.add(t);
    if (SYN[t]) out.add(SYN[t]);
  }
  return out;
};
function overlap(needle, haystack) {
  const arr = [...needle];
  if (!arr.length) return 0;
  return arr.filter((t) => haystack.has(t)).length / arr.length;
}
/** Dedicated when the query is mostly in the page's tokens or vice versa. */
const covers = (qSet, pageSet) => Math.max(overlap(qSet, pageSet), overlap(pageSet, qSet)) >= 0.6;
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}
function mode(arr) {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  let best = null;
  let n = 0;
  for (const [k, v] of m) if (v > n) [best, n] = [k, v];
  return best;
}
function expectedCtr(pos) {
  const curve = [0, 0.28, 0.15, 0.1, 0.07, 0.053, 0.042, 0.034, 0.028, 0.024, 0.021];
  if (pos <= 10) return curve[Math.max(1, Math.round(pos))];
  return pos <= 20 ? 0.012 : 0.005;
}

// --- local inventory --------------------------------------------------------
const today = iso(new Date());
const entries = scanCollections(cfg).map((e) => ({
  ...e,
  released: !!e.publishDate && e.publishDate <= today,
  // Subject = slug + title only; tags/keywords would let a keyword-stuffed page "cover" everything.
  tokens: matchSet(`${e.slug.replace(/-/g, ' ')} ${e.title}`),
}));
const live = entries.filter((e) => e.released);
const onDeck = entries.filter((e) => !e.released);
const byPath = new Map(live.map((e) => [e.path, e]));

function describePage(p) {
  if (isGeneric(p)) return { kind: 'generic', tokens: matchSet(p.replace(/[/-]/g, ' ')) };
  const e = byPath.get(p);
  if (e) return { kind: 'article', tokens: e.tokens, entry: e };
  return { kind: 'page', tokens: matchSet(p.replace(/[/-]/g, ' ')) };
}
function coveringEntry(qSet, pool) {
  let best = null;
  let bestScore = 0.6;
  for (const e of pool) {
    const s = Math.max(overlap(qSet, e.tokens), overlap(e.tokens, qSet));
    if (s >= bestScore) [best, bestScore] = [e, s];
  }
  return best;
}

// --- pull ---------------------------------------------------------------------
const token = await getAccessToken(SCOPES.gscRead);
const END = addDays(new Date(), -3);
const START = addDays(END, -Math.round(MONTHS * 30.4));
const filterGroups = FILTER ? [{ filters: [{ dimension: 'query', operator: 'contains', expression: FILTER.toLowerCase() }] }] : undefined;
const base = (extra) => ({ startDate: iso(START), endDate: iso(END), rowLimit: 25000, ...(filterGroups ? { dimensionFilterGroups: filterGroups } : {}), ...extra });

const queryAgg = new Map();
for (const r of await gscQuery(token, SITE, base({ dimensions: ['query'] }), { all: true })) {
  queryAgg.set(r.keys[0], { clicks: r.clicks, impressions: r.impressions, position: r.position });
}

// query+page pairs, one month at a time so no pull hits the 100k row ceiling.
const pairAgg = new Map();
let anyCapped = false;
for (let i = MONTHS - 1; i >= 0; i--) {
  const s = addDays(END, -Math.round((i + 1) * 30.4) + 1);
  const e = addDays(END, -Math.round(i * 30.4));
  const rows = await gscQuery(token, SITE, { ...base({ dimensions: ['query', 'page'] }), startDate: iso(s), endDate: iso(e) }, { all: true });
  if (rows.capped) anyCapped = true;
  for (const r of rows) {
    const key = `${r.keys[0]}\t${short(r.keys[1])}`;
    const cur = pairAgg.get(key) || { query: r.keys[0], page: short(r.keys[1]), clicks: 0, impressions: 0, posW: 0 };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    cur.posW += r.position * r.impressions;
    pairAgg.set(key, cur);
  }
}
const pairsByQuery = new Map();
for (const v of pairAgg.values()) {
  v.position = v.impressions ? v.posW / v.impressions : 0;
  pairsByQuery.set(v.query, [...(pairsByQuery.get(v.query) ?? []), v]);
}

// --- per-query analysis -------------------------------------------------------
const analyzed = [];
for (const [query, agg] of queryAgg) {
  const tier = classifyIntent(query, tax);
  if (tier === 'T0') continue;
  const qMatch = matchSet(query);
  const floor = Math.max(10, 0.02 * agg.impressions);
  const eligible = (pairsByQuery.get(query) ?? []).filter((p) => p.impressions >= floor);
  for (const p of eligible) {
    const d = describePage(p.page);
    p.kind = d.kind;
    p.excluded = isExcluded(p.page);
    p.dedicated = d.kind !== 'generic' && !p.excluded && covers(qMatch, d.tokens);
    p.entry = d.entry ?? null;
  }
  const best = [...eligible].sort((a, b) => a.position - b.position)[0] ?? null;
  const ded = eligible.filter((p) => p.dedicated).sort((a, b) => a.position - b.position)[0] ?? null;
  analyzed.push({
    query,
    tier,
    clicks: agg.clicks,
    impressions: agg.impressions,
    bestPage: best?.page ?? null,
    bestPos: best?.position ?? null,
    bestKind: best?.kind ?? null,
    bestExcluded: best?.excluded ?? false,
    dedPage: ded?.page ?? null,
    dedPos: ded?.position ?? null,
    pageClass: ded ? 'dedicated' : best ? (best.kind === 'generic' ? 'generic' : 'offtopic') : 'none',
    deckMatch: coveringEntry(qMatch, onDeck),
    liveMatch: ded?.entry ?? coveringEntry(qMatch, live),
    qTokens: new Set(tokens(query)),
  });
}

// --- cluster: exact token key, then merge clusters sharing a best page (Jaccard >= 0.6)
const byKey = new Map();
for (const a of analyzed) {
  const key = [...a.qTokens].sort().join(' ');
  if (!byKey.has(key)) byKey.set(key, { tokens: new Set(a.qTokens), members: [] });
  byKey.get(key).members.push(a);
}
const initial = [...byKey.values()];
const clusters = [];
const used = new Set();
for (let i = 0; i < initial.length; i++) {
  if (used.has(i)) continue;
  const c = initial[i];
  const page = mode(c.members.map((m) => m.bestPage).filter(Boolean));
  for (let j = i + 1; j < initial.length; j++) {
    if (used.has(j)) continue;
    const d = initial[j];
    if (page && page === mode(d.members.map((m) => m.bestPage).filter(Boolean)) && jaccard(c.tokens, d.tokens) >= 0.6) {
      c.members.push(...d.members);
      for (const t of d.tokens) c.tokens.add(t);
      used.add(j);
    }
  }
  clusters.push(c);
}

function rollup(c) {
  const rep = [...c.members].sort((a, b) => b.impressions - a.impressions)[0];
  const impressions = c.members.reduce((s, m) => s + m.impressions, 0);
  const clicks = c.members.reduce((s, m) => s + m.clicks, 0);
  const bests = c.members.filter((m) => m.bestPos != null);
  const deds = c.members.filter((m) => m.dedPos != null);
  const bestPos = bests.length ? Math.min(...bests.map((m) => m.bestPos)) : null;
  const dedPos = deds.length ? Math.min(...deds.map((m) => m.dedPos)) : null;
  const bestKind = mode(c.members.map((m) => m.bestKind).filter(Boolean));
  const tier = ['T1', 'T2', 'T3'].find((t) => c.members.some((m) => m.tier === t)) || 'T3';
  const band = bestPos == null ? 0.2 : bestPos <= 10 ? 1.0 : bestPos <= 20 ? 0.8 : bestPos <= 30 ? 0.5 : 0.2;
  const headroom = dedPos == null && bestPos != null ? 1.2 : 1.0;
  const missedClicks = Math.max(0, impressions * expectedCtr(bestPos || 40) - clicks);
  const score = missedClicks * band * INTENT_MULT[tier] * headroom;
  const deckMatch = c.members.map((m) => m.deckMatch).find(Boolean) ?? null;
  const liveMatch = c.members.map((m) => m.liveMatch).find(Boolean) ?? null;

  // Coverage is decided by the dedicated page first: a query already served
  // by the right page needs no new content, whatever drafts share its words.
  let bucket;
  if (c.members.some((m) => m.bestExcluded) && dedPos == null) bucket = 'excluded';
  else if (dedPos != null && dedPos <= 10) bucket = 'covered';
  else if (dedPos != null && dedPos <= 30) bucket = 'improve-existing';
  else if (bestKind === 'page' && bestPos != null && bestPos <= 15) bucket = 'improve-existing';
  else if (bestKind === 'article' && bestPos != null && bestPos <= 20) bucket = 'improve-existing';
  else if (deckMatch) bucket = 'release-candidate';
  else if (impressions >= MIN_IMPR && bestPos != null && bestPos >= 4 && bestPos <= 30) bucket = 'write-new';
  else if (bestPos != null && bestPos < 4) bucket = 'covered';
  else bucket = 'thin';

  return { rep: rep.query, tier, members: c.members, impressions, clicks, bestPos, dedPos, bestPage: mode(c.members.map((m) => m.bestPage).filter(Boolean)), dedPage: mode(c.members.map((m) => m.dedPage).filter(Boolean)), pageClass: mode(c.members.map((m) => m.pageClass)), deckMatch, liveMatch, score, bucket, slug: [...rep.qTokens].join('-') };
}
const rolled = clusters.map(rollup);
const byBucket = (b) => rolled.filter((r) => r.bucket === b).sort((a, b2) => b2.score - a.score);

// --- brief --------------------------------------------------------------------
const out = [];
const say = (s = '') => out.push(s);
const pct = (c, i) => (i ? R((c / i) * 100, 2) : 0) + '%';
const scope = FILTER ? `topic "${FILTER}"` : 'full site';
say(`# Content-gap analysis (${scope})`);
say();
say(`Generated ${today} for ${SITE}. Window ${iso(START)} to ${iso(END)} (${MONTHS} months).`);
say();
say('**Method.** Position comes from query+page pairs: the best page clearing an impression floor of max(10, 2% of the query). Query-level average position is never used for a decision. T0 queries are dropped. Intent multipliers: T1 x3, T2 x1.5, T3 x0.5 (tiers in data/seo-taxonomy.json).');
say();
if (anyCapped) say('> WARNING: a monthly window hit the 100k-row ceiling; pair data may be incomplete. Rerun with --filter.\n');
say(`Queries analyzed (non-T0): ${analyzed.length}. Clusters: ${rolled.length}. Pairs pulled: ${pairAgg.size}.`);
say();

say('## Bucket A: release candidates (a scheduled, unreleased entry already covers it)');
say();
say('Consider pulling its publishDate forward, within the weekly cap (/kit-release-plan). Never backdate.');
say();
const relA = byBucket('release-candidate');
say(relA.length ? table(['Entry', 'Scheduled', 'Matched cluster', 'Tier', 'Impr', 'Best pos'], relA.map((r) => [r.deckMatch.file, r.deckMatch.publishDate, r.rep, r.tier, r.impressions, r.bestPos != null ? R(r.bestPos) : 'n/a'])) : '_None._');
say();

say(`## Bucket B: write-new gaps (top ${TOP} by opportunity score)`);
say();
const relB = byBucket('write-new').slice(0, TOP);
if (relB.length) {
  say(table(['#', 'Cluster', 'Tier', 'Score', 'Impr', 'Clicks', 'Best page', 'Best pos', 'Page'], relB.map((r, i) => [i + 1, r.rep, r.tier, R(r.score, 0), r.impressions, r.clicks, r.bestPage || 'none', r.bestPos != null ? R(r.bestPos) : 'n/a', r.pageClass])));
  say();
  for (const r of relB) {
    const sug = suggestBuild(`${r.rep} ${r.members.map((m) => m.query).join(' ')}`);
    say(`### ${r.rep}`);
    say();
    say(`Tier ${r.tier} | score ${R(r.score, 0)} | ${r.impressions} impr / ${r.clicks} clicks | best page ${r.bestPage || 'none'} at ${r.bestPos != null ? R(r.bestPos) : 'n/a'} (${r.pageClass})`);
    say();
    say(`- **Proposed slug:** \`${r.slug}\``);
    say(`- **Built thing:** ${sug.built}${sug.tool ? ` (${sug.tool})` : ''}`);
    if (r.liveMatch) say(`- **Check first:** \`${r.liveMatch.path}\` may already cover this; improve it rather than write a competitor.`);
    say();
    say(table(['Query', 'Impr', 'Clicks', 'CTR', 'Best page', 'Best pos'], [...r.members].sort((a, b) => b.impressions - a.impressions).slice(0, 12).map((m) => [m.query, m.impressions, m.clicks, pct(m.clicks, m.impressions), m.bestPage || 'none', m.bestPos != null ? R(m.bestPos) : 'n/a'])));
    say();
  }
} else say('_None._');
say();

say('## Bucket C: improve-existing (a dedicated page ranks 11-30)');
say();
const relC = byBucket('improve-existing').slice(0, 30);
say(relC.length ? table(['Cluster', 'Tier', 'Impr', 'Page', 'Pos'], relC.map((r) => [r.rep, r.tier, r.impressions, r.dedPage || r.bestPage, R(r.dedPos ?? r.bestPos)])) : '_None._');
say();

say('## Sanity appendix: covered clusters');
say();
const covered = byBucket('covered').sort((a, b) => b.impressions - a.impressions).slice(0, 20);
say(covered.length ? table(['Cluster', 'Impr', 'Ranking page', 'Pos', 'Dedicated?'], covered.map((r) => [r.rep, r.impressions, r.dedPage || r.bestPage, R(r.dedPos ?? r.bestPos), r.dedPos != null ? 'yes' : 'via generic'])) : '_None._');
say();

const slug = FILTER ? FILTER.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'full-site';
const OUT = path.resolve(ROOT, values.out ?? `docs/content-briefs/${today}-${slug}-content-gaps.md`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n') + '\n');
console.log(out.join('\n'));
console.log(`\nBrief written to ${path.relative(ROOT, OUT)}`);
if (values.json) {
  fs.writeFileSync(values.json, JSON.stringify({ window: [iso(START), iso(END)], rolled: rolled.map((r) => ({ ...r, members: r.members.map((m) => m.query), deckMatch: r.deckMatch?.path ?? null, liveMatch: r.liveMatch?.path ?? null })) }, null, 2));
}
