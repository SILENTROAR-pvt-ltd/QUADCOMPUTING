'use client';

import { walletAuthHeaders } from '@/lib/utils/wallet-secret';
import { createClient } from '@/lib/supabase/client';
import { friendlyAuthError } from '@/lib/auth/auth-messages';
import { AUTH_NEXT_COOKIE } from '@/lib/auth/safe-next';

export interface GuestAccountSummary {
  handle: string;
  display_name: string;
  /** Masked on the server; the browser never receives the full number. */
  phone_masked: string | null;
  avatar: string;
  /** Public URL of the uploaded photo, when there is one. */
  avatar_url: string | null;
  traveller_type: string | null;
  intro: string | null;
  /** True only for old @handle + PIN accounts. */
  has_pin?: boolean;
}

export const GUEST_ACCOUNT_EVENT = 'guest-account:changed';

type Outcome =
  | { ok: true; account: GuestAccountSummary }
  | { ok: false; error: string; retryAfterSeconds?: number; code?: string };

async function post(url: string, body: unknown): Promise<Outcome> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...walletAuthHeaders() },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && data.account) return { ok: true, account: data.account };
    const retry = Number(res.headers.get('Retry-After') || 0) || undefined;
    return { ok: false, error: data?.error || 'Something went wrong. Please try again.', retryAfterSeconds: retry, code: data?.code };
  } catch {
    return { ok: false, error: 'Network problem. Check your connection and try again.' };
  }
}

// ── One account for guests and hosts: the same Supabase email + password login as QC. ──

/** Signs this browser in to the person's Vibers account (the same account hosts use for QC). */
export async function signInVibers(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true };
  } catch (e: any) {
    return { ok: false, error: friendlyAuthError(e?.message) };
  }
}

/** Google sign-in is shown only once the provider is switched on in Supabase and NEXT_PUBLIC_GOOGLE_AUTH=on is set. */
export const GOOGLE_AUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_AUTH === 'on';

/**
 * One tap with Google. The page the guest is on (table and venue in its query) is kept in a short-lived cookie so the
 * callback can send them back to it; the redirect URL itself stays a plain /auth/callback.
 */
export async function signInWithGoogle(): Promise<{ ok: false; error: string } | { ok: true }> {
  try {
    const back = `${window.location.pathname}${window.location.search}`;
    document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(back)}; path=/; max-age=600; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      // A venue phone can be shared or passed round: always let the person pick the Google account.
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account' } },
    });
    return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true };
  } catch (e: any) {
    return { ok: false, error: friendlyAuthError(e?.message) };
  }
}

/** Creates the Vibers account. `confirmed` is false when the project asks for email confirmation first. */
export async function signUpVibers(email: string, password: string): Promise<{ ok: true; confirmed: boolean } | { ok: false; error: string; exists?: boolean }> {
  try {
    const { data, error } = await createClient().auth.signUp({ email: email.trim(), password });
    if (error) return { ok: false, error: friendlyAuthError(error.message), exists: /already|registered|exists/i.test(error.message) };
    return { ok: true, confirmed: Boolean(data.session) };
  } catch (e: any) {
    return { ok: false, error: friendlyAuthError(e?.message) };
  }
}

export type AfterSignIn =
  | { kind: 'in'; account: GuestAccountSummary }
  | { kind: 'profile' }
  | { kind: 'error'; error: string };

/** Once the browser holds a Vibers session: connect it to this venue, or ask for the profile first. */
export async function connectAfterSignIn(venueId: string): Promise<AfterSignIn> {
  const state = await fetchGuestAccountState(venueId);
  if (state.status === 'in') {
    applyGuestIdentity(state.account);
    return { kind: 'in', account: state.account };
  }
  if (state.status === 'needs_profile') return { kind: 'profile' };
  if (state.status === 'out' && state.notice) return { kind: 'error', error: state.notice };
  return { kind: 'error', error: 'You are signed in, but this venue could not be reached. Please try again.' };
}

/** Sign in with the @handle and 6-digit PIN chosen when the profile was made. Works at every property. */
export async function signInWithPin(venueId: string, handle: string, pin: string): Promise<Outcome> {
  const outcome = await post('/api/guest/auth/login', { venue_id: venueId, handle, pin });
  if (outcome.ok) applyGuestIdentity(outcome.account);
  return outcome;
}

