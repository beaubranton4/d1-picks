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
import { FOOTER, NAV, getAllPages } from './pages';
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
