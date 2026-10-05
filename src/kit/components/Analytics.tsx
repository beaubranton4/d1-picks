// site-kit v0.1.0
import Script from 'next/script';
import { config } from '../config';
import { isProduction } from '../env';

/** GA4, production only, and only when site.config.json sets ga4MeasurementId. */
export function Analytics() {
  const id = config.ga4MeasurementId;
  if (!id || !isProduction()) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
