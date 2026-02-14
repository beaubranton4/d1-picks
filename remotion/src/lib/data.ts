/**
 * Utility functions for data formatting
 * Note: File loading happens in scripts/, not in browser components
 */

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Format date for display (e.g., "February 14, 2026")
 */
export function formatDisplayDate(date: string): string {
  const d = new Date(date + 'T12:00:00'); // Add time to avoid timezone issues
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
