// site-kit v0.1.0
/**
 * Content inventory for scripts: MDX collections (site.config.json
 * `collections`) and content/release-schedule.json. Mirrors src/kit/content.ts
 * and src/kit/release.ts (scripts cannot import TypeScript app code).
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { ROOT } from './config.mjs';

const asDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? undefined : String(v));

/** Same rule as src/kit/release.ts: a bare date is 00:00 UTC; datetimes must carry Z or an offset. */
export function releaseTime(date) {
  const s = String(date);
  if (s.length === 10) return Date.parse(`${s}T00:00:00Z`);
  return /(Z|[+-]\d{2}:?\d{2})$/.test(s) ? Date.parse(s) : NaN;
}

/** Every MDX entry across collections, with parsed frontmatter. */
export function scanCollections(cfg) {
  const out = [];
  for (const [name, c] of Object.entries(cfg.collections ?? {})) {
    const dir = path.join(ROOT, c.dir);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => /\.mdx?$/.test(x)).sort()) {
      const file = path.join(dir, f);
      const raw = fs.readFileSync(file, 'utf8');
      let data = {};
      let body = raw;
      let parseError = null;
      try {
        ({ data, content: body } = matter(raw));
      } catch (e) {
        parseError = e.message;
      }
      const slug = f.replace(/\.mdx?$/, '');
      out.push({
        collection: name,
        file: path.relative(ROOT, file),
        slug,
        path: `${c.basePath.replace(/\/$/, '')}/${slug}`,
        data,
        body,
        raw,
        parseError,
        publishDate: asDate(data.publishDate),
        updatedDate: asDate(data.updatedDate),
        title: data.title ?? slug,
      });
    }
  }
  return out;
}

export function loadSchedule() {
  const file = path.join(ROOT, 'content/release-schedule.json');
  if (!fs.existsSync(file)) return {};
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Object.fromEntries(Object.entries(j).filter(([k]) => !k.startsWith('$')));
}

/** Every gated page with its release date: [{ path, date, kind, file }]. */
export function releaseItems(cfg) {
  const items = [];
  for (const e of scanCollections(cfg)) {
    if (e.publishDate) items.push({ path: e.path, date: e.publishDate, kind: 'mdx', title: e.title, collection: e.collection, file: e.file });
  }
  for (const [p, date] of Object.entries(loadSchedule())) {
    items.push({ path: p.length > 1 ? p.replace(/\/$/, '') : p, date, kind: 'schedule', title: p, file: 'content/release-schedule.json' });
  }
  return items;
}

/** Paths that are not released at `now` (latest date per path wins). */
export function unreleasedPaths(cfg, now = new Date()) {
  const latest = new Map();
  for (const it of releaseItems(cfg)) {
    const t = releaseTime(it.date);
    if (!latest.has(it.path) || t > latest.get(it.path)) latest.set(it.path, t);
  }
  return [...latest.entries()].filter(([, t]) => t > now.getTime()).map(([p]) => p);
}

/** ISO week key (YYYY-Www) for a YYYY-MM-DD date, UTC. */
export function isoWeek(date) {
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 864e5 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Is a path exempt from the weekly editorial cap (verified directory pages)? */
export function isCadenceExempt(p, cfg) {
  return (cfg.releaseCadence?.exemptPaths ?? []).some((s) => new RegExp(s).test(p));
}
