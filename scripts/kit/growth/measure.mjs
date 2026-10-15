// site-kit v0.1.0
// Stage 7: measure loop-published pages at 14/28/60 days and decide.
import { decide, dueCheckpoints } from './decide.mjs';
import { addDays, daysBetween } from './lib/text.mjs';
import { pageUrl } from './lib/config.mjs';

/**
 * @returns {{decisions:[], updated:{[slug]:record}, rows:[]}}
 */
export async function measurePages({ cfg, state, google, today, queryPageRows = [] }) {
  const decisions = [];
  const rows = [];
  const updated = {};
  for (const rec of Object.values(state.pages)) {
    if (rec.publishDate > today) continue;
    const due = dueCheckpoints(rec, today, cfg);
    const url = pageUrl(cfg, rec.path);
    const age = daysBetween(rec.publishDate, today);
    // Always fetch current numbers for the report; record a checkpoint when one is due.
    const end = addDays(today, -2); // Search Console lags ~2 days
    let metrics;
    let ins = { indexed: null, verdict: 'UNKNOWN', coverageState: '' };
    let ga4 = null;
    try {
      metrics = await google.pageTotals(url, rec.publishDate, end);
      if (due.length || age >= 30) ins = await google.inspect(url);
      ga4 = await google.ga4Landing(rec.path, rec.publishDate, today);
    } catch (e) {
      rows.push({ slug: rec.slug, age, error: e.message });
      continue;
    }
    // Same-query rivals among OUR pages (cannibalization after the fact).
    const myQueries = queryPageRows.filter((r) => new URL(r.keys[1], url).pathname === rec.path).map((r) => r.keys[0]);
    const rivalMap = new Map();
    for (const r of queryPageRows) {
      const p = new URL(r.keys[1], url).pathname;
      if (p === rec.path || !myQueries.includes(r.keys[0])) continue;
      if (!Object.values(state.pages).some((x) => x.path === p) && !p) continue;
      const cur = rivalMap.get(p) ?? { page: p, clicks: 0, impressions: 0 };
      cur.clicks += r.clicks;
      cur.impressions += r.impressions;
      rivalMap.set(p, cur);
    }
    const d = decide({ record: rec, today, metrics, indexed: ins.indexed, rivals: [...rivalMap.values()] }, cfg);
    rows.push({ slug: rec.slug, path: rec.path, age, ...metrics, indexed: ins.indexed, ga4, decision: d });
    if (due.length) {
      const next = { ...rec, measurements: [...(rec.measurements ?? []), ...due.map((c) => ({ checkpoint: c, at: today, clicks: metrics.clicks, impressions: metrics.impressions, position: metrics.position, indexed: ins.indexed, coverage: ins.coverageState, ga4, decision: d.action }))] };
      updated[rec.slug] = next;
      decisions.push({ slug: rec.slug, path: rec.path, checkpoint: due[due.length - 1], at: today, ...d });
    } else {
      // keep the latest indexing read for the brakes even between checkpoints
      if (ins.indexed !== null) updated[rec.slug] = { ...rec, measurements: [...(rec.measurements ?? []), { checkpoint: null, at: today, indexed: ins.indexed, clicks: metrics.clicks, impressions: metrics.impressions, position: metrics.position }] };
    }
  }
  return { decisions, updated, rows };
}
