import { Image } from 'react-native';

// Track only IN-FLIGHT prefetches. Once the promise resolves we drop
// the entry so a later call fires a fresh Image.prefetch — important
// because the RN image cache can evict between the initial warm-up
// (WeddingContext, at wedding-row load) and the actual mount on Home,
// especially when the user takes a minute or two on the onboarding
// screen in between. A stale resolved promise saying "already done"
// would make awaitHeroImage return instantly even though the bytes
// were long gone from cache. Re-firing costs a cheap cache-hit call
// on the happy path and re-fetches when the cache actually evicted.
let inFlight: { url: string; promise: Promise<boolean> } | null = null;

function ensurePrefetch(url: string): Promise<boolean> {
  if (inFlight?.url === url) return inFlight.promise;
  const promise = Image.prefetch(url).catch(() => false);
  const entry = { url, promise };
  inFlight = entry;
  promise.finally(() => {
    if (inFlight === entry) inFlight = null;
  });
  return promise;
}

// Fire-and-forget warm-up. Called from WeddingContext the instant the
// wedding row (and thus the hero URL) is known, which happens well
// before the login screen mounts on N&N and the instant the invite
// resolves on SaaS.
export function prefetchHeroImage(url: string | null | undefined): void {
  if (!url) return;
  ensurePrefetch(url);
}

// Awaitable variant used by the login/invite Enter handler AND the
// onboarding Save/Skip handler to hold the spinner until the image is
// actually in cache. Piggybacks on any in-flight prefetch so we never
// fire two concurrent requests for the same URL, but always re-checks
// the cache (via a fresh Image.prefetch) when nothing is in flight —
// the RN cache may have evicted since the last time we warmed it.
// Capped at `timeoutMs` so a slow network can't strand the user on
// the button forever; on timeout we proceed and the <ImageBackground>
// finishes downloading lazily on the home screen.
export function awaitHeroImage(
  url: string | null | undefined,
  timeoutMs = 2500,
): Promise<void> {
  if (!url) return Promise.resolve();
  return Promise.race([
    ensurePrefetch(url).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
