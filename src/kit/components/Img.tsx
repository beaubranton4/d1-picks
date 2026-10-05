// site-kit v0.1.0
import Image from 'next/image';

/**
 * The only image tag MDX content may use. Requires alt and intrinsic size (no
 * layout shift) and goes through next/image, which serves AVIF/WebP.
 * lint-content rejects raw markdown images and <img> in MDX.
 */
export function Img({ src, alt, width, height, caption }: { src: string; alt: string; width: number; height: number; caption?: string }) {
  if (!alt?.trim()) throw new Error(`[site-kit] <Img src="${src}"> needs alt text describing the image`);
  return (
    <figure className="my-6">
      <Image src={src} alt={alt} width={width} height={height} sizes="(max-width: 768px) 100vw, 768px" className="h-auto w-full rounded-md" />
      {caption ? <figcaption className="mt-2 text-sm text-slate-600">{caption}</figcaption> : null}
    </figure>
  );
}
