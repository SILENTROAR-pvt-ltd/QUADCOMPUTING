'use client';

import React, { useState } from 'react';
import { PhotoVaultModalHeader } from './components/PhotoVaultModalHeader';
import { LiveOffersManager } from './components/LiveOffersManager';
import { PhotoVaultModalFooter } from './components/PhotoVaultModalFooter';
import { LiveEventsManager } from '@/components/host/workspaces/guests/LiveEventsManager';

interface PhotoVaultManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueId?: string;
  onUpdated?: () => void;
}

/**
 * Events and offers for the guest lobby. The Events tab is the same live-events manager as My Guests, so an event made
 * here is the one guests see in the lounge and the one whose guest list appears under My Guests.
 */
export function PhotoVaultManagerModal({ isOpen, onClose, venueId = '', onUpdated }: PhotoVaultManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'moments' | 'offers'>('moments');

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white border border-neutral-200/90 shadow-2xl overflow-hidden">
        <PhotoVaultModalHeader activeTab={activeTab} onTabChange={setActiveTab} onClose={onClose} />

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'moments' ? (
            <div className="p-6"><LiveEventsManager /></div>
          ) : (
            <LiveOffersManager venueId={venueId} onOffersUpdated={onUpdated} />
          )}
        </div>

        <PhotoVaultModalFooter onClose={onClose} />
      </div>
    </div>
  );
}

export default PhotoVaultManagerModal;
