import { Image } from 'react-native';

// Shared in-flight prefetch so the login-screen await and the
// WeddingContext warm-up don't kick off two HTTP requests for the
// same URL. First caller starts the fetch, everyone else awaits the
// same promise.
let sharedPrefetch: { url: string; promise: Promise<boolean> } | null = null;

function startPrefetch(url: string): Promise<boolean> {
  if (sharedPrefetch?.url === url) return sharedPrefetch.promise;
  const promise = Image.prefetch(url).catch(() => false);
  sharedPrefetch = { url, promise };
  return promise;
}

// Fire-and-forget warm-up. Called from WeddingContext the instant the
// wedding row (and thus the hero URL) is known, which happens well
// before the login screen mounts on N&N and the instant the invite
// resolves on SaaS.
export function prefetchHeroImage(url: string | null | undefined): void {
  if (!url) return;
  startPrefetch(url);
}

// Awaitable variant used by the login/invite Enter handler to hold the
// spinner until the image is actually in cache. Reuses the promise
// started by prefetchHeroImage above so we never fire two requests.
// Times out at `timeoutMs` so a slow network can't strand the user on
// the login button forever — on timeout we proceed and the
// <ImageBackground> finishes downloading lazily on the home screen.
export function awaitHeroImage(
  url: string | null | undefined,
  timeoutMs = 2500,
): Promise<void> {
  if (!url) return Promise.resolve();
  return Promise.race([
    startPrefetch(url).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
