// site-kit v0.1.0
// Stage 7 decisions. Pure: metrics in, one decision out, with the reason.
import { daysBetween } from './lib/text.mjs';

/**
 * @param {object} p  {record, today, metrics:{clicks,impressions,position}, indexed:boolean|null, rivals:[{page,clicks,impressions}]}
 * @returns {{action:'wait'|'watch'|'expand'|'refresh'|'merge'|'investigate-indexing'|'prune', reason:string, checkpoint:number|null}}
 */
export function decide({ record, today, metrics, indexed, rivals = [] }, cfg) {
  const age = daysBetween(record.publishDate, today);
  const cps = cfg.measure.checkpoints;
  const due = [...cps].reverse().find((c) => age >= c) ?? null;
  if (due == null) return { action: 'wait', reason: `${age}d since release; first checkpoint at ${cps[0]}d`, checkpoint: null, age };
  const m = metrics ?? { clicks: 0, impressions: 0, position: null };
  const [lo, hi] = cfg.measure.strikingPosition;
  const strongerRival = rivals.find((r) => r.impressions > m.impressions * 1.5 && r.clicks >= m.clicks);
  const base = { checkpoint: due, age };

  if (strongerRival && m.impressions > 0) {
    return { ...base, action: 'merge', reason: `${strongerRival.page} already earns more of the same queries (${strongerRival.impressions} vs ${m.impressions} impressions); fold this page into it and 301` };
  }
  if (indexed === false && age >= 28) {
    if (age >= cfg.measure.pruneAfterDays && m.impressions === 0) return { ...base, action: 'prune', reason: `not indexed and no impressions after ${age} days; noindex and drop from the sitemap` };
    return { ...base, action: 'investigate-indexing', reason: `not indexed ${age} days after release; check internal links and sitemap, request indexing` };
  }
  if (age >= cfg.measure.pruneAfterDays && m.impressions < cfg.measure.tractionImpressions && m.clicks === 0) {
    return { ...base, action: 'prune', reason: `no traction at ${age} days (${m.impressions} impressions, 0 clicks); noindex and prune` };
  }
  if (m.position != null && m.position <= 10 && m.clicks > 0) return { ...base, action: 'expand', reason: `ranking at position ${m.position.toFixed(1)} with ${m.clicks} clicks; add depth and related sections to widen the queries it wins` };
  if (m.position != null && m.position >= lo && m.position <= hi && m.impressions >= cfg.measure.minImpressionsStriking) {
    return { ...base, action: 'refresh', reason: `striking distance (position ${m.position.toFixed(1)}, ${m.impressions} impressions); rewrite the title and intro for the top query and extend thin sections` };
  }
  return { ...base, action: 'watch', reason: `${m.impressions} impressions, ${m.clicks} clicks, position ${m.position?.toFixed(1) ?? 'n/a'} at ${age} days; no action yet` };
}

/** Which checkpoints (14/28/60) have been reached but not recorded for this page? */
export function dueCheckpoints(record, today, cfg) {
  const age = daysBetween(record.publishDate, today);
  const done = new Set((record.measurements ?? []).map((m) => m.checkpoint));
  return cfg.measure.checkpoints.filter((c) => age >= c && !done.has(c));
}
