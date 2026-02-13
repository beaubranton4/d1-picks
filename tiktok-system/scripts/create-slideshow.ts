/**
 * Main orchestrator for creating TikTok slideshows
 *
 * Usage:
 *   npx tsx scripts/create-slideshow.ts --template doubter-roommate
 *   npx tsx scripts/create-slideshow.ts --template secret-edge --post
 *   npx tsx scripts/create-slideshow.ts --list
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { generateImage, buildPromptFromScene } from './generate-images.js';
import { addTextOverlay } from './add-text-overlay.js';
import { screenshotStrongBet } from './screenshot-site.js';
import { postSlideshowFolder } from './post-to-tiktok.js';

import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load templates
const hooksPath = path.join(__dirname, '../templates/hooks.json');
const promptsPath = path.join(__dirname, '../templates/image-prompts.json');
const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));

interface SlideshowConfig {
  templateId: string;
  outputDir?: string;
  skipScreenshot?: boolean;
  post?: boolean;
}

/**
 * Map slide content to appropriate scene type
 */
function getSceneForSlide(slideText: string, slideIndex: number, totalSlides: number): string | null {
  // Screenshot slides
  if (slideText.startsWith('[SCREENSHOT')) {
    return null; // Will be handled separately
  }

  // Last slide often needs celebration or proof vibe
  if (slideIndex === totalSlides - 1) {
    return 'celebration';
  }

  // First slide - discovery/hook moment
  if (slideIndex === 0) {
    // Check for different hook types
    if (slideText.toLowerCase().includes('pov')) {
      return 'couch-discovery';
    }
    if (slideText.toLowerCase().includes('my ') || slideText.toLowerCase().includes('comments')) {
      return 'couch-discovery';
    }
    return 'couch-discovery';
  }

  // Middle slides - vary the scenes
  const middleScenes = ['sports-bar', 'kitchen-morning', 'desk-working', 'laptop-research'];
  return middleScenes[slideIndex % middleScenes.length];
}

/**
 * Create a complete slideshow from a template
 */
async function createSlideshow(config: SlideshowConfig): Promise<string> {
  const { templateId, skipScreenshot = false, post = false } = config;

  // Find template
  const template = hooks.templates.find((t: { id: string }) => t.id === templateId);
  if (!template) {
    const available = hooks.templates.map((t: { id: string }) => t.id).join(', ');
    throw new Error(`Template "${templateId}" not found. Available: ${available}`);
  }

  console.log(`\n🎬 Creating slideshow: ${template.name}`);
  console.log(`Category: ${template.category}`);
  console.log(`Slides: ${template.slides.length}`);

  // Create output directory
  const date = new Date().toISOString().split('T')[0];
  const outputDir = config.outputDir || path.join(__dirname, `../output/${date}-${templateId}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Output: ${outputDir}\n`);

  // Process each slide
  for (let i = 0; i < template.slides.length; i++) {
    const slideText = template.slides[i];
    const slideNum = i + 1;

    console.log(`\n📸 Slide ${slideNum}/${template.slides.length}: "${slideText.substring(0, 40)}..."`);

    // Check if this is a screenshot slide
    if (slideText.startsWith('[SCREENSHOT')) {
      if (skipScreenshot) {
        console.log('  Skipping screenshot (--skip-screenshot flag)');
        // Create placeholder
        fs.writeFileSync(
          path.join(outputDir, `slide-${slideNum}-SCREENSHOT-NEEDED.txt`),
          'Replace this with a screenshot from d1pix.com'
        );
        continue;
      }

      console.log('  Taking screenshot of d1pix.com...');
      try {
        await screenshotStrongBet(path.join(outputDir, `slide-${slideNum}.png`));
      } catch (e) {
        console.log('  Screenshot failed, creating placeholder');
        fs.writeFileSync(
          path.join(outputDir, `slide-${slideNum}-SCREENSHOT-NEEDED.txt`),
          'Screenshot failed. Replace this with a screenshot from d1pix.com'
        );
      }
      continue;
    }

    // Get scene for this slide
    const scene = getSceneForSlide(slideText, i, template.slides.length);
    if (!scene) {
      console.log('  No scene mapping, skipping image generation');
      continue;
    }

    // Generate base image
    console.log(`  Scene: ${scene}`);
    const baseImagePath = path.join(outputDir, `slide-${slideNum}-base.png`);
    const prompt = buildPromptFromScene(scene);

    try {
      await generateImage(prompt, baseImagePath);
    } catch (e) {
      console.error(`  Image generation failed: ${e}`);
      continue;
    }

    // Add text overlay
    const finalImagePath = path.join(outputDir, `slide-${slideNum}.png`);

    // Determine text position based on slide position
    let textPosition: 'top' | 'center' | 'bottom' = 'top';
    if (i === template.slides.length - 1) {
      textPosition = 'center'; // CTA slide
    }

    await addTextOverlay({
      inputPath: baseImagePath,
      outputPath: finalImagePath,
      text: slideText,
      position: textPosition,
    });

    // Clean up base image
    fs.unlinkSync(baseImagePath);
  }

  // Save caption
  const captionPath = path.join(outputDir, 'caption.txt');
  fs.writeFileSync(captionPath, template.caption);
  console.log(`\n📝 Caption saved to: caption.txt`);

  // Save metadata
  const metadataPath = path.join(outputDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify({
    templateId: template.id,
    templateName: template.name,
    category: template.category,
    createdAt: new Date().toISOString(),
    slides: template.slides,
  }, null, 2));

  console.log(`\n✅ Slideshow created: ${outputDir}`);

  // Post if requested
  if (post) {
    console.log('\n📤 Posting to TikTok...');
    await postSlideshowFolder(outputDir);
  }

  return outputDir;
}

