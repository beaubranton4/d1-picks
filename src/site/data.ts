/**
 * Reads the pipeline's saved output (data/<sport>/) for the pages.
 *
 * Nothing here computes a prediction: every number a page shows is a value
 * the Python pipeline saved, or a count/average over those saved values
 * (the record on /results). Server only. Cached per process in production.
 */
import fs from 'node:fs';
import path from 'node:path';

export type Team = {
  id: string;
  name: string;
  conference: string;
  conference_name: string;
  rank: number;
  prev_rank: number | null;
  rating: number;
  set_win_vs_avg: number;
  match_win_vs_avg: number;
  d1_matches: number;
  wins: number;
  losses: number;
  sets_won: number;
  sets_lost: number;
  last5: string;
  sos: number | null;
  sos_rank: number | null;
  avca_rank: number | null;
};

export type Snapshot = {
  sport: string;
  season: number;
  model: string;
  model_name: string;
  as_of: string;
  generated_at: string;
  source: { name: string; page: string; feed: string; poll: string; poll_page: string };
  params: {
    home_logit: number;
    prior_precision: number;
    home_prior_precision: number;
    calibration_scale: number;
    matches_used: number;
    teams: number;
    results_through: string;
  };
  home_edge: { set_win_even: number; match_win_even: number };
  teams: Team[];
};

export type SetKey = 'home_3_0' | 'home_3_1' | 'home_3_2' | 'away_3_0' | 'away_3_1' | 'away_3_2';

export type Prediction = {
  id: string;
  match_id: string;
  date: string;
  start: string | null;
  start_known: boolean;
  predicted_at: string;
  home: string;
  away: string;
  home_name: string;
  away_name: string;
  p_home: number;
  sets: Record<SetKey, number>;
  pick: 'home' | 'away';
  pick_p: number;
  fair_home: number;
  fair_away: number;
  model: string;
  ratings_as_of: string;
  home_rank: number;
  away_rank: number;
  home_avca: number | null;
  away_avca: number | null;
  url: string;
};

export type Grade = {
  prediction_id: string;
  match_id: string;
  graded_at: string;
  url: string;
  status: 'graded' | 'void';
  reason?: string;
  home_sets?: number;
  away_sets?: number;
  winner?: 'home' | 'away';
  correct?: boolean;
  p_winner?: number;
  brier?: number;
  log_loss?: number;
  p_set_score?: number;
};

export type Backtest = {
  label: string;
  model: string;
  generated_at: string;
  min_median_matches: number;
  prior_precision: number;
  first_day: string;
  last_day: string;
  result: {
    matches: number;
    favorites_won: number;
    accuracy: number;
    brier: number;
    log_loss: number;
    home_team_won: number;
    calibration: { bucket: string; matches: number; avg_predicted: number; favorite_won: number }[];
  };
  uncalibrated: { matches: number; accuracy: number; brier: number; log_loss: number };
  calibration_scale: number;
  calibration_rows: number;
  prior_precision_grid: { prior_precision: number; matches: number; log_loss: number; brier: number; accuracy: number }[];
};

export type Contest = {
  id: string;
  date: string;
  start: string | null;
  state: string;
  home: string;
  away: string;
  home_sets: number | null;
  away_sets: number | null;
  d1: boolean;
  url: string;
};

export type GameSelection = { slug: string; match_id: string; prediction_id: string; selected_on: string; selected_at: string; reasons: string[] };

type RecentRow = { date: string; opponent: string; opponent_name: string; home: boolean; won: boolean; sets_for: number; sets_against: number; url: string };
type FactsTeam = Pick<Team, 'id' | 'name' | 'conference_name' | 'rank' | 'rating' | 'match_win_vs_avg' | 'wins' | 'losses' | 'sets_won' | 'sets_lost' | 'last5' | 'sos_rank' | 'avca_rank' | 'd1_matches'> & {
  recent: RecentRow[];
};

export type GameFacts = {
  slug: string;
  match_id: string;
  prediction_id: string;
  predicted_at: string;
  date: string;
  start: string | null;
  start_known: boolean;
  url: string;
  selected_on: string;
  reasons: string[];
  model: string;
  ratings_as_of: string;
  n_teams: number;
  home: FactsTeam;
  away: FactsTeam;
  p_home: number;
  sets: Record<SetKey, number>;
  fair_home: number;
  fair_away: number;
  p_home_neutral: number;
  h2h: { date: string; home: string; away: string; home_name: string; away_name: string; home_sets: number; away_sets: number; url: string }[];
};

type Manifest = {
  sport: string;
  season: number;
  model: string;
  updated_at: string;
  results: string;
  ratings: string;
  backtest: string;
  predictions: string[];
  grades: string[];
  game_pages: string;
};

const DATA = path.join(process.cwd(), 'data');
const cache = new Map<string, unknown>();

function memo<T>(key: string, load: () => T): T {
  if (process.env.NODE_ENV === 'production' && cache.has(key)) return cache.get(key) as T;
  const v = load();
  cache.set(key, v);
  return v;
}

function readJson<T>(rel: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA, rel), 'utf8')) as T;
}

