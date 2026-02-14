import * as fs from 'fs';
import * as path from 'path';
import type { DailyPicks, ManualPick } from './types';

/**
 * Load picks from the content directory
 */
export function loadDailyPicks(date: string): DailyPicks | null {
  const picksDir = path.resolve(__dirname, '../../../src/content/picks');
  const filePath = path.join(picksDir, `${date}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`No picks found for ${date} at ${filePath}`);
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as DailyPicks;
}

/**
 * Get a specific pick by index
 */
export function getPick(date: string, index: number): ManualPick | null {
  const daily = loadDailyPicks(date);
  if (!daily || index < 0 || index >= daily.picks.length) {
    return null;
  }
  return daily.picks[index];
}

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
