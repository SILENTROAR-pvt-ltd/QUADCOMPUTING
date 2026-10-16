import type { CredentialMode } from '../VibersSignInForm';

export type AuthStep = CredentialMode | 'pin' | 'profile' | 'check_email';

/** The title and the line under it for each step of signing in. */
export const AUTH_COPY: Record<AuthStep, [string, (table: string) => string]> = {
  create: ['Create your Vibers account', (t) => `One account for every Vibers property. Earn 7% back on your bills, on any phone at Table ${t}.`],
  signin: ['Sign in', () => 'Use your Vibers account email and password. Hosts: it is the same login as Quad Computing.'],
  pin: ['Sign in with your PIN', () => 'Your @handle and the 6-digit PIN you chose when you made your account. Works at every Vibers property.'],
  profile: ['Finish your profile', () => 'Once, for every property: your name, mobile and @handle.'],
  check_email: ['Check your email', () => 'Open the link we sent to confirm your account, then sign in here.'],
};
