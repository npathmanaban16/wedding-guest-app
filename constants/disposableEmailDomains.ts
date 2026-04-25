// Mirrored in supabase/migrations/012_wedding_request_disposable_emails.sql —
// keep both lists in sync when adding entries.
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  '10minutemail.com',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamailblock.com',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mintemail.com',
  'mohmal.com',
  'sharklasers.com',
  'spam4.me',
  'spamgourmet.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmailaddress.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
]);

export const isDisposableEmail = (email: string): boolean => {
  const at = email.lastIndexOf('@');
  if (at === -1) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(email.slice(at + 1).trim().toLowerCase());
};
