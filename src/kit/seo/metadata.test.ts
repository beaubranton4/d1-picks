// site-kit v0.1.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { siteOrigin } from '../config';
import { buildMetadata, fullTitle } from './metadata';

const ok = {
  path: '/guides/x/',
  title: 'A Guide',
  description: 'A description long enough to pass the seventy character minimum for meta descriptions.',
};

afterEach(() => vi.unstubAllEnvs());

describe('buildMetadata', () => {
  it('emits an absolute self-canonical with the trailing slash removed', () => {
    const m = buildMetadata(ok);
    expect(m.alternates?.canonical).toBe(`${siteOrigin}/guides/x`);
    expect((m.openGraph as { url: string }).url).toBe(`${siteOrigin}/guides/x`);
  });

  it('throws on a missing title or a missing, short or long description', () => {
    expect(() => buildMetadata({ ...ok, title: '' })).toThrow(/title is required/);
    expect(() => buildMetadata({ ...ok, description: '' })).toThrow(/description is required/);
    expect(() => buildMetadata({ ...ok, description: 'Too short.' })).toThrow(/70-160/);
    expect(() => buildMetadata({ ...ok, description: 'x'.repeat(161) })).toThrow(/70-160/);
  });

  it('indexes in production and noindexes previews', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(buildMetadata(ok).robots).toMatchObject({ index: true, follow: true });
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(buildMetadata(ok).robots).toEqual({ index: false, follow: false });
  });

  it('honors an explicit noindex', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(buildMetadata({ ...ok, noindex: true }).robots).toEqual({ index: false, follow: true });
  });

  it('only sets modifiedTime when given', () => {
    const a = buildMetadata({ ...ok, type: 'article', publishedTime: '2026-09-28' }).openGraph as Record<string, unknown>;
    expect('modifiedTime' in a).toBe(false);
  });
});

describe('fullTitle', () => {
  it('appends the brand once', () => {
    expect(fullTitle('A Guide')).toMatch(/^A Guide \| /);
    expect(fullTitle('A Guide', false)).toBe('A Guide');
  });
});
