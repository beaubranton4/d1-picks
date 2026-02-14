/**
 * Render Single Pick Video
 *
 * Usage:
 *   npm run render:pick 2026-02-14 0    # First pick of the day
 *   npm run render:pick 2026-02-14 1    # Second pick
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { loadDailyPicks, getPick, getTodayDate } from '../src/lib/data';

const OUTPUT_DIR = path.resolve(__dirname, '../output');
const ENTRY_POINT = path.resolve(__dirname, '../src/index.tsx');

async function main() {
  const date = process.argv[2] || getTodayDate();
  const pickIndex = parseInt(process.argv[3] || '0', 10);

  console.log(`Rendering single pick video for ${date}, pick #${pickIndex + 1}...`);

  // Load pick data
  const pick = getPick(date, pickIndex);
  if (!pick) {
    const dailyPicks = loadDailyPicks(date);
    if (!dailyPicks) {
      console.error(`No picks found for ${date}`);
    } else {
      console.error(`Pick index ${pickIndex} out of range. Available: 0-${dailyPicks.picks.length - 1}`);
    }
    process.exit(1);
  }

  console.log(`Pick: ${pick.team} ${pick.moneyline > 0 ? '+' : ''}${pick.moneyline} (${pick.pickLabel})`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Sanitize team name for filename
  const teamSlug = pick.team.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const outputPath = path.join(OUTPUT_DIR, `pick-${date}-${teamSlug}.mp4`);

  console.log('Bundling...');
  const bundled = await bundle({
    entryPoint: ENTRY_POINT,
    onProgress: (progress) => {
      if (progress % 10 === 0) {
        process.stdout.write(`\rBundling: ${progress}%`);
      }
    },
  });
  console.log('\nBundle complete');

  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'SinglePickVideo',
    inputProps: {
      pick: pick,
      date: date,
    },
  });

  console.log('Rendering video...');
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: {
      pick: pick,
      date: date,
    },
    onProgress: ({ progress }) => {
      process.stdout.write(`\rRendering: ${Math.round(progress * 100)}%`);
    },
  });

  console.log(`\n\nVideo rendered successfully!`);
  console.log(`Output: ${outputPath}`);

  return outputPath;
}

main().catch((err) => {
  console.error('Render failed:', err);
  process.exit(1);
});
