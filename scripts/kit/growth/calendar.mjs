// site-kit v0.1.0
// Release calendar: <= weeklyPages editorial pages per ISO week, spread over the
// configured weekdays, never backdated, clusters interleaved.
import { addDays, isoWeek, todayIso } from './lib/text.mjs';

const isoWeekday = (iso) => ((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7) + 1; // 1=Mon..7=Sun

/**
 * @param {{release:string, cluster?:string}[]} scheduled  every page that has a release date (existing + queued)
 * @returns ISO date or null when the horizon is full
 */
export function nextReleaseDate({ scheduled, cfg, cluster, today = todayIso() }) {
  const start = addDays(today, cfg.caps.minLeadDays);
  const cap = cfg.caps.weeklyPages;
  const days = new Set(scheduled.map((s) => s.release));
  for (let i = 0; i <= cfg.release.maxHorizonDays; i++) {
    const d = addDays(start, i);
    if (d < start) continue;
    if (!cfg.release.weekdays.includes(isoWeekday(d))) continue;
    if (days.has(d)) continue;
    const week = isoWeek(d);
    const inWeek = scheduled.filter((s) => s.release && isoWeek(s.release) === week);
    if (inWeek.length >= cap) continue;
    if (cluster && inWeek.some((s) => s.cluster && s.cluster === cluster)) continue; // interleave clusters within a week
    // spread: no page the day before or after in the same week when the week already has one
    if (inWeek.length && inWeek.some((s) => Math.abs((Date.parse(s.release) - Date.parse(d)) / 86400000) < 2)) continue;
    return d;
  }
  return null;
}

export const weekLoad = (scheduled, week) => scheduled.filter((s) => s.release && isoWeek(s.release) === week).length;
