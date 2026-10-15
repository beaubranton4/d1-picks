// site-kit v0.1.0
// Stages 1-3: pick topics (Search Console + DataForSEO), AI-Overview filter,
// cannibalization check. Pure functions over already-fetched data, so every
// rule is unit-testable; the network calls live in lib/dfs.mjs and lib/google.mjs.
import { topicOverlap } from './gates/dupes.mjs';
import { domainMatches, tokens } from './lib/text.mjs';

const toPath = (url, cfg) => {
  try {
    const u = new URL(url, `https://${cfg.site.domain}`);
    return u.pathname.replace(/\/$/, '') || '/';
  } catch {
    return url;
  }
};

/** Skip-list check: returns the reason a keyword is excluded, or null. */
export function skipReason(keyword, cfg) {
  for (const p of cfg.skip.patterns) {
    if (new RegExp(p, 'i').test(keyword)) return cfg.skip.reasons[p] ?? `matches skip pattern /${p}/`;
  }
  if ((cfg.allow?.patterns ?? []).length && !cfg.allow.patterns.some((p) => new RegExp(p, 'i').test(keyword))) return cfg.allow.reasons?.['*'] ?? 'outside the allowed clusters (allow.patterns)';
  if (tokens(keyword).length < 2 || keyword.trim().split(/\s+/).length < 3) return 'fewer than 3 words (too competitive)';
  return null;
}

/** Which cluster does a keyword belong to? Best seed-token overlap. */
export function clusterFor(keyword, cfg) {
  const kt = new Set(tokens(keyword));
  let best = { name: cfg.clusters[0]?.name ?? 'general', score: 0 };
  for (const c of cfg.clusters) {
    const score = Math.max(0, ...c.seeds.map((s) => tokens(s).filter((t) => kt.has(t)).length / Math.max(1, tokens(s).length)));
    if (score > best.score) best = { name: c.name, score };
  }
  return best.name;
}

const INTENT = { informational: 1.2, commercial: 1.5, transactional: 0.8, navigational: 0.3, unknown: 1.0 };
export const score = (c) => (c.volume / 1000) * (1 - (c.kd ?? 30) / 100) * (INTENT[c.intent] ?? 1);

/**
 * Search Console rows [{keys:[query,page],clicks,impressions,position}] ->
 *   striking: queries where one of OUR pages sits in the striking-distance band (refresh/extend, not new pages)
 *   gaps: queries with impressions that no page of ours covers (new-page candidates)
 * Page-level position only: the best page's position, never a blended query average.
 */
export function gscOpportunities(rows, posts, cfg) {
  const ours = new Map(posts.map((p) => [p.path, p]));
  const byQuery = new Map();
  for (const r of rows) {
    const [q, page] = r.keys;
    const path = toPath(page, cfg);
    const list = byQuery.get(q) ?? [];
    list.push({ page: path, clicks: r.clicks, impressions: r.impressions, position: r.position });
    byQuery.set(q, list);
  }
  const [lo, hi] = cfg.measure.strikingPosition;
  const striking = [];
  const gaps = [];
  for (const [q, list] of byQuery) {
    const ourRows = list.filter((x) => ours.has(x.page));
    const impressions = list.reduce((s, x) => s + x.impressions, 0);
    if (impressions < cfg.measure.minImpressionsStriking) continue;
    const best = [...ourRows].sort((a, b) => a.position - b.position)[0];
    if (best && best.position >= lo && best.position <= hi) striking.push({ query: q, page: best.page, position: best.position, impressions: best.impressions, clicks: best.clicks, source: 'gsc-striking' });
    else if (!best || best.position > hi) {
      if (!skipReason(q, cfg)) gaps.push({ keyword: q, impressions, volume: impressions, kd: null, intent: 'unknown', source: 'gsc-gap' });
    }
  }
  striking.sort((a, b) => b.impressions - a.impressions);
  gaps.sort((a, b) => b.impressions - a.impressions);
  return { striking, gaps };
}

/**
 * Merge candidates from every source, drop skips, classify against existing
 * pages. Returns { candidates (new topics, ranked), extend[], skipped[] } where
 * each skipped row records WHY.
 */
