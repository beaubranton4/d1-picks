/**
 * Capture screenshots of d1picks.com for video backgrounds
 *
 * Usage:
 *   npm run screenshot           # Today's page
 *   npm run screenshot 2026-02-14  # Specific date
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { getTodayDate } from './data-loader';

const ASSETS_DIR = path.resolve(__dirname, '../src/assets');
const SCREENSHOT_WIDTH = 1080;
const SCREENSHOT_HEIGHT = 1920;

interface ScreenshotOptions {
  date: string;
  fullPage?: boolean;
  mobile?: boolean;
}

async function captureScreenshot(options: ScreenshotOptions): Promise<string> {
  const { date, fullPage = false, mobile = true } = options;

  // Ensure assets directory exists
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  const outputPath = path.join(ASSETS_DIR, `screenshot-${date}.png`);
  const url = `https://d1picks.com/baseball/${date}`;

  console.log(`Capturing screenshot of ${url}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set mobile viewport for TikTok-style vertical video
    if (mobile) {
      await page.setViewport({
        width: SCREENSHOT_WIDTH,
        height: SCREENSHOT_HEIGHT,
        deviceScaleFactor: 2, // Retina quality
        isMobile: true,
      });
    } else {
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 2,
      });
    }

    // Navigate and wait for content
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait a bit for any animations to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      fullPage: fullPage,
      type: 'png',
    });

    console.log(`Screenshot saved: ${outputPath}`);
    return outputPath;
  } finally {
    await browser.close();
  }
}

/**
 * Capture multiple screenshot variations
 */
async function captureAllVariations(date: string): Promise<string[]> {
  const screenshots: string[] = [];

  // Mobile viewport (main screenshot for videos)
  const mobilePath = await captureScreenshot({ date, mobile: true });
  screenshots.push(mobilePath);

  return screenshots;
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Screenshot Capture Tool

Usage:
  npm run screenshot              # Capture today's page
  npm run screenshot 2026-02-14   # Capture specific date

Options:
  --full    Capture full page (scrollable)
  --help    Show this help

Output: src/assets/screenshot-YYYY-MM-DD.png
`);
    return;
  }

  const date = args.find(arg => /^\d{4}-\d{2}-\d{2}$/.test(arg)) || getTodayDate();
  const fullPage = args.includes('--full');

  await captureScreenshot({ date, fullPage });
}

// Export for use as module
export { captureScreenshot, captureAllVariations };

// Run if called directly
main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
