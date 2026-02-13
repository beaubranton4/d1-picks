/**
 * Add text overlays to images for TikTok slideshows
 *
 * Usage:
 *   npx tsx scripts/add-text-overlay.ts --input image.png --text "Your text" --output output.png
 */

import { createCanvas, loadImage, registerFont } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load text overlay config
const promptsPath = path.join(__dirname, '../templates/image-prompts.json');
const config = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
const textConfig = config.textOverlay.style;

interface TextOverlayOptions {
  inputPath: string;
  outputPath: string;
  text: string;
  position?: 'top' | 'center' | 'bottom';
  fontSizeOverride?: number;
}

/**
 * Wrap text to fit within max width
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Add text overlay to an image
 */
async function addTextOverlay(options: TextOverlayOptions): Promise<string> {
  const { inputPath, outputPath, text, position = 'top', fontSizeOverride } = options;

  // Load the image
  const image = await loadImage(inputPath);
  const width = image.width;
  const height = image.height;

  // Create canvas
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw the original image
  ctx.drawImage(image, 0, 0);

  // Calculate font size (6.5% of height per the article)
  const fontSize = fontSizeOverride || Math.round(height * (textConfig.fontSizePercent / 100));
  const maxWidth = width * (textConfig.maxWidthPercent / 100);

  // Set up text style
  ctx.font = `${textConfig.fontWeight} ${fontSize}px ${textConfig.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Wrap text
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * textConfig.lineHeight;
  const totalTextHeight = lines.length * lineHeight;

  // Calculate Y position
  let startY: number;
  const positions = config.textOverlay.positions;

  switch (position) {
    case 'top':
      startY = positions.top.y;
      break;
    case 'center':
      startY = (height - totalTextHeight) / 2;
      break;
    case 'bottom':
      startY = height + positions.bottom.y - totalTextHeight;
      break;
    default:
      startY = positions.top.y;
  }

  // Draw text with stroke (outline) and fill
  const centerX = width / 2;

  for (let i = 0; i < lines.length; i++) {
    const y = startY + (i * lineHeight);

    // Draw stroke (outline)
    ctx.strokeStyle = textConfig.strokeColor;
    ctx.lineWidth = textConfig.strokeWidth;
    ctx.lineJoin = 'round';
    ctx.strokeText(lines[i], centerX, y);

    // Draw fill
    ctx.fillStyle = textConfig.fillColor;
    ctx.fillText(lines[i], centerX, y);
  }

  // Save the result
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`Text overlay added: ${outputPath}`);
  return outputPath;
}

/**
 * Process multiple slides with their text
 */
async function processSlideshow(
  slides: Array<{ imagePath: string; text: string; position?: 'top' | 'center' | 'bottom' }>,
  outputDir: string
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    // Skip if no image (e.g., screenshot placeholder)
    if (!slide.imagePath || !fs.existsSync(slide.imagePath)) {
      console.log(`Slide ${i + 1}: No image, skipping text overlay`);
      results.push('');
      continue;
    }

    const outputPath = path.join(outputDir, `slide-${i + 1}-text.png`);

    await addTextOverlay({
      inputPath: slide.imagePath,
      outputPath,
      text: slide.text,
      position: slide.position || 'top',
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
Text Overlay Tool

Usage:
  npx tsx scripts/add-text-overlay.ts [options]

Options:
  --input, -i     Input image path
  --output, -o    Output image path
  --text, -t      Text to overlay
  --position, -p  Position: top, center, or bottom (default: top)
  --help, -h      Show this help

Examples:
  npx tsx scripts/add-text-overlay.ts -i slide.png -t "My roommate said..." -o slide-text.png
  npx tsx scripts/add-text-overlay.ts -i slide.png -t "d1pix.com" -p bottom -o slide-cta.png
`);
    return;
  }

  // Parse arguments
  let inputPath = '';
  let outputPath = '';
  let text = '';
  let position: 'top' | 'center' | 'bottom' = 'top';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
      case '-i':
        inputPath = args[++i];
        break;
      case '--output':
      case '-o':
        outputPath = args[++i];
        break;
      case '--text':
      case '-t':
        text = args[++i];
        break;
      case '--position':
      case '-p':
        position = args[++i] as 'top' | 'center' | 'bottom';
        break;
    }
  }

  // Validate
  if (!inputPath || !text || !outputPath) {
    console.error('Error: --input, --text, and --output are required');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  await addTextOverlay({ inputPath, outputPath, text, position });
  console.log('Done!');
}

// Export for use as module
export { addTextOverlay, processSlideshow, wrapText };

// Run if called directly
main().catch(console.error);
