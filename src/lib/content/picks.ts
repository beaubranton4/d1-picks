import fs from 'fs';
import path from 'path';
import type { DailyPicks, ManualPick } from '@/lib/types';

const picksDirectory = path.join(process.cwd(), 'src/content/picks');

export async function getPicksForDate(date: string): Promise<ManualPick[]> {
  const filePath = path.join(picksDirectory, `${date}.json`);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data: DailyPicks = JSON.parse(fileContents);
    return data.picks || [];
  } catch (error) {
    console.error(`Error loading picks for ${date}:`, error);
    return [];
  }
}

export async function getAllPicksDates(): Promise<string[]> {
  if (!fs.existsSync(picksDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(picksDirectory);
  return fileNames
    .filter(name => name.endsWith('.json'))
    .map(fileName => fileName.replace(/\.json$/, ''))
    .sort((a, b) => b.localeCompare(a)); // Most recent first
}
