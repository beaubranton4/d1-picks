/**
 * Post video to TikTok via Postiz API
 *
 * Usage:
 *   npm run post -- ./output/daily-picks-2026-02-14.mp4 "Today's D1 Picks"
 *   npm run post -- ./output/pick-2026-02-14-texas-tech.mp4 "Texas Tech +135"
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import 'dotenv/config';

// Try to load from tiktok-system config if not in env
const envPath = path.resolve(__dirname, '../../tiktok-system/config/.env');
if (fs.existsSync(envPath) && !process.env.POSTIZ_API_KEY) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/POSTIZ_API_KEY=(.+)/);
  if (match) {
    process.env.POSTIZ_API_KEY = match[1].trim();
  }
}

const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY;
const POSTIZ_BASE_URL = 'https://api.postiz.com/v1';

interface PostVideoOptions {
  videoPath: string;
  caption: string;
  hashtags?: string[];
  draft?: boolean;
}

async function postVideoToTikTok(options: PostVideoOptions): Promise<{ success: boolean; postId?: string; error?: string }> {
  const {
    videoPath,
    caption,
    hashtags = ['#collegebaseball', '#sportsbetting', '#freepicks', '#d1picks', '#cbb', '#betting'],
    draft = true,
  } = options;

  if (!POSTIZ_API_KEY) {
    throw new Error(
      'POSTIZ_API_KEY not set. Add it to your environment or tiktok-system/config/.env'
    );
  }

  // Validate video exists
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video not found: ${videoPath}`);
  }

  const stats = fs.statSync(videoPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`Posting video to TikTok via Postiz...`);
  console.log(`File: ${path.basename(videoPath)} (${sizeMB} MB)`);
  console.log(`Caption: ${caption}`);
  console.log(`Draft mode: ${draft}`);

  try {
    // Step 1: Upload video to Postiz
    console.log('\nUploading video...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(videoPath));
    formData.append('type', 'video');

    const uploadResponse = await axios.post(
      `${POSTIZ_BASE_URL}/media/upload`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${POSTIZ_API_KEY}`,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    if (!uploadResponse.data.id) {
      throw new Error('Upload failed - no media ID returned');
    }

    const mediaId = uploadResponse.data.id;
    console.log(`Upload complete. Media ID: ${mediaId}`);

    // Step 2: Create the post
    console.log('\nCreating post...');
    const fullCaption = `${caption}\n\n${hashtags.join(' ')}`;

    const postData = {
      platform: 'tiktok',
      content: fullCaption,
      media_ids: [mediaId],
      post_type: 'video',
      privacy_level: draft ? 'SELF_ONLY' : 'PUBLIC_TO_EVERYONE',
    };

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
      console.log('\nNext steps:');
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

// CLI handling
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
Post Video to TikTok (via Postiz)

Usage:
  npm run post -- <video-path> <caption>

Options:
  --public        Post as public (default is draft/private)
  --help, -h      Show this help

Examples:
  npm run post -- ./output/daily-picks-2026-02-14.mp4 "Today's D1 Picks"
  npm run post -- ./output/pick-texas-tech.mp4 "Texas Tech +135" --public

Note: By default, posts are created as DRAFTS so you can add music in the TikTok app.
`);
    return;
  }

  // Parse arguments
  const videoPath = args[0];
  const caption = args[1] || "Today's D1 Picks";
  const isPublic = args.includes('--public');

  if (!videoPath) {
    console.error('Error: Video path is required');
    process.exit(1);
  }

  const result = await postVideoToTikTok({
    videoPath: path.resolve(videoPath),
    caption,
    draft: !isPublic,
  });

  if (!result.success) {
    process.exit(1);
  }
}

// Export for use as module
export { postVideoToTikTok };

// Run if called directly
main().catch((err) => {
  console.error('Post failed:', err);
  process.exit(1);
});
