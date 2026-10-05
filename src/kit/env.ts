// site-kit v0.1.0
/**
 * Which environment this build is for.
 *
 * VERCEL_ENV wins when it is set (Vercel sets it at build and at runtime).
 * Off Vercel, `next build`/`next start` count as production and `next dev`
 * counts as development, so a local production build behaves exactly like
 * the live site: unreleased pages 404 and robots allows crawling.
 *
 * Emulate a preview locally with VERCEL_ENV=preview.
 *
 * Pages read this at BUILD time (they are statically generated), so the
 * deployment's build environment decides what ships. Never promote a preview
 * deployment to production on Vercel: promote does not rebuild, so the
 * preview's noindex tags and unreleased pages would go live. See README.
 */
export type SiteEnv = 'production' | 'preview' | 'development';

export function siteEnv(): SiteEnv {
  const v = process.env.VERCEL_ENV;
  if (v === 'production' || v === 'preview' || v === 'development') return v;
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

export function isProduction(): boolean {
  return siteEnv() === 'production';
}