export type HandleStatus = 'available' | 'taken' | 'legacy' | 'invalid' | 'unknown';

/** Whether an @handle is free, for the profile form. 'unknown' on any failure: saving still checks for real. */
export async function checkHandle(handle: string): Promise<HandleStatus> {
  try {
    const res = await fetch(`/api/guest/auth/handle-check?handle=${encodeURIComponent(handle)}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    return res.ok && data?.success ? (data.status as HandleStatus) : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** The signed-in person's Vibers profile (handle, name, phone), then their guest session at this venue. */
export function createVibersProfile(
  venueId: string,
  input: { name: string; phone: string; handle: string; traveller_type?: string | null; intro?: string; legacy_pin?: string; new_pin?: string }
) {
  return post('/api/guest/auth/vibers-profile', { venue_id: venueId, ...input });
}

/**
 * Forgot PIN, self-service: the mobile number on the account, sent with this device's wallet secret.
 * The device must be the one that signed up. Success signs this device in with the new PIN.
 */
export async function recoverGuestPin(venueId: string, input: { handle: string; phone: string; newPin: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/guest/auth/pin/recover', {
      method: 'POST',
      headers: walletAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ venue_id: venueId, handle: input.handle, phone: input.phone, new_pin: input.newPin }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) return { ok: true };
    return { ok: false, error: data?.error || 'Your PIN could not be reset. Please try again.' };
  } catch {
    return { ok: false, error: 'Network problem. Check your connection and try again.' };
  }
}

/** Changes the signed-in guest's PIN. Other sessions for the account end; this device stays signed in. */
export async function changeGuestPin(venueId: string, currentPin: string, newPin: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/guest/auth/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue_id: venueId, current_pin: currentPin, new_pin: newPin }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) return { ok: true };
    return { ok: false, error: data?.error || 'Your PIN could not be changed. Please try again.' };
  } catch {
    return { ok: false, error: 'Network problem. Check your connection and try again.' };
  }
}

/** Uploads a photo (already resized, JPEG/PNG/WebP). The server checks the bytes and returns the saved account. */
export async function uploadGuestPhoto(venueId: string, photo: Blob): Promise<Outcome> {
  try {
    const res = await fetch(`/api/guest/auth/photo?venue_id=${encodeURIComponent(venueId)}`, {
      method: 'POST',
      headers: { 'Content-Type': photo.type || 'application/octet-stream' },
      body: photo,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && data.account) {
      applyGuestIdentity(data.account);
      return { ok: true, account: data.account };
    }
    return { ok: false, error: data?.error || 'The photo could not be saved. Please try again.' };
  } catch {
    return { ok: false, error: 'Network problem. Check your connection and try again.' };
  }
}

/** Removes the uploaded photo, so the emoji avatar shows again. */
export async function removeGuestPhoto(venueId: string): Promise<Outcome> {
  try {
    const res = await fetch(`/api/guest/auth/photo?venue_id=${encodeURIComponent(venueId)}`, { method: 'DELETE', cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && data.account) {
      applyGuestIdentity(data.account);
      return { ok: true, account: data.account };
    }
    return { ok: false, error: data?.error || 'The photo could not be removed. Please try again.' };
  } catch {
    return { ok: false, error: 'Network problem. Check your connection and try again.' };
  }
}

/** Saves the signed-in guest's name, traveller type and intro. The server returns the saved account. */
export async function updateGuestProfile(
  venueId: string,
  input: { name?: string; traveller_type?: string | null; intro?: string; avatar?: string }
): Promise<Outcome> {
  try {
    const res = await fetch('/api/guest/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue_id: venueId, ...input }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && data.account) {
      applyGuestIdentity(data.account);
      return { ok: true, account: data.account };
    }
    return { ok: false, error: data?.error || 'Could not save your profile. Please try again.' };
  } catch {
    return { ok: false, error: 'Network problem. Check your connection and try again.' };
  }
}

/**
 * Who the server says is signed in. Only 'out' means signed out. 'unknown' means the check failed
 * (network, server error), and the device must keep what it knows: clearing identity on a failed
 * check used to delete the wallet secret, which left the wallet unreachable from this device.
 */
export type AccountState =
  | { status: 'in'; account: GuestAccountSummary }
  /** Signed in to the Vibers account, but the profile (handle, name, phone) isn't made yet. */
  | { status: 'needs_profile' }
  | { status: 'out'; notice?: string | null }
  | { status: 'unknown' };

// Several parts of one screen (the header, the order review, the bill) ask who is signed in at the same moment; they
// share one request instead of each sending their own. Nothing is kept once it settles.
const accountInflight = new Map<string, Promise<AccountState>>();

export function fetchGuestAccountState(venueId: string): Promise<AccountState> {
  if (!venueId) return Promise.resolve({ status: 'out' });
  const pending = accountInflight.get(venueId);
  if (pending) return pending;
  const request = readGuestAccountState(venueId).finally(() => { accountInflight.delete(venueId); });
  accountInflight.set(venueId, request);
  return request;
}

async function readGuestAccountState(venueId: string): Promise<AccountState> {
  try {
    // A request that never answers (a dropped mobile connection) ends as "unknown" rather than leaving the menu waiting.
    const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(8000) : undefined;
    const res = await fetch(`/api/guest/auth/me?venue_id=${encodeURIComponent(venueId)}`, { cache: 'no-store', signal });
    if (!res.ok) return { status: 'unknown' };
    const data = await res.json().catch(() => null);
    if (!data || typeof data.signedIn !== 'boolean') return { status: 'unknown' };
    if (data.signedIn && data.account) return { status: 'in', account: data.account };
    if (data.needsProfile) return { status: 'needs_profile' };
    return { status: 'out', notice: data.notice ?? null };
  } catch {
    return { status: 'unknown' };
  }
}

/** Keys this browser stores about the signed-in guest. */
const IDENTITY_KEYS = ['guest_handle', 'guest_name', 'quad_guest_name', 'quad_guest_phone', 'quad_guest_wallet_id', 'guest_avatar'];

/** Mirror a server-verified account into the keys the menu, wallet and checkout read. */
export function applyGuestIdentity(account: GuestAccountSummary) {
  try {
    localStorage.setItem('guest_handle', account.handle);
    localStorage.setItem('guest_name', account.display_name);
    localStorage.setItem('quad_guest_name', account.display_name);
    localStorage.setItem('quad_guest_wallet_id', account.handle);
    localStorage.setItem('guest_avatar', account.avatar || '☕');
    // The full number is never sent to the browser; the server attaches the real one to orders.
    localStorage.setItem('quad_guest_phone', account.phone_masked || '');
  } catch {}
  window.dispatchEvent(new CustomEvent(GUEST_ACCOUNT_EVENT, { detail: account }));
  window.dispatchEvent(new CustomEvent('guest-wallet:refresh'));
}

/** Remove everything this browser remembers about a guest, including the wallet secret. */
export function clearGuestIdentity() {
  try {
    for (const key of IDENTITY_KEYS) localStorage.removeItem(key);
    localStorage.removeItem('quad_guest_wallet_secret');
    const remove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('quad_known_order_') || key.startsWith('quad_guest_uuid_'))) remove.push(key);
    }
    remove.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem('vc_lounge_browse');
  } catch {}
}

export async function signOutGuest(): Promise<void> {
  try {
    // Logging out also leaves any room this phone was confirmed in: the next person holding it starts clean.
    await Promise.all([
      fetch('/api/guest/auth/logout', { method: 'POST', cache: 'no-store' }),
      fetch('/api/guest/stay/leave', { method: 'POST', cache: 'no-store' }).catch(() => {}),
    ]);
    // One account: signing out here also ends the Vibers account session on this browser, otherwise
    // the next visit would sign the guest straight back in. 'local' keeps their other devices signed in.
    await createClient().auth.signOut({ scope: 'local' }).catch(() => {});
  } finally {
    clearGuestIdentity();
    window.dispatchEvent(new CustomEvent(GUEST_ACCOUNT_EVENT, { detail: null }));
  }
}
