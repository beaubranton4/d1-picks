import { ledger } from '@/site/data';

export const revalidate = 3600;

const COLUMNS = [
  'prediction_id', 'match_id', 'match_date', 'start_utc', 'predicted_at_utc', 'away', 'home', 'p_home', 'p_away', 'pick', 'pick_p',
  'fair_home', 'fair_away', 'model', 'ratings_as_of', 'status', 'home_sets', 'away_sets', 'correct', 'brier', 'log_loss', 'source_url',
];

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The full ledger as CSV, straight from the saved JSONL. */
export function GET() {
  const lines = [COLUMNS.join(',')];
  for (const r of [...ledger()].reverse()) {
    const g = r.grade;
    lines.push(
      [
        r.id, r.match_id, r.date, r.start, r.predicted_at, r.away_name, r.home_name, r.p_home, +(1 - r.p_home).toFixed(4),
        r.pick === 'home' ? r.home_name : r.away_name, r.pick_p, r.fair_home, r.fair_away, r.model, r.ratings_as_of,
        g ? g.status : 'pending', g?.home_sets, g?.away_sets, g?.correct, g?.brier, g?.log_loss, r.url,
      ]
        .map(cell)
        .join(','),
    );
  }
  return new Response(lines.join('\n') + '\n', {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="d1picks-volleyball-predictions.csv"',
      'x-robots-tag': 'noindex',
    },
  });
}
