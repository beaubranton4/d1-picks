/**
 * Post slideshows to TikTok via Postiz API
 *
 * Usage:
 *   npx tsx scripts/post-to-tiktok.ts --folder ./output/2024-02-14-doubter --caption "My caption"
 *
 * Note: Posts as DRAFT so you can add music manually in the TikTok app
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

import 'dotenv/config';

const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY;
const POSTIZ_BASE_URL = 'https://api.postiz.com/v1';

interface PostOptions {
  imagePaths: string[];
  caption: string;
  hashtags?: string[];
  scheduledTime?: Date;
  draft?: boolean;
}

/**
 * Upload images and create a TikTok slideshow post via Postiz
 */
async function postToTikTok(options: PostOptions): Promise<{ success: boolean; postId?: string; error?: string }> {
  const {
    imagePaths,
    caption,
    hashtags = ['#collegebaseball', '#sportsbetting', '#freepicks', '#d1picks', '#betting'],
    scheduledTime,
    draft = true, // Default to draft so user can add music
  } = options;

  if (!POSTIZ_API_KEY) {
    throw new Error('POSTIZ_API_KEY not set. Add it to your .env file.');
  }

  // Validate images exist
  for (const imagePath of imagePaths) {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }
  }

  console.log(`Posting ${imagePaths.length} images to TikTok via Postiz...`);
  console.log(`Caption: ${caption.substring(0, 50)}...`);
  console.log(`Draft mode: ${draft}`);

  try {
    // Step 1: Upload images to Postiz
    const mediaIds: string[] = [];

    for (const imagePath of imagePaths) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(imagePath));
      formData.append('type', 'image');

      const uploadResponse = await axios.post(
        `${POSTIZ_BASE_URL}/media/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${POSTIZ_API_KEY}`,
            ...formData.getHeaders(),
          },
        }
      );

      if (uploadResponse.data.id) {
        mediaIds.push(uploadResponse.data.id);
        console.log(`Uploaded: ${path.basename(imagePath)} -> ${uploadResponse.data.id}`);
      }
    }

    // Step 2: Create the post
    const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;

    const postData: Record<string, unknown> = {
      platform: 'tiktok',
      content: fullCaption,
      media_ids: mediaIds,
      post_type: 'carousel', // Slideshow
      privacy_level: draft ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE',
    };

    // Add scheduled time if provided
    if (scheduledTime) {
      postData.scheduled_at = scheduledTime.toISOString();
    }

    const postResponse = await axios.post(
      `${POSTIZ_BASE_URL}/posts`,
      postData,
      {
        headers: {
          'Authorization': `Bearer ${POSTIZ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\nPost created successfully!');
    console.log(`Post ID: ${postResponse.data.id}`);

    if (draft) {
      console.log('\n📱 Next steps:');
      console.log('1. Open the TikTok app');
      console.log('2. Go to your Drafts');
      console.log('3. Add trending music');
      console.log('4. Publish!');
    }

    return {
      success: true,
      postId: postResponse.data.id,
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Postiz API Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
    throw error;
  }
}

/**
 * Post a slideshow from a folder
 * Expects folder to contain slide-1.png, slide-2.png, etc. and caption.txt
 */
async function postSlideshowFolder(folderPath: string, captionOverride?: string): Promise<void> {
  // Find all slide images
  const files = fs.readdirSync(folderPath);
  const slideFiles = files
    .filter(f => f.startsWith('slide-') && f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide-(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.match(/slide-(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error(`No slide images found in ${folderPath}`);
  }

  const imagePaths = slideFiles.map(f => path.join(folderPath, f));

  // Get caption
  let caption = captionOverride || '';
  const captionPath = path.join(folderPath, 'caption.txt');
  if (!caption && fs.existsSync(captionPath)) {
    caption = fs.readFileSync(captionPath, 'utf-8').trim();
  }

  if (!caption) {
    throw new Error('No caption provided. Use --caption or add caption.txt to the folder.');
  }

  await postToTikTok({
    imagePaths,
    caption,
    draft: true,
  });
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
TikTok Posting Tool (via Postiz)

Usage:
  npx tsx scripts/post-to-tiktok.ts [options]

Options:
  --folder, -f    Folder containing slideshow (slide-1.png, slide-2.png, etc.)
  --caption, -c   Caption text (or reads from caption.txt in folder)
  --images, -i    Comma-separated list of image paths (alternative to --folder)
  --public        Post as public (default is draft/private)
  --help, -h      Show this help

Examples:
  npx tsx scripts/post-to-tiktok.ts --folder ./output/2024-02-14-doubter
  npx tsx scripts/post-to-tiktok.ts --folder ./output/test --caption "My custom caption"
  npx tsx scripts/post-to-tiktok.ts --images "a.png,b.png,c.png" --caption "Testing"

Note: By default, posts are created as DRAFTS so you can add music in the TikTok app.
`);
    return;
  }

  // Check API key
  if (!POSTIZ_API_KEY) {
    console.error('Error: POSTIZ_API_KEY not set');
    console.error('Copy config/.env.example to config/.env and add your Postiz API key');
    process.exit(1);
  }

  // Parse arguments
  let folderPath = '';
  let caption = '';
  let imagesList = '';
  let isPublic = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--folder':
      case '-f':
        folderPath = args[++i];
        break;
      case '--caption':
      case '-c':
        caption = args[++i];
        break;
      case '--images':
      case '-i':
        imagesList = args[++i];
        break;
      case '--public':
        isPublic = true;
        break;
    }
  }

  // Validate
  if (!folderPath && !imagesList) {
    console.error('Error: Must specify --folder or --images');
    process.exit(1);
  }

  if (folderPath) {
    await postSlideshowFolder(folderPath, caption);
  } else {
    const imagePaths = imagesList.split(',').map(p => p.trim());
    if (!caption) {
      console.error('Error: --caption is required when using --images');
      process.exit(1);
    }
    await postToTikTok({
      imagePaths,
      caption,
      draft: !isPublic,
    });
  }
}

// Export for use as module
export { postToTikTok, postSlideshowFolder };

// Run if called directly
main().catch(console.error);
