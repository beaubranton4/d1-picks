/**
 * Pure simulation and ranking math for the tournament, RPI, conference and
 * matchup pages. No file access, so the same code runs on the server (the
 * first render, the CSV downloads) and in the browser (the two calculators).
 *
 * Nothing here changes the model: match probabilities reproduce
 * pipeline/model.py `predict()` from two saved ratings, the saved home-court
 * term and the saved calibration scale (src/site/sim.test.ts checks this
 * against every prediction in the ledger). Everything else is counting over
 * seeded random draws, so a page's numbers can be regenerated exactly.
 */

export type SimTeam = {
  id: string;
  name: string;
  conference: string;
  conference_name: string;
  rating: number;
  d1_matches: number;
  wins: number;
  losses: number;
};

export type ModelParams = { home_logit: number; calibration_scale: number };

// ---------- random numbers ----------

/** Small seeded generator (mulberry32). Same seed, same stream, on any machine. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normal(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ---------- the match model (mirror of pipeline/model.py) ----------

const sigmoid = (x: number) => 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, x))));
const logit = (p: number) => {
  const q = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
  return Math.log(q / (1 - q));
};

export function setDistribution(p: number) {
  const q = 1 - p;
  return {
    home_3_0: p ** 3,
    home_3_1: 3 * p ** 3 * q,
    home_3_2: 6 * p ** 3 * q ** 2,
    away_3_0: q ** 3,
    away_3_1: 3 * q ** 3 * p,
    away_3_2: 6 * q ** 3 * p ** 2,
  };
}

export function matchFromSet(p: number): number {
  const d = setDistribution(p);
  return d.home_3_0 + d.home_3_1 + d.home_3_2;
}

function inverseMatch(pMatch: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (matchFromSet(mid) < pMatch) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Calibrated chance the HOME side wins the match (pipeline/model.py `predict`). */
export function homeWinProb(rHome: number, rAway: number, neutral: boolean, m: ModelParams): number {
  const pSet = sigmoid(rHome - rAway + (neutral ? 0 : m.home_logit));
  const raw = matchFromSet(pSet);
  const z = Math.max(-40, Math.min(40, m.calibration_scale * logit(Math.min(Math.max(raw, 1e-6), 1 - 1e-6))));
  return sigmoid(z);
}

/** Full prediction for one match: win chance and the six set scores that add up to it. */
export function predictMatch(rHome: number, rAway: number, neutral: boolean, m: ModelParams) {
  const pHome = homeWinProb(rHome, rAway, neutral, m);
  const pSetHome = inverseMatch(pHome);
  return { pHome, pSetHome, sets: setDistribution(pSetHome) };
}

// ---------- rating uncertainty ----------

/**
 * Approximate one-sigma uncertainty of a rating, in the same log-odds units.
 * The fit adds the prior precision (0.25) to the information in a team's
 * sets; a D1 match is about 3.8 sets at roughly 0.2 information per set, so
 * information is about 0.25 + 0.76 per match. This is our approximation, not
 * a pipeline output, and it is shown as an assumption wherever it is used.
 */
export const PRIOR_PRECISION = 0.25;
export const INFO_PER_MATCH = 0.76;
export function ratingSd(d1Matches: number): number {
  return 1 / Math.sqrt(PRIOR_PRECISION + INFO_PER_MATCH * Math.max(d1Matches, 0));
}

// ---------- single-elimination helpers ----------

const SEED_ORDER: Record<number, number[]> = {
  2: [0, 1],
  4: [0, 3, 2, 1],
  8: [0, 7, 3, 4, 2, 5, 1, 6],
};

/** Winner of a neutral-floor single-elimination bracket over `seeded` (best first); byes to the top seeds. */
export function singleElimination(seeded: number[], rating: (i: number) => number, m: ModelParams, rng: () => number): number {
  const n = seeded.length;
  if (n === 1) return seeded[0];
  const size = n <= 2 ? 2 : n <= 4 ? 4 : 8;
  let slots: (number | null)[] = SEED_ORDER[size].map((s) => (s < n ? seeded[s] : null));
  while (slots.length > 1) {
    const next: (number | null)[] = [];
    for (let i = 0; i < slots.length; i += 2) {
      const a = slots[i];
      const b = slots[i + 1];
      if (a === null) next.push(b);
      else if (b === null) next.push(a);
      else next.push(rng() < homeWinProb(rating(a), rating(b), true, m) ? a : b);
    }
    slots = next;
  }
  return slots[0] as number;
}

// ---------- NCAA tournament field projection ----------

export const FIELD_SIZE = 64;
export const CONF_TOURNEY_TEAMS = 8;

export type FieldOptions = {
  trials: number;
  seed: number;
  /** Conference keys that get no automatic bid (see docs/pages-wave2.md for the assumption). */
  noAutoBid: string[];
};

