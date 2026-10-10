'use client';

import { walletAuthHeaders } from '@/lib/utils/wallet-secret';

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
}

export const GUEST_ACCOUNT_EVENT = 'guest-account:changed';

type Outcome =
  | { ok: true; account: GuestAccountSummary }
  | { ok: false; error: string; retryAfterSeconds?: number };

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
    return { ok: false, error: data?.error || 'Something went wrong. Please try again.', retryAfterSeconds: retry };
  } catch {
    return { ok: false, error: 'Network problem. Check your connection and try again.' };
  }
}

export function signUpGuest(
  venueId: string,
  input: { name: string; phone: string; handle: string; pin: string; avatar?: string; traveller_type?: string | null; intro?: string }
) {
  return post('/api/guest/auth/signup', { venue_id: venueId, ...input });
}

/** Saves the signed-in guest's name, traveller type and intro. The server returns the saved account. */
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

export function signInGuest(venueId: string, handle: string, pin: string) {
  return post('/api/guest/auth/login', { venue_id: venueId, handle, pin });
}

/**
 * Who the server says is signed in. Only 'out' means signed out. 'unknown' means the check failed
 * (network, server error), and the device must keep what it knows: clearing identity on a failed
 * check used to delete the wallet secret, which left the wallet unreachable from this device.
 */
export type AccountState =
  | { status: 'in'; account: GuestAccountSummary }
  | { status: 'out' }
  | { status: 'unknown' };

export async function fetchGuestAccountState(venueId: string): Promise<AccountState> {
  if (!venueId) return { status: 'out' };
  try {
    const res = await fetch(`/api/guest/auth/me?venue_id=${encodeURIComponent(venueId)}`, { cache: 'no-store' });
    if (!res.ok) return { status: 'unknown' };
    const data = await res.json().catch(() => null);
    if (!data || typeof data.signedIn !== 'boolean') return { status: 'unknown' };
    if (data.signedIn && data.account) return { status: 'in', account: data.account };
    return { status: 'out' };
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
    await fetch('/api/guest/auth/logout', { method: 'POST', cache: 'no-store' });
  } finally {
    clearGuestIdentity();
    window.dispatchEvent(new CustomEvent(GUEST_ACCOUNT_EVENT, { detail: null }));
  }
}
