// site-kit v0.1.0
/**
 * Renders a content Entry's MDX body (next-mdx-remote/rsc, server only).
 * JS expressions in MDX stay blocked (the library default), so content files
 * are data, not code. Components available inside MDX are listed here.
 */
import Link from 'next/link';
import type { ComponentProps, ComponentType } from 'react';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { AffiliateLink } from './components/AffiliateLink';
import { Img } from './components/Img';

function A({ href = '', ...rest }: ComponentProps<'a'>) {
  if (href.startsWith('/')) return <Link href={href} {...rest} />;
  return <a href={href} rel="noopener" target="_blank" {...rest} />;
}

const components = { a: A, AffiliateLink, Img };

export function Mdx({ source, extra }: { source: string; extra?: Record<string, ComponentType<never>> }) {
  return <MDXRemote source={source} components={{ ...components, ...extra }} />;
}
