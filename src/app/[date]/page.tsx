import { permanentRedirect } from 'next/navigation';
import { PICK_DATES } from '@/lib/hardcoded-picks';

interface PageProps {
  params: Promise<{ date: string }>;
}

// Only legacy URLs for dates with real picks redirect. Anything else 404s.
export const dynamicParams = false;

// Redirect old /{date} URLs to /baseball/{date}
export default async function LegacyDateRedirect({ params }: PageProps) {
  const { date } = await params;
  permanentRedirect(`/baseball/${date}`);
}

export async function generateStaticParams() {
  return PICK_DATES.map(date => ({ date }));
}
