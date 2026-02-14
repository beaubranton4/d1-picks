import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ date: string }>;
}

// Redirect old /{date} URLs to /baseball/{date}
export default async function LegacyDateRedirect({ params }: PageProps) {
  const { date } = await params;
  redirect(`/baseball/${date}`);
}

// Generate static redirects for all dates from season start to today + 7 days
export async function generateStaticParams() {
  const dates: Array<{ date: string }> = [];

  // Season start date
  const seasonStart = new Date('2026-02-13');

  // Today + 7 days
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 7);

  // Generate all dates from season start to end date
  const current = new Date(seasonStart);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    dates.push({ date: dateStr });
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
