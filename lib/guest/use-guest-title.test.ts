import { describe, it, expect } from 'vitest';
import { addressWithGuest, guestDocumentTitle } from './use-guest-title';
import { GUEST_BRAND } from '@/lib/brand';

describe('Guest tab title', () => {
  it('shows the signed-in handle, then the section, then the brand', () => {
    expect(guestDocumentTitle('Me', '@babaaps')).toBe(`@babaaps · Me · ${GUEST_BRAND.name}`);
  });

  it('puts the signed-in handle in the address, next to the table and venue', () => {
    const href = 'http://localhost:3000/menu?table=T-01&cafe_id=189664b2-99e7-4d45-ac50-ffb647ef97df&tab=me';
    const next = addressWithGuest(href, '@babaaps');
    expect(next).toBe('/menu?table=T-01&cafe_id=189664b2-99e7-4d45-ac50-ffb647ef97df&tab=me&guest=%40babaaps');
  });

  it('replaces an earlier handle rather than adding a second one', () => {
    const href = 'http://localhost:3000/menu?table=T-01&guest=%40old';
    expect(addressWithGuest(href, '@new')).toBe('/menu?table=T-01&guest=%40new');
  });

  it('removes the handle from the address on sign-out', () => {
    const href = 'http://localhost:3000/guest/lobby?table=T-01&guest=%40babaaps#chat';
    expect(addressWithGuest(href, null)).toBe('/guest/lobby?table=T-01#chat');
  });

  it('shows only the section and brand when nobody is signed in', () => {
    expect(guestDocumentTitle('Bill', null)).toBe(`Bill · ${GUEST_BRAND.name}`);
    expect(guestDocumentTitle('Lounge', undefined)).toBe(`Lounge · ${GUEST_BRAND.name}`);
  });
});
