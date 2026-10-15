/**
 * Site-level guards: every page in the registry has a valid title and meta
 * description, every released page has an inbound link, and the auto-publish
 * guardrails hold for whatever the pipeline has written (CLAUDE.md,
 * "Auto-publish exception").
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCollection } from '@/kit/content';
import { createLinkIndex, findOrphans } from '@/kit/links';
import { validateSeo } from '@/kit/seo/metadata';
import { FOOTER, GUIDES_PATH, NAV, getAllPages } from './pages';
import { PUBLISHING } from './policy';

afterEach(() => vi.unstubAllEnvs());

describe('page registry', () => {
  it('every page has a usable title and description', () => {
    for (const p of getAllPages()) {
      if (p.type === 'home' || p.type === 'author') continue; // home/author build their own
      validateSeo(p.path, p.title, p.description ?? '');
    }
  });

  it('no released page is an orphan', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const index = createLinkIndex(getAllPages());
    const navPaths = [...NAV, ...FOOTER].map((n) => n.path);
    expect(findOrphans(index, { navPaths })).toEqual([]);
  });
});

describe('auto-publish guardrails', () => {
  const games = getCollection('volleyballGames');
  const NUMBER = /\d+(?:\.\d+)?/g;

  it('game pages respect the daily caps', () => {
    const perDay = new Map<string, number>();
    for (const g of games) perDay.set(g.publishDate, (perDay.get(g.publishDate) ?? 0) + 1);
    for (const [day, n] of perDay) {
      expect(n, `${day} game pages`).toBeLessThanOrEqual(PUBLISHING.max_game_pages_per_sport_per_day);
      expect(n, `${day} game pages site-wide`).toBeLessThanOrEqual(PUBLISHING.max_game_pages_site_per_day);
    }
  });

  it('every game page was written by the pipeline and every number in it traces to its facts file', () => {
    const selected = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/volleyball/game-pages.json'), 'utf8')) as { slug: string }[];
    const slugs = new Set(selected.map((s) => s.slug));
    for (const g of games) {
      expect(slugs.has(g.slug), `${g.slug} is not in data/volleyball/game-pages.json`).toBe(true);
      const factsFile = path.join(process.cwd(), 'data/volleyball/games', `${g.slug}.json`);
      expect(fs.existsSync(factsFile), `${g.slug} has no facts file`).toBe(true);
      const factsText = fs.readFileSync(factsFile, 'utf8');
      // Every number the facts file contains, in any formatting the writer uses
      // (raw, percent with one decimal, signed two decimals).
      const allowed = new Set<string>();
      for (const t of factsText.match(NUMBER) ?? []) {
        allowed.add(t);
        allowed.add(String(Number(t))); // "01" in a date is the "1" in "Oct. 1"
      }
      // Percent with one decimal. Python and JS round exact .x5 ties differently, so accept both neighbors.
      const addPct = (x: number) => {
        allowed.add((Math.floor(x * 1000 + 1e-9) / 10).toFixed(1));
        allowed.add((Math.ceil(x * 1000 - 1e-9) / 10).toFixed(1));
      };
      const walk = (v: unknown): void => {
        if (typeof v === 'number') {
          addPct(Math.abs(v));
          allowed.add(Math.abs(v).toFixed(2));
          allowed.add(String(Math.abs(Math.round(v))));
        } else if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') Object.values(v).forEach(walk);
      };
      const facts = JSON.parse(factsText);
      walk(facts);
      // Differences and complements the writer derives (home court, underdog, at-least-one-set, five sets).
      const p = facts.p_home as number;
      const s = facts.sets as Record<string, number>;
      for (const x of [1 - p, p - facts.p_home_neutral, facts.p_home_neutral - p, 1 - facts.p_home_neutral, 1 - s.home_3_0, 1 - s.away_3_0, s.home_3_2 + s.away_3_2]) {
        addPct(Math.abs(x));
      }
      allowed.add('21'); // the 21+ notice
      const { content, data } = matter(fs.readFileSync(path.join(process.cwd(), g.file), 'utf8'));
      const text = `${data.title}\n${data.description}\n${content}`.replace(/\bD1\b/g, '');
      // Ordinals and dates: "3rd" -> 3 is covered by rank numbers; month days by the date string.
      for (const n of text.match(NUMBER) ?? []) {
        expect(allowed.has(n), `${g.slug}: number ${n} does not trace to its facts file`).toBe(true);
      }
    }
  });
});

describe('growth-loop guides', () => {
  const guides = getCollection('guides');

  it('guides live under /guides, apart from every model-driven route', () => {
    for (const g of guides) {
      expect(g.path, g.path).toMatch(/^\/guides\/[a-z0-9-]+$/);
      expect(g.author, `${g.path} author`).toBe('editorial-team');
    }
  });

  it('every guide links our ratings and results, cites sources with the date checked, and carries the 21+ line when it touches odds', () => {
    for (const g of guides) {
      expect(g.body, `${g.path} ratings link`).toContain('](/volleyball/ratings)');
      expect(g.body, `${g.path} results link`).toContain('](/results)');
      expect(g.body, `${g.path} sources`).toMatch(/## Sources and date checked[\s\S]*checked every page below on \d{4}-\d{2}-\d{2}/);
      if (/\b(odds|bets?|betting|wagers?|sportsbooks?|gambl\w*|moneyline|spreads?|fair lines?|parlays?)\b/i.test(g.body.replace(/## Sources and date checked[\s\S]*$/, ''))) {
        expect(g.body, `${g.path} 21+ line`).toMatch(/21\+ only/);
        expect(g.body, `${g.path} rg link`).toContain('](/responsible-gambling)');
      }
    }
  });

  it('the guides hub is registered only when a guide exists, and no guide touches a model-driven path', () => {
    const pages = getAllPages();
    expect(pages.some((p) => p.path === GUIDES_PATH)).toBe(guides.length > 0);
    const modelRoutes = /^\/(volleyball|hockey)\/|^\/results/;
    expect(pages.filter((p) => p.parent === GUIDES_PATH && modelRoutes.test(p.path))).toEqual([]);
  });
});

describe('wave 2 data pages', () => {
  const WAVE2 = [
    '/volleyball/conference-standings',
    '/volleyball/rpi',
    '/volleyball/matchup-calculator',
    '/volleyball/ncaa-tournament-predictions',
    '/volleyball/bracket-simulator',
  ];

  it('are registered, scheduled by date only, and at most two a week', () => {
    const schedule = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/release-schedule.json'), 'utf8')) as Record<string, string>;
    const perWeek = new Map<string, number>();
    for (const p of WAVE2) {
      expect(getAllPages().some((x) => x.path === p), `${p} registered`).toBe(true);
      const d = schedule[p];
      expect(d, `${p} scheduled`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(d >= '2026-10-21', `${p} is not backdated`).toBe(true);
      const t = new Date(`${d}T00:00:00Z`);
      const monday = new Date(t.getTime() - ((t.getUTCDay() + 6) % 7) * 86400_000).toISOString().slice(0, 10);
      perWeek.set(monday, (perWeek.get(monday) ?? 0) + 1);
    }
    for (const [week, n] of perWeek) expect(n, `week of ${week}`).toBeLessThanOrEqual(2);
  });

  it('none is an orphan once every page is released', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-12-01T00:00:00Z'));
    vi.stubEnv('VERCEL_ENV', 'production');
    try {
      const index = createLinkIndex(getAllPages());
      for (const p of WAVE2) expect(index.has(p), `${p} released`).toBe(true);
      const navPaths = [...NAV, ...FOOTER].map((n) => n.path);
      expect(findOrphans(index, { navPaths })).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
