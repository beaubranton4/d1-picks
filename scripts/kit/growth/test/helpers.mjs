// site-kit v0.1.0
import { withDefaults } from '../lib/config.mjs';

export const cfg = withDefaults({
  enabled: true,
  site: { name: 'Test Site', domain: 'test.example', gscProperty: 'sc-domain:test.example' },
  content: { categories: ['guides'], defaultCategory: 'guides', urlTemplate: '/guides/{slug}', tools: [{ path: '/tools/calc', file: 'package.json', keywords: ['calculator'] }], knownPaths: ['/', '/guides'] },
  clusters: [{ name: 'a', seeds: ['library card'] }, { name: 'b', seeds: ['borrowing limits'] }],
  skip: { patterns: ['\\bnear me\\b'], reasons: {} },
  gates: { minWords: 50, minInternalLinks: 2, minVerifiedBlocks: 2, minSourceDomains: 2 },
});

export const SRC1 = 'https://one.example/policy';
export const SRC2 = 'https://two.example/rules';
export const sources = [
  { url: SRC1, ok: true, text: 'Cards expire after 3 years. Renewal costs $2 and opens 30 days before expiry. '.repeat(3) },
  { url: SRC2, ok: true, text: 'Patrons may borrow 50 items for 21 days. The late fee is $0.25 per day. '.repeat(3) },
];

export const goodBody = `This page explains renewal in plain terms for readers who already hold a card and want the facts quickly.

## Renewal rules

Cards expire after 3 years according to [the first policy](${SRC1}), and renewal costs $2 there.

## Borrowing limits

Patrons may borrow 50 items for 21 days under [the second policy](${SRC2}), with a late fee of $0.25 per day.

## Where to go next

Read the [guides index](/guides) and the [home page](/) for the rest of the help we publish on library cards.`;

export const mkDraft = (over = {}) => ({
  topic: { keyword: 'how to renew library card online' },
  frontmatter: { title: 'How to Renew a Library Card Online', slug: 'renew-card-online', category: 'guides', excerpt: 'How library card renewal works, when the window opens, what it costs and which rules apply, from public library policy pages.', keywords: ['renew library card'] },
  body: goodBody,
  value: { type: 'facts' },
  ...over,
});

export const ctx = (over = {}) => ({ cfg, today: '2026-10-05', posts: [], sources, knownPaths: new Set(['/', '/guides', '/tools/calc']), reservedSlugs: new Set(), ...over });