export type FieldRow = {
  id: string;
  /** Share of trials in which the team won its conference's simulated tournament. */
  pChampion: number;
  /** Share of trials in which that win earned an automatic bid (0 for a league with none). */
  pAuto: number;
  pAtLarge: number;
  pField: number;
};

export type FieldProjection = {
  trials: number;
  seed: number;
  autoLeagues: number;
  atLargeSpots: number;
  rows: Map<string, FieldRow>;
  /** The most likely field: top-probability team per league plus the top at-large chances, best rating first. */
  field: { id: string; kind: 'auto' | 'at-large' }[];
};

export function projectField(teams: SimTeam[], m: ModelParams, opts: FieldOptions): FieldProjection {
  const rng = mulberry32(opts.seed);
  const noAuto = new Set(opts.noAutoBid);
  const byConf = new Map<string, number[]>();
  teams.forEach((t, i) => byConf.set(t.conference, [...(byConf.get(t.conference) ?? []), i]));
  const leagues = [...byConf.keys()].sort();
  const autoLeagues = leagues.filter((k) => !noAuto.has(k)).length;
  const atLargeSpots = FIELD_SIZE - autoLeagues;
  const sd = teams.map((t) => ratingSd(t.d1_matches));
  const eligible = teams.map((t) => t.wins >= t.losses);
  const champ = new Array(teams.length).fill(0);
  const auto = new Array(teams.length).fill(0);
  const atLarge = new Array(teams.length).fill(0);
  const r = new Array<number>(teams.length);

  for (let k = 0; k < opts.trials; k++) {
    for (let i = 0; i < teams.length; i++) r[i] = teams[i].rating + sd[i] * normal(rng);
    const isAuto = new Array<boolean>(teams.length).fill(false);
    for (const lg of leagues) {
      const members = byConf.get(lg)!;
      const seeded = [...members].sort((a, b) => r[b] - r[a]).slice(0, CONF_TOURNEY_TEAMS);
      const w = singleElimination(seeded, (i) => r[i], m, rng);
      champ[w]++;
      if (!noAuto.has(lg)) {
        auto[w]++;
        isAuto[w] = true;
      }
    }
    const pool: number[] = [];
    for (let i = 0; i < teams.length; i++) if (!isAuto[i] && eligible[i]) pool.push(i);
    pool.sort((a, b) => r[b] - r[a]);
    for (let j = 0; j < Math.min(atLargeSpots, pool.length); j++) atLarge[pool[j]]++;
  }

  const rows = new Map<string, FieldRow>();
  teams.forEach((t, i) =>
    rows.set(t.id, {
      id: t.id,
      pChampion: champ[i] / opts.trials,
      pAuto: auto[i] / opts.trials,
      pAtLarge: atLarge[i] / opts.trials,
      pField: (auto[i] + atLarge[i]) / opts.trials,
    }),
  );

  // Most likely field: each league's likeliest champion, then the likeliest at-large teams.
  const picked = new Set<string>();
  const field: FieldProjection['field'] = [];
  for (const lg of leagues) {
    if (noAuto.has(lg)) continue;
    const best = byConf
      .get(lg)!
      .map((i) => teams[i])
      .sort((a, b) => rows.get(b.id)!.pAuto - rows.get(a.id)!.pAuto || b.rating - a.rating)[0];
    picked.add(best.id);
    field.push({ id: best.id, kind: 'auto' });
  }
  const rest = teams
    .filter((t) => !picked.has(t.id) && t.wins >= t.losses)
    .sort((a, b) => rows.get(b.id)!.pAtLarge - rows.get(a.id)!.pAtLarge || b.rating - a.rating)
    .slice(0, atLargeSpots);
  for (const t of rest) field.push({ id: t.id, kind: 'at-large' });
  const rating = new Map(teams.map((t) => [t.id, t.rating]));
  field.sort((a, b) => rating.get(b.id)! - rating.get(a.id)!);
  return { trials: opts.trials, seed: opts.seed, autoLeagues, atLargeSpots, rows, field };
}

// ---------- bracket simulation ----------

export type BracketOptions = { trials: number; seed: number; hostEdge: boolean };

/** Rounds a team can reach, in order; the last is winning the title. */
export const STAGES = ['Round 2', 'Regionals', 'Regional final', 'Final Four', 'Title match', 'Champion'] as const;
export type StageKey = (typeof STAGES)[number];

/** Pod of national seed s (0-based): host, the 17-32 seed, and two unseeded teams, balanced so the top seed gets the weakest. */
export function podTeams(s: number): [number, number, number, number] {
  return [s, 31 - s, 63 - s, 47 - s];
}

/** Regions of four pods each, by national seed index (0 = No. 1 seed). */
export const REGIONS: number[][] = [
  [0, 15, 7, 8],
  [1, 14, 6, 9],
  [2, 13, 5, 10],
  [3, 12, 4, 11],
];

/**
 * Plays the 64-team bracket `trials` times. `ratings[i]` is the rating of
 * national seed i+1. Returns, per seed index, the share of trials in which the
 * team cleared each stage. Rounds one and two are won at the pod host's floor
 * when `hostEdge` is on (the host is one of the top 16 seeds); regionals and the
 * Final Four are played on neutral floors.
 */
