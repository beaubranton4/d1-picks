// site-kit v0.1.0
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import { config } from '../config';
import { isProduction } from '../env';

/**
 * Analytics for every kit site, mounted once in the root layout.
 * - Vercel Web Analytics + Speed Insights: always rendered (the packages stay
 *   quiet off Vercel). Also enable both in the Vercel project settings.
 * - GA4: production only, and only when site.config.json sets ga4MeasurementId.
 */
export function Analytics() {
  const id = config.ga4MeasurementId;
  return (
    <>
      <VercelAnalytics />
      <SpeedInsights />
      {id && isProduction() ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}
