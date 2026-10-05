// site-kit v0.1.0
/**
 * llms.txt (https://llmstxt.org): a plain-markdown map of the site for LLM
 * agents, built from the same released-only registry as the sitemap.
 */
import { absoluteUrl, config } from '../config';
import { createLinkIndex, type PageEntry, type PageType } from '../links';

const SECTION_ORDER: [PageType, string][] = [
  ['hub', 'Sections'],
  ['tool', 'Tools'],
  ['directory', 'Directory'],
  ['article', 'Guides'],
  ['about', 'About'],
  ['policy', 'About'],
  ['author', 'Authors'],
];

export function buildLlmsTxt(pages: PageEntry[]): string {
  const index = createLinkIndex(pages);
  const sections = new Map<string, string[]>();
  for (const [type, heading] of SECTION_ORDER) {
    for (const p of index.pages.filter((x) => x.type === type && x.indexable !== false)) {
      const line = `- [${p.title}](${absoluteUrl(p.path)})${p.description ? `: ${p.description}` : ''}`;
      sections.set(heading, [...(sections.get(heading) ?? []), line]);
    }
  }
  const out = [`# ${config.name}`, '', `> ${config.tagline}`, '', config.description, ''];
  for (const [heading, lines] of sections) out.push(`## ${heading}`, '', ...lines, '');
  return out.join('\n');
}
