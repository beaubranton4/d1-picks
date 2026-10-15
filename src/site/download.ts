/**
 * CSV downloads share their page's release gate: until the page is released
 * (in production) the file is a 404 too, so a download cannot leak a page
 * that is not live. Dynamic, so the gate is checked on every request.
 */
import { isReleased } from '@/kit/release';

export function csvResponse(pagePath: string, filename: string, build: () => string): Response {
  if (!isReleased(pagePath)) return new Response('Not found', { status: 404 });
  return new Response(build(), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
