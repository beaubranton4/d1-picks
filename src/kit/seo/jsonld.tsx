// site-kit v0.1.0
/**
 * JSON-LD: one renderer and a builder per schema type the kit uses.
 *
 * Builders return plain objects (unit-tested for shape) and throw on missing
 * required inputs rather than emitting half-empty schema. House rules baked in:
 *   - Article author is a Person with a real profile URL; datePublished is the
 *     real release date; dateModified appears ONLY when you pass one.
 *   - faqPage is only ever rendered by <Faq>, next to the visible questions.
 *   - No rating/review builders: nothing here can emit a star rating, so a
 *     template cannot invent one. Add reviews only from a verified source.
 */
import { absoluteUrl, authorPath, config, getAuthor, siteOrigin } from '../config';

type Json = Record<string, unknown>;
const CONTEXT = 'https://schema.org';
const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function req<T>(value: T | undefined | null | '', what: string): T {
  if (value === undefined || value === null || value === '') throw new Error(`[site-kit] JSON-LD: ${what} is required`);
  return value;
}

export function JsonLd({ data }: { data: Json | Json[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

const orgRef = () => ({ '@type': 'Organization', '@id': `${siteOrigin}/#organization`, name: config.name, url: siteOrigin });

export function organization(): Json {
  return {
    '@context': CONTEXT,
    ...orgRef(),
    logo: absoluteUrl(config.organization.logo),
    description: config.description,
    ...(config.organization.sameAs.length ? { sameAs: config.organization.sameAs } : {}),
    ...(config.contactEmail ? { email: config.contactEmail } : {}),
  };
}

export function website(): Json {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': `${siteOrigin}/#website`,
    name: config.name,
    url: siteOrigin,
    description: config.tagline,
    inLanguage: config.language,
    publisher: { '@id': `${siteOrigin}/#organization` },
  };
}

export function breadcrumbList(items: { name: string; path: string }[]): Json {
  if (!items.length) throw new Error('[site-kit] JSON-LD: breadcrumbList needs at least one item');
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: req(it.name, 'breadcrumb name'),
      item: absoluteUrl(it.path),
    })),
  };
}

/** Only call through <Faq>, which renders the same questions visibly. */
export function faqPage(items: { question: string; answer: string }[]): Json {
  if (!items.length) throw new Error('[site-kit] JSON-LD: faqPage needs at least one question');
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: req(f.question, 'faq question'),
      acceptedAnswer: { '@type': 'Answer', text: req(f.answer, 'faq answer') },
    })),
  };
}

export function person(slug: string): Json {
  const a = getAuthor(slug);
  return {
    '@type': 'Person',
    '@id': `${absoluteUrl(authorPath(a.slug))}#person`,
    name: a.name,
    url: absoluteUrl(authorPath(a.slug)),
    description: a.bio,
    ...(a.photo ? { image: absoluteUrl(a.photo) } : {}),
    ...(a.sameAs.length ? { sameAs: a.sameAs } : {}),
  };
}

export function profilePage(slug: string): Json {
  return { '@context': CONTEXT, '@type': 'ProfilePage', mainEntity: person(slug) };
}

export function article(input: {
  path: string;
  title: string;
  description: string;
  datePublished: string;
  /** Only for a real material update. Omitted entirely when not passed. */
  dateModified?: string;
  author: string;
  image?: string;
  type?: 'Article' | 'BlogPosting' | 'NewsArticle';
}): Json {
  const published = req(input.datePublished, 'article datePublished');
  if (!DATE_RE.test(published)) throw new Error(`[site-kit] JSON-LD: datePublished "${published}" is not an ISO date`);
  if (input.dateModified && !DATE_RE.test(input.dateModified)) {
    throw new Error(`[site-kit] JSON-LD: dateModified "${input.dateModified}" is not an ISO date`);
  }
  const url = absoluteUrl(input.path);
  return {
    '@context': CONTEXT,
    '@type': input.type ?? 'Article',
    headline: req(input.title, 'article title'),
    description: req(input.description, 'article description'),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: published,
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    author: person(req(input.author, 'article author')),
    publisher: orgRef(),
    ...(input.image ? { image: [absoluteUrl(input.image)] } : {}),
    inLanguage: config.language,
  };
}

const withoutContext = ({ '@context': _ctx, ...rest }: Json) => rest;

export function itemList(items: ({ name: string; path: string } | { item: Json })[], name?: string): Json {
  return {
    '@context': CONTEXT,
    '@type': 'ItemList',
    ...(name ? { name } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((it, i) =>
      'item' in it
        ? { '@type': 'ListItem', position: i + 1, item: withoutContext(it.item) }
        : { '@type': 'ListItem', position: i + 1, name: it.name, url: absoluteUrl(it.path) },
    ),
  };
}

export type PostalAddress = { street: string; locality: string; region: string; postalCode: string; country?: string };

/**
 * A real, verified business. `sourceUrl` is required to make the
 * no-fabrication rule structural; it is not emitted (schema.org has no slot),
 * the page shows it to readers instead.
 */
export function localBusiness(input: {
  name: string;
  type?: string;
  address: PostalAddress;
  telephone?: string;
  url?: string;
  sourceUrl: string;
  sameAs?: string[];
}): Json {
  req(input.sourceUrl, `localBusiness "${input.name}" sourceUrl`);
  const a = req(input.address, 'localBusiness address');
  return {
    '@context': CONTEXT,
    '@type': input.type ?? 'LocalBusiness',
    name: req(input.name, 'localBusiness name'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: req(a.street, 'address street'),
      addressLocality: req(a.locality, 'address locality'),
      addressRegion: req(a.region, 'address region'),
      postalCode: req(a.postalCode, 'address postalCode'),
      addressCountry: a.country ?? 'US',
    },
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
  };
}

/** Product without ratings by design. Offers only from a verified price source. */
export function product(input: {
  name: string;
  description: string;
  image?: string;
  brand?: string;
  offer?: { price: number; priceCurrency: string; url: string; availability?: 'InStock' | 'OutOfStock' };
}): Json {
  return {
    '@context': CONTEXT,
    '@type': 'Product',
    name: req(input.name, 'product name'),
    description: req(input.description, 'product description'),
    ...(input.image ? { image: [absoluteUrl(input.image)] } : {}),
    ...(input.brand ? { brand: { '@type': 'Brand', name: input.brand } } : {}),
    ...(input.offer
      ? {
          offers: {
            '@type': 'Offer',
            price: input.offer.price,
            priceCurrency: input.offer.priceCurrency,
            url: input.offer.url,
            availability: `https://schema.org/${input.offer.availability ?? 'InStock'}`,
          },
        }
      : {}),
  };
}
