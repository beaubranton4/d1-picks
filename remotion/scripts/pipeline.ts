/**
 * Full Pipeline: Render + Post
 *
 * Usage:
 *   npm run pipeline           # Render and post today's daily picks
 *   npm run pipeline 2026-02-14 # Specific date
 *   npm run pipeline:render    # Render only (no post)
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { loadDailyPicks, getTodayDate, formatDisplayDate } from '../src/lib/data';
import { postVideoToTikTok } from './post-video';

const OUTPUT_DIR = path.resolve(__dirname, '../output');
const ENTRY_POINT = path.resolve(__dirname, '../src/index.tsx');

interface PipelineOptions {
  date: string;
  skipPost: boolean;
}

async function runPipeline(options: PipelineOptions) {
  const { date, skipPost } = options;

  console.log('='.repeat(50));
  console.log('D1 PICKS VIDEO PIPELINE');
  console.log('='.repeat(50));
  console.log(`Date: ${date}`);
  console.log(`Mode: ${skipPost ? 'Render Only' : 'Render + Post'}`);
  console.log('='.repeat(50));
  console.log('');

  // Step 1: Load picks
  console.log('Step 1: Loading picks...');
  const dailyPicks = loadDailyPicks(date);
  if (!dailyPicks || dailyPicks.picks.length === 0) {
    console.error(`No picks found for ${date}`);
    console.error(`Expected file: src/content/picks/${date}.json`);
    process.exit(1);
  }
  console.log(`Found ${dailyPicks.picks.length} picks:`);
  dailyPicks.picks.forEach((pick, i) => {
    const ml = pick.moneyline > 0 ? `+${pick.moneyline}` : pick.moneyline;
    console.log(`  ${i + 1}. ${pick.team} ${ml} (${pick.pickLabel})`);
  });
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, `daily-picks-${date}.mp4`);

  // Step 2: Bundle
  console.log('Step 2: Bundling Remotion project...');
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

  // Step 3: Render
  console.log('Step 3: Rendering video...');
  const fps = 30;
  const duration = Math.max(15, 6 + dailyPicks.picks.length * 4);
  const durationInFrames = fps * duration;
  console.log(`  Duration: ${duration}s (${durationInFrames} frames)`);
  console.log(`  Resolution: 1080x1920 (TikTok vertical)`);

  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'DailyPicksVideo',
    inputProps: {
      picks: dailyPicks.picks,
      date: date,
    },
  });

  const adjustedComposition = {
    ...composition,
    durationInFrames,
  };

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
      process.stdout.write(`\r  Rendering: ${Math.round(progress * 100)}%`);
    },
  });
  const renderTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  Render complete! (${renderTime}s)`);
  console.log(`  Output: ${outputPath}`);
  console.log('');

  // Step 4: Post (if not skipped)
  if (skipPost) {
    console.log('Step 4: Skipping post (--no-post flag)');
    console.log('');
    console.log('='.repeat(50));
    console.log('PIPELINE COMPLETE (Render Only)');
    console.log('='.repeat(50));
    console.log(`Video ready at: ${outputPath}`);
    console.log('');
    console.log('To post manually:');
    console.log(`  npm run post -- "${outputPath}" "Today's D1 Picks"`);
    return outputPath;
  }

  console.log('Step 4: Posting to TikTok...');
  const displayDate = formatDisplayDate(date);
  const caption = `${displayDate} - ${dailyPicks.picks.length} picks today. Which one are you riding?`;

  const result = await postVideoToTikTok({
    videoPath: outputPath,
    caption,
    draft: true,
  });

  console.log('');
  console.log('='.repeat(50));
  if (result.success) {
    console.log('PIPELINE COMPLETE');
    console.log('='.repeat(50));
    console.log(`Video: ${outputPath}`);
    console.log(`Post ID: ${result.postId}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Open TikTok app');
    console.log('  2. Go to Drafts');
    console.log('  3. Add trending music');
    console.log('  4. Publish!');
  } else {
    console.log('PIPELINE FAILED');
    console.log('='.repeat(50));
    console.log(`Video rendered: ${outputPath}`);
    console.log(`Post error: ${result.error}`);
    console.log('');
    console.log('Video is ready, but posting failed. Try posting manually:');
    console.log(`  npm run post -- "${outputPath}" "${caption}"`);
    process.exit(1);
  }

  return outputPath;
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
D1 Picks Video Pipeline

Usage:
  npm run pipeline              # Render + post today's picks
  npm run pipeline 2026-02-14   # Render + post specific date
  npm run pipeline:render       # Render only (no post)
  npm run pipeline --no-post    # Render only (no post)

This script:
  1. Loads picks from src/content/picks/YYYY-MM-DD.json
  2. Bundles the Remotion project
  3. Renders the DailyPicksVideo composition
  4. Posts to TikTok as a draft (unless --no-post)

Output: remotion/output/daily-picks-YYYY-MM-DD.mp4
`);
    return;
  }

  // Parse arguments
  const skipPost = args.includes('--no-post') || process.argv[1].includes('pipeline:render');
  const dateArg = args.find(arg => /^\d{4}-\d{2}-\d{2}$/.test(arg));
  const date = dateArg || getTodayDate();

  await runPipeline({ date, skipPost });
}

main().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
