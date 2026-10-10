'use client';

import React, { useState } from 'react';
import { PhotoVaultModalHeader } from './components/PhotoVaultModalHeader';
import { PhotoVaultMomentsTab } from './components/PhotoVaultMomentsTab';
import { LiveOffersManager } from './components/LiveOffersManager';
import { PhotoVaultModalFooter } from './components/PhotoVaultModalFooter';
import { usePhotoVaultData } from './hooks/usePhotoVaultData';

interface PhotoVaultManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueId?: string;
  onUpdated?: () => void;
}

export function PhotoVaultManagerModal({
  isOpen,
  onClose,
  venueId = '',
  onUpdated,
}: PhotoVaultManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'moments' | 'offers'>('moments');
  const { photos, isLoading, isRefreshing, deletingId, deleteError, fetchVaultPhotos, handleDelete } =
    usePhotoVaultData(venueId, isOpen, onUpdated);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white border border-neutral-200/90 shadow-2xl overflow-hidden">
        <PhotoVaultModalHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={onClose}
        />

        {deleteError && activeTab === 'moments' && (
          <p role="alert" className="mx-6 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{deleteError}</p>
        )}

        {activeTab === 'moments' ? (
          <PhotoVaultMomentsTab
            venueId={venueId}
            photos={photos}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            deletingId={deletingId}
            onRefresh={() => fetchVaultPhotos(true)}
            onDelete={handleDelete}
            onIngestSuccess={() => {
              fetchVaultPhotos(true);
              if (onUpdated) onUpdated();
            }}
          />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <LiveOffersManager venueId={venueId} onOffersUpdated={onUpdated} />
          </div>
        )}

        <PhotoVaultModalFooter onClose={onClose} />
      </div>
    </div>
  );
}

export default PhotoVaultManagerModal;
