'use client';

import React from 'react';
import { GuestAuthSheet } from '@/components/guest/account/GuestAuthSheet';
import type { GuestAccountSummary } from '@/lib/guest/guest-account-client';

export type AuthReason = 'claim' | 'order' | null;

interface CartAuthGateProps {
  reason: AuthReason;
  venueId: string;
  tableNumber: string;
  onClose: () => void;
  /** Place the order now, under this identity (or none, for a guest who continues without an account). */
  onPlace: (name?: string, phone?: undefined, handle?: string) => void;
  onSignedIn: () => void;
}

/**
 * Sign-in over the review. From "Place order" the order goes out the moment the guest is signed in (or chooses to continue
 * without an account); from the cashback banner it only signs them in and leaves the review open.
 */
export function CartAuthGate({ reason, venueId, tableNumber, onClose, onPlace, onSignedIn }: CartAuthGateProps) {
  return (
    <GuestAuthSheet
      isOpen={reason !== null} venueId={venueId} tableNumber={tableNumber} onClose={onClose}
      onBrowse={reason === 'order' ? () => { onClose(); onPlace('', undefined, undefined); } : undefined}
      onSignedIn={(signed: GuestAccountSummary) => {
        const placeNow = reason === 'order';
        onClose();
        onSignedIn();
        if (placeNow) onPlace(signed.display_name, undefined, signed.handle);
      }}
    />
  );
}