function readJsonl<T>(rel: string): T[] {
  return fs
    .readFileSync(path.join(DATA, rel), 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as T);
}

export function hasSport(sport: string): boolean {
  return fs.existsSync(path.join(DATA, sport, 'manifest.json'));
}

export const manifest = (sport = 'volleyball') => memo(`m:${sport}`, () => readJson<Manifest>(`${sport}/manifest.json`));
export const ratings = (sport = 'volleyball') => memo(`r:${sport}`, () => readJson<Snapshot>(`${sport}/${manifest(sport).ratings}`));
export const backtest = (sport = 'volleyball') => memo(`b:${sport}`, () => readJson<Backtest>(`${sport}/${manifest(sport).backtest}`));
export const predictions = (sport = 'volleyball') =>
  memo(`p:${sport}`, () => manifest(sport).predictions.flatMap((f) => readJsonl<Prediction>(`${sport}/${f}`)));
export const grades = (sport = 'volleyball') => memo(`g:${sport}`, () => manifest(sport).grades.flatMap((f) => readJsonl<Grade>(`${sport}/${f}`)));
export const gameSelections = (sport = 'volleyball') =>
  memo(`s:${sport}`, () => (fs.existsSync(path.join(DATA, sport, 'game-pages.json')) ? readJson<GameSelection[]>(`${sport}/game-pages.json`) : []));
export const contests = (sport = 'volleyball') =>
  memo(`c:${sport}`, () => readJson<{ contests: Contest[]; teams: Record<string, { name: string }> }>(`${sport}/${manifest(sport).results}`));

export function gameFacts(slug: string, sport = 'volleyball'): GameFacts | undefined {
  const rel = `${sport}/games/${slug}.json`;
  if (!fs.existsSync(path.join(DATA, rel))) return undefined;
  return memo(`f:${rel}`, () => readJson<GameFacts>(rel));
}

/** The moment a prediction had to be logged by: first serve, or local midnight when no time is published. */
export function deadline(p: Pick<Prediction, 'start' | 'start_known' | 'date'>): number {
  if (p.start_known && p.start) return Date.parse(p.start);
  // Midnight Eastern on the match date, with that night's real UTC offset.
  const probe = new Date(`${p.date}T05:00:00Z`);
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' })
    .formatToParts(probe)
    .find((x) => x.type === 'timeZoneName')?.value; // "GMT-4"
  const hours = Number((name ?? 'GMT-5').replace('GMT', '')) || -5;
  return Date.parse(`${p.date}T00:00:00Z`) - hours * 3600_000;
}

export type LedgerRow = Prediction & { grade?: Grade; gamePath?: string };

export function ledger(sport = 'volleyball'): LedgerRow[] {
  const byPred = new Map(grades(sport).map((g) => [g.prediction_id, g]));
  const pages = new Map(gameSelections(sport).map((s) => [s.prediction_id, `/${sport}/predictions/${s.slug}`]));
  return predictions(sport)
    .map((p) => ({ ...p, grade: byPred.get(p.id), gamePath: pages.get(p.id) }))
    .sort((a, b) => (b.start ?? b.date).localeCompare(a.start ?? a.date) || a.id.localeCompare(b.id));
}

export function teamName(id: string, sport = 'volleyball'): string {
  return contests(sport).teams[id]?.name ?? id;
}

export type RecordSummary = {
  logged: number;
  graded: number;
  pending: number;
  void: number;
  wins: number;
  losses: number;
  brier: number | null;
  logLoss: number | null;
  firstLogged: string | null;
  calibration: { bucket: string; matches: number; avgPredicted: number; favoriteWon: number }[];
};

const BUCKETS: [number, number, string][] = [
  [0.5, 0.6, '50-60'],
  [0.6, 0.7, '60-70'],
  [0.7, 0.8, '70-80'],
  [0.8, 0.9, '80-90'],
  [0.9, 1.0001, '90-100'],
];

/** The live record: counts and averages over the graded ledger. No other inputs. */
export function recordSummary(sport = 'volleyball'): RecordSummary {
  const rows = ledger(sport);
  const graded = rows.filter((r) => r.grade?.status === 'graded');
  const wins = graded.filter((r) => r.grade!.correct).length;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  return {
    logged: rows.length,
    graded: graded.length,
    pending: rows.filter((r) => !r.grade).length,
    void: rows.filter((r) => r.grade?.status === 'void').length,
    wins,
    losses: graded.length - wins,
    brier: avg(graded.map((r) => r.grade!.brier!)),
    logLoss: avg(graded.map((r) => r.grade!.log_loss!)),
    firstLogged: rows.length ? rows.map((r) => r.predicted_at).sort()[0] : null,
    calibration: BUCKETS.map(([lo, hi, bucket]) => {
      const b = graded.filter((r) => r.pick_p >= lo && r.pick_p < hi);
      return {
        bucket,
        matches: b.length,
        avgPredicted: avg(b.map((r) => r.pick_p)) ?? 0,
        favoriteWon: b.length ? b.filter((r) => r.grade!.correct).length / b.length : 0,
      };
    }).filter((b) => b.matches > 0),
  };
}