export function simulateBracket(ratings: number[], m: ModelParams, opts: BracketOptions): number[][] {
  if (ratings.length !== FIELD_SIZE) throw new Error('bracket needs 64 teams');
  const rng = mulberry32(opts.seed);
  const out = ratings.map(() => new Array(STAGES.length).fill(0));
  const play = (a: number, b: number, hostA = false) => {
    const p = hostA && opts.hostEdge ? homeWinProb(ratings[a], ratings[b], false, m) : homeWinProb(ratings[a], ratings[b], true, m);
    return rng() < p ? a : b;
  };
  for (let t = 0; t < opts.trials; t++) {
    const podWinner: number[] = [];
    for (let s = 0; s < 16; s++) {
      const [host, b, weak, mid] = podTeams(s);
      const w1 = play(host, weak, true);
      const w2 = play(b, mid, false);
      out[w1][0]++;
      out[w2][0]++;
      const hostIn = w1 === host || w2 === host;
      // Round two: the host keeps the home floor if it is still alive.
      const champ = hostIn ? play(host, w1 === host ? w2 : w1, true) : play(w1, w2);
      out[champ][1]++;
      podWinner[s] = champ;
    }
    const regionWinner: number[] = [];
    for (const reg of REGIONS) {
      const [a, b, c, d] = reg.map((s) => podWinner[s]);
      const s1 = play(a, b);
      const s2 = play(c, d);
      out[s1][2]++;
      out[s2][2]++;
      const w = play(s1, s2);
      out[w][3]++;
      regionWinner.push(w);
    }
    const f1 = play(regionWinner[0], regionWinner[3]);
    const f2 = play(regionWinner[1], regionWinner[2]);
    out[f1][4]++;
    out[f2][4]++;
    out[play(f1, f2)][5]++;
  }
  return out.map((row) => row.map((n) => n / opts.trials));
}

// ---------- RPI ----------

export type PlayedMatch = { home: string; away: string; home_sets: number; away_sets: number };

export type RpiRow = {
  id: string;
  rpi: number;
  wp: number;
  owp: number;
  oowp: number;
  wins: number;
  losses: number;
  rank: number;
};

/** Weights of the classic RPI: own winning percentage, opponents', opponents' opponents'. */
export const RPI_WEIGHTS = { wp: 0.25, owp: 0.5, oowp: 0.25 } as const;

/**
 * The classic RPI over completed D1 versus D1 matches: 25% winning percentage,
 * 50% opponents' winning percentage (each opponent's record without its games
 * against the team), 25% opponents' opponents' winning percentage. No road or
 * quality-win adjustments: the NCAA committee's own RPI may differ.
 */
export function computeRpi(matches: PlayedMatch[]): RpiRow[] {
  type Rec = { w: number; l: number; games: { opp: string; won: boolean }[] };
  const rec = new Map<string, Rec>();
  const get = (id: string) => {
    let r = rec.get(id);
    if (!r) rec.set(id, (r = { w: 0, l: 0, games: [] }));
    return r;
  };
  for (const g of matches) {
    const homeWon = g.home_sets > g.away_sets;
    const h = get(g.home);
    const a = get(g.away);
    h.games.push({ opp: g.away, won: homeWon });
    a.games.push({ opp: g.home, won: !homeWon });
    if (homeWon) {
      h.w++;
      a.l++;
    } else {
      a.w++;
      h.l++;
    }
  }
  const wp = (r: Rec) => (r.w + r.l ? r.w / (r.w + r.l) : 0);
  const owpOf = new Map<string, number>();
  for (const [id, r] of rec) {
    if (!r.games.length) {
      owpOf.set(id, 0);
      continue;
    }
    let sum = 0;
    for (const g of r.games) {
      const o = rec.get(g.opp)!;
      // The opponent's record without its game against this team (which it won when this team lost).
      const w = o.w - (g.won ? 0 : 1);
      const l = o.l - (g.won ? 1 : 0);
      sum += w + l > 0 ? w / (w + l) : 0;
    }
    owpOf.set(id, sum / r.games.length);
  }
  const rows: RpiRow[] = [];
  for (const [id, r] of rec) {
    const own = wp(r);
    const owp = owpOf.get(id)!;
    const oowp = r.games.length ? r.games.reduce((s, g) => s + owpOf.get(g.opp)!, 0) / r.games.length : 0;
    rows.push({
      id,
      rpi: RPI_WEIGHTS.wp * own + RPI_WEIGHTS.owp * owp + RPI_WEIGHTS.oowp * oowp,
      wp: own,
      owp,
      oowp,
      wins: r.w,
      losses: r.l,
      rank: 0,
    });
  }
  rows.sort((a, b) => b.rpi - a.rpi || a.id.localeCompare(b.id));
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

// ---------- CSV ----------

export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