/**
 * List all available templates
 */
function listTemplates(): void {
  console.log('\n📚 Available Templates:\n');

  const byCategory: Record<string, typeof hooks.templates> = {};

  for (const template of hooks.templates) {
    if (!byCategory[template.category]) {
      byCategory[template.category] = [];
    }
    byCategory[template.category].push(template);
  }

  for (const [category, templates] of Object.entries(byCategory)) {
    const categoryInfo = hooks.categories[category] || { description: '', energy: '' };
    console.log(`\n${category.toUpperCase()}`);
    console.log(`  ${categoryInfo.description}`);
    console.log(`  Energy: ${categoryInfo.energy}`);
    console.log('');

    for (const t of templates) {
      console.log(`  • ${t.id}`);
      console.log(`    "${t.slides[0]}"`);
    }
  }

  console.log('\n💡 Usage: npx tsx scripts/create-slideshow.ts --template <id>');
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
TikTok Slideshow Creator

Usage:
  npx tsx scripts/create-slideshow.ts [options]

Options:
  --template, -t    Template ID to use (required unless --list)
  --output, -o      Custom output directory
  --skip-screenshot Skip d1pix.com screenshots
  --post            Post to TikTok after creation
  --list, -l        List all available templates
  --help, -h        Show this help

Examples:
  npx tsx scripts/create-slideshow.ts --list
  npx tsx scripts/create-slideshow.ts --template doubter-roommate
  npx tsx scripts/create-slideshow.ts --template secret-edge --post
  npx tsx scripts/create-slideshow.ts -t anti-tout -o ./my-output --skip-screenshot
`);
    return;
  }

  if (args.includes('--list') || args.includes('-l')) {
    listTemplates();
    return;
  }

  // Parse arguments
  let templateId = '';
  let outputDir: string | undefined;
  let skipScreenshot = false;
  let post = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--template':
      case '-t':
        templateId = args[++i];
        break;
      case '--output':
      case '-o':
        outputDir = args[++i];
        break;
      case '--skip-screenshot':
        skipScreenshot = true;
        break;
      case '--post':
        post = true;
        break;
    }
  }

  // Validate
  if (!templateId) {
    console.error('Error: --template is required');
    console.error('Use --list to see available templates');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not set');
    console.error('Copy config/.env.example to config/.env and add your OpenAI key');
    process.exit(1);
  }

  await createSlideshow({
    templateId,
    outputDir,
    skipScreenshot,
    post,
  });
}

// Export for use as module
export { createSlideshow, listTemplates };

// Run if called directly
main().catch(console.error);
