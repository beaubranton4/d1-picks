/**
 * Server-side tables derived from the pipeline's saved output for the RPI,
 * tournament, simulator, conference and matchup pages. Every figure is either
 * a count over saved results, the saved ratings, or the output of the seeded
 * simulations in sim.ts run on those ratings. Nothing is typed in. Server only.
 */
import { contests, ratings, type Team } from './data';
import {
  computeRpi,
  projectField,
  simulateBracket,
  STAGES,
  type FieldProjection,
  type ModelParams,
  type PlayedMatch,
  type RpiRow,
  type SimTeam,
} from './sim';

/** Fixed seeds and sizes: the same saved data always gives the same page. */
export const SIM = { fieldTrials: 4000, fieldSeed: 20261015, bracketTrials: 20000, bracketSeed: 20261016 } as const;

/**
 * THE ONE PLACE to flip the automatic-bid assumption. League keys (as in
 * data/volleyball/ratings) that get NO automatic bid in 2026. The NCAA lists 31
 * automatic bids for 2026 while NCAA.com's feed groups teams into 32 leagues.
 * We assume the new 9-team Pac-12 is the one without a bid, because its first
 * volleyball championship is not until the week of Nov. 23 and the projected
 * list of 31 qualifiers we checked has no Pac-12 entry. That is our assumption,
 * NOT an NCAA statement. Set to [] to give the Pac-12 a bid (32 leagues, so the
 * model would then use 32 automatic and 32 at-large spots; the NCAA's 31/33
 * split would no longer hold, so also revisit NCAA_FIELD).
 */
export const NO_AUTO_BID: string[] = ['pac-12'];

/** Sources and date for the visible note on the pages and in the CSVs. */
export const AUTO_BID_NOTE = {
  checked: '2026-10-15',
  ncaaUrl: 'https://www.ncaa.com/championships/volleyball-women/d1/road-to-the-championship',
  bidSpecUrl: 'https://ncaaorg.s3.amazonaws.com/championships/marketing/bids/2026-28BidSpec/2026-28D1WVB_BID_SPECS.pdf',
  floUrl: 'https://www.flovolleyball.tv/articles/16232795-ncaa-womens-volleyball-tournament-2026-whos-in-the-field',
  csv: 'NCAA lists 31 automatic bids for 2026; D1 Picks assumes the Pac-12 has none this year (assumption, checked 2026-10-15). Pac-12 odds change if that is wrong.',
} as const;

export const NCAA_FIELD = { teams: 64, auto: 31, atLarge: 33, selection: '2026-11-29' } as const;

const cache = new Map<string, unknown>();
function memo<T>(key: string, f: () => T): T {
  const k = `${key}:${ratings().as_of}`;
  if (process.env.NODE_ENV === 'production' && cache.has(k)) return cache.get(k) as T;
  const v = f();
  cache.set(k, v);
  return v;
}

export const modelParams = (): ModelParams => ({ home_logit: ratings().params.home_logit, calibration_scale: ratings().params.calibration_scale });

export const simTeams = (): SimTeam[] => ratings().teams.map((t) => ({ ...t }));

/** Completed D1 matches the ratings were fit on: final, both teams D1, regular season, through the snapshot's date. */
export function playedMatches(): (PlayedMatch & { id: string; date: string; url: string })[] {
  const through = ratings().params.results_through;
  return contests()
    .contests.filter((c) => c.state === 'final' && c.d1 && !(c as { postseason?: boolean }).postseason && c.date <= through && c.home_sets != null && c.away_sets != null)
    .filter((c) => Math.max(c.home_sets!, c.away_sets!) === 3 && Math.min(c.home_sets!, c.away_sets!) <= 2) // a completed best-of-five, as in pipeline/results.py d1_finals
    .map((c) => ({ id: c.id, date: c.date, url: c.url, home: c.home, away: c.away, home_sets: c.home_sets!, away_sets: c.away_sets! }));
}

