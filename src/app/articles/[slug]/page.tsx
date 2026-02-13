import { getArticleBySlug, getAllArticles } from '@/lib/content/articles';
import { MDXRemote } from 'next-mdx-remote/rsc';
import type { Metadata } from 'next';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { metadata } = await getArticleBySlug(slug);

  return {
    title: metadata.title,
    description: metadata.excerpt,
    keywords: metadata.keywords.join(', '),
    openGraph: {
      title: metadata.title,
      description: metadata.excerpt,
      type: 'article',
      publishedTime: metadata.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: metadata.title,
      description: metadata.excerpt,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const { metadata, content } = await getArticleBySlug(slug);

  // Schema.org JSON-LD for SEO
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": metadata.title,
    "description": metadata.excerpt,
    "author": {
      "@type": "Organization",
      "name": metadata.author
    },
    "publisher": {
      "@type": "Organization",
      "name": "D1 Baseball Picks",
      "logo": {
        "@type": "ImageObject",
        "url": "/d1-picks-logo.png"
      }
    },
    "datePublished": metadata.publishedAt,
    "mainEntityOfPage": `/articles/${slug}`,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Article Header */}
        <header className="mb-12">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">
            {metadata.title}
          </h1>
          <div className="flex items-center gap-4 text-gray-600 text-sm">
            <time dateTime={metadata.publishedAt}>
              {new Date(metadata.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </time>
            <span>•</span>
            <span>{metadata.readTime}</span>
          </div>
        </header>

        {/* Article Content */}
        <article className="prose prose-lg max-w-none">
          <MDXRemote source={content} />
        </article>

        {/* Call to Action Footer */}
        <footer className="mt-16 pt-8 border-t">
          <div className="bg-blue-50 p-6 rounded-lg text-center">
            <h3 className="text-xl font-bold mb-2">Ready to see the picks?</h3>
            <p className="text-gray-700 mb-4">
              Check out our live +EV picks with real-time odds
            </p>
            <a
              href={`/${metadata.date}`}
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View Picks for {new Date(metadata.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} →
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map(article => ({ slug: article.slug }));
}
