'use client';

import React, { useState } from 'react';
import { useLiveOffers } from '../hooks/useLiveOffers';
import { LiveOffersHeader } from './offers/LiveOffersHeader';
import { LiveOfferForm } from './offers/LiveOfferForm';
import { LiveOffersList } from './offers/LiveOffersList';
import { OfferRequestsPanel } from './offers/OfferRequestsPanel';

interface LiveOffersManagerProps {
  venueId: string;
  onOffersUpdated?: () => void;
}

export function LiveOffersManager({ venueId, onOffersUpdated }: LiveOffersManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const {
    offers,
    isLoading,
    isRefreshing,
    actionError,
    fetchOffers,
    handleToggleActive,
    handleDeleteOffer,
  } = useLiveOffers(venueId, onOffersUpdated);

  return (
    <div className="space-y-6">
      <LiveOffersHeader
        totalOffers={offers.length}
        activeOffers={offers.filter((o) => o.is_active).length}
        isRefreshing={isRefreshing}
        showCreateForm={showCreateForm}
        onRefresh={() => fetchOffers(true)}
        onToggleForm={() => setShowCreateForm((prev) => !prev)}
      />

      <div className="px-6 pb-6 space-y-6">
        {actionError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{actionError}</p>
        )}
        {showCreateForm && (
          <LiveOfferForm
            venueId={venueId}
            onSuccess={() => {
              setShowCreateForm(false);
              fetchOffers(true);
              if (onOffersUpdated) onOffersUpdated();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        <LiveOffersList
          offers={offers}
          isLoading={isLoading}
          onToggleActive={handleToggleActive}
          onDelete={handleDeleteOffer}
          onCreateFirstOffer={() => setShowCreateForm(true)}
        />

        <OfferRequestsPanel />
      </div>
    </div>
  );
}

export default LiveOffersManager;
