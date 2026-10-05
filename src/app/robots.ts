import type { MetadataRoute } from 'next';
import { buildRobots } from '@/kit/seo/robots';

// Evaluated per request so the RUNTIME environment decides: a preview
// deployment always disallows, production always allows.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return buildRobots();
}
