'use client';

import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { PhotoVaultIngestForm } from './PhotoVaultIngestForm';
import { PhotoVaultGrid } from './PhotoVaultGrid';
import type { VaultPhoto } from '@/components/guest/lobby/vault.constants';

interface PhotoVaultMomentsTabProps {
  venueId: string;
  photos: VaultPhoto[];
  isLoading: boolean;
  isRefreshing: boolean;
  deletingId: string | null;
  onRefresh: () => void;
  onDelete: (id: string, title: string) => void;
  onIngestSuccess: () => void;
}

export function PhotoVaultMomentsTab({
  venueId,
  photos,
  isLoading,
  isRefreshing,
  deletingId,
  onRefresh,
  onDelete,
  onIngestSuccess,
}: PhotoVaultMomentsTabProps) {
  const [showIngestForm, setShowIngestForm] = useState(false);

  const handleSuccess = () => {
    setShowIngestForm(false);
    onIngestSuccess();
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 bg-white border-b border-neutral-100">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="font-mono text-[11px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-700">
            Venue: {venueId.slice(0, 8)}...
          </span>
          <span>·</span>
          <span className="font-semibold text-neutral-900">{photos.length}</span> Active Moments
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
            title="Refresh vault"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-neutral-900' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowIngestForm((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
              showIngestForm ? 'bg-neutral-200 text-neutral-800' : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            {showIngestForm ? <span>Close Ingestion Form</span> : <><Plus className="w-3.5 h-3.5" /><span>+ Ingest Moment</span></>}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {showIngestForm && (
          <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/70 shadow-xs">
            <PhotoVaultIngestForm venueId={venueId} onSuccess={handleSuccess} onCancel={() => setShowIngestForm(false)} />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-serif text-sm font-medium text-neutral-800">Published Vault Moments</h4>
            <span className="text-xs text-neutral-400">Live sync with Guest Lobby</span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-pulse">
              {[1, 2, 3].map((n) => <div key={n} className="rounded-2xl border border-neutral-200 bg-neutral-100 h-44" />)}
            </div>
          ) : (
            <PhotoVaultGrid photos={photos} onDelete={onDelete} deletingId={deletingId} />
          )}
        </div>
      </div>
    </div>
  );
}
