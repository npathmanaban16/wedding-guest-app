import { Image } from 'react-native';

// Rewrites a Supabase Storage public-object URL into its equivalent
// image-transform ("render/image/public") URL with resize + quality
// parameters. The transform endpoint downsizes and re-encodes on the
// server so the client fetches a ~200-400 KB JPEG instead of a raw
// multi-MB upload, which is the biggest single win for hero-image
// latency.
//
// Only URLs matching the Supabase `/storage/v1/object/public/` shape
// are rewritten; any other URL (custom CDN, external image host, or a
// URL that already goes through /render/image/public/) is returned
// unchanged so admin uploads with unusual hosts still work.
const OBJECT_MARKER = '/storage/v1/object/public/';
const RENDER_MARKER = '/storage/v1/render/image/public/';

export function transformHeroImageUrl(
  url: string,
  opts: { width?: number; quality?: number } = {},
): string {
  if (!url.includes(OBJECT_MARKER)) return url;
  const { width = 1200, quality = 75 } = opts;
  const rewritten = url.replace(OBJECT_MARKER, RENDER_MARKER);
  const sep = rewritten.includes('?') ? '&' : '?';
  return `${rewritten}${sep}width=${width}&quality=${quality}`;
}

// Kicks off a background fetch so the bytes are already in RN's
// image cache by the time <ImageBackground> mounts. Safe to call
// with a null/empty URL — no-ops in that case. Errors are swallowed
// because this is a best-effort warm-up; on failure the hero image
// still loads normally on mount, just without the head-start.
export function prefetchHeroImage(url: string | null | undefined): void {
  if (!url) return;
  Image.prefetch(transformHeroImageUrl(url)).catch(() => {});
}
