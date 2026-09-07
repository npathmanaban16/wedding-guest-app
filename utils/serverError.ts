// Shared vocabulary for "the request didn't come back with data".
//
// Every screen that talks to Supabase used to collapse both failure modes
// into one message — "couldn't reach the server" — which sends the guest off
// to check their wifi even when the wifi is fine and the backend is the one
// refusing (project paused, key rotated, RLS denial, missing migration).
// These helpers keep the two apart.

// True only for a genuine connectivity failure. React Native's fetch throws
// a TypeError('Network request failed'); web/undici says 'Failed to fetch'.
// A Supabase/PostgREST rejection is an error *object* carrying a message and
// usually a code, and never matches this.
export function isNetworkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /network request failed|failed to fetch|network error|timeout/i.test(message);
}

// One readable line describing a non-network failure, so a guest can read it
// back to us instead of us guessing from "it says it can't reach the server".
// Null means there's nothing useful to show (or it was a plain drop).
export function describeServerError(err: unknown): string | null {
  if (isNetworkError(err)) return null;
  const e = err as { message?: unknown; code?: unknown } | null;
  const message = typeof e?.message === 'string' ? e.message.trim() : '';
  if (!message) return null;
  const code = typeof e?.code === 'string' ? e.code : null;
  return code ? `${message} (${code})` : message;
}
