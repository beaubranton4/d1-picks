/**
 * The page registry: every page on the site, in one list.
 *
 * The sitemap, llms.txt, breadcrumbs, hub listings, related links and the
 * orphan check all read from here (through src/kit/links.ts, which drops
 * unreleased pages). A page that is not registered here is invisible to all
 * of them, so add new routes here when you add them to src/app.
 */
import { config } from '@/kit/config';
import { getCollection } from '@/kit/content';
import { createLinkIndex, type PageEntry } from '@/kit/links';
import { hasSport } from './data';

/** Header navigation. Every page links to these. */
export const NAV = [
  { name: 'Predictions', path: '/volleyball/predictions' },
  { name: 'Ratings', path: '/volleyball/ratings' },
  { name: 'Results', path: '/results' },
  { name: 'Methodology', path: '/methodology' },
];

export const FOOTER = [
  { name: 'About', path: '/about' },
  { name: 'Editorial policy', path: '/editorial-policy' },
  { name: 'Responsible gambling', path: '/responsible-gambling' },
  { name: 'Methodology', path: '/methodology' },
];

export function getAllPages(): PageEntry[] {
  const games: PageEntry[] = getCollection('volleyballGames').map((e) => ({
    path: e.path,
    title: e.title,
    description: e.description,
    type: 'article',
    parent: '/volleyball/predictions',
    tags: e.tags,
    publishDate: e.publishDate,
    updatedDate: e.updatedDate,
  }));

  return [
    { path: '/', title: config.name, label: 'Home', description: config.description, type: 'home' },
    {
      path: '/volleyball/predictions',
      title: 'College Volleyball Predictions',
      label: 'Volleyball predictions',
      description: "Win probabilities, set-score odds and fair lines for every upcoming D1 women's volleyball match, from our published rating model.",
      type: 'hub',
      parent: '/',
    },
    ...games,
    {
      path: '/volleyball/ratings',
      title: 'NCAA Volleyball Ratings',
      label: 'Volleyball ratings',
      description: "Model ratings for every D1 women's volleyball team, updated daily from this season's results, with strength of schedule and the AVCA poll.",
      type: 'hub',
      parent: '/',
    },
    {
      path: '/results',
      title: 'Prediction Results',
      label: 'Results',
      description: 'Every D1 Picks prediction, logged before first serve and graded after the match, with the running record, Brier score and calibration.',
      type: 'hub',
      parent: '/',
    },
    {
      path: '/methodology',
      title: 'Methodology',
      description: 'How the D1 Picks volleyball model works: the data source, the Bradley-Terry ratings, calibration, the backtest and what the model cannot see.',
      type: 'about',
      parent: '/',
    },
    {
      path: '/hockey/predictions',
      title: 'College Hockey Predictions',
      label: 'Hockey predictions',
      description: 'College hockey predictions are coming once our hockey model has a season of results and a published backtest behind it.',
      type: 'hub',
      parent: '/',
      // A stub until data/hockey exists: never in the sitemap or llms.txt.
      indexable: hasSport('hockey'),
    },
    { path: '/about', title: `About ${config.name}`, label: 'About', description: config.description, type: 'about', parent: '/' },
    {
      path: '/editorial-policy',
      title: 'Editorial Policy',
      description: 'How D1 Picks publishes: automated model pages, the guardrails that replace human review, sourcing, corrections and why there are no affiliate links.',
      type: 'policy',
      parent: '/about',
    },
    {
      path: '/responsible-gambling',
      title: 'Responsible Gambling',
      description: 'D1 Picks is for adults 21 and over, and nothing on it is certain. Where to get confidential help for problem gambling by phone, text or chat.',
      type: 'policy',
      parent: '/about',
    },
    ...config.authors.map<PageEntry>((a) => ({
      path: `/authors/${a.slug}`,
      title: a.name,
      description: a.bio,
      type: 'author',
      parent: '/about',
    })),
  ];
}

/**
 * Released pages only. Built fresh on every call (content files themselves are
 * cached by src/kit/content.ts): release state depends on the clock, and a
 * cached index would disagree with assertReleased() in the window after a
 * page's date passes. Building it is a linear pass over the registry.
 */
export function linkIndex() {
  return createLinkIndex(getAllPages());
}
