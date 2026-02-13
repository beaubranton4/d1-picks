import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to today's picks
  const today = new Date().toISOString().split('T')[0];
  redirect(`/${today}`);
}
