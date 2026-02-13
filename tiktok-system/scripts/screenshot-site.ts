/**
 * Take screenshots of d1pix.com for TikTok slideshows
 *
 * Usage:
 *   npx tsx scripts/screenshot-site.ts --output screenshot.png
 *   npx tsx scripts/screenshot-site.ts --url https://d1pix.com --selector ".bet-card" --output card.png
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

import 'dotenv/config';

const DEFAULT_URL = process.env.SITE_URL || 'https://d1pix.com';

interface ScreenshotOptions {
  url?: string;
  selector?: string;
  outputPath: string;
  width?: number;
  height?: number;
  waitFor?: number;
  fullPage?: boolean;
}

/**
 * Take a screenshot of a webpage or element
 */
async function takeScreenshot(options: ScreenshotOptions): Promise<string> {
  const {
    url = DEFAULT_URL,
    selector,
    outputPath,
    width = 430,  // iPhone 14 Pro Max width
    height = 932, // iPhone 14 Pro Max height
    waitFor = 2000,
    fullPage = false,
  } = options;

  console.log(`Taking screenshot of: ${url}`);
  if (selector) {
    console.log(`Targeting selector: ${selector}`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set mobile viewport
    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 2, // Retina quality
      isMobile: true,
      hasTouch: true,
    });

    // Set mobile user agent
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );

    // Navigate to page
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, waitFor));

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (selector) {
      // Screenshot specific element
      const element = await page.$(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      await element.screenshot({
        path: outputPath,
        type: 'png',
      });
    } else {
      // Screenshot full page or viewport
      await page.screenshot({
        path: outputPath,
        type: 'png',
        fullPage,
      });
    }

    console.log(`Screenshot saved: ${outputPath}`);
    return outputPath;

  } finally {
    await browser.close();
  }
}

/**
 * Take screenshot of a STRONG BET card
 */
async function screenshotStrongBet(outputPath: string): Promise<string> {
  // Try to find a strong bet card on the homepage
  const selectors = [
    '[data-bet-type="STRONG"]',
    '.strong-bet',
    '.bet-card:first-child',
    'article:first-child',
  ];

  for (const selector of selectors) {
    try {
      return await takeScreenshot({
        outputPath,
        selector,
        waitFor: 3000,
      });
    } catch (e) {
      console.log(`Selector ${selector} not found, trying next...`);
    }
  }

  // Fallback to full page screenshot
  console.log('No specific bet card found, taking viewport screenshot');
  return await takeScreenshot({
    outputPath,
    fullPage: false,
    waitFor: 3000,
  });
}

/**
 * Take multiple screenshots for different pages/states
 */
async function screenshotSlideshow(
  outputDir: string,
  pages: Array<{ url?: string; selector?: string; name: string }>
): Promise<string[]> {
  const results: string[] = [];

  for (const page of pages) {
    const outputPath = path.join(outputDir, `${page.name}.png`);
    await takeScreenshot({
      url: page.url,
      selector: page.selector,
      outputPath,
    });
    results.push(outputPath);
  }

  return results;
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Screenshot Tool

Usage:
  npx tsx scripts/screenshot-site.ts [options]

Options:
  --url, -u       URL to screenshot (default: ${DEFAULT_URL})
  --selector, -s  CSS selector for specific element
  --output, -o    Output file path (required)
  --width, -w     Viewport width (default: 430)
  --height        Viewport height (default: 932)
  --full-page     Capture full scrollable page
  --wait          Wait time in ms before screenshot (default: 2000)
  --strong-bet    Automatically find and screenshot a STRONG BET card
  --help, -h      Show this help

Examples:
  npx tsx scripts/screenshot-site.ts --output ./output/homepage.png
  npx tsx scripts/screenshot-site.ts --selector ".bet-card" --output ./output/card.png
  npx tsx scripts/screenshot-site.ts --strong-bet --output ./output/strong-bet.png
`);
    return;
  }

  // Check for --strong-bet flag
  if (args.includes('--strong-bet')) {
    const outputIndex = args.indexOf('--output') !== -1 ? args.indexOf('--output') : args.indexOf('-o');
    if (outputIndex === -1) {
      console.error('Error: --output is required');
      process.exit(1);
    }
    const outputPath = args[outputIndex + 1];
    await screenshotStrongBet(outputPath);
    return;
  }

  // Parse arguments
  let url: string | undefined;
  let selector: string | undefined;
  let outputPath = '';
  let width = 430;
  let height = 932;
  let fullPage = false;
  let waitFor = 2000;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
      case '-u':
        url = args[++i];
        break;
      case '--selector':
      case '-s':
        selector = args[++i];
        break;
      case '--output':
      case '-o':
        outputPath = args[++i];
        break;
      case '--width':
      case '-w':
        width = parseInt(args[++i], 10);
        break;
      case '--height':
        height = parseInt(args[++i], 10);
        break;
      case '--full-page':
        fullPage = true;
        break;
      case '--wait':
        waitFor = parseInt(args[++i], 10);
        break;
    }
  }

  // Validate
  if (!outputPath) {
    console.error('Error: --output is required');
    process.exit(1);
  }

  await takeScreenshot({ url, selector, outputPath, width, height, fullPage, waitFor });
  console.log('Done!');
}

// Export for use as module
export { takeScreenshot, screenshotStrongBet, screenshotSlideshow };

// Run if called directly
main().catch(console.error);
