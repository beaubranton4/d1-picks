---
description: Source unique, royalty-free photos for a page's cover and inline slots from Pexels, verify each visually, optimize, and place them with accurate alt text. Usage: /kit-source-images [entry slug(s)]
---
<!-- site-kit v0.1.0 -->

# Source images

Fill image slots with byte-unique, license-clean photos whose alt text tells
the truth about what is shown.

## Ground rules

- **License:** Pexels and Unsplash photos are free for commercial use with no attribution required. No watermarks, no Google Images, no AI-generated photos passed off as real places or people.
- **Never depict a specific real business, person or place with a photo that is not of it.** A generic "library interior" is fine for a guide; it is not fine as the photo of a named library listing.
- **Unique per slot:** no photo reused across slots or pages.
- **Alt text describes the actual photo.** If the ideal shot does not exist, pick the closest strong photo and rewrite the alt to match. Never keep a stale alt.
- **Visual QC is mandatory.** Search results are noisy; look at every image before placing it.

## Where images go

- Cover: frontmatter `image: /images/<collection>/<slug>/cover.jpg` plus `imageAlt`. The template crops it into a 16:9 frame (`object-cover`), so use landscape sources around 1600px wide.
- Inline: `<Img src="/images/<collection>/<slug>/<name>.jpg" alt="..." width={W} height={H} />` with the file's real pixel size (prevents layout shift).
- Files live under `public/images/...`. next/image serves them as AVIF/WebP, so JPEG sources are fine; keep them lean (150-400 KB).

## Pipeline

1. **Inventory slots:** `grep -nE 'image:|imageAlt:|<Img' content/**/<slug>.mdx`. Map each slot to a concept.
2. **Harvest candidates:** WebFetch `https://www.pexels.com/search/<query>/` and ask for every `/photo/<slug>-<ID>/` URL. Collect 15-25 IDs per concept.
3. **Contact sheets:** download candidates from `https://images.pexels.com/photos/<ID>/pexels-photo-<ID>.jpeg?auto=compress&cs=tinysrgb&w=1100` (put IDs in a file, `xargs -P 8 curl`), then `montage -label '%t' pool/*.jpg -tile 4x -geometry 380x285+5+5 sheet.jpg` and Read the sheet. Pick the best distinct ID per slot.
4. **Final files:** download at `w=1600`, then `magick <src> -resize '1600x1600>' -strip -interlace Plane -quality 82 public/images/<collection>/<slug>/<name>.jpg`.
5. **Verify:**
   - `sips -g pixelWidth -g pixelHeight <file>`: covers landscape, at least ~1100px wide.
   - `find public/images -name '*.jpg' -exec md5 -q {} \; | sort | uniq -c | sort -rn | head`: every count is 1.
   - Simulate the cover crop and look at it: `magick <cover> -resize 640x360^ -gravity center -extent 640x360 /tmp/crop.jpg`.
6. **Alt text:** update `imageAlt` and every `<Img alt>` to describe the final photo.
7. `npm run lint:content` (checks the image exists and has alt), then commit images and MDX together.

## Environment notes (macOS)

Use absolute binary paths inside loops if PATH gets lost (`/opt/homebrew/bin/magick`), `xargs -P` for parallel downloads, and `stat -f%z` for byte size.

## Report

Slots filled / total with the Pexels ID per slot, the md5 uniqueness result,
cover dimensions, alt text rewritten, and any slot with no honest match.
