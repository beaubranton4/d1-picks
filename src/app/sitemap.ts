import type { MetadataRoute } from 'next';
import { PICK_DATES } from '@/lib/hardcoded-picks';

const SITE_URL = 'https://www.d1picks.com';

// Only pages that render real picks belong here. No redirects, no empty dates.
export default function sitemap(): MetadataRoute.Sitemap {
  return PICK_DATES.map(date => ({
    url: `${SITE_URL}/baseball/${date}`,
    lastModified: date,
    changeFrequency: 'yearly',
    priority: 0.8,
  }));
}
