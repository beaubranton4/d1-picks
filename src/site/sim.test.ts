/**
 * The simulations, the RPI and the downloads: the match math reproduces the
 * pipeline's own predictions, the seeded runs are repeatable, and the totals
 * add up (64 teams in the field, one champion, four in the Final Four).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AUTO_BID_NOTE, conferenceTables, defaultBracket, fieldProjection, modelParams, NCAA_FIELD, NO_AUTO_BID, playedMatches, rpiTable, SIM } from './derived';
import { predictions, ratings, type Snapshot } from './data';
import {
  computeRpi,
  csvCell,
  homeWinProb,
  mulberry32,
  podTeams,
  predictMatch,
  projectField,
  ratingSd,
  REGIONS,
  simulateBracket,
  toCsv,
} from './sim';

const snapshot = (asOf: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/volleyball/ratings', `${asOf}.json`), 'utf8')) as Snapshot;

describe('match model', () => {
  it('reproduces every logged prediction from its saved ratings snapshot', () => {
    const preds = predictions();
    expect(preds.length).toBeGreaterThan(0);
    for (const p of preds) {
      const s = snapshot(p.ratings_as_of);
      const rh = s.teams.find((t) => t.id === p.home)!.rating;
      const ra = s.teams.find((t) => t.id === p.away)!.rating;
      const out = predictMatch(rh, ra, false, { home_logit: s.params.home_logit, calibration_scale: s.params.calibration_scale });
      expect(out.pHome, p.id).toBeCloseTo(p.p_home, 3);
      for (const k of Object.keys(p.sets) as (keyof typeof p.sets)[]) expect(out.sets[k], `${p.id} ${k}`).toBeCloseTo(p.sets[k], 3);
    }
  });

  it('is symmetric on a neutral floor and the set scores add to one', () => {
    const m = modelParams();
    expect(homeWinProb(1.2, -0.3, true, m) + homeWinProb(-0.3, 1.2, true, m)).toBeCloseTo(1, 10);
    const sets = predictMatch(0.4, 0.1, false, m).sets;
    expect(Object.values(sets).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
});

describe('seeded generator', () => {
  it('repeats exactly for a fixed seed', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(mulberry32(7)()).toBeCloseTo(0.0117, 4);
  });
});

describe('RPI', () => {
  it('hand-checked on a four-team round robin', () => {
    // A beats B, C, D; B beats C and D; C beats D.
    const mk = (home: string, away: string) => ({ home, away, home_sets: 3, away_sets: 0 });
    const rows = computeRpi([mk('A', 'B'), mk('A', 'C'), mk('A', 'D'), mk('B', 'C'), mk('B', 'D'), mk('C', 'D')]);
    const a = rows.find((r) => r.id === 'A')!;
    expect(a.wp).toBe(1);
    // B without its game against A: 2-0. C without A: 1-1. D without A: 0-2. Mean of (1, 0.5, 0).
    expect(a.owp).toBeCloseTo(0.5, 10);
    expect(rows.map((r) => r.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it('agrees with the ratings snapshot records, apart from matches saved after the snapshot was fit', () => {
    const table = rpiTable();
    expect(table.rows.length).toBe(ratings().teams.length);
    let differ = 0;
    for (const r of table.rows) {
      // Results are refreshed after the ratings are fit, so a record can be ahead of the snapshot, never behind.
      expect(r.wins, r.team.name).toBeGreaterThanOrEqual(r.team.wins);
      expect(r.losses, r.team.name).toBeGreaterThanOrEqual(r.team.losses);
      expect(r.wins + r.losses - (r.team.wins + r.team.losses), r.team.name).toBeLessThanOrEqual(4);
      if (r.wins !== r.team.wins || r.losses !== r.team.losses) differ++;
      expect(r.rpi).toBeGreaterThan(0);
      expect(r.rpi).toBeLessThan(1);
    }
    expect(differ).toBeLessThan(table.rows.length * 0.5);
    const gap = table.matches - ratings().params.matches_used;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThan(ratings().params.matches_used * 0.1);
  });

  it('keeps RPI in line with the model for the top of the table', () => {
    const top = rpiTable().rows.slice(0, 25);
    const inModelTop60 = top.filter((r) => r.ratingRank <= 60).length;
    expect(inModelTop60).toBeGreaterThanOrEqual(20);
  });
});

describe('field projection', () => {
  const proj = fieldProjection();
  it('fills exactly 64 spots in every trial on average', () => {
    const total = [...proj.rows.values()].reduce((s, r) => s + r.pField, 0);
    expect(total).toBeCloseTo(NCAA_FIELD.teams, 6);
    const auto = [...proj.rows.values()].reduce((s, r) => s + r.pAuto, 0);
    expect(auto).toBeCloseTo(NCAA_FIELD.auto, 6);
    expect(proj.autoLeagues).toBe(NCAA_FIELD.auto);
    expect(proj.atLargeSpots).toBe(NCAA_FIELD.atLarge);
    expect(NO_AUTO_BID.length).toBe(ratings().teams.length ? 1 : 0);
  });
  it('lists 64 distinct teams, 31 automatic and 33 at-large', () => {
    expect(proj.field.length).toBe(64);
    expect(new Set(proj.field.map((f) => f.id)).size).toBe(64);
    expect(proj.field.filter((f) => f.kind === 'auto').length).toBe(31);
  });
  it('the automatic-bid assumption is one constant, and flipping it changes the league count', () => {
    expect(NO_AUTO_BID).toEqual(['pac-12']);
    const teams = ratings().teams.map((t) => ({ ...t }));
    const withAssumption = projectField(teams, modelParams(), { trials: 20, seed: 1, noAutoBid: NO_AUTO_BID });
    const withBid = projectField(teams, modelParams(), { trials: 20, seed: 1, noAutoBid: [] });
    expect(withAssumption.autoLeagues).toBe(NCAA_FIELD.auto);
    expect(withBid.autoLeagues).toBe(NCAA_FIELD.auto + 1);
    expect(withBid.autoLeagues + withBid.atLargeSpots).toBe(64);
    const pac = teams.find((t) => t.conference === 'pac-12')!;
    expect(withAssumption.rows.get(pac.id)!.pAuto).toBe(0);
    expect(AUTO_BID_NOTE.csv).toContain('Pac-12');
  });
  it('is repeatable for a fixed seed and differs for another', () => {
    const teams = ratings().teams.map((t) => ({ ...t }));
    const a = projectField(teams, modelParams(), { trials: 200, seed: 5, noAutoBid: NO_AUTO_BID });
    const b = projectField(teams, modelParams(), { trials: 200, seed: 5, noAutoBid: NO_AUTO_BID });
    const c = projectField(teams, modelParams(), { trials: 200, seed: 6, noAutoBid: NO_AUTO_BID });
    expect([...a.rows.values()]).toEqual([...b.rows.values()]);
    expect([...a.rows.values()]).not.toEqual([...c.rows.values()]);
  });
  it('uncertainty shrinks with matches played', () => {
    expect(ratingSd(4)).toBeGreaterThan(ratingSd(16));
  });
});

describe('bracket simulation', () => {
  it('pods and regions cover all 64 seeds and 16 pods once', () => {
    const seen = new Set<number>();
    for (let s = 0; s < 16; s++) podTeams(s).forEach((i) => seen.add(i));
    expect(seen.size).toBe(64);
    expect(REGIONS.flat().sort((a, b) => a - b)).toEqual([...Array(16).keys()]);
  });
  const { results } = defaultBracket();
  it('crowns one champion and seats four in the Final Four', () => {
    const sum = (i: number) => results.reduce((s, r) => s + r.stages[i], 0);
    expect(sum(0)).toBeCloseTo(32, 6);
    expect(sum(1)).toBeCloseTo(16, 6);
    expect(sum(2)).toBeCloseTo(8, 6);
    expect(sum(3)).toBeCloseTo(4, 6);
    expect(sum(4)).toBeCloseTo(2, 6);
    expect(sum(5)).toBeCloseTo(1, 6);
    expect(results.length).toBe(64);
    expect(SIM.bracketTrials).toBeGreaterThan(0);
  });
  it('is repeatable and rewards the better team', () => {
    const r = results.map((x) => ratings().teams.find((t) => t.id === x.id)!.rating);
    const a = simulateBracket(r, modelParams(), { trials: 500, seed: 3, hostEdge: true });
    const b = simulateBracket(r, modelParams(), { trials: 500, seed: 3, hostEdge: true });
    expect(a).toEqual(b);
    expect(a[0][5]).toBeGreaterThan(a[63][5]);
    expect(a[0][0]).toBeGreaterThan(a[31][0]);
  });
  it('home edge helps the host', () => {
    const r = results.map((x) => ratings().teams.find((t) => t.id === x.id)!.rating);
    const on = simulateBracket(r, modelParams(), { trials: 4000, seed: 9, hostEdge: true });
    const off = simulateBracket(r, modelParams(), { trials: 4000, seed: 9, hostEdge: false });
    const avg = (m: number[][]) => m.slice(0, 16).reduce((s, x) => s + x[1], 0);
    expect(avg(on)).toBeGreaterThan(avg(off));
  });
});

describe('conferences', () => {
  it('has one table per league, every team once, champion odds that sum to one', () => {
    const tables = conferenceTables();
    expect(tables.reduce((s, t) => s + t.teams.length, 0)).toBe(ratings().teams.length);
    for (const t of tables) expect(t.teams.reduce((s, r) => s + r.pChampion, 0), t.name).toBeCloseTo(1, 6);
    expect(tables.map((t) => t.strengthRank)).toEqual(tables.map((_, i) => i + 1));
  });
  it('conference records never exceed overall records', () => {
    for (const t of conferenceTables()) for (const r of t.teams) expect(r.confW + r.confL).toBeLessThanOrEqual(r.team.wins + r.team.losses);
  });
  it('uses every completed D1 match once', () => {
    const ids = playedMatches().map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('');
    expect(toCsv(['x', 'y'], [[1, 'a,b']])).toBe('x,y\r\n1,"a,b"\r\n');
  });
});
