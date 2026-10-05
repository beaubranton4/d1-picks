import Link from 'next/link';
import { Breadcrumbs } from '@/kit/components/Breadcrumbs';
import { assertReleased } from '@/kit/release';
import { buildMetadata } from '@/kit/seo/metadata';
import { hasSport } from '@/site/data';
import { linkIndex } from '@/site/pages';

const PATH = '/hockey/predictions';

export const revalidate = 3600;

// Gated stub. It 404s in production until its date in content/release-schedule.json,
// and stays noindex (and out of the sitemap) until data/hockey/manifest.json exists.
export function generateMetadata() {
  assertReleased(PATH);
  const page = linkIndex().get(PATH);
  return buildMetadata({
    path: PATH,
    title: page?.title ?? 'College Hockey Predictions',
    description: page?.description ?? 'College hockey predictions are coming once our hockey model has a season of results and a published backtest behind it.',
    noindex: !hasSport('hockey'),
  });
}

export default function HockeyPredictions() {
  assertReleased(PATH);
  return (
    <div className="max-w-3xl">
      <Breadcrumbs items={linkIndex().breadcrumbs(PATH)} />
      <h1 className="display mt-4 text-5xl sm:text-6xl">College hockey predictions</h1>
      <p className="mt-4 text-lg">
        Not yet. Hockey goes up here once its model is fit to this season&apos;s results, backtested and written up on the methodology
        page, the same bar volleyball cleared first.
      </p>
      <p className="mt-4">
        Until then, the <Link href="/volleyball/predictions" className="underline">volleyball predictions</Link> are live, and every one
        is graded on the <Link href="/results" className="underline">results page</Link>.
      </p>
    </div>
  );
}
