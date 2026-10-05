import { NextResponse } from 'next/server';

// Unpublished: the 2026-02-13 article's claimed edges could not be traced to
// any saved odds or model output. 410 tells crawlers it is gone for good.
export function middleware() {
  return new NextResponse('Gone', {
    status: 410,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'x-robots-tag': 'noindex',
    },
  });
}

export const config = {
  matcher: ['/articles/2026-02-13'],
};
