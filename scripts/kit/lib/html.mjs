// site-kit v0.1.0
/**
 * Regex-level HTML inspection. Enough for Next's well-formed output; no
 * parser dependency. Script and style bodies are removed before counting
 * headings, links and text so inline data can never be mistaken for markup.
 */

export const stripScripts = (html) =>
  html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');

export function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** Attributes of a single tag string -> { name: value } (lowercased names). */
export function attrs(tag) {
  const out = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  const inner = tag.replace(/^<\s*[a-zA-Z0-9-]+/, '').replace(/\/?>$/, '');
  let m;
  while ((m = re.exec(inner))) out[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return out;
}

export const tags = (html, name) => html.match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) ?? [];

export function visibleText(html) {
  return decode(stripScripts(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Markup inside <main> (the page's own content, without header/footer chrome). */
export function mainHtml(html) {
  const m = stripScripts(html).match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : html;
}

export const mainText = (html) => visibleText(mainHtml(html));

export function inspectPage(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html;
  const body = stripScripts(html);
  const link = tags(head, 'link').map(attrs).find((a) => (a.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  const metas = tags(head, 'meta').map(attrs);
  const meta = (n) => metas.find((a) => (a.name ?? '').toLowerCase() === n)?.content;
  const jsonld = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  return {
    title: decode(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim(),
    canonical: link?.href,
    description: meta('description'),
    robots: [meta('robots'), meta('googlebot')].filter(Boolean).join(', '),
    h1Count: (body.match(/<h1\b/gi) ?? []).length,
    images: tags(body, 'img').map(attrs),
    links: tags(body, 'a').map(attrs).map((a) => a.href).filter(Boolean),
    jsonld,
  };
}
