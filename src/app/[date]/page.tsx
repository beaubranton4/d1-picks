import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ date: string }>;
}

// Redirect old /{date} URLs to /baseball/{date}
export default async function LegacyDateRedirect({ params }: PageProps) {
  const { date } = await params;
  redirect(`/baseball/${date}`);
}

// Generate static redirects for upcoming dates
export async function generateStaticParams() {
  const dates: Array<{ date: string }> = [];
  const today = new Date();

  // Generate redirects for next 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dates.push({ date: dateStr });
  }

  // Always include hardcoded pick dates
  const hardcodedDates = ['2026-02-13', '2026-02-14'];
  for (const dateStr of hardcodedDates) {
    if (!dates.some(d => d.date === dateStr)) {
      dates.push({ date: dateStr });
    }
  }

  return dates;
}
