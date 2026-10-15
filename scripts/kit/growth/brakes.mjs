// site-kit v0.1.0
// Stage 8: safety brakes. Any tripped brake halts the run (the measurement and
// report steps still run, so the cause is visible).
import fs from 'node:fs';
import { abs } from './lib/config.mjs';
import { addDays, daysBetween, isoWeek } from './lib/text.mjs';

/**
 * @returns {{halt:boolean, reasons:string[], info:object}}
 * Manual actions are NOT exposed by the Search Console API. The brake reads a
 * flag file or env var; keep Search Console email alerts on and touch the flag.
 */
export async function evaluateBrakes({ cfg, state, google, today, env = process.env, posts = [] }) {
  const reasons = [];
  const info = {};
  if (!cfg.enabled) reasons.push('kill switch: growth.enabled is false in growth.config.json');
  if (fs.existsSync(abs(cfg.paths.dir, 'PAUSED'))) reasons.push(`paused by file ${cfg.paths.dir}/PAUSED`);
  if (state.paused) reasons.push(`auto-paused on ${state.paused.at}: ${state.paused.reason} (clear with: node run.mjs --resume)`);
  if (env.GROWTH_MANUAL_ACTION === '1' || fs.existsSync(abs(cfg.paths.dir, 'manual-action.flag'))) reasons.push('manual action flagged (Search Console manual action present)');

  // Weekly hard cap, counted by release week over every page on the site.
  const wk = isoWeek(today);
  const thisWeek = posts.filter((p) => p.release && isoWeek(p.release) === wk).length;
  info.pagesThisWeek = thisWeek;

  // Indexing: of loop pages at least 30 days past release, under half indexed => pause.
  const aged = Object.values(state.pages).filter((p) => daysBetween(p.publishDate, today) >= 30);
  const inspected = aged.map((p) => [...(p.measurements ?? [])].reverse().find((m) => m.indexed !== null && m.indexed !== undefined)).filter(Boolean);
  if (inspected.length >= cfg.brakes.minPagesForIndexCheck) {
    const share = inspected.filter((m) => m.indexed).length / inspected.length;
    info.indexedShare30d = +share.toFixed(2);
    if (share < cfg.brakes.minIndexedShareAt30d) reasons.push(`only ${(share * 100).toFixed(0)}% of ${inspected.length} pages older than 30 days are indexed (floor ${(cfg.brakes.minIndexedShareAt30d * 100).toFixed(0)}%)`);
  }

  // Impressions: last 14 days vs the 14 before, site-wide.
  if (google) {
    try {
      const end = addDays(today, -3);
      const a = await google.siteTotals(addDays(end, -13), end);
      const b = await google.siteTotals(addDays(end, -27), addDays(end, -14));
      info.impressions = { last14: a.impressions, prev14: b.impressions };
      if (b.impressions >= 200 && a.impressions < b.impressions * (1 - cfg.brakes.impressionDropPct / 100)) {
        reasons.push(`site impressions fell ${(100 - (a.impressions / b.impressions) * 100).toFixed(0)}% (${b.impressions} to ${a.impressions}; limit ${cfg.brakes.impressionDropPct}%)`);
      }
    } catch (e) {
      info.impressionsError = e.message;
    }
  }
  return { halt: reasons.length > 0, reasons, info };
}
