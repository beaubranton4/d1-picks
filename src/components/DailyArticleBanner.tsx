import Link from 'next/link';
import { getArticleByDate } from '@/lib/content/articles';

interface DailyArticleBannerProps {
  date: string;
}

export async function DailyArticleBanner({ date }: DailyArticleBannerProps) {
  const article = await getArticleByDate(date);

  if (!article) {
    return null;
  }

  // Format the date for display
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-2 text-blue-200 text-sm font-medium mb-3">
          <span className="text-lg">📝</span>
          <span>TODAY'S ANALYSIS</span>
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
          {article.title}
        </h2>

        <p className="text-blue-100 mb-5 line-clamp-2">
          {article.excerpt}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link
            href={`/articles/${article.slug}`}
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            Read Full Analysis
            <span aria-hidden="true">→</span>
          </Link>
          <span className="text-blue-200 text-sm">
            {article.readTime}
          </span>
        </div>
      </div>
    </div>
  );
}
