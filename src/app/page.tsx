import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to today's baseball scoreboard
  const today = new Date().toISOString().split('T')[0];
  redirect(`/baseball/${today}`);
}
