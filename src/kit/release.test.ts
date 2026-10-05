// site-kit v0.1.0
import { describe, expect, it } from 'vitest';
import { createRelease, releaseTime } from './release';

const NOW = new Date('2026-10-04T12:00:00Z');

function gate(production: boolean) {
  return createRelease({
    schedule: {
      $comment: 'ignored',
      '/tools/calc': '2026-10-01',
      '/ca/oakland/': '2026-10-10',
      '/guides/both': '2026-10-20',
    },
    contentDate: (p) =>
      ({ '/guides/past': '2026-09-28', '/guides/future': '2099-01-05', '/guides/both': '2026-10-01' })[p],
    production: () => production,
  });
}

describe('releaseTime', () => {
  it('treats a date-only value as midnight UTC', () => {
    expect(releaseTime('2026-10-06')).toBe(Date.UTC(2026, 9, 6));
  });
  it('requires a timezone on datetimes', () => {
    expect(releaseTime('2026-10-06T09:00:00Z')).toBe(Date.UTC(2026, 9, 6, 9));
    expect(releaseTime('2026-10-06T09:00:00-07:00')).toBe(Date.UTC(2026, 9, 6, 16));
    expect(() => releaseTime('2026-10-06T09:00:00')).toThrow(/invalid release date/);
  });
  it('rejects garbage', () => {
    expect(() => releaseTime('next tuesday')).toThrow(/invalid release date/);
    expect(() => releaseTime('2026-13-45')).toThrow();
  });
});

describe('createRelease', () => {
  it('rejects a schedule key that is not a path', () => {
    expect(() => createRelease({ schedule: { 'tools/x': '2026-01-01' }, contentDate: () => undefined })).toThrow(/must be a path/);
  });

  it('rejects an invalid schedule date eagerly', () => {
    expect(() => createRelease({ schedule: { '/x': 'soon' }, contentDate: () => undefined })).toThrow(/invalid release date/);
  });

  it('resolves dates from the schedule and from content, later date wins', () => {
    const g = gate(true);
    expect(g.releaseDateFor('/tools/calc')).toBe('2026-10-01');
    expect(g.releaseDateFor('/guides/past')).toBe('2026-09-28');
    expect(g.releaseDateFor('/guides/both')).toBe('2026-10-20');
    expect(g.releaseDateFor('/ca/oakland')).toBe('2026-10-10'); // trailing slash in the schedule normalized
    expect(g.releaseDateFor('/not/gated')).toBeUndefined();
  });

  it('isReleasedAt compares dates and paths against now', () => {
    const g = gate(true);
    expect(g.isReleasedAt('2026-10-04', NOW)).toBe(true);
    expect(g.isReleasedAt('2026-10-05', NOW)).toBe(false);
    expect(g.isReleasedAt('/guides/past', NOW)).toBe(true);
    expect(g.isReleasedAt('/guides/future', NOW)).toBe(false);
    expect(g.isReleasedAt('/guides/both', NOW)).toBe(false);
    expect(g.isReleasedAt('/ca/oakland/', NOW)).toBe(false);
    expect(g.isReleasedAt('/not/gated', NOW)).toBe(true);
  });

  it('releases exactly at midnight UTC on the date', () => {
    const g = gate(true);
    expect(g.isReleasedAt('/ca/oakland', new Date('2026-10-09T23:59:59Z'))).toBe(false);
    expect(g.isReleasedAt('/ca/oakland', new Date('2026-10-10T00:00:00Z'))).toBe(true);
  });

  it('shows everything outside production', () => {
    const g = gate(false);
    expect(g.isReleased('/guides/future', NOW)).toBe(true);
    expect(() => g.assertReleased('/guides/future', NOW)).not.toThrow();
    expect(g.releasedOnly([{ path: '/guides/future' }], NOW)).toHaveLength(1);
  });

  it('assertReleased 404s an unreleased page in production', () => {
    const g = gate(true);
    expect(() => g.assertReleased('/guides/past', NOW)).not.toThrow();
    let thrown: unknown;
    try {
      g.assertReleased('/guides/future', NOW);
    } catch (e) {
      thrown = e;
    }
    expect(String((thrown as { digest?: string })?.digest)).toMatch(/404/);
  });

  it('releasedOnly checks both the item publishDate and its path', () => {
    const g = gate(true);
    const items = [
      { path: '/guides/past', publishDate: '2026-09-28' },
      { path: '/guides/future' },
      { path: '/not/gated', publishDate: '2030-01-01' },
      { path: '/tools/calc' },
      { publishDate: '2026-10-04' },
    ];
    expect(g.releasedOnly(items, NOW)).toEqual([
      { path: '/guides/past', publishDate: '2026-09-28' },
      { path: '/tools/calc' },
      { publishDate: '2026-10-04' },
    ]);
  });
});
