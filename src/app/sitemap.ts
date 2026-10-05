import type { MetadataRoute } from 'next';
import { buildSitemap } from '@/kit/seo/sitemap';
import { getAllPages } from '@/site/pages';

// Released pages only; regenerated hourly so scheduled pages join on their date.
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap(getAllPages());
}