export type RpiTable = { rows: (RpiRow & { team: Team; ratingRank: number; delta: number })[]; matches: number };

export function rpiTable(): RpiTable {
  return memo('rpi', () => {
    const matches = playedMatches();
    const rpi = computeRpi(matches);
    const byId = new Map(ratings().teams.map((t) => [t.id, t]));
    const rows = rpi
      .filter((r) => byId.has(r.id))
      .map((r) => {
        const team = byId.get(r.id)!;
        return { ...r, team, ratingRank: team.rank, delta: team.rank - r.rank };
      });
    return { rows, matches: matches.length };
  });
}

export const fieldProjection = (): FieldProjection =>
  memo('field', () => projectField(simTeams(), modelParams(), { trials: SIM.fieldTrials, seed: SIM.fieldSeed, noAutoBid: NO_AUTO_BID }));

export type BracketResult = { id: string; name: string; seedIdx: number; stages: number[] };

/** The default 64-team field in seed order (best rating first) and its advance odds. */
export function defaultBracket(): { field: { id: string; kind: 'auto' | 'at-large' }[]; results: BracketResult[] } {
  return memo('bracket', () => {
    const proj = fieldProjection();
    const byId = new Map(ratings().teams.map((t) => [t.id, t]));
    const field = proj.field;
    const odds = simulateBracket(
      field.map((f) => byId.get(f.id)!.rating),
      modelParams(),
      { trials: SIM.bracketTrials, seed: SIM.bracketSeed, hostEdge: true },
    );
    return {
      field,
      results: field.map((f, i) => ({ id: f.id, name: byId.get(f.id)!.name, seedIdx: i, stages: odds[i] })),
    };
  });
}

export { STAGES };

// ---------- conferences ----------

export type ConfTeamRow = {
  team: Team;
  confW: number;
  confL: number;
  pChampion: number;
};

export type ConfTable = {
  key: string;
  name: string;
  teams: ConfTeamRow[];
  avgRating: number;
  strengthRank: number;
  autoBid: boolean;
  expectedBids: number;
};

export function conferenceTables(): ConfTable[] {
  return memo('conf', () => {
    const teams = ratings().teams;
    const conf = new Map(teams.map((t) => [t.id, t.conference]));
    const rec = new Map<string, { w: number; l: number }>();
    for (const g of playedMatches()) {
      if (conf.get(g.home) !== conf.get(g.away) || !conf.get(g.home)) continue;
      const hw = g.home_sets > g.away_sets;
      for (const [id, won] of [[g.home, hw], [g.away, !hw]] as const) {
        const r = rec.get(id) ?? { w: 0, l: 0 };
        if (won) r.w++;
        else r.l++;
        rec.set(id, r);
      }
    }
    const proj = fieldProjection();
    const keys = [...new Set(teams.map((t) => t.conference))];
    const tables: ConfTable[] = keys.map((key) => {
      const members = teams.filter((t) => t.conference === key);
      const rows: ConfTeamRow[] = members.map((t) => ({
        team: t,
        confW: rec.get(t.id)?.w ?? 0,
        confL: rec.get(t.id)?.l ?? 0,
        pChampion: proj.rows.get(t.id)!.pChampion,
      }));
      rows.sort((a, b) => b.confW - a.confW || a.confL - b.confL || b.team.rating - a.team.rating);
      return {
        key,
        name: members[0].conference_name,
        teams: rows,
        avgRating: members.reduce((s, t) => s + t.rating, 0) / members.length,
        strengthRank: 0,
        autoBid: !NO_AUTO_BID.includes(key),
        expectedBids: members.reduce((s, t) => s + proj.rows.get(t.id)!.pField, 0),
      };
    });
    [...tables].sort((a, b) => b.avgRating - a.avgRating).forEach((t, i) => (t.strengthRank = i + 1));
    return tables.sort((a, b) => a.strengthRank - b.strengthRank);
  });
}
