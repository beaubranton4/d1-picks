// site-kit v0.1.0
/**
 * robots.txt. Production: allow everyone, and name the AI crawlers explicitly
 * so a later blanket rule cannot silently shut them out (non-JS AI crawlers
 * are why every page must ship server-rendered content). Anything else
 * (preview, dev): disallow all.
 */
import type { MetadataRoute } from 'next';
import { siteOrigin } from '../config';
import { isProduction } from '../env';

export const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'cohere-ai',
  'Meta-ExternalAgent',
];

export function buildRobots(opts: { disallow?: string[] } = {}): MetadataRoute.Robots {
  if (!isProduction()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  const disallow = opts.disallow ?? [];
  return {
    rules: [
      { userAgent: '*', allow: '/', ...(disallow.length ? { disallow } : {}) },
      { userAgent: AI_CRAWLERS, allow: '/', ...(disallow.length ? { disallow } : {}) },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
