// Plain-language versions of the sign-in and sign-up errors Supabase returns.
const MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'That email and password don’t match. Check them and try again.'],
  [/email not confirmed/i, 'Please confirm your email first. Check your inbox for the link we sent.'],
  [/already registered|already exists/i, 'An account already exists for this email. Sign in instead.'],
  [/rate limit|too many requests/i, 'Too many attempts. Please wait a minute and try again.'],
  [/password should be at least|weak password/i, 'Choose a stronger password: at least 8 characters.'],
  [/network|failed to fetch/i, 'We couldn’t reach the server. Check your connection and try again.'],
];

export function friendlyAuthError(message: string | undefined | null, fallback = 'Something went wrong. Please try again.'): string {
  if (!message) return fallback;
  for (const [pattern, text] of MESSAGES) if (pattern.test(message)) return text;
  return message;
}
