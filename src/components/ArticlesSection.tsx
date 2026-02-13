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
    <section className="mt-10 pt-8 border-t border-mlb-border">
      <h2 className="text-xl font-bold text-mlb-textPrimary mb-4">
        Latest Analysis
      </h2>
      <div className="space-y-4">
        {recentArticles.map(article => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            className="block bg-mlb-card rounded-lg border border-mlb-border p-4 hover:border-mlb-blue/50 hover:shadow-lg hover:shadow-mlb-blue/10 transition-all"
          >
            <h3 className="font-semibold text-mlb-textPrimary mb-1">
              {article.title}
            </h3>
            <p className="text-sm text-mlb-textSecondary line-clamp-2">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-mlb-textMuted">
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
