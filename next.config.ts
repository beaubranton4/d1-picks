import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Content and the pipeline's data are read with fs at request time during
  // ISR revalidation, so the serverless bundle must carry them. Without this,
  // a page revalidating on Vercel cannot find its .mdx or .json file.
  outputFileTracingIncludes: {
    '/**': ['./content/**/*', './data/**/*'],
  },
  poweredByHeader: false,
  // apex -> www is a Vercel domain redirect (canonicalHost is www.d1picks.com), not code here.
  // Retired or renamed pages: one permanent hop to the closest live parent.
  async redirects() {
    return [
      // The old app's /baseball/{date}, /{date} and /articles/* URLs are not redirected: they
      // carried fabricated picks, and nothing here replaces them, so they 404 (no soft-404 to home).
    ];
  },
};

export default nextConfig;
