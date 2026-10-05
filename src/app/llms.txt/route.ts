import { buildLlmsTxt } from '@/kit/seo/llms';
import { getAllPages } from '@/site/pages';

export const revalidate = 3600;

export function GET() {
  return new Response(buildLlmsTxt(getAllPages()), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
