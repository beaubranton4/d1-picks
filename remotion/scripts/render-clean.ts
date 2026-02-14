/**
 * Render Clean Video - Minimal, authentic TikTok style
 *
 * Usage:
 *   npm run render:clean           # Today's date
 *   npm run render:clean 2026-02-14  # Specific date
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { loadDailyPicks, getTodayDate } from './data-loader';

const OUTPUT_DIR = path.resolve(__dirname, '../output');
const ENTRY_POINT = path.resolve(__dirname, '../src/index.tsx');

async function main() {
  const args = process.argv.slice(2);
  const date = args.find(arg => /^\d{4}-\d{2}-\d{2}$/.test(arg)) || getTodayDate();

  console.log('');
  console.log('Rendering clean video for', date);
  console.log('');

  // Load picks data
  const dailyPicks = loadDailyPicks(date);
  if (!dailyPicks || dailyPicks.picks.length === 0) {
    console.error(`No picks found for ${date}`);
    process.exit(1);
  }

  console.log(`${dailyPicks.picks.length} picks:`);
  dailyPicks.picks.forEach((pick, i) => {
    const ml = pick.moneyline > 0 ? `+${pick.moneyline}` : pick.moneyline;
    console.log(`  ${pick.team} ${ml}`);
  });
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, `clean-${date}.mp4`);

  console.log('Bundling...');
  const bundled = await bundle({
    entryPoint: ENTRY_POINT,
    onProgress: (progress) => {
      if (progress % 25 === 0) {
        process.stdout.write(`\r  ${progress}%`);
      }
    },
  });
  console.log('\n');

  // Calculate duration: intro (3s) + picks (3.5s each) + CTA (3s)
  const fps = 30;
  const duration = 3 + (dailyPicks.picks.length * 3.5) + 3;
  const durationInFrames = Math.ceil(fps * duration);

  console.log(`Duration: ${duration.toFixed(1)}s`);
  console.log('');

  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'CleanVideo',
    inputProps: {
      picks: dailyPicks.picks,
      date: date,
    },
  });

  const adjustedComposition = {
    ...composition,
    durationInFrames,
  };

  console.log('Rendering...');
  const startTime = Date.now();
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
      process.stdout.write(`\r  ${Math.round(progress * 100)}%`);
    },
  });

  const renderTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nDone in ${renderTime}s`);
  console.log(`Output: ${outputPath}`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
