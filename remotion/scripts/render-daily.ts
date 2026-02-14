/**
 * Render Daily Picks Video
 *
 * Usage:
 *   npm run render:daily           # Today's date
 *   npm run render:daily 2026-02-14  # Specific date
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { loadDailyPicks, getTodayDate } from '../src/lib/data';

const OUTPUT_DIR = path.resolve(__dirname, '../output');
const ENTRY_POINT = path.resolve(__dirname, '../src/index.tsx');

async function main() {
  const date = process.argv[2] || getTodayDate();

  console.log(`Rendering daily picks video for ${date}...`);

  // Load picks data
  const dailyPicks = loadDailyPicks(date);
  if (!dailyPicks) {
    console.error(`No picks found for ${date}`);
    process.exit(1);
  }

  if (dailyPicks.picks.length === 0) {
    console.error(`No picks in file for ${date}`);
    process.exit(1);
  }

  console.log(`Found ${dailyPicks.picks.length} picks`);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, `daily-picks-${date}.mp4`);

  console.log('Bundling...');
  const bundled = await bundle({
    entryPoint: ENTRY_POINT,
    // Enable webpack caching for faster subsequent builds
    onProgress: (progress) => {
      if (progress % 10 === 0) {
        process.stdout.write(`\rBundling: ${progress}%`);
      }
    },
  });
  console.log('\nBundle complete');

  // Calculate duration based on number of picks
  // Base: 6 seconds (intro + outro) + 4 seconds per pick
  const fps = 30;
  const duration = Math.max(15, 6 + dailyPicks.picks.length * 4);
  const durationInFrames = fps * duration;

  console.log(`Video duration: ${duration}s (${durationInFrames} frames)`);

  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'DailyPicksVideo',
    inputProps: {
      picks: dailyPicks.picks,
      date: date,
    },
  });

  // Override duration based on pick count
  const adjustedComposition = {
    ...composition,
    durationInFrames,
  };

  console.log('Rendering video...');
  await renderMedia({
    composition: adjustedComposition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: {
      picks: dailyPicks.picks,
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
