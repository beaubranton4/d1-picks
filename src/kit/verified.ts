// site-kit v0.1.0
/**
 * The no-fabrication rule, made structural: every directory listing must say
 * where it came from (source_url) and when a human last checked it
 * (verified_at). A listing without both fails the build.
 */
export type Verified = { source_url: string; verified_at: string };

export function requireVerified<T extends Partial<Verified>>(
  items: T[],
  label: string,
  opts: { maxAgeDays?: number; now?: Date } = {},
): (T & Verified)[] {
  const now = opts.now ?? new Date();
  const today = now.toISOString().slice(0, 10);
  items.forEach((item, i) => {
    const where = `[site-kit] ${label}[${i}]`;
    if (!item.source_url || !/^https?:\/\//.test(item.source_url)) {
      throw new Error(`${where}: source_url (an http(s) URL you checked) is required`);
    }
    if (!item.verified_at || !/^\d{4}-\d{2}-\d{2}$/.test(item.verified_at)) {
      throw new Error(`${where}: verified_at (YYYY-MM-DD) is required`);
    }
    if (item.verified_at > today) throw new Error(`${where}: verified_at ${item.verified_at} is in the future`);
    if (opts.maxAgeDays) {
      const age = (now.getTime() - Date.parse(`${item.verified_at}T00:00:00Z`)) / 864e5;
      if (age > opts.maxAgeDays) {
        console.warn(`${where}: verified_at ${item.verified_at} is ${Math.floor(age)} days old; re-verify it`);
      }
    }
  });
  return items as (T & Verified)[];
}
