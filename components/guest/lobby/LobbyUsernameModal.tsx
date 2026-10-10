'use client';
import React from 'react';
import { GuestAuthSheet } from '@/components/guest/account/GuestAuthSheet';

interface LobbyUsernameModalProps {
  isOpen: boolean;
  currentUserTable: string;
  cafeId: string;
  onComplete: (guestName: string, guestHandle: string) => void;
  /** Lets the guest browse the lounge without joining the chat. */
  onSkip?: () => void;
}

/**
 * Joining the venue chat requires a guest account (handle + PIN). The sheet
 * verifies the account on the server; the chat only ever shows that identity.
 */
export function LobbyUsernameModal({ isOpen, currentUserTable, cafeId, onComplete, onSkip }: LobbyUsernameModalProps) {
  return (
    <GuestAuthSheet
      isOpen={isOpen}
      venueId={cafeId}
      tableNumber={currentUserTable}
      onClose={() => onSkip?.()}
      onBrowse={onSkip}
      onSignedIn={(account) => {
        // Start this table's session under the verified identity (the server reads it from the cookie).
        void fetch('/api/guest/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table_number: currentUserTable,
            business_id: cafeId,
            guest_session_id: `GS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            avatar: account.avatar,
          }),
        }).catch(() => {});
        onComplete(account.display_name, account.handle);
      }}
    />
  );
}

export default LobbyUsernameModal;
