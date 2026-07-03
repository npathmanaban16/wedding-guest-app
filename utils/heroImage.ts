import { Image } from 'react-native';

// Kicks off a background fetch so the bytes are already in RN's
// image cache by the time <ImageBackground> mounts. Safe to call
// with a null/empty URL — no-ops in that case. Errors are swallowed
// because this is a best-effort warm-up; on failure the hero image
// still loads normally on mount, just without the head-start.
export function prefetchHeroImage(url: string | null | undefined): void {
  if (!url) return;
  Image.prefetch(url).catch(() => {});
}
