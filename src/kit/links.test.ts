// site-kit v0.1.0
import { describe, expect, it } from 'vitest';
import { createLinkIndex, findOrphans, type PageEntry } from './links';
import { requireVerified } from './verified';

const pages: PageEntry[] = [
  { path: '/', title: 'Home', type: 'home' },
  { path: '/guides', title: 'Guides', type: 'hub', parent: '/' },
  { path: '/guides/a', title: 'A', type: 'article', parent: '/guides', tags: ['x'], related: ['/guides/missing', '/guides/c'] },
  { path: '/guides/b', title: 'B', type: 'article', parent: '/guides', tags: ['x'] },
  { path: '/guides/c', title: 'C', type: 'article', parent: '/guides' },
  { path: '/guides/hidden', title: 'Hidden', type: 'article', parent: '/guides', publishDate: '2099-01-01' },
  { path: '/lonely', title: 'Lonely', type: 'other' },
];

// Simulate production release filtering without touching the environment.
const filter = (ps: PageEntry[]) => ps.filter((p) => !p.publishDate || p.publishDate <= '2026-10-04');
const index = createLinkIndex(pages, { filter });

describe('createLinkIndex', () => {
  it('drops unreleased pages entirely', () => {
    expect(index.has('/guides/hidden')).toBe(false);
    expect(index.children('/guides').map((p) => p.path)).toEqual(['/guides/a', '/guides/b', '/guides/c']);
  });

  it('keepExisting drops missing and unreleased targets, keeps order', () => {
    expect(index.keepExisting(['/guides/c', '/nope', '/guides/hidden', '/guides/a/', '/guides/c']).map((p) => p.path)).toEqual([
      '/guides/c',
      '/guides/a',
    ]);
  });

  it('builds breadcrumbs from parents', () => {
    expect(index.breadcrumbs('/guides/b')).toEqual([
      { name: 'Home', path: '/' },
      { name: 'Guides', path: '/guides' },
      { name: 'B', path: '/guides/b' },
    ]);
  });

  it('related: explicit first, then tag siblings; never self, parent or missing', () => {
    expect(index.related('/guides/a', 2).map((p) => p.path)).toEqual(['/guides/c', '/guides/b']);
    expect(index.related('/guides/a').map((p) => p.path)).not.toContain('/guides');
  });

  it('rejects duplicate paths', () => {
    expect(() => createLinkIndex([pages[0], { ...pages[0] }], { filter })).toThrow(/duplicate/);
  });
});

describe('findOrphans', () => {
  it('finds pages nothing links to', () => {
    expect(findOrphans(index).map((p) => p.path)).toEqual(['/lonely']);
  });
  it('counts related edges only for page types that render them', () => {
    const idx = createLinkIndex(
      [
        { path: '/', title: 'Home', type: 'home' },
        { path: '/t', title: 'Tool', type: 'tool', parent: '/', related: ['/x'] },
        { path: '/x', title: 'X', type: 'other' },
      ],
      { filter },
    );
    expect(findOrphans(idx).map((p) => p.path)).toEqual(['/x']);
    expect(findOrphans(idx, { relatedTypes: ['tool'] })).toEqual([]);
  });
  it('counts nav links as inbound', () => {
    expect(findOrphans(index, { navPaths: ['/lonely'] })).toEqual([]);
  });
});

describe('requireVerified', () => {
  const now = new Date('2026-10-04T00:00:00Z');
  it('passes verified listings through', () => {
    const ok = [{ name: 'x', source_url: 'https://x.test', verified_at: '2026-10-01' }];
    expect(requireVerified(ok, 'test', { now })).toEqual(ok);
  });
  it('rejects a listing without a source or verification date', () => {
    expect(() => requireVerified([{ name: 'x', source_url: '' }], 'test', { now })).toThrow(/source_url/);
    expect(() => requireVerified([{ source_url: 'https://x.test' }], 'test', { now })).toThrow(/verified_at/);
    expect(() => requireVerified([{ source_url: 'https://x.test', verified_at: '2026-12-01' }], 'test', { now })).toThrow(/future/);
  });
});
