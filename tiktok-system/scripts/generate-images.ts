/**
 * Generate images for TikTok slideshows using OpenAI's gpt-image-1
 *
 * Usage:
 *   npx tsx scripts/generate-images.ts --prompt "your prompt" --output ./output/image.png
 *   npx tsx scripts/generate-images.ts --scene couch-discovery --output ./output/
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load image prompts template
const promptsPath = path.join(__dirname, '../templates/image-prompts.json');
const imagePrompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));

interface GenerateOptions {
  prompt?: string;
  scene?: string;
  variation?: number;
  outputPath: string;
  count?: number;
}

/**
 * Generate a single image using OpenAI's gpt-image-1
 */
async function generateImage(prompt: string, outputPath: string): Promise<string> {
  console.log('Generating image with prompt:', prompt.substring(0, 100) + '...');

  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: prompt,
      n: 1,
      size: '1024x1536', // Portrait orientation for TikTok
      quality: 'high',
    });

    const imageUrl = response.data[0].url;

    if (!imageUrl) {
      // gpt-image-1 returns base64 data instead of URL
      const b64Data = response.data[0].b64_json;
      if (b64Data) {
        const buffer = Buffer.from(b64Data, 'base64');
        fs.writeFileSync(outputPath, buffer);
        console.log(`Image saved to: ${outputPath}`);
        return outputPath;
      }
      throw new Error('No image data returned');
    }

    // Download and save the image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(outputPath, buffer);
    console.log(`Image saved to: ${outputPath}`);

    return outputPath;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Build a prompt from a scene template
 */
function buildPromptFromScene(sceneName: string, variationIndex?: number): string {
  const scene = imagePrompts.scenes[sceneName];
  if (!scene) {
    throw new Error(`Scene "${sceneName}" not found. Available: ${Object.keys(imagePrompts.scenes).join(', ')}`);
  }

  let prompt = scene.prompt;

  // Add variation if specified
  if (variationIndex !== undefined && scene.variations[variationIndex]) {
    prompt += ` ${scene.variations[variationIndex]}.`;
  }

  // Add realism modifiers
  const modifiers = imagePrompts.promptModifiers;
  prompt += ` ${modifiers.realism.slice(0, 3).join(', ')}.`;

  return prompt;
}

/**
 * Generate multiple images for a slideshow
 */
async function generateSlideshow(
  scenes: string[],
  outputDir: string,
  prefix: string = 'slide'
): Promise<string[]> {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const generatedPaths: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const sceneName = scenes[i];

    // Skip screenshot placeholders
    if (sceneName.startsWith('[SCREENSHOT')) {
      console.log(`Slide ${i + 1}: Screenshot placeholder - skipping image generation`);
      generatedPaths.push(''); // Placeholder for screenshot
      continue;
    }

    const prompt = buildPromptFromScene(sceneName);
    const outputPath = path.join(outputDir, `${prefix}-${i + 1}.png`);

    console.log(`\nGenerating slide ${i + 1}/${scenes.length}...`);
    const savedPath = await generateImage(prompt, outputPath);
    generatedPaths.push(savedPath);

    // Small delay to avoid rate limiting
    if (i < scenes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return generatedPaths;
}

/**
 * List available scenes
 */
function listScenes(): void {
  console.log('\nAvailable scenes:');
  for (const [name, scene] of Object.entries(imagePrompts.scenes)) {
    const s = scene as { name: string; description: string };
    console.log(`  ${name}: ${s.description}`);
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list') || args.includes('-l')) {
    listScenes();
    return;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
TikTok Image Generator

Usage:
  npx tsx scripts/generate-images.ts [options]

Options:
  --prompt, -p    Custom prompt for image generation
  --scene, -s     Use a predefined scene (use --list to see available)
  --variation, -v Variation index for the scene (0-based)
  --output, -o    Output path (file or directory)
  --count, -c     Number of images to generate (default: 1)
  --list, -l      List available scenes
  --help, -h      Show this help

Examples:
  npx tsx scripts/generate-images.ts --scene couch-discovery --output ./output/test.png
  npx tsx scripts/generate-images.ts --prompt "iPhone photo of..." --output ./output/custom.png
  npx tsx scripts/generate-images.ts --list
`);
    return;
  }

  // Parse arguments
  let prompt: string | undefined;
  let scene: string | undefined;
  let variation: number | undefined;
  let outputPath = './output';
  let count = 1;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--prompt':
      case '-p':
        prompt = args[++i];
        break;
      case '--scene':
      case '-s':
        scene = args[++i];
        break;
      case '--variation':
      case '-v':
        variation = parseInt(args[++i], 10);
        break;
      case '--output':
      case '-o':
        outputPath = args[++i];
        break;
      case '--count':
      case '-c':
        count = parseInt(args[++i], 10);
        break;
    }
  }

  // Validate
  if (!prompt && !scene) {
    console.error('Error: Must specify --prompt or --scene');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not set. Copy .env.example to .env and add your key.');
    process.exit(1);
  }

  // Build prompt
  const finalPrompt = prompt || buildPromptFromScene(scene!, variation);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate
  if (count === 1) {
    await generateImage(finalPrompt, outputPath);
  } else {
    for (let i = 0; i < count; i++) {
      const ext = path.extname(outputPath);
      const base = path.basename(outputPath, ext);
      const dir = path.dirname(outputPath);
      const numberedPath = path.join(dir, `${base}-${i + 1}${ext}`);
      await generateImage(finalPrompt, numberedPath);
    }
  }

  console.log('\nDone!');
}

// Export for use as module
export { generateImage, generateSlideshow, buildPromptFromScene, listScenes };

// Run if called directly
main().catch(console.error);