export function rankCandidates({ dfs = [], gaps = [], posts, publishedKeywords = [], cfg, recentClusters = [] }) {
  const seen = new Set();
  const skipped = [];
  const extend = [];
  const out = [];
  for (const c of [...gaps.map((g) => ({ ...g, boost: 1.5 })), ...dfs.map((d) => ({ ...d, source: d.source ?? 'dataforseo', boost: 1 }))]) {
    const key = tokens(c.keyword).sort().join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    const sr = skipReason(c.keyword, cfg);
    if (sr) { skipped.push({ keyword: c.keyword, stage: 'skip-list', reason: sr }); continue; }
    const overlap = topicOverlap(c.keyword, posts, cfg, publishedKeywords);
    if (overlap.kind === 'duplicate') { skipped.push({ keyword: c.keyword, stage: 'cannibalization', reason: `duplicates "${overlap.page?.title}" (${overlap.score.toFixed(2)})` }); continue; }
    if (overlap.kind === 'extend') {
      extend.push({ keyword: c.keyword, page: overlap.page?.path, slug: overlap.page?.slug, reason: `overlaps "${overlap.page?.title}" (${overlap.score.toFixed(2)}); extend instead of a competing page`, source: c.source });
      skipped.push({ keyword: c.keyword, stage: 'cannibalization', reason: `overlaps "${overlap.page?.title}"; queued as an extension of that page` });
      continue;
    }
    const cluster = clusterFor(c.keyword, cfg);
    const clusterCfg = cfg.clusters.find((x) => x.name === cluster);
    if (clusterCfg?.favor === false) { skipped.push({ keyword: c.keyword, stage: 'strategy', reason: `cluster "${cluster}" is on the skip side of docs/growth/strategy.md` }); continue; }
    const interleave = recentClusters.includes(cluster) ? 0.6 : 1;
    out.push({ ...c, cluster, score: score(c) * c.boost * interleave * (clusterCfg?.weight ?? 1) });
  }
  out.sort((a, b) => b.score - a.score);
  return { candidates: out, extend, skipped };
}

/**
 * The page "angle": what we can add that an AI Overview cannot replace.
 * tool  -> a registered site tool matches the query
 * data  -> a registered data asset matches
 * facts -> the query asks for policy/spec facts we can cite from fetched pages
 */
export function angleFor(keyword, cfg) {
  const k = keyword.toLowerCase();
  const tool = cfg.content.tools.find((t) => t.keywords.some((w) => k.includes(w.toLowerCase())));
  if (tool) return { type: 'tool', tool: tool.path };
  const data = cfg.content.dataAssets.find((a) => a.keywords.some((w) => k.includes(w.toLowerCase())));
  if (data) return { type: 'data', dataFile: data.file };
  if ((cfg.content.factPatterns ?? []).some((p) => new RegExp(p, 'i').test(k))) return { type: 'facts' };
  return null;
}

/** AI-Overview filter. `serp` comes from parseSerp(). */
export function aioVerdict(candidate, serp, cfg) {
  const found = angleFor(candidate.keyword, cfg);
  const okTypes = cfg.gates.valueTypes ?? ['tool', 'data', 'facts'];
  const angle = found && okTypes.includes(found.type) ? found : null;
  if (!angle && !okTypes.includes('facts')) return { verdict: 'skip', aio: serp.hasAio, answered: false, angle: null, reason: `no registered ${okTypes.join(' or ')} matches this query, and this site only ships pages that carry one` };
  const answered = serp.hasAio && (serp.aioText || '').length >= cfg.gates.minAioChars;
  const presentNoText = serp.hasAio && !serp.aioText;
  if (answered || presentNoText) {
    if (!angle) return { verdict: 'skip', aio: true, answered: true, angle: null, reason: `AI Overview answers it (${(serp.aioText || '').length} chars, cites ${serp.aioRefs.slice(0, 3).join(', ') || 'n/a'}) and we have no tool, data or verified-facts angle to add` };
    return { verdict: 'pass', aio: true, answered: true, angle, reason: `AI Overview present but we add a ${angle.type} it cannot replace` };
  }
  return { verdict: 'pass', aio: serp.hasAio, answered: false, angle: angle ?? { type: 'facts' }, reason: serp.hasAio ? 'AI Overview present but thin' : 'no AI Overview' };
}

/** Source URLs for drafting: SERP organics minus excluded domains, preferred domains first. */
export function sourceUrls(serp, cfg, max = 6) {
  const bad = (cfg.sources?.excludeDomains ?? []).map((d) => d.toLowerCase());
  const prefer = (cfg.sources?.preferDomains ?? []).map((d) => d.toLowerCase());
  const only = (cfg.sources?.requireDomains ?? []).map((d) => d.toLowerCase());
  const rows = serp.organic.filter((o) => o.url && !bad.some((d) => (o.domain ?? '').toLowerCase().endsWith(d)) && (!only.length || only.some((d) => domainMatches(o.domain, d))));
  const rank = (o) => (prefer.some((d) => (o.domain ?? '').toLowerCase().endsWith(d)) ? 0 : 1);
  return rows.sort((a, b) => rank(a) - rank(b) || a.rank - b.rank).slice(0, max).map((o) => o.url);
}
