// site-kit v0.1.0
import { JsonLd, faqPage } from '../seo/jsonld';

/**
 * Visible FAQ and its FAQPage schema, always together, so schema never exists
 * without the content it describes. Since 2023 Google shows FAQ rich results
 * only for authoritative government and health sites; we keep the schema for
 * clarity and for LLM answer engines, not for a SERP feature.
 */
export function Faq({ items, title = 'Frequently asked questions' }: { items: { question: string; answer: string }[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="faq-heading" className="mt-10">
      <h2 id="faq-heading" className="text-xl font-semibold">
        {title}
      </h2>
      <div className="mt-3 space-y-5">
        {items.map((f) => (
          <div key={f.question}>
            <h3 className="font-semibold">{f.question}</h3>
            <p className="mt-1">{f.answer}</p>
          </div>
        ))}
      </div>
      <JsonLd data={faqPage(items)} />
    </section>
  );
}
