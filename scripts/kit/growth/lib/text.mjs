// site-kit v0.1.0
// Pure text helpers: tokens, similarity, slugs, dates, ISO weeks. No I/O.

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'my', 'your', 'how', 'do', 'does', 'i', 'is', 'are', 'can', 'what', 'when', 'where', 'by', 'it', 'at', 'from', 'as', 'be', 'vs', 'best', 'guide', 'complete']);

export const slugify = (s) =>
  String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

export const normalize = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Stem-lite tokens: lowercase, drop stopwords and years, strip a trailing "s". */
export function tokens(s) {
  return normalize(s)
    .split(' ')
    .filter((t) => t && !STOP.has(t) && !/^20\d\d$/.test(t))
    .map((t) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t));
}

export function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size && !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Share of A's tokens that appear in B (containment): "is A inside B". */
export function containment(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / A.size;
}

/** Word n-gram shingles of prose, for near-duplicate detection. */
export function shingles(text, n = 5) {
  const w = normalize(text).split(' ').filter(Boolean);
  const out = new Set();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

export function shingleSimilarity(a, b, n = 5) {
  const A = shingles(a, n);
  const B = shingles(b, n);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / Math.min(A.size, B.size);
}

export const wordCount = (text) => String(text).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

export const todayIso = (now = new Date()) => now.toISOString().slice(0, 10);
export const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/** ISO week key like 2026-W41 (Monday-based, UTC). */
export function isoWeek(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - first) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export const asDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null ? undefined : String(v).slice(0, 10));
