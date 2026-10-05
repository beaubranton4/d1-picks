/** Display formatting. Mirrors pipeline/fmt.py so prose and tables agree. */

const ET = 'America/New_York';

export const pct = (p: number, places = 1) => `${(p * 100).toFixed(places)}%`;
export const signed = (x: number, places = 2) => `${x >= 0 ? '+' : '-'}${Math.abs(x).toFixed(places)}`;
export const american = (n: number) => (n > 0 ? `+${n}` : String(n));

export function ordinal(n: number): string {
  const mod100 = n % 100;
  const suffix = mod100 >= 10 && mod100 <= 20 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

const MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Oct. 6" from YYYY-MM-DD (a calendar date, no time zone math). */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Tuesday, Oct. 6" from YYYY-MM-DD. */
export function dayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[dow]}, ${MONTHS[m - 1]} ${d}`;
}

/** "7:00 p.m. ET" from an ISO instant. */
export function etTime(isoInstant: string | null, known = true): string {
  if (!isoInstant || !known) return 'Time TBA';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(new Date(isoInstant));
  const h = parts.find((p) => p.type === 'hour')?.value;
  const m = parts.find((p) => p.type === 'minute')?.value;
  const ap = parts.find((p) => p.type === 'dayPeriod')?.value?.toLowerCase() === 'am' ? 'a.m.' : 'p.m.';
  return `${h}:${m} ${ap} ET`;
}

/** "Oct. 4, 8:38 p.m. ET" from an ISO instant. */
export function etStamp(isoInstant: string): string {
  const d = new Date(isoInstant);
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return `${shortDate(date)}, ${etTime(isoInstant)}`;
}

/** Today's date in Eastern time, YYYY-MM-DD. */
export function etToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export const setScore = (key: string) => `3-${key.slice(-1)}`;
