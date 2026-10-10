'use client';

import { useEffect } from 'react';
import { GUEST_BRAND } from '@/lib/brand';

/**
 * The browser tab's title for a guest page, for example "@babaaps · Me · Vibers Connect". The handle
 * is shown in the tab only; it is never added to the address.
 */
export function guestDocumentTitle(section: string, handle: string | null | undefined): string {
  return handle ? `${handle} · ${section} · ${GUEST_BRAND.name}` : `${section} · ${GUEST_BRAND.name}`;
}

/**
 * Keeps the tab title set. Next's route metadata writes the title again after the page mounts, so
 * the title is re-applied whenever the head changes.
 */
/**
 * The address for a guest page with the signed-in handle shown as `guest`, or without it when nobody
 * is signed in. Display only: the server never reads this parameter, so it grants nothing.
 */
export function addressWithGuest(href: string, handle: string | null | undefined): string {
  const url = new URL(href);
  if (handle) url.searchParams.set('guest', handle);
  else url.searchParams.delete('guest');
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Shows the signed-in handle in the address bar. Waits until the account state is known. */
export function useGuestAddressHandle(handle: string | null | undefined, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const current = new URL(window.location.href).searchParams.get('guest');
    const next = handle ?? null;
    if ((current ?? null) === next) return;
    window.history.replaceState(window.history.state, '', addressWithGuest(window.location.href, next));
  }, [handle, ready]);
}

export function useGuestDocumentTitle(section: string, handle: string | null | undefined) {
  useEffect(() => {
    const desired = guestDocumentTitle(section, handle);
    const apply = () => {
      if (document.title !== desired) document.title = desired;
    };
    apply();
    const timer = window.setTimeout(apply, 0);
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [section, handle]);
}
