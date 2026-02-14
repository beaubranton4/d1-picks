/**
 * Render Hype Video - The exciting TikTok-style format
 *
 * Usage:
 *   npm run render:hype           # Today's date
 *   npm run render:hype 2026-02-14  # Specific date
 *   npm run render:hype 2026-02-14 --screenshot  # Include website screenshot
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { loadDailyPicks, getTodayDate } from './data-loader';
import { captureScreenshot } from './capture-screenshot';

const OUTPUT_DIR = path.resolve(__dirname, '../output');
const ASSETS_DIR = path.resolve(__dirname, '../src/assets');
const ENTRY_POINT = path.resolve(__dirname, '../src/index.tsx');

// Hook templates for variety
const hooks = [
  { text: 'STOP SCROLLING', subtext: 'You need to see these picks' },
  { text: 'THE BOOKS HATE THIS', subtext: '3 bets they don\'t want you to make' },
  { text: 'FREE MONEY ALERT', subtext: 'The model found an edge' },
  { text: 'WE\'RE EATING TODAY', subtext: 'Let\'s ride' },
  { text: 'OPENING DAY LOCKS', subtext: 'College baseball is BACK' },
  { text: 'BEST BETS TODAY', subtext: 'Don\'t miss these' },
  { text: 'LOCK IT IN', subtext: 'Thank me later' },
];

function getRandomHook() {
  return hooks[Math.floor(Math.random() * hooks.length)];
}

async function main() {
  const args = process.argv.slice(2);
  const date = args.find(arg => /^\d{4}-\d{2}-\d{2}$/.test(arg)) || getTodayDate();
  const includeScreenshot = args.includes('--screenshot');

  console.log('='.repeat(50));
  console.log('RENDERING HYPE VIDEO');
  console.log('='.repeat(50));
  console.log(`Date: ${date}`);
  console.log(`Include screenshot: ${includeScreenshot}`);
  console.log('');

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

  console.log(`Found ${dailyPicks.picks.length} picks:`);
  dailyPicks.picks.forEach((pick, i) => {
    const ml = pick.moneyline > 0 ? `+${pick.moneyline}` : pick.moneyline;
    console.log(`  ${i + 1}. ${pick.team} ${ml} (${pick.pickLabel})`);
  });
  console.log('');

  // Optionally capture screenshot
  let screenshotPath: string | undefined;
  if (includeScreenshot) {
    console.log('Capturing website screenshot...');
    try {
      const fullPath = await captureScreenshot({ date });
      // Convert to relative path for staticFile
      screenshotPath = path.relative(path.resolve(__dirname, '../public'), fullPath);
      console.log(`Screenshot captured: ${screenshotPath}`);
    } catch (err) {
      console.warn('Screenshot capture failed, continuing without it:', err);
    }
    console.log('');
  }

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, `hype-${date}.mp4`);

  // Select a random hook for this video
  const hook = getRandomHook();
  console.log(`Hook: "${hook.text}" - "${hook.subtext}"`);
  console.log('');

  console.log('Bundling...');
  const bundled = await bundle({
    entryPoint: ENTRY_POINT,
    onProgress: (progress) => {
      if (progress % 20 === 0) {
        process.stdout.write(`\r  Progress: ${progress}%`);
      }
    },
  });
  console.log('\n  Bundle complete!');
  console.log('');

  // Calculate duration: hook (2.5s) + picks (3s each) + website (3s if screenshot) + CTA (3s)
  const fps = 30;
  const pickDuration = 3;
  const baseDuration = 2.5 + 3; // hook + CTA
  const websiteDuration = screenshotPath ? 3 : 0;
  const totalDuration = baseDuration + (dailyPicks.picks.length * pickDuration) + websiteDuration;
  const durationInFrames = Math.ceil(fps * totalDuration);

  console.log(`Video duration: ${totalDuration.toFixed(1)}s (${durationInFrames} frames)`);
  console.log('');

  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'HypeVideo',
    inputProps: {
      picks: dailyPicks.picks,
      date: date,
      hook: hook,
      screenshotPath: screenshotPath,
    },
  });

  // Override duration
  const adjustedComposition = {
    ...composition,
    durationInFrames,
  };

  console.log('Rendering video...');
  const startTime = Date.now();
  await renderMedia({
    composition: adjustedComposition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: {
      picks: dailyPicks.picks,
      date: date,
      hook: hook,
      screenshotPath: screenshotPath,
    },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r  Rendering: ${Math.round(progress * 100)}%`);
    },
  });
  const renderTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\nVideo rendered successfully! (${renderTime}s)`);
  console.log('='.repeat(50));
  console.log(`Output: ${outputPath}`);
  console.log('');
  console.log('To post to TikTok:');
  console.log(`  npm run post -- "${outputPath}" "${hook.text}"`);

  return outputPath;
}

main().catch((err) => {
  console.error('Render failed:', err);
  process.exit(1);
});
