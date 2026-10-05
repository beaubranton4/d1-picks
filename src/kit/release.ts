// site-kit v0.1.0
/**
 * Release gating: a page exists in production only once its date passes.
 *
 * Two inputs, one rule:
 *   - content/release-schedule.json   path -> date, for non-MDX pages
 *   - MDX frontmatter publishDate     for collection entries
 * A page carrying both is released when the LATER date passes.
 *
 * Production: unreleased pages 404 (assertReleased), drop out of the sitemap,
 * hubs, related links and llms.txt (releasedOnly / link index). This closes
 * the direct-URL leak where a listing filter hid a post but its URL still
 * rendered.
 * Dev and preview: everything renders, and preview is noindexed (robots.ts and
 * buildMetadata), so drafts can be reviewed without being crawled.
 *
 * Pages export `revalidate = 3600`, so a scheduled page appears within an hour
 * of its date with no deploy. Dates are UTC: "2026-10-06" releases at
 * 2026-10-06T00:00:00Z. Never backdate: a release date is a promise about when
 * the page went live, and Article datePublished is read from it.
 */
import { notFound } from 'next/navigation';
import scheduleJson from '../../content/release-schedule.json';
import { normalizePath } from './config';
import { publishDateForPath } from './content';
import { isProduction } from './env';

// A datetime must carry its timezone (Z or +hh:mm); a bare date is midnight UTC.
const DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2}))?$/;

/** Milliseconds for an ISO date; date-only values are midnight UTC. Throws on garbage. */
export function releaseTime(date: string): number {
  if (!DATE_RE.test(date)) throw new Error(`[site-kit] invalid release date "${date}" (use YYYY-MM-DD, or a datetime with Z/offset)`);
  const t = Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date);
  if (Number.isNaN(t)) throw new Error(`[site-kit] invalid release date "${date}"`);
  return t;
}

const isDateLike = (s: string) => /^\d{4}-\d{2}-\d{2}/.test(s);

export type Releasable = { path?: string; publishDate?: string };

export type ReleaseSources = {
  /** path -> ISO date */
  schedule: Record<string, string>;
  /** publishDate lookup for content entries */
  contentDate: (path: string) => string | undefined;
  /** defaults to the real environment; tests pin it */
  production?: () => boolean;
};

export function createRelease(sources: ReleaseSources) {
  const schedule = new Map<string, string>();
  for (const [p, d] of Object.entries(sources.schedule)) {
    if (p.startsWith('$')) continue; // "$comment"
    if (!p.startsWith('/')) throw new Error(`[site-kit] release-schedule.json key "${p}" must be a path starting with /`);
    releaseTime(d); // validate eagerly
    schedule.set(normalizePath(p), d);
  }
  const production = sources.production ?? isProduction;

  /** The date a path goes live, or undefined when it is not gated. */
  function releaseDateFor(path: string): string | undefined {
    const p = normalizePath(path);
    const dates = [schedule.get(p), sources.contentDate(p)].filter((d): d is string => !!d);
    if (!dates.length) return undefined;
    return dates.reduce((a, b) => (releaseTime(a) >= releaseTime(b) ? a : b));
  }

  /** Pure date logic, ignores the environment. Ungated paths are released. */
  function isReleasedAt(pathOrDate: string, now: Date = new Date()): boolean {
    const date = isDateLike(pathOrDate) ? pathOrDate : releaseDateFor(pathOrDate);
    if (!date) return true;
    return releaseTime(date) <= now.getTime();
  }

  /** Environment-aware: everything is released outside production. */
  function isReleased(pathOrDate: string, now: Date = new Date()): boolean {
    if (!production()) return true;
    return isReleasedAt(pathOrDate, now);
  }

  /** Call at the top of a page (and its generateMetadata) for any gated route. */
  function assertReleased(path: string, now: Date = new Date()): void {
    if (!isReleased(path, now)) notFound();
  }

  /** Keep items whose own publishDate AND scheduled path date have passed. */
  function releasedOnly<T extends Releasable>(items: T[], now: Date = new Date()): T[] {
    if (!production()) return items;
    return items.filter(
      (it) =>
        (!it.publishDate || isReleasedAt(it.publishDate, now)) && (!it.path || isReleasedAt(it.path, now)),
    );
  }

  return { releaseDateFor, isReleasedAt, isReleased, assertReleased, releasedOnly };
}

const release = createRelease({
  schedule: scheduleJson as Record<string, string>,
  contentDate: publishDateForPath,
});

export const { releaseDateFor, isReleasedAt, isReleased, assertReleased, releasedOnly } = release;
