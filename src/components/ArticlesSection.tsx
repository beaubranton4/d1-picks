import { getAllArticles } from '@/lib/content/articles';
import Link from 'next/link';

interface ArticlesSectionProps {
  excludeDate?: string;
}

export async function ArticlesSection({ excludeDate }: ArticlesSectionProps) {
  const articles = await getAllArticles();

  // Filter out article for current date if already shown in banner
  const filteredArticles = excludeDate
    ? articles.filter(article => article.date !== excludeDate)
    : articles;

  if (filteredArticles.length === 0) {
    return null;
  }

  // Show latest 3 articles
  const recentArticles = filteredArticles.slice(0, 3);

  return (
    <section className="mt-10 pt-8 border-t">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Latest Analysis
      </h2>
      <div className="space-y-4">
        {recentArticles.map(article => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 mb-1">
              {article.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <time dateTime={article.publishedAt}>
                {new Date(article.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </time>
              <span>•</span>
              <span>{article.readTime}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
