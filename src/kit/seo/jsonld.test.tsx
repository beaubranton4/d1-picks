// site-kit v0.1.0
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { config, siteOrigin } from '../config';
import {
  JsonLd,
  article,
  breadcrumbList,
  faqPage,
  itemList,
  localBusiness,
  organization,
  person,
  product,
  profilePage,
  website,
} from './jsonld';

const author = config.authors[0].slug;
const ABS = /^https:\/\//;

describe('JsonLd', () => {
  it('renders a ld+json script and escapes < to stop script injection', () => {
    const html = renderToStaticMarkup(<JsonLd data={{ '@type': 'Thing', name: '</script><b>x' }} />);
    expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(html).not.toContain('</script><b>');
    const json = html.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    expect(JSON.parse(json).name).toBe('</script><b>x');
  });
});

describe('site-wide builders', () => {
  it('organization and website reference the canonical origin', () => {
    const org = organization();
    expect(org).toMatchObject({ '@context': 'https://schema.org', '@type': 'Organization', name: config.name, url: siteOrigin });
    expect(org.logo).toMatch(ABS);
    const site = website();
    expect(site).toMatchObject({ '@type': 'WebSite', url: siteOrigin, publisher: { '@id': `${siteOrigin}/#organization` } });
  });
});

describe('breadcrumbList', () => {
  it('numbers items from 1 with absolute URLs', () => {
    const b = breadcrumbList([
      { name: 'Home', path: '/' },
      { name: 'Guides', path: '/guides' },
    ]);
    expect(b['@type']).toBe('BreadcrumbList');
    const items = b.itemListElement as { position: number; item: string; name: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items.every((i) => ABS.test(i.item))).toBe(true);
  });
  it('refuses an empty trail', () => {
    expect(() => breadcrumbList([])).toThrow();
  });
});

describe('faqPage', () => {
  it('maps questions to Question/Answer pairs', () => {
    const f = faqPage([{ question: 'Q?', answer: 'A.' }]);
    expect(f).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } }],
    });
  });
  it('refuses empty FAQs and blank answers', () => {
    expect(() => faqPage([])).toThrow();
    expect(() => faqPage([{ question: 'Q?', answer: '' }])).toThrow();
  });
});

describe('article', () => {
  const base = { path: '/guides/x', title: 'T', description: 'D', datePublished: '2026-09-28', author };

  it('has a Person author with a profile URL and the real publish date', () => {
    const a = article(base);
    expect(a).toMatchObject({ '@type': 'Article', headline: 'T', datePublished: '2026-09-28' });
    const p = a.author as Record<string, unknown>;
    expect(p['@type']).toBe('Person');
    expect(p.url).toBe(`${siteOrigin}/authors/${author}`);
  });

  it('omits dateModified unless one is passed', () => {
    expect('dateModified' in article(base)).toBe(false);
    expect(article({ ...base, dateModified: '2026-10-01' }).dateModified).toBe('2026-10-01');
  });

  it('refuses a missing or non-ISO datePublished and an unknown author', () => {
    expect(() => article({ ...base, datePublished: '' })).toThrow(/datePublished/);
    expect(() => article({ ...base, datePublished: 'Sept 28' })).toThrow(/ISO/);
    expect(() => article({ ...base, author: 'ghost-writer' })).toThrow(/unknown author/);
  });
});

describe('itemList', () => {
  it('supports links and nested items, stripping nested @context', () => {
    const list = itemList([{ name: 'A', path: '/a' }, { item: { '@context': 'https://schema.org', '@type': 'Thing', name: 'B' } }]);
    expect(list.numberOfItems).toBe(2);
    const els = list.itemListElement as Record<string, unknown>[];
    expect(els[0]).toEqual({ '@type': 'ListItem', position: 1, name: 'A', url: `${siteOrigin}/a` });
    expect(els[1].item).toEqual({ '@type': 'Thing', name: 'B' });
  });
});

describe('localBusiness', () => {
  const input = {
    name: 'Main Library',
    type: 'Library',
    address: { street: '100 Larkin Street', locality: 'San Francisco', region: 'CA', postalCode: '94102' },
    sourceUrl: 'https://sfpl.org/locations/main-library',
  };
  it('emits a PostalAddress and the given type', () => {
    expect(localBusiness(input)).toMatchObject({
      '@type': 'Library',
      address: { '@type': 'PostalAddress', streetAddress: '100 Larkin Street', addressCountry: 'US' },
    });
  });
  it('requires a source URL (no unverified listings)', () => {
    expect(() => localBusiness({ ...input, sourceUrl: '' })).toThrow(/sourceUrl/);
  });
});

describe('product', () => {
  it('never carries a rating or review', () => {
    const p = product({ name: 'Lamp', description: 'A lamp', offer: { price: 20, priceCurrency: 'USD', url: 'https://x.test' } });
    expect(p).toMatchObject({ '@type': 'Product', offers: { '@type': 'Offer', availability: 'https://schema.org/InStock' } });
    expect(JSON.stringify(p)).not.toMatch(/rating|review/i);
  });
});

describe('person / profilePage', () => {
  it('wraps the author Person in a ProfilePage', () => {
    expect(person(author)['@type']).toBe('Person');
    expect(profilePage(author)).toMatchObject({ '@type': 'ProfilePage', mainEntity: { '@type': 'Person' } });
  });
});
