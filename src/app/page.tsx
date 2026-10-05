import { redirect } from 'next/navigation';
import { PICK_DATES } from '@/lib/hardcoded-picks';

export default function HomePage() {
  // Redirect to the most recent date that has real picks
  redirect(`/baseball/${PICK_DATES[PICK_DATES.length - 1]}`);
}
